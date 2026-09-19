/**
 * Designation Service - Phase-1
 *
 * Apply (atomic), admin decision, downline queries.
 * Uses UserHierarchy for descendant lookup at scale.
 */

const User = require("../models/User");
const UserDesignation = require("../models/UserDesignation");
const UserHierarchy = require("../models/UserHierarchy");
const Appointment = require("../models/Appointment");
const WalletSettings = require("../models/WalletSettings");
const mongoose = require("mongoose");
const {
  getEligibilityForAll,
  evaluateEligibility,
  getCurrentMonthBounds,
  getMonthlyDirectCount,
  getRequiredDesignationHolderCount,
} = require("./designationEligibilityService");
const {
  parsePaginationParams,
  buildPaginationMeta,
} = require("../utils/pagination");
const { runWithTransactionRetry } = require("../utils/transactionRetry");

/**
 * Apply for designation - atomic update.
 * Validates: config exists, no existing PENDING/APPROVED, eligibility.
 * For admin direct-assign, eligibility can be bypassed via options.skipEligibility.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} designationCode
 * @param {{ skipEligibility?: boolean }} [options]
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
async function applyForDesignation(userId, designationCode, options = {}) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const settings = await WalletSettings.getOrCreateSettings();
  const config = (settings.designations || []).find(
    (d) => d.designationCode === designationCode && d.isActive !== false,
  );

  if (!config) {
    return { success: false, reason: "Designation not found or inactive" };
  }

  const designationCodesSet = new Set(
    (settings.designations || []).map((d) => d.designationCode),
  );
  const requiredDesignationCode = config.requiredDesignationCode ?? null;
  const requiredDesignationCount = config.requiredDesignationCount ?? 0;

  if (requiredDesignationCode != null && !designationCodesSet.has(requiredDesignationCode)) {
    console.error(
      `Apply designation ${designationCode}: requiredDesignationCode ${requiredDesignationCode} does not exist in WalletSettings.designations`,
    );
    return { success: false, reason: "Invalid designation configuration" };
  }

  const user = await User.findById(uid).select("directCount totalDownlineCount").lean();

  if (!user) {
    return { success: false, reason: "User not found" };
  }

  const { monthStart, monthEnd } = getCurrentMonthBounds();

  // Block re-apply for statuses other than REJECTED or DELETED.
  // (Only REJECTED/DELETED can be revived by user; INACTIVE is blocked.)
  const existing = await UserDesignation.findOne({ userId: uid, designationCode }).lean();
  if (existing?.status && !["REJECTED", "DELETED"].includes(existing.status)) {
    return { success: false, reason: `Already ${existing.status} for this designation` };
  }

  if (!options.skipEligibility) {
    const [monthlyDirectCount, currentRequiredDesignationCount] = await Promise.all([
      getMonthlyDirectCount(uid, { monthStart, monthEnd }),
      requiredDesignationCode != null && requiredDesignationCount > 0
        ? getRequiredDesignationHolderCount(uid, requiredDesignationCode)
        : Promise.resolve(undefined),
    ]);

    const { eligible, reason } = evaluateEligibility(
      config,
      user,
      { monthStart, monthEnd },
      monthlyDirectCount,
      currentRequiredDesignationCount,
    );

    if (!eligible) {
      return { success: false, reason };
    }
  }

  const now = new Date();

  if (existing?._id) {
    // Reuse existing doc (set back to PENDING).
    const updated = await UserDesignation.findOneAndUpdate(
      {
        userId: uid,
        designationCode,
        status: existing.status,
      },
      {
        $set: {
          status: "PENDING",
          appliedAt: now,
          approvedAt: null,
          approvedBy: null,
          remarks: null,
        },
      },
      { new: true },
    );

    if (!updated) {
      return {
        success: false,
        reason: `Already not in REJECTED/DELETED state for this designation`,
      };
    }
  } else {
    // Create a new pending doc.
    try {
      await UserDesignation.create({
        userId: uid,
        designationCode,
        status: "PENDING",
        appliedAt: now,
        approvedAt: null,
        approvedBy: null,
        remarks: null,
      });
    } catch (err) {
      // Concurrency safety: if created concurrently, retry reuse or re-block.
      if (err && (err.code === 11000 || String(err.message || "").includes("duplicate key"))) {
        const fresh = await UserDesignation.findOne({ userId: uid, designationCode }).lean();
        if (fresh?.status && !["REJECTED", "DELETED"].includes(fresh.status)) {
          return { success: false, reason: `Already ${fresh.status} for this designation` };
        }
        const updated = await UserDesignation.findOneAndUpdate(
          {
            userId: uid,
            designationCode,
            status: fresh.status,
          },
          {
            $set: {
              status: "PENDING",
              appliedAt: now,
              approvedAt: null,
              approvedBy: null,
              remarks: null,
            },
          },
          { new: true },
        );
        if (!updated) {
          return { success: false, reason: "Apply failed - designation already modified" };
        }
      } else {
        throw err;
      }
    }
  }

  return { success: true };
}

/** Allowed designation status transitions (state machine) */
const DESIGNATION_TRANSITIONS = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["INACTIVE"],
  REJECTED: ["APPROVED"],
  INACTIVE: ["APPROVED"],
};

