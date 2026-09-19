const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const response = require("../../../config/response");
const withdrawalService = require("../../../services/withdrawalService");

const listWithdrawalRequests = async (req, res) => {
  try {
    const { status, page, limit, search, memberId, paymentMethod, fromDate, toDate } = req.query;
    const result = await withdrawalService.adminListWithdrawalRequests({
      status,
      page: page || 1,
      limit: limit || 20,
      search,
      memberId,
      paymentMethod,
      fromDate,
      toDate,
    });
    return response.successResponse(res, result, "Withdrawal requests");
  } catch (err) {
    return response.errorResponse(res, {}, err.message || "Failed to fetch withdrawal requests", 500);
  }
};

const approveWithdrawalRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400,
    );
  }

  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const remarks = req.body?.remarks || "";
    const payoutReference = req.body?.payoutReference ?? "";

    if (!adminId) return response.errorResponse(res, { msg: "Unauthorized" }, "Unauthorized", 401);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, { msg: "Invalid id" }, "Validation Error", 400);
    }

    const result = await withdrawalService.adminApproveWithdrawalRequest(
      adminId,
      id,
      remarks,
      payoutReference,
    );
    return response.successResponse(res, result, "Withdrawal approved");
  } catch (err) {
    return response.errorResponse(res, { msg: err.message || "Approve failed" }, err.message || "Approve failed", 400);
  }
};

const rejectWithdrawalRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400,
    );
  }

  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const remarks = req.body?.remarks || "";

    if (!adminId) return response.errorResponse(res, { msg: "Unauthorized" }, "Unauthorized", 401);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, { msg: "Invalid id" }, "Validation Error", 400);
    }

    const result = await withdrawalService.adminRejectWithdrawalRequest(adminId, id, remarks);
    return response.successResponse(res, result, "Withdrawal rejected");
  } catch (err) {
    return response.errorResponse(res, { msg: err.message || "Reject failed" }, err.message || "Reject failed", 400);
  }
};

const setWithdrawalPayoutReference = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const payoutReference = req.body?.payoutReference ?? "";

    if (!adminId) return response.errorResponse(res, { msg: "Unauthorized" }, "Unauthorized", 401);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, { msg: "Invalid id" }, "Validation Error", 400);
    }

    const result = await withdrawalService.adminSetWithdrawalPayoutReference(adminId, id, payoutReference);
    return response.successResponse(res, result, "Payout reference saved");
  } catch (err) {
    return response.errorResponse(
      res,
      { msg: err.message || "Update failed" },
      err.message || "Update failed",
      400,
    );
  }
};

const generateWithdrawalUpiQr = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, { msg: "Invalid id" }, "Validation Error", 400);
    }
    const result = await withdrawalService.adminGenerateWithdrawalUpiQr(id);
    return response.successResponse(res, result, "UPI QR generated");
  } catch (err) {
    return response.errorResponse(res, { msg: err.message || "QR generation failed" }, err.message || "QR generation failed", 400);
  }
};

module.exports = {
  listWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  setWithdrawalPayoutReference,
  generateWithdrawalUpiQr,
};

