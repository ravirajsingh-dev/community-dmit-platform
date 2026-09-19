/**
 * Admin Counselling Session Routes - Designation_2 (COUNSELLOR)
 * GET /api/admin/counselling-sessions
 * POST /api/admin/counselling-sessions/:id/confirm-close
 */

const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const {
  list,
  confirmClose,
  closeWithoutCommission,
  requestRecounselling,
} = require("./Controllers/CounsellingSessionController");

router.use(AdminAuth);
router.use(checkPermission("appointments"));

router.get("/", list);

router.post(
  "/:id/confirm-close",
  [check("id", "Session ID is required").notEmpty().trim()],
  confirmClose
);

router.post(
  "/:id/close-without-commission",
  [
    check("id", "Session ID is required").notEmpty().trim(),
    check("reason", "Reason is required").notEmpty().trim(),
  ],
  closeWithoutCommission
);

router.post(
  "/:id/request-recounselling",
  [check("id", "Session ID is required").notEmpty().trim()],
  requestRecounselling
);

module.exports = router;
