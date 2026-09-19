const response = require("../../../config/response");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const Session = require("../../../models/Session");
const WalletTransaction = require("../../../models/WalletTransaction");
const State = require("../../../models/State");
const District = require("../../../models/District");
const Village = require("../../../models/Village");
const Country = require("../../../models/Country");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const Gotra = require("../../../models/Gotra");
const { processSearchFilters } = require("../../../utils/searchHelper");
const {
  generateMemberId,
  isDuplicateMemberIdError,
} = require("../../../utils/helper");
const {
  validateEmail,
  validatePhone,
} = require("../../../utils/inputValidation");
const { EDUCATION_VALUES } = require("../../../config/educationConstants");
const { logSecurityEvent, EVENT_TYPES } = require("../../../utils/auditLogger");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
  sanitizeValidationErrors,
} = require("../../../utils/errorSanitizer");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const { decryptPassword } = require("../../../utils/passwordEncryption");
const {
  validateReferralId: validateReferralIdService,
} = require("../../../services/referralService");
const {
  validateEPinForRegistration,
  useEPinForRegistration,
} = require("../../../services/epinService");
const { processSponsorChange } = require("../../../services/sponsorChangeService");
const { handleStatusTransition } = require("../../../services/userStatusTransitionService");
const { runWithTransactionRetry } = require("../../../utils/transactionRetry");
const { ROOT_MEMBER_ID } = require("../../../constants/system");
const WalletSettings = require("../../../models/WalletSettings");
const { creditMainWallet } = require("../../../services/walletService");
const {
  performActivationAndLevelDistribution,
} = require("../../../services/levelCommissionService");
const {
  reservePhoneCapacity,
  releasePhoneCapacity,
} = require("../../../services/phoneLimitService");

const MAX_MEMBER_ID_SAVE_RETRIES = 20;

/**
 * GET /admin/users/list
 * Get users list with pagination, search, and filters
 */
