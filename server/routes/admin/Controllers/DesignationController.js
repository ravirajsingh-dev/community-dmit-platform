/**
 * Admin Designation Controller - Phase-1 (Unified)
 *
 * GET /api/admin/designations?status=&designationCode=&page=&limit=
 * POST /api/admin/designations/decision (approve/reject)
 * POST /api/admin/designations/inactive
 * POST /api/admin/designations/delete (soft delete)
 */

const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const User = require("../../../models/User");
const {
  getDesignationApplications,
  getDesignationRatingReviews,
  getDesignationSummary,
  applyForDesignation,
  processDesignationDecision,
  setDesignationInactive,
  setDesignationAvailability,
  setDesignationDeleted,
  transitionDesignationStatus,
} = require("../../../services/designationService");
const { parsePaginationParams, MAX_LIMIT } = require("../../../utils/pagination");
const UserDetails = require("../../../models/UserDetails");

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "INACTIVE", "ALL"];

/**
 * GET /api/admin/designations
 * Query:
 * status, designationCode, page, limit (max 100)
 * plus optional filters: memberId, name, phone, email, hasRemarks,
 * hasReviews, minAvgRating, minTotalRatings, appliedFrom/appliedTo, decidedFrom/decidedTo,
 * countryId/stateId/districtId/villageId
 */
async function listDesignations(req, res) {
  try {
    const {
      status = "PENDING",
      designationCode,
      page,
      limit,
      memberId,
      name,
      phone,
      email,
      countryId,
      stateId,
      districtId,
      villageId,
      hasRemarks,
      hasReviews,
      minAvgRating,
      minTotalRatings,
      appliedFrom,
      appliedTo,
      decidedFrom,
      decidedTo,
      online,
      includeSummary,
    } = req.query;

    const statusUpper = (status || "PENDING").toString().toUpperCase();
    if (!VALID_STATUSES.includes(statusUpper)) {
      return response.errorResponse(
        res,
        [{ msg: `Invalid status. Use: ${VALID_STATUSES.join(", ")}` }],
        "Validation failed",
        400,
      );
    }

    const options = parsePaginationParams({ page, limit });
    if (options.limit > MAX_LIMIT) {
      options.limit = MAX_LIMIT;
      options.skip = (options.page - 1) * MAX_LIMIT;
    }
    if (designationCode != null) {
      const code = parseInt(designationCode, 10);
      if (!Number.isNaN(code)) options.designationCode = code;
    }

    if (memberId != null) options.memberId = memberId;
    if (name != null) options.name = name;
    if (phone != null) options.phone = phone;
    if (email != null) options.email = email;
    if (countryId != null) options.countryId = countryId;
    if (stateId != null) options.stateId = stateId;
    if (districtId != null) options.districtId = districtId;
    if (villageId != null) options.villageId = villageId;
    if (hasRemarks != null) options.hasRemarks = hasRemarks === "true" || hasRemarks === "1";
    if (hasReviews != null) options.hasReviews = hasReviews === "true" || hasReviews === "1";
    if (minAvgRating != null) {
      const m = parseFloat(minAvgRating);
      if (!Number.isNaN(m)) options.minAvgRating = m;
    }
    if (minTotalRatings != null) {
      const m = parseInt(minTotalRatings, 10);
      if (!Number.isNaN(m)) options.minTotalRatings = m;
    }
    if (appliedFrom != null) options.appliedFrom = appliedFrom;
    if (appliedTo != null) options.appliedTo = appliedTo;
    if (decidedFrom != null) options.decidedFrom = decidedFrom;
    if (decidedTo != null) options.decidedTo = decidedTo;
    if (online != null) options.online = online === "true" || online === true;

    const result = await getDesignationApplications(statusUpper, options);
    const shouldIncludeSummary =
      includeSummary === "1" || includeSummary === "true" || includeSummary === true;

    const summary = shouldIncludeSummary
      ? await getDesignationSummary(options)
      : undefined;

    return response.successResponse(
      res,
      {
        applications: result.applications,
        pagination: result.pagination,
        ...(summary ? { summary } : {}),
      },
      "Designations retrieved",
    );
  } catch (err) {
    console.error("listDesignations error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch designations" }],
      "Failed to fetch designations",
      500,
    );
  }
}

/**
 * GET /api/admin/designations/reviews
 * Query: userId, designationCode, page, limit
 */
