const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { check } = require("express-validator");
const {
  updateUserById,
  updateAvatarByUserId,
} = require("./Controllers/UserController");
const {
  getProfile,
  updateProfile,
} = require("./Controllers/ProfileController");
const {
  searchMembers,
  getMemberDetailsById,
  resolveMember,
} = require("./Controllers/SearchMemberController");
const User = require("../../models/User");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../middleware/inputValidation");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");

// @route GET api/users/search-members
// @desc Search members with filters (for client side)
// @access Private
// CRITICAL: Must be defined BEFORE /profile route to prevent route matching conflict
router.get("/search-members", UserAuth, checkSessionExpiry, searchMembers);

// @route GET api/users/resolve-member
// @desc Resolve member by memberId (for transfer lookup)
// @access Private
router.get("/resolve-member", UserAuth, checkSessionExpiry, resolveMember);

// @route GET api/users/member-details/:user_id
// @desc Get member details by ID (read-only, for viewing other users)
// @access Private
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.get(
  "/member-details/:user_id",
  UserAuth,
  checkSessionExpiry,
  getMemberDetailsById,
);

// @route GET api/users/profile
// @desc Get complete user profile (User + UserDetails)
// @access Private
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.get("/profile", UserAuth, checkSessionExpiry, getProfile);

// @route PUT api/users/profile
// @desc Update user profile (User + UserDetails)
// @access Private
// Member ID is immutable (rejected in controller). Phone optional update (10 digits).
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.put(
  "/profile",
  [
    UserAuth,
    checkSessionExpiry,
    [
      check("phone")
        .optional()
        .isLength({ min: 10, max: 10 })
        .withMessage("Phone must be exactly 10 digits")
        .matches(/^\d{10}$/)
        .withMessage("Phone must contain only digits"),
      check("name")
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage("Name must be between 3 and 50 characters")
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("Name cannot contain HTML or script tags");
          }
          if (value && /\$[a-zA-Z]+/.test(value)) {
            throw new Error("Name contains invalid characters");
          }
          return true;
        }),
      check("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
      check("alternatePhone")
        .optional()
        .isLength({ min: 10, max: 10 })
        .withMessage("Alternate phone must be exactly 10 digits")
        .matches(/^\d{10}$/)
        .withMessage("Alternate phone must contain only digits"),
      check("dob")
        .optional()
        .isISO8601()
        .withMessage("Date of birth must be a valid date"),
      check("gender")
        .optional()
        .isIn(["male", "female", "other"])
        .withMessage("Gender must be one of: male, female, other"),
      check("fatherName")
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage("Father's name must be between 3 and 100 characters")
        .trim(),
      check("motherName")
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage("Mother's name must be between 3 and 100 characters")
        .trim(),
      check("height")
        .optional()
        .isFloat({ min: 0, max: 300 })
        .withMessage("Height must be between 0 and 300"),
      check("weight")
        .optional()
        .isFloat({ min: 0, max: 500 })
        .withMessage("Weight must be between 0 and 500"),
      check("address")
        .optional()
        .isLength({ min: 5, max: 300 })
        .withMessage("Address must be between 5 and 300 characters")
        .trim(),
      check("maritalStatus")
        .optional()
        .isIn([
          "single",
          "married",
          "remarried",
          "divorced",
          "widowed",
          "separated",
        ])
        .withMessage(
          "Marital status must be one of: single, married, remarried, divorced, widowed, separated",
        ),
      check("education")
        .optional()
        .isLength({ max: 300 })
        .withMessage("Education must be at most 300 characters")
        .trim(),
      check("occupation")
        .optional()
        .isLength({ max: 300 })
        .withMessage("Occupation must be at most 300 characters")
        .trim(),
      check("bloodGroup")
        .optional()
        .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
        .withMessage(
          "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
        ),
      check("whatsappContact")
        .optional()
        .isLength({ min: 10, max: 10 })
        .withMessage("WhatsApp contact must be exactly 10 digits")
        .matches(/^\d{10}$/)
        .withMessage("WhatsApp contact must contain only digits"),
    ],
  ],
  updateProfile,
);

// @route PUT api/users/:user_id
// @desc Edit user Nickname by user_id
// @access Private
router.put(
  "/:user_id",
  [
    UserAuth,
    [
      check("name", "Please provide the name")
        .not()
        .isEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters long")
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

      validateEmailField("email"),
      check("email").custom(async (value, { req }) => {
        const user_id = req.params.user_id;
        if (value) {
          const is_user_exists = await User.findOne({
            email: value,
            _id: { $ne: user_id },
          });
          if (is_user_exists) {
            throw new Error("Provided email is already registered.");
          }
        }
      }),

      validatePhoneField("phone"),

      check(
        "state",
        "State is required and should be at most 50 characters long",
      )
        .optional()
        .isString()
        .isLength({ max: 50 })
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("State cannot contain HTML or script tags");
          }
          return true;
        }),
    ],
  ],
  updateUserById,
);

// @route PUT api/users/:user_id/avatar
// @desc Update user avatar by user_id
// @access Private
router.put(
  "/:user_id/avatar",
  [
    UserAuth,
    [
      check("avatar", "Please provide the avatar")
        .not()
        .isEmpty()
        .withMessage("Avatar cannot be empty")
        .isLength({ min: 3, max: 10 })
        .withMessage("Avatar must be between 3 and 10 characters long")
        .custom((value) => {
          // Reject HTML/script tags
          if (/<[^>]*>/g.test(value)) {
            throw new Error("Avatar cannot contain HTML or script tags");
          }
          // Reject MongoDB operators
          if (/\$[a-zA-Z]+/.test(value)) {
            throw new Error("Avatar contains invalid characters");
          }
          return true;
        }),
    ],
  ],
  updateAvatarByUserId,
);

module.exports = router;
