const response = require("../../../config/response");
const Gotra = require("../../../models/Gotra");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const mongoose = require("mongoose");

const createGotra = async (req, res) => {
  try {
    const {
      communityId,
      vanshId,
      kulId,
      khampId,
      name,
      description,
      isActive,
    } = req.body;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Valid community is required" }],
        "Validation Error",
        400,
      );
    }

    if (!vanshId || !mongoose.Types.ObjectId.isValid(vanshId)) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Valid vansh is required" }],
        "Validation Error",
        400,
      );
    }

    if (!kulId || !mongoose.Types.ObjectId.isValid(kulId)) {
      return response.errorResponse(
        res,
        [{ path: "kulId", msg: "Valid kul is required" }],
        "Validation Error",
        400,
      );
    }

    if (!khampId || !mongoose.Types.ObjectId.isValid(khampId)) {
      return response.errorResponse(
        res,
        [{ path: "khampId", msg: "Valid khamp is required" }],
        "Validation Error",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400,
      );
    }

    const community = await Community.findOne({
      _id: communityId,
      isDeleted: false,
    });

    if (!community) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Community not found" }],
        "Validation Error",
        400,
      );
    }

    const vansh = await Vansh.findOne({
      _id: vanshId,
      communityId,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(
        res,
        [
          {
            path: "vanshId",
            msg: "Vansh not found or does not belong to this community",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const kul = await Kul.findOne({
      _id: kulId,
      vanshId,
      communityId,
      isDeleted: false,
    });

    if (!kul) {
      return response.errorResponse(
        res,
        [
          {
            path: "kulId",
            msg: "Kul not found or does not belong to this vansh",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const khamp = await Khamp.findOne({
      _id: khampId,
      kulId,
      vanshId,
      communityId,
      isDeleted: false,
    });

    if (!khamp) {
      return response.errorResponse(
        res,
        [
          {
            path: "khampId",
            msg: "Khamp not found or does not belong to this kul",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingGotra = await Gotra.findOne({
      khampId,
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingGotra) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Gotra with this name already exists in this khamp",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const adminId = req.admin?.id;

    const gotra = new Gotra({
      communityId,
      vanshId,
      kulId,
      khampId,
      name: nameUpper,
      description: description ? description.trim() : "",
      status: "active",
      createdBy: adminId,
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
    });

    await gotra.save();

    return response.successResponse(res, gotra, "Gotra created successfully");
  } catch (error) {
    console.error("Error creating gotra:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Gotra with this name already exists in this khamp",
          },
        ],
        "Validation Error",
        400,
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create gotra",
      500,
    );
  }
};

const getGotraList = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      communityId,
      vanshId,
      kulId,
      khampId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      query.communityId = communityId;
    }

    if (vanshId && mongoose.Types.ObjectId.isValid(vanshId)) {
      query.vanshId = vanshId;
    }

    if (kulId && mongoose.Types.ObjectId.isValid(kulId)) {
      query.kulId = kulId;
    }

    if (khampId && mongoose.Types.ObjectId.isValid(khampId)) {
      query.khampId = khampId;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      Gotra.find(query)
        .populate("communityId", "name")
        .populate("vanshId", "name")
        .populate("kulId", "name")
        .populate("khampId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Gotra.countDocuments(query),
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
      "Gotra list fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching gotra list:", error);
    return response.errorResponse(res, {}, "Failed to fetch gotra list", 500);
  }
};

const getGotraById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("communityId", "name")
      .populate("vanshId", "name")
      .populate("kulId", "name")
      .populate("khampId", "name")
      .lean();

    if (!gotra) {
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    return response.successResponse(res, gotra, "Gotra fetched successfully");
  } catch (error) {
    console.error("Error fetching gotra:", error);
    return response.errorResponse(res, {}, "Failed to fetch gotra", 500);
  }
};

const updateGotra = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      communityId,
      vanshId,
      kulId,
      khampId,
      name,
      description,
      isActive,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!gotra) {
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    if (khampId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(khampId)) {
        return response.errorResponse(
          res,
          [{ path: "khampId", msg: "Valid khamp is required" }],
          "Validation Error",
          400,
        );
      }

      const finalKulId = kulId || gotra.kulId;
      const finalVanshId = vanshId || gotra.vanshId;
      const finalCommunityId = communityId || gotra.communityId;
      const khamp = await Khamp.findOne({
        _id: khampId,
        kulId: finalKulId,
        vanshId: finalVanshId,
        communityId: finalCommunityId,
        isDeleted: false,
      });

      if (!khamp) {
        return response.errorResponse(
          res,
          [
            {
              path: "khampId",
              msg: "Khamp not found or does not belong to this kul",
            },
          ],
          "Validation Error",
          400,
        );
      }

      gotra.khampId = khampId;
    }

    if (kulId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(kulId)) {
        return response.errorResponse(
          res,
          [{ path: "kulId", msg: "Valid kul is required" }],
          "Validation Error",
          400,
        );
      }

      const finalVanshId = vanshId || gotra.vanshId;
      const finalCommunityId = communityId || gotra.communityId;
      const kul = await Kul.findOne({
        _id: kulId,
        vanshId: finalVanshId,
        communityId: finalCommunityId,
        isDeleted: false,
      });

      if (!kul) {
        return response.errorResponse(
          res,
          [
            {
              path: "kulId",
              msg: "Kul not found or does not belong to this vansh",
            },
          ],
          "Validation Error",
          400,
        );
      }

      gotra.kulId = kulId;
    }

    if (vanshId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(vanshId)) {
        return response.errorResponse(
          res,
          [{ path: "vanshId", msg: "Valid vansh is required" }],
          "Validation Error",
          400,
        );
      }

      const finalCommunityId = communityId || gotra.communityId;
      const vansh = await Vansh.findOne({
        _id: vanshId,
        communityId: finalCommunityId,
        isDeleted: false,
      });

      if (!vansh) {
        return response.errorResponse(
          res,
          [
            {
              path: "vanshId",
              msg: "Vansh not found or does not belong to this community",
            },
          ],
          "Validation Error",
          400,
        );
      }

      gotra.vanshId = vanshId;
    }

    if (communityId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(communityId)) {
        return response.errorResponse(
          res,
          [{ path: "communityId", msg: "Valid community is required" }],
          "Validation Error",
          400,
        );
      }

      const community = await Community.findOne({
        _id: communityId,
        isDeleted: false,
      });

      if (!community) {
        return response.errorResponse(
          res,
          [{ path: "communityId", msg: "Community not found" }],
          "Validation Error",
          400,
        );
      }

      gotra.communityId = communityId;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Name cannot be empty" }],
          "Validation Error",
          400,
        );
      }

      const finalKhampId = khampId || gotra.khampId;
      const nameUpper = name.trim().toUpperCase();
      const existingGotra = await Gotra.findOne({
        khampId: finalKhampId,
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingGotra) {
        return response.errorResponse(
          res,
          [
            {
              path: "name",
              msg: "Gotra with this name already exists in this khamp",
            },
          ],
          "Validation Error",
          400,
        );
      }

      gotra.name = nameUpper;
    }

    if (description !== undefined) {
      gotra.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      gotra.isActive = isActive === "true" || isActive === true;
    }

    await gotra.save();

    return response.successResponse(res, gotra, "Gotra updated successfully");
  } catch (error) {
    console.error("Error updating gotra:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Gotra with this name already exists in this khamp",
          },
        ],
        "Validation Error",
        400,
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update gotra",
      500,
    );
  }
};

