/**
 * Admin SBI PRO Session Controller - Phase 3
 */

const axios = require("axios");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  listForAdmin,
  markAnalysisDone,
  getImageUrlForAdmin,
  deleteFingerImage,
  deleteAllFingerImages,
  uploadReport,
  replaceReport,
} = require("../../../services/sbiProSessionService");
const { getByAppointmentId: getFingerAnalysis, save: saveFingerAnalysis } = require("../../../services/sbiProFingerAnalysisService");
const { creditTrainerCommission } = require("../../../services/sbiProCommissionService");

function errRes(res, msg, code = 400) {
  return response.errorResponse(res, [{ msg }], msg, code, false, {});
}

/**
 * GET /api/admin/sbi-pro-sessions
 * List sessions with optional status filter
 */
async function list(req, res) {
  try {
    const result = await listForAdmin({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      trainerId: req.query.trainerId,
      userMemberId: req.query.userMemberId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    return response.successResponse(
      res,
      { sessions: result.sessions, pagination: result.pagination },
      "Sessions retrieved"
    );
  } catch (err) {
    console.error("list SBI PRO sessions error:", err);
    return errRes(res, err.message || "Failed to fetch sessions", 500);
  }
}

/**
 * POST /api/admin/sbi-pro-sessions/mark-analysis-done
 * Mark analysis done -> auto CLOSED
 */
async function markAnalysisDoneHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { appointmentId } = req.body;

    const result = await markAnalysisDone(appointmentId);

    if (!result.success) {
      return errRes(res, result.reason, 400);
    }

    // Phase 4: Credit trainer commission when SBI PRO session CLOSED
    const adminId = req.user?.id || req.user?._id;
    const commissionResult = await creditTrainerCommission(
      appointmentId,
      result.session?.trainerId,
      adminId
    );
    if (commissionResult.credited) {
      console.log(`[SBI PRO Commission] Credited ₹${commissionResult.amount} to trainer for appointment ${appointmentId}`);
    }

    return response.successResponse(
      res,
      { session: result.session, commission: commissionResult.credited ? { amount: commissionResult.amount } : null },
      "Analysis marked done, session closed"
    );
  } catch (err) {
    console.error("markAnalysisDone error:", err);
    return errRes(res, err.message || "Failed", 500);
  }
}

/**
 * GET /api/admin/sbi-pro-sessions/image?appointmentId=&fingerType=
 * Proxy image for download (avoids CORS)
 */
async function proxyImage(req, res) {
  try {
    const { appointmentId, fingerType } = req.query;
    if (!appointmentId || !fingerType) {
      return errRes(res, "appointmentId and fingerType required", 400);
    }

    const imageUrl = await getImageUrlForAdmin(appointmentId, fingerType);
    if (!imageUrl) {
      return errRes(res, "Image not found", 404);
    }

    const axiosRes = await axios.get(imageUrl, { responseType: "stream" });
    res.setHeader("Content-Type", axiosRes.headers["content-type"] || "image/jpeg");
    const forDownload = req.query.download !== "false";
    if (forDownload) {
      const filename = `finger_${fingerType}.jpg`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    axiosRes.data.pipe(res);
  } catch (err) {
    console.error("proxyImage error:", err);
    return errRes(res, err.message || "Failed to fetch image", 500);
  }
}

/**
 * DELETE /api/admin/sbi-pro-sessions/image?appointmentId=&fingerType=
 * Permanently delete finger image from R2 and DB (only before session CLOSED).
 */
async function deleteImage(req, res) {
  try {
    const { appointmentId, fingerType } = req.query;
    if (!appointmentId || !fingerType) {
      return errRes(res, "appointmentId and fingerType required", 400);
    }
    const result = await deleteFingerImage(appointmentId, fingerType);
    if (!result.success) {
      return errRes(res, result.reason, 400);
    }
    return response.successResponse(
      res,
      { session: result.session },
      "Image deleted permanently"
    );
  } catch (err) {
    console.error("deleteImage error:", err);
    return errRes(res, err.message || "Failed to delete image", 500);
  }
}

/**
 * DELETE /api/admin/sbi-pro-sessions/images?appointmentId=
 * Permanently delete all finger images from R2 and DB. Same rules as single delete.
 */
async function deleteAllImages(req, res) {
  try {
    const { appointmentId } = req.query;
    if (!appointmentId) {
      return errRes(res, "appointmentId required", 400);
    }
    const result = await deleteAllFingerImages(appointmentId);
    if (!result.success) {
      return errRes(res, result.reason, 400);
    }
    return response.successResponse(
      res,
      { session: result.session },
      "All finger images deleted permanently"
    );
  } catch (err) {
    console.error("deleteAllImages error:", err);
    return errRes(res, err.message || "Failed to delete images", 500);
  }
}

/**
 * GET /api/admin/sbi-pro-sessions/analysis/:appointmentId
 * Get finger analysis for a SBI PRO session
 */
async function getFingerAnalysisHandler(req, res) {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return errRes(res, "appointmentId required", 400);
    }
    const analysis = await getFingerAnalysis(appointmentId);
    return response.successResponse(res, analysis, "Finger analysis retrieved");
  } catch (err) {
    console.error("getFingerAnalysis error:", err);
    return errRes(res, err.message || "Failed to fetch analysis", 500);
  }
}

