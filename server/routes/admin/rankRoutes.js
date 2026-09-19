/**
 * Admin Rank Routes - QA Q21
 * GET /api/admin/ranks/users
 * GET /api/admin/ranks/summary
 * POST /api/admin/ranks/assign
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const { listUsersByRank, getRankSummary, assignRank } = require("./Controllers/RankController");

router.use(AdminAuth);
router.use(checkPermission("designations")); // Reuse designations permission for ranks

router.get("/users", listUsersByRank);
router.get("/summary", getRankSummary);
router.post(
  "/assign",
  [
    check("userId", "userId is required").notEmpty().trim(),
    check("rankCode", "rankCode is required").isInt({ min: 1 }).toInt(),
  ],
  assignRank
);

module.exports = router;
