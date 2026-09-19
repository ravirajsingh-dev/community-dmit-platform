/**
 * Middleware Loader Module
 * 
 * Loads and applies general middleware to the Express application in the correct order.
 * This includes:
 * - Body parser (JSON and URL-encoded)
 * - Morgan logging
 * - Input sanitization
 * - Session expiry checking
 * 
 * Note: Cookie parser is loaded separately in server.js to maintain exact middleware order.
 * 
 * IMPORTANT: Middleware order matters for security and functionality.
 */

const bodyParser = require("body-parser");
const morganMiddleware = require("../middleware/morgan");
const { checkSessionExpiry } = require("../middleware/checkSessionExpiry");
const { excludeRoutes } = require("../middleware/middlewareHelper");
const { excludedPaths } = require("../config/constants");
const {
  sanitizeInput,
  checkDangerousPatterns,
} = require("../middleware/inputValidation");

/**
 * Load all general middleware (excluding cookie parser which is loaded separately)
 * @param {Express} app - Express application instance
 */
const loadMiddleware = (app) => {
  // SECURITY: Set body parser limits to 10MB to prevent DoS attacks via large payloads
  // File uploads use multer with separate limits (2MB for images), so they are not affected
  app.use(bodyParser.json({ extended: true, limit: "10mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

  // Morgan logging middleware
  app.use(morganMiddleware);

  // Input sanitization middleware (applied before other middleware)
  app.use(sanitizeInput);
  app.use(checkDangerousPatterns);

  // Session expiry checking middleware (applied to all routes except excluded paths)
  app.use(excludeRoutes(checkSessionExpiry, excludedPaths));

  console.log("✅ General middleware loaded");
};

module.exports = {
  loadMiddleware,
};
