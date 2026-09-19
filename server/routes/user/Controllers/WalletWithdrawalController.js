const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const response = require("../../../config/response");
const WalletSettings = require("../../../models/WalletSettings");
const WalletWithdrawalRequest = require("../../../models/WalletWithdrawalRequest");
const { validateUPI } = require("../../../utils/inputValidation");
const withdrawalService = require("../../../services/withdrawalService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 4-letter bank code + 0 + 6-char alphanumeric branch (e.g. BARB0VJHAJA)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

const getWithdrawalSettings = async (req, res) => {
  try {
    const settings = await WalletSettings.getOrCreateSettings();
    const userId = req.user?.id;
    const maxUserTransactionsPerDay = settings?.maxUserTransactionsPerDay ?? null;

    let approvedTodayCount = 0;
    let withdrawalDailyRemaining = null;
    if (userId && maxUserTransactionsPerDay != null) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      approvedTodayCount = await WalletWithdrawalRequest.countDocuments({
        userId,
        status: "APPROVED",
        approvedAt: { $gte: start, $lte: end },
      });
      const maxPerDayNum = Number(maxUserTransactionsPerDay) || 0;
      withdrawalDailyRemaining = Math.max(0, maxPerDayNum - approvedTodayCount);
    }

    return response.successResponse(
      res,
      {
        isWithdrawalEnabled:
          settings?.isWithdrawalEnabled !== undefined ? !!settings.isWithdrawalEnabled : true,
        mainMinWithdrawal: settings?.mainMinWithdrawal ?? null,
        mainMaxWithdrawal: settings?.mainMaxWithdrawal ?? null,
        adminWithdrawalSurchargePercent: settings?.adminWithdrawalSurchargePercent ?? 0,
        maxUserTransactionsPerDay,
        approvedTodayCount,
        withdrawalDailyRemaining,
      },
      "Withdrawal settings",
    );
  } catch (err) {
    return response.errorResponse(res, {}, "Failed to fetch withdrawal settings", 500);
  }
};

const createWithdrawalRequest = async (req, res) => {
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
    const userId = req.user.id;
    const { requestId, amount, paymentMethod } = req.body;

    if (!userId) {
      return response.errorResponse(res, { msg: "Authentication required" }, "Authentication required", 401);
    }

    if (!UUID_REGEX.test(String(requestId).trim())) {
      return response.errorResponse(
        res,
        [{ path: "requestId", msg: "requestId must be a valid UUID format" }],
        "Validation Error",
        400,
      );
    }

    if (!paymentMethod || !["UPI", "BANK", "CHEQUE"].includes(paymentMethod)) {
      return response.errorResponse(
        res,
        [{ path: "paymentMethod", msg: "Invalid paymentMethod" }],
        "Validation Error",
        400,
      );
    }

    const paymentDetails = {};

    if (paymentMethod === "UPI") {
      const upiIdRaw = req.body.upiId;
      const upiValidation = validateUPI(upiIdRaw);
      if (!upiValidation.valid) {
        return response.errorResponse(
          res,
          [{ path: "upiId", msg: upiValidation.error }],
          "Validation Error",
          400,
        );
      }
      paymentDetails.upiId = upiValidation.sanitized;
    }

    if (paymentMethod === "BANK") {
      const { bankName, accountHolderName, accountNumber, ifsc } = req.body;

      const reqErrs = [];
      if (!bankName || !String(bankName).trim()) reqErrs.push({ path: "bankName", msg: "bankName is required" });
      if (!accountHolderName || !String(accountHolderName).trim())
        reqErrs.push({ path: "accountHolderName", msg: "accountHolderName is required" });
      if (!accountNumber || !ACCOUNT_NUMBER_REGEX.test(String(accountNumber).trim()))
        reqErrs.push({ path: "accountNumber", msg: "accountNumber must be 9-18 digits" });
      if (!ifsc || !IFSC_REGEX.test(String(ifsc).trim().toUpperCase()))
        reqErrs.push({ path: "ifsc", msg: "IFSC is invalid" });

      if (reqErrs.length) {
        return response.errorResponse(res, reqErrs, "Validation Error", 400);
      }
      paymentDetails.bankName = String(bankName).trim();
      paymentDetails.accountHolderName = String(accountHolderName).trim();
      paymentDetails.accountNumber = String(accountNumber).trim();
      paymentDetails.ifsc = String(ifsc).trim().toUpperCase();
    }

    if (paymentMethod === "CHEQUE") {
      const { chequeNumber, chequeBankName } = req.body;
      if (!chequeNumber || !String(chequeNumber).trim()) {
        return response.errorResponse(
          res,
          [{ path: "chequeNumber", msg: "chequeNumber is required" }],
          "Validation Error",
          400,
        );
      }
      paymentDetails.chequeNumber = String(chequeNumber).trim();
      paymentDetails.chequeBankName = String(chequeBankName || "").trim();
    }

    const result = await withdrawalService.createWithdrawalRequest(userId, {
      requestId: String(requestId).trim(),
      amount,
      paymentMethod,
      paymentDetails,
    });

    return response.successResponse(res, result, "Withdrawal request submitted successfully");
  } catch (err) {
    return response.errorResponse(res, { msg: err.message || "Withdrawal failed" }, err.message || "Withdrawal failed", 400);
  }
};

const listWithdrawalRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) return response.errorResponse(res, { msg: "Authentication required" }, "Authentication required", 401);

    const { status, page, limit, excludePending } = req.query;
    const result = await withdrawalService.listWithdrawalRequests(userId, {
      status,
      excludePending,
      page: page || 1,
      limit: limit || 20,
    });
    return response.successResponse(res, result, "Withdrawal requests");
  } catch (err) {
    return response.errorResponse(res, {}, "Failed to fetch withdrawal requests", 500);
  }
};

const cancelWithdrawalRequest = async (req, res) => {
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
    const userId = req.user.id;
    const { withdrawalRequestId } = req.body;

    if (!userId) return response.errorResponse(res, { msg: "Authentication required" }, "Authentication required", 401);

    if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
      return response.errorResponse(
        res,
        [{ path: "withdrawalRequestId", msg: "Invalid withdrawalRequestId" }],
        "Validation Error",
        400,
      );
    }

    const result = await withdrawalService.cancelWithdrawalRequest(userId, withdrawalRequestId);
    return response.successResponse(res, result, "Withdrawal request cancelled");
  } catch (err) {
    return response.errorResponse(res, { msg: err.message || "Cancel failed" }, err.message || "Cancel failed", 400);
  }
};

module.exports = {
  getWithdrawalSettings,
  createWithdrawalRequest,
  listWithdrawalRequests,
  cancelWithdrawalRequest,
};

