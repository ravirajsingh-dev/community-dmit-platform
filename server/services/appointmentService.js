/**
 * Appointment Service - Phase-2.1
 *
 * Booking system between users and designation holders.
 * Uses runWithTransactionRetry for booking.
 * ACTIVE-only rule everywhere.
 */

const Appointment = require("../models/Appointment");
const CounsellingSession = require("../models/CounsellingSession");
const User = require("../models/User");
const UserDetails = require("../models/UserDetails");
const UserDesignation = require("../models/UserDesignation");
const UserHierarchy = require("../models/UserHierarchy");
const WalletSettings = require("../models/WalletSettings");
const SlotDefinition = require("../models/SlotDefinition");
const mongoose = require("mongoose");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const {
  parsePaginationParams,
  buildPaginationMeta,
} = require("../utils/pagination");
const {
  FREE_APPOINTMENT_LIMIT_REACHED,
} = require("../constants/appointmentErrors");

const DESIGNATION_1 = 1; // Trainer - SBI PRO handling
const DESIGNATION_2 = 2; // Counsellor
const {
  isUserSbiProLocked,
  isBeneficiaryPhoneSbiProLocked,
} = require("./sbiProSessionService");
const walletService = require("./walletService");
const {
  buildTransactionDescription,
  formatAmountForDescription,
} = require("../utils/transactionDescriptionEngine");

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * Build session start Date from dateKey (YYYY-MM-DD) and startTime (HH:mm or H:mm)
 */
