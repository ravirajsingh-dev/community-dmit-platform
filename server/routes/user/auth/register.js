const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const {
  validatePhoneField,
  validateEmailField,
} = require("../../../middleware/inputValidation");

const { register } = require("./Controllers/RegisterController");
const { validateReferral } = require("./Controllers/ReferralController");

router.post(
  "/register",
  [
    check("name", "Name is required")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 150 })
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Name cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Name contains invalid characters");
        }
        return true;
      }),

    validatePhoneField("phone"),

    validateEmailField("email"),

    check("password", "Password must be at least 4 characters long")
      .isLength({ min: 4 })
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),

    check("referralId", "Referral ID is required")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 10 })
      .matches(/^G\d{9}$/)
      .withMessage(
        "Invalid referral ID format. Expected: G followed by 9 digits (e.g. G123456789)",
      ),

    check("epinId", "E-PIN is required")
      .notEmpty()
      .trim()
      .isLength({ min: 20, max: 20 })
      .matches(/^G[A-Z0-9]{19}$/i)
      .withMessage(
        "Invalid E-PIN format. Expected: G followed by 19 uppercase alphanumeric (e.g. G8F7K29J3L9X2Q1R5T6)",
      ),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          message: "Validation Error",
          errors: errors
            .array()
            .map((e) => ({ path: e.param || e.path, msg: e.msg })),
        });
      }

      await register(req, res);
    } catch (error) {
      console.error("Error handling user registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Referral validation endpoint
router.get("/validate-referral", validateReferral);

module.exports = router;
