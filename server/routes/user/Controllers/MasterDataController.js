const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const Gotra = require("../../../models/Gotra");
const response = require("../../../config/response");
const mongoose = require("mongoose");

const getCommunities = async (req, res) => {
  try {
    const userId = req.user?.id;

    const communities = await Community.find({
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

    const options = communities.map((c) => ({
      value: c._id.toString(),
      label:
        c.status === "pending" ? `${c.name} (Pending Admin Approval)` : c.name,
      status: c.status || "active",
    }));

    return response.successResponse(
      res,
      options,
      "Communities fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching communities:", error);
    return response.errorResponse(res, {}, "Failed to fetch communities", 500);
  }
};

const getVanshes = async (req, res) => {
  try {
    const { communityId } = req.query;
    const userId = req.user?.id;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Valid community ID is required" }],
        "Validation Error",
        400,
      );
    }

    const vanshes = await Vansh.find({
      communityId,
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

    const options = vanshes.map((v) => ({
      value: v._id.toString(),
      label:
        v.status === "pending" ? `${v.name} (Pending Admin Approval)` : v.name,
      status: v.status || "active",
    }));

    return response.successResponse(
      res,
      options,
      "Vanshes fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching vanshes:", error);
    return response.errorResponse(res, {}, "Failed to fetch vanshes", 500);
  }
};

const getKuls = async (req, res) => {
  try {
    const { vanshId } = req.query;
    const userId = req.user?.id;

    if (!vanshId || !mongoose.Types.ObjectId.isValid(vanshId)) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Valid vansh ID is required" }],
        "Validation Error",
        400,
      );
    }

    const kuls = await Kul.find({
      vanshId,
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

    const options = kuls.map((k) => ({
      value: k._id.toString(),
      label:
        k.status === "pending" ? `${k.name} (Pending Admin Approval)` : k.name,
      status: k.status || "active",
    }));

    return response.successResponse(res, options, "Kuls fetched successfully");
  } catch (error) {
    console.error("Error fetching kuls:", error);
    return response.errorResponse(res, {}, "Failed to fetch kuls", 500);
  }
};

const getKhamps = async (req, res) => {
  try {
    const { kulId } = req.query;
    const userId = req.user?.id;

    if (!kulId || !mongoose.Types.ObjectId.isValid(kulId)) {
      return response.errorResponse(
        res,
        [{ path: "kulId", msg: "Valid kul ID is required" }],
        "Validation Error",
        400,
      );
    }

    const khamps = await Khamp.find({
      kulId,
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

    const options = khamps.map((k) => ({
      value: k._id.toString(),
      label:
        k.status === "pending" ? `${k.name} (Pending Admin Approval)` : k.name,
      status: k.status || "active",
    }));

    return response.successResponse(
      res,
      options,
      "Khamps fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching khamps:", error);
    return response.errorResponse(res, {}, "Failed to fetch khamps", 500);
  }
};

const createCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Community name is required" }],
        "Validation Error",
        400,
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
        400,
      );
    }

    const community = new Community({
      name: nameUpper,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await community.save();

    return response.successResponse(
      res,
      {
        value: community._id.toString(),
        label: `${community.name} (Pending Admin Approval)`,
        status: community.status,
      },
      "Community created successfully (pending approval)",
    );
  } catch (error) {
    console.error("Error creating community:", error);
    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Community with this name already exists" }],
        "Validation Error",
        400,
      );
    }
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create community",
      500,
    );
  }
};

const createVansh = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId, name } = req.body;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return response.errorResponse(
        res,
        [{ path: "communityId", msg: "Valid community ID is required" }],
        "Validation Error",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Vansh name is required" }],
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

    const nameUpper = name.trim().toUpperCase();
    const existingVansh = await Vansh.findOne({
      communityId,
      name: { $regex: new RegExp(`^${nameUpper}$`, "i") },
      isDeleted: false,
    });

    if (existingVansh) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Vansh with this name already exists in this community",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const vansh = new Vansh({
      communityId,
      name: nameUpper,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await vansh.save();

    return response.successResponse(
      res,
      {
        value: vansh._id.toString(),
        label: `${vansh.name} (Pending Admin Approval)`,
        status: vansh.status,
      },
      "Vansh created successfully (pending approval)",
    );
  } catch (error) {
    console.error("Error creating vansh:", error);
    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Vansh with this name already exists in this community",
          },
        ],
        "Validation Error",
        400,
      );
    }
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create vansh",
      500,
    );
  }
};

