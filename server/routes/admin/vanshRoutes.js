const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createVansh,
  getVanshList,
  getVanshById,
  updateVansh,
  deleteVansh,
  hardDeleteVansh,
  toggleVanshStatus,
  restoreVansh,
  approveVansh,
  rejectVansh,
} = require("./Controllers/VanshController");

router.post("/", [AdminAuth, checkPermission("vansh", "create")], createVansh);

router.get("/", [AdminAuth, checkPermission("vansh", "list")], getVanshList);

router.get("/:id", [AdminAuth, checkPermission("vansh", "list")], getVanshById);

router.put("/:id", [AdminAuth, checkPermission("vansh", "edit"), verifyTransactionPassword], updateVansh);

router.delete("/:id/hard", [AdminAuth, checkPermission("vansh", "delete"), verifyTransactionPassword], hardDeleteVansh);

router.delete("/:id", [AdminAuth, checkPermission("vansh", "delete"), verifyTransactionPassword], deleteVansh);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("vansh", "edit"), verifyTransactionPassword], toggleVanshStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("vansh", "edit"), verifyTransactionPassword], restoreVansh);

router.put("/:id/approve", [AdminAuth, checkPermission("vansh", "edit"), verifyTransactionPassword], approveVansh);

router.put("/:id/reject", [AdminAuth, checkPermission("vansh", "edit"), verifyTransactionPassword], rejectVansh);

module.exports = router;
