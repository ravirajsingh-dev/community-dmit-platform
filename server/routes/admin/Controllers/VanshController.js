const response = require("../../../config/response");
const Vansh = require("../../../models/Vansh");
const Community = require("../../../models/Community");
const mongoose = require("mongoose");
const {
  cascadeSoftDeleteVansh,
  cascadeHardDeleteVansh,
  cascadeInactiveVansh,
  cascadeActiveVansh,
  cascadeRestoreVansh,
} = require("../../../services/hierarchyCascadeService");

const createVansh = async (req, res) => {
  try {
    const { communityId, name, description, isActive } = req.body;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Valid community is required" }],
        "Validation Error",
        400
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
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
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingVansh = await Vansh.findOne({
      communityId,
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingVansh) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Vansh with this name already exists in this community" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const vansh = new Vansh({
      communityId,
      name: nameUpper,
      description: description ? description.trim() : "",
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await vansh.save();

    return response.successResponse(
      res,
      vansh,
      "Vansh created successfully"
    );
  } catch (error) {
    console.error("Error creating vansh:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Vansh with this name already exists in this community" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create vansh",
      500
    );
  }
};

const getVanshList = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      communityId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      query.communityId = communityId;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      Vansh.find(query)
        .populate("communityId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Vansh.countDocuments(query),
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
      "Vansh list fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching vansh list:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch vansh list",
      500
    );
  }
};

const getVanshById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("communityId", "name")
      .lean();

    if (!vansh) {
      return response.errorResponse(
        res,
        {},
        "Vansh not found",
        404
      );
    }

    return response.successResponse(
      res,
      vansh,
      "Vansh fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching vansh:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch vansh",
      500
    );
  }
};

const updateVansh = async (req, res) => {
  try {
    const { id } = req.params;
    const { communityId, name, description, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(
        res,
        {},
        "Vansh not found",
        404
      );
    }

    if (communityId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(communityId)) {
        return response.errorResponse(
          res,
          [{ path: "communityId", msg: "Valid community is required" }],
          "Validation Error",
          400
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
          400
        );
      }

      vansh.communityId = communityId;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Name cannot be empty" }],
          "Validation Error",
          400
        );
      }

      const finalCommunityId = communityId || vansh.communityId;
      const nameUpper = name.trim().toUpperCase();
      const existingVansh = await Vansh.findOne({
        communityId: finalCommunityId,
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingVansh) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Vansh with this name already exists in this community" }],
          "Validation Error",
          400
        );
      }

      vansh.name = nameUpper;
    }

    if (description !== undefined) {
      vansh.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      const newActiveStatus = isActive === "true" || isActive === true;
      const oldActiveStatus = vansh.isActive;
      vansh.isActive = newActiveStatus;
      
      if (newActiveStatus !== oldActiveStatus) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          if (!newActiveStatus) {
            await cascadeInactiveVansh(id, session);
          } else {
            await cascadeActiveVansh(id, session);
          }
          await session.commitTransaction();
          session.endSession();
        } catch (cascadeError) {
          await session.abortTransaction();
          session.endSession();
          throw cascadeError;
        }
      }
    }

    await vansh.save();

    return response.successResponse(
      res,
      vansh,
      "Vansh updated successfully"
    );
  } catch (error) {
    console.error("Error updating vansh:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Vansh with this name already exists in this community" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update vansh",
      500
    );
  }
};

const deleteVansh = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: false,
    }).session(session);

    if (!vansh) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Vansh not found",
        404
      );
    }

    vansh.isDeleted = true;
    vansh.isActive = false;
    await vansh.save({ session });

    await cascadeSoftDeleteVansh(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Vansh deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting vansh:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete vansh",
      500
    );
  }
};

const hardDeleteVansh = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
    }).session(session);

    if (!vansh) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Vansh not found",
        404
      );
    }

    await cascadeHardDeleteVansh(id, session);
    await Vansh.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Vansh permanently deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hard deleting vansh:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete vansh",
      500
    );
  }
};

const toggleVanshStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
    }).session(session);

    if (!vansh) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Vansh not found",
        404
      );
    }

    const newStatus = !vansh.isActive;
    vansh.isActive = newStatus;
    await vansh.save({ session });

    if (!newStatus) {
      await cascadeInactiveVansh(id, session);
    } else {
      await cascadeActiveVansh(id, session);
    }

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      vansh,
      "Vansh status updated successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error toggling vansh status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle vansh status",
      500
    );
  }
};

const restoreVansh = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Invalid vansh ID",
        400
      );
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: true,
    }).session(session);

    if (!vansh) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Vansh not found or not deleted",
        404
      );
    }

    const community = await Community.findOne({
      _id: vansh.communityId,
      isDeleted: false,
    }).session(session);

    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Cannot restore vansh: parent community is deleted",
        400
      );
    }

    vansh.isDeleted = false;
    vansh.isActive = true;
    await vansh.save({ session });

    await cascadeRestoreVansh(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      vansh,
      "Vansh restored successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error restoring vansh:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore vansh",
      500
    );
  }
};

const approveVansh = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid vansh ID", 400);
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(res, {}, "Vansh not found", 404);
    }

    if (vansh.status === "active") {
      return response.errorResponse(res, {}, "Vansh is already approved", 400);
    }

    vansh.status = "active";
    vansh.isActive = true;
    await vansh.save();

    return response.successResponse(res, vansh, "Vansh approved successfully");
  } catch (error) {
    console.error("Error approving vansh:", error);
    return response.errorResponse(res, {}, "Failed to approve vansh", 500);
  }
};

const rejectVansh = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid vansh ID", 400);
    }

    const vansh = await Vansh.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(res, {}, "Vansh not found", 404);
    }

    if (vansh.status === "rejected") {
      return response.errorResponse(res, {}, "Vansh is already rejected", 400);
    }

    vansh.status = "rejected";
    vansh.isActive = false;
    await vansh.save();

    return response.successResponse(res, vansh, "Vansh rejected successfully");
  } catch (error) {
    console.error("Error rejecting vansh:", error);
    return response.errorResponse(res, {}, "Failed to reject vansh", 500);
  }
};

module.exports = {
  createVansh,
  getVanshList,
  getVanshById,
  updateVansh,
  deleteVansh,
  hardDeleteVansh,
  toggleVanshStatus,
  restoreVansh,
  approveVansh,
  rejectVansh,
};
