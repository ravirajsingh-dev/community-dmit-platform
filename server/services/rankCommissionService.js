/**
 * Rank Commission Service - Monthly payout
 * QA Q16/Q17/Q18: Monthly payout, company profit formula, MAIN wallet.
 *
 * Formula:
 * companyProfitPercent = 100 - sum(levels) - sum(designations)
 * companyProfitPool = (companyProfitPercent/100) * totalActiveIdsThisMonth * registrationFee
 * For each rank: rankPool = companyProfitPool * (rankCommissionPercent/100)
 * Capping (QA Q11): Per rank global cap. If rankPool > capping, distribute only capping.
 * Each user with that rank gets: min(rankPool, capping) / userCount
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const { creditMainWallet, getOrCreateWallet } = require("./walletService");
const { buildTransactionDescription } = require("../utils/transactionDescriptionEngine");
const { getMonthlyDownlineActiveCount } = require("./rankEligibilityService");

/**
 * Get calendar month bounds.
 */
function getMonthBounds(year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

/**
 * Count activations (ACTIVATION DEBIT) in given month.
 */
async function getActivationsCountInMonth(monthStart, monthEnd, session = null) {
  const q = WalletTransaction.countDocuments({
    type: "ACTIVATION",
    direction: "DEBIT",
    createdAt: { $gte: monthStart, $lte: monthEnd },
  });
  if (session) q.session(session);
  return q;
}

/**
 * Run monthly rank commission payout for a given month.
 * Idempotent: uses requestId rank_monthly:YYYY-MM:userId:RANK_X
 *
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Promise<{ distributed: number, breakdown: Array }>}
 */
async function runMonthlyRankCommission(year, month) {
  const { monthStart, monthEnd } = getMonthBounds(year, month);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const runTx = async (session) => {
    const settings = await WalletSettings.findOne().session(session).lean();
    if (!settings) throw new Error("WalletSettings not found");

    const levels = settings.levels || [];
    const designations = settings.designations || [];
    const ranks = settings.ranks || [];
    const registrationFee = Number(settings.registrationFee) || 0;
    const adminSurchargePercent = Number(settings.adminSurchargePercent) || 0;

    if (ranks.length === 0) return { distributed: 0, breakdown: [] };

    const sumLevels = levels.reduce((s, l) => s + (l.commissionPercent || 0), 0);
    const sumDesignations = designations.reduce(
      (s, d) => s + (d.commissionPercent || 0),
      0
    );
    const baseCompanyProfitPercent = Math.max(
      0,
      100 - sumLevels - sumDesignations
    );
    const companyProfitPercent = Math.max(
      0,
      baseCompanyProfitPercent - adminSurchargePercent
    );

    const activeCount = await getActivationsCountInMonth(
      monthStart,
      monthEnd,
      session
    );
    if (activeCount <= 0) return { distributed: 0, breakdown: [] };

    const companyProfitPool = (companyProfitPercent / 100) * activeCount * registrationFee;
    if (companyProfitPool <= 0) return { distributed: 0, breakdown: [] };

    let totalDistributed = 0;
    let lostDueToCapping = 0;
    const breakdown = [];

    for (const rankConfig of ranks) {
      const rankCode = rankConfig.rankCode;
      const commissionPercent = rankConfig.commissionPercent ?? 0;
      const capping = rankConfig.capping ?? 0;
      const monthlyTarget = rankConfig.monthlyTarget ?? 0;

      if (commissionPercent <= 0) continue;

      const rankPool = (companyProfitPool * commissionPercent) / 100;
      let users = await User.find(
        { status: 1, isPaid: true, rankCode }
      )
        .select("_id memberId")
        .session(session)
        .lean();

      // If monthlyTarget > 0: filter to users who met target in commission month
      if (monthlyTarget > 0) {
        const eligibleUsers = [];
        for (const u of users) {
          const monthlyCount = await getMonthlyDownlineActiveCount(u._id, { monthStart, monthEnd }, { session });
          if (monthlyCount >= monthlyTarget) {
            eligibleUsers.push(u);
          }
        }
        users = eligibleUsers;
      }

      const userCount = users.length;
      if (userCount <= 0) continue;

      let amountToDistribute = rankPool;
      if (capping > 0 && rankPool > capping) {
        lostDueToCapping += rankPool - capping;
        amountToDistribute = capping;
      }

      const perUserAmount = amountToDistribute / userCount;
      if (perUserAmount <= 0) continue;

      const amountStr = perUserAmount.toFixed(2);
      const description = buildTransactionDescription("RANK_INCOME", {
        amount: amountStr,
        rankCode,
      });

      for (const u of users) {
        const requestId = `rank_monthly:${monthKey}:${u._id}:RANK_${rankCode}`;
        const existing = await WalletTransaction.findOne({ requestId })
          .session(session)
          .lean();
        if (existing) continue;

        await getOrCreateWallet(u._id, session);
        await creditMainWallet(u._id, amountStr, {
          type: "RANK_INCOME",
          requestId,
          description,
          session,
        });
        totalDistributed += perUserAmount;
      }

      breakdown.push({
        rankCode,
        rankName: rankConfig.name,
        userCount,
        totalAmount: (perUserAmount * userCount).toFixed(2),
        perUserAmount: amountStr,
      });
    }

    return {
      distributed: Math.round(totalDistributed * 100) / 100,
      breakdown,
    };
  };

  return runWithTransactionRetry(runTx);
}

/**
 * Get period bounds for scheduleType.
 * @param {string} scheduleType - daily, weekly, monthly, quarterly, half_yearly, yearly
 * @param {Date} refDate - reference date (typically "previous" period end)
 * @param {Object} opts - { customDayOfMonth, customDayOfWeek }
 * @returns {{ periodStart: Date, periodEnd: Date, periodKey: string }}
 */
function getPeriodBounds(scheduleType, refDate) {
  const d = new Date(refDate);
  let periodStart, periodEnd, periodKey;

  switch (scheduleType) {
    case "daily":
      periodStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
      periodEnd.setMilliseconds(-1);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      break;
    case "weekly":
      const dayOfWeek = d.getDay();
      periodEnd = new Date(d);
      periodEnd.setDate(d.getDate() - dayOfWeek);
      periodEnd.setHours(23, 59, 59, 999);
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
      const isoWeek = getISOWeek(periodStart);
      periodKey = `${periodStart.getFullYear()}-W${String(isoWeek).padStart(2, "0")}`;
      break;
    case "monthly":
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      break;
    case "quarterly":
      const q = Math.floor(d.getMonth() / 3) + 1;
      periodStart = new Date(d.getFullYear(), (q - 1) * 3, 1);
      periodEnd = new Date(d.getFullYear(), q * 3, 0, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}-Q${q}`;
      break;
    case "half_yearly":
      const h = d.getMonth() < 6 ? 1 : 2;
      periodStart = new Date(d.getFullYear(), (h - 1) * 6, 1);
      const lastDayH = new Date(d.getFullYear(), h * 6, 0).getDate();
      periodEnd = new Date(d.getFullYear(), h * 6 - 1, lastDayH, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}-H${h}`;
      break;
    case "yearly":
      periodStart = new Date(d.getFullYear(), 0, 1);
      periodEnd = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}`;
      break;
    case "custom":
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      break;
    default:
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  return { periodStart, periodEnd, periodKey };
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Run rank commission payout for an arbitrary period.
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @param {string} periodKey - e.g. "2026-03", "2026-Q1"
 * @param {Object} opts - { dryRun: boolean } - if true, no credits, just return breakdown
 * @returns {Promise<{ distributed: number, breakdown: Array, eligibleUsers?: Array }>}
 */
async function runRankCommissionForPeriod(periodStart, periodEnd, periodKey, opts = {}) {
  const dryRun = opts.dryRun === true;

  const runTx = async (session) => {
    const settings = await WalletSettings.findOne().session(session).lean();
    if (!settings) throw new Error("WalletSettings not found");

    const levels = settings.levels || [];
    const designations = settings.designations || [];
    const ranks = settings.ranks || [];
    const registrationFee = Number(settings.registrationFee) || 0;
    const adminSurchargePercent = Number(settings.adminSurchargePercent) || 0;

    if (ranks.length === 0) return { distributed: 0, breakdown: [], eligibleUsers: [] };

    const sumLevels = levels.reduce((s, l) => s + (l.commissionPercent || 0), 0);
    const sumDesignations = designations.reduce(
      (s, d) => s + (d.commissionPercent || 0),
      0
    );
    const baseCompanyProfitPercent = Math.max(
      0,
      100 - sumLevels - sumDesignations
    );
    const companyProfitPercent = Math.max(
      0,
      baseCompanyProfitPercent - adminSurchargePercent
    );

    const activeCount = await getActivationsCountInPeriod(
      periodStart,
      periodEnd,
      session
    );
    if (activeCount <= 0) return { distributed: 0, breakdown: [], eligibleUsers: [] };

    const companyProfitPool = (companyProfitPercent / 100) * activeCount * registrationFee;
    if (companyProfitPool <= 0) return { distributed: 0, breakdown: [], eligibleUsers: [] };

    let totalDistributed = 0;
    const breakdown = [];
    const eligibleUsers = [];

    for (const rankConfig of ranks) {
      const rankCode = rankConfig.rankCode;
      const commissionPercent = rankConfig.commissionPercent ?? 0;
      const capping = rankConfig.capping ?? 0;
      const monthlyTarget = rankConfig.monthlyTarget ?? 0;

      if (commissionPercent <= 0) continue;

      const rankPool = (companyProfitPool * commissionPercent) / 100;
      let users = await User.find(
        { status: 1, isPaid: true, rankCode }
      )
        .select("_id memberId name phone rankCode")
        .session(session)
        .lean();

      if (monthlyTarget > 0) {
        const eligible = [];
        for (const u of users) {
          const count = await getMonthlyDownlineActiveCount(u._id, { monthStart: periodStart, monthEnd: periodEnd }, { session });
          if (count >= monthlyTarget) {
            eligible.push(u);
          }
        }
        users = eligible;
      }

      const userCount = users.length;
      if (userCount <= 0) continue;

      let amountToDistribute = rankPool;
      if (capping > 0 && rankPool > capping) {
        amountToDistribute = capping;
      }

      const perUserAmount = amountToDistribute / userCount;
      if (perUserAmount <= 0) continue;

      const amountStr = perUserAmount.toFixed(2);
      const description = buildTransactionDescription("RANK_INCOME", {
        amount: amountStr,
        rankCode,
      });

      const rankEligible = users.map((u) => ({
        _id: u._id,
        memberId: u.memberId,
        name: u.name,
        phone: u.phone,
        rankCode,
        rankName: rankConfig.name,
        perUserAmount: amountStr,
        alreadyCredited: false,
      }));

      const checkExisting = async (uid) => {
        const rid = `rank_period:${periodKey}:${uid}:RANK_${rankCode}`;
        const ridLegacy = `rank_monthly:${periodKey}:${uid}:RANK_${rankCode}`;
        const ex = await WalletTransaction.findOne({
          $or: [{ requestId: rid }, { requestId: ridLegacy }],
        })
          .session(session)
          .lean();
        return !!ex;
      };

      if (!dryRun) {
        for (const u of users) {
          const existing = await checkExisting(u._id);
          if (existing) {
            rankEligible.find((e) => String(e._id) === String(u._id)).alreadyCredited = true;
            continue;
          }

          await getOrCreateWallet(u._id, session);
          await creditMainWallet(u._id, amountStr, {
            type: "RANK_INCOME",
            requestId: `rank_period:${periodKey}:${u._id}:RANK_${rankCode}`,
            description,
            session,
          });
          totalDistributed += perUserAmount;
        }
      } else {
        for (const u of users) {
          const existing = await checkExisting(u._id);
          if (existing) {
            rankEligible.find((e) => String(e._id) === String(u._id)).alreadyCredited = true;
          }
        }
      }

      breakdown.push({
        rankCode,
        rankName: rankConfig.name,
        commissionPercent,
        userCount,
        totalAmount: (perUserAmount * userCount).toFixed(2),
        perUserAmount: amountStr,
        rankPool: rankPool.toFixed(2),
        capping: capping || null,
        amountToDistribute: amountToDistribute.toFixed(2),
      });
      eligibleUsers.push({ rankCode, rankName: rankConfig.name, users: rankEligible });
    }

    const totalRevenue = activeCount * registrationFee;
    const roundedPool = Math.round(companyProfitPool * 100) / 100;

    return {
      distributed: Math.round(totalDistributed * 100) / 100,
      breakdown,
      eligibleUsers,
      periodKey,
      periodStart,
      periodEnd,
      activeCount,
      registrationFee,
      companyProfitPool: roundedPool,
      calculationBreakdown: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        levelsPercent: sumLevels,
        designationsPercent: sumDesignations,
        adminSurchargePercent,
        companyProfitPercent,
        companyProfitPool: roundedPool,
        lostDueToCapping: Math.round(lostDueToCapping * 100) / 100,
        formula: `Company Profit % = 100 - Levels(${sumLevels}%) - Designations(${sumDesignations}%) - Admin Surcharge(${adminSurchargePercent}%) = ${companyProfitPercent}%`,
        poolFormula: `Pool = (${companyProfitPercent}% ÷ 100) × ${activeCount} activations × ₹${registrationFee} = ₹${roundedPool}`,
      },
    };
  };

  return runWithTransactionRetry(runTx);
}

async function getActivationsCountInPeriod(periodStart, periodEnd, session = null) {
  const q = WalletTransaction.countDocuments({
    type: "ACTIVATION",
    direction: "DEBIT",
    createdAt: { $gte: periodStart, $lte: periodEnd },
  });
  if (session) q.session(session);
  return q;
}

/**
 * Backward compatible: run for a calendar month (0-indexed).
 */
async function runMonthlyRankCommissionLegacy(year, month) {
  const { monthStart, monthEnd } = getMonthBounds(year, month);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  return runRankCommissionForPeriod(monthStart, monthEnd, monthKey, { dryRun: false });
}

module.exports = {
  runMonthlyRankCommission: runMonthlyRankCommissionLegacy,
  runRankCommissionForPeriod,
  getPeriodBounds,
  getActivationsCountInMonth,
  getActivationsCountInPeriod,
  getMonthBounds,
};
