const response = require("../../../config/response");
const News = require("../../../models/News");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");

/**
 * @route POST /api/admin/news
 * @desc Create a new news item
 */
const createNews = async (req, res) => {
  try {
    const { title, description, displayOrder, isActive } = req.body;

    if (!title || !description) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title and description are required" }],
        "Title and description are required",
        400
      );
    }

    let imageUrl = null;
    let imageKey = null;

    // Upload image if provided
    if (req.file) {
      const uploadResult = await uploadToR2(req.file, "news");
      imageUrl = uploadResult.url;
      imageKey = uploadResult.key;
    }

    const news = new News({
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      imageKey,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      createdBy: req.user.id,
    });

    await news.save();

    return response.successResponse(
      res,
      news,
      "News created successfully"
    );
  } catch (error) {
    console.error("Error creating news:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create news",
      500
    );
  }
};

/**
 * @route GET /api/admin/news
 * @desc Get all news items
 */
const getNews = async (req, res) => {
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
      News.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      News.countDocuments(query),
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
      "News fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch news",
      500
    );
  }
};

/**
 * @route GET /api/admin/news/:id
 * @desc Get news by ID
 */
const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!news) {
      return response.errorResponse(
        res,
        {},
        "News not found",
        404
      );
    }

    return response.successResponse(
      res,
      news,
      "News fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch news",
      500
    );
  }
};

/**
 * @route PUT /api/admin/news/:id
 * @desc Update news
 */
const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, displayOrder, isActive } = req.body;

    const news = await News.findById(id);

    if (!news) {
      return response.errorResponse(
        res,
        {},
        "News not found",
        404
      );
    }

    // Update text fields
    if (title !== undefined) news.title = title.trim();
    if (description !== undefined) news.description = description.trim();
    if (displayOrder !== undefined) news.displayOrder = parseInt(displayOrder);
    if (isActive !== undefined) {
      news.isActive = isActive === "true" || isActive === true;
    }

    // Handle image update if new image is provided
    if (req.file) {
      // Delete old image from R2 if exists
      if (news.imageKey) {
        try {
          await deleteFromR2(news.imageKey);
        } catch (deleteError) {
          console.error("Error deleting old image from R2:", deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new image
      const uploadResult = await uploadToR2(req.file, "news");
      news.imageUrl = uploadResult.url;
      news.imageKey = uploadResult.key;
    }

    await news.save();

    return response.successResponse(
      res,
      news,
      "News updated successfully"
    );
  } catch (error) {
    console.error("Error updating news:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update news",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/news/:id
 * @desc Delete news
 */
const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
      return response.errorResponse(
        res,
        {},
        "News not found",
        404
      );
    }

    // Delete image from R2 if exists
    if (news.imageKey) {
      try {
        await deleteFromR2(news.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    await News.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "News deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting news:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete news",
      500
    );
  }
};

/**
 * @route GET /api/common/news
 * @desc Get active news items (public)
 */
const getPublicNews = async (req, res) => {
  try {
    const news = await News.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title description imageUrl displayOrder createdAt")
      .lean();

    return response.successResponse(
      res,
      news,
      "Active news fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public news:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch news",
      500
    );
  }
};

module.exports = {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  getPublicNews,
};
