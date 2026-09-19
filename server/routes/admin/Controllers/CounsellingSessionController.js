/**
 * Admin Counselling Session Controller - Designation_2 (COUNSELLOR)
 * List sessions, confirm-close (admin override for disputed cases)
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getAdminCounsellingSessions,
  adminConfirmAndClose,
  adminCloseWithoutCommission,
  adminRequestRecounselling,
} = require("../../../services/counsellingSessionService");

/**
 * GET /api/admin/counselling-sessions
 * List all counselling sessions with filters
 */
async function list(req, res) {
  try {
    const {
      page,
      limit,
      status,
      counsellorMemberId,
      requesterMemberId,
      dateFrom,
      dateTo,
    } = req.query;
    const result = await getAdminCounsellingSessions({
      page,
      limit,
      status,
      counsellorMemberId,
      requesterMemberId,
      dateFrom,
      dateTo,
    });
    return response.successResponse(
      res,
      { sessions: result.sessions, pagination: result.pagination },
      "Sessions retrieved"
    );
  } catch (err) {
    console.error("admin list counselling error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch" }],
      "Failed",
      500
    );
  }
}

/**
 * POST /api/admin/counselling-sessions/:id/confirm-close
 * Admin confirms and closes (for disputed/issue cases - commission credited)
 */
async function confirmClose(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }
    const adminId = req.user.id;
    const sessionId = req.params.id;
    const result = await adminConfirmAndClose(adminId, sessionId);
    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
        false,
        result.code ? { code: result.code } : {}
      );
    }
    return response.successResponse(
      res,
      {
        closed: result.closed,
        commissionCredited: result.commissionCredited,
        session: result.session,
      },
      "Session closed by admin"
    );
  } catch (err) {
    console.error("admin confirmClose error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed" }],
      "Failed",
      500
    );
  }
}

/**
 * POST /api/admin/counselling-sessions/:id/close-without-commission
 * Admin closes session without crediting counsellor (user not satisfied)
 */
async function closeWithoutCommission(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }
    const adminId = req.user.id;
    const sessionId = req.params.id;
    const { reason } = req.body;
    const result = await adminCloseWithoutCommission(adminId, sessionId, reason);
    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
        false,
        result.code ? { code: result.code } : {}
      );
    }
    return response.successResponse(
      res,
      { closed: result.closed, session: result.session },
      "Session moved to re-counselling without commission"
    );
  } catch (err) {
    console.error("admin closeWithoutCommission error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed" }], "Failed", 500);
  }
}

/**
 * POST /api/admin/counselling-sessions/:id/request-recounselling
 * Admin requests counsellor to do another session (ISSUE_REPORTED → CREATED)
 */
async function requestRecounselling(req, res) {
  try {
    const adminId = req.user.id;
    const sessionId = req.params.id;
    const result = await adminRequestRecounselling(adminId, sessionId);
    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
        false,
        result.code ? { code: result.code } : {}
      );
    }
    return response.successResponse(
      res,
      { message: result.message, session: result.session },
      result.message
    );
  } catch (err) {
    console.error("admin requestRecounselling error:", err);
    return response.errorResponse(res, [{ msg: err.message || "Failed" }], "Failed", 500);
  }
}

module.exports = {
  list,
  confirmClose,
  closeWithoutCommission,
  requestRecounselling,
};
