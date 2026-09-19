/**
 * User Appointment Routes - Phase-2.1
 *
 * User: book, my, cancel, rate
 * Holder: assigned, accept, complete, request-cancel, toggle-online
 * Shared: holders list
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getHolders,
  book,
  bookBatch,
  getMy,
  cancel,
  rate,
  getAssigned,
  accept,
  complete,
  reject,
  requestCancel,
  toggleOnline,
  getSlots,
  getSlotsAvailability,
  getNextAvailable,
} = require("./Controllers/AppointmentController");

router.use(UserAuth, checkSessionExpiry);

// Holders list (for booking) - MUST be before :designationCode param routes
router.get("/holders/:designationCode", getHolders);

// Slots for designation
router.get("/slots/:designationCode", getSlots);

// Slot availability for holder+date
router.get("/slots-availability", getSlotsAvailability);

// Next available date+slot
router.get("/next-available/:holderId/:designationCode", getNextAvailable);

// User APIs
router.post(
  "/book",
  [
    check("holderId", "holderId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
    check("dateKey", "dateKey is required (YYYY-MM-DD)")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .trim(),
    check("slotId", "slotId is required").notEmpty().trim(),
  ],
  book
);

router.post(
  "/book-batch",
  [
    check("holderId", "holderId is required").notEmpty().trim(),
    check("designationCode", "designationCode is required").isInt({ min: 1 }).toInt(),
    check("dateKey", "dateKey is required (YYYY-MM-DD)").matches(/^\d{4}-\d{2}-\d{2}$/).trim(),
    check("slotId", "slotId is required").notEmpty().trim(),
    check("beneficiaries", "beneficiaries array required").isArray(),
  ],
  bookBatch
);

router.get("/my", getMy);

router.post(
  "/cancel",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  cancel
);

router.post(
  "/rate",
  [
    check("appointmentId", "appointmentId is required").notEmpty().trim(),
    check("rating", "rating is required (0-5)")
      .isFloat({ min: 0, max: 5 })
      .toFloat(),
  ],
  rate
);

// Holder APIs
router.get("/assigned", getAssigned);

router.post(
  "/accept",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  accept
);

router.post(
  "/complete",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  complete
);

router.post(
  "/reject",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  reject
);

router.post(
  "/request-cancel",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  requestCancel
);

router.post(
  "/toggle-online",
  [
    check("designationCode", "designationCode is required")
      .isInt({ min: 1 })
      .toInt(),
  ],
  toggleOnline
);

module.exports = router;