async function listDesignationRatingReviews(req, res) {
  try {
    const { userId, designationCode, page, limit } = req.query;

    if (!userId || designationCode == null) {
      return response.errorResponse(
        res,
        [{ msg: "userId and designationCode are required" }],
        "Validation failed",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "userId must be a valid ObjectId" }],
        "Validation failed",
        400,
      );
    }

    const options = parsePaginationParams({ page, limit });
    if (options.limit > MAX_LIMIT) {
      options.limit = MAX_LIMIT;
      options.skip = (options.page - 1) * MAX_LIMIT;
    }

    const result = await getDesignationRatingReviews(userId, designationCode, options);

    return response.successResponse(
      res,
      {
        reviews: result.reviews,
        pagination: result.pagination,
      },
      "Designation rating reviews retrieved",
    );
  } catch (err) {
    console.error("listDesignationRatingReviews error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch designation rating reviews" }],
      "Failed to fetch designation rating reviews",
      500,
    );
  }
}

/**
 * GET /api/admin/designations/summary
 * Summary counts per designation status.
 * Uses the same filters as listDesignations except `status` and pagination.
 */
async function getDesignationSummaryController(req, res) {
  try {
    const {
      designationCode,
      memberId,
      name,
      phone,
      email,
      countryId,
      stateId,
      districtId,
      villageId,
      hasRemarks,
      appliedFrom,
      appliedTo,
      decidedFrom,
      decidedTo,
      online,
    } = req.query;

    const options = {};

    if (designationCode != null) {
      const code = parseInt(designationCode, 10);
      if (!Number.isNaN(code)) options.designationCode = code;
    }

    if (memberId != null) options.memberId = memberId;
    if (name != null) options.name = name;
    if (phone != null) options.phone = phone;
    if (email != null) options.email = email;
    if (countryId != null) options.countryId = countryId;
    if (stateId != null) options.stateId = stateId;
    if (districtId != null) options.districtId = districtId;
    if (villageId != null) options.villageId = villageId;
    if (hasRemarks != null) {
      options.hasRemarks = hasRemarks === "true" || hasRemarks === "1" || hasRemarks === true;
    }
    if (appliedFrom != null) options.appliedFrom = appliedFrom;
    if (appliedTo != null) options.appliedTo = appliedTo;
    if (decidedFrom != null) options.decidedFrom = decidedFrom;
    if (decidedTo != null) options.decidedTo = decidedTo;
    if (online != null) options.online = online === "true" || online === true;

    const summary = await getDesignationSummary(options);

    return response.successResponse(res, { summary }, "Designations summary retrieved");
  } catch (err) {
    console.error("getDesignationSummary error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch designation summary" }],
      "Failed to fetch designation summary",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/decision
 * Body: { userId, designationCode, decision: "approve"|"reject", remarks }
 */
async function decision(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { userId, designationCode, designationEntryId, decision, remarks } = req.body;
    const adminId = req.user.id;

    if (!userId || designationCode == null) {
      return response.errorResponse(
        res,
        [{ msg: "userId and designationCode are required" }],
        "Validation failed",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "userId must be a valid ObjectId" }],
        "Validation failed",
        400,
      );
    }

    const normalizedDecision =
      typeof decision === "string" ? decision.toLowerCase() : decision;
    const validDecision = ["approve", "reject", "approved", "rejected"].includes(
      normalizedDecision,
    );
    if (!validDecision) {
      return response.errorResponse(
        res,
        [{ msg: "decision must be 'approve' or 'reject'" }],
        "Validation failed",
        400,
      );
    }

    const serviceDecision =
      normalizedDecision === "approved" || normalizedDecision === "approve"
        ? "approve"
        : "reject";

    const result = await processDesignationDecision(
      userId,
      designationCode,
      serviceDecision,
      remarks || "",
      adminId,
      designationEntryId || null,
    );

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
      );
    }

    return response.successResponse(
      res,
      {},
      serviceDecision === "approve" ? "Designation approved" : "Designation rejected",
    );
  } catch (err) {
    console.error("decision error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to process decision" }],
      "Failed to process decision",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/inactive
 * Body: { userId, designationCode, remarks }
 */
async function setInactive(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { userId, designationCode, designationEntryId, remarks } = req.body;
    const adminId = req.user.id;

    if (!userId || designationCode == null) {
      return response.errorResponse(
        res,
        [{ msg: "userId and designationCode are required" }],
        "Validation failed",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "userId must be a valid ObjectId" }],
        "Validation failed",
        400,
      );
    }

    const result = await setDesignationInactive(
      userId,
      designationCode,
      remarks || "",
      adminId,
      designationEntryId || null,
    );

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
      );
    }

    return response.successResponse(res, {}, "Designation set to inactive");
  } catch (err) {
    console.error("setInactive error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to set inactive" }],
      "Failed to set inactive",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/delete
 * Body: { userId, designationCode, remarks } - remarks required
 * Soft delete: sets status to DELETED
 */
