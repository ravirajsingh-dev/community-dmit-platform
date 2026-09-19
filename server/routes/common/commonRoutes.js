const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const {
  getPublicCommonSettings,
} = require("../admin/Controllers/CommonController");
const {
  getPublicSliderBanners,
} = require("../admin/Controllers/SliderController");
const {
  getPublicGalleryImages,
} = require("../admin/Controllers/GalleryController");
const { getPublicVideos } = require("../admin/Controllers/VideoController");
const { getPublicNews } = require("../admin/Controllers/NewsController");
const {
  getPublicTrainingVideos,
} = require("../admin/Controllers/TrainingVideoController");
const { getPublicPDFs } = require("../admin/Controllers/PDFController");
const {
  getActiveDonationButtons,
  getDonationSettings,
  getTopDonations,
  submitDonationRequest,
} = require("../admin/Controllers/DonationController");
const { generateQR } = require("../admin/Controllers/QrController");
const { check } = require("express-validator");
const { isEmailValid } = require("../../utils/helper");
const {
  validateEmailField,
  validatePhoneField,
  validateAmountField,
  validateUTRField,
} = require("../../middleware/inputValidation");

// @route GET /api/common/settings
// @desc Get public common settings (marquee settings only)
// @access Public
router.get("/settings", [], getPublicCommonSettings);

// @route GET /api/common/slider-banners
// @desc Get active slider banners
// @access Public
router.get("/slider-banners", getPublicSliderBanners);

// @route GET /api/common/gallery
// @desc Get active gallery images
// @access Public
router.get("/gallery", getPublicGalleryImages);

// @route GET /api/common/videos
// @desc Get active videos
// @access Public
router.get("/videos", getPublicVideos);

// @route GET /api/common/training-videos
// @desc Get active training videos grouped by designation
// @access Public
router.get("/training-videos", getPublicTrainingVideos);

// @route GET /api/common/news
// @desc Get active news items
// @access Public
router.get("/news", getPublicNews);

// @route GET /api/common/pdfs
// @desc Get active PDF documents
// @access Public
router.get("/pdfs", getPublicPDFs);

// @route GET /api/common/donation/buttons
// @desc Get active donation buttons
// @access Public
router.get("/donation/buttons", getActiveDonationButtons);

// @route GET /api/common/donation/settings
// @desc Get donation settings
// @access Public
router.get("/donation/settings", getDonationSettings);

// @route GET /api/common/donation/top
// @desc Get top donations (sorted by amount, highest first)
// @access Public
router.get("/donation/top", getTopDonations);

// @route POST /api/common/qr/generate
// @desc Generate UPI QR code for given amount (uses Application Settings UPI - single source of truth)
// @access Public (reusable for donation and any future feature)
router.post(
  "/qr/generate",
  [validateAmountField("amount")],
  generateQR
);

// @route POST /api/common/donation/request
// @desc Submit donation request
// @access Public
router.post(
  "/donation/request",
  [
    check("donorName", "Donor name is required")
      .trim()
      .notEmpty()
      .withMessage("Donor name cannot be empty")
      .isLength({ min: 2, max: 150 })
      .withMessage("Donor name must be between 2 and 150 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Donor name cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Donor name contains invalid characters");
        }
        return true;
      }),
    validatePhoneField("phone"),
    validateEmailField("email"),
    validateAmountField("amount"),
    validateUTRField("utrNumber"),
    check("paymentMode", "Payment mode is required")
      .isIn(["UPI", "BANK"])
      .withMessage("Payment mode must be either UPI or BANK"),
    check("address", "Address must be a string")
      .optional()
      .isString()
      .custom((value) => {
        if (value && /<[^>]*>/g.test(value)) {
          throw new Error("Address cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  submitDonationRequest
);

module.exports = router;
