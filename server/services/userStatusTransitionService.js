/**
 * User Status Transition Service - ACTIVE-only counting
 *
 * GLOBAL RULE: directCount and totalDownlineCount represent ONLY ACTIVE users (status === 1).
 *
 * When a user transitions:
 * - non-ACTIVE → ACTIVE: increment sponsor.directCount and all ancestors.totalDownlineCount
 * - ACTIVE → non-ACTIVE: decrement sponsor.directCount and all ancestors.totalDownlineCount
 *
 * Handles negative counter prevention. Call inside existing transaction/session when available.
 * IDEMPOTENT: Repeated calls with same oldStatus/newStatus do nothing.
 */

const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const mongoose = require("mongoose");

const ACTIVE_STATUS = 1;

/** Enable via DEBUG_STATUS_TRANSITION=1 for temporary debug logging */
const DEBUG = process.env.DEBUG_STATUS_TRANSITION === "1";

/**
 * Apply count updates when user becomes ACTIVE.
 * Call after setting user status to 1.
 *
 * @param {ObjectId} userId - User who became ACTIVE
 * @param {import('mongoose').ClientSession} [session] - Optional session
 */
async function onUserBecameActive(userId, session = null) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const opts = session ? { session } : {};
  const user = await User.findById(uid).select("referredBy status").lean(opts);
  if (!user || !user.referredBy) return;

  const sponsorId = user.referredBy;
  const sponsorAncestorRows = await UserHierarchy.find({ user: sponsorId })
    .select("ancestor")
    .lean(opts);

  if (DEBUG) {
    console.log(`[statusTransition] INCREMENT sponsor=${sponsorId} directCount+1 totalDownlineCount+1 (user ${uid} became ACTIVE)`);
  }

  // Increment sponsor.directCount and totalDownlineCount
  await User.findByIdAndUpdate(
    sponsorId,
    { $inc: { directCount: 1, totalDownlineCount: 1 } },
    opts
  );

  const ancestorIds = sponsorAncestorRows.map((r) => r.ancestor);
  if (ancestorIds.length > 0) {
    if (DEBUG) {
      console.log(`[statusTransition] INCREMENT ancestors count=${ancestorIds.length} totalDownlineCount+1 each`);
    }
    await User.updateMany(
      { _id: { $in: ancestorIds } },
      { $inc: { totalDownlineCount: 1 } },
      opts
    );
  }
}

/**
 * Apply count updates when user becomes non-ACTIVE (was previously ACTIVE).
 * Call after setting user status to non-1.
 *
 * @param {ObjectId} userId - User who became non-ACTIVE
 * @param {import('mongoose').ClientSession} [session] - Optional session
 */
async function onUserBecameInactive(userId, session = null) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const opts = session ? { session } : {};
  const user = await User.findById(uid).select("referredBy status").lean(opts);
  if (!user || !user.referredBy) return;

  const sponsorId = user.referredBy;
  const sponsorAncestorRows = await UserHierarchy.find({ user: sponsorId })
    .select("ancestor")
    .lean(opts);

  if (DEBUG) {
    console.log(`[statusTransition] DECREMENT sponsor=${sponsorId} directCount-1 totalDownlineCount-1 (user ${uid} became non-ACTIVE)`);
  }

  // Decrement counts, then clamp at 0 (Mongoose-safe updates)
  await User.findByIdAndUpdate(
    sponsorId,
    { $inc: { directCount: -1, totalDownlineCount: -1 } },
    opts
  );
  await User.updateOne(
    { _id: sponsorId, directCount: { $lt: 0 } },
    { $set: { directCount: 0 } },
    opts
  );
  await User.updateOne(
    { _id: sponsorId, totalDownlineCount: { $lt: 0 } },
    { $set: { totalDownlineCount: 0 } },
    opts
  );

  const ancestorIds = sponsorAncestorRows.map((r) => r.ancestor);
  if (ancestorIds.length > 0) {
    if (DEBUG) {
      console.log(`[statusTransition] DECREMENT ancestors count=${ancestorIds.length} totalDownlineCount-1 each (floor 0)`);
    }
    await User.updateMany(
      { _id: { $in: ancestorIds } },
      { $inc: { totalDownlineCount: -1 } },
      opts
    );
    await User.updateMany(
      { _id: { $in: ancestorIds }, totalDownlineCount: { $lt: 0 } },
      { $set: { totalDownlineCount: 0 } },
      opts
    );
  }
}

/**
 * Handle User status transition. Call when admin or system changes user status.
 *
 * @param {ObjectId} userId
 * @param {number} oldStatus - Previous status
 * @param {number} newStatus - New status
 * @param {import('mongoose').ClientSession} [session]
 */
async function handleStatusTransition(userId, oldStatus, newStatus, session = null) {
  if (oldStatus === newStatus) {
    if (DEBUG) console.log(`[statusTransition] SKIP same status userId=${userId}`);
    return;
  }

  const wasActive = oldStatus === ACTIVE_STATUS;
  const isActive = newStatus === ACTIVE_STATUS;

  if (wasActive && !isActive) {
    if (DEBUG) console.log(`[statusTransition] ACTIVE→NON-ACTIVE userId=${userId} old=${oldStatus} new=${newStatus}`);
    await onUserBecameInactive(userId, session);
  } else if (!wasActive && isActive) {
    if (DEBUG) console.log(`[statusTransition] NON-ACTIVE→ACTIVE userId=${userId} old=${oldStatus} new=${newStatus}`);
    await onUserBecameActive(userId, session);
  }
  // Other transitions (e.g. INACTIVE→BLOCKED) do NOT modify counts
}

module.exports = {
  onUserBecameActive,
  onUserBecameInactive,
  handleStatusTransition,
  ACTIVE_STATUS,
};
