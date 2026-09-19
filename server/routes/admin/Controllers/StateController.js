const response = require("../../../config/response");
const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const UserDetails = require("../../../models/UserDetails");
const mongoose = require("mongoose");

const createState = async (req, res) => {
  try {
    const { name, countryId, isActive } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required" }],
        "Validation Error",
        400
      );
    }

    if (!countryId || !mongoose.Types.ObjectId.isValid(countryId)) {
      return response.errorResponse(
        res,
        [{ path: "countryId", msg: "Valid country ID is required" }],
        "Validation Error",
        400
      );
    }

    const nameUpper = name.trim().toUpperCase();
    const existingState = await State.findOne({
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      countryId,
      isDeleted: false,
    });

    if (existingState) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "State with this name already exists" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.admin?.id;

    const state = new State({
      name: nameUpper,
      countryId,
      status: "active",
      createdBy: adminId,
      isActive: isActive !== undefined ? (isActive === "true" || isActive === true) : true,
    });

    await state.save();

    return response.successResponse(
      res,
      state,
      "State created successfully"
    );
  } catch (error) {
    console.error("Error creating state:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "State with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create state",
      500
    );
  }
};

const getStates = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
      search = "",
      countryId,
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    if (countryId && mongoose.Types.ObjectId.isValid(countryId)) {
      query.countryId = countryId;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const [data, totalRecord] = await Promise.all([
      State.find(query)
        .populate("countryId", "name")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      State.countDocuments(query),
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
      "States fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching states:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch states",
      500
    );
  }
};

const getStateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("countryId", "name")
      .lean();

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found",
        404
      );
    }

    return response.successResponse(
      res,
      state,
      "State fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching state:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch state",
      500
    );
  }
};

const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, countryId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found",
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
      const existingState = await State.findOne({
        name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
        countryId: countryId || state.countryId,
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingState) {
        return response.errorResponse(
          res,
          [{ path: "name", msg: "State with this name already exists" }],
          "Validation Error",
          400
        );
      }

      state.name = nameUpper;
    }

    if (countryId !== undefined && mongoose.Types.ObjectId.isValid(countryId)) {
      state.countryId = countryId;
    }

    if (isActive !== undefined) {
      state.isActive = isActive === "true" || isActive === true;
    }

    await state.save();

    return response.successResponse(
      res,
      state,
      "State updated successfully"
    );
  } catch (error) {
    console.error("Error updating state:", error);

    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "State with this name already exists" }],
        "Validation Error",
        400
      );
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update state",
      500
    );
  }
};

const deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found",
        404
      );
    }

    state.isDeleted = true;
    state.isActive = false;
    await state.save();

    // Cascade delete districts and villages
    await District.updateMany(
      { stateId: id },
      { isDeleted: true, isActive: false }
    );

    const districts = await District.find({ stateId: id }).select("_id").lean();
    const districtIds = districts.map((d) => d._id);

    if (districtIds.length > 0) {
      await Village.updateMany(
        { districtId: { $in: districtIds } },
        { isDeleted: true, isActive: false }
      );
    }

    // Clear user references
    const userDetails = await UserDetails.find({ stateId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { stateId: id },
        { $unset: { stateId: "", districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "State deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting state:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete state",
      500
    );
  }
};

const hardDeleteState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
    });

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found",
        404
      );
    }

    // Get all districts for this state
    const districts = await District.find({ stateId: id }).select("_id").lean();
    const districtIds = districts.map((d) => d._id);

    // Delete villages first
    if (districtIds.length > 0) {
      await Village.deleteMany({ districtId: { $in: districtIds } });
    }

    // Delete districts
    await District.deleteMany({ stateId: id });

    // Delete state
    await State.deleteOne({ _id: id });

    // Clear user references
    const userDetails = await UserDetails.find({ stateId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { stateId: id },
        { $unset: { stateId: "", districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(
      res,
      {},
      "State permanently deleted successfully"
    );
  } catch (error) {
    console.error("Error hard deleting state:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to permanently delete state",
      500
    );
  }
};

const toggleStateStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
    });

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found",
        404
      );
    }

    const newStatus = !state.isActive;
    state.isActive = newStatus;
    await state.save();

    // Cascade status change
    await District.updateMany({ stateId: id }, { isActive: newStatus });
    const districts = await District.find({ stateId: id }).select("_id").lean();
    const districtIds = districts.map((d) => d._id);
    if (districtIds.length > 0) {
      await Village.updateMany(
        { districtId: { $in: districtIds } },
        { isActive: newStatus }
      );
    }

    return response.successResponse(
      res,
      state,
      "State status updated successfully"
    );
  } catch (error) {
    console.error("Error toggling state status:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to toggle state status",
      500
    );
  }
};

const restoreState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid state ID",
        400
      );
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!state) {
      return response.errorResponse(
        res,
        {},
        "State not found or not deleted",
        404
      );
    }

    state.isDeleted = false;
    state.isActive = true;
    await state.save();

    // Cascade restore
    await District.updateMany({ stateId: id }, { isDeleted: false, isActive: true });
    const districts = await District.find({ stateId: id }).select("_id").lean();
    const districtIds = districts.map((d) => d._id);
    if (districtIds.length > 0) {
      await Village.updateMany(
        { districtId: { $in: districtIds } },
        { isDeleted: false, isActive: true }
      );
    }

    return response.successResponse(
      res,
      state,
      "State restored successfully"
    );
  } catch (error) {
    console.error("Error restoring state:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to restore state",
      500
    );
  }
};

const approveState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid state ID", 400);
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!state) {
      return response.errorResponse(res, {}, "State not found", 404);
    }

    if (state.status === "active") {
      return response.errorResponse(res, {}, "State is already approved", 400);
    }

    state.status = "active";
    state.isActive = true;
    await state.save();

    return response.successResponse(res, state, "State approved successfully");
  } catch (error) {
    console.error("Error approving state:", error);
    return response.errorResponse(res, {}, "Failed to approve state", 500);
  }
};

const rejectState = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid state ID", 400);
    }

    const state = await State.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!state) {
      return response.errorResponse(res, {}, "State not found", 404);
    }

    if (state.status === "rejected") {
      return response.errorResponse(res, {}, "State is already rejected", 400);
    }

    state.status = "rejected";
    state.isActive = false;
    await state.save();

    // Clear user references
    const userDetails = await UserDetails.find({ stateId: id }).lean();
    if (userDetails.length > 0) {
      await UserDetails.updateMany(
        { stateId: id },
        { $unset: { stateId: "", districtId: "", villageId: "" } }
      );
    }

    return response.successResponse(res, state, "State rejected successfully");
  } catch (error) {
    console.error("Error rejecting state:", error);
    return response.errorResponse(res, {}, "Failed to reject state", 500);
  }
};

module.exports = {
  createState,
  getStates,
  getStateById,
  updateState,
  deleteState,
  hardDeleteState,
  toggleStateStatus,
  restoreState,
  approveState,
  rejectState,
};
