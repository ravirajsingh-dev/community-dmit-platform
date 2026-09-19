/**
 * MongoDB Indexes for Team / Closure Table System
 *
 * Ensures all hierarchy and user indexes exist.
 * Run at startup or via migration.
 */

const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");

async function ensureTeamIndexes() {
  try {
    await User.syncIndexes();
    await UserHierarchy.syncIndexes();
    return { ok: 1 };
  } catch (err) {
    console.error("Team index creation error:", err);
    throw err;
  }
}

module.exports = { ensureTeamIndexes };
