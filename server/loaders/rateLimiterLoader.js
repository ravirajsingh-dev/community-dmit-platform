/**
 * Rate Limiter Loader Module
 *
 * Loads and applies rate limiting middleware to specific route groups.
 * Rate limiter configurations are loaded from config/rateLimiterConfig.js.
 *
 * Rate limiters are applied in order of specificity:
 * 1. Auth routes (most restrictive)
 * 2. Admin routes (moderate restriction)
 * 3. General API routes (standard restriction)
 */

// Uncomment when enabling rate limiting:
// const {
//   createAuthLimiter,
//   createAdminLimiter,
//   createGeneralApiLimiter,
//   createUserWalletTransferLimiter,
//   createAuthRateLimitMiddleware,
// } = require("../config/rateLimiterConfig");

/**
 * Load rate limiting middleware
 * @param {Express} app - Express application instance
 */
const loadRateLimiters = (app) => {
  // RATE LIMITING DISABLED - uncomment below block when needed
  /*
  const authLimiter = createAuthLimiter();
  const adminLimiter = createAdminLimiter();
  const generalApiLimiter = createGeneralApiLimiter();
  const authRateLimitMiddleware = createAuthRateLimitMiddleware(authLimiter);

  app.use("/api/auth/users/register", (req, res, next) => next());
  app.use("/api/auth", authRateLimitMiddleware);

  const userWalletTransferLimiter = createUserWalletTransferLimiter();
  app.use("/api/users/wallet/transfer", (req, res, next) => {
    if (req.method === "POST") return userWalletTransferLimiter(req, res, next);
    next();
  });
  app.use("/api/users/wallet/club-transfer", (req, res, next) => {
    if (req.method === "POST") return userWalletTransferLimiter(req, res, next);
    next();
  });

  app.use("/api/admin", adminLimiter);
  app.use("/api/users", generalApiLimiter);
  app.use("/api/common", generalApiLimiter);
  */

  // Pass-through when rate limiting is disabled
  const noOp = (req, res, next) => next();
  app.use("/api/auth/users/register", noOp);
  app.use("/api/auth", noOp);
  app.use("/api/users/wallet/transfer", noOp);
  app.use("/api/users/wallet/club-transfer", noOp);
  app.use("/api/admin", noOp);
  app.use("/api/users", noOp);
  app.use("/api/common", noOp);

  console.log("✅ Rate limiting middleware loaded (DISABLED - uncomment block above to enable)");
};

module.exports = {
  loadRateLimiters,
};
