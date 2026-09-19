const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const {
  getCommonSettings,
  updateCommonSettings,
} = require("./Controllers/AdminSettingsController");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
  }
};

// Multer middleware configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: fileFilter,
});

// @route GET api/admin/settings
// @desc Get common settings (auto-creates if not found)
// @access Private (Admin only)
router.get("/settings", [], getCommonSettings);

// @route PUT api/admin/settings
// @desc Update common settings
// @access Private (Admin only)
router.put(
  "/settings",
  [AdminAuth, checkPermission("application-settings")],
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "heroBrainImage", maxCount: 1 },
  ]),
  updateCommonSettings,
);

module.exports = router;
