const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createState,
  getStates,
  getStateById,
  updateState,
  deleteState,
  hardDeleteState,
  toggleStateStatus,
  restoreState,
  approveState,
  rejectState,
} = require("./Controllers/StateController");

router.post("/", [AdminAuth, checkPermission("states", "create")], createState);

router.get("/", [AdminAuth, checkPermission("states", "list")], getStates);

router.get("/:id", [AdminAuth, checkPermission("states", "list")], getStateById);

router.put("/:id", [AdminAuth, checkPermission("states", "edit"), verifyTransactionPassword], updateState);

router.delete("/:id/hard", [AdminAuth, checkPermission("states", "delete"), verifyTransactionPassword], hardDeleteState);

router.delete("/:id", [AdminAuth, checkPermission("states", "delete"), verifyTransactionPassword], deleteState);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("states", "edit"), verifyTransactionPassword], toggleStateStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("states", "edit"), verifyTransactionPassword], restoreState);

router.put("/:id/approve", [AdminAuth, checkPermission("states", "edit"), verifyTransactionPassword], approveState);

router.put("/:id/reject", [AdminAuth, checkPermission("states", "edit"), verifyTransactionPassword], rejectState);

module.exports = router;
