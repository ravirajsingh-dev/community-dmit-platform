/**
 * SBI PRO Session Service - Phase 3
 * Designation_1 (Trainer) workflow only.
 */

const mongoose = require("mongoose");
const SbiProSession = require("../models/SbiProSession");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { FINGER_TYPES } = require("../models/SbiProSession");
const { uploadToR2, deleteFromR2 } = require("../helpers/r2Helper");

const DESIGNATION_1 = 1;

// Valid state transitions: from -> [to]
const VALID_TRANSITIONS = {
  CREATED: ["UPLOADING"],
  UPLOADING: ["UPLOADED"],
  UPLOADED: ["VERIFICATION_PENDING"],
  VERIFICATION_PENDING: ["ANALYSIS_PENDING", "REOPENED"],
  REOPENED: ["UPLOADING"],
  ANALYSIS_PENDING: ["CLOSED"],
  CLOSED: [],
};

function canTransition(from, to) {
  return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to);
}

/** Safely check if a field (ObjectId or populated object) matches oid. Works with .lean() + populate. */
function idMatches(field, oid) {
  if (!field) return false;
  if (typeof field.equals === "function") return field.equals(oid);
  const id = field._id ?? field;
  return id && String(id) === String(oid);
}

/**
 * Create SBI PRO session when appointment becomes ACCEPTED (designationCode 1 only).
 * @param {ObjectId} appointmentId - Appointment ID
 * @param {Object} [opts] - Options: { session } for transaction
 */
async function createSessionForAppointment(appointmentId, opts = {}) {
  const apt = await Appointment.findById(appointmentId)
    .session(opts.session || null)
    .lean();
  if (!apt) return null;
  if (apt.designationCode !== DESIGNATION_1) return null;

  const existing = await SbiProSession.findOne({ appointmentId })
    .session(opts.session || null)
    .lean();
  if (existing) return existing;

  const beneficiaryType = apt.beneficiaryType || "SELF";
  const isSelf = beneficiaryType === "SELF";

  const createOpts = opts.session ? { session: opts.session } : {};
  const sess = await SbiProSession.create(
    [
      {
        appointmentId: apt._id,
        requesterId: apt.requesterId,
        userId: isSelf ? apt.requesterId : null,
        trainerId: apt.assignedTo,
        beneficiaryType,
        beneficiaryName: apt.beneficiaryName || null,
        beneficiaryPhone: apt.beneficiaryPhone || null,
        status: "CREATED",
      },
    ],
    createOpts
  );
  return Array.isArray(sess) ? sess[0] : sess;
}

const UPLOADABLE_STATUSES = ["CREATED", "UPLOADING", "REOPENED"];

/**
 * Upload finger image - trainer only.
 * Uses findOneAndUpdate with status condition for state safety.
 */
async function uploadFinger(trainerId, appointmentId, fingerType, file) {
  if (!FINGER_TYPES.includes(fingerType)) {
    return { success: false, reason: "Invalid fingerType" };
  }

  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    trainerId: new mongoose.Types.ObjectId(trainerId),
    status: { $in: UPLOADABLE_STATUSES },
  }).lean();

  if (!sess) {
    return { success: false, reason: "Session not found or access denied" };
  }

  const { url, key } = await uploadToR2(file, "sbi-pro");

  const wasEmpty = !sess.images || !sess.images[fingerType];
  const currentCount = sess.uploadedCount || 0;
  const newCount = wasEmpty ? currentCount + 1 : currentCount;
  const newStatus =
    newCount >= 10
      ? "UPLOADED"
      : ["CREATED", "REOPENED"].includes(sess.status)
        ? "UPLOADING"
        : sess.status;

  const updateQuery = {
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    trainerId: new mongoose.Types.ObjectId(trainerId),
    status: { $in: UPLOADABLE_STATUSES },
  };

  const updateOps = {
    $set: {
      [`images.${fingerType}`]: url,
      [`imageKeys.${fingerType}`]: key,
      status: newStatus,
    },
  };
  if (wasEmpty) {
    updateOps.$inc = { uploadedCount: 1 };
  }

  const final = await SbiProSession.findOneAndUpdate(
    updateQuery,
    updateOps,
    { new: true }
  ).lean();

  if (!final) {
    return { success: false, reason: "Session state changed, please try again" };
  }

  return {
    success: true,
    session: final,
    url,
  };
}

