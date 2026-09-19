const express = require("express");
const router = express.Router();

const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");

const {
  approveAllPendingLocationsNoTxn,
  getPendingLocationApprovalRows,
  approveCountryNoTxn,
  approveStateNoTxn,
  approveDistrictNoTxn,
  approveVillageNoTxn,
  approvePendingLocationRowNoTxn,
} = require("./Controllers/LocationManagementController");

// Bulk approve without transaction password verification (confirmation-based only in UI).
router.put(
  "/approve-all-pending",
  [AdminAuth, checkPermission("countries", "edit")],
  approveAllPendingLocationsNoTxn
);

// Pending approvals page data
router.get(
  "/pending-approvals",
  [AdminAuth, checkPermission("countries", "list")],
  getPendingLocationApprovalRows
);

// Single approve (confirmation only, no txn password)
router.put(
  "/countries/:id/approve-no-txn",
  [AdminAuth, checkPermission("countries", "edit")],
  approveCountryNoTxn
);
router.put(
  "/states/:id/approve-no-txn",
  [AdminAuth, checkPermission("states", "edit")],
  approveStateNoTxn
);
router.put(
  "/districts/:id/approve-no-txn",
  [AdminAuth, checkPermission("districts", "edit")],
  approveDistrictNoTxn
);
router.put(
  "/villages/:id/approve-no-txn",
  [AdminAuth, checkPermission("villages", "edit")],
  approveVillageNoTxn
);

// Row approve (confirmation only, no txn password)
router.put(
  "/approve-row-no-txn",
  [AdminAuth, checkPermission("countries", "edit")],
  approvePendingLocationRowNoTxn
);

module.exports = router;

