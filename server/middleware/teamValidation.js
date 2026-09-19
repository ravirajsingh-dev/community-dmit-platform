/**
 * Team Route Validation Middleware
 *
 * Validates ObjectId params for team routes.
 * Prevents circular hierarchy, sponsor=self, invalid IDs.
 */

const mongoose = require("mongoose");
const response = require("../config/response");

/**
 * Validate ObjectId in req.params[paramName]
 * Returns 400 with error if invalid.
 */
function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value) return next();

    if (!mongoose.Types.ObjectId.isValid(value)) {
      return response.errorResponse(
        res,
        [{ msg: `Invalid ${paramName}: must be a valid ObjectId` }],
        "Invalid parameter",
        400
      );
    }
    next();
  };
}

/**
 * Validate level param is a positive integer (1..1000)
 */
function validateLevelParam(req, res, next) {
  const level = req.params.level;
  if (!level) return next();

  const num = parseInt(level, 10);
  if (isNaN(num) || num < 1 || num > 1000) {
    return response.errorResponse(
      res,
      [{ msg: "Level must be a positive integer between 1 and 1000" }],
      "Invalid level parameter",
      400
    );
  }
  next();
}

/**
 * Validate userId param (for admin routes)
 */
const validateUserId = validateObjectIdParam("userId");

/**
 * Validate nodeId param (for structure routes)
 */
const validateNodeId = validateObjectIdParam("nodeId");

module.exports = {
  validateLevelParam,
  validateUserId,
  validateNodeId,
};
