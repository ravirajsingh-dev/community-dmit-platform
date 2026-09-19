const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const {
  getUserDetails,
  createOrUpdateUserDetails,
  getUserWithDetails,
} = require("./Controllers/UserDetailsController");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");

// @route GET api/users/details
// @desc Get user details
// @access Private
router.get("/details", UserAuth, checkSessionExpiry, getUserDetails);

// @route GET api/users/user-with-details
// @desc Get user with details combined
// @access Private
router.get(
  "/user-with-details",
  UserAuth,
  checkSessionExpiry,
  getUserWithDetails
);

// @route POST api/users/details
// @desc Create or update user details
// @access Private
router.post(
  "/details",
  UserAuth,
  checkSessionExpiry,
  [
    check("gender", "Gender must be one of: male, female, other")
      .optional()
      .isIn(["male", "female", "other"]),
    check("maritalStatus", "Marital status must be married or unmarried")
      .optional()
      .isIn(["married", "unmarried"]),
    check("country", "Country code must be 2 characters")
      .optional()
      .isLength({ min: 2, max: 2 }),
  ],
  createOrUpdateUserDetails
);

// @route PUT api/users/details
// @desc Update user details
// @access Private
router.put(
  "/details",
  UserAuth,
  checkSessionExpiry,
  [
    check("gender", "Gender must be one of: male, female, other")
      .optional()
      .isIn(["male", "female", "other"]),
    check("maritalStatus", "Marital status must be married or unmarried")
      .optional()
      .isIn(["married", "unmarried"]),
    check("country", "Country code must be 2 characters")
      .optional()
      .isLength({ min: 2, max: 2 }),
  ],
  createOrUpdateUserDetails
);

module.exports = router;
