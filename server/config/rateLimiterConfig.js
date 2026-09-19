/**
 * Rate Limiter Configuration Module
 *
 * Defines rate limiting configurations for different route groups to prevent
 * abuse and brute force attacks. Each route group has appropriate limits based
 * on its security requirements.
 *
 * Rate limiters:
 * - Auth routes: 15 requests per 15 minutes (prevents brute force)
 * - Admin routes: 50 requests per 15 minutes (moderate restriction)
 * - General API routes: 100 requests per 15 minutes (standard usage)
 */

const rateLimit = require("express-rate-limit");

/**
 * Authentication rate limiter
 * Prevents brute force attacks on login endpoints
 * Limit: 15 requests per 15 minutes
 */
const createAuthLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // Limit each IP to 15 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Admin routes rate limiter
 * Moderate restriction for admin operations
 * Limit: 50 requests per 15 minutes
 */
const createAdminLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Registration rate limiter
 * Dedicated limit for POST /api/auth/users/register
 * Limit: 100 requests per IP per 15 minutes
 */
const createRegistrationLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many registration attempts. Please try again later.",
      });
    },
  });
};

/**
 * General API routes rate limiter
 * Standard restriction for regular API usage
 * Limit: 100 requests per 15 minutes
 */
const createGeneralApiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * User wallet transfer rate limiter
 * Limit: 15 requests per 15 minutes per IP
 */
const createUserWalletTransferLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: "Too many transfer requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Conditional auth rate limiter middleware
 * Excludes registration route from rate limiting
 * @param {Function} authLimiter - The auth rate limiter instance
 * @returns {Function} Middleware function
 */
const createAuthRateLimitMiddleware = (authLimiter) => {
  return (req, res, next) => {
    // Skip rate limiting for registration and referral validation
    const path = req.path || req.originalUrl || "";
    if (path.includes("/users/register") || path.includes("/validate-referral")) {
      return next();
    }
    // Apply rate limiting to all other /api/auth routes (login endpoints)
    return authLimiter(req, res, next);
  };
};

module.exports = {
  createAuthLimiter,
  createAdminLimiter,
  createGeneralApiLimiter,
  createRegistrationLimiter,
  createUserWalletTransferLimiter,
  createAuthRateLimitMiddleware,
};
