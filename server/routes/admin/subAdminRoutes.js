const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { check } = require("express-validator");

const {
  getSubAdminsList,
  getSubAdminById,
  createSubAdmin,
  updateSubAdminById,
  deleteSubAdminById,
  toggleSubAdminStatus,
} = require("./Controllers/SubAdminController");

// All routes require admin authentication
// Only full admins can manage sub-admins (sub-admins cannot manage other sub-admins)

// @route GET api/admin/sub-admins/list
// @desc Get sub-admins list
// @access Private (Admin only)
router.get("/list", AdminAuth, getSubAdminsList);

// @route GET api/admin/sub-admins/:id
// @desc Get sub-admin by ID
// @access Private (Admin only)
router.get("/:id", AdminAuth, getSubAdminById);

// @route POST api/admin/sub-admins
// @desc Create new sub-admin
// @access Private (Admin only)
router.post(
  "/",
  [
    AdminAuth,
    check("name", "Name is required").trim().notEmpty(),
    check("email", "Email is required")
      .trim()
      .notEmpty()
      .isEmail()
      .withMessage("Email must be a valid email address"),
    check("admin_id", "Admin ID is required")
      .trim()
      .notEmpty()
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters"),
    check("password", "Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    check("role", "Role is required")
      .isIn(["sub_admin", "staff", "manager"])
      .withMessage("Invalid role"),
  ],
  createSubAdmin
);

// @route PUT api/admin/sub-admins/:id
// @desc Update sub-admin by ID
// @access Private (Admin only)
router.put(
  "/:id",
  [
    AdminAuth,
    verifyTransactionPassword,
    check("name", "Name is required").trim().notEmpty().optional(),
    check("admin_id", "Admin ID must be 8-15 characters")
      .isLength({ min: 8, max: 15 })
      .optional(),
    check("role", "Role must be valid")
      .isIn(["sub_admin", "staff", "manager"])
      .optional(),
  ],
  updateSubAdminById
);

// @route PUT api/admin/sub-admins/:id/toggle-status
// @desc Toggle sub-admin active status
// @access Private (Admin only)
router.put("/:id/toggle-status", [AdminAuth, verifyTransactionPassword], toggleSubAdminStatus);

// @route DELETE api/admin/sub-admins/:id
// @desc Delete sub-admin by ID
// @access Private (Admin only)
router.delete("/:id", [AdminAuth, verifyTransactionPassword], deleteSubAdminById);

module.exports = router;
