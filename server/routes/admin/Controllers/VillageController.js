const response = require("../../../config/response");
const Village = require("../../../models/Village");
const UserDetails = require("../../../models/UserDetails");
const mongoose = require("mongoose");

const createVillage = async (req, res) => {
  try {
    const { name, districtId, isActive } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    if (!districtId || !mongoose.Types.ObjectId.isValid(districtId)) {
      return response.errorResponse(
        res,
        [{ path: "districtId", msg: "Valid district ID is required" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingVillage = await Village.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      districtId,
      isDeleted: false,
    });

    if (existingVillage) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const village = new Village({
      name: nameUpper,
      districtId,
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await village.save();

    return response.successResponse(
      res,
      village,
      "Village created successfully"
    );
  } catch (error) {
    console.error("Error creating village:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create village",
      500
    );
  }
};

const getVillages = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      districtId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (districtId && mongoose.Types.ObjectId.isValid(districtId)) {
      query.districtId = districtId;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const [data, totalRecord] = await Promise.all([
      Village.find(query)
        .populate("districtId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Village.countDocuments(query),
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
      "Villages fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching villages:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch villages",
      500
    );
  }
};

const getVillageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("districtId", "name")
      .lean();

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found",
        404
      );
    }

    return response.successResponse(
      res,
      village,
      "Village fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching village:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch village",
      500
    );
  }
};

const updateVillage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, districtId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found",
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
      const existingVillage = await Village.findOne({
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        districtId: districtId || village.districtId,
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingVillage) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "Village with this name already exists" }],
          "Validation Error",
          400
        );
      }

      village.name = nameUpper;
    }

    if (districtId !== undefined && mongoose.Types.ObjectId.isValid(districtId)) {
      village.districtId = districtId;
    }

    if (isActive !== undefined) {
      village.isActive = isActive === "true" || isActive === true;
    }

    await village.save();

    return response.successResponse(
      res,
      village,
      "Village updated successfully"
    );
  } catch (error) {
    console.error("Error updating village:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update village",
      500
    );
  }
};

const deleteVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found",
        404
      );
    }

    village.isDeleted = true;
    village.isActive = false;
    await village.save();

    // Clear user references
    const userDetails = await UserDetails.find({ villageId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { villageId: id },
        { $unset: { villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "Village deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting village:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete village",
      500
    );
  }
};

const hardDeleteVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
    });

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found",
        404
      );
    }

    await Village.deleteOne({ _id: id });

    // Clear user references
    const userDetails = await UserDetails.find({ villageId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { villageId: id },
        { $unset: { villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "Village permanently deleted successfully"
    );
  } catch (error) {
    console.error("Error hard deleting village:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete village",
      500
    );
  }
};

const toggleVillageStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
    });

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found",
        404
      );
    }

    village.isActive = !village.isActive;
    await village.save();

    return response.successResponse(
      res,
      village,
      "Village status updated successfully"
    );
  } catch (error) {
    console.error("Error toggling village status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle village status",
      500
    );
  }
};

const restoreVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid village ID",
        400
      );
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!village) {
      return response.errorResponse(
        res,
        {},
        "Village not found or not deleted",
        404
      );
    }

    village.isDeleted = false;
    village.isActive = true;
    await village.save();

    return response.successResponse(
      res,
      village,
      "Village restored successfully"
    );
  } catch (error) {
    console.error("Error restoring village:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore village",
      500
    );
  }
};

const approveVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    if (village.status === "active") {
      return response.errorResponse(res, {}, "Village is already approved", 400);
    }

    village.status = "active";
    village.isActive = true;
    await village.save();

    return response.successResponse(res, village, "Village approved successfully");
  } catch (error) {
    console.error("Error approving village:", error);
    return response.errorResponse(res, {}, "Failed to approve village", 500);
  }
};

const rejectVillage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid village ID", 400);
    }

    const village = await Village.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!village) {
      return response.errorResponse(res, {}, "Village not found", 404);
    }

    if (village.status === "rejected") {
      return response.errorResponse(res, {}, "Village is already rejected", 400);
    }

    village.status = "rejected";
    village.isActive = false;
    await village.save();

    // Clear user references
    const userDetails = await UserDetails.find({ villageId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { villageId: id },
        { $unset: { villageId: "" } }
      );
    }

    return response.successResponse(res, village, "Village rejected successfully");
  } catch (error) {
    console.error("Error rejecting village:", error);
    return response.errorResponse(res, {}, "Failed to reject village", 500);
  }
};

module.exports = {
  createVillage,
  getVillages,
  getVillageById,
  updateVillage,
  deleteVillage,
  hardDeleteVillage,
  toggleVillageStatus,
  restoreVillage,
  approveVillage,
  rejectVillage,
};
