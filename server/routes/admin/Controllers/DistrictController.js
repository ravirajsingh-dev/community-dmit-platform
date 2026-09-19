const response = require("../../../config/response");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const UserDetails = require("../../../models/UserDetails");
const mongoose = require("mongoose");

const createDistrict = async (req, res) => {
  try {
    const { name, stateId, isActive } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    if (!stateId || !mongoose.Types.ObjectId.isValid(stateId)) {
      return response.errorResponse(
        res,
        [{ path: "stateId", msg: "Valid state ID is required" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingDistrict = await District.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      stateId,
      isDeleted: false,
    });

    if (existingDistrict) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "District with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const district = new District({
      name: nameUpper,
      stateId,
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await district.save();

    return response.successResponse(
      res,
      district,
      "District created successfully"
    );
  } catch (error) {
    console.error("Error creating district:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "District with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create district",
      500
    );
  }
};

const getDistricts = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      stateId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      query.stateId = stateId;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const [data, totalRecord] = await Promise.all([
      District.find(query)
        .populate("stateId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      District.countDocuments(query),
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
      "Districts fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching districts:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch districts",
      500
    );
  }
};

const getDistrictById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("stateId", "name")
      .lean();

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found",
        404
      );
    }

    return response.successResponse(
      res,
      district,
      "District fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching district:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch district",
      500
    );
  }
};

const updateDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stateId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found",
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
      const existingDistrict = await District.findOne({
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        stateId: stateId || district.stateId,
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingDistrict) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "District with this name already exists" }],
          "Validation Error",
          400
        );
      }

      district.name = nameUpper;
    }

    if (stateId !== undefined && mongoose.Types.ObjectId.isValid(stateId)) {
      district.stateId = stateId;
    }

    if (isActive !== undefined) {
      district.isActive = isActive === "true" || isActive === true;
    }

    await district.save();

    return response.successResponse(
      res,
      district,
      "District updated successfully"
    );
  } catch (error) {
    console.error("Error updating district:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "District with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update district",
      500
    );
  }
};

const deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found",
        404
      );
    }

    district.isDeleted = true;
    district.isActive = false;
    await district.save();

    // Cascade delete villages
    await Village.updateMany(
      { districtId: id },
      { isDeleted: true, isActive: false }
    );

    // Clear user references
    const userDetails = await UserDetails.find({ districtId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { districtId: id },
        { $unset: { districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "District deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting district:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete district",
      500
    );
  }
};

const hardDeleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
    });

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found",
        404
      );
    }

    // Delete villages first
    await Village.deleteMany({ districtId: id });

    // Delete district
    await District.deleteOne({ _id: id });

    // Clear user references
    const userDetails = await UserDetails.find({ districtId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { districtId: id },
        { $unset: { districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "District permanently deleted successfully"
    );
  } catch (error) {
    console.error("Error hard deleting district:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete district",
      500
    );
  }
};

const toggleDistrictStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
    });

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found",
        404
      );
    }

    const newStatus = !district.isActive;
    district.isActive = newStatus;
    await district.save();

    // Cascade status change
    await Village.updateMany({ districtId: id }, { isActive: newStatus });

    return response.successResponse(
      res,
      district,
      "District status updated successfully"
    );
  } catch (error) {
    console.error("Error toggling district status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle district status",
      500
    );
  }
};

const restoreDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid district ID",
        400
      );
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!district) {
      return response.errorResponse(
        res,
        {},
        "District not found or not deleted",
        404
      );
    }

    district.isDeleted = false;
    district.isActive = true;
    await district.save();

    // Cascade restore
    await Village.updateMany(
      { districtId: id },
      { isDeleted: false, isActive: true }
    );

    return response.successResponse(
      res,
      district,
      "District restored successfully"
    );
  } catch (error) {
    console.error("Error restoring district:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore district",
      500
    );
  }
};

const approveDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid district ID", 400);
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!district) {
      return response.errorResponse(res, {}, "District not found", 404);
    }

    if (district.status === "active") {
      return response.errorResponse(res, {}, "District is already approved", 400);
    }

    district.status = "active";
    district.isActive = true;
    await district.save();

    return response.successResponse(res, district, "District approved successfully");
  } catch (error) {
    console.error("Error approving district:", error);
    return response.errorResponse(res, {}, "Failed to approve district", 500);
  }
};

const rejectDistrict = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid district ID", 400);
    }

    const district = await District.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!district) {
      return response.errorResponse(res, {}, "District not found", 404);
    }

    if (district.status === "rejected") {
      return response.errorResponse(res, {}, "District is already rejected", 400);
    }

    district.status = "rejected";
    district.isActive = false;
    await district.save();

    // Clear user references
    const userDetails = await UserDetails.find({ districtId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { districtId: id },
        { $unset: { districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(res, district, "District rejected successfully");
  } catch (error) {
    console.error("Error rejecting district:", error);
    return response.errorResponse(res, {}, "Failed to reject district", 500);
  }
};

module.exports = {
  createDistrict,
  getDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
  hardDeleteDistrict,
  toggleDistrictStatus,
  restoreDistrict,
  approveDistrict,
  rejectDistrict,
};