function buildSessionStartDate(dateKey, startTime) {
  const raw = String(startTime || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
    return null;
  }
  const hh = match[1].padStart(2, "0");
  const mm = match[2];
  const iso = `${dateKey}T${hh}:${mm}:00.000Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Get UTC date key YYYY-MM-DD for a date
 */
function getUtcDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Check if session hasn't started yet (can cancel until session start)
 */
function isSessionInFuture(sessionStartTime) {
  if (!sessionStartTime) return true;
  return new Date(sessionStartTime).getTime() > Date.now();
}

/**
 * Ensure user has completed >= 1 appointment for required designation before booking higher
 */
async function checkProgressionRule(requesterId, designationCode) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  const settings = await WalletSettings.getOrCreateSettings();
  const config = (settings.designations || []).find(
    (d) => d.designationCode === designationCode && d.isActive !== false,
  );
  if (!config) return { allowed: false, reason: "Designation not found" };

  const requiredDesignationCode = config.requiredDesignationCode ?? null;
  if (requiredDesignationCode == null) return { allowed: true };

  const completedCount = await Appointment.countDocuments({
    requesterId: uid,
    designationCode: requiredDesignationCode,
    status: "COMPLETED",
  });

  if (completedCount < 1) {
    return {
      allowed: false,
      reason: `Complete at least one appointment for designation ${requiredDesignationCode} first`,
    };
  }
  return { allowed: true };
}

/**
 * Check if session is free (completed count < freeSessionCount for that designation)
 */
async function isFreeSession(requesterId, designationCode) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  const settings = await WalletSettings.getOrCreateSettings();
  const config = (settings.designations || []).find(
    (d) => d.designationCode === designationCode && d.isActive !== false,
  );
  if (!config) return false;

  const freeSessionCount = config.freeSessionCount ?? 0;
  if (freeSessionCount <= 0) return false;

  const completedCount = await Appointment.countDocuments({
    requesterId: uid,
    designationCode,
    status: "COMPLETED",
  });
  return completedCount < freeSessionCount;
}

/**
 * Get designation holders for booking - ACTIVE users with APPROVED designation.
 * Supports filters: name, memberId, phone, rating (min), status (online/offline), sortBy, sameDownlineFirst,
 * and location filters: countryId, stateId, districtId, villageId (native village).
 *
 * Sorting:
 * - SELF (if present) always on top
 * - Then "nearby" holders: village > district > state > country match with requester
 * - Then optional sorting (rating / downline) inside same match-level
 */
async function getHoldersForBooking(
  requesterId,
  designationCode,
  options = {},
) {
  const uid =
    mongoose.Types.ObjectId.isValid(requesterId)
      ? new mongoose.Types.ObjectId(requesterId)
      : requesterId;

  const { page, limit, skip } = parsePaginationParams(options);
  const {
    online,
    sortBy,
    sameDownlineFirst,
    name,
    memberId,
    phone,
    rating: minRating,
    status,
    countryId,
    stateId,
    districtId,
    villageId,
  } = options;

  const settings = await WalletSettings.getOrCreateSettings();
  const config = (settings.designations || []).find(
    (d) => d.designationCode === designationCode && d.isActive !== false,
  );
  if (!config) {
    return { holders: [], pagination: buildPaginationMeta(page, limit, 0) };
  }

  const designationFilters = {
    designationCode,
    status: "APPROVED",
  };

  if (status === "online" || online === true) {
    designationFilters.online = true;
  } else if (status === "offline") {
    designationFilters.online = false;
  }

  const ratingNum =
    minRating != null && minRating !== "" ? parseFloat(minRating) : null;
  if (!Number.isNaN(ratingNum) && ratingNum > 0) {
    designationFilters.avgRating = { $gte: ratingNum };
  }

  // Candidate holders: APPROVED designations with the requested filters.
  const designationDocs = await UserDesignation.find(designationFilters)
    .select("userId online avgRating totalRatings")
    .lean();

  let candidateUserIds = designationDocs.map((d) => d.userId);
  if (candidateUserIds.length === 0) {
    return { holders: [], pagination: buildPaginationMeta(page, limit, 0) };
  }

  // Apply optional location filters via `user_details`
  if (countryId || stateId || districtId || villageId) {
    const locQuery = {};
    if (countryId) locQuery.countryId = countryId;
    if (stateId) locQuery.stateId = stateId;
    if (districtId) locQuery.districtId = districtId;
    if (villageId) locQuery.villageId = villageId;

    const userDetails = await UserDetails.find(locQuery)
      .select("userId")
      .lean();
    const locationUserIdSet = new Set(
      userDetails.map((d) => d.userId.toString()),
    );

    candidateUserIds = candidateUserIds.filter((id) =>
      locationUserIdSet.has(id.toString()),
    );

    if (candidateUserIds.length === 0) {
      return {
        holders: [],
        pagination: buildPaginationMeta(page, limit, 0),
      };
    }
  }

  // Apply user-side search filters (name/memberId/phone) against the candidate users.
  const userQuery = {
    _id: { $in: candidateUserIds },
    status: 1,
  };

  if (name && String(name).trim()) {
    userQuery.name = {
      $regex: String(name)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  if (memberId && String(memberId).trim()) {
    userQuery.memberId = {
      $regex: String(memberId)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  if (phone && String(phone).trim()) {
    const phoneDigits = String(phone).trim().replace(/\D/g, "");
    if (phoneDigits.length > 0) {
      userQuery.$or = [
        { phone: { $regex: phoneDigits, $options: "i" } },
        { alternatePhone: { $regex: phoneDigits, $options: "i" } },
      ];
    }
  }

  const users = await User.find(userQuery)
    .select("_id memberId name phone email")
    .lean();

  if (users.length === 0) {
    return { holders: [], pagination: buildPaginationMeta(page, limit, 0) };
  }

  const designationByUserId = new Map(
    designationDocs.map((d) => [d.userId.toString(), d]),
  );

  const uidStr = uid?.toString?.() ?? String(uid);
  let sortedIds = users.map((u) => u._id);

  // "Nearby" sorting: village > district > state > country match
  const requesterDetails = await UserDetails.findOne({ userId: uid })
    .select("countryId stateId districtId villageId")
    .lean();

  const reqCountryId = requesterDetails?.countryId?.toString() || null;
  const reqStateId = requesterDetails?.stateId?.toString() || null;
  const reqDistrictId = requesterDetails?.districtId?.toString() || null;
  const reqVillageId = requesterDetails?.villageId?.toString() || null;

  const holderIds = users.map((u) => u._id);
  const holderDetailsForScore = await UserDetails.find({
    userId: { $in: holderIds },
  })
    .select("userId countryId stateId districtId villageId")
    .lean();
  const holderScoreDetailsById = new Map(
    holderDetailsForScore.map((d) => [d.userId.toString(), d]),
  );

  let downlineSet = null;
  if (sameDownlineFirst && users.length > 0) {
    const descendantIds = await UserHierarchy.distinct("user", {
      ancestor: uid,
    });
    downlineSet = new Set(descendantIds.map((id) => id.toString()));
  }

  const scored = sortedIds.map((id, idx) => {
    const idStr = id.toString();
    const det = holderScoreDetailsById.get(idStr);

    // SELF must always be on top.
    if (idStr === uidStr) {
      return { id, idx, score: 100, rating: designationByUserId.get(idStr)?.avgRating ?? 0, isDownline: true };
    }

    let score = 1; // default far away
    if (reqVillageId && det?.villageId?.toString() === reqVillageId) score = 5;
    else if (reqDistrictId && det?.districtId?.toString() === reqDistrictId) score = 4;
    else if (reqStateId && det?.stateId?.toString() === reqStateId) score = 3;
    else if (reqCountryId && det?.countryId?.toString() === reqCountryId) score = 2;

    const rating = designationByUserId.get(idStr)?.avgRating ?? 0;
    const isDownline = downlineSet ? downlineSet.has(idStr) : false;
    return { id, idx, score, rating, isDownline };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (sortBy === "rating") return b.rating - a.rating;
    if (sameDownlineFirst) return (b.isDownline ? 1 : 0) - (a.isDownline ? 1 : 0);
    return a.idx - b.idx;
  });

  sortedIds = scored.map((s) => s.id);

  const totalCount = sortedIds.length;
  const paginatedIds = sortedIds.slice(skip, skip + limit);

  const holderOrder = new Map(
    paginatedIds.map((id, idx) => [id.toString(), idx]),
  );

  const paginatedUsers = await User.find({ _id: { $in: paginatedIds } })
    .select("_id memberId name phone email")
    .lean();

  paginatedUsers.sort(
    (a, b) =>
      holderOrder.get(a._id.toString()) - holderOrder.get(b._id.toString()),
  );

  // Address lives in `user_details` (not the `users` collection),
  // so we enrich the booking-holder payload for UI display.
  const userDetailsDocs = await UserDetails.find({
    userId: { $in: paginatedIds },
  })
    .select(
      "userId address countryId stateId districtId villageId",
    )
    .populate("countryId", "name")
    .populate("stateId", "name")
    .populate("districtId", "name")
    .populate("villageId", "name")
    .lean();
  const detailsByUserId = new Map(
    userDetailsDocs.map((d) => [d.userId.toString(), d]),
  );

  const completedCounts = await Appointment.aggregate([
    {
      $match: {
        assignedTo: { $in: paginatedIds },
        designationCode,
        status: "COMPLETED",
      },
    },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);

  const completedMap = new Map(
    completedCounts.map((c) => [c._id.toString(), c.count]),
  );

  const holderPayload = paginatedUsers.map((h) => {
    const des = designationByUserId.get(h._id.toString());
    const det = detailsByUserId.get(h._id.toString());
    return {
      _id: h._id,
      memberId: h.memberId,
      name: h.name,
      phone: h.phone,
      email: h.email,
      // Location fields for UI display
      country: det?.countryId?.name ?? null,
      state: det?.stateId?.name ?? null,
      district: det?.districtId?.name ?? null,
      nativeVillage: det?.villageId?.name ?? null,
      currentAddress: det?.address ?? null,
      // Backward-compatible alias (some UI used `address` string)
      address: det?.address ?? null,
      avgRating: des?.avgRating ?? 0,
      totalRatings: des?.totalRatings ?? 0,
      totalSessions: completedMap.get(h._id.toString()) || 0,
      online: des?.online ?? false,
    };
  });

  return {
    holders: holderPayload,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Count PENDING + ACCEPTED + COMPLETED for holder+slot+dateKey (slot capacity enforcement)
 * Issue 2: Pending reservations must reserve slot capacity.
 */
async function countSlotBookings(holderId, slotId, dateKey, session = null) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const sid = mongoose.Types.ObjectId.isValid(slotId)
    ? new mongoose.Types.ObjectId(slotId)
    : slotId;

  const opts = session ? { session } : {};
  return Appointment.countDocuments(
    {
      assignedTo: hid,
      slotId: sid,
      dateKey,
      status: { $in: ["PENDING", "ACCEPTED", "COMPLETED"] },
    },
    opts,
  );
}

/**
 * Get slots for designation with booked count per holder+date
 * Returns slots with { ...slot, booked, available }
 */
async function getSlotsWithAvailability(holderId, designationCode, dateKey) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;

  const { getSlotsByDesignation } = require("./slotService");
  const { slots } = await getSlotsByDesignation(designationCode, {
    activeOnly: true,
    limit: 100,
  });
  if (!slots || slots.length === 0) return [];

  const slotIds = slots.map((s) => s._id);
  const counts = await Appointment.aggregate([
    {
      $match: {
        assignedTo: hid,
        slotId: { $in: slotIds },
        dateKey,
        status: { $in: ["PENDING", "ACCEPTED", "COMPLETED"] },
      },
    },
    { $group: { _id: "$slotId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return slots.map((s) => {
    const booked = countMap.get(s._id.toString()) || 0;
    return {
      ...s,
      booked,
      available: booked < s.capacity,
      remaining: Math.max(0, s.capacity - booked),
    };
  });
}

/**
 * Get next available date + slot when holder has no capacity
 * Issue 3: Limit search window to 14 days; stop on first available.
 * Returns { dateKey, slotId, startTime, endTime } or "No availability in next 14 days."
 * Optimized: single aggregation instead of 14×N countSlotBookings calls.
 */
async function getNextAvailableSlot(holderId, designationCode) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;

  const { getSlotsByDesignation } = require("./slotService");
  const { slots } = await getSlotsByDesignation(designationCode, {
    activeOnly: true,
    limit: 100,
  });
  if (!slots || slots.length === 0) return "No availability in next 14 days.";

  const slotIds = slots.map((s) => s._id);
  const dateKeys = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    dateKeys.push(getUtcDateKey(d));
  }

  const counts = await Appointment.aggregate([
    {
      $match: {
        assignedTo: hid,
        slotId: { $in: slotIds },
        dateKey: { $in: dateKeys },
        status: { $in: ["PENDING", "ACCEPTED", "COMPLETED"] },
      },
    },
    {
      $group: {
        _id: { dateKey: "$dateKey", slotId: "$slotId" },
        count: { $sum: 1 },
      },
    },
  ]);
  const countMap = new Map(
    counts.map((c) => [`${c._id.dateKey}|${c._id.slotId.toString()}`, c.count]),
  );

  for (const dk of dateKeys) {
    for (const slot of slots) {
      const key = `${dk}|${slot._id.toString()}`;
      const booked = countMap.get(key) || 0;
      if (booked < slot.capacity) {
        return {
          dateKey: dk,
          slotId: slot._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
      }
    }
  }
  return "No availability in next 14 days.";
}

/**
 * Book appointment - runs inside transaction
 * Part 1: One active booking per user per designation per date
 * Part 5: Slot capacity enforcement
 * Phase 3: beneficiary support for SBI PRO (designation 1)
 * @param {Object} [beneficiary] - { type: "SELF"|"OTHER", name?, phone? } for designation 1
 */
async function bookAppointment(
  requesterId,
  holderId,
  designationCode,
  dateKey,
  slotId,
  beneficiary = {},
) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const sid = mongoose.Types.ObjectId.isValid(slotId)
    ? new mongoose.Types.ObjectId(slotId)
    : slotId;

  const isSelfBooking = uid.toString() === hid.toString();
  if (isSelfBooking && designationCode !== DESIGNATION_1) {
    return {
      success: false,
      reason: "You cannot book yourself.",
      code: "APPOINTMENT_SELF_BOOKING",
    };
  }

  const progression = await checkProgressionRule(uid, designationCode);
  if (!progression.allowed) {
    return {
      success: false,
      reason: progression.reason,
      code: "APPOINTMENT_PROGRESSION_REQUIRED",
    };
  }

  // Counsellor (designation 2): if any pending exists, block next booking with any counsellor.
  if (designationCode === DESIGNATION_2) {
    const activeCounsellingSession = await CounsellingSession.findOne({
      requesterId: uid,
      status: { $nin: ["CLOSED", "RECOUNSELLING_PENDING"] },
    })
      .select("_id counsellorId status")
      .lean();

    if (activeCounsellingSession) {
      return {
        success: false,
        reason:
          "You already have an active counselling flow. You can book the next COUNSELLOR appointment only after counselling status becomes CLOSED.",
        code: "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER",
      };
    }

    const existingCounsellorPending = await Appointment.findOne({
      requesterId: uid,
      designationCode: DESIGNATION_2,
      status: "PENDING",
    })
      .select("_id dateKey")
      .lean();
    if (existingCounsellorPending) {
      return {
        success: false,
        reason:
          "You already have a pending COUNSELLOR appointment. You cannot book another COUNSELLOR appointment until it is resolved.",
        code: "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER",
      };
    }
  }

  // SBI PRO fingerprint lock & beneficiary validation
  let beneficiaryRef = null;
  let beneficiaryType = "SELF";
  let beneficiaryName = null;
  let beneficiaryPhone = null;

  if (designationCode === DESIGNATION_1) {
    // Q1.2 A, Q2.1 A: SELF only - 1 ID = 1 user, no OTHER/Add person
    const bType = beneficiary.type || "SELF";
    if (bType !== "SELF") {
      return {
        success: false,
        reason: "Sirf apne liye hi SBI PRO book kar sakte hain. 1 ID = 1 user.",
        code: "SBI_PRO_SELF_ONLY",
      };
    }

    if (designationCode === DESIGNATION_2) {
      const activeCounsellingSessionInTxn = await CounsellingSession.findOne(
        {
          requesterId: uid,
          status: { $ne: "CLOSED" },
        },
        { _id: 1 },
        { session }
      ).lean();
      if (activeCounsellingSessionInTxn) {
        const err = new Error(
          "You already have an active counselling flow. You can book the next COUNSELLOR appointment only after counselling status becomes CLOSED."
        );
        err.code = "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER";
        throw err;
      }

      const existingCounsellorPendingInTxn = await Appointment.findOne(
        {
          requesterId: uid,
          designationCode: DESIGNATION_2,
          status: "PENDING",
        },
        { _id: 1 },
        { session }
      ).lean();
      if (existingCounsellorPendingInTxn) {
        const err = new Error(
          "You already have a pending COUNSELLOR appointment. You cannot book another COUNSELLOR appointment until it is resolved."
        );
        err.code = "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER";
        throw err;
      }
    }
    beneficiaryType = "SELF";
    const sbiProLocked = await isUserSbiProLocked(uid);
    if (sbiProLocked) {
      return {
        success: false,
        reason:
          "Aapka SBI PRO pehle hi complete ho chuka hai. Fingerprints kabhi change nahi hote.",
        code: "SBI_PRO_ALREADY_COMPLETED",
      };
    }
    beneficiaryRef = `SELF:${uid}`;
  } else {
    beneficiaryRef = `SELF:${uid}`;
  }

  const settings = await WalletSettings.getOrCreateSettings();
  const config = (settings.designations || []).find(
    (d) => d.designationCode === designationCode && d.isActive !== false,
  );
  if (!config) {
    return { success: false, reason: "Designation not found or inactive" };
  }

  const holder = await User.findById(hid).select("status").lean();
  if (!holder || holder.status !== 1) {
    return { success: false, reason: "Holder not found or inactive" };
  }

  if (isSelfBooking && designationCode === DESIGNATION_1) {
    const requesterHasDesignation1 = await UserDesignation.exists({
      userId: hid,
      designationCode: DESIGNATION_1,
      status: "APPROVED",
    });
    if (!requesterHasDesignation1) {
      return {
        success: false,
        reason: "You cannot book yourself.",
        code: "APPOINTMENT_SELF_BOOKING",
      };
    }
  }

  const holderDes = await UserDesignation.findOne({
    userId: hid,
    designationCode,
    status: "APPROVED",
  })
    .select("online")
    .lean();
  if (!holderDes) {
    return {
      success: false,
      reason: "Holder does not have this designation",
    };
  }

  if (!holderDes.online) {
    return {
      success: false,
      reason: "Holder is not available for this designation",
      code: "APPOINTMENT_HOLDER_OFFLINE",
    };
  }

  const slot = await SlotDefinition.findById(sid).lean();
  if (!slot || slot.designationCode !== designationCode) {
    return { success: false, reason: "Slot not found" };
  }
  if (slot.active !== true) {
    return {
      success: false,
      reason: "Selected slot is not active.",
      code: "SLOT_INACTIVE",
    };
  }

  let appointment;
  try {
    await runWithTransactionRetry(async (session) => {
      // Free appointment limit: COUNSELLOR only (not Trainer/SBI PRO - designation 1)
      const isFreeLimitApplicable = designationCode === DESIGNATION_2;
      let isPaidCounselling = false;
      let chargedAmount = 0;
      let isRecounsellingReplacement = false;
      let replacementForSessionId = null;
      let didConsumeFree = false;
      const ws = await WalletSettings.findOne({ singletonKey: "GLOBAL" })
        .session(session)
        .lean();
      const userDoc = await User.findById(uid).session(session).lean();
      const freeAppointmentsPerUser = ws?.freeAppointmentsPerUser ?? 0;
      const freeAppointmentsUsed = userDoc?.freeAppointmentsUsed ?? 0;

      if (isFreeLimitApplicable) {
        const recounsellingSession = await CounsellingSession.findOneAndUpdate(
          {
            requesterId: uid,
            status: "RECOUNSELLING_PENDING",
          },
          {
            $set: {
              status: "RECOUNSELLING_IN_PROGRESS",
            },
          },
          {
            session,
            sort: { createdAt: 1 },
            new: true,
          },
        ).lean();

        if (recounsellingSession) {
          isRecounsellingReplacement = true;
          replacementForSessionId = recounsellingSession._id;
        } else if (freeAppointmentsUsed < freeAppointmentsPerUser) {
          await User.updateOne(
            { _id: uid },
            { $inc: { freeAppointmentsUsed: 1 } },
            { session },
          );
          didConsumeFree = true;
        } else {
          isPaidCounselling = true;
          chargedAmount = Number(ws?.counsellingCharge ?? 0);
          if (chargedAmount <= 0) {
            const err = new Error(
              "Free appointment limit reached. Paid counselling not configured.",
            );
            err.code = FREE_APPOINTMENT_LIMIT_REACHED;
            throw err;
          }
        }
      }

      const count = await countSlotBookings(hid, sid, dateKey, session);
      if (count >= slot.capacity) {
        // Rollback freeAppointmentsUsed increment before throwing (only when we incremented, i.e. free)
        if (didConsumeFree) {
          await decrementFreeAppointmentsUsed(uid, session);
        }
        if (replacementForSessionId) {
          await CounsellingSession.updateOne(
            { _id: replacementForSessionId, status: "RECOUNSELLING_IN_PROGRESS" },
            { $set: { status: "RECOUNSELLING_PENDING" } },
            { session },
          );
        }
        const next = await getNextAvailableSlot(hid, designationCode);
        const err = new Error(
          typeof next === "object"
            ? `Slot fully booked for ${dateKey}. Next available: ${next.dateKey} ${next.startTime || ""}-${next.endTime || ""}`
            : `Slot fully booked for ${dateKey}. ${next}`,
        );
        err.code = "APPOINTMENT_LIMIT_REACHED";
        throw err;
      }

      const sessionStartTime = buildSessionStartDate(dateKey, slot.startTime);
      if (!sessionStartTime) {
        if (didConsumeFree) {
          await decrementFreeAppointmentsUsed(uid, session);
        }
        if (replacementForSessionId) {
          await CounsellingSession.updateOne(
            { _id: replacementForSessionId, status: "RECOUNSELLING_IN_PROGRESS" },
            { $set: { status: "RECOUNSELLING_PENDING" } },
            { session },
          );
        }
        const err = new Error(
          `Invalid slot startTime format: ${slot.startTime}. Expected HH:mm.`,
        );
        err.code = "APPOINTMENT_INVALID_SLOT_TIME";
        throw err;
      }

      const [doc] = await Appointment.create(
        [
          {
            requesterId: uid,
            designationCode,
            assignedTo: hid,
            slotId: sid,
            status: "PENDING",
            dateKey,
            sessionStartTime,
            requestedAt: new Date(),
            beneficiaryType,
            beneficiaryName,
            beneficiaryPhone,
            beneficiaryRef,
            isPaid: isPaidCounselling,
            chargedAmount: isPaidCounselling ? chargedAmount : 0,
            isRecounsellingReplacement,
            replacementForSessionId,
          },
        ],
        { session },
      );
      appointment = doc;

      if (replacementForSessionId) {
        await CounsellingSession.updateOne(
          { _id: replacementForSessionId },
          { $set: { replacementAppointmentId: doc._id } },
          { session },
        );
      }

      if (isPaidCounselling) {
        const requestId = `counselling:debit:${doc._id.toString()}`;
        const description = buildTransactionDescription("COUNSELLING_DEBIT", {
          amount: formatAmountForDescription(chargedAmount),
        });
        await walletService.debitMainWallet(uid, chargedAmount.toFixed(2), {
          type: "COUNSELLING_CHARGE",
          requestId,
          description,
          session,
        });
      }
    });
  } catch (err) {
    if (err.code === FREE_APPOINTMENT_LIMIT_REACHED) {
      return {
        success: false,
        reason: "Free appointment limit reached",
        code: FREE_APPOINTMENT_LIMIT_REACHED,
      };
    }
    if (err.code === "APPOINTMENT_ONE_TIME_ONLY_FOR_DESIGNATION") {
      return {
        success: false,
        reason: "FINGERPRINT TRAINER appointment can be booked only once.",
        code: "APPOINTMENT_ONE_TIME_ONLY_FOR_DESIGNATION",
      };
    }
    if (err.code === "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER") {
      return {
        success: false,
        reason:
          "You already have a pending COUNSELLOR appointment. You cannot book another COUNSELLOR appointment until it is resolved.",
        code: "APPOINTMENT_PENDING_EXISTS_WITH_SAME_HOLDER",
      };
    }
    if (err.message === "Insufficient balance") {
      return {
        success: false,
        reason:
          "Insufficient wallet balance for counselling fee. Please add funds to your wallet.",
        code: "INSUFFICIENT_BALANCE",
      };
    }
    if (
      err.code === 11000 ||
      (err.message && String(err.message).includes("E11000"))
    ) {
      return {
        success: false,
        reason:
          "Only one active booking allowed per date for this designation.",
        code: "APPOINTMENT_ONE_BOOKING_PER_DATE",
      };
    }
    throw err;
  }

  return { success: true, appointment };
}

/**
 * Phase 4: Batch book - multiple beneficiaries, same holder/date/slot.
 * Creates N appointments (N SBI PRO sessions when accepted).
 * Runs sequentially (each bookAppointment validates slot capacity cumulatively).
 */
async function bookAppointmentBatch(
  requesterId,
  holderId,
  designationCode,
  dateKey,
  slotId,
  beneficiaries,
) {
  if (!Array.isArray(beneficiaries) || beneficiaries.length === 0) {
    return {
      success: false,
      reason: "At least one beneficiary required",
      code: "INVALID_BENEFICIARIES",
    };
  }
  // Q5.1 A: Batch booking removed - SELF only
  if (designationCode === DESIGNATION_1) {
    return {
      success: false,
      reason:
        "Sirf apne liye hi SBI PRO book kar sakte hain. Batch booking remove kar diya gaya hai.",
      code: "SBI_PRO_BATCH_REMOVED",
    };
  }
  if (designationCode !== DESIGNATION_1) {
    return {
      success: false,
      reason: "Batch booking only for SBI PRO (Designation 1)",
      code: "BATCH_SBI_PRO_ONLY",
    };
  }
  if (beneficiaries.length > 10) {
    return {
      success: false,
      reason: "Maximum 10 beneficiaries per batch",
      code: "BATCH_LIMIT",
    };
  }

  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const settings = await WalletSettings.getOrCreateSettings();
  const freePerUser = settings?.freeAppointmentsPerUser ?? 0;
  const userDoc = await User.findById(uid)
    .select("freeAppointmentsUsed")
    .lean();
  const used = userDoc?.freeAppointmentsUsed ?? 0;
  const remaining = freePerUser - used;
  if (remaining < beneficiaries.length) {
    return {
      success: false,
      reason: `Only ${remaining} free appointment(s) remaining. Need ${beneficiaries.length}.`,
      code: FREE_APPOINTMENT_LIMIT_REACHED,
    };
  }

  const appointments = [];
  for (const b of beneficiaries) {
    const result = await bookAppointment(
      requesterId,
      holderId,
      designationCode,
      dateKey,
      slotId,
      b,
    );
    if (!result.success) {
      return result;
    }
    appointments.push(result.appointment);
  }
  return { success: true, appointments };
}

/**
 * Get my appointments (as requester) - paginated
 * Filters: status, dateFrom, dateTo, requestedFrom, requestedTo, holderSearch, forWhomSearch
 */
async function getMyAppointments(requesterId, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  const { page, limit, skip } = parsePaginationParams(options);
  const {
    status,
    dateFrom,
    dateTo,
    requestedFrom,
    requestedTo,
    holderSearch,
    forWhomSearch,
  } = options;

  const query = { requesterId: uid };
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.dateKey = {};
    if (dateFrom) query.dateKey.$gte = dateFrom;
    if (dateTo) query.dateKey.$lte = dateTo;
  }
  if (requestedFrom || requestedTo) {
    query.requestedAt = {};
    if (requestedFrom) query.requestedAt.$gte = new Date(requestedFrom);
    if (requestedTo) {
      const d = new Date(requestedTo);
      d.setHours(23, 59, 59, 999);
      query.requestedAt.$lte = d;
    }
  }
  if (holderSearch && typeof holderSearch === "string" && holderSearch.trim()) {
    const term = holderSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(term, "i");
    const holderUsers = await User.find({
      $or: [{ name: regex }, { memberId: regex }, { phone: regex }],
    })
      .select("_id")
      .lean();
    const holderIds = holderUsers.map((u) => u._id);
    if (holderIds.length === 0) query.assignedTo = null;
    else query.assignedTo = { $in: holderIds };
  }
  if (
    forWhomSearch &&
    typeof forWhomSearch === "string" &&
    forWhomSearch.trim()
  ) {
    const term = forWhomSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(term, "i");
    query.$or = [{ beneficiaryName: regex }, { beneficiaryPhone: regex }];
  }

  const [items, totalCount] = await Promise.all([
    Appointment.find(query)
      .populate("assignedTo", "memberId name phone email")
      .populate("requesterId", "memberId name phone email")
      .populate("slotId", "label startTime endTime")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  const settings = await WalletSettings.getOrCreateSettings();
  const desMap = new Map(
    (settings.designations || []).map((d) => [d.designationCode, d.name]),
  );

  let mapped = items.map((a) => ({
    ...a,
    designationName: desMap.get(a.designationCode) || "-",
  }));

  // Enrich `assignedTo` with address (UI needs address for holders).
  // `assignedTo` is populated from `users`, but `address` is stored in `user_details`.
  const assignedHolderUserIds = [
    ...new Set(
      mapped
        .map((a) => a?.assignedTo?._id?.toString())
        .filter((id) => typeof id === "string" && id.trim()),
    ),
  ].map((id) => mongoose.Types.ObjectId(id));

  if (assignedHolderUserIds.length > 0) {
    const holderDetailsDocs = await UserDetails.find({
      userId: { $in: assignedHolderUserIds },
    })
      .select(
        "userId address countryId stateId districtId villageId",
      )
      .populate("countryId", "name")
      .populate("stateId", "name")
      .populate("districtId", "name")
      .populate("villageId", "name")
      .lean();
    const holderDetailsByUserId = new Map(
      holderDetailsDocs.map((d) => [d.userId.toString(), d]),
    );

    mapped = mapped.map((a) => {
      const assignedTo = a?.assignedTo;
      const assignedToId = assignedTo?._id?.toString?.();
      if (!assignedToId) return a;
      const det = holderDetailsByUserId.get(assignedToId);
      if (!det) return a;
      return {
        ...a,
        assignedTo: {
          ...assignedTo,
          // Location fields for UI display
          country: det?.countryId?.name ?? null,
          state: det?.stateId?.name ?? null,
          district: det?.districtId?.name ?? null,
          nativeVillage: det?.villageId?.name ?? null,
          currentAddress: det?.address ?? null,
          // Backward-compatible alias (some UI used `address` string)
          address: det?.address ?? null,
        },
      };
    });
  }

  // Enrich designation 2 (Counsellor) appointments with counselling session status
  const counsellorAptIds = mapped
    .filter((a) => a.designationCode === DESIGNATION_2)
    .map((a) => a._id);
  if (counsellorAptIds.length > 0) {
    const sessions = await CounsellingSession.find({
      appointmentId: { $in: counsellorAptIds },
    })
      .select("appointmentId status _id")
      .lean();
    const sessionByApt = new Map(
      sessions.map((s) => [
        s.appointmentId?.toString(),
        { status: s.status, id: s._id },
      ]),
    );
    mapped = mapped.map((a) => {
      if (a.designationCode === DESIGNATION_2) {
        const info = sessionByApt.get(a._id?.toString());
        return {
          ...a,
          counsellingSessionStatus: info?.status || null,
          counsellingSessionId: info?.id || null,
        };
      }
      return a;
    });
  }

  return {
    appointments: mapped,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Decrement freeAppointmentsUsed by 1, prevent negative using $max.
 * Call only when cancelling a PENDING appointment (before ACCEPTED).
 */
function decrementFreeAppointmentsUsed(userId, session) {
  return User.updateOne(
    { _id: userId, freeAppointmentsUsed: { $gt: 0 } },
    { $inc: { freeAppointmentsUsed: -1 } },
    { session },
  );
}

/**
 * User cancel - only if PENDING
 * Decrements freeAppointmentsUsed when cancelling before ACCEPTED.
 */
async function cancelByUser(requesterId, appointmentId) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const apt = await Appointment.findOne({
    _id: aid,
    requesterId: uid,
    status: "PENDING",
  }).lean();

  if (!apt) {
    return {
      success: false,
      reason: "Appointment not found or cannot be cancelled",
      code: "APPOINTMENT_NOT_FOUND",
    };
  }

  if (!isSessionInFuture(apt.sessionStartTime)) {
    return {
      success: false,
      reason: "Cancellation not allowed - session has already started",
      code: "APPOINTMENT_CANCEL_TOO_LATE",
    };
  }

  try {
    await runWithTransactionRetry(async (session) => {
      const result = await Appointment.findOneAndUpdate(
        { _id: aid, requesterId: uid, status: "PENDING" },
        {
          $set: {
            status: "CANCELLED_BY_USER",
            cancelledAt: new Date(),
          },
        },
        { session },
      );
      if (!result) {
        throw new Error("Appointment not found or already cancelled");
      }
      await decrementFreeAppointmentsUsed(uid, session);
    });
  } catch (err) {
    if (
      err.message?.includes("already cancelled") ||
      err.message?.includes("not found")
    ) {
      return {
        success: false,
        reason: "Appointment not found or cannot be cancelled",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }
    throw err;
  }
  return { success: true };
}

/**
 * Rate appointment - only COMPLETED, requesterId must match, update if exists.
 * Atomic transaction: read old rating, apply delta, update appointment + designationStats.
 * Uses runWithTransactionRetry for retry on TransientTransactionError.
 * Idempotent: updating same rating twice leaves avg unchanged.
 */
async function rateAppointment(requesterId, appointmentId, rating, review) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  if (rating < 0 || rating > 5) {
    return {
      success: false,
      reason: "Rating must be between 0 and 5",
      code: "APPOINTMENT_INVALID_RATING",
    };
  }

  const roundedRating = Math.round(rating * 10) / 10;

  return runWithTransactionRetry(async (session) => {
    const apt = await Appointment.findOne({
      _id: aid,
      requesterId: uid,
      status: "COMPLETED",
    })
      .session(session)
      .lean();

    if (!apt) {
      return {
        success: false,
        reason: "Appointment not found or not completed",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }

    const oldRating = apt.rating;
    const holderId = apt.assignedTo;
    const designationCode = apt.designationCode;

    await Appointment.updateOne(
      { _id: aid },
      { $set: { rating: roundedRating, review: review || null } },
      { session },
    );

    const des = await UserDesignation.findOne({
      userId: holderId,
      designationCode,
      status: "APPROVED",
    })
      .select("avgRating totalRatings")
      .session(session)
      .lean();

    const prevTotal = des?.totalRatings || 0;
    const prevSum = (des?.avgRating || 0) * prevTotal;

    const newTotal = prevTotal + (oldRating == null ? 1 : 0);
    let newAvg;
    if (oldRating != null) {
      // Rating changed/re-updated; total doesn't change.
      newAvg =
        prevTotal > 0 ? (prevSum - oldRating + roundedRating) / prevTotal : roundedRating;
    } else {
      // First-time rating; total increases.
      newAvg =
        newTotal > 0 ? (prevSum + roundedRating) / newTotal : roundedRating;
    }

    await UserDesignation.updateOne(
      { userId: holderId, designationCode, status: "APPROVED" },
      {
        $set: {
          avgRating: Math.round(newAvg * 100) / 100,
          totalRatings: newTotal,
        },
      },
      { session },
    );

    return { success: true };
  });
}

/**
 * Get assigned appointments (holder view) - paginated
 * Filters: status, dateFrom, dateTo, designationCode, requestedFrom, requestedTo, forWhomSearch
 */
async function getAssignedAppointments(holderId, options = {}) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;

  const { page, limit, skip } = parsePaginationParams(options);
  const {
    status,
    dateFrom,
    dateTo,
    designationCode,
    requestedFrom,
    requestedTo,
    forWhomSearch,
  } = options;

  const query = { assignedTo: hid };
  if (status) query.status = status;
  if (designationCode != null && designationCode !== "") {
    const code = parseInt(designationCode, 10);
    if (!Number.isNaN(code)) query.designationCode = code;
  }
  if (dateFrom || dateTo) {
    query.dateKey = {};
    if (dateFrom) query.dateKey.$gte = dateFrom;
    if (dateTo) query.dateKey.$lte = dateTo;
  }
  if (requestedFrom || requestedTo) {
    query.requestedAt = {};
    if (requestedFrom) query.requestedAt.$gte = new Date(requestedFrom);
    if (requestedTo) {
      const d = new Date(requestedTo);
      d.setHours(23, 59, 59, 999);
      query.requestedAt.$lte = d;
    }
  }
  if (
    forWhomSearch &&
    typeof forWhomSearch === "string" &&
    forWhomSearch.trim()
  ) {
    const term = forWhomSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(term, "i");
    const requesterUsers = await User.find({
      $or: [{ name: regex }, { memberId: regex }, { phone: regex }],
    })
      .select("_id")
      .lean();
    const requesterIds = requesterUsers.map((u) => u._id);
    const orConditions = [
      ...(requesterIds.length > 0
        ? [{ requesterId: { $in: requesterIds } }]
        : []),
      { beneficiaryName: regex },
      { beneficiaryPhone: regex },
    ];
    if (orConditions.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({ $or: orConditions });
    }
  }

  const [items, totalCount] = await Promise.all([
    Appointment.find(query)
      .populate("requesterId", "memberId name phone email")
      .populate("slotId", "label startTime endTime")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  const settings = await WalletSettings.getOrCreateSettings();
  const desMap = new Map(
    (settings.designations || []).map((d) => [d.designationCode, d.name]),
  );

  let mapped = items.map((a) => ({
    ...a,
    designationName: desMap.get(a.designationCode) || "-",
  }));

  // Enrich designation 2 (Counsellor) appointments with counselling session status
  const counsellorAptIds = mapped
    .filter((a) => a.designationCode === DESIGNATION_2)
    .map((a) => a._id);
  if (counsellorAptIds.length > 0) {
    const sessions = await CounsellingSession.find({
      appointmentId: { $in: counsellorAptIds },
    })
      .select("appointmentId status")
      .lean();
    const sessionByApt = new Map(
      sessions.map((s) => [
        s.appointmentId?.toString(),
        { status: s.status, id: s._id },
      ]),
    );
    mapped = mapped.map((a) => {
      if (a.designationCode === DESIGNATION_2) {
        const info = sessionByApt.get(a._id.toString());
        return {
          ...a,
          counsellingSessionStatus: info?.status || null,
          counsellingSessionId: info?.id || null,
        };
      }
      return a;
    });
  }

  return {
    appointments: mapped,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Holder accept - PENDING -> ACCEPTED
 */
async function acceptAppointment(holderId, appointmentId) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const apt = await Appointment.findOne({
    _id: aid,
    assignedTo: hid,
    status: "PENDING",
  }).lean();

  if (!apt) {
    return {
      success: false,
      reason: "Appointment not found or already processed",
      code: "APPOINTMENT_ALREADY_PROCESSED",
    };
  }

  const { createSessionForAppointment } = require("./sbiProSessionService");
  const {
    createSessionForAppointment: createCounsellingSession,
  } = require("./counsellingSessionService");

  const result = await runWithTransactionRetry(async (session) => {
    const updated = await Appointment.findOneAndUpdate(
      { _id: aid, assignedTo: hid, status: "PENDING" },
      {
        $set: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      },
      { new: true, session },
    );

    if (!updated) {
      return null;
    }

    if (updated.designationCode === DESIGNATION_1) {
      const sbiProSess = await createSessionForAppointment(updated._id, {
        session,
      });
      console.log(
        "[SBI PRO] Session created for appointment",
        updated._id,
        sbiProSess ? "OK" : "SKIP (exists)",
      );
    } else if (updated.designationCode === 2) {
      const counsellingSess = await createCounsellingSession(updated._id, {
        session,
      });
      console.log(
        "[Counselling] Session created for appointment",
        updated._id,
        counsellingSess ? "OK" : "SKIP (exists)",
      );
    }

    return updated;
  });

  if (!result) {
    return {
      success: false,
      reason: "Appointment not found or already processed",
      code: "APPOINTMENT_ALREADY_PROCESSED",
    };
  }

  return { success: true, appointment: result };
}

/**
 * Holder complete - ACCEPTED -> COMPLETED
 */
async function completeAppointment(holderId, appointmentId) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const result = await Appointment.findOneAndUpdate(
    { _id: aid, assignedTo: hid, status: "ACCEPTED" },
    {
      $set: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!result) {
    return {
      success: false,
      reason: "Appointment not found or not in ACCEPTED status",
    };
  }

  return { success: true, appointment: result };
}

/**
 * Holder reject - PENDING -> REJECTED
 * Decrements freeAppointmentsUsed when cancelling before ACCEPTED.
 */
async function rejectAppointment(holderId, appointmentId) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const result = await runWithTransactionRetry(async (session) => {
    const apt = await Appointment.findOneAndUpdate(
      { _id: aid, assignedTo: hid, status: "PENDING" },
      { $set: { status: "REJECTED" } },
      { new: true, session },
    );
    if (!apt) return null;
    await decrementFreeAppointmentsUsed(apt.requesterId, session);
    return apt;
  });

  if (!result) {
    return {
      success: false,
      reason: "Appointment not found or not in PENDING status",
    };
  }
  return { success: true };
}

/**
 * Holder request cancel - ACCEPTED -> CANCEL_REQUESTED
 */
async function requestCancelAppointment(holderId, appointmentId, reason) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const apt = await Appointment.findOne({
    _id: aid,
    assignedTo: hid,
    status: "ACCEPTED",
  }).lean();

  if (!apt) {
    return {
      success: false,
      reason: "Appointment not found or not in ACCEPTED status",
    };
  }

  if (!isSessionInFuture(apt.sessionStartTime)) {
    return {
      success: false,
      reason: "Cancellation not allowed - session has already started",
      code: "APPOINTMENT_CANCEL_TOO_LATE",
    };
  }

  const result = await Appointment.findOneAndUpdate(
    { _id: aid, assignedTo: hid, status: "ACCEPTED" },
    {
      $set: {
        status: "CANCEL_REQUESTED",
        cancellationReason: reason || null,
      },
    },
    { new: true },
  );

  if (!result) {
    return {
      success: false,
      reason: "Appointment not found or not in ACCEPTED status",
    };
  }

  return { success: true };
}

/**
 * Toggle holder online/offline for designation
 * Block if any PENDING or ACCEPTED appointment exists for that designationCode
 */
async function toggleHolderOnline(holderId, designationCode) {
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;

  const pendingCount = await Appointment.countDocuments({
    assignedTo: hid,
    designationCode,
    status: { $in: ["PENDING", "ACCEPTED"] },
  });

  if (pendingCount > 0) {
    return {
      success: false,
      reason:
        "Cannot go offline while you have pending or accepted appointments",
      code: "APPOINTMENT_OFFLINE_BLOCKED",
    };
  }

  const des = await UserDesignation.findOne({
    userId: hid,
    designationCode,
    status: "APPROVED",
  })
    .select("online")
    .lean();

  if (!des) {
    return { success: false, reason: "You do not have this designation" };
  }

  const newOnline = !des.online;

  await UserDesignation.updateOne(
    { userId: hid, designationCode, status: "APPROVED" },
    { $set: { online: newOnline } },
  );

  return { success: true, online: newOnline };
}

/**
 * Admin: List appointments with filters
 */
async function getAdminAppointments(options = {}) {
  const { page, limit, skip } = parsePaginationParams(options);
  const { status, designationCode, dateFrom, dateTo } = options;

  const query = {};
  if (status) query.status = status;
  if (designationCode != null) query.designationCode = designationCode;
  if (dateFrom || dateTo) {
    query.dateKey = {};
    if (dateFrom) query.dateKey.$gte = dateFrom;
    if (dateTo) query.dateKey.$lte = dateTo;
  }

  const [items, totalCount] = await Promise.all([
    Appointment.find(query)
      .populate("requesterId", "memberId name phone email")
      .populate("assignedTo", "memberId name phone email")
      .populate("slotId", "startTime endTime label")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  const settings = await WalletSettings.getOrCreateSettings();
  const desMap = new Map(
    (settings.designations || []).map((d) => [d.designationCode, d.name]),
  );

  const mapped = items.map((a) => ({
    ...a,
    designationName: desMap.get(a.designationCode) || "-",
  }));

  // Enrich requester/holder objects with address pieces from `user_details`
  const requesterIds = mapped
    .map((a) => a?.requesterId?._id)
    .filter((id) => id != null)
    .map((id) => id.toString());
  const holderIds = mapped
    .map((a) => a?.assignedTo?._id)
    .filter((id) => id != null)
    .map((id) => id.toString());
  const addressUserIds = [...new Set([...requesterIds, ...holderIds])];

  if (addressUserIds.length > 0) {
    const userDetailsDocs = await UserDetails.find({
      userId: { $in: addressUserIds },
    })
      .select(
        "userId address countryId stateId districtId villageId",
      )
      .populate("countryId", "name")
      .populate("stateId", "name")
      .populate("districtId", "name")
      .populate("villageId", "name")
      .lean();

    const detailsByUserId = new Map(
      userDetailsDocs.map((d) => [d.userId.toString(), d]),
    );

    const enrichPerson = (p) => {
      if (!p?._id) return p;
      const det = detailsByUserId.get(p._id.toString());
      if (!det) return p;
      return {
        ...p,
        country: det?.countryId?.name ?? null,
        state: det?.stateId?.name ?? null,
        district: det?.districtId?.name ?? null,
        nativeVillage: det?.villageId?.name ?? null,
        currentAddress: det?.address ?? null,
        address: det?.address ?? null,
      };
    };

    for (const a of mapped) {
      a.requesterId = enrichPerson(a.requesterId);
      a.assignedTo = enrichPerson(a.assignedTo);
    }
  }

  const designations = (settings.designations || []).map((d) => ({
    designationCode: d.designationCode,
    name: d.name,
  }));

  return {
    appointments: mapped,
    pagination: buildPaginationMeta(page, limit, totalCount),
    designations,
  };
}

/**
 * Admin: Approve cancel request -> CANCELLED_BY_HOLDER
 */
async function approveCancelRequest(appointmentId, adminId) {
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const result = await Appointment.findOneAndUpdate(
    { _id: aid, status: "CANCEL_REQUESTED" },
    {
      $set: {
        status: "CANCELLED_BY_HOLDER",
        cancelledAt: new Date(),
      },
    },
    { new: true },
  );

  if (!result) {
    return {
      success: false,
      reason: "Cancel request not found or already processed",
    };
  }

  return { success: true, appointment: result };
}

/**
 * Admin: Reject cancel request -> back to ACCEPTED
 */
async function rejectCancelRequest(appointmentId) {
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const result = await Appointment.findOneAndUpdate(
    { _id: aid, status: "CANCEL_REQUESTED" },
    { $set: { status: "ACCEPTED", cancellationReason: null } },
    { new: true },
  );

  if (!result) {
    return {
      success: false,
      reason: "Cancel request not found or already processed",
    };
  }

  return { success: true };
}

/**
 * Admin: Create SBI PRO appointment (Override Lock) - Phase 7
 * User calls "meri finger analysis vapas kro" - admin creates new appointment manually.
 * Bypasses fingerprint lock. Logged for audit.
 */
async function adminCreateSbiProOverride(adminId, params) {
  const { requesterId, holderId, dateKey, slotId, beneficiary } = params || {};
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const hid = mongoose.Types.ObjectId.isValid(holderId)
    ? new mongoose.Types.ObjectId(holderId)
    : holderId;
  const sid = mongoose.Types.ObjectId.isValid(slotId)
    ? new mongoose.Types.ObjectId(slotId)
    : slotId;

  const b = beneficiary || { type: "SELF" };
  const bType = b.type || "SELF";
  let beneficiaryRef, beneficiaryName, beneficiaryPhone;

  if (bType === "SELF") {
    beneficiaryRef = `SELF:${uid}`;
    beneficiaryName = null;
    beneficiaryPhone = null;
  } else {
    const phone = normalizePhone(b.phone);
    if (!phone) {
      return {
        success: false,
        reason: "Beneficiary phone required for OTHER",
        code: "BENEFICIARY_PHONE_REQUIRED",
      };
    }
    beneficiaryRef = `OTHER:${phone}`;
    beneficiaryName = (b.name || "").trim() || null;
    beneficiaryPhone = phone;
  }

  const slot = await SlotDefinition.findById(sid).lean();
  if (!slot || slot.designationCode !== DESIGNATION_1) {
    return { success: false, reason: "Valid SBI PRO slot required" };
  }

  const sessionStartTime = buildSessionStartDate(dateKey, slot.startTime);
  if (!sessionStartTime) {
    return { success: false, reason: "Invalid dateKey or slot startTime" };
  }

  const count = await countSlotBookings(hid, sid, dateKey);
  if (count >= slot.capacity) {
    return {
      success: false,
      reason: "Slot full",
      code: "APPOINTMENT_LIMIT_REACHED",
    };
  }

  const [doc] = await Appointment.create([
    {
      requesterId: uid,
      designationCode: DESIGNATION_1,
      assignedTo: hid,
      slotId: sid,
      status: "PENDING",
      dateKey,
      sessionStartTime,
      requestedAt: new Date(),
      beneficiaryType: bType,
      beneficiaryName,
      beneficiaryPhone,
      beneficiaryRef,
      adminOverrideBy: adminId,
      adminOverrideAt: new Date(),
    },
  ]);

  console.log(
    `[SBI PRO Admin Override] Admin ${adminId} created appointment ${doc._id} for requester ${uid} (beneficiary: ${bType})`,
  );
  return { success: true, appointment: doc };
}

/**
 * Admin: Cancel any appointment (force cancel)
 * Decrements freeAppointmentsUsed only when cancelling PENDING (before ACCEPTED).
 */
async function adminCancelAppointment(appointmentId, adminId, reason) {
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  const result = await runWithTransactionRetry(async (session) => {
    const apt = await Appointment.findOne({ _id: aid }).session(session).lean();
    if (!apt) return null;

    const wasPending = apt.status === "PENDING";
    await Appointment.updateOne(
      { _id: aid },
      {
        $set: {
          status: "CANCELLED_BY_ADMIN",
          cancelledAt: new Date(),
          cancellationReason: reason || null,
        },
      },
      { session },
    );
    if (wasPending) {
      await decrementFreeAppointmentsUsed(apt.requesterId, session);
    }
    return {
      ...apt,
      status: "CANCELLED_BY_ADMIN",
      cancelledAt: new Date(),
      cancellationReason: reason || null,
    };
  });

  if (!result) {
    return { success: false, reason: "Appointment not found" };
  }
  return { success: true, appointment: result };
}

/**
 * Auto-expiry: PENDING older than 24h -> CANCELLED_BY_SYSTEM
 * Strict filter: status must be exactly "PENDING"
 * Decrements freeAppointmentsUsed for each expired PENDING (before ACCEPTED).
 */
async function expirePendingAppointments() {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24);

  let cancelledCount = 0;
  await runWithTransactionRetry(async (session) => {
    const expired = await Appointment.find({
      status: "PENDING",
      requestedAt: { $lt: cutoff },
    })
      .select("_id requesterId")
      .session(session)
      .lean();

    if (expired.length === 0) return;

    const updateResult = await Appointment.updateMany(
      {
        status: "PENDING",
        requestedAt: { $lt: cutoff },
      },
      {
        $set: {
          status: "CANCELLED_BY_SYSTEM",
          cancelledAt: new Date(),
        },
      },
      { session },
    );
    cancelledCount = updateResult?.modifiedCount ?? 0;
    for (const apt of expired) {
      await decrementFreeAppointmentsUsed(apt.requesterId, session);
    }
  });

  return { modifiedCount: cancelledCount };
}

module.exports = {
  getUtcDateKey,
  checkProgressionRule,
  isFreeSession,
  getHoldersForBooking,
  countSlotBookings,
  getSlotsWithAvailability,
  getNextAvailableSlot,
  bookAppointment,
  bookAppointmentBatch,
  getMyAppointments,
  cancelByUser,
  rateAppointment,
  getAssignedAppointments,
  acceptAppointment,
  completeAppointment,
  rejectAppointment,
  requestCancelAppointment,
  toggleHolderOnline,
  getAdminAppointments,
  adminCreateSbiProOverride,
  approveCancelRequest,
  rejectCancelRequest,
  adminCancelAppointment,
  expirePendingAppointments,
};
