/**
 * Counselling Session Controller - Designation_2 (COUNSELLOR)
 * User: my-counselling, session detail, confirm-close
 * Counsellor: my-sessions (via appointments/assigned or dedicated)
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getCounsellorSessions,
  getUserCounsellingSessions,
  getCounsellingSessionById,
  getPendingCounsellingCount,
  userConfirmAndClose,
  counsellorMarkResolved,
} = require("../../../services/counsellingSessionService");

function errRes(res, reason, statusCode = 400, code = null) {
  return response.errorResponse(
    res,
    [{ msg: reason }],
    reason,
    statusCode,
    false,
    code ? { code } : {}
  );
}

/**
 * GET /api/users/counselling-sessions/as-counsellor
 * Counsellor's assigned sessions (My Counselling Sessions)
 */
async function getMySessionsAsCounsellor(req, res) {
  try {
    const counsellorId = req.user.id;
    const { page, limit, status } = req.query;
    const result = await getCounsellorSessions(counsellorId, { page, limit, status });
    return response.successResponse(
      res,
      { sessions: result.sessions, pagination: result.pagination },
      "Sessions retrieved"
    );
  } catch (err) {
    console.error("getMySessionsAsCounsellor error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed to fetch" }], "Failed", 500);
  }
}

/**
 * GET /api/users/counselling-sessions
 * User's counselling sessions (as requester - My Counselling)
 */
async function getMyCounselling(req, res) {
  try {
    const requesterId = req.user.id;
    const { page, limit, status } = req.query;
    const result = await getUserCounsellingSessions(requesterId, { page, limit, status });
    return response.successResponse(
      res,
      { sessions: result.sessions, pagination: result.pagination },
      "Sessions retrieved"
    );
  } catch (err) {
    console.error("getMyCounselling error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed to fetch" }], "Failed", 500);
  }
}

/**
 * GET /api/users/counselling-sessions/pending-count
 * Count of sessions awaiting user confirmation (for banner)
 */
async function getPendingCount(req, res) {
  try {
    const requesterId = req.user.id;
    const count = await getPendingCounsellingCount(requesterId);
    return response.successResponse(res, { count }, "OK");
  } catch (err) {
    console.error("getPendingCount error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed" }], "Failed", 500);
  }
}

/**
 * GET /api/users/counselling-sessions/:id
 * Single session detail (user or counsellor)
 */
async function getSessionById(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role ?? 1;
    const sessionId = req.params.id;
    const sess = await getCounsellingSessionById(sessionId, userId, role);
    if (!sess) {
      return errRes(res, "Session not found", 404, "SESSION_NOT_FOUND");
    }
    return response.successResponse(res, { session: sess }, "Session retrieved");
  } catch (err) {
    console.error("getSessionById error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed to fetch" }], "Failed", 500);
  }
}

/**
 * POST /api/users/counselling-sessions/:id/confirm-close
 * User confirms and closes (step-by-step: counselling done? rating, issue? confirm)
 * Body: { counsellingDone, rating?, hasIssue?, issueDescription? }
 */
async function confirmClose(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }
    const requesterId = req.user.id;
    const sessionId = req.params.id;
    const { counsellingDone, rating, hasIssue, issueDescription } = req.body;
    const result = await userConfirmAndClose(requesterId, sessionId, {
      counsellingDone: counsellingDone === true || counsellingDone === "true",
      rating: rating != null ? parseFloat(rating) : null,
      hasIssue: hasIssue === true || hasIssue === "true",
      issueDescription: issueDescription || null,
    });
    if (!result.success && result.reason) {
      return errRes(res, result.reason, 400, result.code);
    }
    return response.successResponse(
      res,
      {
        closed: result.closed,
        issueReported: result.issueReported,
        message: result.message,
        session: result.session,
      },
      result.closed ? "Session closed" : result.message || "Updated"
    );
  } catch (err) {
    console.error("confirmClose error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed" }], "Failed", 500);
  }
}

/**
 * POST /api/users/counselling-sessions/:id/mark-resolved
 * Counsellor marks issue as resolved - ISSUE_REPORTED → USER_CONFIRMATION_PENDING
 */
async function markResolved(req, res) {
  try {
    const counsellorId = req.user.id;
    const sessionId = req.params.id;
    const result = await counsellorMarkResolved(counsellorId, sessionId);
    if (!result.success) {
      return errRes(res, result.reason, 400, result.code);
    }
    return response.successResponse(
      res,
      { message: result.message, session: result.session },
      result.message
    );
  } catch (err) {
    console.error("markResolved error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed" }], "Failed", 500);
  }
}

module.exports = {
  getMySessionsAsCounsellor,
  getMyCounselling,
  getPendingCount,
  getSessionById,
  confirmClose,
  markResolved,
};
