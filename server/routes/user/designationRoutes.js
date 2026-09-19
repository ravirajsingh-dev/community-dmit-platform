/**
 * User Designation Routes - Phase-1
 *
 * GET /api/users/designations/eligibility
 * POST /api/users/designations/apply
 * GET /api/users/designations/downline/:designationCode
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getEligibility,
  apply,
  getDownline,
} = require("./Controllers/DesignationController");

router.use(UserAuth, checkSessionExpiry);

router.get("/eligibility", getEligibility);

router.post(
  "/apply",
  [
    check("designationCode", "designationCode is required and must be a number")
      .isInt({ min: 1 })
      .toInt(),
  ],
  apply
);

router.get("/downline/:designationCode", getDownline);

module.exports = router;
