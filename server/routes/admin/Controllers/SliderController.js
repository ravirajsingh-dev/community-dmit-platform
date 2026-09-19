const response = require("../../../config/response");
const SliderBanner = require("../../../models/SliderBanner");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");

/**
 * @route POST /api/admin/slider
 * @desc Create a new slider banner
 */
const createSliderBanner = async (req, res) => {
  try {
    const { title, link, order, isActive } = req.body;

    if (!req.file) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required" }],
        "Image is required",
        400
      );
    }

    // Upload image to R2
    const uploadResult = await uploadToR2(req.file, "slider");

    // Create slider banner
    const sliderBanner = new SliderBanner({
      title: title || "",
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
      link: link || "",
      order: order ? parseInt(order) : 0,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
    });

    await sliderBanner.save();

    return response.successResponse(
      res,
      sliderBanner,
      "Slider banner created successfully"
    );
  } catch (error) {
    console.error("Error creating slider banner:", error);
    
    // If R2 upload succeeded but DB save failed, try to delete from R2
    if (req.file && error.message && !error.message.includes("upload")) {
      try {
        // This is a best-effort cleanup, don't fail if it doesn't work
      } catch (cleanupError) {
        console.error("Error cleaning up R2 file:", cleanupError);
      }
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create slider banner",
      500
    );
  }
};

/**
 * @route GET /api/admin/slider
 * @desc Get all slider banners
 */
const getSliderBanners = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "order",
      ascending = "asc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    const [data, totalRecord] = await Promise.all([
      SliderBanner.find(query)
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      SliderBanner.countDocuments(query),
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
      "Slider banners fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching slider banners:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch slider banners",
      500
    );
  }
};

/**
 * @route PUT /api/admin/slider/:id
 * @desc Update slider banner
 */
const updateSliderBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link, order, isActive } = req.body;

    const sliderBanner = await SliderBanner.findById(id);

    if (!sliderBanner) {
      return response.errorResponse(
        res,
        {},
        "Slider banner not found",
        404
      );
    }

    // If new image is provided, upload it and delete old one
    if (req.file) {
      try {
        // Upload new image
        const uploadResult = await uploadToR2(req.file, "slider");

        // Delete old image from R2
        if (sliderBanner.imageKey) {
          try {
            await deleteFromR2(sliderBanner.imageKey);
          } catch (deleteError) {
            console.error("Error deleting old image from R2:", deleteError);
            // Continue even if deletion fails
          }
        }

        sliderBanner.imageUrl = uploadResult.url;
        sliderBanner.imageKey = uploadResult.key;
      } catch (uploadError) {
        return response.errorResponse(
          res,
          {},
          `Failed to upload image: ${uploadError.message}`,
          500
        );
      }
    }

    // Update other fields
    if (title !== undefined) sliderBanner.title = title;
    if (link !== undefined) sliderBanner.link = link;
    if (order !== undefined) sliderBanner.order = parseInt(order);
    if (isActive !== undefined) {
      sliderBanner.isActive = isActive === "true" || isActive === true;
    }

    await sliderBanner.save();

    return response.successResponse(
      res,
      sliderBanner,
      "Slider banner updated successfully"
    );
  } catch (error) {
    console.error("Error updating slider banner:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update slider banner",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/slider/:id
 * @desc Delete slider banner
 */
const deleteSliderBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const sliderBanner = await SliderBanner.findById(id);

    if (!sliderBanner) {
      return response.errorResponse(
        res,
        {},
        "Slider banner not found",
        404
      );
    }

    // Delete image from R2
    if (sliderBanner.imageKey) {
      try {
        await deleteFromR2(sliderBanner.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from database
    await SliderBanner.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Slider banner deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting slider banner:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete slider banner",
      500
    );
  }
};

/**
 * @route GET /api/common/slider-banners
 * @desc Get active slider banners (public)
 */
const getPublicSliderBanners = async (req, res) => {
  try {
    const sliderBanners = await SliderBanner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select("title imageUrl link order")
      .lean();

    return response.successResponse(
      res,
      sliderBanners,
      "Active slider banners fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public slider banners:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch slider banners",
      500
    );
  }
};

module.exports = {
  createSliderBanner,
  getSliderBanners,
  updateSliderBanner,
  deleteSliderBanner,
  getPublicSliderBanners,
};

