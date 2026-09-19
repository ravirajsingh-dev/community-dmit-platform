const mongoose = require("mongoose");
const Matrimonial = require("../../models/Matrimonial");
const MatrimonialProfileView = require("../../models/MatrimonialProfileView");
const User = require("../../models/User");
const UserDetails = require("../../models/UserDetails");
const {
  validateUserAndDetailsForMatrimonial,
} = require("./matrimonialValidationService");

const MATRIMONIAL_STATUS_ACTIVE = 1;
/** Backward compat: old docs may have status "approved". Treat as active for listing. */
const ACTIVE_STATUS_QUERY = { $in: [MATRIMONIAL_STATUS_ACTIVE, "approved"] };

/**
 * Apply for matrimonial: create profile. Visible immediately (status=1, isActive=true). No admin approval.
 */
async function applyForMatrimonial(userId) {
  const validation = await validateUserAndDetailsForMatrimonial(userId);
  if (!validation.valid) {
    return {
      error: validation.message,
      missingFields: validation.missingFields || [],
    };
  }

  const existing = await Matrimonial.findOne({ userId });
  if (existing) {
    return {
      error:
        "You already have a Matrimonial profile. Update or delete it to re-apply.",
    };
  }

  const { userDetails } = validation;
  const communityId =
    userDetails.community && userDetails.community._id
      ? userDetails.community._id
      : userDetails.community;

  const matrimonial = new Matrimonial({
    userId,
    userDetailsId: userDetails._id,
    communityId,
    status: MATRIMONIAL_STATUS_ACTIVE,
    isActive: true,
  });
  await matrimonial.save();

  return { matrimonial };
}

/**
 * Get matrimonial profile for a user (own profile). Returns null if none.
 */
async function getMatrimonialByUserId(userId) {
  return Matrimonial.findOne({ userId })
    .populate("userId", "name phone email memberId")
    .populate("userDetailsId")
    .populate("communityId", "name")
    .lean();
}

/**
 * Update own matrimonial: only isActive or re-link userDetailsId. Profile data is in UserDetails (user updates via profile).
 */
async function updateMatrimonial(userId, payload) {
  const matrimonial = await Matrimonial.findOne({ userId });
  if (!matrimonial) return { error: "Matrimonial profile not found" };
  if (payload.isActive !== undefined) matrimonial.isActive = !!payload.isActive;
  if (
    payload.userDetailsId &&
    mongoose.Types.ObjectId.isValid(payload.userDetailsId)
  ) {
    matrimonial.userDetailsId = payload.userDetailsId;
  }
  await matrimonial.save();
  return { matrimonial };
}

async function activateMatrimonial(userId) {
  const matrimonial = await Matrimonial.findOne({ userId });
  if (!matrimonial) return { error: "Matrimonial profile not found" };
  matrimonial.isActive = true;
  await matrimonial.save();
  return { matrimonial };
}

async function deactivateMatrimonial(userId) {
  const matrimonial = await Matrimonial.findOne({ userId });
  if (!matrimonial) return { error: "Matrimonial profile not found" };
  matrimonial.isActive = false;
  await matrimonial.save();
  return { matrimonial };
}

/**
 * Hard delete matrimonial. Permanent. User can re-apply later.
 */
async function deleteMatrimonial(userId) {
  const result = await Matrimonial.deleteOne({ userId });
  if (result.deletedCount === 0) {
    return { error: "Matrimonial profile not found" };
  }
  return { deleted: true };
}

/**
 * Compute age from DOB (date or string).
 */
function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now - d) / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Build filter query for listing. Uses aggregation: match matrimonials then lookup user_details and users.
 * Filters: communityScope (my_community | all), communityId, vanshId, kulId, khampId, gotraId, gender,
 * maritalStatus, education, occupation, countryId, stateId, districtId, villageId, ageMin, ageMax.
 * Excludes requesting user's profile from list.
 */