/**
 * Transition designation status - enforces state machine.
 * PENDING → APPROVED: re-checks eligibility before approving (inside transaction).
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} designationCode
 * @param {string} toStatus - Target status
 * @param {string} remarks - Required for REJECTED, DELETED
 * @param {mongoose.Types.ObjectId|string} adminId
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
async function transitionDesignationStatus(
  userId,
  designationCode,
  toStatus,
  remarks,
  adminId,
  designationEntryId = null,
) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;
  const aid =
    mongoose.Types.ObjectId.isValid(adminId) ?
      new mongoose.Types.ObjectId(adminId) :
      adminId;

  const entryIdObj =
    designationEntryId && mongoose.Types.ObjectId.isValid(designationEntryId)
      ? new mongoose.Types.ObjectId(designationEntryId)
      : null;

  const entryQuery = entryIdObj
    ? { _id: entryIdObj, userId: uid, designationCode }
    : { userId: uid, designationCode };

  const entry = await UserDesignation.findOne(entryQuery).lean();
  if (!entry) return { success: false, reason: "Designation entry not found" };

  const fromStatus = entry.status;
  const allowed = DESIGNATION_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    return {
      success: false,
      reason: `Cannot transition from ${fromStatus} to ${toStatus}. Allowed: ${allowed?.join(", ") || "none"}`,
    };
  }

  if (toStatus === "REJECTED" && !remarks?.trim()) {
    return { success: false, reason: "Remarks are required for reject" };
  }

  if (fromStatus === "PENDING" && toStatus === "APPROVED") {
    return runWithTransactionRetry(async (session) => {
      const freshUser = await User.findById(uid)
        .select("status")
        .session(session)
        .lean();
      if (!freshUser) return { success: false, reason: "User not found" };

      // Admin approval: only require that user is ACTIVE.
      if (freshUser.status !== 1) {
        return { success: false, reason: "User must be active to approve designation" };
      }

      // Ensure the same entry is still PENDING (for concurrency safety).
      const stillPendingQuery = entryIdObj
        ? { _id: entryIdObj, userId: uid, designationCode, status: "PENDING" }
        : { userId: uid, designationCode, status: "PENDING" };

      const freshEntry = await UserDesignation.findOne(stillPendingQuery)
        .session(session)
        .lean();

      if (!freshEntry) {
        return { success: false, reason: "Designation entry not found or no longer pending" };
      }

      const now = new Date();
      const updateQuery = entryIdObj
        ? { _id: entryIdObj, userId: uid, designationCode, status: "PENDING" }
        : { userId: uid, designationCode, status: "PENDING" };

      const result = await UserDesignation.findOneAndUpdate(
        updateQuery,
        {
          $set: {
            status: "APPROVED",
            approvedAt: now,
            approvedBy: aid,
            remarks: remarks?.trim() || null,
            // Mark that this designation was force-assigned / admin-approved
            // under relaxed rules so that user/admin UI can display it.
            forceAssigned: true,
          },
        },
        { new: true, session },
      );

      if (!result) {
        return {
          success: false,
          reason: "Designation entry not found or already modified",
        };
      }
      return { success: true };
    });
  }

  const now = new Date();

  const updateQuery = entryIdObj
    ? { _id: entryIdObj, userId: uid, designationCode, status: fromStatus }
    : { userId: uid, designationCode, status: fromStatus };

  const result = await UserDesignation.findOneAndUpdate(
    updateQuery,
    {
      $set: {
        status: toStatus,
        approvedAt: now,
        approvedBy: aid,
        remarks: remarks?.trim() || null,
        ...(toStatus === "APPROVED" ? { forceAssigned: true } : {}),
      },
    },
    { new: true },
  );

  if (!result) {
    return { success: false, reason: "Designation entry not found or already modified" };
  }

  return { success: true };
}

/** Convenience: approve/reject from PENDING */
async function processDesignationDecision(
  userId,
  designationCode,
  decision,
  remarks,
  adminId,
  designationEntryId = null,
) {
  const newStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  return transitionDesignationStatus(
    userId,
    designationCode,
    newStatus,
    remarks,
    adminId,
    designationEntryId,
  );
}

