const response = require("../../../config/response");
const {
  applyForMatrimonial,
  getMatrimonialByUserId,
  updateMatrimonial,
  activateMatrimonial,
  deactivateMatrimonial,
  deleteMatrimonial,
  getListWithFallback,
  getProfileById,
  recordProfileView,
} = require("../../../services/matrimonial/matrimonialService");

module.exports.apply = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const result = await applyForMatrimonial(userId);
    if (result.error) {
      const statusCode = 400;
      return res.status(statusCode).json({
        status: false,
        message: result.error,
        errors: [{ msg: result.error }],
        missingFields: result.missingFields || [],
      });
    }
    return response.successResponse(res, result.matrimonial, "Matrimonial profile created. You are now visible in listings.");
  } catch (err) {
    console.error("Error applying for matrimonial:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const matrimonial = await getMatrimonialByUserId(userId);
    return response.successResponse(res, matrimonial, matrimonial ? "Matrimonial profile" : "No matrimonial profile");
  } catch (err) {
    console.error("Error fetching matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const result = await updateMatrimonial(userId, req.body);
    if (result.error) {
      return response.errorResponse(res, { msg: result.error }, result.error, 400);
    }
    return response.successResponse(res, result.matrimonial, "Profile updated");
  } catch (err) {
    console.error("Error updating matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports.activateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const result = await activateMatrimonial(userId);
    if (result.error) {
      return response.errorResponse(res, { msg: result.error }, result.error, 400);
    }
    return response.successResponse(res, result.matrimonial, "Matrimonial profile activated");
  } catch (err) {
    console.error("Error activating matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports.deactivateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const result = await deactivateMatrimonial(userId);
    if (result.error) {
      return response.errorResponse(res, { msg: result.error }, result.error, 400);
    }
    return response.successResponse(res, result.matrimonial, "Matrimonial profile deactivated");
  } catch (err) {
    console.error("Error deactivating matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports.deleteMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(res, { msg: "Invalid user ID" }, "Invalid user ID", 400);
    }
    const result = await deleteMatrimonial(userId);
    if (result.error) {
      return response.errorResponse(res, { msg: result.error }, result.error, 400);
    }
    return response.successResponse(res, { deleted: true }, "Matrimonial profile deleted permanently");
  } catch (err) {
    console.error("Error deleting matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/users/matrimonial/list
 * List matrimonial profiles. Works even if user has NOT applied.
 * Default: same community; fallback to all if none in community.
 * Query: page, limit, communityScope (my_community | all), communityId, vanshId, kulId, khampId, gotraId,
 * gender, maritalStatus, education, occupation, countryId, stateId, districtId, villageId, ageMin, ageMax, search.
 */
module.exports.getList = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const {
      page,
      limit,
      communityScope,
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
    } = req.query;

    const result = await getListWithFallback(userId, {
      page,
      limit,
      communityScope,
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
    });
    return response.successResponse(res, result, "Matrimonial listings");
  } catch (err) {
    console.error("Error fetching matrimonial list:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/users/matrimonial/profile/:id
 * Full profile view. Records view when requestingUserId is present.
 */
module.exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const profile = await getProfileById(id, userId);
    if (!profile) {
      return response.errorResponse(res, { msg: "Profile not found" }, "Profile not found", 404);
    }
    if (userId && userId !== profile.user?._id?.toString()) {
      recordProfileView(id, userId).catch(() => {});
    }
    return response.successResponse(res, profile, "Matrimonial profile");
  } catch (err) {
    console.error("Error fetching matrimonial profile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};
