const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getWallet,
  getTransactions,
  getLevelIncome,
  transfer,
  clubTransfer,
} = require("./Controllers/WalletController");
const {
  getWithdrawalSettings,
  createWithdrawalRequest,
  listWithdrawalRequests,
  cancelWithdrawalRequest,
} = require("./Controllers/WalletWithdrawalController");

router.use(UserAuth);
router.use(checkSessionExpiry);

router.get("/", getWallet);
router.get("/transactions", getTransactions);
router.get("/level-income", getLevelIncome);
router.get("/withdrawal-settings", getWithdrawalSettings);
router.get("/withdrawals", listWithdrawalRequests);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post(
  "/withdraw",
  [
    check("requestId", "requestId is required").notEmpty().trim().matches(UUID_REGEX),
    check("amount", "Amount is required and must be positive")
      .isFloat({ min: 0.01 })
      .toFloat(),
    check("paymentMethod", "paymentMethod must be one of UPI, BANK, CHEQUE")
      .isIn(["UPI", "BANK", "CHEQUE"]),
  ],
  createWithdrawalRequest,
);

router.post(
  "/withdraw/cancel",
  [check("withdrawalRequestId", "withdrawalRequestId is required").notEmpty().trim()],
  cancelWithdrawalRequest,
);

router.post(
  "/transfer",
  [
    check("toMemberId", "Recipient member ID is required").notEmpty().trim(),
    check("amount", "Amount is required and must be positive")
      .isFloat({ min: 0.01 })
      .toFloat(),
    check("requestId", "requestId (UUID) is required")
      .isString()
      .notEmpty()
      .trim(),
  ],
  transfer
);

router.post(
  "/club-transfer",
  [
    check("clubKey", "Club is required").notEmpty().trim(),
    check("amount", "Amount is required and must be positive")
      .isFloat({ min: 0.01 })
      .toFloat(),
    check("requestId", "requestId (UUID) is required")
      .isString()
      .notEmpty()
      .trim(),
  ],
  clubTransfer
);

module.exports = router;
