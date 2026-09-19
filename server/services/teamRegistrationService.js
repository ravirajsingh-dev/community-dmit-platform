/**
 * Team Registration Service - Closure Table Integration
 *
 * ACTIVE-ONLY RULE: directCount and totalDownlineCount represent ONLY ACTIVE users.
 * New users register with status 4 (New). Counts are incremented when user becomes ACTIVE
 * via userStatusTransitionService.onUserBecameActive (from levelCommissionService or admin).
 *
 * Atomic registration flow:
 * 1. Validate sponsor
 * 2. Create user U (status 4)
 * 3. Insert closure entries (U,S,1) + (U, each ancestor of S, level+1)
 * 4. NO count increment here - counts updated when user becomes status 1 (ACTIVE)
 *
 * All operations must run inside MongoDB transaction.
 */

const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const { runWithTransactionRetry } = require("../utils/transactionRetry");

/**
 * Execute hierarchy setup and count updates when a new user U joins under sponsor S.
 * Call this INSIDE the same transaction as user creation.
 *
 * @param {ObjectId} newUserId - The newly created user's _id
 * @param {ObjectId} sponsorId - The sponsor's _id
 * @param {import('mongoose').ClientSession} session - MongoDB session
 * @throws {Error} On validation failure or DB error (triggers rollback)
 */
async function setupHierarchyForNewUser(newUserId, sponsorId, session) {
  if (!newUserId || !sponsorId) {
    throw new Error("newUserId and sponsorId are required");
  }
  if (newUserId.toString() === sponsorId.toString()) {
    throw new Error("Sponsor cannot be self");
  }

  // 1. Insert direct relationship: { user: U, ancestor: S, level: 1 }
  await UserHierarchy.create(
    [{ user: newUserId, ancestor: sponsorId, level: 1 }],
    { session }
  );

  // 2. Fetch all hierarchy rows where user = S (all ancestors of S)
  const sponsorAncestorRows = await UserHierarchy.find({ user: sponsorId })
    .select("ancestor level")
    .session(session)
    .lean();

  if (sponsorAncestorRows.length > 0) {
    const additionalRows = sponsorAncestorRows.map((row) => ({
      user: newUserId,
      ancestor: row.ancestor,
      level: row.level + 1,
    }));
    await UserHierarchy.insertMany(additionalRows, { session });
  }

  // 3. NO count increment - ACTIVE-only rule: counts updated when user becomes ACTIVE (status 1)
  // via userStatusTransitionService.onUserBecameActive
}

/**
 * Run full registration with hierarchy. Use when registration is standalone.
 * For existing RegisterController, use setupHierarchyForNewUser inside its transaction.
 *
 * @param {Object} userData - User document data
 * @param {ObjectId} sponsorId - Sponsor _id
 * @returns {Promise<{user: User}>}
 */
async function registerWithHierarchy(userData, sponsorId) {
  let createdUser;
  await runWithTransactionRetry(async (session) => {
    const user = new User(userData);
    await user.save({ session });
    createdUser = user;

    await setupHierarchyForNewUser(user._id, sponsorId, session);
  });
  return { user: createdUser };
}

module.exports = {
  setupHierarchyForNewUser,
  registerWithHierarchy,
};
