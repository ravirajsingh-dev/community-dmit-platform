const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createVillage,
  getVillages,
  getVillageById,
  updateVillage,
  deleteVillage,
  hardDeleteVillage,
  toggleVillageStatus,
  restoreVillage,
  approveVillage,
  rejectVillage,
} = require("./Controllers/VillageController");

router.post("/", [AdminAuth, checkPermission("villages", "create")], createVillage);

router.get("/", [AdminAuth, checkPermission("villages", "list")], getVillages);

router.get("/:id", [AdminAuth, checkPermission("villages", "list")], getVillageById);

router.put("/:id", [AdminAuth, checkPermission("villages", "edit"), verifyTransactionPassword], updateVillage);

router.delete("/:id/hard", [AdminAuth, checkPermission("villages", "delete"), verifyTransactionPassword], hardDeleteVillage);

router.delete("/:id", [AdminAuth, checkPermission("villages", "delete"), verifyTransactionPassword], deleteVillage);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("villages", "edit"), verifyTransactionPassword], toggleVillageStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("villages", "edit"), verifyTransactionPassword], restoreVillage);

router.put("/:id/approve", [AdminAuth, checkPermission("villages", "edit"), verifyTransactionPassword], approveVillage);

router.put("/:id/reject", [AdminAuth, checkPermission("villages", "edit"), verifyTransactionPassword], rejectVillage);

module.exports = router;
