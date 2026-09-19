/**
 * Counselling Session Service - Designation_2 (COUNSELLOR)
 * Flow: CREATED → COUNSELLOR_COMPLETED → USER_CONFIRMATION_PENDING → CLOSED
 * Commission credited only when user/admin confirms & closes (sab theek).
 */

const mongoose = require("mongoose");
const CounsellingSession = require("../models/CounsellingSession");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const counsellorCommissionService = require("./counsellorCommissionService");

const DESIGNATION_2 = 2;

/**
 * Create CounsellingSession when appointment (designation 2) becomes ACCEPTED.
 */
async function createSessionForAppointment(appointmentId, opts = {}) {
  const apt = await Appointment.findById(appointmentId)
    .session(opts.session || null)
    .lean();
  if (!apt) return null;
  if (apt.designationCode !== DESIGNATION_2) return null;

  const existing = await CounsellingSession.findOne({ appointmentId })
    .session(opts.session || null)
    .lean();
  if (existing) return existing;

  const createOpts = opts.session ? { session: opts.session } : {};
  const sess = await CounsellingSession.create(
    [
      {
        appointmentId: apt._id,
        counsellorId: apt.assignedTo,
        requesterId: apt.requesterId,
        status: "CREATED",
        isPaid: apt.isPaid === true,
        chargedAmount: Number(apt.chargedAmount || 0),
      },
    ],
    createOpts
  );
  return Array.isArray(sess) ? sess[0] : sess;
}

/**
 * Counsellor marks counselling complete.
 * CREATED → COUNSELLOR_COMPLETED, sets USER_CONFIRMATION_PENDING.
 */
async function counsellorMarkComplete(counsellorId, appointmentId, data = {}) {
  const hid = mongoose.Types.ObjectId.isValid(counsellorId)
    ? new mongoose.Types.ObjectId(counsellorId)
    : counsellorId;
  const aid = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : appointmentId;

  let sess = await CounsellingSession.findOne({
    appointmentId: aid,
    counsellorId: hid,
    status: { $in: ["CREATED", "RECOUNSELLING_IN_PROGRESS"] },
  }).lean();

  // Lazy create: if appointment is ACCEPTED but session was never created (edge case / legacy)
  if (!sess) {
    const apt = await Appointment.findOne({
      _id: aid,
      assignedTo: hid,
      designationCode: DESIGNATION_2,
      status: "ACCEPTED",
    }).lean();
    if (apt) {
      sess = await createSessionForAppointment(aid);
      if (sess) {
        sess = sess.toObject ? sess.toObject() : { ...sess };
      }
    }
  }

  if (!sess) {
    return { success: false, reason: "Session not found or already completed", code: "SESSION_NOT_FOUND" };
  }

  await CounsellingSession.updateOne(
    { _id: sess._id },
    {
      $set: {
        status: "USER_CONFIRMATION_PENDING",
        completedAt: new Date(),
        counsellorNotes: data.notes || null,
        durationMinutes: data.durationMinutes ?? null,
        mode: data.mode || null,
      },
    }
  );

  return { success: true, session: await CounsellingSession.findById(sess._id).lean() };
}

/**
 * User confirms and closes - step-by-step: counselling done? → rating → issue? → confirm.
 * Only when userConfirmedCounsellingDone=true and !issueReported → credit commission, CLOSED.
 */
