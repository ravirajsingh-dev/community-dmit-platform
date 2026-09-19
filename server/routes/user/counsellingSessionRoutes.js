/**
 * User Counselling Session Routes - Designation_2 (COUNSELLOR)
 * User: my-counselling, session detail, confirm-close
 * Counsellor: my-sessions (as-counsellor)
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getMySessionsAsCounsellor,
  getMyCounselling,
  getPendingCount,
  getSessionById,
  confirmClose,
  markResolved,
} = require("./Controllers/CounsellingSessionController");

router.use(UserAuth, checkSessionExpiry);

// Counsellor: My Counselling Sessions
router.get("/as-counsellor", getMySessionsAsCounsellor);

// User: My Counselling (as requester)
router.get("/", getMyCounselling);

// Pending count (for banner) - must be before /:id
router.get("/pending-count", getPendingCount);

// Single session detail
router.get("/:id", getSessionById);

// User confirm and close (step-by-step)
router.post(
  "/:id/confirm-close",
  [
    check("counsellingDone", "counsellingDone is required (true/false)").exists(),
  ],
  confirmClose
);

// Counsellor: mark issue as resolved (ISSUE_REPORTED → USER_CONFIRMATION_PENDING)
router.post(
  "/:id/mark-resolved",
  [check("id", "Session ID is required").notEmpty().trim()],
  markResolved
);

module.exports = router;