const deleteGotra = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: false,
    }).session(session);

    if (!gotra) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    gotra.isDeleted = true;
    gotra.isActive = false;
    await gotra.save({ session });

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(res, {}, "Gotra deleted successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting gotra:", error);
    return response.errorResponse(res, {}, "Failed to delete gotra", 500);
  }
};

const hardDeleteGotra = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
    }).session(session);

    if (!gotra) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    await Gotra.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Gotra permanently deleted successfully",
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hard deleting gotra:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete gotra",
      500,
    );
  }
};

const toggleGotraStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
    }).session(session);

    if (!gotra) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    gotra.isActive = !gotra.isActive;
    await gotra.save({ session });

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      gotra,
      "Gotra status updated successfully",
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error toggling gotra status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle gotra status",
      500,
    );
  }
};

const restoreGotra = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: true,
    }).session(session);

    if (!gotra) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Gotra not found or not deleted",
        404,
      );
    }

    const khamp = await Khamp.findOne({
      _id: gotra.khampId,
      isDeleted: false,
    }).session(session);

    if (!khamp) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Cannot restore gotra: parent khamp is deleted",
        400,
      );
    }

    gotra.isDeleted = false;
    gotra.isActive = true;
    await gotra.save({ session });

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(res, gotra, "Gotra restored successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error restoring gotra:", error);
    return response.errorResponse(res, {}, "Failed to restore gotra", 500);
  }
};

const approveGotra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!gotra) {
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    if (gotra.status === "active") {
      return response.errorResponse(res, {}, "Gotra is already approved", 400);
    }

    gotra.status = "active";
    gotra.isActive = true;
    await gotra.save();

    return response.successResponse(res, gotra, "Gotra approved successfully");
  } catch (error) {
    console.error("Error approving gotra:", error);
    return response.errorResponse(res, {}, "Failed to approve gotra", 500);
  }
};

const rejectGotra = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid gotra ID", 400);
    }

    const gotra = await Gotra.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!gotra) {
      return response.errorResponse(res, {}, "Gotra not found", 404);
    }

    if (gotra.status === "rejected") {
      return response.errorResponse(res, {}, "Gotra is already rejected", 400);
    }

    gotra.status = "rejected";
    gotra.isActive = false;
    await gotra.save();

    return response.successResponse(res, gotra, "Gotra rejected successfully");
  } catch (error) {
    console.error("Error rejecting gotra:", error);
    return response.errorResponse(res, {}, "Failed to reject gotra", 500);
  }
};

module.exports = {
  createGotra,
  getGotraList,
  getGotraById,
  updateGotra,
  deleteGotra,
  hardDeleteGotra,
  toggleGotraStatus,
  restoreGotra,
  approveGotra,
  rejectGotra,
};
