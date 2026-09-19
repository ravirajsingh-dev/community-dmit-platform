const response = require("../../../config/response");
const ImageGallery = require("../../../models/ImageGallery");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");

/**
 * @route POST /api/admin/gallery
 * @desc Upload a new gallery image
 */
const createGalleryImage = async (req, res) => {
  try {
    const { title, category, isActive } = req.body;

    if (!req.file) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required" }],
        "Image is required",
        400
      );
    }

    // Upload image to R2
    const uploadResult = await uploadToR2(req.file, "gallery");

    // Create gallery image
    const galleryImage = new ImageGallery({
      title: title || "",
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
      category: category || "",
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
    });

    await galleryImage.save();

    return response.successResponse(
      res,
      galleryImage,
      "Gallery image uploaded successfully"
    );
  } catch (error) {
    console.error("Error creating gallery image:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to upload gallery image",
      500
    );
  }
};

/**
 * @route GET /api/admin/gallery
 * @desc Get all gallery images (with optional category filter)
 */
const getGalleryImages = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      category,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};
    if (category) {
      query.category = category;
    }

    const [data, totalRecord] = await Promise.all([
      ImageGallery.find(query)
        .sort({ [orderBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      ImageGallery.countDocuments(query),
    ]);

    // Get unique categories for filter dropdown
    const categories = await ImageGallery.distinct("category").then((cats) =>
      cats.filter((cat) => cat && cat.trim() !== "")
    );

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
          categories,
        },
      ],
      "Gallery images fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery images",
      500
    );
  }
};

/**
 * @route PUT /api/admin/gallery/:id
 * @desc Update gallery image
 */
const updateGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, isActive } = req.body;

    const galleryImage = await ImageGallery.findById(id);

    if (!galleryImage) {
      return response.errorResponse(res, {}, "Gallery image not found", 404);
    }

    // Update fields
    if (title !== undefined) galleryImage.title = title;
    if (category !== undefined) galleryImage.category = category;
    if (isActive !== undefined) {
      galleryImage.isActive = isActive === "true" || isActive === true;
    }

    await galleryImage.save();

    return response.successResponse(
      res,
      galleryImage,
      "Gallery image updated successfully"
    );
  } catch (error) {
    console.error("Error updating gallery image:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update gallery image",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/gallery/:id
 * @desc Delete gallery image
 */
const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const galleryImage = await ImageGallery.findById(id);

    if (!galleryImage) {
      return response.errorResponse(res, {}, "Gallery image not found", 404);
    }

    // Delete image from R2
    if (galleryImage.imageKey) {
      try {
        await deleteFromR2(galleryImage.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from database
    await ImageGallery.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Gallery image deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete gallery image",
      500
    );
  }
};

/**
 * @route GET /api/common/gallery
 * @desc Get active gallery images (public)
 */
const getPublicGalleryImages = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const galleryImages = await ImageGallery.find(query)
      .sort({ createdAt: -1 })
      .select("title imageUrl category")
      .lean();

    return response.successResponse(
      res,
      galleryImages,
      "Active gallery images fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public gallery images:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery images",
      500
    );
  }
};

module.exports = {
  createGalleryImage,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  getPublicGalleryImages,
};
