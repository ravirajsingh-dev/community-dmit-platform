const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../../../models/User");
const UserDesignation = require("../../../../models/UserDesignation");
const Session = require("../../../../models/Session");

const { JWT_REFRESH_SECRET } = require("../../../../config/config");
const response = require("../../../../config/response");
const { generateTokens } = require("../../../../utils/authUtils");
const {
  logSecurityEvent,
  EVENT_TYPES,
} = require("../../../../utils/auditLogger");

const {
  comparePasswords,
  generateNumericPassword,
} = require("../../../../utils/helper");
const UserDetails = require("../../../../models/UserDetails");

const {
  setAuthTokenCookie,
  setAuthRefreshTokenCookie,
  setSessionIDCookie,
  clearAuthCookies,
  getCookieOptions,
} = require("../../../../utils/cookieUtils");
const CommonSettings = require("../../../../models/CommonSettings");
const {
  sanitizeError,
  sanitizeAuthError,
  sanitizeValidationErrors,
} = require("../../../../utils/errorSanitizer");
const {
  checkBruteForceProtection,
  recordFailedAttempt,
  resetAttempts,
} = require("../../../../utils/bruteForceProtection");

module.exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  try {
    // Check if login is enabled
    const settings = await CommonSettings.getOrCreateSettings();
    if (!settings.loginEnabled) {
      return response.errorResponse(
        res,
        {
          msg: "Service temporarily unavailable. Please contact administrator.",
        },
        "Service temporarily unavailable.",
        503,
      );
    }

    const { memberId, password } = req.body;

    if (!memberId || !password) {
      return response.errorResponse(
        res,
        { msg: "Invalid credentials" },
        "Invalid credentials",
        400,
      );
    }

    // Check brute-force protection before processing login
    const bruteForceCheck = checkBruteForceProtection(memberId);
    if (bruteForceCheck.isBlocked) {
      // Log blocked login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        req,
        details: {
          reason:
            "Account temporarily blocked due to too many failed login attempts",
          memberId,
          blockedUntil: bruteForceCheck.blockedUntil,
        },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "memberId",
            msg: `Account temporarily locked due to too many failed login attempts. Please try again after ${bruteForceCheck.remainingMinutes} minute(s).`,
          },
        ],
        "Account temporarily locked",
        429,
      );
    }

    // Find user by memberId
    const user = await User.findOne({ memberId });

    if (!user) {
      // Record failed login attempt
      recordFailedAttempt(memberId);

      // Log failed login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        req,
        details: { reason: "User not found", memberId },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "memberId",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        401,
      );
    }

    // Check user status
    // status = 3 (Blocked) → block login
    if (user.status === 3) {
      // Record failed login attempt
      recordFailedAttempt(memberId);

      // Log blocked account login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Account blocked", memberId },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "memberId",
            msg: "Account access denied. Please contact support.",
          },
        ],
        "Account access denied",
        403,
      );
    }

    // status = 2 (Inactive) → block login
    if (user.status === 2) {
      // Record failed login attempt
      recordFailedAttempt(memberId);

      // Log inactive account login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Account inactive", memberId },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "memberId",
            msg: "Account access denied. Please contact support.",
          },
        ],
        "Account access denied",
        403,
      );
    }

    // status = 1 (Active) or status = 4 (New) → allow login

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Record failed login attempt
      recordFailedAttempt(memberId);

      // Log failed login attempt (invalid password)
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Invalid password", memberId },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "password",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    const { accessToken, refreshToken, sessionID } = await generateTokens(
      user,
      req,
    );

    // Reset brute-force protection on successful login
    resetAttempts(memberId);

    // Update last_login field
    user.last_login = new Date();
    await user.save();

    // Log successful login
    logSecurityEvent({
      eventType: EVENT_TYPES.USER_LOGIN_SUCCESS,
      status: "success",
      userID: user._id.toString(),
      req,
      details: { memberId },
    });

    // Create sanitized user object without sensitive fields
    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    // Training videos UI expects `user.designations` to contain at least
    // { designationCode, status } for PENDING/APPROVED.
    const designations = await UserDesignation.find({
      userId: user._id,
      status: { $in: ["PENDING", "APPROVED"] },
    })
      .select("designationCode status")
      .lean();
    sanitizedUser.designations = designations;

    setAuthTokenCookie(res, accessToken, "user_");
    setAuthRefreshTokenCookie(res, refreshToken, "user_");
    // Set sessionID cookie for cookie-based authentication
    setSessionIDCookie(res, sessionID, "user_");

    return response.successResponse(
      res,
      { user: sanitizedUser },
      "Login successful",
    );
  } catch (err) {
    console.error("Login error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Find the user by ID
    const user = await User.findById(userId)
      .select("-password -pwdRef -passwordCopy")
      .lean();

    // If user is not found, return error
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    // Fetch user details if exists
    const userDetails = await UserDetails.findOne({ userId: user._id }).lean();

    // Training videos UI expects `user.designations` to contain at least
    // { designationCode, status } for PENDING/APPROVED.
    const designations = await UserDesignation.find({
      userId: user._id,
      status: { $in: ["PENDING", "APPROVED"] },
    })
      .select("designationCode status")
      .lean();

    // Combine user and userDetails
    const userData = {
      ...user,
      userDetails: userDetails || null,
      designations,
    };

    return response.successResponse(res, userData, "User details");
  } catch (err) {
    console.error("Check auth error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.getSponsorUserDetails = async (req, res) => {
  try {
    const referralId = req.params.sponsor_id || req.params.referral_id;

    // Find the user by referralId (memberId)
    const user = await User.findOne({ memberId: referralId }).select(
      "name status memberId",
    );

    // If user is not found, return error
    if (!user) {
      return response.errorResponse(
        res,
        [
          {
            path: "referralId",
            msg: "Resource not found",
          },
        ],
        "Resource not found",
        404,
      );
    }

    // Check if the user is active (status === 1)
    if (user.status !== 1) {
      return response.errorResponse(
        res,
        [
          {
            path: "referralId",
            msg: "Resource not found",
          },
        ],
        "Resource not found",
        404,
      );
    }

    const resData = {
      ...user.toObject(),
    };

    return response.successResponse(res, resData, "Referral User details");
  } catch (err) {
    console.error("Get sponsor user details error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.logout = async (req, res) => {
  // Read refresh token from cookies first, fallback to request body for backward compatibility
  // Try user_ prefix first, then fallback to old cookie name
  const refreshToken =
    req.cookies?.user_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;

  if (!refreshToken) {
    return response.errorResponse(
      res,
      { msg: "Invalid request" },
      "Invalid request",
      400,
    );
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const deletedSession = await Session.findOneAndDelete({
      userID: decoded.id,
      refreshToken,
    });

    // Log session removal
    if (deletedSession) {
      logSecurityEvent({
        eventType: EVENT_TYPES.SESSION_REMOVED,
        status: "success",
        userID: decoded.id.toString(),
        req,
        details: { sessionID: deletedSession.sessionID },
      });
    }

    // Clear authentication cookies - only clear user_ prefixed cookies
    clearAuthCookies(res, "user_");

    return response.successResponse(res, {}, "Logged out successfully.");
  } catch (err) {
    console.error("Logout error:", err);
    return response.errorResponse(
      res,
      {},
      "Session expired. Please login again.",
      403,
    );
  }
};

module.exports.logoutAll = async (req, res) => {
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

    // Delete all sessions for this user (logout from all devices)
    const deletedCount = await Session.deleteMany({ userID: userId });

    // Log session removal (all devices)
    logSecurityEvent({
      eventType: EVENT_TYPES.SESSION_REMOVED_ALL,
      status: "success",
      userID: userId.toString(),
      req,
      details: { sessionsRemoved: deletedCount.deletedCount || 0 },
    });

    return response.successResponse(
      res,
      {},
      "Logged out from all devices successfully.",
    );
  } catch (err) {
    console.error("Logout all error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const { oldPassword, password } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const validPassword = await comparePasswords(oldPassword, user.password);

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "oldPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(password, salt);

    let updatedUser = await User.findByIdAndUpdate(
      { _id: userId },
      {
        password: newPassword,
        pwdRef: password, // Store plain text copy for admin view (will be encrypted by pre-update hook)
        passwordChangedAt: new Date(), // Track password change timestamp
      },
      { returnDocument: "after" },
    ).lean();

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Invalidate all sessions for this user after password change
    // This ensures all devices are logged out immediately
    await Session.deleteMany({ userID: userId });

    // Log password change
    logSecurityEvent({
      eventType: EVENT_TYPES.USER_PASSWORD_CHANGE,
      status: "success",
      userID: userId.toString(),
      req,
    });

    return response.successResponse(res, {}, "Password change successfully.");
  } catch (err) {
    console.error("Change password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.setTxnPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
    );
  }

  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }
    const { txn_password } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const txnPasswordHash = await bcrypt.hash(txn_password, salt);

    let updatedUser = await User.findByIdAndUpdate(
      { _id: user._id },
      {
        txn_password: txnPasswordHash,
        txnPassCopy: txn_password,
      },
      { returnDocument: "after" },
    ).lean();

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    return response.successResponse(
      res,
      {},
      "Set Transaction Password successfully.",
    );
  } catch (err) {
    console.error("Set transaction password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.changeTnxPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const { oldTxnPassword, txn_password } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const validPassword = await comparePasswords(
      oldTxnPassword,
      user.txn_password,
    );

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "oldTxnPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const newTnxPasswordHash = await bcrypt.hash(txn_password, salt);

    let updatedUser = await User.findByIdAndUpdate(
      { _id: userId },
      {
        txn_password: newTnxPasswordHash,
        txnPassCopy: txn_password,
      },
      { returnDocument: "after" },
    ).lean();

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Log transaction password change
    logSecurityEvent({
      eventType: EVENT_TYPES.USER_TXN_PASSWORD_CHANGE,
      status: "success",
      userID: userId.toString(),
      req,
    });

    return response.successResponse(
      res,
      {},
      "TxnPassword change successfully.",
    );
  } catch (err) {
    console.error("Change transaction password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.forgotPasswordStep1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  const { phone } = req.body;

  try {
    if (!phone) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Required field missing" }],
        "Validation Error",
        400,
      );
    }

    const user = await User.findOne({ phone }).select("phone").lean();

    if (!user || !user.phone) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Invalid credentials" }],
        "Invalid credentials",
        404,
      );
    }

    const phoneStr = user.phone.toString();
    const maskedPhone = phoneStr.slice(-4); // last 4 digits

    return response.successResponse(res, { maskedPhone }, "Phone Verified.");
  } catch (err) {
    console.error("Error in forgotPasswordStep1:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.forgotPasswordStep2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone }).select(
      "phone memberId name password",
    );

    if (!user) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Invalid credentials" }],
        "Invalid credentials",
        404,
      );
    }

    // Reset password logic — generate a new random password
    const newPasswordPlain = generateNumericPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPasswordPlain, salt);

    user.password = hashedPassword;
    user.pwdRef = newPasswordPlain; // Store plain text copy for admin view (will be encrypted by pre-save hook)
    user.passwordChangedAt = new Date(); // Track password change timestamp
    await user.save();

    // Delete all sessions for this user after password reset
    // This ensures all devices are logged out immediately
    await Session.deleteMany({ userID: user._id });

    return response.successResponse(
      res,
      {
        msg: "Password reset successfully. Please check your registered contact for the new password.",
      },
      "Password reset successfully. Please check your registered contact for the new password.",
    );
  } catch (err) {
    console.error("Error in forgotPasswordStep2:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};
