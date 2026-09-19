const response = require("../../../config/response");
const Community = require("../../../models/Community");
const mongoose = require("mongoose");
const {
  cascadeSoftDeleteCommunity,
  cascadeHardDeleteCommunity,
  cascadeInactiveCommunity,
  cascadeActiveCommunity,
  cascadeRestoreCommunity,
} = require("../../../services/hierarchyCascadeService");

const createCommunity = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingCommunity = await Community.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingCommunity) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Community with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const community = new Community({
      name: nameUpper,
      description: description ? description.trim() : "",
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await community.save();

    return response.successResponse(
      res,
      community,
      "Community created successfully"
    );
  } catch (error) {
    console.error("Error creating community:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Community with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create community",
      500
    );
  }
};

const getCommunities = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      Community.find(query)
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Community.countDocuments(query),
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
      "Communities fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching communities:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch communities",
      500
    );
  }
};

const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: false,
    }).lean();

    if (!community) {
      return response.errorResponse(
        res,
        {},
        "Community not found",
        404
      );
    }

    return response.successResponse(
      res,
      community,
      "Community fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching community:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch community",
      500
    );
  }
};

const updateCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!community) {
      return response.errorResponse(
        res,
        {},
        "Community not found",
        404
      );
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

      const nameUpper = name.trim().toUpperCase();
      const existingCommunity = await Community.findOne({
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingCommunity) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Community with this name already exists" }],
          "Validation Error",
          400
        );
      }

      community.name = nameUpper;
    }

    if (description !== undefined) {
      community.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      const newActiveStatus = isActive === "true" || isActive === true;
      const oldActiveStatus = community.isActive;
      community.isActive = newActiveStatus;
      
      if (newActiveStatus !== oldActiveStatus) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          if (!newActiveStatus) {
            await cascadeInactiveCommunity(id, session);
          } else {
            await cascadeActiveCommunity(id, session);
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

    await community.save();

    return response.successResponse(
      res,
      community,
      "Community updated successfully"
    );
  } catch (error) {
    console.error("Error updating community:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Community with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update community",
      500
    );
  }
};

const deleteCommunity = async (req, res) => {
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
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: false,
    }).session(session);

    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Community not found",
        404
      );
    }

    community.isDeleted = true;
    community.isActive = false;
    await community.save({ session });

    await cascadeSoftDeleteCommunity(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Community deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting community:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete community",
      500
    );
  }
};

const hardDeleteCommunity = async (req, res) => {
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
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
    }).session(session);

    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Community not found",
        404
      );
    }

    await cascadeHardDeleteCommunity(id, session);
    await Community.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Community permanently deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hard deleting community:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete community",
      500
    );
  }
};

const toggleCommunityStatus = async (req, res) => {
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
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
    }).session(session);

    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Community not found",
        404
      );
    }

    const newStatus = !community.isActive;
    community.isActive = newStatus;
    await community.save({ session });

    if (!newStatus) {
      await cascadeInactiveCommunity(id, session);
    } else {
      await cascadeActiveCommunity(id, session);
    }

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      community,
      "Community status updated successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error toggling community status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle community status",
      500
    );
  }
};

const restoreCommunity = async (req, res) => {
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
        "Invalid community ID",
        400
      );
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: true,
    }).session(session);

    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Community not found or not deleted",
        404
      );
    }

    community.isDeleted = false;
    community.isActive = true;
    await community.save({ session });

    await cascadeRestoreCommunity(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      community,
      "Community restored successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error restoring community:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore community",
      500
    );
  }
};

const approveCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid community ID", 400);
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!community) {
      return response.errorResponse(res, {}, "Community not found", 404);
    }

    if (community.status === "active") {
      return response.errorResponse(res, {}, "Community is already approved", 400);
    }

    community.status = "active";
    community.isActive = true;
    await community.save();

    return response.successResponse(res, community, "Community approved successfully");
  } catch (error) {
    console.error("Error approving community:", error);
    return response.errorResponse(res, {}, "Failed to approve community", 500);
  }
};

const rejectCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid community ID", 400);
    }

    const community = await Community.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!community) {
      return response.errorResponse(res, {}, "Community not found", 404);
    }

    if (community.status === "rejected") {
      return response.errorResponse(res, {}, "Community is already rejected", 400);
    }

    community.status = "rejected";
    community.isActive = false;
    await community.save();

    return response.successResponse(res, community, "Community rejected successfully");
  } catch (error) {
    console.error("Error rejecting community:", error);
    return response.errorResponse(res, {}, "Failed to reject community", 500);
  }
};

module.exports = {
  createCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  hardDeleteCommunity,
  toggleCommunityStatus,
  restoreCommunity,
  approveCommunity,
  rejectCommunity,
};
