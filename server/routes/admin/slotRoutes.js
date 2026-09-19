/**
 * Admin Slot Routes - Phase-2.2
 *
 * GET    /api/admin/slots?designationCode=
 * POST   /api/admin/slots
 * PUT    /api/admin/slots/:id
 * PATCH  /api/admin/slots/:id/toggle
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const { listSlots, create, update, toggle } = require("./Controllers/SlotController");

router.use(AdminAuth);
router.use(checkPermission("appointments"));

router.get("/", listSlots);

router.post(
  "/",
  [
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("label", "label is required").notEmpty().trim(),
    check("startTime", "startTime is required (HH:mm)")
      .matches(/^\d{1,2}:\d{2}$/)
      .trim(),
    check("endTime", "endTime is required (HH:mm)")
      .matches(/^\d{1,2}:\d{2}$/)
      .trim(),
    check("capacity", "capacity is required")
      .isInt({ min: 1 })
      .toInt(),
  ],
  create
);

router.put(
  "/:id",
  [
    check("label", "label must be non-empty if provided")
      .optional()
      .notEmpty()
      .trim(),
    check("startTime", "startTime must be HH:mm if provided")
      .optional()
      .matches(/^\d{1,2}:\d{2}$/)
      .trim(),
    check("endTime", "endTime must be HH:mm if provided")
      .optional()
      .matches(/^\d{1,2}:\d{2}$/)
      .trim(),
    check("capacity", "capacity must be >= 1 if provided")
      .optional()
      .isInt({ min: 1 })
      .toInt(),
  ],
  update
);

router.patch("/:id/toggle", toggle);

module.exports = router;
