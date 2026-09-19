const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const {
  getPeriodBounds,
  getActivationsCountInPeriod,
} = require("./rankCommissionService");
const { creditClubWallet, getOrCreateWallet } = require("./walletService");
const {
  getActiveEligibleUsersForClub,
  getAdminRootUser,
} = require("./clubEligibilityService");

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function runClubCommissionForPeriod(
  periodStart,
  periodEnd,
  periodKey,
  periodType = "period",
  opts = {},
) {
  const dryRun = opts.dryRun === true;

  const runTx = async (session) => {
    const settings = await WalletSettings.findOne().session(session).lean();
    if (!settings) throw new Error("WalletSettings not found");

    const clubs = settings.clubs || [];
    if (clubs.length === 0) {
      return { distributed: 0, breakdown: [], eligibleUsers: [] };
    }

    const levels = settings.levels || [];
    const designations = settings.designations || [];
    const registrationFee = Number(settings.registrationFee) || 0;
    const sumLevels = levels.reduce(
      (s, l) => s + (l.commissionPercent || 0),
      0,
    );
    const sumDesignations = designations.reduce(
      (s, d) => s + (d.commissionPercent || 0),
      0,
    );
    const adminSurchargePercent = Number(settings.adminSurchargePercent ?? 0);
    const baseCompanyProfitPercent = Math.max(
      0,
      100 - sumLevels - sumDesignations,
    );
    const companyProfitPercent = Math.max(
      0,
      baseCompanyProfitPercent - adminSurchargePercent,
    );
    const activeCount = await getActivationsCountInPeriod(
      periodStart,
      periodEnd,
      session,
    );
    const companyProfitPool =
      activeCount > 0 ? (companyProfitPercent / 100) * activeCount * registrationFee : 0;
    if (companyProfitPool <= 0) {
      return { distributed: 0, breakdown: [], eligibleUsers: [] };
    }

    let totalDistributed = 0;
    let lostDueToCapping = 0;
    const breakdown = [];
    const eligibleUsers = [];

    for (const clubConfig of clubs) {
      const commissionPercent = Number(clubConfig.commissionPercent || 0);
      if (commissionPercent <= 0) continue;

      const clubWalletKey = (clubConfig.walletKey || "").trim().toUpperCase();
      if (!clubWalletKey) continue;

      const clubPool = (companyProfitPool * commissionPercent) / 100;
      const capping = Number(clubConfig.capping || 0);
      let amountToDistribute = clubPool;
      if (capping > 0 && clubPool > capping) {
        lostDueToCapping += clubPool - capping;
        amountToDistribute = capping;
      }

      if (amountToDistribute <= 0) continue;

      let users = [];
      if (clubConfig.isAdminOnly === true) {
        const adminRoot = await getAdminRootUser(session);
        if (adminRoot?._id) users = [adminRoot];
      } else {
        users = await getActiveEligibleUsersForClub(clubConfig, {
          periodStart,
          periodEnd,
          session,
        });
      }

      const userCount = users.length;
      if (userCount <= 0) continue;

      const perUserAmount = amountToDistribute / userCount;
      if (perUserAmount <= 0) continue;
      const amountStr = perUserAmount.toFixed(2);

      const clubEligible = users.map((u) => ({
        _id: u._id,
        memberId: u.memberId,
        name: u.name,
        phone: u.phone,
        clubName: clubConfig.name,
        clubWalletKey,
        perUserAmount: amountStr,
        alreadyCredited: false,
      }));

      for (const u of users) {
        const requestId = `club_${periodType}:${periodKey}:${u._id}:${clubWalletKey}`;
        const existing = await WalletTransaction.findOne({ requestId })
          .session(session)
          .lean();

        if (existing) {
          const target = clubEligible.find(
            (eu) => String(eu._id) === String(u._id),
          );
          if (target) target.alreadyCredited = true;
          continue;
        }

        if (!dryRun) {
          await getOrCreateWallet(u._id, session);
          await creditClubWallet(u._id, clubWalletKey, amountStr, {
            type: "CLUB_INCOME",
            requestId,
            description: `Club Income Credit ₹${amountStr} for ${clubConfig.name}`,
            session,
          });
          totalDistributed += perUserAmount;
        }
      }

      breakdown.push({
        clubName: clubConfig.name,
        clubWalletKey,
        commissionPercent,
        userCount,
        clubPool: round2(clubPool),
        capping: capping || null,
        amountToDistribute: round2(amountToDistribute),
        perUserAmount: amountStr,
        isAdminOnly: clubConfig.isAdminOnly === true,
      });

      eligibleUsers.push({
        clubName: clubConfig.name,
        clubWalletKey,
        users: clubEligible,
      });
    }

    const totalRevenue = activeCount * registrationFee;
    const roundedPool = round2(companyProfitPool);

    return {
      distributed: round2(totalDistributed),
      breakdown,
      eligibleUsers,
      periodKey,
      periodStart,
      periodEnd,
      activeCount,
      registrationFee,
      companyProfitPool: roundedPool,
      calculationBreakdown: {
        totalRevenue: round2(totalRevenue),
        levelsPercent: sumLevels,
        designationsPercent: sumDesignations,
        adminSurchargePercent,
        companyProfitPercent,
        companyProfitPool: roundedPool,
        lostDueToCapping: round2(lostDueToCapping),
      },
    };
  };

  return runWithTransactionRetry(runTx);
}

async function runClubCommissionForSchedule(scheduleType, refDate, opts = {}) {
  const { periodStart, periodEnd, periodKey } = getPeriodBounds(scheduleType, refDate);
  return runClubCommissionForPeriod(
    periodStart,
    periodEnd,
    periodKey,
    scheduleType || "period",
    opts,
  );
}

module.exports = {
  runClubCommissionForPeriod,
  runClubCommissionForSchedule,
};
