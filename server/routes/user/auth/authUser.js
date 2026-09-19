const express = require("express");
const { check } = require("express-validator");
const router = express.Router();
const {
  validateMemberIdField,
  validatePhoneField,
  validateEmailField,
} = require("../../../middleware/inputValidation");

// Custom imports
const {
  login,
  logout,
  logoutAll,
  checkAuth,
  changePassword,
  getSponsorUserDetails,
  forgotPasswordStep1,
  forgotPasswordStep2,
} = require("./Controllers/AuthController");
const refreshToken = require("./Controllers/RefreshTokenController");
const { UserAuth } = require("../../../middleware/auth");
const {
  checkSessionExpiry,
} = require("../../../middleware/checkSessionExpiry");

// @route POST api/auth
// @desc Authenticate user
// @access Public
router.post(
  "/",
  [
    validateMemberIdField("memberId"),
    check("password", "Password is required")
      .not()
      .isEmpty()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  login,
);

// @route PUT api/auth/logout
// @desc Logout user from current device
// @access Private (requires authentication)
router.put("/logout", UserAuth, logout);

// @route PUT api/auth/logout-all
// @desc Logout user from all devices
// @access Private (requires authentication)
router.put("/logout-all", UserAuth, logoutAll);

// @route GET api/auth/load-user
// @desc Load authenticated user
// @access Private
router.get("/load-user", UserAuth, checkSessionExpiry, checkAuth);

// @route GET api/auth/referral-user/:referral_id
// @desc Load referral user by referral_id (memberId)
// @access Public
router.get("/referral-user/:referral_id", getSponsorUserDetails);

// @route POST api/auth/refresh-token
// @desc Refresh access token
// @access Private (requires authentication)
router.post("/refresh-token", refreshToken);

// @route POST api/auth/change-password
// @desc Change password
// @access Private (requires authentication)
router.post(
  "/change-password",
  UserAuth,
  [
    check("oldPassword", "Old password is required")
      .not()
      .isEmpty()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("password", "Password is required")
      .not()
      .isEmpty()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  checkSessionExpiry,
  changePassword,
);

// @route POST api/auth/forgot-password/verify
// @desc Verify phone number for password reset
// @access Public
router.post(
  "/forgot-password/verify",
  [validatePhoneField("phone")],
  forgotPasswordStep1,
);

// @route POST api/auth/forgot-password/reset
// @desc Reset password by verifying phone
// @access Public (no auth middleware)
router.post(
  "/forgot-password/reset",
  [validatePhoneField("phone")],
  forgotPasswordStep2,
);

const {
  verifyMemberId,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  resendForgotPasswordOtp,
} = require("./Controllers/ForgotPasswordOtpController");

// @route POST api/auth/forgot-password-email/verify-member-id
// @desc Verify Member ID and return masked email
// @access Public
router.post(
  "/forgot-password-email/verify-member-id",
  [validateMemberIdField("memberId")],
  verifyMemberId,
);

// @route POST api/auth/forgot-password-email/send-otp
// @desc Send OTP to email for password reset (after Member ID verification)
// @access Public
router.post(
  "/forgot-password-email/send-otp",
  [validateMemberIdField("memberId"), validateEmailField("email")],
  sendForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/resend-otp
// @desc Resend OTP to email for password reset
// @access Public
router.post(
  "/forgot-password-email/resend-otp",
  [validateMemberIdField("memberId")],
  resendForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/verify-otp
// @desc Verify OTP for password reset
// @access Public
router.post(
  "/forgot-password-email/verify-otp",
  [
    validateMemberIdField("memberId"),
    check("otp", "OTP is required")
      .trim()
      .not()
      .isEmpty()
      .withMessage("OTP cannot be empty")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be exactly 6 digits"),
  ],
  verifyForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/reset
// @desc Reset password after OTP verification
// @access Public
router.post(
  "/forgot-password-email/reset",
  [
    validateMemberIdField("memberId"),
    check("otp", "OTP is required")
      .trim()
      .not()
      .isEmpty()
      .withMessage("OTP cannot be empty")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be exactly 6 digits"),
    check("password", "Password is required")
      .not()
      .isEmpty()
      .isLength({ min: 4, max: 22 })
      .withMessage("Password must be 4 to 22 characters long")
      .matches(/^[a-zA-Z0-9@#$%^&+=!*-_.]{4,22}$/)
      .withMessage("Password must be 4 to 22 characters long.")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("confirmPassword", "Confirm Password is required")
      .not()
      .isEmpty()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
  ],
  resetPasswordWithOtp,
);

module.exports = router;
