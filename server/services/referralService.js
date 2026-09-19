const User = require("../models/User");

/**
 * Validate referral ID (Member ID)
 * @param {String} referralMemberId - Referral Member ID
 * @returns {Promise<{valid: Boolean, referrer: User|null, message: String}>}
 */
const validateReferralId = async (referralMemberId) => {
  try {
    if (!referralMemberId || typeof referralMemberId !== "string") {
      return {
        valid: false,
        referrer: null,
        message: "Referral ID is required",
      };
    }

    // Trim and normalize (case-insensitive)
    const normalizedMemberId = referralMemberId.trim().toUpperCase();
    if (!/^G\d{9}$/.test(normalizedMemberId)) {
      return {
        valid: false,
        referrer: null,
        message: "Invalid referral ID format",
      };
    }

    // Find referrer by Member ID
    const referrer = await User.findOne({ memberId: normalizedMemberId });

    if (!referrer) {
      return {
        valid: false,
        referrer: null,
        message: "Referral ID not found",
      };
    }

    // Allow sponsor if status = 1 (Active) OR status = 4 (New)
    if (![1, 4].includes(referrer.status)) {
      return {
        valid: false,
        referrer: null,
        message: "Sponsor is not allowed to refer",
      };
    }

    return {
      valid: true,
      referrer,
      message: "Referral ID is valid",
    };
  } catch (error) {
    console.error("Error validating referral ID:", error);
    return {
      valid: false,
      referrer: null,
      message: "Error validating referral ID",
    };
  }
};

module.exports = {
  validateReferralId,
};
