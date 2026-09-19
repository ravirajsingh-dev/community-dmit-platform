/**
 * Admin Designation Routes - Phase-1 (Unified)
 *
 * GET /api/admin/designations?status=&designationCode=&page=&limit=
 * POST /api/admin/designations/decision
 * POST /api/admin/designations/inactive
 * POST /api/admin/designations/transition
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  listDesignations,
  listDesignationRatingReviews,
  getDesignationSummaryController,
  decision,
  setAvailability,
  setInactive,
  transition,
  assignDirect,
} = require("./Controllers/DesignationController");

router.use(AdminAuth);

// Action-level permission selection for decision route
const checkDecisionPermission = (req, res, next) => {
  const normalized = String(req.body?.decision || "").toLowerCase();
  const action = normalized.includes("reject") ? "reject" : "approve";
  return checkPermission("designations", action)(req, res, next);
};

// GET /api/admin/designations - unified listing (MUST be before /:param routes)
router.get("/", checkPermission("designations", "list"), listDesignations);

// GET /api/admin/designations/summary
router.get("/summary", checkPermission("designations", "list"), getDesignationSummaryController);

// GET /api/admin/designations/reviews
router.get("/reviews", checkPermission("designations", "list"), listDesignationRatingReviews);

router.post(
  "/decision",
  [
    check("userId", "userId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("designationEntryId", "designationEntryId must be MongoId")
      .optional()
      .isMongoId(),
    check("decision", "decision must be 'approve' or 'reject'")
      .isIn(["approve", "reject", "APPROVED", "REJECTED"]),
    checkDecisionPermission,
  ],
  decision,
);

router.post(
  "/inactive",
  [
    check("userId", "userId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("designationEntryId", "designationEntryId must be MongoId")
      .optional()
      .isMongoId(),
    checkPermission("designations", "inactive"),
  ],
  setInactive,
);

router.post(
  "/transition",
  [
    check("userId", "userId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("designationEntryId", "designationEntryId must be MongoId")
      .optional()
      .isMongoId(),
    check("toStatus", "toStatus is required")
      .isIn(["APPROVED", "INACTIVE"]),
    checkPermission("designations", "transition"),
  ],
  transition,
);

// POST /api/admin/designations/assign-direct
router.post(
  "/assign-direct",
  [
    check("memberId", "memberId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    checkPermission("designations", "transition"),
    verifyTransactionPassword,
  ],
  assignDirect,
);

// POST /api/admin/designations/availability (toggle holder online/offline)
router.post(
  "/availability",
  [
    check("userId", "userId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("designationEntryId", "designationEntryId must be MongoId")
      .optional()
      .isMongoId(),
    check("online", "online must be boolean").isBoolean(),
    checkPermission("designations", "transition"),
  ],
  setAvailability,
);

module.exports = router;
