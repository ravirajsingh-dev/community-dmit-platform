/**
 * Admin SBI PRO Session Routes - Phase 3
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const {
  list,
  markAnalysisDoneHandler,
  proxyImage,
  deleteImage,
  deleteAllImages,
  uploadReportHandler,
  replaceReportHandler,
  getFingerAnalysisHandler,
  saveFingerAnalysisHandler,
} = require("./Controllers/SbiProSessionController");

router.use(AdminAuth);

const uploadStorage = multer.memoryStorage();
const uploadReportMw = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files allowed"));
  },
});

router.get("/", list);
router.get("/image", proxyImage);
router.delete("/image", deleteImage);
router.delete("/images", deleteAllImages);
router.get("/analysis/:appointmentId", getFingerAnalysisHandler);
router.put(
  "/analysis",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  saveFingerAnalysisHandler
);

router.post(
  "/complete",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  markAnalysisDoneHandler
);

router.post(
  "/mark-analysis-done",
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  markAnalysisDoneHandler
);

router.post(
  "/upload-report",
  uploadReportMw.single("file"),
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  uploadReportHandler
);

router.post(
  "/replace-report",
  uploadReportMw.single("file"),
  [check("appointmentId", "appointmentId is required").notEmpty().trim()],
  replaceReportHandler
);

module.exports = router;
