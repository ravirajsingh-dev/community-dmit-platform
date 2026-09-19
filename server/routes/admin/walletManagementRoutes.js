const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { whitelistBodyFields } = require("../../middleware/inputValidation");
const {
  getWalletTypes,
  resolveMember,
  getBalance,
  adminAdjust,
  adminTransfer,
  listAdminTransactions,
  walletDetails,
  memberBalance,
  transferReport,
  getUserActivationStats,
} = require("./Controllers/WalletManagementController");
const {
  listWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  setWithdrawalPayoutReference,
  generateWithdrawalUpiQr,
} = require("./Controllers/WalletWithdrawalController");

const ADJUST_FIELDS = [
  "transactionType",
  "memberId",
  "walletKey",
  "amount",
  "txn_password",
  "idempotencyKey",
];
const TRANSFER_FIELDS = [
  "fromMemberId",
  "toMemberId",
  "walletKey",
  "amount",
  "txn_password",
  "idempotencyKey",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(AdminAuth);

router.get(
  "/wallet-types",
  [checkPermission("wallet-settings")],
  getWalletTypes
);

router.get(
  "/resolve-member",
  [checkPermission("wallet-settings")],
  resolveMember
);

router.get(
  "/balance",
  [
    checkPermission("wallet-settings"),
    check("userId", "userId is required").notEmpty(),
  ],
  getBalance
);

router.post(
  "/adjust",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(ADJUST_FIELDS),
    check("transactionType", "transactionType must be Credit or Debit")
      .isIn(["Credit", "Debit"]),
    check("memberId", "memberId is required").notEmpty().trim(),
    check("walletKey", "walletKey is required").notEmpty().trim(),
    check("amount", "amount must be a number >= 0.01")
      .isFloat({ min: 0.01 })
      .toFloat(),
    check("idempotencyKey", "idempotencyKey (UUID) is required")
      .matches(UUID_REGEX),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return require("../../../config/response").errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }
    next();
  },
  adminAdjust
);

router.post(
  "/transfer",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(TRANSFER_FIELDS),
    check("fromMemberId", "fromMemberId is required").notEmpty().trim(),
    check("toMemberId", "toMemberId is required").notEmpty().trim(),
    check("walletKey", "walletKey is required").notEmpty().trim(),
    check("amount", "amount must be a number >= 0.01")
      .isFloat({ min: 0.01 })
      .toFloat(),
    check("idempotencyKey", "idempotencyKey (UUID) is required")
      .matches(UUID_REGEX),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return require("../../../config/response").errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }
    next();
  },
  adminTransfer
);

router.get(
  "/admin-transactions",
  [checkPermission("wallet-settings")],
  listAdminTransactions
);

router.get(
  "/wallet-details",
  [checkPermission("wallet-settings")],
  walletDetails
);

router.get(
  "/member-balance",
  [checkPermission("wallet-settings")],
  memberBalance
);

router.get(
  "/transfer-report",
  [checkPermission("wallet-settings")],
  transferReport
);

router.get(
  "/withdrawal-requests",
  [checkPermission("wallet-settings")],
  listWithdrawalRequests,
);

router.post(
  "/withdrawal-requests/:id/approve",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
  ],
  approveWithdrawalRequest,
);

router.post(
  "/withdrawal-requests/:id/reject",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
  ],
  rejectWithdrawalRequest,
);

router.post(
  "/withdrawal-requests/:id/payout-reference",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
  ],
  setWithdrawalPayoutReference,
);

router.post(
  "/withdrawal-requests/:id/generate-qr",
  [
    checkPermission("wallet-settings"),
  ],
  generateWithdrawalUpiQr,
);

router.get(
  "/user-activation-stats",
  [
    checkPermission("wallet-settings"),
    check("userId", "userId is required").notEmpty(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return require("../../../config/response").errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }
    next();
  },
  getUserActivationStats
);

module.exports = router;