/** Set designation INACTIVE (APPROVED → INACTIVE) */
async function setDesignationInactive(
  userId,
  designationCode,
  remarks,
  adminId,
  designationEntryId = null,
) {
  return transitionDesignationStatus(
    userId,
    designationCode,
    "INACTIVE",
    remarks,
    adminId,
    designationEntryId,
  );
}

/**
 * Admin: Set holder availability (online/offline) for APPROVED designation.
 *
 * Only modifies `online` for an existing APPROVED UserDesignation.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} designationCode
 * @param {mongoose.Types.ObjectId|string|null} designationEntryId
 * @param {boolean} online
 * @param {mongoose.Types.ObjectId|string} adminId
 * @returns {Promise<{success:boolean, reason?:string, online?:boolean}>}
 */
async function setDesignationAvailability(
  userId,
  designationCode,
  designationEntryId,
  online,
  adminId,
) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const code = Number(designationCode);
  if (!Number.isFinite(code) || code < 1) {
    return { success: false, reason: "Invalid designationCode" };
  }

  const entryIdObj =
    designationEntryId && mongoose.Types.ObjectId.isValid(designationEntryId)
      ? new mongoose.Types.ObjectId(designationEntryId)
      : null;

  const query = entryIdObj
    ? { _id: entryIdObj, userId: uid, designationCode: code, status: "APPROVED" }
    : { userId: uid, designationCode: code, status: "APPROVED" };

  const onlineBool = online === true;

  const updated = await UserDesignation.updateOne(
    query,
    { $set: { online: onlineBool } },
  );

  if (!updated.matchedCount) {
    return {
      success: false,
      reason: "Approved designation entry not found (cannot update availability)",
    };
  }

  return { success: true, online: onlineBool };
}

/** Soft delete designation (sets status to DELETED, requires remarks) */
async function setDesignationDeleted(
  userId,
  designationCode,
  remarks,
  adminId,
  designationEntryId = null,
) {
  return transitionDesignationStatus(
    userId,
    designationCode,
    "DELETED",
    remarks,
    adminId,
    designationEntryId,
  );
}

/**
 * Get paginated downline users with approved designation.
 * Uses UserHierarchy for descendant IDs, then queries User.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} designationCode
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ users: Array, pagination: Object }>}
 */
