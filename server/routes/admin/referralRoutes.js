const express = require("express");
const router = express.Router();
const {
  getReferralSummary,
  getReferredUsers,
} = require("./Controllers/ReferralController");
const { AdminAuth } = require("../../middleware/auth");

// All referral routes require admin authentication
router.use(AdminAuth);

/**
 * GET /api/admin/referrals/summary
 * Get referral summary with user counts
 */
router.get("/summary", getReferralSummary);

/**
 * GET /api/admin/referrals/:userId/referred-users
 * Get list of users referred by a specific user
 */
router.get("/:userId/referred-users", getReferredUsers);

module.exports = router;
