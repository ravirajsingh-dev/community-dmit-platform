/**
 * Rank Eligibility Service
 * Validates if a user is eligible for a rank upgrade.
 * Extends existing rank dependency logic with designation-based eligibility.
 *
 * Uses UserHierarchy (closure table) for downline queries - O(1) index lookup at scale.
 */

const User = require("../models/User");
const UserDesignation = require("../models/UserDesignation");
const UserHierarchy = require("../models/UserHierarchy");
const WalletSettings = require("../models/WalletSettings");
const mongoose = require("mongoose");

/**
 * Get all downline user IDs for a user using closure table.
 * Single indexed query - no BFS, no multiple round-trips.
 * Excludes the user themselves.
 *
 * Query: UserHierarchy.distinct("user", { ancestor: userId })
 * Uses index: { ancestor: 1 } → O(1) seek + O(n) scan for descendants
 *
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
async function getDownlineIds(userId) {
  const objectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const descendantIds = await UserHierarchy.distinct("user", {
    ancestor: objectId,
  });

  return descendantIds;
}

/**
 * Count new ACTIVE users in downline this calendar month.
 * QA Q10: monthlyTarget = downline me new active users ka count jo within month me active huye.
 * Uses: downline users with status=1 and createdAt in month.
 *
 * @param {mongoose.Types.ObjectId} userId
 * @param {{ monthStart: Date, monthEnd: Date }} bounds
 * @param {{ session?: ClientSession }} [options]
 * @returns {Promise<number>}
 */
async function getMonthlyDownlineActiveCount(userId, bounds, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const downlineIds = await getDownlineIds(uid);
  if (downlineIds.length === 0) return 0;
  const q = User.countDocuments({
    _id: { $in: downlineIds },
    status: 1,
    createdAt: { $gte: bounds.monthStart, $lte: bounds.monthEnd },
  });
  if (options.session) q.session(options.session);
  return q;
}

/**
 * Check if user is eligible for rank upgrade.
 * QA Q10: selfSaleRequired = directCount (ACTIVE), teamSizeRequired = totalDownlineCount (ACTIVE),
 * monthlyTarget = new active users in downline this month (count).
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} rankCode
 * @param {Object} options
 * @param {number} [options.userRankCode] - User's current rank (required for requiredRankCode check).
 * @param {number} [options.directCount] - User's directCount (for selfSaleRequired). If not provided, from user doc.
 * @param {number} [options.downlineSize] - User's totalDownlineCount (for teamSizeRequired). If not provided, fetched.
 * @param {number} [options.monthlyDownlineActiveCount] - New active users in downline this month. If not provided, fetched.
 * @param {{ monthStart: Date, monthEnd: Date }} [options.monthBounds] - For monthlyTarget. Default: current month.
 * @returns {Promise<{eligible: boolean, reason?: string}>}
 */
async function checkRankEligibility(userId, rankCode, options = {}) {
  const uid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const settings = await WalletSettings.getOrCreateSettings();
  const ranks = settings.ranks || [];
  const designations = settings.designations || [];
  const rankConfig = ranks.find((r) => r.rankCode === rankCode);

  if (!rankConfig) {
    return {
      eligible: false,
      reason: `Rank ${rankCode} not found in configuration`,
    };
  }

  // --- Existing: requiredRankCode check ---
  const requiredRankCode = rankConfig.requiredRankCode;
  if (requiredRankCode != null) {
    const userRankCode = options.userRankCode;
    if (userRankCode === undefined || userRankCode === null) {
      return {
        eligible: false,
        reason: "User rank is required for eligibility check",
      };
    }
    if (userRankCode !== requiredRankCode) {
      return {
        eligible: false,
        reason: `User must have rank ${requiredRankCode} to qualify for rank ${rankCode}`,
      };
    }
  }

  // --- selfSaleRequired = directCount (ACTIVE) per QA Q10 ---
  const selfSaleRequired = rankConfig.selfSaleRequired ?? 0;
  if (selfSaleRequired > 0) {
    let directCount = options.directCount;
    if (directCount === undefined) {
      const user = await User.findById(uid).select("directCount").lean();
      directCount = user?.directCount ?? 0;
    }
    if (directCount < selfSaleRequired) {
      return {
        eligible: false,
        reason: `Self sale (direct count) required: ${selfSaleRequired}, current: ${directCount}`,
      };
    }
  }

  // --- Existing: teamSizeRequired check (ACTIVE-only) ---
  const teamSizeRequired = rankConfig.teamSizeRequired ?? 0;
  if (teamSizeRequired > 0) {
    let downlineSize = options.downlineSize;
    if (downlineSize === undefined) {
      const downlineIds = await getDownlineIds(uid);
      downlineSize = await User.countDocuments({
        _id: { $in: downlineIds },
        status: 1,
      });
    }
    if (downlineSize < teamSizeRequired) {
      return {
        eligible: false,
        reason: `Team size required: ${teamSizeRequired}, current: ${downlineSize}`,
      };
    }
  }

  // --- monthlyTarget = new active users in downline this month (count) per QA Q10 ---
  const monthlyTarget = rankConfig.monthlyTarget ?? 0;
  if (monthlyTarget > 0) {
    let monthlyCount = options.monthlyDownlineActiveCount;
    if (monthlyCount === undefined) {
      const bounds = options.monthBounds || (() => {
        const d = new Date();
        return {
          monthStart: new Date(d.getFullYear(), d.getMonth(), 1),
          monthEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      })();
      monthlyCount = await getMonthlyDownlineActiveCount(uid, bounds, options);
    }
    if (monthlyCount < monthlyTarget) {
      return {
        eligible: false,
        reason: `Monthly target (new downline active) required: ${monthlyTarget}, current: ${monthlyCount}`,
      };
    }
  }

  // --- New: requiredDesignations check ---
  const requiredDesignations = rankConfig.requiredDesignations || [];
  if (requiredDesignations.length > 0) {
    const designationCodesSet = new Set(
      designations.map((d) => d.designationCode),
    );
    const downlineIds = await getDownlineIds(uid);
    const activeDownlineIds = await User.find({
      _id: { $in: downlineIds },
      status: 1,
    })
      .select("_id")
      .lean();
    const activeDownlineIdList = activeDownlineIds.map((d) => d._id);

    for (const rd of requiredDesignations) {
      const designationCode = rd.designationCode;
      const minCount = rd.minCount ?? 1;

      if (!designationCodesSet.has(designationCode)) {
        continue;
      }

      const count = await UserDesignation.countDocuments({
        userId: { $in: activeDownlineIdList },
        designationCode,
        status: "APPROVED",
      });

      if (count < minCount) {
        return {
          eligible: false,
          reason: `Designation ${designationCode}: required ${minCount} in downline, found ${count}`,
        };
      }
    }
  }

  return { eligible: true };
}

module.exports = {
  checkRankEligibility,
  getDownlineIds,
  getMonthlyDownlineActiveCount,
};
