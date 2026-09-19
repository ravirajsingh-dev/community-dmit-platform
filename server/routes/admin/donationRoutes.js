const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { validateAmountField } = require("../../middleware/inputValidation");

const {
  getAllDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
  getAllDonationRequests,
  getDonationRequest,
  approveDonationRequest,
  rejectDonationRequest,
} = require("./Controllers/DonationController");

// Donation Buttons Routes

// @route GET /api/admin/donation/buttons
// @desc Get all donation buttons
// @access Private (Admin)
router.get("/buttons", [AdminAuth, checkPermission("donation", "buttons")], getAllDonationButtons);

// @route POST /api/admin/donation/buttons
// @desc Create donation button
// @access Private (Admin)
router.post(
  "/buttons",
  [
    AdminAuth,
    checkPermission("donation", "buttons"),
    [
      validateAmountField("amount"),
      check("amount")
        .optional()
        .custom((value, { req }) => {
          if (req.body.type === "FIXED") {
            if (!value || value <= 0) {
              throw new Error("Amount is required and must be greater than 0 for FIXED type");
            }
          }
          return true;
        }),
      check("type", "Type is required")
        .isIn(["FIXED", "ANY"])
        .withMessage("Type must be either FIXED or ANY"),
      check("buttonText")
        .optional()
        .isString()
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("Button text cannot contain HTML or script tags");
          }
          return true;
        }),
    ],
  ],
  createDonationButton
);

// @route PUT /api/admin/donation/buttons/:id
// @desc Update donation button
// @access Private (Admin)
router.put(
  "/buttons/:id",
  [
    AdminAuth,
    checkPermission("donation", "buttons"),
    verifyTransactionPassword,
    [
      validateAmountField("amount"),
      check("type")
        .optional()
        .isIn(["FIXED", "ANY"])
        .withMessage("Type must be either FIXED or ANY"),
      check("buttonText")
        .optional()
        .isString()
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("Button text cannot contain HTML or script tags");
          }
          return true;
        }),
    ],
  ],
  updateDonationButton
);

// @route DELETE /api/admin/donation/buttons/:id
// @desc Delete donation button
// @access Private (Admin)
router.delete("/buttons/:id", [AdminAuth, checkPermission("donation", "buttons"), verifyTransactionPassword], deleteDonationButton);

// Donation Requests Routes

// @route GET /api/admin/donation/requests
// @desc Get all donation requests with filters
// @access Private (Admin)
router.get("/requests", [AdminAuth, checkPermission("donation", "requests")], getAllDonationRequests);

// @route GET /api/admin/donation/requests/:id
// @desc Get single donation request
// @access Private (Admin)
router.get("/requests/:id", [AdminAuth, checkPermission("donation", "requests")], getDonationRequest);

// @route PUT /api/admin/donation/requests/:id/approve
// @desc Approve donation request
// @access Private (Admin)
router.put("/requests/:id/approve", [AdminAuth, checkPermission("donation", "requests"), verifyTransactionPassword], approveDonationRequest);

// @route PUT /api/admin/donation/requests/:id/reject
// @desc Reject donation request
// @access Private (Admin)
router.put("/requests/:id/reject", [AdminAuth, checkPermission("donation", "requests"), verifyTransactionPassword], rejectDonationRequest);

module.exports = router;

