const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  hardDeleteCommunity,
  toggleCommunityStatus,
  restoreCommunity,
  approveCommunity,
  rejectCommunity,
} = require("./Controllers/CommunityController");

router.post("/", [AdminAuth, checkPermission("communities", "create")], createCommunity);

router.get("/", [AdminAuth, checkPermission("communities", "list")], getCommunities);

router.get("/:id", [AdminAuth, checkPermission("communities", "list")], getCommunityById);

router.put("/:id", [AdminAuth, checkPermission("communities", "edit"), verifyTransactionPassword], updateCommunity);

router.delete("/:id/hard", [AdminAuth, checkPermission("communities", "delete"), verifyTransactionPassword], hardDeleteCommunity);

router.delete("/:id", [AdminAuth, checkPermission("communities", "delete"), verifyTransactionPassword], deleteCommunity);

router.put("/:id/toggle-status", [AdminAuth, checkPermission("communities", "edit"), verifyTransactionPassword], toggleCommunityStatus);

router.put("/:id/restore", [AdminAuth, checkPermission("communities", "edit"), verifyTransactionPassword], restoreCommunity);

router.put("/:id/approve", [AdminAuth, checkPermission("communities", "edit"), verifyTransactionPassword], approveCommunity);

router.put("/:id/reject", [AdminAuth, checkPermission("communities", "edit"), verifyTransactionPassword], rejectCommunity);

module.exports = router;
