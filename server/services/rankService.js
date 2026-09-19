/**
 * Rank Service - Auto rank assignment
 * QA: Fully Auto flow. On activation, check uplines' eligibility. No downgrade.
 */

const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const WalletSettings = require("../models/WalletSettings");
const { checkRankEligibility, getMonthlyDownlineActiveCount } = require("./rankEligibilityService");
const mongoose = require("mongoose");

/**
 * Get calendar month bounds for current month.
 */
function getCurrentMonthBounds(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    monthStart: new Date(year, month, 1),
    monthEnd: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Check and upgrade a single user's rank. Sequential: only upgrade to next rank.
 * No downgrade (QA Q3).
 *
 * @param {mongoose.Types.ObjectId} userId
 * @param {{ session?: ClientSession }} [options]
 * @returns {Promise<{ upgraded: boolean, newRankCode?: number }>}
 */
async function checkAndUpgradeRank(userId, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const opts = options.session ? { session: options.session } : {};
  const [user, settings] = await Promise.all([
    User.findById(uid)
      .select("rankCode directCount totalDownlineCount status isPaid")
      .lean(opts),
    WalletSettings.getOrCreateSettings(),
  ]);

  if (!user || user.status !== 1 || user.isPaid !== true) {
    return { upgraded: false };
  }

  const ranks = (settings.ranks || []).sort((a, b) => a.rankCode - b.rankCode);
  if (ranks.length === 0) return { upgraded: false };

  const currentRank = user.rankCode ?? 0;
  const nextRankCode = currentRank === 0 ? 1 : currentRank + 1;
  const nextRankConfig = ranks.find((r) => r.rankCode === nextRankCode);
  if (!nextRankConfig) return { upgraded: false };

  const { monthStart, monthEnd } = getCurrentMonthBounds();
  const monthlyCount = await getMonthlyDownlineActiveCount(uid, { monthStart, monthEnd }, opts);

  const { eligible } = await checkRankEligibility(uid, nextRankCode, {
    userRankCode: currentRank === 0 ? null : currentRank,
    directCount: user.directCount,
    downlineSize: user.totalDownlineCount,
    monthlyDownlineActiveCount: monthlyCount,
    monthBounds: { monthStart, monthEnd },
    ...opts,
  });

  if (!eligible) return { upgraded: false };

  await User.findByIdAndUpdate(
    uid,
    { $set: { rankCode: nextRankCode } },
    opts
  );

  return { upgraded: true, newRankCode: nextRankCode };
}

/**
 * Get all ancestor (upline) user IDs for a user.
 */
async function getAncestorIds(userId) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const rows = await UserHierarchy.find({ user: uid }).select("ancestor").lean();
  return rows.map((r) => r.ancestor).filter(Boolean);
}

/**
 * On activation: check all uplines for rank upgrade. Run in background (non-blocking).
 * QA Q7: On activation (downline ki) - upline sabhi ka eligibility check. Background me chale.
 *
 * @param {mongoose.Types.ObjectId} activatedUserId - User who just became ACTIVE
 */
async function checkUplinesRankOnActivation(activatedUserId) {
  if (!activatedUserId || !mongoose.Types.ObjectId.isValid(activatedUserId)) {
    return;
  }

  setImmediate(async () => {
    try {
      const ancestorIds = await getAncestorIds(activatedUserId);
      const activeAncestors = await User.find(
        { _id: { $in: ancestorIds }, status: 1, isPaid: true }
      )
        .select("_id")
        .lean();
      const ids = activeAncestors.map((u) => u._id);

      for (const aid of ids) {
        try {
          await checkAndUpgradeRank(aid);
        } catch (e) {
          console.error(`[rankService] checkAndUpgradeRank failed for ${aid}:`, e.message);
        }
      }
    } catch (err) {
      console.error("[rankService] checkUplinesRankOnActivation error:", err);
    }
  });
}

/**
 * Check activated user for Rank 1. QA Q2/Q24: Activation + wallet setting conditions = Rank 1.
 * Called after activation in same flow.
 */
async function checkActivatedUserForRank1(activatedUserId, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(activatedUserId)
    ? new mongoose.Types.ObjectId(activatedUserId)
    : activatedUserId;

  const opts = options.session ? { session: options.session } : {};
  const user = await User.findById(uid)
    .select("rankCode directCount totalDownlineCount status isPaid")
    .lean(opts);

  if (!user || user.status !== 1 || user.isPaid !== true) return { upgraded: false };
  if ((user.rankCode ?? 0) >= 1) return { upgraded: false };

  const settings = await WalletSettings.getOrCreateSettings();
  const rank1Config = (settings.ranks || []).find((r) => r.rankCode === 1);
  if (!rank1Config) return { upgraded: false };

  const { monthStart, monthEnd } = getCurrentMonthBounds();
  const monthlyCount = await getMonthlyDownlineActiveCount(uid, { monthStart, monthEnd }, opts);

  const { eligible } = await checkRankEligibility(uid, 1, {
    userRankCode: null,
    directCount: user.directCount,
    downlineSize: user.totalDownlineCount,
    monthlyDownlineActiveCount: monthlyCount,
    monthBounds: { monthStart, monthEnd },
    ...opts,
  });

  if (!eligible) return { upgraded: false };

  await User.findByIdAndUpdate(uid, { $set: { rankCode: 1 } }, opts);
  return { upgraded: true, newRankCode: 1 };
}

module.exports = {
  checkAndUpgradeRank,
  checkUplinesRankOnActivation,
  checkActivatedUserForRank1,
  getAncestorIds,
  getCurrentMonthBounds,
};
