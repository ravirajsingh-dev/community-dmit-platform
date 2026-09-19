const response = require("../../../config/response");
const Video = require("../../../models/Video");

/**
 * @route POST /api/admin/video
 * @desc Create a new video
 */
const createVideo = async (req, res) => {
  try {
    const { title, embedUrl, displayOrder, isActive } = req.body;

    if (!title || !embedUrl) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title and embed URL are required" }],
        "Title and embed URL are required",
        400
      );
    }

    const video = new Video({
      title: title.trim(),
      embedUrl: embedUrl.trim(),
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      createdBy: req.user.id,
    });

    await video.save();

    return response.successResponse(
      res,
      video,
      "Video created successfully"
    );
  } catch (error) {
    console.error("Error creating video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create video",
      500
    );
  }
};

/**
 * @route GET /api/admin/video
 * @desc Get all videos
 */
const getVideos = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "displayOrder",
      ascending = "asc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    const [data, totalRecord] = await Promise.all([
      Video.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Video.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page),
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "Videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch videos",
      500
    );
  }
};

/**
 * @route GET /api/admin/video/:id
 * @desc Get video by ID
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    return response.successResponse(
      res,
      video,
      "Video fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch video",
      500
    );
  }
};

/**
 * @route PUT /api/admin/video/:id
 * @desc Update video
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, embedUrl, displayOrder, isActive } = req.body;

    const video = await Video.findById(id);

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    if (title !== undefined) video.title = title.trim();
    if (embedUrl !== undefined) video.embedUrl = embedUrl.trim();
    if (displayOrder !== undefined) video.displayOrder = parseInt(displayOrder);
    if (isActive !== undefined) {
      video.isActive = isActive === "true" || isActive === true;
    }

    await video.save();

    return response.successResponse(
      res,
      video,
      "Video updated successfully"
    );
  } catch (error) {
    console.error("Error updating video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update video",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/video/:id
 * @desc Delete video
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    await Video.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Video deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete video",
      500
    );
  }
};

/**
 * @route GET /api/common/videos
 * @desc Get active videos (public)
 */
const getPublicVideos = async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title embedUrl displayOrder")
      .lean();

    return response.successResponse(
      res,
      videos,
      "Active videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch videos",
      500
    );
  }
};

module.exports = {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getPublicVideos,
};
