const response = require("../../../config/response");
const Khamp = require("../../../models/Khamp");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const mongoose = require("mongoose");
const {
  cascadeSoftDeleteKhamp,
  cascadeHardDeleteKhamp,
  cascadeInactiveKhamp,
  cascadeActiveKhamp,
  cascadeRestoreKhamp,
} = require("../../../services/hierarchyCascadeService");

const createKhamp = async (req, res) => {
  try {
    const { communityId, vanshId, kulId, name, description, isActive } =
      req.body;

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

    const nameUpper = name.trim().toUpperCase();
    const existingKhamp = await Khamp.findOne({
      kulId,
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingKhamp) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Khamp with this name already exists in this kul",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const adminId = req.admin?.id;

    const khamp = new Khamp({
      communityId,
      vanshId,
      kulId,
      name: nameUpper,
      description: description ? description.trim() : "",
      status: "active",
      createdBy: adminId,
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
    });

    await khamp.save();

    return response.successResponse(res, khamp, "Khamp created successfully");
  } catch (error) {
    console.error("Error creating khamp:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Khamp with this name already exists in this kul",
          },
        ],
        "Validation Error",
        400,
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create khamp",
      500,
    );
  }
};

const getKhampList = async (req, res) => {
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

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      Khamp.find(query)
        .populate("communityId", "name")
        .populate("vanshId", "name")
        .populate("kulId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Khamp.countDocuments(query),
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
      "Khamp list fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching khamp list:", error);
    return response.errorResponse(res, {}, "Failed to fetch khamp list", 500);
  }
};

const getKhampById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("communityId", "name")
      .populate("vanshId", "name")
      .populate("kulId", "name")
      .lean();

    if (!khamp) {
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    return response.successResponse(res, khamp, "Khamp fetched successfully");
  } catch (error) {
    console.error("Error fetching khamp:", error);
    return response.errorResponse(res, {}, "Failed to fetch khamp", 500);
  }
};

const updateKhamp = async (req, res) => {
  try {
    const { id } = req.params;
    const { communityId, vanshId, kulId, name, description, isActive } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!khamp) {
      return response.errorResponse(res, {}, "Khamp not found", 404);
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

      const finalVanshId = vanshId || khamp.vanshId;
      const finalCommunityId = communityId || khamp.communityId;
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

      khamp.kulId = kulId;
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

      const finalCommunityId = communityId || khamp.communityId;
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

      khamp.vanshId = vanshId;
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

      khamp.communityId = communityId;
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

      const finalKulId = kulId || khamp.kulId;
      const nameUpper = name.trim().toUpperCase();
      const existingKhamp = await Khamp.findOne({
        kulId: finalKulId,
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingKhamp) {
        return response.errorResponse(
          res,
          [
            {
              path: "name",
              msg: "Khamp with this name already exists in this kul",
            },
          ],
          "Validation Error",
          400,
        );
      }

      khamp.name = nameUpper;
    }

    if (description !== undefined) {
      khamp.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      khamp.isActive = isActive === "true" || isActive === true;
    }

    await khamp.save();

    return response.successResponse(res, khamp, "Khamp updated successfully");
  } catch (error) {
    console.error("Error updating khamp:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Khamp with this name already exists in this kul",
          },
        ],
        "Validation Error",
        400,
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update khamp",
      500,
    );
  }
};

const deleteKhamp = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: false,
    }).session(session);

    if (!khamp) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    khamp.isDeleted = true;
    khamp.isActive = false;
    await khamp.save({ session });

    await cascadeSoftDeleteKhamp(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(res, {}, "Khamp deleted successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting khamp:", error);
    return response.errorResponse(res, {}, "Failed to delete khamp", 500);
  }
};

const hardDeleteKhamp = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
    }).session(session);

    if (!khamp) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    await cascadeHardDeleteKhamp(id, session);
    await Khamp.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Khamp permanently deleted successfully",
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hard deleting khamp:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete khamp",
      500,
    );
  }
};

const toggleKhampStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
    }).session(session);

    if (!khamp) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    const newStatus = !khamp.isActive;
    khamp.isActive = newStatus;
    await khamp.save({ session });

    if (!newStatus) {
      await cascadeInactiveKhamp(id, session);
    } else {
      await cascadeActiveKhamp(id, session);
    }

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      khamp,
      "Khamp status updated successfully",
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error toggling khamp status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle khamp status",
      500,
    );
  }
};

const restoreKhamp = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: true,
    }).session(session);

    if (!khamp) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Khamp not found or not deleted",
        404,
      );
    }

    const kul = await Kul.findOne({
      _id: khamp.kulId,
      isDeleted: false,
    }).session(session);

    if (!kul) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Cannot restore khamp: parent kul is deleted",
        400,
      );
    }

    khamp.isDeleted = false;
    khamp.isActive = true;
    await khamp.save({ session });

    await cascadeRestoreKhamp(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(res, khamp, "Khamp restored successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error restoring khamp:", error);
    return response.errorResponse(res, {}, "Failed to restore khamp", 500);
  }
};

const approveKhamp = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!khamp) {
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    if (khamp.status === "active") {
      return response.errorResponse(res, {}, "Khamp is already approved", 400);
    }

    khamp.status = "active";
    khamp.isActive = true;
    await khamp.save();

    return response.successResponse(res, khamp, "Khamp approved successfully");
  } catch (error) {
    console.error("Error approving khamp:", error);
    return response.errorResponse(res, {}, "Failed to approve khamp", 500);
  }
};

const rejectKhamp = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid khamp ID", 400);
    }

    const khamp = await Khamp.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!khamp) {
      return response.errorResponse(res, {}, "Khamp not found", 404);
    }

    if (khamp.status === "rejected") {
      return response.errorResponse(res, {}, "Khamp is already rejected", 400);
    }

    khamp.status = "rejected";
    khamp.isActive = false;
    await khamp.save();

    return response.successResponse(res, khamp, "Khamp rejected successfully");
  } catch (error) {
    console.error("Error rejecting khamp:", error);
    return response.errorResponse(res, {}, "Failed to reject khamp", 500);
  }
};

module.exports = {
  createKhamp,
  getKhampList,
  getKhampById,
  updateKhamp,
  deleteKhamp,
  hardDeleteKhamp,
  toggleKhampStatus,
  restoreKhamp,
  approveKhamp,
  rejectKhamp,
};
