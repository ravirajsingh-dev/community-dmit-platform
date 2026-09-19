/**
 * Admin Commission Payout Controller
 * Commission payout schedule, preview (kis ko credit), run, history
 *
 * GET /api/admin/commission-payout/preview
 * POST /api/admin/commission-payout/run
 * GET /api/admin/commission-payout/history
 * GET /api/admin/commission-payout/ranks-overview
 */

const mongoose = require("mongoose");
const WalletSettings = require("../../../models/WalletSettings");
const WalletTransaction = require("../../../models/WalletTransaction");
const CommissionPayoutSummary = require("../../../models/CommissionPayoutSummary");
const User = require("../../../models/User");
const response = require("../../../config/response");
const {
  runRankCommissionForPeriod,
  getPeriodBounds,
  getActivationsCountInPeriod,
  getMonthBounds,
} = require("../../../services/rankCommissionService");
const {
  runClubCommissionForPeriod,
} = require("../../../services/clubCommissionService");
/**
 * GET /api/admin/commission-payout/preview
 * Query: periodKey (e.g. 2026-03, 2026-Q1) OR scheduleType + refYear, refMonth, refDate
 * Returns: who gets credited, breakdown, work done - DRY RUN (no actual credit)
 */
async function getPreview(req, res) {
  try {
    const { periodKey, scheduleType, refYear, refMonth, refDate, payoutType } =
      req.query;
    const mode = String(payoutType || "rank").trim().toLowerCase();
    if (!["rank", "club"].includes(mode)) {
      return response.errorResponse(
        res,
        { msg: "payoutType must be rank or club" },
        "Validation Error",
        400,
      );
    }
    const settings = await WalletSettings.getOrCreateSettings();
    const payoutSettings = settings.commissionPayoutSettings || {};

    let periodStart, periodEnd, periodKeyRes;

    if (periodKey) {
      const parsed = parsePeriodKey(periodKey);
      if (!parsed) {
        return response.errorResponse(
          res,
          { msg: "Invalid periodKey. Use YYYY-MM, YYYY-MM-DD, YYYY-Qn, YYYY-Hn, YYYY" },
          "Validation Error",
          400,
        );
      }
      periodStart = parsed.periodStart;
      periodEnd = parsed.periodEnd;
      periodKeyRes = periodKey;
    } else {
      const st = scheduleType || payoutSettings.scheduleType || "monthly";
      let refD;
      if (refYear && refMonth) {
        refD = new Date(parseInt(refYear, 10), parseInt(refMonth, 10) - 1, 1);
      } else if (refDate) {
        refD = new Date(refDate);
      } else {
        const now = new Date();
        refD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      const bounds = getPeriodBounds(st, refD);
      periodStart = bounds.periodStart;
      periodEnd = bounds.periodEnd;
      periodKeyRes = bounds.periodKey;
    }

    // Idempotency: prevent double payout for same (periodKey, payoutType)
    const existingSummary = await CommissionPayoutSummary.findOne({
      periodKey: periodKeyRes,
      payoutType: mode,
      isPaid: true,
    }).lean();
    if (existingSummary) {
      return response.errorResponse(
        res,
        { msg: `Payout already completed for period ${periodKeyRes} (${mode}).` },
        "Validation Error",
        400,
      );
    }

    const result =
      mode === "club"
        ? await runClubCommissionForPeriod(
            periodStart,
            periodEnd,
            periodKeyRes,
            "period",
            { dryRun: true },
          )
        : await runRankCommissionForPeriod(periodStart, periodEnd, periodKeyRes, {
            dryRun: true,
          });

    return response.successResponse(res, {
      preview: true,
      payoutType: mode,
      periodKey: periodKeyRes,
      periodStart,
      periodEnd,
      ...result,
      payoutSettings: {
        scheduleType: payoutSettings.scheduleType,
        customDayOfMonth: payoutSettings.customDayOfMonth,
        payoutTime: `${String(payoutSettings.payoutTimeHH || 1).padStart(2, "0")}:${String(payoutSettings.payoutTimeMM || 0).padStart(2, "0")}`,
      },
    });
  } catch (err) {
    console.error("getPreview error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

function parsePeriodKey(periodKey) {
  if (!periodKey || typeof periodKey !== "string") return null;
  const s = periodKey.trim();

  const monthlyMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (monthlyMatch) {
    const y = parseInt(monthlyMatch[1], 10);
    const m = parseInt(monthlyMatch[2], 10) - 1;
    if (m < 0 || m > 11) return null;
    return {
      periodStart: new Date(y, m, 1),
      periodEnd: new Date(y, m + 1, 0, 23, 59, 59, 999),
      periodKey: s,
    };
  }

  const dailyMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dailyMatch) {
    const y = parseInt(dailyMatch[1], 10);
    const m = parseInt(dailyMatch[2], 10) - 1;
    const d = parseInt(dailyMatch[3], 10);
    const periodStart = new Date(y, m, d);
    const periodEnd = new Date(y, m, d, 23, 59, 59, 999);
    return { periodStart, periodEnd, periodKey: s };
  }

  const quarterMatch = s.match(/^(\d{4})-Q([1-4])$/i);
  if (quarterMatch) {
    const y = parseInt(quarterMatch[1], 10);
    const q = parseInt(quarterMatch[2], 10);
    const periodStart = new Date(y, (q - 1) * 3, 1);
    const periodEnd = new Date(y, q * 3, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd, periodKey: s };
  }

  const halfMatch = s.match(/^(\d{4})-H([1-2])$/i);
  if (halfMatch) {
    const y = parseInt(halfMatch[1], 10);
    const h = parseInt(halfMatch[2], 10);
    const periodStart = new Date(y, (h - 1) * 6, 1);
    const lastDay = new Date(y, h * 6, 0).getDate();
    const periodEnd = new Date(y, h * 6 - 1, lastDay, 23, 59, 59, 999);
    return { periodStart, periodEnd, periodKey: s };
  }

  const yearlyMatch = s.match(/^(\d{4})$/);
  if (yearlyMatch) {
    const y = parseInt(yearlyMatch[1], 10);
    const periodStart = new Date(y, 0, 1);
    const periodEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    return { periodStart, periodEnd, periodKey: s };
  }

  return null;
}

/**
 * POST /api/admin/commission-payout/run
 * Body: { periodKey } OR { year, month } (1-indexed) OR { scheduleType } for previous period
 * Runs actual payout
 */
async function runPayout(req, res) {
  try {
    const { periodKey, year, month, scheduleType, payoutType } = req.body;
    const mode = String(payoutType || "rank").trim().toLowerCase();
    if (!["rank", "club"].includes(mode)) {
      return response.errorResponse(
        res,
        { msg: "payoutType must be rank or club" },
        "Validation Error",
        400,
      );
    }
    const settings = await WalletSettings.getOrCreateSettings();
    const payoutSettings = settings.commissionPayoutSettings || {};

    let periodStart, periodEnd, periodKeyRes;

    if (periodKey) {
      const parsed = parsePeriodKey(periodKey);
      if (!parsed) {
        return response.errorResponse(
          res,
          { msg: "Invalid periodKey" },
          "Validation Error",
          400,
        );
      }
      periodStart = parsed.periodStart;
      periodEnd = parsed.periodEnd;
      periodKeyRes = parsed.periodKey;
    } else if (year != null && month != null) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1;
      if (Number.isNaN(y) || Number.isNaN(m) || m < 0 || m > 11) {
        return response.errorResponse(res, { msg: "Invalid year/month" }, "Validation Error", 400);
      }
      periodStart = new Date(y, m, 1);
      periodEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      periodKeyRes = `${y}-${String(m + 1).padStart(2, "0")}`;
    } else {
      const st = scheduleType || payoutSettings.scheduleType || "monthly";
      const now = new Date();
      const refD = new Date(now.getFullYear(), now.getMonth(), 0);
      const bounds = getPeriodBounds(st, refD);
      periodStart = bounds.periodStart;
      periodEnd = bounds.periodEnd;
      periodKeyRes = bounds.periodKey;
    }

    const result =
      mode === "club"
        ? await runClubCommissionForPeriod(
            periodStart,
            periodEnd,
            periodKeyRes,
            "period",
            { dryRun: false },
          )
        : await runRankCommissionForPeriod(periodStart, periodEnd, periodKeyRes, {
            dryRun: false,
          });

    const cb = result.calculationBreakdown || {};
    await CommissionPayoutSummary.findOneAndUpdate(
      { periodKey: periodKeyRes, payoutType: mode },
      {
        $set: {
          periodKey: periodKeyRes,
          payoutType: mode,
          totalRevenue: cb.totalRevenue ?? 0,
          levelsPercent: cb.levelsPercent ?? 0,
          designationsPercent: cb.designationsPercent ?? 0,
          adminSurchargePercent: cb.adminSurchargePercent ?? 0,
          companyProfitPercent: cb.companyProfitPercent ?? 0,
          companyProfitPool: cb.companyProfitPool ?? 0,
          periodStart: result.periodStart ?? periodStart,
          periodEnd: result.periodEnd ?? periodEnd,
          activeCount: result.activeCount ?? 0,
          registrationFee: result.registrationFee ?? 0,
          isPaid: true,
          lostDueToCapping: cb.lostDueToCapping ?? 0,
        },
      },
      { upsert: true, new: true },
    );

    return response.successResponse(res, {
      message: `${mode.toUpperCase()} payout completed for ${periodKeyRes}. Distributed ₹${result.distributed.toFixed(2)}`,
      payoutType: mode,
      periodKey: periodKeyRes,
      ...result,
    });
  } catch (err) {
    console.error("runPayout error:", err);
    return response.errorResponse(res, {}, err.message || "Server Error", 500);
  }
}

/**
 * GET /api/admin/commission-payout/history
 * Query: page, limit, periodKey
 * Returns past payouts (from WalletTransaction RANK_INCOME)
 */
async function getHistory(req, res) {
  try {
    const { page = 1, limit = 20, periodKey, payoutType } = req.query;
    const mode = String(payoutType || "rank").trim().toLowerCase();
    if (!["rank", "club"].includes(mode)) {
      return response.errorResponse(
        res,
        { msg: "payoutType must be rank or club" },
        "Validation Error",
        400,
      );
    }
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const match = {
      type: mode === "club" ? "CLUB_INCOME" : "RANK_INCOME",
      direction: "CREDIT",
      requestId:
        mode === "club"
          ? { $regex: /^club_[^:]+:/ }
          : { $regex: /^rank_(period|monthly):/ },
    };

    if (periodKey && periodKey.trim()) {
      const escaped = periodKey.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.requestId =
        mode === "club"
          ? { $regex: `club_[^:]+:${escaped}:` }
          : { $regex: `rank_(period|monthly):${escaped}:` };
    }

    const agg = await WalletTransaction.aggregate([
      { $match: match },
      {
        $addFields: {
          periodKey: { $arrayElemAt: [{ $split: ["$requestId", ":"] }, 1] },
        },
      },
      {
        $group: {
          _id: "$periodKey",
          totalAmount: { $sum: "$amount" },
          userCount: { $sum: 1 },
          lastCreditedAt: { $max: "$createdAt" },
        },
      },
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          periodKey: "$_id",
          totalAmount: { $round: ["$totalAmount", 2] },
          userCount: 1,
          lastCreditedAt: 1,
          _id: 0,
        },
      },
    ]);

    const countResult = await WalletTransaction.aggregate([
      { $match: match },
      { $addFields: { periodKey: { $arrayElemAt: [{ $split: ["$requestId", ":"] }, 1] } } },
      { $group: { _id: "$periodKey" } },
      { $count: "total" },
    ]);
    const total = countResult[0]?.total ?? 0;

    const periodKeys = agg.map((h) => h.periodKey);
    const summaries = await CommissionPayoutSummary.find({
      periodKey: { $in: periodKeys },
      payoutType: mode,
    })
      .lean()
      .exec();
    const summaryMap = new Map(
      summaries.map((s) => [`${s.periodKey}:${s.payoutType}`, s]),
    );

    const historyWithMeta = agg.map((h) => {
      const key = `${h.periodKey}:${mode}`;
      const s = summaryMap.get(key);
      return {
        ...h,
        companyProfitPercent: s?.companyProfitPercent ?? null,
        adminSurchargePercent: s?.adminSurchargePercent ?? null,
        levelsPercent: s?.levelsPercent ?? null,
        designationsPercent: s?.designationsPercent ?? null,
        companyProfitPool: s?.companyProfitPool ?? null,
        registrationFee: s?.registrationFee ?? null,
        activeCount: s?.activeCount ?? null,
      };
    });

    return response.successResponse(res, {
      payoutType: mode,
      history: historyWithMeta,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getHistory error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

/**
 * GET /api/admin/commission-payout/history/:periodKey/detail
 * Returns detailed list of users credited for a period
 */
async function getHistoryDetail(req, res) {
  try {
    const { periodKey } = req.params;
    const mode = String(req.query.payoutType || "rank")
      .trim()
      .toLowerCase();
    if (!["rank", "club"].includes(mode)) {
      return response.errorResponse(
        res,
        { msg: "payoutType must be rank or club" },
        "Validation Error",
        400,
      );
    }
    if (!periodKey || !periodKey.trim()) {
      return response.errorResponse(res, { msg: "periodKey required" }, "Validation Error", 400);
    }

    const escaped = periodKey.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const txns = await WalletTransaction.find({
      type: mode === "club" ? "CLUB_INCOME" : "RANK_INCOME",
      direction: "CREDIT",
      requestId:
        mode === "club"
          ? { $regex: `club_[^:]+:${escaped}:` }
          : { $regex: `rank_(period|monthly):${escaped}:` },
    })
      .select("userId amount requestId createdAt")
      .sort({ createdAt: 1 })
      .lean();

    const userIds = [...new Set(txns.map((t) => t.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("memberId name phone")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const extractRank = (rid) => {
      const m = (rid || "").match(/RANK_(\d+)$/);
      return m ? parseInt(m[1], 10) : null;
    };
    const extractClubKey = (rid) => {
      const parts = String(rid || "").split(":");
      return parts.length >= 4 ? parts[3] : null;
    };

    const details = txns.map((t) => {
      const u = userMap.get(t.userId?.toString());
      return {
        memberId: u?.memberId || t.userId?.toString(),
        name: u?.name || "—",
        phone: u?.phone || "—",
        amount: t.amount,
        rankCode: mode === "rank" ? extractRank(t.requestId) : null,
        clubWalletKey: mode === "club" ? extractClubKey(t.requestId) : null,
        creditedAt: t.createdAt,
      };
    });

    const grouped = {};
    for (const d of details) {
      const key =
        mode === "club"
          ? d.clubWalletKey || "UNKNOWN"
          : String(d.rankCode ?? 0);
      if (!grouped[key]) {
        grouped[key] =
          mode === "club"
            ? { clubWalletKey: key, users: [], total: 0 }
            : { rankCode: Number(key), users: [], total: 0 };
      }
      grouped[key].users.push(d);
      grouped[key].total += parseFloat(d.amount) || 0;
    }

    const summary = await CommissionPayoutSummary.findOne({
      periodKey: periodKey.trim(),
      payoutType: mode,
    })
      .lean()
      .exec();

    return response.successResponse(res, {
      payoutType: mode,
      periodKey: periodKey.trim(),
      details,
      groups: Object.values(grouped),
      meta: summary
        ? {
            companyProfitPercent: summary.companyProfitPercent,
            adminSurchargePercent: summary.adminSurchargePercent,
            levelsPercent: summary.levelsPercent,
            designationsPercent: summary.designationsPercent,
            companyProfitPool: summary.companyProfitPool,
            registrationFee: summary.registrationFee,
            activeCount: summary.activeCount,
          }
        : null,
    });
  } catch (err) {
    console.error("getHistoryDetail error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

/**
 * GET /api/admin/commission-payout/ranks-overview
 * Returns all ranks with: capping, commission%, user count, work (activations) for current period
 */
async function getRanksOverview(req, res) {
  try {
    const mode = String(req.query.payoutType || "rank").trim().toLowerCase();
    if (!["rank", "club"].includes(mode)) {
      return response.errorResponse(
        res,
        { msg: "payoutType must be rank or club" },
        "Validation Error",
        400,
      );
    }

    const settings = await WalletSettings.getOrCreateSettings();
    const ranks = settings.ranks || [];
    const clubs = settings.clubs || [];
    const payoutSettings = settings.commissionPayoutSettings || {};

    // Always use current calendar month for overview (latest period)
    const now = new Date();
    const { monthStart, monthEnd } = getMonthBounds(
      now.getFullYear(),
      now.getMonth(),
    );
    const periodKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    const activeCount = await getActivationsCountInPeriod(
      monthStart,
      monthEnd,
    );

    const levels = settings.levels || [];
    const designations = settings.designations || [];
    const sumLevels = levels.reduce(
      (s, l) => s + (l.commissionPercent || 0),
      0,
    );
    const sumDesignations = designations.reduce(
      (s, d) => s + (d.commissionPercent || 0),
      0,
    );
    const adminSurchargePercent = Number(
      settings.adminSurchargePercent ?? 0,
    );
    const baseCompanyProfitPercent = Math.max(
      0,
      100 - sumLevels - sumDesignations,
    );
    const companyProfitPercent = Math.max(
      0,
      baseCompanyProfitPercent - adminSurchargePercent,
    );
    const registrationFee = Number(settings.registrationFee) || 0;
    const companyProfitPool =
      activeCount > 0
        ? (companyProfitPercent / 100) * activeCount * registrationFee
        : 0;

    const summary = await User.aggregate([
      { $match: { status: 1, isPaid: true, rankCode: { $in: ranks.map((r) => r.rankCode) } } },
      { $group: { _id: "$rankCode", userCount: { $sum: 1 } } },
    ]);
    const rankUserCount = new Map(summary.map((s) => [s._id, s.userCount]));

    const rankOverview = ranks.map((r) => {
      const rankPool = (companyProfitPool * (r.commissionPercent || 0)) / 100;
      const capping = r.capping ?? 0;
      const amountToDistribute = capping > 0 && rankPool > capping ? capping : rankPool;
      const userCount = rankUserCount.get(r.rankCode) || 0;
      const perUser = userCount > 0 ? amountToDistribute / userCount : 0;

      return {
        rankCode: r.rankCode,
        name: r.name,
        commissionPercent: r.commissionPercent,
        capping: capping || null,
        monthlyTarget: r.monthlyTarget ?? 0,
        selfSaleRequired: r.selfSaleRequired ?? 0,
        teamSizeRequired: r.teamSizeRequired ?? 0,
        userCount,
        rankPool: Math.round(rankPool * 100) / 100,
        amountToDistribute: Math.round(amountToDistribute * 100) / 100,
        perUserAmount: Math.round(perUser * 100) / 100,
      };
    });

    const clubOverview = clubs.map((c) => {
      const clubPool = (companyProfitPool * (c.commissionPercent || 0)) / 100;
      const capping = c.capping ?? 0;
      const amountToDistribute =
        capping > 0 && clubPool > capping ? capping : clubPool;
      return {
        name: c.name,
        walletKey: c.walletKey,
        commissionPercent: c.commissionPercent,
        capping: capping || null,
        minimumRankCode: c.minimumRankCode ?? null,
        selfSaleRequired: c.selfSaleRequired ?? 0,
        monthlyTarget: c.monthlyTarget ?? 0,
        isAdminOnly: c.isAdminOnly === true,
        clubPool: Math.round(clubPool * 100) / 100,
        amountToDistribute: Math.round(amountToDistribute * 100) / 100,
      };
    });

    return response.successResponse(res, {
      payoutType: mode,
      periodKey,
      periodStart: monthStart,
      periodEnd: monthEnd,
      activeCount,
      companyProfitPercent,
      registrationFee,
      companyProfitPool: Math.round(companyProfitPool * 100) / 100,
      ranks: rankOverview,
      clubs: clubOverview,
      payoutSettings: {
        scheduleType: payoutSettings.scheduleType || "monthly",
        customDayOfMonth: payoutSettings.customDayOfMonth ?? 1,
        customDayOfWeek: payoutSettings.customDayOfWeek ?? 0,
        payoutTimeHH: payoutSettings.payoutTimeHH ?? 1,
        payoutTimeMM: payoutSettings.payoutTimeMM ?? 0,
      },
      configVersion: settings.configVersion ?? 1,
    });
  } catch (err) {
    console.error("getRanksOverview error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

module.exports = {
  getPreview,
  runPayout,
  getHistory,
  getHistoryDetail,
  getRanksOverview,
};
