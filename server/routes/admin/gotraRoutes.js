const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createGotra,
  getGotraList,
  getGotraById,
  updateGotra,
  deleteGotra,
  hardDeleteGotra,
  toggleGotraStatus,
  restoreGotra,
  approveGotra,
  rejectGotra,
} = require("./Controllers/GotraController");

router.post("/", [AdminAuth, checkPermission("gotra", "create")], createGotra);

router.get("/", [AdminAuth, checkPermission("gotra", "list")], getGotraList);

router.get("/:id", [AdminAuth, checkPermission("gotra", "list")], getGotraById);

router.put(
  "/:id",
  [AdminAuth, checkPermission("gotra", "edit"), verifyTransactionPassword],
  updateGotra,
);

router.delete(
  "/:id/hard",
  [AdminAuth, checkPermission("gotra", "delete"), verifyTransactionPassword],
  hardDeleteGotra,
);

router.delete(
  "/:id",
  [AdminAuth, checkPermission("gotra", "delete"), verifyTransactionPassword],
  deleteGotra,
);

router.put(
  "/:id/toggle-status",
  [AdminAuth, checkPermission("gotra", "edit"), verifyTransactionPassword],
  toggleGotraStatus,
);

router.put(
  "/:id/restore",
  [AdminAuth, checkPermission("gotra", "edit"), verifyTransactionPassword],
  restoreGotra,
);

router.put(
  "/:id/approve",
  [AdminAuth, checkPermission("gotra", "edit"), verifyTransactionPassword],
  approveGotra,
);

router.put(
  "/:id/reject",
  [AdminAuth, checkPermission("gotra", "edit"), verifyTransactionPassword],
  rejectGotra,
);

module.exports = router;
