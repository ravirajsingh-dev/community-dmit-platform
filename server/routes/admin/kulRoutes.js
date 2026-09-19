const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createKul,
  getKulList,
  getKulById,
  updateKul,
  deleteKul,
  hardDeleteKul,
  toggleKulStatus,
  restoreKul,
  approveKul,
  rejectKul,
} = require("./Controllers/KulController");

router.post("/", [AdminAuth, checkPermission("kul", "create")], createKul);

router.get("/", [AdminAuth, checkPermission("kul", "list")], getKulList);

router.get("/:id", [AdminAuth, checkPermission("kul", "list")], getKulById);

router.put("/:id", [AdminAuth, checkPermission("kul", "edit"), verifyTransactionPassword], updateKul);

router.delete("/:id/hard", [AdminAuth, checkPermission("kul", "delete"), verifyTransactionPassword], hardDeleteKul);

router.delete("/:id", [AdminAuth, checkPermission("kul", "delete"), verifyTransactionPassword], deleteKul);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("kul", "edit"), verifyTransactionPassword], toggleKulStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("kul", "edit"), verifyTransactionPassword], restoreKul);

router.put("/:id/approve", [AdminAuth, checkPermission("kul", "edit"), verifyTransactionPassword], approveKul);

router.put("/:id/reject", [AdminAuth, checkPermission("kul", "edit"), verifyTransactionPassword], rejectKul);

module.exports = router;
