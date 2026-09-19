const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
} = require("./Controllers/NewsController");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase()
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

// @route POST api/admin/news
// @desc Create a new news item
// @access Private (Admin)
router.post("/", [AdminAuth, checkPermission("news", "create")], upload.single("image"), createNews);

// @route GET api/admin/news
// @desc Get all news items
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("news", "list")], getNews);

// @route GET api/admin/news/:id
// @desc Get news by ID
// @access Private (Admin)
router.get("/:id", [AdminAuth, checkPermission("news", "list")], getNewsById);

// @route PUT api/admin/news/:id
// @desc Update news
// @access Private (Admin)
router.put("/:id", [AdminAuth, checkPermission("news", "edit"), upload.single("image"), verifyTransactionPassword], updateNews);

// @route DELETE api/admin/news/:id
// @desc Delete news
// @access Private (Admin)
router.delete("/:id", [AdminAuth, checkPermission("news", "delete"), verifyTransactionPassword], deleteNews);

module.exports = router;
