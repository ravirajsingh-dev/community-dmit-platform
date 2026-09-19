/**
 * Brute-force protection utility
 * Tracks failed login attempts per user/admin and blocks accounts after 5 failed attempts for 15 minutes
 */

// In-memory storage for failed login attempts
// Structure: Map<identifier, { attempts: number, blockedUntil: Date | null }>
const failedAttempts = new Map();

// Configuration
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Clean up expired entries (older than block duration)
 * This prevents memory leaks from old entries
 */
const cleanupExpiredEntries = () => {
  const now = new Date();
  for (const [identifier, data] of failedAttempts.entries()) {
    if (data.blockedUntil && data.blockedUntil < now) {
      failedAttempts.delete(identifier);
    }
  }
};

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check if an account is blocked due to brute-force protection
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 * @returns {Object} - { isBlocked: boolean, blockedUntil: Date | null, remainingAttempts: number }
 */
const checkBruteForceProtection = (identifier) => {
  cleanupExpiredEntries();

  const attemptData = failedAttempts.get(identifier);

  if (!attemptData) {
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  const now = new Date();

  // If blocked, check if block period has expired
  if (attemptData.blockedUntil && attemptData.blockedUntil > now) {
    const remainingMs = attemptData.blockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      isBlocked: true,
      blockedUntil: attemptData.blockedUntil,
      remainingAttempts: 0,
      remainingMinutes,
    };
  }

  // Block period expired, but attempts may still be recorded
  if (attemptData.blockedUntil && attemptData.blockedUntil <= now) {
    failedAttempts.delete(identifier);
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // Not blocked yet, return remaining attempts
  return {
    isBlocked: false,
    blockedUntil: null,
    remainingAttempts: MAX_ATTEMPTS - attemptData.attempts,
  };
};

/**
 * Record a failed login attempt
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 */
const recordFailedAttempt = (identifier) => {
  cleanupExpiredEntries();

  const attemptData = failedAttempts.get(identifier) || {
    attempts: 0,
    blockedUntil: null,
  };

  attemptData.attempts += 1;

  // If we've reached max attempts, block the account
  if (attemptData.attempts >= MAX_ATTEMPTS) {
    const now = new Date();
    attemptData.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
  }

  failedAttempts.set(identifier, attemptData);
};

/**
 * Reset failed attempts for a successful login
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 */
const resetAttempts = (identifier) => {
  failedAttempts.delete(identifier);
};

module.exports = {
  checkBruteForceProtection,
  recordFailedAttempt,
  resetAttempts,
};
