const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { whitelistBodyFields } = require("../../middleware/inputValidation");
const {
  getPreview,
  runPayout,
  getHistory,
  getHistoryDetail,
  getRanksOverview,
} = require("./Controllers/CommissionPayoutController");

router.use(AdminAuth);

// @route GET api/admin/commission-payout/preview
// @desc Preview who gets credited (dry run)
router.get("/preview", [checkPermission("wallet-settings")], getPreview);

// @route GET api/admin/commission-payout/ranks-overview
// @desc Ranks overview - capping, work done, user counts
router.get("/ranks-overview", [checkPermission("wallet-settings")], getRanksOverview);

// @route GET api/admin/commission-payout/history/:periodKey/detail
// @desc Detailed payout for a period (must be before /history)
router.get("/history/:periodKey/detail", [checkPermission("wallet-settings")], getHistoryDetail);

// @route GET api/admin/commission-payout/history
// @desc Payout history
router.get("/history", [checkPermission("wallet-settings")], getHistory);

// @route POST api/admin/commission-payout/run
// @desc Run payout (requires txn password)
router.post(
  "/run",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields([
      "periodKey",
      "year",
      "month",
      "scheduleType",
      "payoutType",
      "txn_password",
    ]),
  ],
  runPayout,
);

module.exports = router;