async function getList(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    communityScope = "my_community",
    communityId,
    vanshId,
    kulId,
    khampId,
    gotraId,
    gender,
    maritalStatus,
    education,
    occupation,
    countryId,
    stateId,
    districtId,
    villageId,
    ageMin,
    ageMax,
    search,
  } = options;

  const match = { status: ACTIVE_STATUS_QUERY, isActive: true };
  if (userId) {
    match.userId = { $ne: new mongoose.Types.ObjectId(userId) };
  }

  if (communityScope === "my_community" && userId) {
    const ud = await UserDetails.findOne({ userId }).select("community").lean();
    const cid = ud?.community?._id ?? ud?.community;
    if (cid) {
      match.communityId = new mongoose.Types.ObjectId(cid);
    }
  } else if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
    match.communityId = new mongoose.Types.ObjectId(communityId);
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "user_details",
        localField: "userDetailsId",
        foreignField: "_id",
        as: "ud",
      },
    },
    { $unwind: { path: "$ud", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: { path: "$u", preserveNullAndEmptyArrays: false } },
  ];

  const extraMatch = {};
  if (gender && ["male", "female", "other"].includes(gender))
    extraMatch["ud.gender"] = gender;
  if (maritalStatus && maritalStatus.trim())
    extraMatch["ud.maritalStatus"] = maritalStatus.trim();
  if (education && education.trim())
    extraMatch["ud.education"] = new RegExp(escapeRegex(education.trim()), "i");
  if (occupation && occupation.trim())
    extraMatch["ud.occupation"] = new RegExp(
      escapeRegex(occupation.trim()),
      "i",
    );
  if (vanshId && mongoose.Types.ObjectId.isValid(vanshId))
    extraMatch["ud.vansh"] = new mongoose.Types.ObjectId(vanshId);
  if (kulId && mongoose.Types.ObjectId.isValid(kulId))
    extraMatch["ud.kul"] = new mongoose.Types.ObjectId(kulId);
  if (khampId && mongoose.Types.ObjectId.isValid(khampId))
    extraMatch["ud.khamp"] = new mongoose.Types.ObjectId(khampId);
  if (gotraId && mongoose.Types.ObjectId.isValid(gotraId))
    extraMatch["ud.gotra"] = new mongoose.Types.ObjectId(gotraId);
  if (countryId && mongoose.Types.ObjectId.isValid(countryId))
    extraMatch["ud.countryId"] = new mongoose.Types.ObjectId(countryId);
  if (stateId && mongoose.Types.ObjectId.isValid(stateId))
    extraMatch["ud.stateId"] = new mongoose.Types.ObjectId(stateId);
  if (districtId && mongoose.Types.ObjectId.isValid(districtId))
    extraMatch["ud.districtId"] = new mongoose.Types.ObjectId(districtId);
  if (villageId && mongoose.Types.ObjectId.isValid(villageId))
    extraMatch["ud.villageId"] = new mongoose.Types.ObjectId(villageId);

  if (Object.keys(extraMatch).length > 0) {
    pipeline.push({ $match: extraMatch });
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
    pipeline.push({
      $match: {
        $or: [
          { "u.name": searchRegex },
          { "u.email": searchRegex },
          { "u.phone": searchRegex },
          { "u.memberId": searchRegex },
        ],
      },
    });
  }

  if (ageMin != null && ageMin !== "" && !Number.isNaN(Number(ageMin))) {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - Number(ageMin));
    pipeline.push({ $match: { "ud.dob": { $lte: minDate } } });
  }
  if (ageMax != null && ageMax !== "" && !Number.isNaN(Number(ageMax))) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - Number(ageMax) - 1);
    pipeline.push({ $match: { "ud.dob": { $gte: maxDate } } });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  const skip = (Number(page) - 1) * Number(limit);
  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: Number(limit) || 20 },
  );

  pipeline.push({
    $lookup: {
      from: "communities",
      localField: "communityId",
      foreignField: "_id",
      as: "community",
    },
  });
  pipeline.push({
    $unwind: { path: "$community", preserveNullAndEmptyArrays: true },
  });
  pipeline.push({
    $project: {
      _id: 1,
      userId: 1,
      userDetailsId: 1,
      communityId: 1,
      status: 1,
      isActive: 1,
      createdAt: 1,
      updatedAt: 1,
      user: {
        name: "$u.name",
        phone: "$u.phone",
        email: "$u.email",
        memberId: "$u.memberId",
      },
      userDetails: "$ud",
      community: { _id: "$community._id", name: "$community.name" },
    },
  });

  const [countResult, list] = await Promise.all([
    Matrimonial.aggregate(countPipeline),
    Matrimonial.aggregate(pipeline),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    list,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / (Number(limit) || 20)) || 0,
    },
  };
}

/**
 * Fallback: if my_community returned 0 results, call again with communityScope=all.
 */
