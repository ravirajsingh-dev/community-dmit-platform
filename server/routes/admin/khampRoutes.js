const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createKhamp,
  getKhampList,
  getKhampById,
  updateKhamp,
  deleteKhamp,
  hardDeleteKhamp,
  toggleKhampStatus,
  restoreKhamp,
  approveKhamp,
  rejectKhamp,
} = require("./Controllers/KhampController");

router.post("/", [AdminAuth, checkPermission("khamp", "create")], createKhamp);

router.get("/", [AdminAuth, checkPermission("khamp", "list")], getKhampList);

router.get("/:id", [AdminAuth, checkPermission("khamp", "list")], getKhampById);

router.put("/:id", [AdminAuth, checkPermission("khamp", "edit"), verifyTransactionPassword], updateKhamp);

router.delete("/:id/hard", [AdminAuth, checkPermission("khamp", "delete"), verifyTransactionPassword], hardDeleteKhamp);

router.delete("/:id", [AdminAuth, checkPermission("khamp", "delete"), verifyTransactionPassword], deleteKhamp);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("khamp", "edit"), verifyTransactionPassword], toggleKhampStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("khamp", "edit"), verifyTransactionPassword], restoreKhamp);

router.put("/:id/approve", [AdminAuth, checkPermission("khamp", "edit"), verifyTransactionPassword], approveKhamp);

router.put("/:id/reject", [AdminAuth, checkPermission("khamp", "edit"), verifyTransactionPassword], rejectKhamp);

module.exports = router;