/**
 * POST /api/admin/sbi-pro-sessions/upload-report
 * Upload report PDF. Sets reportUrl, status CLOSED. Requires status ANALYSIS_PENDING.
 */
async function uploadReportHandler(req, res) {
  try {
    if (!req.file) {
      return errRes(res, "PDF file required", 400);
    }
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return errRes(res, "appointmentId required", 400);
    }
    const result = await uploadReport(appointmentId, req.file);
    if (!result.success) {
      return errRes(res, result.reason, 400);
    }

    // Phase 4: Credit trainer commission when SBI PRO session CLOSED
    const adminId = req.user?.id || req.user?._id;
    const commissionResult = await creditTrainerCommission(
      appointmentId,
      result.session?.trainerId,
      adminId
    );
    if (commissionResult.credited) {
      console.log(`[SBI PRO Commission] Credited ₹${commissionResult.amount} to trainer for appointment ${appointmentId}`);
    }

    return response.successResponse(
      res,
      { session: result.session, commission: commissionResult.credited ? { amount: commissionResult.amount } : null },
      "Report uploaded, session closed"
    );
  } catch (err) {
    console.error("uploadReport error:", err);
    return errRes(res, err.message || "Failed to upload report", 500);
  }
}

/**
 * POST /api/admin/sbi-pro-sessions/replace-report
 * Replace report PDF for CLOSED session. Admin can correct wrong report.
 */
async function replaceReportHandler(req, res) {
  try {
    if (!req.file) {
      return errRes(res, "PDF file required", 400);
    }
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return errRes(res, "appointmentId required", 400);
    }
    const result = await replaceReport(appointmentId, req.file);
    if (!result.success) {
      return errRes(res, result.reason, 400);
    }
    return response.successResponse(
      res,
      { session: result.session },
      "Report replaced successfully"
    );
  } catch (err) {
    console.error("replaceReport error:", err);
    return errRes(res, err.message || "Failed to replace report", 500);
  }
}

/**
 * PUT /api/admin/sbi-pro-sessions/analysis
 * Save finger analysis. Body: { appointmentId, fingers: { LEFT_THUMB: { code, count }, ... } }
 */
async function saveFingerAnalysisHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }
    const { appointmentId, fingers } = req.body;
    if (!appointmentId) {
      return errRes(res, "appointmentId required", 400);
    }
    const result = await saveFingerAnalysis(appointmentId, fingers || {});
    if (!result.success) {
      return errRes(res, result.reason, 400);
    }
    return response.successResponse(res, result.analysis, "Finger analysis saved");
  } catch (err) {
    console.error("saveFingerAnalysis error:", err);
    return errRes(res, err.message || "Failed to save analysis", 500);
  }
}

module.exports = {
  list,
  markAnalysisDoneHandler,
  proxyImage,
  deleteImage,
  deleteAllImages,
  uploadReportHandler,
  replaceReportHandler,
  getFingerAnalysisHandler,
  saveFingerAnalysisHandler,
};
