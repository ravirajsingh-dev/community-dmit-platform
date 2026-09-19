const { validateReferralId } = require("../../../../services/referralService");
const response = require("../../../../config/response");

/**
 * GET /api/auth/users/validate-referral
 * Validate referral ID and return referrer information
 */
const validateReferral = async (req, res) => {
  try {
    const { referralId } = req.query;

    if (!referralId) {
      return response.errorResponse(
        res,
        [{ msg: "Referral ID is required" }],
        "Validation Error",
        400,
      );
    }

    const validation = await validateReferralId(referralId);

    if (!validation.valid) {
      return response.errorResponse(
        res,
        [{ msg: validation.message }],
        validation.message,
        400,
      );
    }

    // Return referrer name
    return response.successResponse(res, {
      valid: true,
      referrerName: validation.referrer.name,
      referrerMemberId: validation.referrer.memberId,
    });
  } catch (error) {
    console.error("Error validating referral:", error);
    return response.errorResponse(
      res,
      [{ msg: "Error validating referral ID" }],
      "Internal Server Error",
      500,
    );
  }
};

module.exports = {
  validateReferral,
};
