/**
 * Designation Eligibility Service - Phase-1
 *
 * Evaluates eligibility ONLY at apply time. No stored eligibility flag.
 * WalletSettings.designations is the sole source of truth.
 *
 * Rules:
 * 1) directCount >= selfSaleRequired
 * 2) totalDownlineCount >= teamSizeRequired
 * 3) Calendar month new direct referrals count >= monthlyTarget
 * 4) If requiredDesignationCode: ACTIVE downline users with APPROVED designation >= requiredDesignationCount
 */

const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const UserDesignation = require("../models/UserDesignation");
const WalletSettings = require("../models/WalletSettings");
const mongoose = require("mongoose");

/**
 * Get calendar month bounds (IST/server timezone)
 * monthStart = new Date(year, month, 1)
 * monthEnd = new Date(year, month + 1, 0)
 *
 * @param {Date} [date] - Reference date (default: now)
 * @returns {{ monthStart: Date, monthEnd: Date }}
 */
function getCurrentMonthBounds(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

/**
 * Count new ACTIVE direct referrals in calendar month
 * ACTIVE-only: status === 1
 * Uses index: { referredBy: 1, createdAt: -1 }, { status: 1 }
 *
 * @param {mongoose.Types.ObjectId} userId
 * @param {{ monthStart: Date, monthEnd: Date }} bounds
 * @param {{ session?: ClientSession }} [options]
 * @returns {Promise<number>}
 */
async function getMonthlyDirectCount(userId, bounds, options = {}) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const q = User.countDocuments({
    referredBy: uid,
    status: 1,
    createdAt: { $gte: bounds.monthStart, $lte: bounds.monthEnd },
  });
  if (options.session) {
    q.session(options.session);
  }
  return q;
}

/**
 * Count ACTIVE downline users with APPROVED designation in their designations.
 * Uses aggregation (closure table + lookup) - no large arrays loaded.
 * Indexed: UserHierarchy.ancestor, User.status, User.designations
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} requiredDesignationCode
 * @param {{ session?: ClientSession }} [options]
 * @returns {Promise<number>}
 */
async function getRequiredDesignationHolderCount(
  userId,
  requiredDesignationCode,
  options = {},
) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const agg = UserHierarchy.aggregate([
    { $match: { ancestor: uid } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: "$u" },
    { $match: { "u.status": 1 } },
    {
      $lookup: {
        from: "user_designations",
        localField: "u._id",
        foreignField: "userId",
        as: "ud",
      },
    },
    {
      $match: {
        ud: {
          $elemMatch: {
            designationCode: requiredDesignationCode,
            status: "APPROVED",
          },
        },
      },
    },
    { $count: "count" },
  ]);
  if (options.session) {
    agg.session(options.session);
  }
  const result = await agg;
  return result[0]?.count ?? 0;
}

/**
 * Evaluate eligibility for a single designation config.
 * Eligibility is computed at call time; not stored.
 *
 * Rule order: directCount, teamSize, monthlyTarget, then requiredDesignation holders.
 *
 * @param {Object} config - Designation config from WalletSettings.designations
 * @param {Object} user - User document (must have directCount, totalDownlineCount)
 * @param {{ monthStart: Date, monthEnd: Date }} monthBounds
 * @param {number} monthlyDirectCount - Pre-fetched for efficiency
 * @param {number} [currentRequiredDesignationCount] - Count of downline with required designation (when config.requiredDesignationCode exists)
 * @returns {{ eligible: boolean, reason?: string }}
 */
function evaluateEligibility(
  config,
  user,
  monthBounds,
  monthlyDirectCount,
  currentRequiredDesignationCount,
) {
  const selfSaleRequired = config.selfSaleRequired ?? 0;
  const teamSizeRequired = config.teamSizeRequired ?? 0;
  const monthlyTarget = config.monthlyTarget ?? 0;
  const requiredDesignationCode = config.requiredDesignationCode ?? null;
  const requiredDesignationCount = config.requiredDesignationCount ?? 0;

  const directCount = user.directCount ?? 0;
  const totalDownlineCount = user.totalDownlineCount ?? 0;

  if (directCount < selfSaleRequired) {
    return {
      eligible: false,
      reason: `Direct count required: ${selfSaleRequired}, current: ${directCount}`,
    };
  }

  if (totalDownlineCount < teamSizeRequired) {
    return {
      eligible: false,
      reason: `Team size required: ${teamSizeRequired}, current: ${totalDownlineCount}`,
    };
  }

  if (monthlyDirectCount < monthlyTarget) {
    return {
      eligible: false,
      reason: `Monthly target required: ${monthlyTarget}, current: ${monthlyDirectCount}`,
    };
  }

  // requiredDesignation rule: applied AFTER activeDirectCount, activeDownlineCount, monthlyTarget
  if (requiredDesignationCode != null && requiredDesignationCount > 0) {
    const current = currentRequiredDesignationCount ?? 0;
    if (current < requiredDesignationCount) {
      return {
        eligible: false,
        reason: "Required designation holders not met",
      };
    }
  }

  return { eligible: true };
}

/**
 * Get user's existing designation entry for a code (PENDING or APPROVED)
 *
 * @param {Object} user - User document with designations array
 * @param {number} designationCode
 * @returns {Object|null} - Designation entry or null
 */
