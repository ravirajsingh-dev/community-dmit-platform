const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const Country = require("../../../models/Country");
const response = require("../../../config/response");
const mongoose = require("mongoose");

const getCountries = async (req, res) => {
  try {
    const userId = req.user?.id;

    const countries = await Country.find({
      isDeleted: false,
      $or: [
        { status: "active", isActive: true },
        { status: "pending", createdBy: userId },
        // Include old records without status field that are active
        { status: { $exists: false }, isActive: true },
        { status: null, isActive: true },
      ],
    })
      .select("_id name status")
      .sort({ name: 1 })
      .lean();

    const formattedCountries = countries.map((country) => ({
      value: country._id.toString(),
      label: country.status === "pending" ? `${country.name} (Pending Admin Approval)` : country.name,
      status: country.status || "active",
    }));

    return response.successResponse(res, formattedCountries, "Countries fetched successfully");
  } catch (error) {
    console.error("Error fetching countries:", error);
    return response.errorResponse(res, {}, "Failed to fetch countries", 500);
  }
};

const getStates = async (req, res) => {
  try {
    const { countryId } = req.query;
    const userId = req.user?.id;

    if (!countryId || !mongoose.Types.ObjectId.isValid(countryId)) {
      return response.errorResponse(
        res,
        [{ path: "countryId", msg: "Valid country ID is required" }],
        "Validation Error",
        400
      );
    }

    const states = await State.find({
      countryId,
      isDeleted: false,
      $or: [
        { status: "active", isActive: true },
        { status: "pending", createdBy: userId },
        // Include old records without status field that are active
        { status: { $exists: false }, isActive: true },
        { status: null, isActive: true },
      ],
    })
      .select("_id name status")
      .lean();

    const formattedStates = states.map((state) => ({
      value: state._id.toString(),
      label: state.status === "pending" ? `${state.name} (Pending Admin Approval)` : state.name,
      status: state.status || "active",
    }));

    return response.successResponse(res, formattedStates, "States fetched successfully");
  } catch (error) {
    console.error("Error fetching states:", error);
    return response.errorResponse(res, {}, "Failed to fetch states", 500);
  }
};

const getDistricts = async (req, res) => {
  try {
    const { stateId } = req.query;
    const userId = req.user?.id;

    if (!stateId || !mongoose.Types.ObjectId.isValid(stateId)) {
      return response.errorResponse(
        res,
        [{ path: "stateId", msg: "Valid state ID is required" }],
        "Validation Error",
        400
      );
    }

    const districts = await District.find({
      stateId,
      isDeleted: false,
      $or: [
        { status: "active", isActive: true },
        { status: "pending", createdBy: userId },
        // Include old records without status field that are active
        { status: { $exists: false }, isActive: true },
        { status: null, isActive: true },
      ],
    })
      .select("_id name status")
      .lean();

    const formattedDistricts = districts.map((district) => ({
      value: district._id.toString(),
      label: district.status === "pending" ? `${district.name} (Pending Admin Approval)` : district.name,
      status: district.status || "active",
    }));

    return response.successResponse(res, formattedDistricts, "Districts fetched successfully");
  } catch (error) {
    console.error("Error fetching districts:", error);
    return response.errorResponse(res, {}, "Failed to fetch districts", 500);
  }
};

const getVillages = async (req, res) => {
  try {
    const { districtId } = req.query;
    const userId = req.user?.id;

    if (!districtId || !mongoose.Types.ObjectId.isValid(districtId)) {
      return response.errorResponse(
        res,
        [{ path: "districtId", msg: "Valid district ID is required" }],
        "Validation Error",
        400
      );
    }

    const villages = await Village.find({
      districtId,
      isDeleted: false,
      $or: [
        { status: "active", isActive: true },
        { status: "pending", createdBy: userId },
        // Include old records without status field that are active
        { status: { $exists: false }, isActive: true },
        { status: null, isActive: true },
      ],
    })
      .select("_id name status")
      .lean();

    const formattedVillages = villages.map((village) => ({
      value: village._id.toString(),
      label: village.status === "pending" ? `${village.name} (Pending Admin Approval)` : village.name,
      status: village.status || "active",
    }));

    return response.successResponse(res, formattedVillages, "Villages fetched successfully");
  } catch (error) {
    console.error("Error fetching villages:", error);
    return response.errorResponse(res, {}, "Failed to fetch villages", 500);
  }
};

const createState = async (req, res) => {
  try {
    const userId = req.user.id;
    const { countryId, name } = req.body;

    if (!countryId || !mongoose.Types.ObjectId.isValid(countryId)) {
      return response.errorResponse(
        res,
        [{ path: "countryId", msg: "Valid country ID is required" }],
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

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "State name is required" }],
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

    const newState = new State({
      name: nameUpper,
      countryId,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await newState.save();

    return response.successResponse(
      res,
      {
        value: newState._id.toString(),
        label: newState.name,
        status: newState.status,
      },
      "State created successfully (pending approval)"
    );
  } catch (error) {
    console.error("Error creating state:", error);
    return response.errorResponse(res, {}, error.message || "Failed to create state", 500);
  }
};

const createDistrict = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stateId, name } = req.body;

    if (!stateId || !mongoose.Types.ObjectId.isValid(stateId)) {
      return response.errorResponse(
        res,
        [{ path: "stateId", msg: "Valid state ID is required" }],
        "Validation Error",
        400
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "District name is required" }],
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
        [{ path: "name", msg: "District with this name already exists in this state" }],
        "Validation Error",
        400
      );
    }

    const newDistrict = new District({
      name: nameUpper,
      stateId,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await newDistrict.save();

    return response.successResponse(
      res,
      {
        value: newDistrict._id.toString(),
        label: newDistrict.name,
        status: newDistrict.status,
      },
      "District created successfully (pending approval)"
    );
  } catch (error) {
    console.error("Error creating district:", error);
    return response.errorResponse(res, {}, error.message || "Failed to create district", 500);
  }
};

const createVillage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { districtId, name } = req.body;

    if (!districtId || !mongoose.Types.ObjectId.isValid(districtId)) {
      return response.errorResponse(
        res,
        [{ path: "districtId", msg: "Valid district ID is required" }],
        "Validation Error",
        400
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Village name is required" }],
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
        [{ path: "name", msg: "Village with this name already exists in this district" }],
        "Validation Error",
        400
      );
    }

    const newVillage = new Village({
      name: nameUpper,
      districtId,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await newVillage.save();

    return response.successResponse(
      res,
      {
        value: newVillage._id.toString(),
        label: newVillage.name,
        status: newVillage.status,
      },
      "Village created successfully (pending approval)"
    );
  } catch (error) {
    console.error("Error creating village:", error);
    return response.errorResponse(res, {}, error.message || "Failed to create village", 500);
  }
};

module.exports = {
  getCountries,
  getStates,
  getDistricts,
  getVillages,
  createState,
  createDistrict,
  createVillage,
};
