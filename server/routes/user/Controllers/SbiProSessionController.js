/**
 * SBI PRO Session Controller - Phase 3
 * User/Trainer flows
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  listForTrainer,
  listForUser,
  listPendingForUser,
  uploadFinger,
  submitSession,
  userVerify,
  getByAppointmentId,
} = require("../../../services/sbiProSessionService");

function errRes(res, msg, code = 400) {
  return response.errorResponse(res, [{ msg }], msg, code, false, code ? {} : {});
}

/**
 * GET /api/users/sbi-pro-sessions/assigned
 * Trainer: list sessions assigned to me
 */
async function listAssigned(req, res) {
  try {
    const trainerId = req.user.id;
    const result = await listForTrainer(trainerId, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });
    console.log("[SBI PRO] listAssigned", { trainerId, count: result.sessions?.length ?? 0 });
    return response.successResponse(
      res,
      { sessions: result.sessions, pagination: result.pagination },
      "Sessions retrieved"
    );
  } catch (err) {
    console.error("listAssigned error:", err);
    return errRes(res, err.message || "Failed to fetch sessions", 500);
  }
}

/**
 * GET /api/users/sbi-pro-sessions/my-reports
 * User: list my completed SBI PRO sessions (where I am userId) with reports
 */
async function listMyReports(req, res) {
  try {
    const userId = req.user.id;
    const result = await listForUser(userId, { status: "CLOSED" });
    const withReports = (result.sessions || []).filter((s) => s.reportUrl);
    return response.successResponse(
      res,
      { sessions: withReports },
      "Reports retrieved"
    );
  } catch (err) {
    console.error("listMyReports error:", err);
    return errRes(res, err.message || "Failed to fetch reports", 500);
  }
}

/**
 * GET /api/users/sbi-pro-sessions/client-reports
 * Trainer: list completed reports of clients (sessions where I am trainerId)
 */
async function listClientReports(req, res) {
  try {
    const trainerId = req.user.id;
    const result = await listForTrainer(trainerId, { status: "CLOSED" });
    const withReports = (result.sessions || []).filter((s) => s.reportUrl);
    return response.successResponse(
      res,
      { sessions: withReports },
      "Client reports retrieved"
    );
  } catch (err) {
    console.error("listClientReports error:", err);
    return errRes(res, err.message || "Failed to fetch client reports", 500);
  }
}

/**
 * GET /api/users/sbi-pro-sessions/pending-verification
 * User: list my sessions pending verification
 */
async function listPendingVerification(req, res) {
  try {
    const userId = req.user.id;
    const result = await listPendingForUser(userId);
    return response.successResponse(
      res,
      { sessions: result.sessions },
      "Pending verifications retrieved"
    );
  } catch (err) {
    console.error("listPendingVerification error:", err);
    return errRes(res, err.message || "Failed to fetch sessions", 500);
  }
}

/**
 * POST /api/users/sbi-pro-sessions/upload
 * Trainer: upload finger image. Body: appointmentId, fingerType. File: image
 */
async function upload(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }
    if (!req.file) {
      return errRes(res, "Image file required", 400);
    }

    const trainerId = req.user.id;
    const { appointmentId, fingerType } = req.body;

    const result = await uploadFinger(trainerId, appointmentId, fingerType, req.file);
    console.log("[SBI PRO] Upload", { trainerId, appointmentId, fingerType, success: result.success });

    if (!result.success) {
      return errRes(res, result.reason, 400);
    }

    return response.successResponse(
      res,
      { session: result.session, url: result.url },
      "Image uploaded"
    );
  } catch (err) {
    console.error("upload error:", err);
    return errRes(res, err.message || "Upload failed", 500);
  }
}

/**
 * POST /api/users/sbi-pro-sessions/submit
 * Trainer: submit session (all 10 uploaded)
 */
async function submit(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const trainerId = req.user.id;
    const { appointmentId } = req.body;

    const result = await submitSession(trainerId, appointmentId);
    console.log("[SBI PRO] Submit", { trainerId, appointmentId, success: result.success });

    if (!result.success) {
      return errRes(res, result.reason, 400);
    }

    return response.successResponse(
      res,
      { session: result.session },
      "Session submitted for verification"
    );
  } catch (err) {
    console.error("submit error:", err);
    return errRes(res, err.message || "Submit failed", 500);
  }
}

/**
 * POST /api/users/sbi-pro-sessions/verify
 * User: confirm or reject verification
 */
async function verify(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const userId = req.user.id;
    const { appointmentId, confirm } = req.body;

    const result = await userVerify(userId, appointmentId, confirm === true || confirm === "true");

    if (!result.success) {
      return errRes(res, result.reason, 400);
    }

    return response.successResponse(
      res,
      { session: result.session },
      confirm ? "Verification confirmed" : "Session reopened for trainer"
    );
  } catch (err) {
    console.error("verify error:", err);
    return errRes(res, err.message || "Verify failed", 500);
  }
}

/**
 * GET /api/users/sbi-pro-sessions/:appointmentId
 * Get single session (trainer or user - access checked by service)
 */
async function getSession(req, res) {
  try {
    const userId = req.user.id;
    const { appointmentId } = req.params;

    const sess = await getByAppointmentId(appointmentId, userId, "any");
    if (!sess) {
      return errRes(res, "Session not found or access denied", 404);
    }
    return response.successResponse(res, { session: sess }, "Session retrieved");
  } catch (err) {
    console.error("getSession error:", err);
    return errRes(res, err.message || "Failed to fetch session", 500);
  }
}

module.exports = {
  listAssigned,
  listMyReports,
  listClientReports,
  listPendingVerification,
  upload,
  submit,
  verify,
  getSession,
};