function getExistingDesignationEntry(user, designationCode) {
  const designations = user.designations || [];
  return designations.find(
    (d) =>
      d.designationCode === designationCode &&
      (d.status === "PENDING" || d.status === "APPROVED"),
  ) || null;
}

/**
 * Get eligibility for all active designations.
 * For each: eligible, reason if false, alreadyApplied, current status if exists.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @returns {Promise<Array<{ designationCode: number, name: string, eligible: boolean, reason?: string, alreadyApplied: boolean, currentStatus?: string }>>}
 */
async function getEligibilityForAll(userId) {
  const uid =
    mongoose.Types.ObjectId.isValid(userId) ?
      new mongoose.Types.ObjectId(userId) :
      userId;

  const [settings, user] = await Promise.all([
    WalletSettings.getOrCreateSettings(),
    User.findById(uid).select("directCount totalDownlineCount").lean(),
  ]);

  if (!user) {
    return [];
  }

  const designations = (settings.designations || []).filter(
    (d) => d.isActive !== false,
  );

  if (designations.length === 0) {
    return [];
  }

  const { monthStart, monthEnd } = getCurrentMonthBounds();
  const monthlyDirectCount = await getMonthlyDirectCount(uid, {
    monthStart,
    monthEnd,
  });

  const directCount = user.directCount ?? 0;
  const totalDownlineCount = user.totalDownlineCount ?? 0;

  // Fetch required designation holder counts for configs that need them
  const designationCodesSet = new Set(
    (settings.designations || []).map((d) => d.designationCode),
  );
  const requiredCountsByCode = new Map();
  const configsNeedingCount = designations.filter(
    (c) =>
      c.requiredDesignationCode != null &&
      (c.requiredDesignationCount ?? 0) > 0,
  );

  for (const c of configsNeedingCount) {
    const code = c.requiredDesignationCode;
    if (!designationCodesSet.has(code)) {
      console.error(
        `Designation config ${c.designationCode}: requiredDesignationCode ${code} does not exist in WalletSettings.designations`,
      );
      continue;
    }
    if (!requiredCountsByCode.has(code)) {
      const count = await getRequiredDesignationHolderCount(uid, code);
      requiredCountsByCode.set(code, count);
    }
  }

  const designationCodes = designations.map((d) => d.designationCode);
  const existingDocs = await UserDesignation.find({
    userId: uid,
    designationCode: { $in: designationCodes },
    status: { $in: ["PENDING", "APPROVED", "REJECTED", "INACTIVE"] },
  })
    .select("designationCode status remarks forceAssigned")
    .lean();

  const existingByCode = new Map(
    existingDocs.map((d) => [d.designationCode, d]),
  );

  const designationResults = designations.map((config) => {
    const existing = existingByCode.get(config.designationCode) || null;
    const requiredDesignationCode = config.requiredDesignationCode ?? null;
    const requiredDesignationCount = config.requiredDesignationCount ?? 0;
    const currentRequiredDesignationCount =
      requiredDesignationCode != null && requiredDesignationCount > 0
        ? requiredCountsByCode.get(requiredDesignationCode) ?? 0
        : null;

    let { eligible, reason } = evaluateEligibility(
      config,
      user,
      { monthStart, monthEnd },
      monthlyDirectCount,
      currentRequiredDesignationCount,
    );

    // If admin has force-assigned and status is APPROVED, treat as eligible
    // regardless of current counts, and hide low-count reason.
    if (existing?.forceAssigned && existing.status === "APPROVED") {
      eligible = true;
      reason = null;
    }

    const requirementMet =
      requiredDesignationCode != null && requiredDesignationCount > 0
        ? (currentRequiredDesignationCount ?? 0) >= requiredDesignationCount
        : null;

    return {
      designationCode: config.designationCode,
      name: config.name,
      // Used by user UI to show potential profit.
      // Profit formula (as per UI request): registerFee * commission%
      commissionPercent: config.commissionPercent ?? 0,
      registerFee: settings.registrationFee ?? 0,
      selfSaleRequired: config.selfSaleRequired ?? 0,
      teamSizeRequired: config.teamSizeRequired ?? 0,
      monthlyTarget: config.monthlyTarget ?? 0,
      requiredDesignationCode,
      requiredDesignationCount: requiredDesignationCount || null,
      currentRequiredDesignationCount,
      requirementMet,
      eligible,
      reason: reason || null,
      // UI behavior:
      // - PENDING/APPROVED/INACTIVE => user cannot re-apply
      // - REJECTED => user can re-apply
      alreadyApplied: existing ? existing.status !== "REJECTED" : false,
      currentStatus: existing ? existing.status : null,
      // true when admin has force-assigned / directly approved this designation
      // (bypassing normal eligibility rules). Read from latest UserDesignation doc.
      forceAssigned: existing ? !!existing.forceAssigned : false,
      remarks: existing?.remarks || null,
    };
  });

  return {
    designations: designationResults,
    directCount,
    totalDownlineCount,
    monthlyDirectCount,
  };
}

module.exports = {
  getCurrentMonthBounds,
  getMonthlyDirectCount,
  getRequiredDesignationHolderCount,
  evaluateEligibility,
  getExistingDesignationEntry,
  getEligibilityForAll,
};