const DELETEABLE_STATUSES = [
  "UPLOADING",
  "UPLOADED",
  "VERIFICATION_PENDING",
  "REOPENED",
  "ANALYSIS_PENDING",
];

/**
 * Check if finger image can be deleted. Allowed when:
 * - status in DELETEABLE_STATUSES, OR
 * - status CLOSED and reportUrl exists (report uploaded - admin can delete images for cleanup)
 */
function canDeleteFingerImage(sess) {
  if (!sess) return false;
  if (DELETEABLE_STATUSES.includes(sess.status)) return true;
  if (sess.status === "CLOSED" && sess.reportUrl) return true;
  return false;
}

/**
 * Delete finger image - admin only. Permanently removes from R2 and DB.
 * Disabled until admin uploads report (reportUrl). After report uploaded, always allowed.
 */
async function deleteFingerImage(appointmentId, fingerType) {
  if (!FINGER_TYPES.includes(fingerType)) {
    return { success: false, reason: "Invalid fingerType" };
  }

  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  }).lean();

  if (!sess) {
    return { success: false, reason: "Session not found" };
  }

  if (!canDeleteFingerImage(sess)) {
    return {
      success: false,
      reason: "Upload report first before deleting images",
    };
  }

  const imageKey = sess.imageKeys?.[fingerType];
  if (imageKey) {
    try {
      await deleteFromR2(imageKey);
    } catch (err) {
      console.error("[SBI PRO] R2 delete error for", fingerType, err);
      return { success: false, reason: "Failed to delete from storage" };
    }
  }
  // If no imageKey (legacy record), we still clear from DB - R2 orphan may remain

  const hadImage = !!sess.images?.[fingerType];
  const query = {
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  };
  if (sess.status === "CLOSED") {
    query.reportUrl = { $exists: true, $ne: null };
  } else {
    query.status = { $in: DELETEABLE_STATUSES };
  }
  const result = await SbiProSession.findOneAndUpdate(
    query,
    {
      $set: {
        [`images.${fingerType}`]: null,
        [`imageKeys.${fingerType}`]: null,
      },
      $inc: { uploadedCount: hadImage ? -1 : 0 },
    },
    { new: true }
  ).lean();

  if (!result) {
    return { success: false, reason: "Session state changed, please try again" };
  }

  return { success: true, session: result };
}

/**
 * Delete all finger images - admin only. Same rules as deleteFingerImage.
 * Permanently removes all 10 images from R2 and DB. Enabled only after report uploaded.
 */
async function deleteAllFingerImages(appointmentId) {
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  }).lean();

  if (!sess) {
    return { success: false, reason: "Session not found" };
  }

  if (!canDeleteFingerImage(sess)) {
    return {
      success: false,
      reason: "Upload report first before deleting images",
    };
  }

  const imageKeys = sess.imageKeys || {};
  const keysToDelete = Object.values(imageKeys).filter(Boolean);

  for (const key of keysToDelete) {
    try {
      await deleteFromR2(key);
    } catch (err) {
      console.error("[SBI PRO] R2 delete error for key", key, err);
    }
  }

  const unsetOps = {};
  FINGER_TYPES.forEach((ft) => {
    unsetOps[`images.${ft}`] = 1;
    unsetOps[`imageKeys.${ft}`] = 1;
  });

  const query = {
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  };
  if (sess.status === "CLOSED") {
    query.reportUrl = { $exists: true, $ne: null };
  } else {
    query.status = { $in: DELETEABLE_STATUSES };
  }

  const result = await SbiProSession.findOneAndUpdate(
    query,
    {
      $unset: unsetOps,
      $set: { uploadedCount: 0 },
    },
    { new: true }
  ).lean();

  if (!result) {
    return { success: false, reason: "Session state changed, please try again" };
  }

  return { success: true, session: result };
}

/**
 * Submit session - trainer only. Require all 10 uploaded.
 */