async function userConfirmAndClose(requesterId, counsellingSessionId, data = {}) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  const sid = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : counsellingSessionId;

  const sess = await CounsellingSession.findOne({
    _id: sid,
    requesterId: uid,
    status: "USER_CONFIRMATION_PENDING",
  })
    .populate("appointmentId")
    .lean();

  if (!sess) {
    return { success: false, reason: "Session not found or not pending confirmation", code: "SESSION_NOT_FOUND" };
  }

  const counsellingDone = data.counsellingDone; // boolean - did counselling happen?
  const rating = data.rating; // optional 0-5
  const hasIssue = data.hasIssue === true;
  const issueDescription = data.issueDescription || null;

  if (counsellingDone === false || hasIssue) {
    // Issue reported - notify counsellor + admin, request stays open
    await CounsellingSession.updateOne(
      { _id: sid },
      {
        $set: {
          status: "ISSUE_REPORTED",
          userConfirmedCounsellingDone: counsellingDone,
          issueReported: true,
          issueReportedAt: new Date(),
          issueDescription,
          rating: rating ?? null,
        },
      }
    );
    return {
      success: true,
      closed: false,
      issueReported: true,
      message: "Issue reported. Resolve via website - user will confirm again.",
    };
  }

  // User says sab theek - close and credit commission
  return runWithTransactionRetry(async (session) => {
    await CounsellingSession.updateOne(
      { _id: sid },
      {
        $set: {
          status: "CLOSED",
          userClosedAt: new Date(),
          closedBy: "USER",
          userConfirmedCounsellingDone: true,
          issueReported: false,
          rating: rating ?? null,
        },
      },
      { session }
    );

    const aptId = sess.appointmentId?._id || sess.appointmentId;
    await Appointment.updateOne(
      { _id: aptId },
      { $set: { status: "COMPLETED", completedAt: new Date(), rating: rating ?? null } },
      { session }
    );
    if (
      sess.appointmentId?.isRecounsellingReplacement === true &&
      sess.appointmentId?.replacementForSessionId
    ) {
      await CounsellingSession.updateOne(
        {
          _id: sess.appointmentId.replacementForSessionId,
          status: { $in: ["RECOUNSELLING_IN_PROGRESS", "RECOUNSELLING_PENDING"] },
        },
        {
          $set: {
            status: "CLOSED",
            userClosedAt: new Date(),
            closedBy: "USER",
            issueReported: false,
          },
        },
        { session }
      );
    }

    const commissionResult = await counsellorCommissionService.creditCounsellorCommission(
      sid,
      sess.counsellorId,
      { session }
    );

    if (commissionResult.credited) {
      await CounsellingSession.updateOne(
        { _id: sid },
        { $set: { commissionCredited: true } },
        { session }
      );
    }

    return {
      success: true,
      closed: true,
      commissionCredited: commissionResult.credited,
      session: await CounsellingSession.findById(sid).session(session).lean(),
    };
  });
}

/**
 * Admin confirms and closes (for disputed/issue cases - admin can override).
 */
async function adminConfirmAndClose(adminId, counsellingSessionId) {
  const sid = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : counsellingSessionId;

  const sess = await CounsellingSession.findOne({
    _id: sid,
    status: { $in: ["USER_CONFIRMATION_PENDING", "ISSUE_REPORTED"] },
  })
    .populate("appointmentId")
    .lean();

  if (!sess) {
    return { success: false, reason: "Session not found or already closed", code: "SESSION_NOT_FOUND" };
  }

  return runWithTransactionRetry(async (session) => {
    await CounsellingSession.updateOne(
      { _id: sid },
      {
        $set: {
          status: "CLOSED",
          userClosedAt: new Date(),
          closedBy: "ADMIN",
          adminClosedBy: adminId,
          issueReported: false,
        },
      },
      { session }
    );

    const aptId = sess.appointmentId?._id || sess.appointmentId;
    await Appointment.updateOne(
      { _id: aptId },
      { $set: { status: "COMPLETED", completedAt: new Date() } },
      { session }
    );
    if (
      sess.appointmentId?.isRecounsellingReplacement === true &&
      sess.appointmentId?.replacementForSessionId
    ) {
      await CounsellingSession.updateOne(
        {
          _id: sess.appointmentId.replacementForSessionId,
          status: { $in: ["RECOUNSELLING_IN_PROGRESS", "RECOUNSELLING_PENDING"] },
        },
        {
          $set: {
            status: "CLOSED",
            userClosedAt: new Date(),
            closedBy: "ADMIN",
            adminClosedBy: adminId,
            issueReported: false,
          },
        },
        { session }
      );
    }

    const commissionResult = await counsellorCommissionService.creditCounsellorCommission(
      sid,
      sess.counsellorId,
      { adminId, session }
    );

    if (commissionResult.credited) {
      await CounsellingSession.updateOne(
        { _id: sid },
        { $set: { commissionCredited: true } },
        { session }
      );
    }

    return {
      success: true,
      closed: true,
      commissionCredited: commissionResult.credited,
      session: await CounsellingSession.findById(sid).session(session).lean(),
    };
  });
}

/**
 * Counsellor marks issue as resolved - ISSUE_REPORTED → USER_CONFIRMATION_PENDING.
 * User will be asked to confirm again.
 */
