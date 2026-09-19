const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createTrainingVideo,
  getTrainingVideos,
  getTrainingVideoById,
  updateTrainingVideo,
  deleteTrainingVideo,
} = require("./Controllers/TrainingVideoController");

// @route POST api/admin/training-videos
// @desc Create a new training video
// @access Private (Admin)
router.post(
  "/",
  [AdminAuth, checkPermission("training-videos", "create")],
  createTrainingVideo
);

// @route GET api/admin/training-videos
// @desc Get all training videos
// @access Private (Admin)
router.get(
  "/",
  [AdminAuth, checkPermission("training-videos", "list")],
  getTrainingVideos
);

// @route GET api/admin/training-videos/:id
// @desc Get training video by ID
// @access Private (Admin)
router.get(
  "/:id",
  [AdminAuth, checkPermission("training-videos", "list")],
  getTrainingVideoById
);

// @route PUT api/admin/training-videos/:id
// @desc Update training video
// @access Private (Admin)
router.put(
  "/:id",
  [AdminAuth, checkPermission("training-videos", "edit"), verifyTransactionPassword],
  updateTrainingVideo
);

// @route DELETE api/admin/training-videos/:id
// @desc Delete training video
// @access Private (Admin)
router.delete(
  "/:id",
  [AdminAuth, checkPermission("training-videos", "delete"), verifyTransactionPassword],
  deleteTrainingVideo
);

module.exports = router;

