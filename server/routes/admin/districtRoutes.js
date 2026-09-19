const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createDistrict,
  getDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
  hardDeleteDistrict,
  toggleDistrictStatus,
  restoreDistrict,
  approveDistrict,
  rejectDistrict,
} = require("./Controllers/DistrictController");

router.post("/", [AdminAuth, checkPermission("districts", "create")], createDistrict);

router.get("/", [AdminAuth, checkPermission("districts", "list")], getDistricts);

router.get("/:id", [AdminAuth, checkPermission("districts", "list")], getDistrictById);

router.put("/:id", [AdminAuth, checkPermission("districts", "edit"), verifyTransactionPassword], updateDistrict);

router.delete("/:id/hard", [AdminAuth, checkPermission("districts", "delete"), verifyTransactionPassword], hardDeleteDistrict);

router.delete("/:id", [AdminAuth, checkPermission("districts", "delete"), verifyTransactionPassword], deleteDistrict);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("districts", "edit"), verifyTransactionPassword], toggleDistrictStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("districts", "edit"), verifyTransactionPassword], restoreDistrict);

router.put("/:id/approve", [AdminAuth, checkPermission("districts", "edit"), verifyTransactionPassword], approveDistrict);

router.put("/:id/reject", [AdminAuth, checkPermission("districts", "edit"), verifyTransactionPassword], rejectDistrict);

module.exports = router;