async function counsellorMarkResolved(counsellorId, counsellingSessionId) {
  const hid = mongoose.Types.ObjectId.isValid(counsellorId)
    ? new mongoose.Types.ObjectId(counsellorId)
    : counsellorId;
  const sid = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : counsellingSessionId;

  const sess = await CounsellingSession.findOne({
    _id: sid,
    counsellorId: hid,
    status: "ISSUE_REPORTED",
  }).lean();

  if (!sess) {
    return { success: false, reason: "Session not found or not in issue state", code: "SESSION_NOT_FOUND" };
  }

  await CounsellingSession.updateOne(
    { _id: sid },
    {
      $set: {
        status: "USER_CONFIRMATION_PENDING",
        issueReported: false,
        issueDescription: null,
      },
    }
  );

  return {
    success: true,
    message: "Marked as resolved. User will be asked to confirm again.",
    session: await CounsellingSession.findById(sid).lean(),
  };
}

/**
 * Admin closes session WITHOUT crediting commission (user not satisfied).
 */
async function adminCloseWithoutCommission(adminId, counsellingSessionId, reason) {
  const sid = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : counsellingSessionId;

  const sess = await CounsellingSession.findOne({
    _id: sid,
    status: { $in: ["USER_CONFIRMATION_PENDING", "ISSUE_REPORTED"] },
  })
    .populate("appointmentId")
    .lean();

  if (!sess) {
    return { success: false, reason: "Session not found or already closed", code: "SESSION_NOT_FOUND" };
  }
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    return { success: false, reason: "Reason is required", code: "REASON_REQUIRED" };
  }

  await CounsellingSession.updateOne(
    { _id: sid },
    {
      $set: {
        status: "RECOUNSELLING_PENDING",
        issueReported: true,
        adminClosedBy: adminId,
        recounsellingReason: cleanReason,
        recounsellingRequestedAt: new Date(),
        recounsellingRequestedBy: adminId,
      },
    }
  );

  const aptId = sess.appointmentId?._id || sess.appointmentId;
  await Appointment.updateOne(
    { _id: aptId },
    { $set: { status: "COMPLETED", completedAt: new Date() } }
  );

  return {
    success: true,
    closed: false,
    commissionCredited: false,
    session: await CounsellingSession.findById(sid).lean(),
  };
}

/**
 * Admin requests re-counselling - ISSUE_REPORTED → CREATED.
 * Counsellor can do another session and mark complete again.
 */
async function adminRequestRecounselling(adminId, counsellingSessionId) {
  const sid = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : counsellingSessionId;

  const sess = await CounsellingSession.findOne({
    _id: sid,
    status: { $in: ["ISSUE_REPORTED", "RECOUNSELLING_PENDING"] },
  }).lean();

  if (!sess) {
    return { success: false, reason: "Session not found or not in issue state", code: "SESSION_NOT_FOUND" };
  }

  await CounsellingSession.updateOne(
    { _id: sid },
    {
      $set: {
        status: "CREATED",
        completedAt: null,
        counsellorNotes: null,
        durationMinutes: null,
        mode: null,
        issueReported: false,
        issueDescription: null,
        userConfirmedCounsellingDone: null,
        rating: null,
        recounsellingReason: null,
        recounsellingRequestedAt: null,
        recounsellingRequestedBy: null,
        replacementAppointmentId: null,
      },
    }
  );

  return {
    success: true,
    message: "Re-counselling requested. Counsellor can conduct another session and mark complete.",
    session: await CounsellingSession.findById(sid).lean(),
  };
}

/**
 * Get counsellor's sessions (assigned counselling appointments).
 */