async function submitSession(trainerId, appointmentId) {
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    trainerId: new mongoose.Types.ObjectId(trainerId),
  });

  if (!sess) {
    return { success: false, reason: "Session not found or access denied" };
  }

  if (sess.status !== "UPLOADED") {
    return { success: false, reason: "Session must have all 10 images uploaded" };
  }

  if (sess.uploadedCount !== 10) {
    return { success: false, reason: "All 10 finger images required" };
  }

  const now = new Date();
  const result = await SbiProSession.findOneAndUpdate(
    { _id: sess._id, status: "UPLOADED" },
    {
      $set: {
        status: "VERIFICATION_PENDING",
        verificationRequestedAt: now,
      },
    },
    { new: true }
  );

  if (!result) {
    return { success: false, reason: "Session state changed, try again" };
  }

  return { success: true, session: result };
}

/**
 * User verify (confirm or reject).
 * Booker (requester) verifies for both SELF and OTHER beneficiaries.
 */
async function userVerify(userId, appointmentId, confirm) {
  const uid = new mongoose.Types.ObjectId(userId);
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    $or: [{ userId: uid }, { requesterId: uid }],
  });

  if (!sess) {
    return { success: false, reason: "Session not found or access denied" };
  }

  if (sess.status !== "VERIFICATION_PENDING") {
    return { success: false, reason: "Session not pending verification" };
  }

  const now = new Date();

  if (confirm) {
    const result = await SbiProSession.findOneAndUpdate(
      { _id: sess._id, status: "VERIFICATION_PENDING" },
      {
        $set: {
          status: "ANALYSIS_PENDING",
          verifiedAt: now,
        },
      },
      { new: true }
    );
    if (!result) {
      return { success: false, reason: "State changed, try again" };
    }
    return { success: true, session: result };
  } else {
    const result = await SbiProSession.findOneAndUpdate(
      { _id: sess._id, status: "VERIFICATION_PENDING" },
      { $set: { status: "REOPENED" } },
      { new: true }
    );
    if (!result) {
      return { success: false, reason: "State changed, try again" };
    }
    return { success: true, session: result };
  }
}

/**
 * Upload report PDF - admin only. Uploads PDF, sets reportUrl/reportKey, status CLOSED.
 * Requires session in ANALYSIS_PENDING. Finger analysis should be saved first.
 */
async function uploadReport(appointmentId, file) {
  if (!file || !file.buffer) {
    return { success: false, reason: "PDF file required" };
  }
  if (file.mimetype !== "application/pdf") {
    return { success: false, reason: "Only PDF files allowed" };
  }

  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    status: "ANALYSIS_PENDING",
  }).lean();

  if (!sess) {
    return {
      success: false,
      reason: "Session not found or not in ANALYSIS_PENDING",
    };
  }

  const { url, key } = await uploadToR2(file, "sbi-pro-reports");

  const result = await SbiProSession.findOneAndUpdate(
    {
      appointmentId: new mongoose.Types.ObjectId(appointmentId),
      status: "ANALYSIS_PENDING",
    },
    {
      $set: {
        reportUrl: url,
        reportKey: key,
        status: "CLOSED",
        analysisCompletedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  if (!result) {
    return { success: false, reason: "Session state changed, try again" };
  }

  // Q3.1: Appointment COMPLETED when SBI PRO session CLOSED (progression for Counsellor)
  await Appointment.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(appointmentId), status: "ACCEPTED" },
    { $set: { status: "COMPLETED" } }
  );

  return { success: true, session: result };
}

/**
 * Replace report PDF - admin only. For CLOSED sessions with reportUrl.
 * Uploads new PDF, replaces old report in R2 and DB.
 */
