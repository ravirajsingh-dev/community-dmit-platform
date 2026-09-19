/**
 * Input Validation Middleware
 *
 * This middleware validates and sanitizes user inputs before they reach controllers
 */

const {
  validateEmail,
  validatePhone,
  validateUPI,
  validateUTR,
  validateAmount,
  validateReferralId,
  validateMemberId,
  sanitizeRequestBody,
  containsDangerousPatterns,
  containsDangerousPatternsForSocialUrl,
} = require("../utils/inputValidation");
const { sanitizeValidationError } = require("../utils/errorSanitizer");

/**
 * Middleware to sanitize request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeRequestBody(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeRequestBody(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeRequestBody(req.params);
  }

  next();
};

/**
 * Validate email field
 */
const validateEmailField = (fieldName = "email") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateEmail(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate phone field
 */
const validatePhoneField = (fieldName = "phone") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validatePhone(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate UPI field
 */
const validateUPIField = (fieldName = "upiId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateUPI(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate UTR field
 */
const validateUTRField = (fieldName = "utrNumber") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateUTR(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate amount field
 */
const validateAmountField = (fieldName = "amount") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateAmount(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate referral ID field
 */
const validateReferralIdField = (fieldName = "referralId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateReferralId(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate Member ID field
 */
const validateMemberIdField = (fieldName = "memberId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateMemberId(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Check for dangerous patterns in request body.
 * Uses relaxed URL-aware check for req.body.socialMedia.* values only (Admin Social Media Links).
 */
const checkDangerousPatterns = (req, res, next) => {
  const checkValue = (value, isSocialMediaContext = false) => {
    if (typeof value === "string") {
      const isDangerous = isSocialMediaContext
        ? containsDangerousPatternsForSocialUrl(value)
        : containsDangerousPatterns(value);
      if (isDangerous) {
        return true;
      }
    } else if (typeof value === "object" && value !== null) {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (containsDangerousPatterns(key)) {
            return true;
          }
          const nextIsSocial =
            isSocialMediaContext ||
            (value === req.body && key === "socialMedia") ||
            key === "embedUrl";
          if (checkValue(value[key], nextIsSocial)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (req.body && checkValue(req.body)) {
    return res.status(400).json({
      errors: [{ msg: "Input contains potentially dangerous patterns" }],
      message: "Invalid input detected",
    });
  }

  // Query params: skip dangerous-pattern check for structured API params that
  // contain our filter format (query=JSON with date "from|to", filters=comma list)
  const skipQueryKeys = new Set(["query", "filters"]);
  if (req.query && typeof req.query === "object") {
    for (const key in req.query) {
      if (!Object.prototype.hasOwnProperty.call(req.query, key)) continue;
      if (containsDangerousPatterns(key)) {
        return res.status(400).json({
          errors: [
            { msg: "Query parameters contain potentially dangerous patterns" },
          ],
          message: "Invalid input detected",
        });
      }
      if (skipQueryKeys.has(key)) continue;
      if (checkValue(req.query[key])) {
        return res.status(400).json({
          errors: [
            { msg: "Query parameters contain potentially dangerous patterns" },
          ],
          message: "Invalid input detected",
        });
      }
    }
  }

  next();
};

/**
 * Middleware to whitelist request body fields - rejects unknown fields
 * @param {string[]} allowedFields - Array of allowed field names
 * @returns {Function} Express middleware
 */
const whitelistBodyFields = (allowedFields) => {
  const set = new Set(allowedFields || []);
  return (req, res, next) => {
    if (!req.body || typeof req.body !== "object") return next();
    const unknownFields = Object.keys(req.body).filter((key) => !set.has(key));
    if (unknownFields.length > 0) {
      const response = require("../config/response");
      return response.errorResponse(
        res,
        unknownFields.map((field) => ({ path: field, msg: `Field '${field}' is not allowed` })),
        "Validation Error",
        400
      );
    }
    next();
  };
};

module.exports = {
  sanitizeInput,
  validateEmailField,
  validatePhoneField,
  validateUPIField,
  validateUTRField,
  validateAmountField,
  validateReferralIdField,
  validateMemberIdField,
  checkDangerousPatterns,
  whitelistBodyFields,
};