async function getCounsellorSessions(counsellorId, options = {}) {
  const hid = mongoose.Types.ObjectId.isValid(counsellorId)
    ? new mongoose.Types.ObjectId(counsellorId)
    : counsellorId;

  const { page = 1, limit = 20, status } = options;
  const skip = Math.max(0, (page - 1) * limit);

  const query = { counsellorId: hid };
  if (status) query.status = status;

  const [sessions, totalCount] = await Promise.all([
    CounsellingSession.find(query)
      .populate("appointmentId")
      .populate("requesterId", "memberId name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CounsellingSession.countDocuments(query),
  ]);

  return {
    sessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get user's counselling sessions (as requester).
 */
async function getUserCounsellingSessions(requesterId, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  const { page = 1, limit = 20, status } = options;
  const skip = Math.max(0, (page - 1) * limit);

  const query = { requesterId: uid };
  if (status) query.status = status;

  const [sessions, totalCount] = await Promise.all([
    CounsellingSession.find(query)
      .populate({
        path: "appointmentId",
        populate: { path: "slotId", select: "label startTime endTime" },
      })
      .populate("counsellorId", "memberId name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CounsellingSession.countDocuments(query),
  ]);

  return {
    sessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get single counselling session by ID (for user/counsellor view).
 */
async function getCounsellingSessionById(sessionId, userId, role) {
  const sid = mongoose.Types.ObjectId.isValid(sessionId)
    ? new mongoose.Types.ObjectId(sessionId)
    : sessionId;
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const sess = await CounsellingSession.findOne({ _id: sid })
    .populate("appointmentId")
    .populate("counsellorId", "memberId name phone email")
    .populate("requesterId", "memberId name phone email")
    .lean();

  if (!sess) return null;

  const isCounsellor = sess.counsellorId?._id?.toString() === uid.toString() || sess.counsellorId?.toString() === uid.toString();
  const isRequester = sess.requesterId?._id?.toString() === uid.toString() || sess.requesterId?.toString() === uid.toString();

  if (!isCounsellor && !isRequester && role !== 2 && role !== 3) {
    return null; // Not authorized
  }

  return sess;
}

/**
 * Get count of sessions pending user confirmation (for requester).
 */
async function getPendingCounsellingCount(requesterId) {
  const uid = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;
  return CounsellingSession.countDocuments({
    requesterId: uid,
    status: "USER_CONFIRMATION_PENDING",
  });
}

/**
 * Admin: List all counselling sessions with filters.
 */
async function getAdminCounsellingSessions(options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    counsellorMemberId,
    requesterMemberId,
    dateFrom,
    dateTo,
  } = options;
  const skip = Math.max(0, (page - 1) * limit);

  const query = {};
  if (status) query.status = status;
  if (counsellorMemberId) {
    const escaped = String(counsellorMemberId)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const counsellors = await User.find({
      memberId: { $regex: escaped, $options: "i" },
    })
      .select("_id")
      .lean();
    const counsellorIds = counsellors.map((u) => u._id);
    if (counsellorIds.length === 0) {
      return {
        sessions: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount: 0,
          totalPages: 0,
        },
      };
    }
    query.counsellorId = { $in: counsellorIds };
  }
  if (requesterMemberId) {
    const escaped = String(requesterMemberId)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const requesters = await User.find({
      memberId: { $regex: escaped, $options: "i" },
    })
      .select("_id")
      .lean();
    const requesterIds = requesters.map((u) => u._id);
    if (requesterIds.length === 0) {
      return {
        sessions: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount: 0,
          totalPages: 0,
        },
      };
    }
    query.requesterId = { $in: requesterIds };
  }
  if (dateFrom || dateTo) {
    const aptDateQuery = {};
    if (dateFrom) aptDateQuery.$gte = dateFrom;
    if (dateTo) aptDateQuery.$lte = dateTo;
    const appointmentIds = await Appointment.find({ dateKey: aptDateQuery })
      .select("_id")
      .lean();
    const aptIds = appointmentIds.map((a) => a._id);
    if (aptIds.length === 0) {
      return {
        sessions: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount: 0,
          totalPages: 0,
        },
      };
    }
    query.appointmentId = { $in: aptIds };
  }

  const [sessions, totalCount] = await Promise.all([
    CounsellingSession.find(query)
      .populate({
        path: "appointmentId",
        populate: { path: "slotId", select: "label startTime endTime" },
      })
      .populate("counsellorId", "memberId name phone email")
      .populate("requesterId", "memberId name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CounsellingSession.countDocuments(query),
  ]);

  return {
    sessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

module.exports = {
  createSessionForAppointment,
  counsellorMarkComplete,
  counsellorMarkResolved,
  userConfirmAndClose,
  adminConfirmAndClose,
  adminCloseWithoutCommission,
  adminRequestRecounselling,
  getCounsellorSessions,
  getUserCounsellingSessions,
  getCounsellingSessionById,
  getPendingCounsellingCount,
  getAdminCounsellingSessions,
  DESIGNATION_2,
};
