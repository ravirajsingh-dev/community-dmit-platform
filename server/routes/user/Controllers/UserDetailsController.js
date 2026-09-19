const UserDetails = require("../../../models/UserDetails");
const User = require("../../../models/User");
const response = require("../../../config/response");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const { EDUCATION_VALUES } = require("../../../config/educationConstants");

// Get user details
module.exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    const userDetails = await UserDetails.findOne({ userId })
      .populate("userId", "name phone email memberId")
      .lean();

    if (!userDetails) {
      return response.successResponse(res, null, "User details not found");
    }

    return response.successResponse(res, userDetails, "User details");
  } catch (err) {
    console.error(err.message);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

// Create or update user details
module.exports.createOrUpdateUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    const {
      dob,
      gender,
      fatherName,
      motherName,
      height,
      weight,
      address,
      nativeVillage,
      district,
      state,
      country,
      caste,
      clan,
      maritalStatus,
      education,
      occupation,
      occupationDetails: occupationDetailsRaw,
      bloodGroup,
      whatsappContact,
    } = req.body;

    const occupationTrimmed = occupation
      ? String(occupation).trim()
      : undefined;

    if (
      education !== undefined &&
      education !== null &&
      education !== "" &&
      !EDUCATION_VALUES.includes(String(education).trim())
    ) {
      return response.errorResponse(
        res,
        [
          {
            path: "education",
            msg: "Education must be one of the allowed dropdown values",
          },
        ],
        "Validation Error",
        400,
      );
    }
    const educationTrimmed =
      education != null && education !== ""
        ? String(education).trim()
        : undefined;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Check if user details already exist
    let userDetails = await UserDetails.findOne({ userId });
    const builtOccupationDetails = buildOccupationDetails(
      occupationTrimmed,
      occupationDetailsRaw,
    );
    const userDetailsData = {
      userId,
      dob: dob || undefined,
      gender: gender || undefined,
      fatherName: fatherName || undefined,
      motherName: motherName || undefined,
      height:
        height !== undefined && height !== "" && height !== null
          ? Number(height)
          : undefined,
      weight:
        weight !== undefined && weight !== "" && weight !== null
          ? Number(weight)
          : undefined,
      address: address || undefined,
      nativeVillage: nativeVillage || undefined,
      district: district || undefined,
      state: state || undefined,
      country: country || "IN",
      caste: caste || undefined,
      clan: clan || undefined,
      maritalStatus: maritalStatus || undefined,
      education: educationTrimmed || undefined,
      occupation: occupationTrimmed || undefined,
      occupationDetails: builtOccupationDetails,
      bloodGroup: bloodGroup || undefined,
      whatsappContact: whatsappContact || undefined,
    };

    if (userDetails) {
      // Update existing user details
      userDetails = await UserDetails.findOneAndUpdate(
        { userId },
        { $set: userDetailsData },
        { returnDocument: "after", runValidators: true },
      )
        .populate("userId", "name phone email memberId")
        .lean();
    } else {
      // Create new user details
      userDetails = new UserDetails(userDetailsData);
      await userDetails.save();
      userDetails = await UserDetails.findById(userDetails._id)
        .populate("userId", "name phone email memberId")
        .lean();
    }

    return response.successResponse(
      res,
      userDetails,
      userDetails._id
        ? "User details updated successfully"
        : "User details created successfully",
    );
  } catch (err) {
    console.error("Error in createOrUpdateUserDetails:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: error.message,
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

// Get combined User + UserDetails
module.exports.getUserWithDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    const user = await User.findById(userId)
      .select("-password -passwordCopy")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    const userDetails = await UserDetails.findOne({ userId }).lean();

    const userData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(res, userData, "User with details");
  } catch (err) {
    console.error(err.message);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};
