/**
 * Admin Appointment Routes - Phase-2.1
 *
 * GET /api/admin/appointments?status=&designationCode=&page=&limit=
 * POST /api/admin/appointments/approve-cancel
 * POST /api/admin/appointments/reject-cancel
 * POST /api/admin/appointments/cancel
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const {
  listAppointments,
  createSbiProOverride,
  approveCancel,
  rejectCancel,
  cancel,
} = require("./Controllers/AppointmentController");

router.use(AdminAuth);
router.use(checkPermission("appointments"));

router.get("/", listAppointments);

router.post(
  "/create-sbi-pro-override",
  [
    check("requesterId", "requesterId required").notEmpty().trim(),
    check("holderId", "holderId required").notEmpty().trim(),
    check("dateKey", "dateKey required (YYYY-MM-DD)").matches(/^\d{4}-\d{2}-\d{2}$/).trim(),
    check("slotId", "slotId required").notEmpty().trim(),
  ],
  createSbiProOverride
);

router.post(
  "/approve-cancel",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  approveCancel
);

router.post(
  "/reject-cancel",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  rejectCancel
);

router.post(
  "/cancel",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  cancel
);

module.exports = router;
