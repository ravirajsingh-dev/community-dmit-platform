const response = require("../../../config/response");
const Kul = require("../../../models/Kul");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const mongoose = require("mongoose");
const {
  cascadeSoftDeleteKul,
  cascadeHardDeleteKul,
  cascadeInactiveKul,
  cascadeActiveKul,
  cascadeRestoreKul,
} = require("../../../services/hierarchyCascadeService");

const createKul = async (req, res) => {
  try {
    const { communityId, vanshId, name, description, isActive } = req.body;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Valid community is required" }],
        "Validation Error",
        400
      );
    }

    if (!vanshId || !mongoose.Types.ObjectId.isValid(vanshId)) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Valid vansh is required" }],
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

    const vansh = await Vansh.findOne({
      _id: vanshId,
      communityId,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Vansh not found or does not belong to this community" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingKul = await Kul.findOne({
      vanshId,
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingKul) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Kul with this name already exists in this vansh" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const kul = new Kul({
      communityId,
      vanshId,
      name: nameUpper,
      description: description ? description.trim() : "",
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await kul.save();

    return response.successResponse(
      res,
      kul,
      "Kul created successfully"
    );
  } catch (error) {
    console.error("Error creating kul:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Kul with this name already exists in this vansh" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create kul",
      500
    );
  }
};

const getKulList = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      communityId,
      vanshId,
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

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      Kul.find(query)
        .populate("communityId", "name")
        .populate("vanshId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Kul.countDocuments(query),
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
      "Kul list fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching kul list:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch kul list",
      500
    );
  }
};

const getKulById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("communityId", "name")
      .populate("vanshId", "name")
      .lean();

    if (!kul) {
      return response.errorResponse(
        res,
        {},
        "Kul not found",
        404
      );
    }

    return response.successResponse(
      res,
      kul,
      "Kul fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching kul:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch kul",
      500
    );
  }
};

const updateKul = async (req, res) => {
  try {
    const { id } = req.params;
    const { communityId, vanshId, name, description, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!kul) {
      return response.errorResponse(
        res,
        {},
        "Kul not found",
        404
      );
    }

    if (vanshId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(vanshId)) {
        return response.errorResponse(
          res,
          [{ path: "vanshId", msg: "Valid vansh is required" }],
          "Validation Error",
          400
        );
      }

      const finalCommunityId = communityId || kul.communityId;
      const vansh = await Vansh.findOne({
        _id: vanshId,
        communityId: finalCommunityId,
        isDeleted: false,
      });

      if (!vansh) {
        return response.errorResponse(
          res,
          [{ path: "vanshId", msg: "Vansh not found or does not belong to this community" }],
          "Validation Error",
          400
        );
      }

      kul.vanshId = vanshId;
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

      kul.communityId = communityId;
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

      const finalVanshId = vanshId || kul.vanshId;
      const nameUpper = name.trim().toUpperCase();
      const existingKul = await Kul.findOne({
        vanshId: finalVanshId,
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingKul) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Kul with this name already exists in this vansh" }],
          "Validation Error",
          400
        );
      }

      kul.name = nameUpper;
    }

    if (description !== undefined) {
      kul.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      const newActiveStatus = isActive === "true" || isActive === true;
      const oldActiveStatus = kul.isActive;
      kul.isActive = newActiveStatus;
      
      if (newActiveStatus !== oldActiveStatus) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          if (!newActiveStatus) {
            await cascadeInactiveKul(id, session);
          } else {
            await cascadeActiveKul(id, session);
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

    await kul.save();

    return response.successResponse(
      res,
      kul,
      "Kul updated successfully"
    );
  } catch (error) {
    console.error("Error updating kul:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Kul with this name already exists in this vansh" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update kul",
      500
    );
  }
};

const deleteKul = async (req, res) => {
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
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: false,
    }).session(session);

    if (!kul) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Kul not found",
        404
      );
    }

    kul.isDeleted = true;
    kul.isActive = false;
    await kul.save({ session });

    await cascadeSoftDeleteKul(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Kul deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting kul:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete kul",
      500
    );
  }
};

const hardDeleteKul = async (req, res) => {
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
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
    }).session(session);

    if (!kul) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Kul not found",
        404
      );
    }

    await cascadeHardDeleteKul(id, session);
    await Kul.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {},
      "Kul permanently deleted successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hard deleting kul:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete kul",
      500
    );
  }
};

const toggleKulStatus = async (req, res) => {
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
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
    }).session(session);

    if (!kul) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Kul not found",
        404
      );
    }

    const newStatus = !kul.isActive;
    kul.isActive = newStatus;
    await kul.save({ session });

    if (!newStatus) {
      await cascadeInactiveKul(id, session);
    } else {
      await cascadeActiveKul(id, session);
    }

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      kul,
      "Kul status updated successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error toggling kul status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle kul status",
      500
    );
  }
};

const restoreKul = async (req, res) => {
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
        "Invalid kul ID",
        400
      );
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: true,
    }).session(session);

    if (!kul) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Kul not found or not deleted",
        404
      );
    }

    const vansh = await Vansh.findOne({
      _id: kul.vanshId,
      isDeleted: false,
    }).session(session);

    if (!vansh) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        {},
        "Cannot restore kul: parent vansh is deleted",
        400
      );
    }

    kul.isDeleted = false;
    kul.isActive = true;
    await kul.save({ session });

    await cascadeRestoreKul(id, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      kul,
      "Kul restored successfully"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error restoring kul:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore kul",
      500
    );
  }
};

const approveKul = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid kul ID", 400);
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!kul) {
      return response.errorResponse(res, {}, "Kul not found", 404);
    }

    if (kul.status === "active") {
      return response.errorResponse(res, {}, "Kul is already approved", 400);
    }

    kul.status = "active";
    kul.isActive = true;
    await kul.save();

    return response.successResponse(res, kul, "Kul approved successfully");
  } catch (error) {
    console.error("Error approving kul:", error);
    return response.errorResponse(res, {}, "Failed to approve kul", 500);
  }
};

const rejectKul = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid kul ID", 400);
    }

    const kul = await Kul.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!kul) {
      return response.errorResponse(res, {}, "Kul not found", 404);
    }

    if (kul.status === "rejected") {
      return response.errorResponse(res, {}, "Kul is already rejected", 400);
    }

    kul.status = "rejected";
    kul.isActive = false;
    await kul.save();

    return response.successResponse(res, kul, "Kul rejected successfully");
  } catch (error) {
    console.error("Error rejecting kul:", error);
    return response.errorResponse(res, {}, "Failed to reject kul", 500);
  }
};

module.exports = {
  createKul,
  getKulList,
  getKulById,
  updateKul,
  deleteKul,
  hardDeleteKul,
  toggleKulStatus,
  restoreKul,
  approveKul,
  rejectKul,
};
