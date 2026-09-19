/**
 * User Designation Controller - Phase-1
 *
 * GET /api/users/designations/eligibility
 * POST /api/users/designations/apply
 * GET /api/users/designations/downline/:designationCode
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getEligibilityForAll,
  applyForDesignation,
  getDownlineWithDesignation,
} = require("../../../services/designationService");
const UserDetails = require("../../../models/UserDetails");
const { isUserSbiProLocked } = require("../../../services/sbiProSessionService");
const Appointment = require("../../../models/Appointment");
const mongoose = require("mongoose");

/**
 * GET /api/users/designations/eligibility
 * Return all designation configs with eligible, reason, alreadyApplied, currentStatus
 * Includes isSbiProLocked: true if user has completed SBI PRO (Designation 1) - cannot book again
 * Q3.2 A, Q3.4 A: showForBooking - hide designations until required designation flow complete
 */
async function getEligibility(req, res) {
  try {
    const userId = req.user.id;
    const User = require("../../../models/User");
    const WalletSettings = require("../../../models/WalletSettings");

    const [result, isSbiProLocked, userDoc, settings, userDetails] = await Promise.all([
      getEligibilityForAll(userId),
      isUserSbiProLocked(userId),
      User.findById(userId).select("createdAt freeAppointmentsUsed").lean(),
      WalletSettings.getOrCreateSettings(),
      UserDetails.findOne({ userId }).select(
        "address countryId stateId districtId villageId",
      ).lean(),
    ]);

    const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const approvedDesignationDocs = await require("../../../models/UserDesignation").find({
      userId: uid,
      status: "APPROVED",
    }).select("designationCode online forceAssigned").lean();

    const approvedOnlineByCode = new Map(
      (approvedDesignationDocs || []).map((d) => [d.designationCode, d.online]),
    );

    // Q3: Add showForBooking and online - hide Counsellor etc until Trainer complete; online from user_designations
    const designationsWithBooking = await Promise.all(
      (result.designations || []).map(async (d) => {
        const reqCode = d.requiredDesignationCode ?? null;
        let showForBooking = true;
        if (reqCode != null) {
          const completed = await Appointment.countDocuments({
            requesterId: uid,
            designationCode: reqCode,
            status: "COMPLETED",
          });
          showForBooking = completed >= 1;
        }
        const online =
          d.alreadyApplied && d.currentStatus === "APPROVED"
            ? !!approvedOnlineByCode.get(d.designationCode)
            : false;
        return {
          ...d,
          showForBooking,
          online,
        };
      })
    );
    const resultWithBooking = { ...result, designations: designationsWithBooking };
    const freePerUser = settings?.freeAppointmentsPerUser ?? 0;
    const used = userDoc?.freeAppointmentsUsed ?? 0;
    const remaining = Math.max(0, freePerUser - used);
    const expiryMonths = settings?.freeSessionExpiryMonths ?? 12;
    const regDate = userDoc?.createdAt ? new Date(userDoc.createdAt) : new Date();
    const expiryDate = new Date(regDate);
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
    const freeSessionInfo = {
      remaining,
      total: freePerUser,
      used,
      expiryDate: expiryDate.toISOString().slice(0, 10),
    };

    const hasCompleteAddress =
      !!userDetails &&
      !!userDetails.address &&
      !!userDetails.countryId &&
      !!userDetails.stateId &&
      !!userDetails.districtId &&
      !!userDetails.villageId;

    return response.successResponse(
      res,
      { ...resultWithBooking, isSbiProLocked, freeSessionInfo, hasCompleteAddress },
      "Eligibility retrieved",
    );
  } catch (err) {
    console.error("getEligibility error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch eligibility" }],
      "Failed to fetch eligibility",
      500
    );
  }
}

/**
 * POST /api/users/designations/apply
 * Body: { designationCode: number }
 */
async function apply(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation failed",
        400
      );
    }

    const userId = req.user.id;
    const { designationCode } = req.body;

    const userDetails = await UserDetails.findOne({ userId })
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
            msg: "Please complete your Address Details (country, state, district, village, current address) in your profile before applying for any designation.",
          },
        ],
        "Address details are required before applying for designation",
        400,
      );
    }

    const result = await applyForDesignation(userId, designationCode);

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400
      );
    }

    return response.successResponse(res, {}, "Designation application submitted");
  } catch (err) {
    console.error("apply error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to apply" }],
      "Failed to apply",
      500
    );
  }
}

/**
 * GET /api/users/designations/downline/:designationCode
 * Paginated downline users with approved designation
 */
async function getDownline(req, res) {
  try {
    const userId = req.user.id;
    const designationCode = parseInt(req.params.designationCode, 10);

    if (Number.isNaN(designationCode) || designationCode < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid designationCode" }],
        "Invalid designationCode",
        400
      );
    }

    const result = await getDownlineWithDesignation(
      userId,
      designationCode,
      req.query
    );

    return response.successResponse(
      res,
      { users: result.users, pagination: result.pagination },
      "Downline with designation retrieved"
    );
  } catch (err) {
    console.error("getDownline error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch downline" }],
      "Failed to fetch downline",
      500
    );
  }
}

module.exports = {
  getEligibility,
  apply,
  getDownline,
};
