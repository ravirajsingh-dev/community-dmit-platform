const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
} = require("./Controllers/VideoController");

// @route POST api/admin/video
// @desc Create a new video
// @access Private (Admin)
router.post("/", [AdminAuth, checkPermission("video", "create")], createVideo);

// @route GET api/admin/video
// @desc Get all videos
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("video", "list")], getVideos);

// @route GET api/admin/video/:id
// @desc Get video by ID
// @access Private (Admin)
router.get("/:id", [AdminAuth, checkPermission("video", "list")], getVideoById);

// @route PUT api/admin/video/:id
// @desc Update video
// @access Private (Admin)
router.put("/:id", [AdminAuth, checkPermission("video", "edit"), verifyTransactionPassword], updateVideo);

// @route DELETE api/admin/video/:id
// @desc Delete video
// @access Private (Admin)
router.delete("/:id", [AdminAuth, checkPermission("video", "delete"), verifyTransactionPassword], deleteVideo);

module.exports = router;
