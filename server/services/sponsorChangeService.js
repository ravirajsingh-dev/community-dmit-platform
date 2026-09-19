/**
 * Sponsor Change Service - Safe transactional sponsor migration
 *
 * Ensures:
 * - referredBy update
 * - UserHierarchy (closure table) rebuild for moved user + all descendants
 * - directCount / totalDownlineCount reconciliation on old and new sponsor chains
 * - No circular reference (cannot move under own descendant)
 * - MongoDB transaction for atomicity
 *
 * Time complexity: O(|subtree| × |newSponsorAncestors|) for hierarchy writes
 * Typically: O(d × a) where d = descendants of moved user, a = ancestors of new sponsor
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const { runWithTransactionRetry } = require("../utils/transactionRetry");

/**
 * Validate that new sponsor is not the moved user and not a descendant of moved user.
 * @param {ObjectId} movedUserId
 * @param {ObjectId} newSponsorId
 * @param {import('mongoose').ClientSession} session
 * @returns {{ valid: boolean, reason?: string }}
 */
async function validateSponsorChange(movedUserId, newSponsorId, session) {
  const movedStr = movedUserId.toString();
  const sponsorStr = newSponsorId.toString();

  if (movedStr === sponsorStr) {
    return { valid: false, reason: "Cannot set self as sponsor" };
  }

  // New sponsor must not be in moved user's downline (would create cycle)
  const isDescendant = await UserHierarchy.exists({
    user: newSponsorId,
    ancestor: movedUserId,
  }).session(session);

  if (isDescendant) {
    return {
      valid: false,
      reason: "Cannot move user under their own descendant (would create circular reference)",
    };
  }

  return { valid: true };
}

/**
 * Execute safe sponsor change inside a MongoDB transaction.
 * Call this when admin changes referralId for a user.
 *
 * @param {ObjectId} movedUserId - User whose sponsor is changing
 * @param {ObjectId} newSponsorId - New sponsor (referrer)
 * @param {ObjectId} oldSponsorId - Current sponsor (for count decrement)
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
async function processSponsorChange(movedUserId, newSponsorId, oldSponsorId) {
  const movedId = new mongoose.Types.ObjectId(movedUserId);
  const newId = new mongoose.Types.ObjectId(newSponsorId);
  const oldId = oldSponsorId ? new mongoose.Types.ObjectId(oldSponsorId) : null;

  return runWithTransactionRetry(async (session) => {
    // --- STEP 1: Validate ---
    const validation = await validateSponsorChange(movedId, newId, session);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // --- STEP 2: Get subtree (moved user + all descendants with level from moved) ---
    const descendantRows = await UserHierarchy.find({ ancestor: movedId })
      .select("user level")
      .session(session)
      .lean();

    const subtreeUserIds = [movedId, ...descendantRows.map((r) => r.user)];

    // ACTIVE-only: counts reflect only status===1 users
    const subtreeUsers = await User.find({ _id: { $in: subtreeUserIds } })
      .select("status")
      .session(session)
      .lean();
    const activeSubtreeSize = subtreeUsers.filter((u) => u.status === 1).length;
    const movedUserDoc = subtreeUsers.find((u) => u._id.toString() === movedId.toString());
    const movedUserIsActive = movedUserDoc?.status === 1;

    // Map: user -> level from moved (1 = direct child of moved)
    const levelFromMoved = new Map([[movedId.toString(), 0]]);
    descendantRows.forEach((r) => {
      levelFromMoved.set(r.user.toString(), r.level);
    });

    // --- STEP 3: Get new sponsor's ancestors ---
    const newSponsorAncestorRows = await UserHierarchy.find({ user: newId })
      .select("ancestor level")
      .session(session)
      .lean();

    // --- STEP 4: Delete all hierarchy rows for subtree ---
    await UserHierarchy.deleteMany(
      { user: { $in: subtreeUserIds } },
      { session }
    );

    // --- STEP 5: Update User.referredBy for moved user ---
    await User.findByIdAndUpdate(
      movedId,
      {
        $set: {
          referredBy: newId,
          referredByMemberId: (
            await User.findById(newId).select("memberId").session(session).lean()
          )?.memberId,
        },
      },
      { session }
    );

    // --- STEP 6: Insert new hierarchy rows ---
    const hierarchyInserts = [];

    // For moved user: (moved, newSponsor, 1) + (moved, each ancestor of newSponsor, level+1)
    hierarchyInserts.push({ user: movedId, ancestor: newId, level: 1 });
    newSponsorAncestorRows.forEach((row) => {
      hierarchyInserts.push({
        user: movedId,
        ancestor: row.ancestor,
        level: row.level + 1,
      });
    });

    // For each descendant D at level L from moved: (D, newSponsor, L+1) + (D, each A, L+1+levelOf(N,A))
    for (const row of descendantRows) {
      const levelFromM = row.level;
      hierarchyInserts.push({
        user: row.user,
        ancestor: newId,
        level: levelFromM + 1,
      });
      newSponsorAncestorRows.forEach((ar) => {
        hierarchyInserts.push({
          user: row.user,
          ancestor: ar.ancestor,
          level: levelFromM + 1 + ar.level,
        });
      });
    }

    if (hierarchyInserts.length > 0) {
      await UserHierarchy.insertMany(hierarchyInserts, { session });
    }

    // --- STEP 7: Decrement counts on old sponsor chain (ACTIVE-only) ---
    if (oldId && (movedUserIsActive || activeSubtreeSize > 0)) {
      const directDelta = movedUserIsActive ? -1 : 0;
      const downlineDelta = -activeSubtreeSize;

      if (directDelta !== 0 || downlineDelta !== 0) {
        await User.findByIdAndUpdate(
          oldId,
          [
            {
              $set: {
                directCount: { $max: [0, { $add: ["$directCount", directDelta] }] },
                totalDownlineCount: { $max: [0, { $add: ["$totalDownlineCount", downlineDelta] }] },
              },
            },
          ],
          { session }
        );

        const oldSponsorAncestorRows = await UserHierarchy.find({ user: oldId })
          .select("ancestor")
          .session(session)
          .lean();

        const oldAncestorIds = oldSponsorAncestorRows.map((r) => r.ancestor);
        if (oldAncestorIds.length > 0 && downlineDelta !== 0) {
          await User.updateMany(
            { _id: { $in: oldAncestorIds } },
            [
              {
                $set: {
                  totalDownlineCount: { $max: [0, { $add: ["$totalDownlineCount", downlineDelta] }] },
                },
              },
            ],
            { session }
          );
        }
      }
    }

    // --- STEP 8: Increment counts on new sponsor chain (ACTIVE-only) ---
    const directDelta = movedUserIsActive ? 1 : 0;
    const downlineDelta = activeSubtreeSize;
    if (directDelta > 0 || downlineDelta > 0) {
      await User.findByIdAndUpdate(
        newId,
        { $inc: { directCount: directDelta, totalDownlineCount: downlineDelta } },
        { session }
      );

      if (newSponsorAncestorRows.length > 0 && downlineDelta > 0) {
        const newAncestorIds = newSponsorAncestorRows.map((r) => r.ancestor);
        await User.updateMany(
          { _id: { $in: newAncestorIds } },
          { $inc: { totalDownlineCount: downlineDelta } },
          { session }
        );
      }
    }

    return { success: true };
  });
}

module.exports = {
  processSponsorChange,
  validateSponsorChange,
};