const createKul = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vanshId, name } = req.body;

    if (!vanshId || !mongoose.Types.ObjectId.isValid(vanshId)) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Valid vansh ID is required" }],
        "Validation Error",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Kul name is required" }],
        "Validation Error",
        400,
      );
    }

    const vansh = await Vansh.findOne({
      _id: vanshId,
      isDeleted: false,
    });

    if (!vansh) {
      return response.errorResponse(
        res,
        [{ path: "vanshId", msg: "Vansh not found" }],
        "Validation Error",
        400,
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
        [
          {
            path: "name",
            msg: "Kul with this name already exists in this vansh",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const kul = new Kul({
      communityId: vansh.communityId,
      vanshId,
      name: nameUpper,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await kul.save();

    return response.successResponse(
      res,
      {
        value: kul._id.toString(),
        label: `${kul.name} (Pending Admin Approval)`,
        status: kul.status,
      },
      "Kul created successfully (pending approval)",
    );
  } catch (error) {
    console.error("Error creating kul:", error);
    if (error.code === 11000) {
      return response.errorResponse(
        res,
        [
          {
            path: "name",
            msg: "Kul with this name already exists in this vansh",
          },
        ],
        "Validation Error",
        400,
      );
    }
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create kul",
      500,
    );
  }
};

const createKhamp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { kulId, name } = req.body;

    if (!kulId || !mongoose.Types.ObjectId.isValid(kulId)) {
      return response.errorResponse(
        res,
        [{ path: "kulId", msg: "Valid kul ID is required" }],
        "Validation Error",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Khamp name is required" }],
        "Validation Error",
        400,
      );
    }

    const kul = await Kul.findOne({
      _id: kulId,
      isDeleted: false,
    });

    if (!kul) {
      return response.errorResponse(
        res,
        [{ path: "kulId", msg: "Kul not found" }],
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

    const khamp = new Khamp({
      communityId: kul.communityId,
      vanshId: kul.vanshId,
      kulId,
      name: nameUpper,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await khamp.save();

    return response.successResponse(
      res,
      {
        value: khamp._id.toString(),
        label: `${khamp.name} (Pending Admin Approval)`,
        status: khamp.status,
      },
      "Khamp created successfully (pending approval)",
    );
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

const getGotras = async (req, res) => {
  try {
    const { khampId } = req.query;
    const userId = req.user?.id;

    if (!khampId || !mongoose.Types.ObjectId.isValid(khampId)) {
      return response.errorResponse(
        res,
        [{ path: "khampId", msg: "Valid khamp ID is required" }],
        "Validation Error",
        400,
      );
    }

    const gotras = await Gotra.find({
      khampId,
      isDeleted: false,
      $or: [
        { status: "active", isActive: true },
        { status: "pending", createdBy: userId },
        { status: { $exists: false }, isActive: true },
        { status: null, isActive: true },
      ],
    })
      .select("_id name status")
      .lean();

    const options = gotras.map((g) => ({
      value: g._id.toString(),
      label:
        g.status === "pending" ? `${g.name} (Pending Admin Approval)` : g.name,
      status: g.status || "active",
    }));

    return response.successResponse(
      res,
      options,
      "Gotras fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching gotras:", error);
    return response.errorResponse(res, {}, "Failed to fetch gotras", 500);
  }
};

const createGotra = async (req, res) => {
  try {
    const userId = req.user.id;
    const { khampId, name } = req.body;

    if (!khampId || !mongoose.Types.ObjectId.isValid(khampId)) {
      return response.errorResponse(
        res,
        [{ path: "khampId", msg: "Valid khamp ID is required" }],
        "Validation Error",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Gotra name is required" }],
        "Validation Error",
        400,
      );
    }

    const khamp = await Khamp.findOne({
      _id: khampId,
      isDeleted: false,
    });

    if (!khamp) {
      return response.errorResponse(
        res,
        [{ path: "khampId", msg: "Khamp not found" }],
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

    const gotra = new Gotra({
      communityId: khamp.communityId,
      vanshId: khamp.vanshId,
      kulId: khamp.kulId,
      khampId,
      name: nameUpper,
      status: "pending",
      createdBy: userId,
      isActive: false,
    });

    await gotra.save();

    return response.successResponse(
      res,
      {
        value: gotra._id.toString(),
        label: `${gotra.name} (Pending Admin Approval)`,
        status: gotra.status,
      },
      "Gotra created successfully (pending approval)",
    );
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

module.exports = {
  getCommunities,
  getVanshes,
  getKuls,
  getKhamps,
  getGotras,
  createCommunity,
  createVansh,
  createKul,
  createKhamp,
  createGotra,
};
