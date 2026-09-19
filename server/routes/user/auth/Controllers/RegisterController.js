const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const User = require("../../../../models/User");
const {
  generateMemberId,
  isDuplicateMemberIdError,
} = require("../../../../utils/helper");
const response = require("../../../../config/response");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
  formatMongooseValidationErrors,
} = require("../../../../utils/errorSanitizer");
const { validateReferralId } = require("../../../../services/referralService");
const {
  validateEPinForRegistration,
  useEPinForRegistration,
} = require("../../../../services/epinService");
const {
  setupHierarchyForNewUser,
} = require("../../../../services/teamRegistrationService");
const {
  reservePhoneCapacity,
} = require("../../../../services/phoneLimitService");

const MAX_MEMBER_ID_SAVE_RETRIES = 20;

const register = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { name, phone, email, password, referralId, epinId } = req.body;

    if (!name || !phone || !password) {
      return response.errorResponse(
        res,
        [{ msg: "Name, phone, and password are required." }],
        "Validation Error",
        400,
      );
    }

    const referralIdTrimmed = referralId ? String(referralId).trim() : "";
    if (!referralIdTrimmed) {
      return response.errorResponse(
        res,
        [{ path: "referralId", msg: "Referral ID is required" }],
        "Referral ID is required",
        400,
      );
    }

    const epinIdTrimmed = epinId ? String(epinId).trim().toUpperCase() : "";
    if (!epinIdTrimmed) {
      return response.errorResponse(
        res,
        [{ path: "epinId", msg: "E-PIN is required" }],
        "E-PIN is required",
        400,
      );
    }

    const phoneStr = String(phone).trim();
    if (phoneStr.length !== 10) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Phone number must be 10 digits." }],
        "Validation Error",
        400,
      );
    }

    let user;

    await session.withTransaction(async () => {
      await reservePhoneCapacity(phoneStr, session);

      const referralValidation = await validateReferralId(referralIdTrimmed);
      if (!referralValidation.valid) {
        const msg =
          referralValidation.message === "Referral ID not found"
            ? "Invalid referral ID"
            : referralValidation.message === "Referrer is not active"
              ? "Sponsor is not active"
              : referralValidation.message ===
                  "Referrer has not completed payment"
                ? "Sponsor is not eligible"
                : referralValidation.message === "Sponsor is not allowed to refer"
                  ? "Sponsor is not allowed to refer"
                : referralValidation.message || "Invalid referral ID";
        throw new Error(msg);
      }

      const sponsor = referralValidation.referrer;

      const epinValidation = await validateEPinForRegistration(
        epinIdTrimmed,
        sponsor._id
      );
      if (!epinValidation.valid) {
        throw new Error(epinValidation.message || "Invalid E-PIN");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const uuid = uuidv4();
      let saved = false;
      for (let attempt = 0; attempt < MAX_MEMBER_ID_SAVE_RETRIES; attempt += 1) {
        const memberId = await generateMemberId(session);
        const userData = {
          memberId,
          name,
          phone: phoneStr,
          email: email || `${phoneStr}@noemail.local`,
          password: hashedPassword,
          pwdRef: password,
          status: 4,
          isPaid: false,
          referredBy: sponsor._id,
          referredByMemberId: sponsor.memberId,
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

      await setupHierarchyForNewUser(user._id, sponsor._id, session);

      await useEPinForRegistration(sponsor._id, epinIdTrimmed, user._id, session);
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.pwdRef;
    delete sanitizedUser.passwordCopy;

    return response.successResponse(res, {
      user: sanitizedUser,
    }, "Registration successful");
  } catch (err) {
    console.error("Registration error:", err);

    if (err.name === "ValidationError" && err.errors) {
      const errors = formatMongooseValidationErrors(err);
      const message = errors[0]?.msg || "Please check your input";
      return response.errorResponse(res, errors, message, 400);
    }

    if (err.message && err.message.includes("Phone number user limit exceeded")) {
      console.error("Registration error details:", err);
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "This phone number already has the maximum allowed 5 users.",
          },
        ],
        "Phone number user limit exceeded",
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
        "Duplicate field error",
        400,
      );
    }

    if (err.message) {
      const pathMap = {
        "Insufficient balance": "epinId",
        "E-PIN not found": "epinId",
        "Invalid E-PIN": "epinId",
        "Invalid E-PIN format": "epinId",
        "E-PIN already used": "epinId",
        "E-PIN has already been used": "epinId",
        "E-PIN already used or invalid": "epinId",
        "Invalid referral ID": "referralId",
        "Referral ID not found": "referralId",
        "Sponsor is not active": "referralId",
        "Sponsor is not allowed to refer": "referralId",
        "Sponsor is not eligible": "referralId",
        "Self-referral is not allowed": "referralId",
        [`Unable to save user with a unique member ID after ${MAX_MEMBER_ID_SAVE_RETRIES} attempts.`]:
          "memberId",
      };
      const userFriendlyMessages = {
        "Insufficient balance":
          "E-PIN holder has insufficient balance for activation. Please use a different E-PIN or contact the E-PIN holder.",
        "E-PIN not found":
          "This E-PIN is invalid or has already been used. Please verify with your sponsor.",
        "Invalid E-PIN":
          "This E-PIN is invalid or has already been used. Please verify with your sponsor.",
        "Invalid E-PIN format":
          "Invalid E-PIN format. Please check and enter correctly.",
        "E-PIN has already been used":
          "This E-PIN has already been used. Please get a new one from your sponsor.",
        "E-PIN already used or invalid":
          "This E-PIN is invalid or has already been used. Please verify with your sponsor.",
      };
      const path = pathMap[err.message];
      const userMsg =
        userFriendlyMessages[err.message] ||
        (path ? err.message : sanitizeError(err.message, "validation"));
      const errorItem = path ? [{ path, msg: userMsg }] : [{ msg: userMsg }];
      return response.errorResponse(res, errorItem, userMsg, 400);
    }

    return response.errorResponse(res, {}, "An error occurred", 500);
  } finally {
    await session.endSession();
  }
};

module.exports = {
  register,
};
