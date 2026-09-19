var bcrypt = require("bcryptjs");

const emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

module.exports.isEmailValid = (email) => {
  if (!email) return false;

  if (email.length > 254) return false;

  var valid = emailRegex.test(email);
  if (!valid) return false;

  // Further checking of some things regex can't handle
  var parts = email.split("@");
  if (parts[0].length > 64) return false;

  var domainParts = parts[1].split(".");
  if (
    domainParts.some(function (part) {
      return part.length > 63;
    })
  )
    return false;

  return true;
};

module.exports.isAdminIDValid = (adminId) => {
  if (!adminId || typeof adminId !== "string") return false;

  // Trim whitespace
  const trimmedId = adminId.trim();

  // Check length first (8-15 characters as per schema)
  if (trimmedId.length < 8 || trimmedId.length > 15) return false;

  // Admin ID validation: alphanumeric only (letters and numbers), case-insensitive
  // Pattern: 8-15 alphanumeric characters
  const adminIDRegex = /^[A-Z0-9]+$/i;
  return adminIDRegex.test(trimmedId);
};

module.exports.comparePasswords = async (plainPassword, hashedPassword) => {
  try {
    const validPassword = await bcrypt.compare(plainPassword, hashedPassword);
    return validPassword;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

module.exports.parseTokenExpiryTime = (tokenExpiryTime) => {
  const unit = tokenExpiryTime.slice(-1);
  const value = parseInt(tokenExpiryTime.slice(0, -1));

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      throw new Error("Invalid token expiry time unit");
  }
};

module.exports.generateNumericPassword = (length = 4) => {
  const digits = "0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  return password;
};

/**
 * Generate globally unique member ID in format G#########.
 * This is phone-independent and retries on collisions.
 */
const MEMBER_ID_REGEX = /^G\d{9}$/;
const MAX_MEMBER_ID_GENERATION_RETRIES = 20;

const isDuplicateMemberIdError = (err) => {
  if (!err || err.code !== 11000) return false;
  if (err?.keyPattern?.memberId) return true;
  if (err?.keyValue?.memberId) return true;
  return String(err.message || "").includes("memberId");
};

module.exports.isDuplicateMemberIdError = isDuplicateMemberIdError;

module.exports.generateMemberId = async (session = null) => {
  const User = require("../models/User");
  for (
    let attempt = 0;
    attempt < MAX_MEMBER_ID_GENERATION_RETRIES;
    attempt += 1
  ) {
    const randomNineDigits = Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, "0");
    const memberId = `G${randomNineDigits}`;
    if (!MEMBER_ID_REGEX.test(memberId)) {
      continue;
    }

    const existing = session
      ? await User.findOne({ memberId }).session(session).lean()
      : await User.findOne({ memberId }).lean();

    if (!existing) {
      return memberId;
    }
  }

  throw new Error(
    `Unable to generate unique member ID after ${MAX_MEMBER_ID_GENERATION_RETRIES} attempts.`,
  );
};

// Backward-compatible export name (logic is fully new and phone-independent).
module.exports.generateMemberIdFromPhone = module.exports.generateMemberId;