async function getListWithFallback(userId, options = {}) {
  const opts = {
    ...options,
    communityScope: options.communityScope || "my_community",
  };
  const result = await getList(userId, opts);
  if (
    result.list.length === 0 &&
    opts.communityScope === "my_community" &&
    userId
  ) {
    return getList(userId, { ...opts, communityScope: "all" });
  }
  return result;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get full profile by matrimonial id. Populates user, userDetails (with refs), community.
 */
async function getProfileById(matrimonialId, requestingUserId) {
  if (!matrimonialId || !mongoose.Types.ObjectId.isValid(matrimonialId))
    return null;
  const doc = await Matrimonial.findOne({
    _id: new mongoose.Types.ObjectId(matrimonialId),
    status: ACTIVE_STATUS_QUERY,
    isActive: true,
  })
    .populate("userId", "name phone email memberId")
    .populate({
      path: "userDetailsId",
      populate: [
        { path: "community", select: "name" },
        { path: "vansh", select: "name" },
        { path: "kul", select: "name" },
        { path: "khamp", select: "name" },
        { path: "gotra", select: "name" },
        { path: "countryId", select: "name" },
        { path: "stateId", select: "name" },
        { path: "districtId", select: "name" },
        { path: "villageId", select: "name" },
      ],
    })
    .populate("communityId", "name")
    .lean();

  if (!doc) return null;

  const profile = {
    ...doc,
    user: doc.userId,
    userDetails: doc.userDetailsId,
    community: doc.communityId,
  };
  delete profile.userId;
  delete profile.userDetailsId;
  delete profile.communityId;
  return profile;
}

/**
 * Record that a user viewed a matrimonial profile.
 */
async function recordProfileView(matrimonialId, viewedByUserId) {
  if (
    !matrimonialId ||
    !viewedByUserId ||
    !mongoose.Types.ObjectId.isValid(matrimonialId)
  )
    return;
  const mat = await Matrimonial.findOne({
    _id: new mongoose.Types.ObjectId(matrimonialId),
    status: ACTIVE_STATUS_QUERY,
    isActive: true,
  });
  if (!mat) return;
  const view = new MatrimonialProfileView({
    matrimonialId: mat._id,
    viewedByUserId,
    viewedAt: new Date(),
  });
  await view.save();
}

// ---------- Admin ----------

async function adminList(filters = {}) {
  const {
    page = 1,
    limit = 20,
    communityId,
    gender,
    search,
    isActive,
    vanshId,
    kulId,
    khampId,
    gotraId,
    maritalStatus,
    countryId,
    stateId,
    districtId,
  } = filters;

  const query = { status: ACTIVE_STATUS_QUERY };
  if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
    query.communityId = new mongoose.Types.ObjectId(communityId);
  }
  if (isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true" || isActive === true;
  }

  let aggregatePipeline = [
    { $match: query },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "user_details",
        localField: "userDetailsId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "communities",
        localField: "communityId",
        foreignField: "_id",
        as: "community",
      },
    },
    { $unwind: { path: "$community", preserveNullAndEmptyArrays: true } },
  ];

  const extraMatch = {};
  if (gender) extraMatch["userDetails.gender"] = gender;
  if (maritalStatus) extraMatch["userDetails.maritalStatus"] = maritalStatus;
  if (vanshId && mongoose.Types.ObjectId.isValid(vanshId))
    extraMatch["userDetails.vansh"] = new mongoose.Types.ObjectId(vanshId);
  if (kulId && mongoose.Types.ObjectId.isValid(kulId))
    extraMatch["userDetails.kul"] = new mongoose.Types.ObjectId(kulId);
  if (khampId && mongoose.Types.ObjectId.isValid(khampId))
    extraMatch["userDetails.khamp"] = new mongoose.Types.ObjectId(khampId);
  if (gotraId && mongoose.Types.ObjectId.isValid(gotraId))
    extraMatch["userDetails.gotra"] = new mongoose.Types.ObjectId(gotraId);
  if (countryId && mongoose.Types.ObjectId.isValid(countryId))
    extraMatch["userDetails.countryId"] = new mongoose.Types.ObjectId(
      countryId,
    );
  if (stateId && mongoose.Types.ObjectId.isValid(stateId))
    extraMatch["userDetails.stateId"] = new mongoose.Types.ObjectId(stateId);
  if (districtId && mongoose.Types.ObjectId.isValid(districtId))
    extraMatch["userDetails.districtId"] = new mongoose.Types.ObjectId(
      districtId,
    );
  if (Object.keys(extraMatch).length > 0) {
    aggregatePipeline.push({ $match: extraMatch });
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    aggregatePipeline.push({
      $match: {
        $or: [
          { "user.name": searchRegex },
          { "user.email": searchRegex },
          { "user.phone": searchRegex },
          { "user.memberId": searchRegex },
        ],
      },
    });
  }

  const skip = (Number(page) - 1) * Number(limit);
  const countPipeline = [...aggregatePipeline, { $count: "total" }];
  aggregatePipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: Number(limit) },
  );

  const [countResult, list] = await Promise.all([
    Matrimonial.aggregate(countPipeline),
    Matrimonial.aggregate(aggregatePipeline),
  ]);

  const total = countResult[0]?.total || 0;

  return {
    list,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 0,
    },
    statistics: {
      total: await Matrimonial.countDocuments({ status: ACTIVE_STATUS_QUERY }),
      active: await Matrimonial.countDocuments({
        status: ACTIVE_STATUS_QUERY,
        isActive: true,
      }),
      inactive: await Matrimonial.countDocuments({
        status: ACTIVE_STATUS_QUERY,
        isActive: false,
      }),
    },
  };
}

