const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const {
  getLevelCommissionStats,
  getLevelCommissionHistory,
} = require("./Controllers/LevelCommissionController");

router.use(AdminAuth);

router.get(
  "/stats",
  [checkPermission("wallets", "list")],
  getLevelCommissionStats
);

router.get(
  "/history",
  [checkPermission("wallets", "list")],
  getLevelCommissionHistory
);

module.exports = router;