async function replaceReport(appointmentId, file) {
  if (!file || !file.buffer) {
    return { success: false, reason: "PDF file required" };
  }
  if (file.mimetype !== "application/pdf") {
    return { success: false, reason: "Only PDF files allowed" };
  }

  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
    status: "CLOSED",
    reportUrl: { $exists: true, $ne: null },
  }).lean();

  if (!sess) {
    return {
      success: false,
      reason: "Session not found or no report to replace. Session must be CLOSED with an existing report.",
    };
  }

  const { url, key } = await uploadToR2(file, "sbi-pro-reports");
  const oldKey = sess.reportKey;

  const result = await SbiProSession.findOneAndUpdate(
    {
      appointmentId: new mongoose.Types.ObjectId(appointmentId),
      status: "CLOSED",
    },
    {
      $set: {
        reportUrl: url,
        reportKey: key,
        analysisCompletedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  if (!result) {
    return { success: false, reason: "Session state changed, try again" };
  }

  if (oldKey) {
    try {
      await deleteFromR2(oldKey);
    } catch (err) {
      console.error("[SBI PRO] R2 delete old report error:", err);
    }
  }

  return { success: true, session: result };
}

/**
 * Mark analysis done - admin only. Immediately transition to CLOSED.
 */
async function markAnalysisDone(appointmentId) {
  const result = await SbiProSession.findOneAndUpdate(
    { appointmentId: new mongoose.Types.ObjectId(appointmentId), status: "ANALYSIS_PENDING" },
    {
      $set: {
        status: "CLOSED",
        analysisCompletedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!result) {
    return { success: false, reason: "Session not found or not in ANALYSIS_PENDING" };
  }

  // Q3.1: Appointment COMPLETED when SBI PRO session CLOSED (progression for Counsellor)
  await Appointment.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(appointmentId), status: "ACCEPTED" },
    { $set: { status: "COMPLETED" } }
  );

  return { success: true, session: result };
}

/**
 * Auto-verify after 24 hours (VERIFICATION_PENDING -> ANALYSIS_PENDING).
 * Uses verificationRequestedAt for idempotency.
 */
async function autoVerifyAfter24Hours() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await SbiProSession.updateMany(
    {
      status: "VERIFICATION_PENDING",
      verificationRequestedAt: { $lte: cutoff },
    },
    {
      $set: {
        status: "ANALYSIS_PENDING",
        verifiedAt: new Date(),
      },
    }
  );
  return { modifiedCount: result.modifiedCount };
}

/**
 * List sessions for trainer (assigned only).
 */
async function listForTrainer(trainerId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
  const lim = Math.min(50, Math.max(1, limit));

  const query = { trainerId: new mongoose.Types.ObjectId(trainerId) };
  if (status) query.status = status;

  const [items, total] = await Promise.all([
    SbiProSession.find(query)
      .populate("userId", "name memberId phone")
      .populate("requesterId", "name memberId")
      .populate({
        path: "appointmentId",
        select: "dateKey sessionStartTime slotId designationCode",
        populate: {
          path: "slotId",
          select: "label startTime endTime",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    SbiProSession.countDocuments(query),
  ]);

  return {
    sessions: items,
    pagination: {
      page: Math.ceil(skip / lim) + 1,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim),
    },
  };
}

/**
 * List sessions for end user (booker) - all reports (self + others they booked for).
 */
async function listForUser(userId, options = {}) {
  const { status } = options;
  const uid = new mongoose.Types.ObjectId(userId);
  const query = { $or: [{ userId: uid }, { requesterId: uid }] };
  if (status) query.status = status;

  const items = await SbiProSession.find(query)
    .populate("trainerId", "name memberId")
    .populate("userId", "name memberId phone")
    .populate("requesterId", "name memberId")
    .populate({
      path: "appointmentId",
      select: "dateKey sessionStartTime slotId designationCode",
      populate: {
        path: "slotId",
        select: "label startTime endTime",
      },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return { sessions: items };
}

/**
 * List sessions pending booker verification (SELF or OTHER - booker verifies).
 */
async function listPendingForUser(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const items = await SbiProSession.find({
    $or: [{ userId: uid }, { requesterId: uid }],
    status: "VERIFICATION_PENDING",
  })
    .populate("trainerId", "name memberId")
    .populate("userId", "name memberId phone")
    .populate("requesterId", "name memberId")
    .populate({
      path: "appointmentId",
      select: "dateKey sessionStartTime slotId designationCode",
      populate: {
        path: "slotId",
        select: "label startTime endTime",
      },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return { sessions: items };
}

/**
 * List sessions for admin with filters.
 */
async function listForAdmin(options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    trainerId,
    userMemberId,
    dateFrom,
    dateTo,
  } = options;
  const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
  const lim = Math.min(50, Math.max(1, limit));

  const query = {};
  if (status) query.status = status;
  if (trainerId) {
    const rawTrainerFilter = String(trainerId).trim();
    if (mongoose.Types.ObjectId.isValid(rawTrainerFilter)) {
      query.trainerId = new mongoose.Types.ObjectId(rawTrainerFilter);
    } else {
      const escaped = rawTrainerFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const trainerUsers = await User.find({
        memberId: { $regex: escaped, $options: "i" },
      })
        .select("_id")
        .lean();
      const trainerIds = trainerUsers.map((u) => u._id);
      if (trainerIds.length === 0) {
        return {
          sessions: [],
          pagination: {
            page: Math.ceil(skip / lim) + 1,
            limit: lim,
            total: 0,
            totalPages: 0,
          },
        };
      }
      query.trainerId = { $in: trainerIds };
    }
  }
  if (userMemberId) {
    const rawUserFilter = String(userMemberId).trim();
    const escaped = rawUserFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const userDocs = await User.find({
      memberId: { $regex: escaped, $options: "i" },
    })
      .select("_id")
      .lean();
    const userIds = userDocs.map((u) => u._id);
    if (userIds.length === 0) {
      return {
        sessions: [],
        pagination: {
          page: Math.ceil(skip / lim) + 1,
          limit: lim,
          total: 0,
          totalPages: 0,
        },
      };
    }
    query.userId = { $in: userIds };
  }
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z");
    if (dateTo) query.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
  }

  const [items, total] = await Promise.all([
    SbiProSession.find(query)
      .populate("trainerId", "name memberId")
      .populate("userId", "name memberId")
      .populate({
        path: "appointmentId",
        select: "dateKey sessionStartTime slotId designationCode",
        populate: {
          path: "slotId",
          select: "label startTime endTime",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    SbiProSession.countDocuments(query),
  ]);

  return {
    sessions: items,
    pagination: {
      page: Math.ceil(skip / lim) + 1,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim),
    },
  };
}

/**
 * Get single session by appointmentId (with access check).
 * role: "trainer" | "user" | "any" (any = trainer or user)
 */
async function getByAppointmentId(appointmentId, actorId, role = "any") {
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  })
    .populate("userId", "name memberId phone")
    .populate("requesterId", "name memberId")
    .lean();

  if (!sess) return null;

  const oid = new mongoose.Types.ObjectId(actorId);
  if (role === "trainer" && !idMatches(sess.trainerId, oid)) return null;
  if (role === "user") {
    const hasAccess = idMatches(sess.userId, oid) || idMatches(sess.requesterId, oid);
    if (!hasAccess) return null;
  }
  if (role === "any") {
    const hasAccess =
      idMatches(sess.trainerId, oid) ||
      idMatches(sess.userId, oid) ||
      idMatches(sess.requesterId, oid);
    if (!hasAccess) return null;
  }

  return sess;
}

/**
 * Get image URL for admin (no actor check - admin route is protected).
 */
async function getImageUrlForAdmin(appointmentId, fingerType) {
  if (!FINGER_TYPES.includes(fingerType)) return null;
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  }).lean();
  if (!sess?.images?.[fingerType]) return null;
  return sess.images[fingerType];
}

/**
 * Check if user (beneficiary) has completed SBI PRO - fingerprint lock.
 * Once SBI PRO session is CLOSED, user cannot book SBI PRO again (lifetime).
 */
async function isUserSbiProLocked(userId) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
  const count = await SbiProSession.countDocuments({
    userId: uid,
    status: "CLOSED",
  });
  return count > 0;
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * Check if beneficiary phone has completed SBI PRO (booking for others).
 * Child with no phone uses parent phone (CLEAR Q2).
 */
async function isBeneficiaryPhoneSbiProLocked(phone) {
  const p = normalizePhone(phone);
  if (!p) return false;
  const count = await SbiProSession.countDocuments({
    beneficiaryPhone: p,
    status: "CLOSED",
  });
  return count > 0;
}

module.exports = {
  isUserSbiProLocked,
  isBeneficiaryPhoneSbiProLocked,
  createSessionForAppointment,
  uploadFinger,
  deleteFingerImage,
  deleteAllFingerImages,
  uploadReport,
  replaceReport,
  submitSession,
  userVerify,
  markAnalysisDone,
  autoVerifyAfter24Hours,
  listForTrainer,
  listForUser,
  listPendingForUser,
  listForAdmin,
  getByAppointmentId,
  getImageUrlForAdmin,
  canTransition,
  DESIGNATION_1,
};