async function adminGetById(id) {
  const doc = await Matrimonial.findById(id)
    .populate("userId", "name phone email memberId status")
    .populate({
      path: "userDetailsId",
      populate: [
        { path: "community", select: "name" },
        { path: "vansh", select: "name" },
        { path: "kul", select: "name" },
        { path: "khamp", select: "name" },
        { path: "gotra", select: "name" },
        { path: "countryId", select: "name" },
        { path: "stateId", select: "name" },
        { path: "districtId", select: "name" },
        { path: "villageId", select: "name" },
      ],
    })
    .populate("communityId", "name")
    .lean();
  return doc || null;
}

/**
 * Admin: update matrimonial (isActive) and/or user details for data correction.
 */
async function adminUpdate(id, payload) {
  const mat = await Matrimonial.findById(id);
  if (!mat) return { error: "Matrimonial profile not found" };

  if (payload.isActive !== undefined) mat.isActive = !!payload.isActive;
  await mat.save();

  const userId = mat.userId;
  const userDetailsId = mat.userDetailsId;

  const allowedDetails = [
    "dob",
    "gender",
    "fatherName",
    "motherName",
    "height",
    "weight",
    "address",
    "countryId",
    "stateId",
    "districtId",
    "villageId",
    "community",
    "vansh",
    "kul",
    "khamp",
    "gotra",
    "maritalStatus",
    "education",
    "occupation",
    "whatsappContact",
  ];
  const detailUpdates = {};
  for (const key of allowedDetails) {
    if (payload[key] !== undefined) detailUpdates[key] = payload[key];
  }
  if (Object.keys(detailUpdates).length > 0) {
    await UserDetails.updateOne(
      { _id: userDetailsId },
      { $set: detailUpdates },
    );
  }

  const allowedUser = ["name", "phone"];
  const userUpdates = {};
  for (const key of allowedUser) {
    if (payload[key] !== undefined) userUpdates[key] = payload[key];
  }
  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: userId }, { $set: userUpdates });
  }

  return {
    matrimonial: await Matrimonial.findById(id)
      .populate("userId")
      .populate("userDetailsId")
      .populate("communityId")
      .lean(),
  };
}

/**
 * Admin: hard delete matrimonial profile.
 */
async function adminDelete(id) {
  const result = await Matrimonial.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    return { error: "Matrimonial profile not found" };
  }
  return { deleted: true };
}

/**
 * Get view history for a matrimonial profile (admin or profile owner).
 */
async function getProfileViewHistory(matrimonialId, limit = 50) {
  if (!matrimonialId || !mongoose.Types.ObjectId.isValid(matrimonialId))
    return [];
  const views = await MatrimonialProfileView.find({
    matrimonialId: new mongoose.Types.ObjectId(matrimonialId),
  })
    .sort({ viewedAt: -1 })
    .limit(Number(limit))
    .populate("viewedByUserId", "name phone memberId")
    .lean();
  return views;
}

module.exports = {
  applyForMatrimonial,
  getMatrimonialByUserId,
  updateMatrimonial,
  activateMatrimonial,
  deactivateMatrimonial,
  deleteMatrimonial,
  getList,
  getListWithFallback,
  getProfileById,
  recordProfileView,
  getProfileViewHistory,
  adminList,
  adminGetById,
  adminUpdate,
  adminDelete,
  ageFromDob,
};
