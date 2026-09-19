const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createCountry,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
  hardDeleteCountry,
  toggleCountryStatus,
  restoreCountry,
  approveCountry,
  rejectCountry,
} = require("./Controllers/CountryController");

router.post("/", [AdminAuth, checkPermission("countries", "create")], createCountry);

router.get("/", [AdminAuth, checkPermission("countries", "list")], getCountries);

router.get("/:id", [AdminAuth, checkPermission("countries", "list")], getCountryById);

router.put("/:id", [AdminAuth, checkPermission("countries", "edit"), verifyTransactionPassword], updateCountry);

router.delete("/:id/hard", [AdminAuth, checkPermission("countries", "delete"), verifyTransactionPassword], hardDeleteCountry);

router.delete("/:id", [AdminAuth, checkPermission("countries", "delete"), verifyTransactionPassword], deleteCountry);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("countries", "edit"), verifyTransactionPassword], toggleCountryStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("countries", "edit"), verifyTransactionPassword], restoreCountry);

router.put("/:id/approve", [AdminAuth, checkPermission("countries", "edit"), verifyTransactionPassword], approveCountry);

router.put("/:id/reject", [AdminAuth, checkPermission("countries", "edit"), verifyTransactionPassword], rejectCountry);

module.exports = router;
