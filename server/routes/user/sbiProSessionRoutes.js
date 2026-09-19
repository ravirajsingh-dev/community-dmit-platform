/**
 * User SBI PRO Session Routes - Phase 3
 * Trainer: assigned, upload, submit
 * User: pending-verification, verify
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  listAssigned,
  listMyReports,
  listClientReports,
  listPendingVerification,
  upload,
  submit,
  verify,
  getSession,
} = require("./Controllers/SbiProSessionController");
const { FINGER_TYPES } = require("../../models/SbiProSession");

router.use(UserAuth, checkSessionExpiry);

const storage = multer.memoryStorage();
const uploadMw = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Trainer: list assigned sessions
router.get("/assigned", listAssigned);

// User: list my completed reports
router.get("/my-reports", listMyReports);

// Trainer: list client reports (completed sessions I conducted)
router.get("/client-reports", listClientReports);

// User: list pending verification
router.get("/pending-verification", listPendingVerification);

// Trainer: upload finger image
router.post(
  "/upload",
  uploadMw.single("image"),
  [
    check("appointmentId", "appointmentId is required").notEmpty().trim(),
    check("fingerType", "fingerType is required")
      .notEmpty()
      .isIn(FINGER_TYPES),
  ],
  upload
);

// Trainer: submit session
router.post(
  "/submit",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  submit
);

// User: verify (confirm or reject)
router.post(
  "/verify",
  [
    check("appointmentId", "appointmentId is required").notEmpty().trim(),
    check("confirm", "confirm is required").exists(),
  ],
  verify
);

// Get single session (trainer or user)
router.get("/:appointmentId", getSession);

module.exports = router;
