const mongoose = require("mongoose");
const User = require("../../../models/User");
const WalletSettings = require("../../../models/WalletSettings");
const WalletTransaction = require("../../../models/WalletTransaction");
const {
  getCurrentClubEligibility,
} = require("../../../services/clubEligibilityService");
const {
  getMonthlyDownlineActiveCount,
} = require("../../../services/rankEligibilityService");
const {
  getPeriodBounds,
  getActivationsCountInPeriod,
} = require("../../../services/rankCommissionService");

function getCurrentMonthBounds() {
  const d = new Date();
  return {
    periodStart: new Date(d.getFullYear(), d.getMonth(), 1),
    periodEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

async function getClubInfo(req, res) {
  try {
    const userId = req.user.id;
    const uid = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const [user, settings] = await Promise.all([
      User.findById(uid).select("status isPaid rankCode directCount").lean(),
      WalletSettings.getOrCreateSettings(),
    ]);

    const clubs = settings?.clubs || [];
    const monthBounds = getCurrentMonthBounds();
    const payoutSettings = settings?.commissionPayoutSettings || {};
    const levels = settings?.levels || [];
    const designations = settings?.designations || [];
    const registrationFee = Number(settings?.registrationFee ?? 0);
    const sumLevels = levels.reduce(
      (s, l) => s + (l.commissionPercent || 0),
      0,
    );
    const sumDesignations = designations.reduce(
      (s, d) => s + (d.commissionPercent || 0),
      0,
    );
    const adminSurchargePercent = Number(settings?.adminSurchargePercent ?? 0);
    const baseCompanyProfitPercent = Math.max(
      0,
      100 - sumLevels - sumDesignations,
    );
    const companyProfitPercent = Math.max(
      0,
      baseCompanyProfitPercent - adminSurchargePercent,
    );
    const scheduleType = payoutSettings.scheduleType || "monthly";
    const now = new Date();
    const refD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const payoutBounds = getPeriodBounds(scheduleType, refD);
    const activationCountInPeriod = await getActivationsCountInPeriod(
      payoutBounds.periodStart,
      payoutBounds.periodEnd,
    );
    const companyProfitPool =
      activationCountInPeriod > 0
        ? (companyProfitPercent / 100) *
          activationCountInPeriod *
          registrationFee
        : 0;
    const companyProfitPerActivation =
      (companyProfitPercent / 100) * registrationFee;
    const data = [];

    for (const club of clubs) {
      const eligibility = await getCurrentClubEligibility(uid, club, {
        user,
        monthBounds,
      });

      const currentRankCode = Number(user?.rankCode || 0);
      const directCount = Number(user?.directCount || 0);
      const monthlyCount = Number(
        await getMonthlyDownlineActiveCount(uid, {
          monthStart: monthBounds.periodStart,
          monthEnd: monthBounds.periodEnd,
        }),
      );

      const conditions = [];
      if ((club.minimumRankCode ?? null) != null) {
        const required = Number(club.minimumRankCode);
        const current = currentRankCode;
        const percent =
          required > 0 ? clampPercent((current / required) * 100) : 100;
        conditions.push({
          key: "minimumRankCode",
          label: "Minimum Rank Code",
          current,
          required,
          percent,
          achieved: current >= required,
        });
      }
      if (Number(club.selfSaleRequired || 0) > 0) {
        const required = Number(club.selfSaleRequired);
        const current = directCount;
        const percent =
          required > 0 ? clampPercent((current / required) * 100) : 100;
        conditions.push({
          key: "selfSaleRequired",
          label: "Direct Count",
          current,
          required,
          percent,
          achieved: current >= required,
        });
      }
      if (Number(club.monthlyTarget || 0) > 0) {
        const required = Number(club.monthlyTarget);
        const current = monthlyCount;
        const percent =
          required > 0 ? clampPercent((current / required) * 100) : 100;
        conditions.push({
          key: "monthlyTarget",
          label: "Monthly New Active",
          current,
          required,
          percent,
          achieved: current >= required,
        });
      }

      const overallPercent =
        conditions.length > 0
          ? Math.min(...conditions.map((c) => clampPercent(c.percent)))
          : 100;
      data.push({
        name: club.name,
        walletKey: club.walletKey,
        isAdminOnly: club.isAdminOnly === true,
        commissionPercent: club.commissionPercent || 0,
        minimumRankCode: club.minimumRankCode ?? null,
        selfSaleRequired: club.selfSaleRequired || 0,
        monthlyTarget: club.monthlyTarget || 0,
        capping: club.capping || 0,
        eligible: eligibility.eligible,
        reason: eligibility.reason || null,
        conditions,
        overallPercent,
        clubPool:
          Math.round(
            ((companyProfitPool * (club.commissionPercent || 0)) / 100) * 100,
          ) / 100,
        perActivationAmount:
          Math.round(
            ((companyProfitPerActivation * (club.commissionPercent || 0)) /
              100) *
              100,
          ) / 100,
        potentialSingleUserAmount:
          Math.round(
            ((companyProfitPerActivation *
              Math.max(
                1,
                Number(club.selfSaleRequired || 0),
                Number(club.monthlyTarget || 0),
              ) *
              (club.commissionPercent || 0)) /
              100) *
              100,
          ) / 100,
        qualificationActivationBasis: Math.max(
          1,
          Number(club.selfSaleRequired || 0),
          Number(club.monthlyTarget || 0),
        ),
      });
    }

    const txns = await WalletTransaction.find({
      userId: uid,
      type: "CLUB_INCOME",
      direction: "CREDIT",
      createdAt: { $gte: monthBounds.periodStart, $lte: monthBounds.periodEnd },
    }).lean();
    const totalClubIncomeThisMonth = txns.reduce(
      (sum, tx) => sum + (parseFloat(tx.amount?.toString?.() || "0") || 0),
      0,
    );

    return res.status(200).json({
      status: true,
      response: {
        clubs: data,
        totalClubIncomeThisMonth: totalClubIncomeThisMonth.toFixed(2),
        clubBenefitCalculation: {
          periodKey: payoutBounds.periodKey,
          scheduleType,
          activationCount: activationCountInPeriod,
          registrationFee,
          levelsPercent: Math.round(sumLevels * 100) / 100,
          designationsPercent: Math.round(sumDesignations * 100) / 100,
          companyProfitPercent: Math.round(companyProfitPercent * 100) / 100,
          companyProfitPool: Math.round(companyProfitPool * 100) / 100,
          companyProfitPerActivation:
            Math.round(companyProfitPerActivation * 100) / 100,
          formula: `Company Profit % = 100 - Levels(${Math.round(sumLevels * 100) / 100}%) - Designations(${Math.round(sumDesignations * 100) / 100}%) = ${Math.round(companyProfitPercent * 100) / 100}%`,
        },
      },
    });
  } catch (err) {
    console.error("getClubInfo error:", err);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
}

module.exports = { getClubInfo };
