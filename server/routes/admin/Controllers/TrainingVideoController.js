const response = require("../../../config/response");
const TrainingVideo = require("../../../models/TrainingVideo");
const WalletSettings = require("../../../models/WalletSettings");

/**
 * Build a map of designationCode -> name from WalletSettings.designations
 */
const getDesignationMap = async () => {
  const settings = await WalletSettings.getOrCreateSettings();
  const designations = settings.designations || [];
  const map = new Map();
  designations.forEach((d) => {
    if (d.designationCode != null) {
      map.set(d.designationCode, d.name || `DESIGNATION_${d.designationCode}`);
    }
  });
  return map;
};

/**
 * TrainingVideoSchema stores a single designationCode (Number).
 * Admin may send either:
 * - designations: 1
 * - designations: "1"
 * - designations: [1] (array with exactly one element)
 */
const parseSingleDesignationCode = (designations) => {
  if (Array.isArray(designations)) {
    const nums = designations
      .map((d) => parseInt(d, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (nums.length === 0) return null;
    if (nums.length !== 1) {
      throw new Error("Exactly one designation is required for a training video");
    }
    return nums[0];
  }

  if (designations == null) return null;
  const single = parseInt(designations, 10);
  if (!Number.isFinite(single) || single <= 0) return null;
  return single;
};

/**
 * Validate embedUrl to reduce iframe abuse (phishing/tracking/unsafe embeds).
 *
 * NOTE: This is an allowlist-based validation. If you need more providers,
 * add them explicitly here.
 */
const validateEmbedUrl = (rawEmbedUrl) => {
  if (typeof rawEmbedUrl !== "string") {
    return { ok: false, message: "Embed URL must be a string" };
  }

  const trimmed = rawEmbedUrl.trim();
  if (!trimmed) {
    return { ok: false, message: "Embed URL is required" };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, message: "Invalid embed URL" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, message: "Embed URL protocol is not allowed" };
  }

  const host = url.hostname.toLowerCase();
  const isYouTube =
    host === "www.youtube.com" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "www.youtube-nocookie.com" ||
    host === "youtube-nocookie.com";
  const isVimeo = host === "player.vimeo.com";

  if (!isYouTube && !isVimeo) {
    return { ok: false, message: "Embed URL host is not allowed" };
  }

  // YouTube embed format: /embed/<videoId>
  if (isYouTube) {
    const ytPattern = /^\/embed\/[A-Za-z0-9_-]+\/?$/;
    if (!ytPattern.test(url.pathname)) {
      return { ok: false, message: "Invalid YouTube embed URL format" };
    }
  }

  // Vimeo embed format: /video/<numericId>
  if (isVimeo) {
    const vPattern = /^\/video\/\d+\/?$/;
    if (!vPattern.test(url.pathname)) {
      return { ok: false, message: "Invalid Vimeo embed URL format" };
    }
  }

  // Keep querystring intact (it is still within the allowlisted provider/host).
  return { ok: true, normalizedUrl: `${url.origin}${url.pathname}${url.search}` };
};

const getNextDisplayOrder = async (designationCode, excludeId = null) => {
  const query = { designations: designationCode };
  if (excludeId) query._id = { $ne: excludeId };

  const doc = await TrainingVideo.findOne(query)
    .sort({ displayOrder: -1, createdAt: -1 })
    .select("displayOrder")
    .lean();

  if (!doc) return 0;
  const current = typeof doc.displayOrder === "number" ? doc.displayOrder : 0;
  return current + 1;
};

const displayOrderExists = async ({
  designationCode,
  desiredDisplayOrder,
  excludeId = null,
}) => {
  const query = {
    designations: designationCode,
    displayOrder: desiredDisplayOrder,
  };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await TrainingVideo.findOne(query).select("_id").lean();
  return Boolean(existing);
};

/**
 * @route POST /api/admin/training-videos
 * @desc Create a new training video
 */
const createTrainingVideo = async (req, res) => {
  try {
    const { title, embedUrl, displayOrder, isActive, designations } = req.body;

    if (!title || !embedUrl) {
      return response.errorResponse(
        res,
        [
          { path: "title", msg: "Title is required" },
          { path: "embedUrl", msg: "Embed URL is required" },
        ],
        "Title and embed URL are required",
        400
      );
    }

    const embedCheck = validateEmbedUrl(embedUrl);
    if (!embedCheck.ok) {
      return response.errorResponse(
        res,
        [{ path: "embedUrl", msg: embedCheck.message }],
        embedCheck.message,
        400
      );
    }

    let designationCode;
    try {
      designationCode = parseSingleDesignationCode(designations);
    } catch (err) {
      return response.errorResponse(
        res,
        [{ path: "designations", msg: err.message || "Invalid designations" }],
        err.message || "Invalid designations",
        400
      );
    }

    if (!designationCode) {
      return response.errorResponse(
        res,
        [{ path: "designations", msg: "At least one designation is required" }],
        "At least one designation is required",
        400
      );
    }

    const parsedDisplayOrder =
      displayOrder === undefined || displayOrder === null || displayOrder === ""
        ? null
        : parseInt(displayOrder, 10);

    let finalDisplayOrder;
    if (
      parsedDisplayOrder === null ||
      !Number.isFinite(parsedDisplayOrder) ||
      parsedDisplayOrder < 0
    ) {
      finalDisplayOrder = await getNextDisplayOrder(designationCode);
    } else {
      // If admin accidentally keeps default 0 or uses duplicate order,
      // auto-fix to next available sequence (0,1,2,...).
      const exists = await displayOrderExists({
        designationCode,
        desiredDisplayOrder: parsedDisplayOrder,
      });
      finalDisplayOrder = exists
        ? await getNextDisplayOrder(designationCode)
        : parsedDisplayOrder;
    }

    const trainingVideo = new TrainingVideo({
      title: title.trim(),
      embedUrl: embedCheck.normalizedUrl,
      designations: designationCode,
      displayOrder: finalDisplayOrder,
      isActive:
        isActive !== undefined ? isActive === "true" || isActive === true : true,
      createdBy: req.user.id,
    });

    await trainingVideo.save();

    return response.successResponse(
      res,
      trainingVideo,
      "Training video created successfully"
    );
  } catch (error) {
    console.error("Error creating training video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create training video",
      500
    );
  }
};

/**
 * @route GET /api/admin/training-videos
 * @desc Get all training videos
 */
const getTrainingVideos = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "displayOrder",
      ascending = "asc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    const [data, totalRecord, designationMap] = await Promise.all([
      TrainingVideo.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      TrainingVideo.countDocuments(query),
      getDesignationMap(),
    ]);

    const dataWithDesignationNames = data.map((item) => {
      const codes = Array.isArray(item.designations)
        ? item.designations
        : item.designations != null
          ? [item.designations]
          : [];
      const names = codes
        .map((code) => designationMap.get(code) || `Code ${code}`)
        .filter(Boolean);
      return {
        ...item,
        designationNames: names,
      };
    });

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page, 10),
              per_page: pageSize,
            },
          ],
          data: dataWithDesignationNames,
        },
      ],
      "Training videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching training videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch training videos",
      500
    );
  }
};

