const response = require("../../../config/response");
const {
  adminList,
  adminGetById,
  adminUpdate,
  adminDelete,
} = require("../../../services/matrimonial/matrimonialService");
const {
  logSecurityEvent,
  EVENT_TYPES,
} = require("../../../utils/auditLogger");

/**
 * GET /api/admin/matrimonial/applications
 * List all matrimonial profiles with filters. No approval status.
 */
const getAllApplications = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      communityId: req.query.communityId,
      gender: req.query.gender,
      search: req.query.search,
      isActive: req.query.isActive,
      vanshId: req.query.vanshId,
      kulId: req.query.kulId,
      khampId: req.query.khampId,
      gotraId: req.query.gotraId,
      maritalStatus: req.query.maritalStatus,
      countryId: req.query.countryId,
      stateId: req.query.stateId,
      districtId: req.query.districtId,
    };
    const result = await adminList(filters);
    return response.successResponse(res, result, "Matrimonial profiles");
  } catch (err) {
    console.error("Error fetching matrimonial profiles:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch profiles" }],
      "Error fetching matrimonial profiles",
      500
    );
  }
};

/**
 * GET /api/admin/matrimonial/applications/:id
 * Get single profile by ID.
 */
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await adminGetById(id);
    if (!application) {
      return response.errorResponse(
        res,
        [{ msg: "Profile not found" }],
        "Not found",
        404
      );
    }
    return response.successResponse(res, application, "Matrimonial profile");
  } catch (err) {
    console.error("Error fetching matrimonial profile:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch profile" }],
      "Error fetching matrimonial profile",
      500
    );
  }
};

/**
 * PUT /api/admin/matrimonial/applications/:id
 * Edit any matrimonial profile (data correction). No approve/reject.
 */
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await adminUpdate(id, req.body);
    if (result.error) {
      return response.errorResponse(res, [{ msg: result.error }], result.error, 400);
    }
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_ACTION,
      status: "success",
      req,
      details: {
        action: "MATRIMONIAL_EDIT",
        applicationId: id,
        adminId: adminId?.toString?.(),
      },
    });
    return response.successResponse(res, result.matrimonial, "Profile updated");
  } catch (err) {
    console.error("Error updating matrimonial profile:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to update profile" }],
      "Error updating matrimonial profile",
      500
    );
  }
};

/**
 * DELETE /api/admin/matrimonial/applications/:id
 * Hard delete matrimonial profile. Permanent.
 */
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await adminDelete(id);
    if (result.error) {
      return response.errorResponse(res, [{ msg: result.error }], result.error, 400);
    }
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_ACTION,
      status: "success",
      req,
      details: {
        action: "MATRIMONIAL_DELETE",
        applicationId: id,
        adminId: adminId?.toString?.(),
      },
    });
    return response.successResponse(res, { deleted: true }, "Matrimonial profile deleted permanently");
  } catch (err) {
    console.error("Error deleting matrimonial profile:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to delete profile" }],
      "Error deleting matrimonial profile",
      500
    );
  }
};

module.exports = {
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
};
