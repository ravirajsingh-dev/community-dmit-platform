const crypto = require("crypto");
const EPin = require("../models/EPin");

const PREFIX = "G";
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SUFFIX_LENGTH = 19;
const MAX_RETRIES = 5;

/**
 * Generate a single E-PIN: G + 19 uppercase alphanumeric characters
 * Format: G8F7K29J3L9X2Q1R5T6
 * @returns {string}
 */
const generateRandomEPinString = () => {
  const bytes = crypto.randomBytes(SUFFIX_LENGTH);
  let result = PREFIX;
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return result;
};

/**
 * Generate a unique E-PIN, checking DB for collisions
 * Retries up to MAX_RETRIES times before failing
 * @param {Object} [options] - Optional options
 * @param {Object} [options.session] - MongoDB session for transaction
 * @returns {Promise<string>} - Unique epinId
 * @throws {Error} - If uniqueness cannot be achieved after retries
 */
const generateEPin = async (options = {}) => {
  const { session } = options;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const epinId = generateRandomEPinString();

    const exists =
      session
        ? await EPin.findOne({ epinId }).session(session).lean()
        : await EPin.findOne({ epinId }).lean();

    if (!exists) {
      return epinId;
    }
  }

  throw new Error(
    `Failed to generate unique E-PIN after ${MAX_RETRIES} attempts`
  );
};

module.exports = {
  generateEPin,
  generateRandomEPinString,
};
