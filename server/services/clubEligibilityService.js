const mongoose = require("mongoose");
const User = require("../models/User");
const WalletSettings = require("../models/WalletSettings");
const { getMonthlyDownlineActiveCount } = require("./rankEligibilityService");

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
}

async function getCurrentClubEligibility(userId, clubConfig, options = {}) {
  const uid = toObjectId(userId);
  const user =
    options.user ||
    (await User.findById(uid)
      .select("status isPaid rankCode directCount")
      .lean());

  if (!user || user.status !== 1 || user.isPaid !== true) {
    return { eligible: false, reason: "User is not active/paid" };
  }

  if ((clubConfig.minimumRankCode ?? null) != null) {
    const userRankCode = Number(user.rankCode) || 0;
    if (userRankCode < Number(clubConfig.minimumRankCode)) {
      return {
        eligible: false,
        reason: `minimumRankCode required: ${clubConfig.minimumRankCode}, current: ${userRankCode}`,
      };
    }
  }

  const selfSaleRequired = Number(clubConfig.selfSaleRequired || 0);
  if (selfSaleRequired > 0) {
    const directCount = Number(user.directCount || 0);
    if (directCount < selfSaleRequired) {
      return {
        eligible: false,
        reason: `selfSaleRequired: ${selfSaleRequired}, current: ${directCount}`,
      };
    }
  }

  const monthlyTarget = Number(clubConfig.monthlyTarget || 0);
  if (monthlyTarget > 0) {
    const bounds = options.monthBounds;
    if (!bounds || !bounds.periodStart || !bounds.periodEnd) {
      return { eligible: false, reason: "month bounds missing" };
    }
    const monthlyDownlineActiveCount =
      options.monthlyDownlineActiveCount ??
      (await getMonthlyDownlineActiveCount(
        uid,
        { monthStart: bounds.periodStart, monthEnd: bounds.periodEnd },
        options.session ? { session: options.session } : {},
      ));
    if (monthlyDownlineActiveCount < monthlyTarget) {
      return {
        eligible: false,
        reason: `monthlyTarget: ${monthlyTarget}, current: ${monthlyDownlineActiveCount}`,
      };
    }
  }

  return { eligible: true };
}

async function getActiveEligibleUsersForClub(clubConfig, options = {}) {
  const query = { status: 1, isPaid: true };
  if ((clubConfig.minimumRankCode ?? null) != null) {
    query.rankCode = { $gte: Number(clubConfig.minimumRankCode) };
  }
  if (Number(clubConfig.selfSaleRequired || 0) > 0) {
    query.directCount = { $gte: Number(clubConfig.selfSaleRequired) };
  }

  let users = await User.find(query)
    .select("_id memberId name phone rankCode directCount")
    .session(options.session || null)
    .lean();

  const monthlyTarget = Number(clubConfig.monthlyTarget || 0);
  if (monthlyTarget > 0) {
    const eligibleUsers = [];
    for (const user of users) {
      const monthlyCount = await getMonthlyDownlineActiveCount(
        user._id,
        {
          monthStart: options.periodStart,
          monthEnd: options.periodEnd,
        },
        options.session ? { session: options.session } : {},
      );
      if (monthlyCount >= monthlyTarget) {
        eligibleUsers.push(user);
      }
    }
    users = eligibleUsers;
  }

  return users;
}

async function getAdminRootUser(session = null) {
  return User.findOne({ isSystemRoot: true, status: 1 })
    .select("_id memberId name phone")
    .session(session)
    .lean();
}

async function getClubConfigs() {
  const settings = await WalletSettings.getOrCreateSettings();
  return settings?.clubs || [];
}

module.exports = {
  getCurrentClubEligibility,
  getActiveEligibleUsersForClub,
  getAdminRootUser,
  getClubConfigs,
};
