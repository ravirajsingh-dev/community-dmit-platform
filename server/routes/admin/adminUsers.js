const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { check, validationResult } = require("express-validator");

const User = require("../../models/User");

const {
  getUsersList,
  getUserById,
  createUser,
  updateUserById,
  performUserStatusAction,
} = require("./Controllers/AdminUserController");

// @route GET api/admin/users/list
// @desc Get users list
// @access Private
router.get("/list", [AdminAuth, checkPermission("users", "list")], getUsersList);

// @route POST api/admin/users
// @desc Create new user (admin power)
// @access Private
router.post("/", [AdminAuth, checkPermission("users", "create")], createUser);

// @route GET api/admin/users/:user_id
// @desc Get user by user_id
// @access Private
router.get("/:user_id", [AdminAuth, checkPermission("users", "list")], getUserById);

// @route PUT api/admin/users/:user_id
// @desc Update user profile by user_id
// @access Private
router.put("/:user_id", [AdminAuth, checkPermission("users", "edit"), verifyTransactionPassword], updateUserById);

// @route POST api/admin/users/:user_id/status-action
// @desc Perform activate/force_activate/deactivate actions
// @access Private
router.post(
  "/:user_id/status-action",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("action", "action is required").isIn([
      "activate",
      "force_activate",
      "deactivate",
    ]),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return require("../../config/response").errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }
    next();
  },
  performUserStatusAction,
);

module.exports = router;
