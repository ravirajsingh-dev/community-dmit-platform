const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const Country = require("../../../models/Country");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const Gotra = require("../../../models/Gotra");
const mongoose = require("mongoose");
const {
  reservePhoneCapacity,
  releasePhoneCapacity,
} = require("../../../services/phoneLimitService");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const { EDUCATION_VALUES } = require("../../../config/educationConstants");

/**
 * GET /api/user/profile
 * Get complete user profile (User + UserDetails)
 * @access Private
 */
const getProfile = async (req, res) => {
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

    // Get user data (exclude sensitive fields)
    const user = await User.findById(userId)
      .select("-password -pwdRef -passwordCopy")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Get user details
    const userDetails = await UserDetails.findOne({ userId }).lean();

    // Populate labels for location and master data
    if (userDetails) {
      // Populate country label
      if (userDetails.countryId) {
        const country = await Country.findById(userDetails.countryId)
          .select("name status")
          .lean();
        if (country) {
          userDetails.countryLabel = country.name;
          userDetails.countryStatus = country.status;
        }
      }

      // Populate state label
      if (userDetails.stateId) {
        const state = await State.findById(userDetails.stateId)
          .select("name status")
          .lean();
        if (state) {
          userDetails.stateLabel = state.name;
          userDetails.stateStatus = state.status;

          // Populate district label
          if (userDetails.districtId) {
            const district = await District.findById(userDetails.districtId)
              .select("name status")
              .lean();
            if (district) {
              userDetails.districtLabel = district.name;
              userDetails.districtStatus = district.status;

              // Populate village label
              if (userDetails.villageId) {
                const village = await Village.findById(userDetails.villageId)
                  .select("name status")
                  .lean();
                if (village) {
                  userDetails.villageLabel = village.name;
                  userDetails.villageStatus = village.status;
                }
              }
            }
          }
        }
      }

      // Populate community label
      if (userDetails.community) {
        const community = await Community.findById(userDetails.community)
          .select("name status")
          .lean();
        if (community) {
          userDetails.communityLabel = community.name;
          userDetails.communityStatus = community.status;
        }
      }

      // Populate vansh label
      if (userDetails.vansh) {
        const vansh = await Vansh.findById(userDetails.vansh)
          .select("name status")
          .lean();
        if (vansh) {
          userDetails.vanshLabel = vansh.name;
          userDetails.vanshStatus = vansh.status;
        }
      }

      // Populate kul label
      if (userDetails.kul) {
        const kul = await Kul.findById(userDetails.kul)
          .select("name status")
          .lean();
        if (kul) {
          userDetails.kulLabel = kul.name;
          userDetails.kulStatus = kul.status;
        }
      }

      // Populate khamp label
      if (userDetails.khamp) {
        const khamp = await Khamp.findById(userDetails.khamp)
          .select("name status")
          .lean();
        if (khamp) {
          userDetails.khampLabel = khamp.name;
          userDetails.khampStatus = khamp.status;
        }
      }

      // Populate gotra label (hierarchy: Community → Vansh → Kul → Khamp → Gotra)
      if (userDetails.gotra) {
        const gotra = await Gotra.findById(userDetails.gotra)
          .select("name status")
          .lean();
        if (gotra) {
          userDetails.gotraLabel = gotra.name;
          userDetails.gotraStatus = gotra.status;
        }
      }
    }

    // Combine user and userDetails
    const profileData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(
      res,
      profileData,
      "Profile retrieved successfully",
    );
  } catch (err) {
    console.error("Error in getProfile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * PUT /api/user/profile
 * Update user profile (User + UserDetails)
 * Member ID is immutable. Phone may be updated (unique, 10 digits); memberId never from client.
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Map express-validator errors to consistent format with path and msg
      const formattedErrors = errors.array().map((error) => ({
        path: error.path || error.param || "unknown",
        msg: error.msg || error.message || "Validation failed",
      }));
      return response.errorResponse(
        res,
        formattedErrors,
        "Validation Error",
        400,
      );
    }

    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    const { memberId, phone: phoneFromBody, ...updateData } = req.body;

    if (memberId !== undefined) {
      return response.errorResponse(
        res,
        [{ path: "memberId", msg: "Member ID cannot be changed" }],
        "Invalid Update Request",
        400,
      );
    }

    // Get current user to verify existence
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    if (phoneFromBody !== undefined && phoneFromBody !== null) {
      const normalizedPhone = String(phoneFromBody).trim();
      if (normalizedPhone && normalizedPhone !== currentUser.phone) {
        const samePhoneUsersCount = await User.countDocuments({
          phone: normalizedPhone,
          _id: { $ne: userId },
        });
        if (samePhoneUsersCount >= 5) {
          return response.errorResponse(
            res,
            [{ path: "phone", msg: "Maximum 5 users allowed per phone number" }],
            "Validation Error",
            400,
          );
        }
      }
    }

    // Start transaction for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userIdObj = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;
      const userIdStr = String(userIdObj);

      // Separate User fields from UserDetails fields based on schema
      const userFields = {};
      const userDetailsFields = {};

      // Get schema paths for validation
      const userSchemaPaths = User.schema.paths;
      const userDetailsSchemaPaths = UserDetails.schema.paths;

      // Get allowed fields from schema
      const allowedUserFields = ["name", "email", "alternatePhone"];

      const allowedUserDetailsFieldsFromSchema = Object.keys(
        userDetailsSchemaPaths,
      ).filter(
        (key) =>
          !["_id", "__v", "createdAt", "updatedAt", "userId"].includes(key),
      );

      // UserDetails model fields (schema-defined; occupationDetails always allowed for subdocument)
      const baseUserDetailsFields = [
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
        "occupationDetails",
        "bloodGroup",
        "whatsappContact",
      ];
      const allowedUserDetailsFields = baseUserDetailsFields.filter(
        (field) =>
          allowedUserDetailsFieldsFromSchema.includes(field) ||
          field === "occupationDetails",
      );

      // Validate and separate fields - reject unknown fields
      const validationErrors = [];
      Object.keys(updateData).forEach((key) => {
        if (
          !allowedUserFields.includes(key) &&
          !allowedUserDetailsFields.includes(key)
        ) {
          validationErrors.push({
            path: key,
            msg: `Field '${key}' is not allowed`,
          });
        }
      });

      if (validationErrors.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return response.errorResponse(
          res,
          validationErrors,
          "Validation Error",
          400,
        );
      }

      // Validate and collect User fields
      Object.keys(updateData).forEach((key) => {
        if (allowedUserFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (allowedUserDetailsFields.includes(key)) {
          userDetailsFields[key] = updateData[key];
        }
      });

      // Validate name if provided
      if (userFields.name !== undefined) {
        const nameStr = userFields.name ? String(userFields.name).trim() : "";
        if (nameStr) {
          const namePath = userSchemaPaths.name;
          if (namePath.minlength && nameStr.length < namePath.minlength) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: `Name must be at least ${namePath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (namePath.maxlength && nameStr.length > namePath.maxlength) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: `Name must be at most ${namePath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (/<[^>]*>/g.test(nameStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: "Name cannot contain HTML or script tags",
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (/\$[a-zA-Z]+/.test(nameStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "name", msg: "Name contains invalid characters" }],
              "Validation Error",
              400,
            );
          }
          userFields.name = nameStr;
        } else if (userSchemaPaths.name.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "name", msg: "Name is required" }],
            "Validation Error",
            400,
          );
        }
      }

      // Validate phone if provided (memberId unchanged)
      if (phoneFromBody !== undefined && phoneFromBody !== null) {
        const phoneStr = String(phoneFromBody).trim();
        if (!phoneStr) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "phone", msg: "Phone number is required" }],
            "Validation Error",
            400,
          );
        }
        if (phoneStr !== currentUser.phone) {
          if (!/^\d{10}$/.test(phoneStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "phone", msg: "Phone must be exactly 10 digits" }],
              "Validation Error",
              400,
            );
          }
          userFields.phone = phoneStr;
        }
      }

      const mainPhoneForAlternateCheck =
        userFields.phone !== undefined ? userFields.phone : currentUser.phone;

      // Validate alternatePhone if provided
      if (userFields.alternatePhone !== undefined) {
        const alternatePhoneStr = userFields.alternatePhone
          ? String(userFields.alternatePhone).trim()
          : "";
        if (alternatePhoneStr) {
          const altPhonePath = userSchemaPaths.alternatePhone;
          if (
            altPhonePath.minlength &&
            alternatePhoneStr.length < altPhonePath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: `Alternate phone must be at least ${altPhonePath.minlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            altPhonePath.maxlength &&
            alternatePhoneStr.length > altPhonePath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: `Alternate phone must be at most ${altPhonePath.maxlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (!/^\d{10}$/.test(alternatePhoneStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: "Alternate phone must contain only digits",
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (alternatePhoneStr === mainPhoneForAlternateCheck) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: "Alternate phone must be different from main phone",
                },
              ],
              "Validation Error",
              400,
            );
          }
          userFields.alternatePhone = alternatePhoneStr;
        } else {
          userFields.alternatePhone = null;
        }
      }

      // Validate email if provided
      if (userFields.email !== undefined) {
        const emailStr = userFields.email
          ? String(userFields.email).trim()
          : "";
        if (emailStr) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "email", msg: "Invalid email format" }],
              "Validation Error",
              400,
            );
          }

          // Email is not enforced as unique at schema level.
          // So for Profile updates, only validate format and normalize.
          userFields.email = emailStr.toLowerCase();
        } else if (userSchemaPaths.email.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "email", msg: "Email is required" }],
            "Validation Error",
            400,
          );
        }
      }

      // Validate UserDetails fields
      if (userDetailsFields.dob !== undefined) {
        if (userDetailsFields.dob) {
          const dobDate = new Date(userDetailsFields.dob);
          if (isNaN(dobDate.getTime())) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "dob", msg: "Date of birth must be a valid date" }],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.dob = dobDate;
        } else if (userDetailsSchemaPaths.dob.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "dob", msg: "Date of birth is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.gender !== undefined) {
        const genderPath = userDetailsSchemaPaths.gender;
        if (userDetailsFields.gender) {
          if (
            genderPath.enumValues &&
            !genderPath.enumValues.includes(userDetailsFields.gender)
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "gender",
                  msg: `Gender must be one of: ${genderPath.enumValues.join(", ")}`,
                },
              ],
              "Validation Error",
              400,
            );
          }
        } else if (genderPath.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "gender", msg: "Gender is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.fatherName !== undefined) {
        const fatherNameStr = userDetailsFields.fatherName
          ? String(userDetailsFields.fatherName).trim()
          : "";
        if (fatherNameStr) {
          const fatherNamePath = userDetailsSchemaPaths.fatherName;
          if (
            fatherNamePath.minlength &&
            fatherNameStr.length < fatherNamePath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "fatherName",
                  msg: `Father's name must be at least ${fatherNamePath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            fatherNamePath.maxlength &&
            fatherNameStr.length > fatherNamePath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "fatherName",
                  msg: `Father's name must be at most ${fatherNamePath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.fatherName = fatherNameStr;
        } else if (userDetailsSchemaPaths.fatherName.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "fatherName", msg: "Father's name is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (
        userDetailsFields.motherName !== undefined &&
        userDetailsFields.motherName
      ) {
        const motherNameStr = String(userDetailsFields.motherName).trim();
        const motherNamePath = userDetailsSchemaPaths.motherName;
        if (
          motherNamePath.minlength &&
          motherNameStr.length < motherNamePath.minlength
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "motherName",
                msg: `Mother's name must be at least ${motherNamePath.minlength} characters`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        if (
          motherNamePath.maxlength &&
          motherNameStr.length > motherNamePath.maxlength
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "motherName",
                msg: `Mother's name must be at most ${motherNamePath.maxlength} characters`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.motherName = motherNameStr;
      }

      if (
        userDetailsFields.height !== undefined &&
        userDetailsFields.height !== "" &&
        userDetailsFields.height !== null
      ) {
        const heightNum = Number(userDetailsFields.height);
        if (Number.isNaN(heightNum)) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "height", msg: "Height must be a valid number" }],
            "Validation Error",
            400,
          );
        }
        const heightPath = userDetailsSchemaPaths.height;
        if (heightPath.min !== undefined && heightNum < heightPath.min) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "height",
                msg: `Height must be at least ${heightPath.min}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        if (heightPath.max !== undefined && heightNum > heightPath.max) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "height",
                msg: `Height must be at most ${heightPath.max}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.height = heightNum;
      }

      if (
        userDetailsFields.weight !== undefined &&
        userDetailsFields.weight !== "" &&
        userDetailsFields.weight !== null
      ) {
        const weightNum = Number(userDetailsFields.weight);
        if (Number.isNaN(weightNum)) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "weight", msg: "Weight must be a valid number" }],
            "Validation Error",
            400,
          );
        }
        const weightPath = userDetailsSchemaPaths.weight;
        if (weightPath.min !== undefined && weightNum < weightPath.min) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "weight",
                msg: `Weight must be at least ${weightPath.min}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        if (weightPath.max !== undefined && weightNum > weightPath.max) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "weight",
                msg: `Weight must be at most ${weightPath.max}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.weight = weightNum;
      }

      if (userDetailsFields.address !== undefined) {
        const addressStr = userDetailsFields.address
          ? String(userDetailsFields.address).trim()
          : "";
        if (addressStr) {
          const addressPath = userDetailsSchemaPaths.address;
          if (
            addressPath.minlength &&
            addressStr.length < addressPath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "address",
                  msg: `Address must be at least ${addressPath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            addressPath.maxlength &&
            addressStr.length > addressPath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "address",
                  msg: `Address must be at most ${addressPath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.address = addressStr;
        } else if (userDetailsSchemaPaths.address.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "address", msg: "Address is required" }],
            "Validation Error",
            400,
          );
        }
      }

      const requireAddressFields =
        userDetailsFields.address !== undefined ||
        userDetailsFields.countryId !== undefined ||
        userDetailsFields.stateId !== undefined ||
        userDetailsFields.districtId !== undefined ||
        userDetailsFields.villageId !== undefined;

      if (requireAddressFields) {
        const addr = {
          address:
            userDetailsFields.address ??
            (await UserDetails.findOne({ userId }).select("address").lean())
              ?.address,
          countryId:
            userDetailsFields.countryId ??
            (await UserDetails.findOne({ userId }).select("countryId").lean())
              ?.countryId,
          stateId:
            userDetailsFields.stateId ??
            (await UserDetails.findOne({ userId }).select("stateId").lean())
              ?.stateId,
          districtId:
            userDetailsFields.districtId ??
            (await UserDetails.findOne({ userId }).select("districtId").lean())
              ?.districtId,
          villageId:
            userDetailsFields.villageId ??
            (await UserDetails.findOne({ userId }).select("villageId").lean())
              ?.villageId,
        };

        const addressErrors = [];
        if (!addr.countryId) {
          addressErrors.push({
            path: "countryId",
            msg: "Country is required",
          });
        }
        if (!addr.stateId) {
          addressErrors.push({
            path: "stateId",
            msg: "State is required",
          });
        }
        if (!addr.districtId) {
          addressErrors.push({
            path: "districtId",
            msg: "District is required",
          });
        }
        if (!addr.villageId) {
          addressErrors.push({
            path: "villageId",
            msg: "Native village is required",
          });
        }
        if (!addr.address) {
          addressErrors.push({
            path: "address",
            msg: "Current address is required",
          });
        }

        if (addressErrors.length > 0) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            addressErrors,
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.maritalStatus !== undefined) {
        const maritalStatusPath = userDetailsSchemaPaths.maritalStatus;
        if (userDetailsFields.maritalStatus) {
          if (
            maritalStatusPath.enumValues &&
            !maritalStatusPath.enumValues.includes(
              userDetailsFields.maritalStatus,
            )
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "maritalStatus",
                  msg: `Marital status must be one of: ${maritalStatusPath.enumValues.join(", ")}`,
                },
              ],
              "Validation Error",
              400,
            );
          }
        } else if (maritalStatusPath.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "maritalStatus", msg: "Marital status is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (
        userDetailsFields.bloodGroup !== undefined &&
        userDetailsFields.bloodGroup
      ) {
        const bloodGroupPath = userDetailsSchemaPaths.bloodGroup;
        if (
          bloodGroupPath.enumValues &&
          !bloodGroupPath.enumValues.includes(userDetailsFields.bloodGroup)
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "bloodGroup",
                msg: `Blood group must be one of: ${bloodGroupPath.enumValues.join(", ")}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
      }

      if (
        userDetailsFields.education !== undefined &&
        userDetailsFields.education !== null &&
        userDetailsFields.education !== ""
      ) {
        const educationStr = String(userDetailsFields.education).trim();
        if (!EDUCATION_VALUES.includes(educationStr)) {
          await session.abortTransaction();
          session.endSession();
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
        userDetailsFields.education = educationStr;
      }

      if (userDetailsFields.occupation !== undefined) {
        const occupationStr = userDetailsFields.occupation
          ? String(userDetailsFields.occupation).trim()
          : "";
        const occupationPath = userDetailsSchemaPaths.occupation;
        if (
          occupationPath &&
          occupationPath.maxlength &&
          occupationStr.length > occupationPath.maxlength
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "occupation",
                msg: `Occupation must be at most ${occupationPath.maxlength} characters`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.occupation = occupationStr || undefined;
      }

      if (userDetailsFields.occupationDetails !== undefined) {
        const built = buildOccupationDetails(
          userDetailsFields.occupation,
          userDetailsFields.occupationDetails,
        );
        userDetailsFields.occupationDetails = built;
      }

      if (userDetailsFields.whatsappContact !== undefined) {
        const whatsappContactStr = userDetailsFields.whatsappContact
          ? String(userDetailsFields.whatsappContact).trim()
          : "";
        if (whatsappContactStr) {
          const whatsappContactPath = userDetailsSchemaPaths.whatsappContact;
          if (
            whatsappContactPath.minlength &&
            whatsappContactStr.length < whatsappContactPath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "whatsappContact",
                  msg: `WhatsApp contact must be at least ${whatsappContactPath.minlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            whatsappContactPath.maxlength &&
            whatsappContactStr.length > whatsappContactPath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "whatsappContact",
                  msg: `WhatsApp contact must be at most ${whatsappContactPath.maxlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (!/^\d{10}$/.test(whatsappContactStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "whatsappContact",
                  msg: "WhatsApp contact must contain only digits",
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.whatsappContact = whatsappContactStr;
        } else if (userDetailsSchemaPaths.whatsappContact.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "whatsappContact", msg: "WhatsApp contact is required" }],
            "Validation Error",
            400,
          );
        }
      }

      // Update User if there are fields to update
      let updatedUser = currentUser;
      if (Object.keys(userFields).length > 0) {
        if (userFields.phone !== undefined && userFields.phone !== currentUser.phone) {
          await reservePhoneCapacity(userFields.phone, session);
        }

        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: userFields },
          { returnDocument: "after", runValidators: true, session },
        )
          .select("-password -pwdRef -passwordCopy")
          .lean();

        if (userFields.phone !== undefined && userFields.phone !== currentUser.phone) {
          await releasePhoneCapacity(currentUser.phone, session);
        }
      }

      // Update or create UserDetails
      let userDetails = await UserDetails.findOne({ userId }).session(session);

      if (Object.keys(userDetailsFields).length > 0) {
        if (userDetails) {
          userDetails = await UserDetails.findOneAndUpdate(
            { userId },
            { $set: userDetailsFields },
            { returnDocument: "after", runValidators: true, session },
          ).lean();
        } else {
          const newUserDetails = new UserDetails({
            userId,
            ...userDetailsFields,
          });
          await newUserDetails.save({ session });
          userDetails = await UserDetails.findById(newUserDetails._id).lean();
        }
      } else {
        if (userDetails) {
          userDetails = await UserDetails.findOne({ userId }).lean();
        }
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Populate labels for location and master data
      if (userDetails) {
        // Populate state label
        if (userDetails.stateId) {
          const state = await State.findById(userDetails.stateId)
            .select("name status")
            .lean();
          if (state) {
            userDetails.stateLabel = state.name;
            userDetails.stateStatus = state.status;

            // Populate district label
            if (userDetails.districtId) {
              const district = await District.findById(userDetails.districtId)
                .select("name status")
                .lean();
              if (district) {
                userDetails.districtLabel = district.name;
                userDetails.districtStatus = district.status;

                // Populate village label
                if (userDetails.villageId) {
                  const village = await Village.findById(userDetails.villageId)
                    .select("name status")
                    .lean();
                  if (village) {
                    userDetails.villageLabel = village.name;
                    userDetails.villageStatus = village.status;
                  }
                }
              }
            }
          }
        }

        // Populate community label
        if (userDetails.community) {
          const community = await Community.findById(userDetails.community)
            .select("name status")
            .lean();
          if (community) {
            userDetails.communityLabel = community.name;
            userDetails.communityStatus = community.status;
          }
        }

        // Populate vansh label
        if (userDetails.vansh) {
          const vansh = await Vansh.findById(userDetails.vansh)
            .select("name status")
            .lean();
          if (vansh) {
            userDetails.vanshLabel = vansh.name;
            userDetails.vanshStatus = vansh.status;
          }
        }

        // Populate kul label
        if (userDetails.kul) {
          const kul = await Kul.findById(userDetails.kul)
            .select("name status")
            .lean();
          if (kul) {
            userDetails.kulLabel = kul.name;
            userDetails.kulStatus = kul.status;
          }
        }

        // Populate khamp label
        if (userDetails.khamp) {
          const khamp = await Khamp.findById(userDetails.khamp)
            .select("name status")
            .lean();
          if (khamp) {
            userDetails.khampLabel = khamp.name;
            userDetails.khampStatus = khamp.status;
          }
        }

        // Populate gotra label
        if (userDetails.gotra) {
          const gotra = await Gotra.findById(userDetails.gotra)
            .select("name status")
            .lean();
          if (gotra) {
            userDetails.gotraLabel = gotra.name;
            userDetails.gotraStatus = gotra.status;
          }
        }
      }

      // Combine updated user and userDetails
      const profileData = {
        ...updatedUser,
        userDetails: userDetails || null,
      };

      return response.successResponse(
        res,
        profileData,
        "Profile updated successfully",
      );
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.error("Error in updateProfile:", err);
    if (
      err.message &&
      (err.message.includes("Phone number user limit exceeded") ||
        err.message.includes("Maximum 5 users allowed per phone number"))
    ) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Maximum 5 users allowed per phone number" }],
        "Validation Error",
        400,
      );
    }
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

module.exports = {
  getProfile,
  updateProfile,
};