async function setDeleted(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { userId, designationCode, designationEntryId, remarks } = req.body;
    const adminId = req.user.id;

    if (!userId || designationCode == null) {
      return response.errorResponse(
        res,
        [{ msg: "userId and designationCode are required" }],
        "Validation failed",
        400,
      );
    }

    if (!remarks?.trim()) {
      return response.errorResponse(
        res,
        [{ msg: "Remarks are required for delete" }],
        "Validation failed",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "userId must be a valid ObjectId" }],
        "Validation failed",
        400,
      );
    }

    const result = await setDesignationDeleted(
      userId,
      designationCode,
      remarks.trim(),
      adminId,
      designationEntryId || null,
    );

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
      );
    }

    return response.successResponse(res, {}, "Designation soft deleted");
  } catch (err) {
    console.error("setDeleted error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to delete designation" }],
      "Failed to delete designation",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/transition
 * Body: { userId, designationCode, toStatus, remarks }
 * For REJECTED->APPROVED, INACTIVE->APPROVED (remarks optional)
 */
async function transition(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { userId, designationCode, designationEntryId, toStatus, remarks } = req.body;
    const adminId = req.user.id;

    if (!userId || designationCode == null || !toStatus) {
      return response.errorResponse(
        res,
        [{ msg: "userId, designationCode, and toStatus are required" }],
        "Validation failed",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ msg: "userId must be a valid ObjectId" }],
        "Validation failed",
        400,
      );
    }

    const result = await transitionDesignationStatus(
      userId,
      designationCode,
      toStatus.toUpperCase(),
      remarks || "",
      adminId,
      designationEntryId || null,
    );

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400,
      );
    }

    return response.successResponse(res, {}, `Designation status updated to ${toStatus}`);
  } catch (err) {
    console.error("transition error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to transition status" }],
      "Failed to transition status",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/assign-direct
 * Admin directly assigns designation to any user by `memberId`,
 * while verifying admin `txn_password` (middleware) and enforcing
 * eligibility rules (via apply + approve services).
 *
 * Body: { memberId, designationCode }
 */
async function assignDirect(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { memberId, designationCode } = req.body;
    const adminId = req.user.id;

    if (!memberId || designationCode == null) {
      return response.errorResponse(
        res,
        [{ msg: "memberId and designationCode are required" }],
        "Validation failed",
        400,
      );
    }

    const member = await User.findOne({ memberId: memberId.trim() })
      .select("_id")
      .lean();

    if (!member) {
      return response.errorResponse(
        res,
        [{ msg: "Member not found" }],
        "Member not found",
        404,
      );
    }

    const userDetails = await UserDetails.findOne({ userId: member._id })
      .select("address countryId stateId districtId villageId")
      .lean();

    const hasCompleteAddress =
      !!userDetails &&
      !!userDetails.address &&
      !!userDetails.countryId &&
      !!userDetails.stateId &&
      !!userDetails.districtId &&
      !!userDetails.villageId;

    if (!hasCompleteAddress) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Address Details are incomplete for this member. Please update country, state, district, village and current address in the user profile before assigning any designation.",
          },
        ],
        "Address details are required before assigning designation",
        400,
      );
    }

    const applied = await applyForDesignation(member._id, designationCode, {
      skipEligibility: true,
    });
    if (!applied?.success) {
      return response.errorResponse(
        res,
        [{ msg: applied?.reason || "Failed to apply designation" }],
        applied?.reason || "Failed to apply designation",
        400,
      );
    }

    const approved = await transitionDesignationStatus(
      member._id,
      designationCode,
      "APPROVED",
      "",
      adminId,
      null,
    );

    if (!approved?.success) {
      return response.errorResponse(
        res,
        [{ msg: approved?.reason || "Failed to approve designation" }],
        approved?.reason || "Failed to approve designation",
        400,
      );
    }

    return response.successResponse(
      res,
      {},
      "Designation assigned successfully",
    );
  } catch (err) {
    console.error("assignDirect error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to assign designation" }],
      "Failed to assign designation",
      500,
    );
  }
}

/**
 * POST /api/admin/designations/availability
 * Body: { userId, designationCode, designationEntryId?, online: boolean }
 */
async function setAvailability(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { userId, designationCode, designationEntryId, online } = req.body;
    const adminId = req.user.id;

    const result = await setDesignationAvailability(
      userId,
      designationCode,
      designationEntryId || null,
      online,
      adminId,
    );

    if (!result.success) {
      return response.errorResponse(res, [{ msg: result.reason }], result.reason, 400);
    }

    return response.successResponse(
      res,
      { online: result.online },
      "Availability updated",
    );
  } catch (err) {
    console.error("setAvailability error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to update availability" }],
      "Failed to update availability",
      500,
    );
  }
}

module.exports = {
  listDesignations,
  listDesignationRatingReviews,
  getDesignationSummaryController,
  decision,
  setInactive,
  setDeleted,
  transition,
  assignDirect,
  setAvailability,
};