async function getDownlineWithDesignation(userId, designationCode, options = {}) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const { page, limit, skip } = parsePaginationParams(options);

  const descendantIds = await UserHierarchy.distinct("user", {
    ancestor: uid,
  });

  if (descendantIds.length === 0) {
    return {
      users: [],
      pagination: buildPaginationMeta(page, limit, 0),
    };
  }

  const pipeline = [
    { $match: { _id: { $in: descendantIds }, status: 1 } },
    {
      $lookup: {
        from: "user_designations",
        let: { holderId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$holderId"] },
                  { $eq: ["$designationCode", designationCode] },
                  { $eq: ["$status", "APPROVED"] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "approvedDes",
      },
    },
    { $match: { "approvedDes.0": { $exists: true } } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              memberId: 1,
              name: 1,
              phone: 1,
              email: 1,
              status: 1,
              directCount: 1,
              totalDownlineCount: 1,
              createdAt: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline);
  const users = result?.items || [];
  const totalCount = result?.total?.[0]?.count ?? 0;

  return { users, pagination: buildPaginationMeta(page, limit, totalCount) };
}

/**
 * Get designation applications by status - paginated.
 * Status: "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE" | "ALL"
 *
 * @param {string} status
 * @param {{ page?: number, limit?: number, designationCode?: number }} options
 * @returns {Promise<{ applications: Array, pagination: Object }>}
 */
async function getDesignationApplications(status, options = {}) {
  const { page, limit, skip } = parsePaginationParams(options);
  const {
    designationCode,
    memberId,
    name,
    phone,
    email,
    countryId,
    stateId,
    districtId,
    villageId,
    hasRemarks,
    appliedFrom,
    appliedTo,
    decidedFrom,
    decidedTo,
    online,
    hasReviews,
    minAvgRating,
    minTotalRatings,
  } = options;

  const parseDayStart = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const parseDayEnd = (s) => {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const appliedFromDt = parseDayStart(appliedFrom);
  const appliedToDt = parseDayEnd(appliedTo);
  const decidedFromDt = parseDayStart(decidedFrom);
  const decidedToDt = parseDayEnd(decidedTo);

  const toObjectIdOrNull = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
  };

  const countryObjId = toObjectIdOrNull(countryId);
  const stateObjId = toObjectIdOrNull(stateId);
  const districtObjId = toObjectIdOrNull(districtId);
  const villageObjId = toObjectIdOrNull(villageId);

  const statusFilter =
    status === "ALL"
      ? { status: { $in: ["PENDING", "APPROVED", "REJECTED", "INACTIVE"] } }
      : { status };

  const match = { ...statusFilter };
  if (designationCode != null) match.designationCode = designationCode;
  if (online != null) match.online = online;
  if (hasReviews) match.totalRatings = { $gt: 0 };
  if (minAvgRating != null && Number(minAvgRating) > 0) {
    match.avgRating = { $gte: Number(minAvgRating) };
  }
  if (minTotalRatings != null && Number(minTotalRatings) > 0) {
    match.totalRatings = { $gte: Number(minTotalRatings) };
  }

  if (hasRemarks) {
    match.remarks = { $exists: true, $ne: null, $ne: "" };
  }

  if (appliedFromDt || appliedToDt) {
    match.appliedAt = {
      ...(appliedFromDt ? { $gte: appliedFromDt } : {}),
      ...(appliedToDt ? { $lte: appliedToDt } : {}),
    };
  }

  if (decidedFromDt || decidedToDt) {
    match.approvedAt = {
      ...(decidedFromDt ? { $gte: decidedFromDt } : {}),
      ...(decidedToDt ? { $lte: decidedToDt } : {}),
    };
  }

  const userMatch = {};
  if (memberId) userMatch["u.memberId"] = { $regex: String(memberId), $options: "i" };
  if (name) userMatch["u.name"] = { $regex: String(name), $options: "i" };
  if (phone) userMatch["u.phone"] = { $regex: String(phone), $options: "i" };
  if (email) userMatch["u.email"] = { $regex: String(email), $options: "i" };

  const locationMatch = {};
  if (countryObjId) locationMatch["ud.countryId"] = countryObjId;
  if (stateObjId) locationMatch["ud.stateId"] = stateObjId;
  if (districtObjId) locationMatch["ud.districtId"] = districtObjId;
  if (villageObjId) locationMatch["ud.villageId"] = villageObjId;

  const sortDir = -1;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: "$u" },
    { $match: Object.keys(userMatch).length > 0 ? userMatch : {} },
    {
      $lookup: {
        from: "user_details",
        localField: "userId",
        foreignField: "userId",
        as: "ud",
      },
    },
    {
      $unwind: {
        path: "$ud",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: Object.keys(locationMatch).length > 0 ? locationMatch : {} },
    {
      $lookup: {
        from: "countries",
        localField: "ud.countryId",
        foreignField: "_id",
        as: "country",
      },
    },
    {
      $unwind: {
        path: "$country",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "states",
        localField: "ud.stateId",
        foreignField: "_id",
        as: "state",
      },
    },
    {
      $unwind: {
        path: "$state",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "districts",
        localField: "ud.districtId",
        foreignField: "_id",
        as: "district",
      },
    },
    {
      $unwind: {
        path: "$district",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "villages",
        localField: "ud.villageId",
        foreignField: "_id",
        as: "village",
      },
    },
    {
      $unwind: {
        path: "$village",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { appliedAt: sortDir, approvedAt: sortDir, _id: sortDir } },
    {
      $group: {
        _id: { userId: "$userId", designationCode: "$designationCode" },
        memberId: { $first: "$u.memberId" },
        name: { $first: "$u.name" },
        phone: { $first: "$u.phone" },
        directCount: { $first: "$u.directCount" },
        totalDownlineCount: { $first: "$u.totalDownlineCount" },
        country: { $first: "$country.name" },
        state: { $first: "$state.name" },
        district: { $first: "$district.name" },
        nativeVillage: { $first: "$village.name" },
        currentAddress: { $first: "$ud.address" },
        address: { $first: "$ud.address" },
        designation: {
          $first: {
            _id: "$_id",
            designationCode: "$designationCode",
            status: "$status",
            appliedAt: "$appliedAt",
            approvedAt: "$approvedAt",
            approvedBy: "$approvedBy",
            remarks: "$remarks",
            online: "$online",
            avgRating: "$avgRating",
            totalRatings: "$totalRatings",
          },
        },
      },
    },
    {
      $sort: {
        "designation.appliedAt": sortDir,
        "designation.approvedAt": sortDir,
        "designation._id": sortDir,
      },
    },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              userId: "$_id.userId",
              memberId: 1,
              name: 1,
              phone: 1,
              directCount: 1,
              totalDownlineCount: 1,
              country: 1,
              state: 1,
              district: 1,
              nativeVillage: 1,
              currentAddress: 1,
              address: 1,
              designation: "$designation",
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await UserDesignation.aggregate(pipeline);
  const items = result?.items || [];
  const totalCount = result?.total?.[0]?.count ?? 0;

  const settings = await WalletSettings.getOrCreateSettings();
  const designationMap = new Map(
    (settings.designations || []).map((d) => [d.designationCode, d.name])
  );

  const applicationMapper = (i) => ({
    userId: i.userId || i._id,
    memberId: i.memberId,
    name: i.name,
    phone: i.phone,
    country: i.country || null,
    state: i.state || null,
    district: i.district || null,
    nativeVillage: i.nativeVillage || null,
    currentAddress: i.currentAddress || null,
    address: i.address || null,
    directCount: i.directCount,
    totalDownlineCount: i.totalDownlineCount,
    designationCode: i.designation?.designationCode,
    designationEntryId: i.designation?._id?.toString?.() || i.designation?._id,
    designationName: designationMap.get(i.designation?.designationCode) || "-",
    designationStatus: i.designation?.status,
    appliedAt: i.designation?.appliedAt,
    approvedAt: i.designation?.approvedAt,
    remarks: i.designation?.remarks,
    forceAssigned: !!i.designation?.forceAssigned,
    online: (() => {
      if (i.designation?.status !== "APPROVED") return false;
      return !!i.designation?.online;
    })(),
    avgRating: (() => {
      if (i.designation?.designationCode == null) return 0;
      return i.designation?.avgRating ?? 0;
    })(),
    totalRatings: (() => {
      if (i.designation?.designationCode == null) return 0;
      return i.designation?.totalRatings ?? 0;
    })(),
  });

  return {
    applications: items.map(applicationMapper),
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

async function getDesignationRatingReviews(userId, designationCode, options = {}) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const { page, limit, skip } = parsePaginationParams(options);

  const query = {
    assignedTo: uid,
    designationCode: Number(designationCode),
    status: "COMPLETED",
    rating: { $ne: null },
  };

  const [items, totalCount] = await Promise.all([
    Appointment.find(query)
      .populate("requesterId", "memberId name phone email")
      .select("requesterId rating review completedAt updatedAt requestedAt")
      .sort({ completedAt: -1, updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  const reviews = items.map((r) => ({
    appointmentId: r._id,
    reviewerUserId: r.requesterId?._id || null,
    reviewerMemberId: r.requesterId?.memberId || "-",
    reviewerName: r.requesterId?.name || "-",
    reviewerPhone: r.requesterId?.phone || "-",
    reviewerEmail: r.requesterId?.email || "-",
    rating: r.rating,
    review: r.review || "",
    completedAt: r.completedAt || null,
    updatedAt: r.updatedAt || null,
    requestedAt: r.requestedAt || null,
  }));

  return {
    reviews,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Get designation summary counts per status (and booking availability).
 * Uses the same root/subdocument filters as listDesignations, but returns counts.
 *
 * @param {{
 *  designationCode?: number,
 *  memberId?: string,
 *  name?: string,
 *  phone?: string,
 *  email?: string,
 *  hasRemarks?: boolean,
 *  appliedFrom?: string,
 *  appliedTo?: string,
 *  decidedFrom?: string,
 *  decidedTo?: string,
 * }} options
 * @returns {Promise<{ pending:number, approved:number, rejected:number, inactive:number, bookingOn:number, total:number }>}
 */
async function getDesignationSummary(options = {}) {
  const {
    designationCode,
    memberId,
    name,
    phone,
    email,
    countryId,
    stateId,
    districtId,
    villageId,
    hasRemarks,
    appliedFrom,
    appliedTo,
    decidedFrom,
    decidedTo,
    online,
  } = options;

  const parseDayStart = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const parseDayEnd = (s) => {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const appliedFromDt = parseDayStart(appliedFrom);
  const appliedToDt = parseDayEnd(appliedTo);
  const decidedFromDt = parseDayStart(decidedFrom);
  const decidedToDt = parseDayEnd(decidedTo);

  const toObjectIdOrNull = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
  };

  const countryObjId = toObjectIdOrNull(countryId);
  const stateObjId = toObjectIdOrNull(stateId);
  const districtObjId = toObjectIdOrNull(districtId);
  const villageObjId = toObjectIdOrNull(villageId);

  const locationMatch = {};
  if (countryObjId) locationMatch["ud.countryId"] = countryObjId;
  if (stateObjId) locationMatch["ud.stateId"] = stateObjId;
  if (districtObjId) locationMatch["ud.districtId"] = districtObjId;
  if (villageObjId) locationMatch["ud.villageId"] = villageObjId;

  const match = {};
  // DELETED is no longer exposed to admin/user UI.
  match.status = { $ne: "DELETED" };
  if (designationCode != null) match.designationCode = designationCode;
  if (online != null) match.online = online;

  if (hasRemarks) {
    match.remarks = { $exists: true, $ne: null, $ne: "" };
  }

  if (appliedFromDt || appliedToDt) {
    match.appliedAt = {
      ...(appliedFromDt ? { $gte: appliedFromDt } : {}),
      ...(appliedToDt ? { $lte: appliedToDt } : {}),
    };
  }

  if (decidedFromDt || decidedToDt) {
    match.approvedAt = {
      ...(decidedFromDt ? { $gte: decidedFromDt } : {}),
      ...(decidedToDt ? { $lte: decidedToDt } : {}),
    };
  }

  const userMatch = {};
  if (memberId) userMatch.memberId = { $regex: String(memberId), $options: "i" };
  if (name) userMatch.name = { $regex: String(name), $options: "i" };
  if (phone) userMatch.phone = { $regex: String(phone), $options: "i" };
  if (email) userMatch.email = { $regex: String(email), $options: "i" };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: "$u" },
    { $match: Object.keys(userMatch).length > 0 ? userMatch : {} },
    {
      $lookup: {
        from: "user_details",
        localField: "userId",
        foreignField: "userId",
        as: "ud",
      },
    },
    {
      $unwind: {
        path: "$ud",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: Object.keys(locationMatch).length > 0 ? locationMatch : {} },
    {
      $addFields: {
        bookingAvailable: {
          $cond: [
            {
              $and: [
                { $eq: ["$status", "APPROVED"] },
                { $eq: ["$online", true] },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
    {
      $group: {
        // Deduplicate by user + designationCode + status
        _id: { status: "$status", userId: "$userId", designationCode: "$designationCode" },
        bookingAvailable: { $max: "$bookingAvailable" },
      },
    },
    {
      $group: {
        _id: "$_id.status",
        count: { $sum: 1 },
        bookingOn: { $sum: "$bookingAvailable" },
      },
    },
  ];

  const rows = await UserDesignation.aggregate(pipeline);
  const map = new Map(rows.map((r) => [r._id, r]));

  const pending = map.get("PENDING")?.count ?? 0;
  const approved = map.get("APPROVED")?.count ?? 0;
  const rejected = map.get("REJECTED")?.count ?? 0;
  const inactive = map.get("INACTIVE")?.count ?? 0;

  const bookingOn = map.get("APPROVED")?.bookingOn ?? 0;
  const total = pending + approved + rejected + inactive;

  return { pending, approved, rejected, inactive, bookingOn, total };
}

/** Convenience: get pending applications */
async function getPendingApplications(options = {}) {
  return getDesignationApplications("PENDING", options);
}

module.exports = {
  applyForDesignation,
  processDesignationDecision,
  setDesignationInactive,
  setDesignationAvailability,
  setDesignationDeleted,
  transitionDesignationStatus,
  getDownlineWithDesignation,
  getPendingApplications,
  getDesignationApplications,
  getDesignationRatingReviews,
  getDesignationSummary,
  getEligibilityForAll,
};
