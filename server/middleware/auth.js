const jwt = require("jsonwebtoken");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require("../config/config");
const Admin = require("../models/Admin");
const SubAdmin = require("../models/SubAdmin");
const User = require("../models/User");
const Session = require("../models/Session");
const { getClientIP } = require("../utils/auditLogger");

const verifyToken = async (req, res, next, role = null) => {
  // Read tokens from cookies only - no header fallback
  // Strictly separate user and admin cookie reading based on route role
  let token, refreshToken, sessionID;

  // For USER routes (role === 1): Only read from user_ prefixed cookies (fallback to old token/refreshToken/sessionID)
  // For ADMIN routes (role === 2): Only read from admin_ prefixed cookies (fallback to old token/refreshToken/sessionID)
  // For Common routes (role === null): Try both, but this should be rare - prefer user, then admin, then old
  if (role === 1) {
    // USER routes: Only read user_ cookies or old cookie names - NEVER read admin_ cookies
    token = req.cookies?.user_token || req.cookies?.token;
    refreshToken = req.cookies?.user_refreshToken || req.cookies?.refreshToken;
    sessionID = req.cookies?.user_sessionID || req.cookies?.sessionID;
  } else if (role === 2) {
    // ADMIN routes: Only read admin_ cookies or old cookie names - NEVER read user_ cookies
    token = req.cookies?.admin_token || req.cookies?.token;
    refreshToken = req.cookies?.admin_refreshToken || req.cookies?.refreshToken;
    sessionID = req.cookies?.admin_sessionID || req.cookies?.sessionID;
  } else {
    // Common routes (role === null): Try both prefixed and old cookies
    // Prefer user_, then admin_, then old cookie names
    token =
      req.cookies?.user_token || req.cookies?.admin_token || req.cookies?.token;
    refreshToken =
      req.cookies?.user_refreshToken ||
      req.cookies?.admin_refreshToken ||
      req.cookies?.refreshToken;
    sessionID =
      req.cookies?.user_sessionID ||
      req.cookies?.admin_sessionID ||
      req.cookies?.sessionID;
  }

  if (!token || !refreshToken) {
    return res.status(401).json({
      msg: "Session expired. Please login again.",
      tokenStatus: 0,
    });
  }

  if (!sessionID) {
    return res.status(401).json({
      msg: "Session expired. Please login again.",
      tokenStatus: 0,
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = decoded;
  } catch (err) {
    if (err.name !== "TokenExpiredError") {
      return res
        .status(401)
        .json({ msg: "Session expired. Please login again.", tokenStatus: 0 });
    }
  }

  try {
    // If access token is expired, decode refresh token to get user ID for session lookup
    let userIdForSession = null;
    if (!decoded) {
      try {
        const tempDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        userIdForSession = tempDecoded.id;
      } catch (err) {
        // Will be handled later in refresh token verification
      }
    } else {
      userIdForSession = decoded.id;
    }

    const session = await Session.findOne({
      userID: userIdForSession,
      sessionID,
      refreshToken,
    });

    if (!session) {
      return res.status(401).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    }

    if (!session.isActive) {
      return res.status(401).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    }

    // SECURITY: Verify IP and user-agent only in production to avoid unnecessary
    // logouts when IP/browser changes in dev (e.g. WiFi/mobile switch, browser updates).
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && (session.ipAddress || session.userAgent)) {
      const currentIP = getClientIP(req);
      const currentUserAgent = req.headers?.['user-agent'] || null;

      if (session.ipAddress && session.ipAddress !== "unknown" && currentIP !== "unknown") {
        if (session.ipAddress !== currentIP) {
          await Session.findByIdAndUpdate(session._id, { isActive: false });
          return res.status(401).json({
            msg: "Session expired. Please login again.",
            tokenStatus: 0,
          });
        }
      }

      if (session.userAgent && currentUserAgent && session.userAgent !== currentUserAgent) {
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }
    }

    let user;
    let isAdmin = false;
    let isSubAdmin = false;
    // If token is expired, we need to decode refresh token first to get user ID
    if (!decoded) {
      try {
        const decodedRefreshToken = jwt.verify(
          refreshToken,
          JWT_REFRESH_SECRET,
        );
        // Check if it's an admin (role 2), sub-admin (role 3), or user (no role or role 1)
        if (decodedRefreshToken.role === 2) {
          user = await Admin.findById(decodedRefreshToken.id);
          isAdmin = true;
        } else if (decodedRefreshToken.role === 3) {
          user = await SubAdmin.findById(decodedRefreshToken.id);
          isSubAdmin = true;
        } else {
          user = await User.findById(decodedRefreshToken.id);
        }
      } catch (refreshErr) {
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }
    } else {
      // Try Admin first (if role is 2)
      if (decoded.role === 2) {
        user = await Admin.findById(decoded.id);
        if (user) isAdmin = true;
      }
      // Try SubAdmin (if role is 3)
      if (!user && decoded.role === 3) {
        user = await SubAdmin.findById(decoded.id);
        if (user) isSubAdmin = true;
      }
      // If not admin/sub-admin or not found, try User
      if (!user) {
        user = await User.findById(decoded.id);
      }
    }

    if (!user) {
      return res.status(401).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    }

    // SECURITY: Verify role consistency between token and database
    // Determine expected role from database user model
    let expectedRole = 1; // Default to user role
    if (isAdmin) {
      expectedRole = 2; // Admin role
    } else if (isSubAdmin) {
      expectedRole = 3; // SubAdmin role
    }

    // Compare decoded token role with database role
    // Check both access token (if decoded) and refresh token role
    let tokenRole = null;
    if (decoded && decoded.role !== undefined) {
      tokenRole = decoded.role;
    } else {
      // If access token expired, check refresh token role
      try {
        const tempDecodedRefresh = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        if (tempDecodedRefresh.role !== undefined) {
          tokenRole = tempDecodedRefresh.role;
        }
      } catch (err) {
        // Will be handled later in refresh token verification
      }
    }

    // If we have both token role and user from DB, verify they match
    if (tokenRole !== null) {
      if (tokenRole !== expectedRole) {
        // Role mismatch detected - potential token tampering or role escalation attempt
        // Deactivate session immediately
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return res.status(403).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }
    }

    // Check user status - for User model: 3 = Blocked, 2 = Inactive
    if (!isAdmin && !isSubAdmin) {
      if (user.status === 3) {
        return res.status(403).json({
          msg: "Account access denied. Please contact support.",
          tokenStatus: 0,
        });
      }
      if (user.status === 2) {
        return res.status(403).json({
          msg: "Account access denied. Please contact support.",
          tokenStatus: 0,
        });
      }
    } else if (isAdmin) {
      // Admin status check
      if (user.status === 2) {
        return res.status(403).json({
          msg: "Account access denied. Please contact support.",
          tokenStatus: 0,
        });
      }
    } else if (isSubAdmin) {
      // SubAdmin status check - check both status and isActive
      if (user.status === 2 || !user.isActive) {
        return res.status(403).json({
          msg: "Account access denied. Please contact support.",
          tokenStatus: 0,
        });
      }
    }

    // Verify token validity against password change timestamp
    // If password was changed after token was issued, token is invalid
    if (decoded && user.passwordChangedAt) {
      const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
      const passwordChangedAt = new Date(user.passwordChangedAt).getTime();

      if (tokenIssuedAt < passwordChangedAt) {
        // Token was issued before password change - invalidate session
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }
    }

    if (decoded) {
      if (user.uuid !== decoded.uuid) {
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }

      // If Admin auth required, ensure user is admin or sub-admin
      if (role === 2 && !isAdmin && !isSubAdmin) {
        return res.status(403).json({
          msg: "Insufficient permissions. Admin access required.",
          tokenStatus: 0,
        });
      }

      // If User auth required, ensure user is not admin or sub-admin
      if (role === 1 && (isAdmin || isSubAdmin)) {
        return res.status(403).json({
          msg: "Insufficient permissions. User access required.",
          tokenStatus: 0,
        });
      }

      req.userObj = user;
      req.isAdmin = isAdmin;
      req.isSubAdmin = isSubAdmin;
      return next();
    }

    // If token is expired, verify the refresh token
    try {
      const decodedRefreshToken = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      // SECURITY: Verify role consistency between refresh token and database
      // Determine expected role from database user model (already determined above)
      if (
        decodedRefreshToken.role !== undefined &&
        decodedRefreshToken.role !== expectedRole
      ) {
        // Role mismatch detected - potential token tampering or role escalation attempt
        // Deactivate session immediately
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return res.status(403).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }

      // Verify user ID and UUID match
      if (decodedRefreshToken.id !== user._id.toString()) {
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }

      // Check UUID only if it exists in user model
      if (
        user.uuid &&
        decodedRefreshToken.uuid &&
        user.uuid !== decodedRefreshToken.uuid
      ) {
        return res.status(401).json({
          msg: "Session expired. Please login again.",
          tokenStatus: 0,
        });
      }

      // Role check for admin routes - allow both admin and sub-admin
      if (role === 2 && !isAdmin && !isSubAdmin) {
        return res.status(403).json({
          msg: "Insufficient permissions. Admin access required.",
          tokenStatus: 0,
        });
      }

      // Role check for user routes
      if (role === 1 && (isAdmin || isSubAdmin)) {
        return res.status(403).json({
          msg: "Insufficient permissions. User access required.",
          tokenStatus: 0,
        });
      }

      // Verify refresh token validity against password change timestamp
      if (user.passwordChangedAt) {
        const refreshTokenIssuedAt = decodedRefreshToken.iat * 1000; // Convert to milliseconds
        const passwordChangedAt = new Date(user.passwordChangedAt).getTime();

        if (refreshTokenIssuedAt < passwordChangedAt) {
          // Refresh token was issued before password change - invalidate session
          await Session.findByIdAndUpdate(session._id, { isActive: false });
          return res.status(401).json({
            msg: "Session expired. Please login again.",
            tokenStatus: 0,
          });
        }
      }

      // Do NOT rotate here. Return 401 so the client calls POST /api/auth/refresh-token.
      // Rotation in middleware causes a race: another in-flight request with old cookies
      // fails session lookup (DB already has new refreshToken) then refresh-token fails
      // with "Invalid token" → sudden logout. Only the refresh-token endpoint should rotate.
      return res.status(401).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    } catch (refreshError) {
      console.error("Refresh token verification error:", refreshError);
      return res.status(401).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    }
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ msg: "An error occurred", tokenStatus: 0 });
  }
};

const AdminAuth = (req, res, next) => verifyToken(req, res, next, 2);
const UserAuth = (req, res, next) => verifyToken(req, res, next, 1);
const Common = (req, res, next) => verifyToken(req, res, next);

module.exports = {
  AdminAuth,
  UserAuth,
  Common,
};
