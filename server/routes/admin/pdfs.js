const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createPDF,
  getPDFs,
  getPDFById,
  updatePDF,
  deletePDF,
} = require("./Controllers/PDFController");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for PDFs only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"));
  }
};

// Multer middleware configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs
  },
  fileFilter: fileFilter,
});

// @route POST api/admin/pdfs
// @desc Upload a new PDF document
// @access Private (Admin)
router.post(
  "/",
  [AdminAuth, checkPermission("pdfs", "create")],
  upload.single("file"),
  createPDF,
);

// @route GET api/admin/pdfs
// @desc Get all PDF documents
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("pdfs", "list")], getPDFs);

// @route GET api/admin/pdfs/:id
// @desc Get PDF document by ID
// @access Private (Admin)
router.get("/:id", [AdminAuth, checkPermission("pdfs", "view")], getPDFById);

// @route PUT api/admin/pdfs/:id
// @desc Update PDF document
// @access Private (Admin)
router.put(
  "/:id",
  [AdminAuth, checkPermission("pdfs", "edit"), upload.single("file")],
  updatePDF,
);

// @route DELETE api/admin/pdfs/:id
// @desc Delete PDF document
// @access Private (Admin)
router.delete(
  "/:id",
  [AdminAuth, checkPermission("pdfs", "delete"), verifyTransactionPassword],
  deletePDF,
);

module.exports = router;