/**
 * @route GET /api/admin/training-videos/:id
 * @desc Get training video by ID
 */
const getTrainingVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const trainingVideo = await TrainingVideo.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!trainingVideo) {
      return response.errorResponse(
        res,
        {},
        "Training video not found",
        404
      );
    }

    const designationMap = await getDesignationMap();
    const codes = Array.isArray(trainingVideo.designations)
      ? trainingVideo.designations
      : trainingVideo.designations != null
        ? [trainingVideo.designations]
        : [];
    const names = codes
      .map((code) => designationMap.get(code) || `Code ${code}`)
      .filter(Boolean);

    return response.successResponse(
      res,
      {
        ...trainingVideo,
        designationNames: names,
      },
      "Training video fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching training video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch training video",
      500
    );
  }
};

/**
 * @route PUT /api/admin/training-videos/:id
 * @desc Update training video
 */
const updateTrainingVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, embedUrl, displayOrder, isActive, designations } = req.body;

    const trainingVideo = await TrainingVideo.findById(id);

    if (!trainingVideo) {
      return response.errorResponse(
        res,
        {},
        "Training video not found",
        404
      );
    }

    if (title !== undefined) trainingVideo.title = title.trim();
    if (embedUrl !== undefined) {
      const embedCheck = validateEmbedUrl(embedUrl);
      if (!embedCheck.ok) {
        return response.errorResponse(
          res,
          [{ path: "embedUrl", msg: embedCheck.message }],
          embedCheck.message,
          400
        );
      }
      trainingVideo.embedUrl = embedCheck.normalizedUrl;
    }
    if (isActive !== undefined) {
      trainingVideo.isActive =
        isActive === "true" || isActive === true;
    }
    let targetDesignationCode = trainingVideo.designations;
    if (designations !== undefined) {
      try {
        const parsed = parseSingleDesignationCode(designations);
        if (!parsed) {
          return response.errorResponse(
            res,
            [{ path: "designations", msg: "Valid designation is required" }],
            "Valid designation is required",
            400
          );
        }
        targetDesignationCode = parsed;
        trainingVideo.designations = parsed;
      } catch (err) {
        return response.errorResponse(
          res,
          [{ path: "designations", msg: err.message || "Invalid designations" }],
          err.message || "Invalid designations",
          400
        );
      }
    }

    if (displayOrder !== undefined) {
      const parsed = parseInt(displayOrder, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        trainingVideo.displayOrder = await getNextDisplayOrder(
          targetDesignationCode,
          id
        );
      } else {
        const exists = await displayOrderExists({
          designationCode: targetDesignationCode,
          desiredDisplayOrder: parsed,
          excludeId: id,
        });
        trainingVideo.displayOrder = exists
          ? await getNextDisplayOrder(targetDesignationCode, id)
          : parsed;
      }
    }

    await trainingVideo.save();

    return response.successResponse(
      res,
      trainingVideo,
      "Training video updated successfully"
    );
  } catch (error) {
    console.error("Error updating training video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update training video",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/training-videos/:id
 * @desc Delete training video
 */
const deleteTrainingVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const trainingVideo = await TrainingVideo.findById(id);

    if (!trainingVideo) {
      return response.errorResponse(
        res,
        {},
        "Training video not found",
        404
      );
    }

    await TrainingVideo.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Training video deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting training video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete training video",
      500
    );
  }
};

/**
 * @route GET /api/common/training-videos
 * @desc Get active training videos (public)
 */
const getPublicTrainingVideos = async (req, res) => {
  try {
    const designationMap = await getDesignationMap();
    const videos = await TrainingVideo.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title embedUrl displayOrder designations")
      .lean();

    const dataWithDesignationNames = videos.map((item) => {
      const codes = Array.isArray(item.designations)
        ? item.designations
        : item.designations != null
          ? [item.designations]
          : [];
      const names = codes
        .map((code) => designationMap.get(code) || `Code ${code}`)
        .filter(Boolean);
      return {
        ...item,
        designationNames: names,
      };
    });

    return response.successResponse(
      res,
      dataWithDesignationNames,
      "Active training videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public training videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch training videos",
      500
    );
  }
};

module.exports = {
  createTrainingVideo,
  getTrainingVideos,
  getTrainingVideoById,
  updateTrainingVideo,
  deleteTrainingVideo,
  getPublicTrainingVideos,
};