const getUsersList = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query || req.body;

    let filters = [];
    let query = {};

    if (req.query.limit) {
      if (typeof req.query.filters === "string") {
        filters = req.query.filters.split(",");
      } else if (Array.isArray(req.query.filters)) {
        filters = req.query.filters;
      }

      if (typeof req.query.query === "string") {
        try {
          query = JSON.parse(req.query.query);
        } catch (e) {
          query = {};
        }
      } else if (typeof req.query.query === "object") {
        query = req.query.query;
      } else {
        query = {};
      }
    } else {
      if (typeof req.body.filters === "string") {
        filters = req.body.filters.split(",");
      } else if (Array.isArray(req.body.filters)) {
        filters = req.body.filters;
      }

      query = typeof req.body.query === "object" ? req.body.query : {};
    }

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const matchQuery = processSearchFilters(filters, query);

    const usersList = await User.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "user_details",
          localField: "_id",
          foreignField: "userId",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "wallet_transactions",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$uid"] },
                    { $eq: ["$type", "ACTIVATION"] },
                    { $eq: ["$direction", "DEBIT"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "activationTx",
        },
      },
      {
        $project: {
          memberId: 1,
          name: 1,
          phone: 1,
          email: 1,
          status: 1,
          isPaid: 1,
          hasActivationDebit: { $gt: [{ $size: "$activationTx" }, 0] },
          createdAt: 1,
          updatedAt: 1,
          userDetails: {
            dob: "$userDetails.dob",
            gender: "$userDetails.gender",
            fatherName: "$userDetails.fatherName",
            address: "$userDetails.address",
            nativeVillage: "$userDetails.nativeVillage",
            district: "$userDetails.district",
            state: "$userDetails.state",
            country: "$userDetails.country",
            caste: "$userDetails.caste",
            clan: "$userDetails.clan",
            maritalStatus: "$userDetails.maritalStatus",
            education: "$userDetails.education",
            occupation: "$userDetails.occupation",
            occupationDetails: "$userDetails.occupationDetails",
            bloodGroup: "$userDetails.bloodGroup",
            whatsappContact: "$userDetails.whatsappContact",
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: "totalRecord" },
            {
              $addFields: {
                current_page: parseInt(page),
                per_page: pageSize,
              },
            },
          ],
          data: [
            { $sort: { [orderBy]: sortOrder } },
            { $skip: skip },
            { $limit: pageSize },
          ],
          summary: [
            {
              $group: {
                _id: null,
                active: {
                  $sum: {
                    $cond: [{ $eq: ["$status", 1] }, 1, 0],
                  },
                },
                inactive: {
                  $sum: {
                    $cond: [{ $eq: ["$status", 2] }, 1, 0],
                  },
                },
                newUsers: {
                  $sum: {
                    $cond: [{ $eq: ["$status", 4] }, 1, 0],
                  },
                },
                paid: {
                  $sum: {
                    $cond: [{ $eq: ["$isPaid", true] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                active: 1,
                inactive: 1,
                newUsers: 1,
                paid: 1,
              },
            },
          ],
        },
      },
    ]).collation({ locale: "en", strength: 1 });

    const [result] = usersList;

    if (result?.metadata?.length > 0) {
      return response.successResponse(res, usersList, "Users List");
    } else {
      return response.successResponse(
        res,
        [
          {
            metadata: [
              { totalRecord: 0, current_page: page, per_page: pageSize },
            ],
            data: [],
            summary: [{ active: 0, inactive: 0, newUsers: 0, paid: 0 }],
          },
        ],
        "No Users",
      );
    }
  } catch (err) {
    console.error("Error fetching users:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /admin/users/:userId
 * Get user by ID with UserDetails
 */
const getUserById = async (req, res) => {
  try {
    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

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

    // Remove password from response
    delete user.password;

    // Decrypt pwdRef and expose as passwordCopy for frontend compatibility
    if (user.pwdRef) {
      user.passwordCopy = decryptPassword(user.pwdRef);
      delete user.pwdRef; // Remove internal field name from response
    }

    const userData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(res, userData, "User data");
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }
    console.error("Get user by ID error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * POST /admin/users
 * Create new user (admin power)
 */
const createUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      session.endSession();
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    // Get allowed fields from schema
    const allowedUserFields = Object.keys(User.schema.paths).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key),
    );
    const allowedUserDetailsFields = Object.keys(
      UserDetails.schema.paths,
    ).filter(
      (key) =>
        !["_id", "__v", "createdAt", "updatedAt", "userId"].includes(key) &&
        !key.includes("."), // exclude nested path names (e.g. occupationDetails.department)
    );
    if (!allowedUserDetailsFields.includes("occupationDetails")) {
      allowedUserDetailsFields.push("occupationDetails");
    }
    // referralId is accepted in body and mapped to referredBy/referredByMemberId
    if (!allowedUserFields.includes("referralId")) {
      allowedUserFields.push("referralId");
    }
    // epinId is accepted in body for registration-style admin create flow
    if (!allowedUserFields.includes("epinId")) {
      allowedUserFields.push("epinId");
    }

    // Reject unknown fields
    const unknownFields = [];
    Object.keys(req.body).forEach((key) => {
      if (
        !allowedUserFields.includes(key) &&
        !allowedUserDetailsFields.includes(key)
      ) {
        unknownFields.push(key);
      }
    });

    if (unknownFields.length > 0) {
      session.endSession();
      return response.errorResponse(
        res,
        unknownFields.map((field) => ({
          path: field,
          msg: `Field '${field}' is not allowed`,
        })),
        "Validation Error",
        400,
      );
    }

    const {
      name,
      phone,
      email,
      password,
      status,
      isPaid,
      referralId,
      epinId,
      alternatePhone,
      // UserDetails fields
      dob,
      gender,
      fatherName,
      motherName,
      height,
      weight,
      address,
      countryId,
      stateId,
      districtId,
      villageId,
      community,
      vansh,
      kul,
      khamp,
      gotra,
      maritalStatus,
      education,
      occupation,
      occupationDetails: occupationDetailsRaw,
      bloodGroup,
      whatsappContact,
    } = req.body;

    // Get schema paths for validation
    const userSchemaPaths = User.schema.paths;
    const userDetailsSchemaPaths = UserDetails.schema.paths;
    const validationErrors = [];

    // Validate required User fields
    if (!name) {
      validationErrors.push({ path: "name", msg: "Name is required" });
    } else {
      const nameStr = String(name).trim();
      if (nameStr.length < userSchemaPaths.name.minlength) {
        validationErrors.push({
          path: "name",
          msg: `Name must be at least ${userSchemaPaths.name.minlength} characters`,
        });
      }
      if (nameStr.length > userSchemaPaths.name.maxlength) {
        validationErrors.push({
          path: "name",
          msg: `Name must be at most ${userSchemaPaths.name.maxlength} characters`,
        });
      }
      if (/<[^>]*>/g.test(nameStr)) {
        validationErrors.push({
          path: "name",
          msg: "Name cannot contain HTML or script tags",
        });
      }
      if (/\$[a-zA-Z]+/.test(nameStr)) {
        validationErrors.push({
          path: "name",
          msg: "Name contains invalid characters",
        });
      }
    }

    let phoneStr;
    if (!phone) {
      validationErrors.push({ path: "phone", msg: "Phone is required" });
    } else {
      phoneStr = String(phone).trim();
      if (!phoneStr || phoneStr.length === 0) {
        validationErrors.push({
          path: "phone",
          msg: "Phone number is required",
        });
      } else if (!/^\d+$/.test(phoneStr)) {
        validationErrors.push({
          path: "phone",
          msg: "Phone number must contain only digits",
        });
      }
    }

    if (!password) {
      validationErrors.push({ path: "password", msg: "Password is required" });
    } else {
      const passwordStr = String(password);
      const minPasswordLength = userSchemaPaths.password?.minlength || 6;
      const maxPasswordLength = userSchemaPaths.password?.maxlength || 128;
      if (passwordStr.length < minPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at least ${minPasswordLength} characters`,
        });
      }
      if (passwordStr.length > maxPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at most ${maxPasswordLength} characters`,
        });
      }
    }

    if (!email) {
      validationErrors.push({ path: "email", msg: "Email is required" });
    } else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        validationErrors.push({
          path: "email",
          msg: emailValidation.error,
        });
      }
    }

    // Validate optional User fields
    if (alternatePhone !== undefined && alternatePhone) {
      const alternatePhoneStr = String(alternatePhone).trim();
      if (
        alternatePhoneStr.length !== 10 ||
        !/^\d{10}$/.test(alternatePhoneStr)
      ) {
        validationErrors.push({
          path: "alternatePhone",
          msg: "Alternate phone must be exactly 10 digits",
        });
      }
    }

    if (status !== undefined) {
      const statusNum = parseInt(status);
      if (!userSchemaPaths.status.enumValues.includes(statusNum)) {
        validationErrors.push({
          path: "status",
          msg: `Status must be one of: ${userSchemaPaths.status.enumValues.join(", ")}`,
        });
      }
    }

    const referralIdStr = referralId ? String(referralId).trim() : "";
    if (!referralIdStr) {
      validationErrors.push({
        path: "referralId",
        msg: "Referral ID is required",
      });
    }
    const epinIdStr = epinId ? String(epinId).trim().toUpperCase() : "";

    // Check if any UserDetails field is provided
    const hasUserDetailsFields =
      dob !== undefined ||
      gender !== undefined ||
      fatherName !== undefined ||
      motherName !== undefined ||
      height !== undefined ||
      weight !== undefined ||
      address !== undefined ||
      countryId !== undefined ||
      stateId !== undefined ||
      districtId !== undefined ||
      villageId !== undefined ||
      community !== undefined ||
      vansh !== undefined ||
      kul !== undefined ||
      khamp !== undefined ||
      gotra !== undefined ||
      maritalStatus !== undefined ||
      education !== undefined ||
      occupation !== undefined ||
      occupationDetailsRaw !== undefined ||
      bloodGroup !== undefined ||
      whatsappContact !== undefined;

    // If any UserDetails field is provided, validate all required fields
    if (hasUserDetailsFields) {
      if (!dob) {
        validationErrors.push({
          path: "dob",
          msg: "Date of birth is required",
        });
      } else {
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          validationErrors.push({
            path: "dob",
            msg: "Date of birth must be a valid date",
          });
        }
      }

      if (!gender) {
        validationErrors.push({ path: "gender", msg: "Gender is required" });
      } else {
        if (!userDetailsSchemaPaths.gender.enumValues.includes(gender)) {
          validationErrors.push({
            path: "gender",
            msg: `Gender must be one of: ${userDetailsSchemaPaths.gender.enumValues.join(", ")}`,
          });
        }
      }

      if (!fatherName) {
        validationErrors.push({
          path: "fatherName",
          msg: "Father's name is required",
        });
      } else {
        const fatherNameStr = String(fatherName).trim();
        if (
          fatherNameStr.length < userDetailsSchemaPaths.fatherName.minlength
        ) {
          validationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at least ${userDetailsSchemaPaths.fatherName.minlength} characters`,
          });
        }
        if (
          fatherNameStr.length > userDetailsSchemaPaths.fatherName.maxlength
        ) {
          validationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at most ${userDetailsSchemaPaths.fatherName.maxlength} characters`,
          });
        }
      }

      if (!address) {
        validationErrors.push({ path: "address", msg: "Address is required" });
      } else {
        const addressStr = String(address).trim();
        if (addressStr.length < userDetailsSchemaPaths.address.minlength) {
          validationErrors.push({
            path: "address",
            msg: `Address must be at least ${userDetailsSchemaPaths.address.minlength} characters`,
          });
        }
        if (addressStr.length > userDetailsSchemaPaths.address.maxlength) {
          validationErrors.push({
            path: "address",
            msg: `Address must be at most ${userDetailsSchemaPaths.address.maxlength} characters`,
          });
        }
      }

      if (!maritalStatus) {
        validationErrors.push({
          path: "maritalStatus",
          msg: "Marital status is required",
        });
      } else {
        if (
          !userDetailsSchemaPaths.maritalStatus.enumValues.includes(
            maritalStatus,
          )
        ) {
          validationErrors.push({
            path: "maritalStatus",
            msg: `Marital status must be one of: ${userDetailsSchemaPaths.maritalStatus.enumValues.join(", ")}`,
          });
        }
      }
    }

    // Validate optional UserDetails fields if provided (education: from constants only)
    if (education !== undefined && education !== null && education !== "") {
      const educationStr = String(education).trim();
      if (!EDUCATION_VALUES.includes(educationStr)) {
        validationErrors.push({
          path: "education",
          msg: "Education must be one of the allowed dropdown values",
        });
      }
    }

    if (occupation !== undefined && occupation) {
      const occupationStr = String(occupation).trim();
      if (occupationStr.length > userDetailsSchemaPaths.occupation.maxlength) {
        validationErrors.push({
          path: "occupation",
          msg: `Occupation must be at most ${userDetailsSchemaPaths.occupation.maxlength} characters`,
        });
      }
    }

    if (bloodGroup !== undefined && bloodGroup) {
      if (!userDetailsSchemaPaths.bloodGroup.enumValues.includes(bloodGroup)) {
        validationErrors.push({
          path: "bloodGroup",
          msg: `Blood group must be one of: ${userDetailsSchemaPaths.bloodGroup.enumValues.join(", ")}`,
        });
      }
    }

    if (validationErrors.length > 0) {
      session.endSession();
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    let sponsorResolved = null;
    if (referralIdStr) {
      const referralValidation = await validateReferralIdService(referralIdStr);
      if (!referralValidation.valid) {
        session.endSession();
        const msg =
          referralValidation.message === "Referral ID not found"
            ? "Invalid referral ID"
            : referralValidation.message === "Sponsor is not active"
              ? "Sponsor is not active"
              : referralValidation.message === "Sponsor is not eligible"
                ? "Sponsor is not eligible"
                : referralValidation.message || "Invalid referral ID";
        return response.errorResponse(
          res,
          [{ path: "referralId", msg }],
          msg,
          400,
        );
      }
      sponsorResolved = referralValidation.referrer;
    }
    if (sponsorResolved && epinIdStr) {
      const epinValidation = await validateEPinForRegistration(
        epinIdStr,
        sponsorResolved._id,
      );
      if (!epinValidation.valid) {
        session.endSession();
        const msg = epinValidation.message || "Invalid E-PIN";
        return response.errorResponse(
          res,
          [{ path: "epinId", msg }],
          msg,
          400,
        );
      }
    }

    let user; // Declare outside transaction scope for logging
    await session.withTransaction(async () => {
      await reservePhoneCapacity(phoneStr, session);

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate UUID
      const uuid = uuidv4();

      let saved = false;
      for (let attempt = 0; attempt < MAX_MEMBER_ID_SAVE_RETRIES; attempt += 1) {
        const memberId = await generateMemberId(session);
        const userData = {
          memberId,
          name: name.trim(),
          phone: phoneStr,
          email: email ? email.trim() : undefined,
          password: hashedPassword,
          passwordCopy: password, // Store plain text copy for admin view (will be encrypted by virtual setter)
          status: status !== undefined ? parseInt(status) : 4,
          isPaid: isPaid === true || isPaid === "true",
          referredBy: sponsorResolved ? sponsorResolved._id : undefined,
          referredByMemberId: sponsorResolved
            ? sponsorResolved.memberId
            : undefined,
          uuid,
        };
        user = new User(userData);
        try {
          await user.save({ session });
          saved = true;
          break;
        } catch (saveErr) {
          if (isDuplicateMemberIdError(saveErr)) {
            continue;
          }
          throw saveErr;
        }
      }
      if (!saved) {
        throw new Error(
          `Unable to save user with a unique member ID after ${MAX_MEMBER_ID_SAVE_RETRIES} attempts.`,
        );
      }

      if (sponsorResolved && epinIdStr) {
        await useEPinForRegistration(
          sponsorResolved._id,
          epinIdStr,
          user._id,
          session,
        );
      }

      // Create UserDetails if any field is provided
      const hasUserDetailsFields =
        dob ||
        gender ||
        fatherName ||
        motherName ||
        height ||
        weight ||
        address ||
        countryId ||
        stateId ||
        districtId ||
        villageId ||
        community ||
        vansh ||
        kul ||
        khamp ||
        maritalStatus ||
        education ||
        occupation ||
        occupationDetailsRaw !== undefined ||
        bloodGroup ||
        whatsappContact;

      if (hasUserDetailsFields) {
        const occupationTrimmed = occupation
          ? String(occupation).trim()
          : undefined;
        const builtOccupationDetails = buildOccupationDetails(
          occupationTrimmed,
          occupationDetailsRaw,
        );
        const userDetailsData = {
          userId: user._id,
          dob: dob ? new Date(dob) : undefined,
          gender: gender || undefined,
          fatherName: fatherName ? fatherName.trim() : undefined,
          motherName: motherName ? motherName.trim() : undefined,
          height:
            height !== undefined && height !== "" && height !== null
              ? Number(height)
              : undefined,
          weight:
            weight !== undefined && weight !== "" && weight !== null
              ? Number(weight)
              : undefined,
          address: address ? address.trim() : undefined,
          countryId: countryId
            ? mongoose.Types.ObjectId.isValid(countryId)
              ? new mongoose.Types.ObjectId(countryId)
              : undefined
            : undefined,
          stateId: stateId
            ? mongoose.Types.ObjectId.isValid(stateId)
              ? new mongoose.Types.ObjectId(stateId)
              : undefined
            : undefined,
          districtId: districtId
            ? mongoose.Types.ObjectId.isValid(districtId)
              ? new mongoose.Types.ObjectId(districtId)
              : undefined
            : undefined,
          villageId: villageId
            ? mongoose.Types.ObjectId.isValid(villageId)
              ? new mongoose.Types.ObjectId(villageId)
              : undefined
            : undefined,
          community: community
            ? mongoose.Types.ObjectId.isValid(community)
              ? new mongoose.Types.ObjectId(community)
              : undefined
            : undefined,
          vansh: vansh
            ? mongoose.Types.ObjectId.isValid(vansh)
              ? new mongoose.Types.ObjectId(vansh)
              : undefined
            : undefined,
          kul: kul
            ? mongoose.Types.ObjectId.isValid(kul)
              ? new mongoose.Types.ObjectId(kul)
              : undefined
            : undefined,
          khamp: khamp
            ? mongoose.Types.ObjectId.isValid(khamp)
              ? new mongoose.Types.ObjectId(khamp)
              : undefined
            : undefined,
          gotra: gotra
            ? mongoose.Types.ObjectId.isValid(gotra)
              ? new mongoose.Types.ObjectId(gotra)
              : undefined
            : undefined,
          maritalStatus: maritalStatus || undefined,
          education: education ? education.trim() : undefined,
          occupation: occupationTrimmed || undefined,
          occupationDetails: builtOccupationDetails,
          bloodGroup: bloodGroup || undefined,
          whatsappContact: whatsappContact ? whatsappContact.trim() : undefined,
        };

        const userDetails = new UserDetails(userDetailsData);
        await userDetails.save({ session });
      }
    });

    // Log referral assignment if provided (after transaction completes)
    if (referralId && user) {
      logSecurityEvent({
        eventType: EVENT_TYPES.REFERRAL_ASSIGNED,
        status: "success",
        userID: user._id.toString(),
        adminID: req.user?.id?.toString() || null,
        req,
        details: {
          newUserMemberId: user.memberId,
          referralId,
          createdBy: "admin",
        },
      });
    }

    session.endSession();

    return response.successResponse(res, {}, "User created successfully");
  } catch (err) {
    session.endSession();

    console.error("Error creating user:", err);

    if (
      err.message &&
      (err.message.includes("Phone number user limit exceeded") ||
        err.message.includes("Phone number already registered"))
    ) {
      console.error("Create user error details:", err);
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "This phone number already has the maximum allowed 5 users.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    if (err.code === 11000) {
      // Duplicate key error
      const sanitizedError = sanitizeDuplicateKeyError(err, "phone");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Validation Error",
        400,
      );
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: sanitizeError(error.message, "validation"),
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    console.error("Create user error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PUT /admin/users/:userId
 * Update user (admin power - can update all fields)
 */
const updateUserById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    // Get allowed fields from schema
    const allowedUserFields = Object.keys(User.schema.paths).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key),
    );
    const allowedUserDetailsFields = Object.keys(
      UserDetails.schema.paths,
    ).filter(
      (key) =>
        !["_id", "__v", "createdAt", "updatedAt", "userId"].includes(key) &&
        !key.includes("."), // exclude nested path names (e.g. occupationDetails.department)
    );
    if (!allowedUserDetailsFields.includes("occupationDetails")) {
      allowedUserDetailsFields.push("occupationDetails");
    }
    // referralId is accepted in body and mapped to referredBy/referredByMemberId
    if (!allowedUserFields.includes("referralId")) {
      allowedUserFields.push("referralId");
    }

    // Reject unknown fields
    const unknownFields = [];
    Object.keys(req.body).forEach((key) => {
      if (
        !allowedUserFields.includes(key) &&
        !allowedUserDetailsFields.includes(key) &&
        key !== "txn_password"
      ) {
        unknownFields.push(key);
      }
    });

    if (unknownFields.length > 0) {
      return response.errorResponse(
        res,
        unknownFields.map((field) => ({
          path: field,
          msg: `Field '${field}' is not allowed`,
        })),
        "Validation Error",
        400,
      );
    }

    const {
      name,
      phone,
      email,
      password,
      status,
      isPaid,
      referralId,
      alternatePhone,
      // UserDetails fields
      dob,
      gender,
      fatherName,
      motherName,
      height,
      weight,
      address,
      countryId,
      stateId,
      districtId,
      villageId,
      community,
      vansh,
      kul,
      khamp,
      gotra,
      maritalStatus,
      education,
      occupation,
      occupationDetails: occupationDetailsRaw,
      bloodGroup,
      whatsappContact,
    } = req.body;

    // Get schema paths for validation
    const userSchemaPaths = User.schema.paths;
    const userDetailsSchemaPaths = UserDetails.schema.paths;
    const validationErrors = [];

    let passwordChanged = false;

    // Update User fields
    const userUpdateFields = {};

    if (name !== undefined) {
      const nameStr = name ? String(name).trim() : "";
      if (nameStr) {
        if (nameStr.length < userSchemaPaths.name.minlength) {
          validationErrors.push({
            path: "name",
            msg: `Name must be at least ${userSchemaPaths.name.minlength} characters`,
          });
        } else if (nameStr.length > userSchemaPaths.name.maxlength) {
          validationErrors.push({
            path: "name",
            msg: `Name must be at most ${userSchemaPaths.name.maxlength} characters`,
          });
        } else {
          if (/<[^>]*>/g.test(nameStr)) {
            validationErrors.push({
              path: "name",
              msg: "Name cannot contain HTML or script tags",
            });
          } else if (/\$[a-zA-Z]+/.test(nameStr)) {
            validationErrors.push({
              path: "name",
              msg: "Name contains invalid characters",
            });
          } else {
            userUpdateFields.name = nameStr;
          }
        }
      } else if (userSchemaPaths.name.isRequired) {
        validationErrors.push({ path: "name", msg: "Name is required" });
      }
    }

    if (email !== undefined) {
      const emailStr = email ? String(email).trim() : "";
      if (emailStr) {
        const emailValidation = validateEmail(emailStr);
        if (!emailValidation.valid) {
          validationErrors.push({
            path: "email",
            msg: emailValidation.error,
          });
        } else {
          // Email is not enforced as unique at schema level.
          // Allow profile updates even if other users share the same email.
          userUpdateFields.email = emailStr.toLowerCase();
        }
      } else if (userSchemaPaths.email.isRequired) {
        validationErrors.push({ path: "email", msg: "Email is required" });
      }
    }

    if (alternatePhone !== undefined) {
      const alternatePhoneStr = alternatePhone
        ? String(alternatePhone).trim()
        : "";
      if (alternatePhoneStr) {
        if (!/^\d+$/.test(alternatePhoneStr)) {
          validationErrors.push({
            path: "alternatePhone",
            msg: "Alternate phone must contain only digits",
          });
        } else if (alternatePhoneStr === user.phone) {
          validationErrors.push({
            path: "alternatePhone",
            msg: "Alternate phone must be different from main phone",
          });
        } else {
          userUpdateFields.alternatePhone = alternatePhoneStr;
        }
      } else {
        userUpdateFields.alternatePhone = null;
      }
    }

    // Status/isPaid updates are intentionally disabled in Edit User flow.
    if (status !== undefined || isPaid !== undefined) {
      validationErrors.push({
        path: "status",
        msg: "Status and Paid fields cannot be updated from Edit User",
      });
    }
    if (referralId !== undefined) {
      const refIdStr = referralId ? String(referralId).trim() : "";
      if (refIdStr) {
        const referralValidation = await validateReferralIdService(refIdStr);
        if (!referralValidation.valid) {
          validationErrors.push({
            path: "referralId",
            msg:
              referralValidation.message === "Referral ID not found"
                ? "Invalid referral ID"
                : referralValidation.message === "Sponsor is not active"
                  ? "Sponsor is not active"
                  : referralValidation.message === "Sponsor is not eligible"
                    ? "Sponsor is not eligible"
                    : referralValidation.message || "Invalid referral ID",
          });
        } else {
          const sponsor = referralValidation.referrer;
          if (sponsor.memberId === user.memberId) {
            validationErrors.push({
              path: "referralId",
              msg: "Self-referral is not allowed",
            });
          } else {
            userUpdateFields.referredBy = sponsor._id;
            userUpdateFields.referredByMemberId = sponsor.memberId;
          }
        }
      } else if (user.memberId !== ROOT_MEMBER_ID) {
        return response.errorResponse(
          res,
          [{ path: "referralId", msg: "Referral cannot be removed" }],
          "Referral cannot be removed",
          400,
        );
      } else {
        userUpdateFields.referredBy = null;
        userUpdateFields.referredByMemberId = null;
      }
    }

    if (validationErrors.length > 0) {
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    // Phone change: update phone only; memberId stays immutable (login / referral identity).
    let normalizedPhoneForUpdate = null;
    if (phone !== undefined && phone !== user.phone) {
      const phoneStr = String(phone).trim();
      if (!phoneStr || phoneStr.length === 0) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Phone number is required" }],
          "Validation Error",
          400,
        );
      }
      if (!/^\d{10}$/.test(phoneStr)) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Phone number must be exactly 10 digits" }],
          "Validation Error",
          400,
        );
      }

      const samePhoneUsersCount = await User.countDocuments({
        phone: phoneStr,
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

      userUpdateFields.phone = phoneStr;
      normalizedPhoneForUpdate = phoneStr;
    }

    // Handle password change
    if (password !== undefined && password !== "") {
      const passwordStr = String(password);
      const minPasswordLength = userSchemaPaths.password?.minlength || 6;
      const maxPasswordLength = userSchemaPaths.password?.maxlength || 128;
      if (passwordStr.length < minPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at least ${minPasswordLength} characters`,
        });
      } else if (passwordStr.length > maxPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at most ${maxPasswordLength} characters`,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        userUpdateFields.password = await bcrypt.hash(password, salt);
        userUpdateFields.passwordCopy = password; // Store plain text copy for admin view (will be encrypted by virtual setter)
        userUpdateFields.passwordChangedAt = new Date();
        passwordChanged = true;
      }
    }

    // Check validation errors after password validation
    if (validationErrors.length > 0) {
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    // Safe sponsor change: hierarchy + counts must update in transaction
    const isSponsorChange =
      userUpdateFields.referredBy !== undefined &&
      user.referredBy &&
      userUpdateFields.referredBy.toString() !== user.referredBy.toString();

    if (isSponsorChange) {
      try {
        await processSponsorChange(
          userId,
          userUpdateFields.referredBy,
          user.referredBy
        );
        // Remove from userUpdateFields - already updated by processSponsorChange
        delete userUpdateFields.referredBy;
        delete userUpdateFields.referredByMemberId;
      } catch (sponsorErr) {
        return response.errorResponse(
          res,
          [{ path: "referralId", msg: sponsorErr.message || "Sponsor change failed" }],
          "Sponsor change failed",
          400,
        );
      }
    }

    // Update user (remaining fields; referredBy already handled if sponsor change)
    let updatedUser;
    if (Object.keys(userUpdateFields).length > 0) {
      const hasStatusChange = userUpdateFields.status !== undefined;
      const hasPhoneChange = normalizedPhoneForUpdate !== null;
      if (hasStatusChange || hasPhoneChange) {
        await runWithTransactionRetry(async (session) => {
          if (hasPhoneChange) {
            await reservePhoneCapacity(normalizedPhoneForUpdate, session);
          }

          updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: userUpdateFields },
            { returnDocument: "after", session },
          );

          if (hasPhoneChange) {
            await releasePhoneCapacity(user.phone, session);
          }

          if (hasStatusChange) {
            await handleStatusTransition(
              userId,
              user.status,
              userUpdateFields.status,
              session,
            );
          }
        });
      } else {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: userUpdateFields },
          { returnDocument: "after" },
        );
      }
    } else {
      // Sponsor change only (other fields unchanged) - refetch to get updated doc
      updatedUser =
        isSponsorChange ? await User.findById(userId) : user;
    }

    // Create wallet if user becomes activated (status === 1 && isPaid === true)
    const finalStatus =
      userUpdateFields.status !== undefined
        ? userUpdateFields.status
        : user.status;
    const finalIsPaid =
      userUpdateFields.isPaid !== undefined
        ? userUpdateFields.isPaid === true || userUpdateFields.isPaid === "true"
        : user.isPaid;

    // Update or create UserDetails
    const userDetailsData = {};
    const userDetailsValidationErrors = [];

    if (dob !== undefined) {
      if (dob) {
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          userDetailsValidationErrors.push({
            path: "dob",
            msg: "Date of birth must be a valid date",
          });
        } else {
          userDetailsData.dob = dobDate;
        }
      } else if (userDetailsSchemaPaths.dob.isRequired) {
        userDetailsValidationErrors.push({
          path: "dob",
          msg: "Date of birth is required",
        });
      }
    }

    if (gender !== undefined) {
      if (gender) {
        if (!userDetailsSchemaPaths.gender.enumValues.includes(gender)) {
          userDetailsValidationErrors.push({
            path: "gender",
            msg: `Gender must be one of: ${userDetailsSchemaPaths.gender.enumValues.join(", ")}`,
          });
        } else {
          userDetailsData.gender = gender;
        }
      } else if (userDetailsSchemaPaths.gender.isRequired) {
        userDetailsValidationErrors.push({
          path: "gender",
          msg: "Gender is required",
        });
      }
    }

    if (fatherName !== undefined) {
      const fatherNameStr = fatherName ? String(fatherName).trim() : "";
      if (fatherNameStr) {
        if (
          fatherNameStr.length < userDetailsSchemaPaths.fatherName.minlength
        ) {
          userDetailsValidationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at least ${userDetailsSchemaPaths.fatherName.minlength} characters`,
          });
        } else if (
          fatherNameStr.length > userDetailsSchemaPaths.fatherName.maxlength
        ) {
          userDetailsValidationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at most ${userDetailsSchemaPaths.fatherName.maxlength} characters`,
          });
        } else {
          userDetailsData.fatherName = fatherNameStr;
        }
      } else if (userDetailsSchemaPaths.fatherName.isRequired) {
        userDetailsValidationErrors.push({
          path: "fatherName",
          msg: "Father's name is required",
        });
      }
    }

    if (motherName !== undefined && motherName) {
      const motherNameStr = String(motherName).trim();
      const motherNamePath = userDetailsSchemaPaths.motherName;
      if (
        motherNamePath.minlength &&
        motherNameStr.length < motherNamePath.minlength
      ) {
        userDetailsValidationErrors.push({
          path: "motherName",
          msg: `Mother's name must be at least ${motherNamePath.minlength} characters`,
        });
      } else if (
        motherNamePath.maxlength &&
        motherNameStr.length > motherNamePath.maxlength
      ) {
        userDetailsValidationErrors.push({
          path: "motherName",
          msg: `Mother's name must be at most ${motherNamePath.maxlength} characters`,
        });
      } else {
        userDetailsData.motherName = motherNameStr;
      }
    }

    if (height !== undefined && height !== "" && height !== null) {
      const heightNum = Number(height);
      if (Number.isNaN(heightNum)) {
        userDetailsValidationErrors.push({
          path: "height",
          msg: "Height must be a valid number",
        });
      } else {
        const heightPath = userDetailsSchemaPaths.height;
        if (heightPath.min !== undefined && heightNum < heightPath.min) {
          userDetailsValidationErrors.push({
            path: "height",
            msg: `Height must be at least ${heightPath.min}`,
          });
        } else if (heightPath.max !== undefined && heightNum > heightPath.max) {
          userDetailsValidationErrors.push({
            path: "height",
            msg: `Height must be at most ${heightPath.max}`,
          });
        } else {
          userDetailsData.height = heightNum;
        }
      }
    }

    if (weight !== undefined && weight !== "" && weight !== null) {
      const weightNum = Number(weight);
      if (Number.isNaN(weightNum)) {
        userDetailsValidationErrors.push({
          path: "weight",
          msg: "Weight must be a valid number",
        });
      } else {
        const weightPath = userDetailsSchemaPaths.weight;
        if (weightPath.min !== undefined && weightNum < weightPath.min) {
          userDetailsValidationErrors.push({
            path: "weight",
            msg: `Weight must be at least ${weightPath.min}`,
          });
        } else if (weightPath.max !== undefined && weightNum > weightPath.max) {
          userDetailsValidationErrors.push({
            path: "weight",
            msg: `Weight must be at most ${weightPath.max}`,
          });
        } else {
          userDetailsData.weight = weightNum;
        }
      }
    }

    if (address !== undefined) {
      const addressStr = address ? String(address).trim() : "";
      if (addressStr) {
        if (addressStr.length < userDetailsSchemaPaths.address.minlength) {
          userDetailsValidationErrors.push({
            path: "address",
            msg: `Address must be at least ${userDetailsSchemaPaths.address.minlength} characters`,
          });
        } else if (
          addressStr.length > userDetailsSchemaPaths.address.maxlength
        ) {
          userDetailsValidationErrors.push({
            path: "address",
            msg: `Address must be at most ${userDetailsSchemaPaths.address.maxlength} characters`,
          });
        } else {
          userDetailsData.address = addressStr;
        }
      } else if (userDetailsSchemaPaths.address.isRequired) {
        userDetailsValidationErrors.push({
          path: "address",
          msg: "Address is required",
        });
      }
    }

    if (countryId !== undefined && countryId) {
      if (mongoose.Types.ObjectId.isValid(countryId)) {
        userDetailsData.countryId = new mongoose.Types.ObjectId(countryId);
      } else {
        userDetailsValidationErrors.push({
          path: "countryId",
          msg: "Invalid country ID format",
        });
      }
    }

    if (stateId !== undefined && stateId) {
      if (mongoose.Types.ObjectId.isValid(stateId)) {
        userDetailsData.stateId = new mongoose.Types.ObjectId(stateId);
      } else {
        userDetailsValidationErrors.push({
          path: "stateId",
          msg: "Invalid state ID format",
        });
      }
    }

    if (districtId !== undefined && districtId) {
      if (mongoose.Types.ObjectId.isValid(districtId)) {
        userDetailsData.districtId = new mongoose.Types.ObjectId(districtId);
      } else {
        userDetailsValidationErrors.push({
          path: "districtId",
          msg: "Invalid district ID format",
        });
      }
    }

    if (villageId !== undefined && villageId) {
      if (mongoose.Types.ObjectId.isValid(villageId)) {
        userDetailsData.villageId = new mongoose.Types.ObjectId(villageId);
      } else {
        userDetailsValidationErrors.push({
          path: "villageId",
          msg: "Invalid village ID format",
        });
      }
    }

    if (community !== undefined && community) {
      if (mongoose.Types.ObjectId.isValid(community)) {
        userDetailsData.community = new mongoose.Types.ObjectId(community);
      } else {
        userDetailsValidationErrors.push({
          path: "community",
          msg: "Invalid community ID format",
        });
      }
    }

    if (vansh !== undefined && vansh) {
      if (mongoose.Types.ObjectId.isValid(vansh)) {
        userDetailsData.vansh = new mongoose.Types.ObjectId(vansh);
      } else {
        userDetailsValidationErrors.push({
          path: "vansh",
          msg: "Invalid vansh ID format",
        });
      }
    }

    if (kul !== undefined && kul) {
      if (mongoose.Types.ObjectId.isValid(kul)) {
        userDetailsData.kul = new mongoose.Types.ObjectId(kul);
      } else {
        userDetailsValidationErrors.push({
          path: "kul",
          msg: "Invalid kul ID format",
        });
      }
    }

    if (khamp !== undefined && khamp) {
      if (mongoose.Types.ObjectId.isValid(khamp)) {
        userDetailsData.khamp = new mongoose.Types.ObjectId(khamp);
      } else {
        userDetailsValidationErrors.push({
          path: "khamp",
          msg: "Invalid khamp ID format",
        });
      }
    }

    if (gotra !== undefined && gotra) {
      if (mongoose.Types.ObjectId.isValid(gotra)) {
        userDetailsData.gotra = new mongoose.Types.ObjectId(gotra);
      } else {
        userDetailsValidationErrors.push({
          path: "gotra",
          msg: "Invalid gotra ID format",
        });
      }
    }

    if (maritalStatus !== undefined) {
      if (maritalStatus) {
        if (
          !userDetailsSchemaPaths.maritalStatus.enumValues.includes(
            maritalStatus,
          )
        ) {
          userDetailsValidationErrors.push({
            path: "maritalStatus",
            msg: `Marital status must be one of: ${userDetailsSchemaPaths.maritalStatus.enumValues.join(", ")}`,
          });
        } else {
          userDetailsData.maritalStatus = maritalStatus;
        }
      } else if (userDetailsSchemaPaths.maritalStatus.isRequired) {
        userDetailsValidationErrors.push({
          path: "maritalStatus",
          msg: "Marital status is required",
        });
      }
    }

    if (education !== undefined && education !== null && education !== "") {
      const educationStr = String(education).trim();
      if (!EDUCATION_VALUES.includes(educationStr)) {
        userDetailsValidationErrors.push({
          path: "education",
          msg: "Education must be one of the allowed dropdown values",
        });
      } else {
        userDetailsData.education = educationStr;
      }
    }

    if (occupation !== undefined) {
      const occupationStr = occupation ? String(occupation).trim() : "";
      if (
        occupationStr &&
        occupationStr.length > userDetailsSchemaPaths.occupation.maxlength
      ) {
        userDetailsValidationErrors.push({
          path: "occupation",
          msg: `Occupation must be at most ${userDetailsSchemaPaths.occupation.maxlength} characters`,
        });
      } else {
        userDetailsData.occupation = occupationStr || undefined;
      }
    }

    if (occupationDetailsRaw !== undefined) {
      const occupationTrimmed = req.body.occupation
        ? String(req.body.occupation).trim()
        : undefined;
      const built = buildOccupationDetails(
        occupationTrimmed,
        occupationDetailsRaw,
      );
      userDetailsData.occupationDetails = built;
    }

    if (bloodGroup !== undefined && bloodGroup) {
      if (!userDetailsSchemaPaths.bloodGroup.enumValues.includes(bloodGroup)) {
        userDetailsValidationErrors.push({
          path: "bloodGroup",
          msg: `Blood group must be one of: ${userDetailsSchemaPaths.bloodGroup.enumValues.join(", ")}`,
        });
      } else {
        userDetailsData.bloodGroup = bloodGroup;
      }
    }

    if (whatsappContact !== undefined) {
      const whatsappContactStr = whatsappContact
        ? String(whatsappContact).trim()
        : "";
      if (whatsappContactStr) {
        if (!/^\d+$/.test(whatsappContactStr)) {
          userDetailsValidationErrors.push({
            path: "whatsappContact",
            msg: "WhatsApp contact must contain only digits",
          });
        } else {
          userDetailsData.whatsappContact = whatsappContactStr;
        }
      } else if (userDetailsSchemaPaths.whatsappContact.isRequired) {
        userDetailsValidationErrors.push({
          path: "whatsappContact",
          msg: "WhatsApp contact is required",
        });
      }
    }

    if (userDetailsValidationErrors.length > 0) {
      return response.errorResponse(
        res,
        userDetailsValidationErrors,
        "Validation Error",
        400,
      );
    }

    if (Object.keys(userDetailsData).length > 0) {
      await UserDetails.findOneAndUpdate(
        { userId },
        { $set: userDetailsData },
        { returnDocument: "after", upsert: true, runValidators: true },
      );
    }

    // Invalidate all sessions if password was changed
    if (passwordChanged) {
      await Session.deleteMany({ userID: userId });
    }

    return response.successResponse(res, {}, "User updated successfully");
  } catch (err) {
    console.error("Error updating user:", err);

    if (
      err.message &&
      (err.message.includes("Phone number user limit exceeded") ||
        err.message.includes("Maximum 5 users allowed per phone number"))
    ) {
      console.error("Update user error details:", err);
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Maximum 5 users allowed per phone number",
          },
        ],
        "Validation Error",
        400,
      );
    }

    if (err.code === 11000) {
      if (isDuplicateMemberIdError(err)) {
        return response.errorResponse(
          res,
          [{ path: "memberId", msg: "Member ID collision. Please retry." }],
          "Validation Error",
          409,
        );
      }
      const sanitizedError = sanitizeDuplicateKeyError(err, "phone");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Validation Error",
        400,
      );
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: sanitizeError(error.message, "validation"),
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    console.error("Update user error:", err);
    const errorMessage = sanitizeError(err, "generic");
    return response.errorResponse(
      res,
      [{ msg: errorMessage }],
      errorMessage,
      400,
    );
  }
};

