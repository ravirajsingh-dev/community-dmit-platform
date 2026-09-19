const crypto = require("crypto");
const { PASSWORD_ENCRYPTION_KEY } = require("../config/config");

// Use environment variable for encryption key, or generate a default (MUST be changed in production)
// The key must be exactly 32 bytes for AES-256
const ENCRYPTION_KEY = PASSWORD_ENCRYPTION_KEY
  ? Buffer.from(PASSWORD_ENCRYPTION_KEY, "hex")
  : crypto.randomBytes(32); // Fallback: random key (DO NOT USE IN PRODUCTION)

// IV length for GCM is 12 bytes (96 bits) - recommended for GCM
const IV_LENGTH = 12;
// Auth tag length for GCM is 16 bytes (128 bits)
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plain text password using AES-256-GCM
 * @param {string} plaintext - The plain text password to encrypt
 * @returns {string|null} - Base64 encoded encrypted string (format: iv:authTag:encryptedData) or null if input is invalid
 */
function encryptPassword(plaintext) {
  if (!plaintext || typeof plaintext !== "string") {
    return null;
  }

  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData (all base64 encoded)
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    // Log error but don't expose details
    console.error("Encryption error:", error.message);
    return null;
  }
}

/**
 * Decrypts an encrypted password using AES-256-GCM
 * Supports both encrypted format and plain text (for backward compatibility)
 * @param {string} encryptedData - The encrypted password string or plain text
 * @returns {string|null} - Decrypted plain text password or original if it was plain text, or null if decryption fails
 */
function decryptPassword(encryptedData) {
  if (!encryptedData || typeof encryptedData !== "string") {
    return null;
  }

  // Check if the data is in encrypted format (contains colons separating iv:authTag:data)
  const parts = encryptedData.split(":");

  // If not in encrypted format (no colons or wrong format), assume it's plain text (backward compatibility)
  if (parts.length !== 3) {
    // This is likely plain text - return as-is for backward compatibility
    // The data will be encrypted on next save
    return encryptedData;
  }

  try {
    const [ivBase64, authTagBase64, encrypted] = parts;

    // Decode from base64
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, check if it might be plain text (backward compatibility)
    // Log error but don't expose details
    console.error("Decryption error:", error.message);
    // Return original value as fallback (might be plain text)
    return encryptedData;
  }
}

/**
 * Checks if a string is encrypted (in our format)
 * @param {string} data - The data to check
 * @returns {boolean} - True if encrypted, false otherwise
 */
function isEncrypted(data) {
  if (!data || typeof data !== "string") {
    return false;
  }
  const parts = data.split(":");
  return parts.length === 3;
}

module.exports = {
  encryptPassword,
  decryptPassword,
  isEncrypted,
};