/**
 * POST /admin/users/:userId/status-action
 * Perform status actions from users list:
 * - activate: credit registration fee, then activate + distribute
 * - force_activate: directly set active + paid (no credit/distribution)
 * - deactivate: set inactive + unpaid
 */
const performUserStatusAction = async (req, res) => {
  try {
    const userId = req.params.user_id || req.params.userId;
    const action = String(req.body?.action || "")
      .trim()
      .toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    const allowedActions = ["activate", "force_activate", "deactivate"];
    if (!allowedActions.includes(action)) {
      return response.errorResponse(
        res,
        [{ path: "action", msg: "Invalid status action" }],
        "Validation Error",
        400,
      );
    }

    let resultPayload = {};
    let resultMessage = "User status updated successfully";

    await runWithTransactionRetry(async (session) => {
      const user = await User.findById(userId)
        .select("_id memberId status isPaid")
        .session(session);

      if (!user) {
        throw new Error("Resource not found");
      }

      const oldStatus = user.status;

      if (action === "activate") {
        if (user.status === 1 && user.isPaid === true) {
          resultPayload = {
            action,
            alreadyActive: true,
            status: user.status,
            isPaid: user.isPaid,
          };
          resultMessage = "User is already active";
          return;
        }

        const existingActivationDebit = await WalletTransaction.findOne({
          userId: user._id,
          type: "ACTIVATION",
          direction: "DEBIT",
        })
          .session(session)
          .lean();

        if (existingActivationDebit) {
          throw new Error("ACTIVATION_WITH_DISTRIBUTION_ALREADY_USED");
        }

        let registrationFeeStr = "0.00";
        let totalDistributed = "0.00";
        const settings = await WalletSettings.findOne().session(session).lean();
        const registrationFee = Number(settings?.registrationFee) || 0;
        registrationFeeStr = registrationFee.toFixed(2);

        if (registrationFee > 0) {
          await creditMainWallet(user._id, registrationFeeStr, {
            type: "ADMIN_CR",
            requestId: `admin:adjust:${uuidv4()}`,
            description: `Admin activation credit ${registrationFeeStr}`,
            adminId: req.user?.id || null,
            session,
          });
        }

        const activationResult = await performActivationAndLevelDistribution(
          user._id,
          { session },
        );
        totalDistributed = activationResult.totalDistributed || "0.00";

        resultPayload = {
          action,
          registrationFeeCredited: registrationFeeStr,
          totalDistributed,
          status: 1,
          isPaid: true,
        };
        resultMessage =
          "User activated successfully with registration fee credit and distribution";
        return;
      }

      if (action === "force_activate") {
        if (user.status === 1 && user.isPaid === true) {
          resultPayload = {
            action,
            alreadyActive: true,
            status: user.status,
            isPaid: user.isPaid,
          };
          resultMessage = "User is already active";
          return;
        }

        await User.findByIdAndUpdate(
          user._id,
          { $set: { status: 1, isPaid: true } },
          { session },
        );
        await handleStatusTransition(user._id, oldStatus, 1, session);

        resultPayload = {
          action,
          registrationFeeCredited: "0.00",
          totalDistributed: "0.00",
          status: 1,
          isPaid: true,
        };
        resultMessage = "User force-activated successfully";
        return;
      }

      if (user.status !== 1 && user.isPaid === false) {
        resultPayload = {
          action,
          alreadyInactive: true,
          status: user.status,
          isPaid: user.isPaid,
        };
        resultMessage = "User is already inactive";
        return;
      }

      await User.findByIdAndUpdate(
        user._id,
        { $set: { status: 2, isPaid: false } },
        { session },
      );
      await handleStatusTransition(user._id, oldStatus, 2, session);
      await Session.deleteMany({ userID: user._id }).session(session);

      resultPayload = {
        action,
        status: 2,
        isPaid: false,
      };
      resultMessage = "User set to inactive successfully";
    });

    return response.successResponse(res, resultPayload, resultMessage);
  } catch (err) {
    if (err.message === "ACTIVATION_WITH_DISTRIBUTION_ALREADY_USED") {
      return response.errorResponse(
        res,
        [
          {
            path: "action",
            msg: "Activate with distribution can be used only once for a user",
          },
        ],
        "Activate with distribution can be used only once for a user",
        400,
      );
    }
    if (err.message === "Resource not found") {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }
    console.error("Error performing user status action:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * DELETE /admin/users/:userId
 * Delete user and associated UserDetails
 */
const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    // Delete UserDetails first (to avoid constraint issues)
    await UserDetails.deleteOne({ userId });

    // Delete all user sessions
    await Session.deleteMany({ userID: userId });

    // Delete User
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    return response.successResponse(res, {}, "User deleted successfully");
  } catch (err) {
    console.error("Error deleting user:", err);

    if (err.kind === "ObjectId" || err.message === "User not found") {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    console.error("Delete user error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getUsersList,
  getUserById,
  createUser,
  updateUserById,
  performUserStatusAction,
  deleteUserById,
};
