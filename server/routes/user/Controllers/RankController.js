/**
 * User Rank Controller - QA Q19/Q20
 * GET /api/users/rank - current rank, next rank progress, commission earned this month
 */

const mongoose = require("mongoose");
const User = require("../../../models/User");
const UserDesignation = require("../../../models/UserDesignation");
const WalletTransaction = require("../../../models/WalletTransaction");
const WalletSettings = require("../../../models/WalletSettings");
const {
  toCents,
  computeCommissionCents,
} = require("../../../utils/financialMath");
const {
  checkRankEligibility,
  getMonthlyDownlineActiveCount,
  getDownlineIds,
} = require("../../../services/rankEligibilityService");
const {
  getPeriodBounds,
  getActivationsCountInPeriod,
} = require("../../../services/rankCommissionService");

function getCurrentMonthBounds() {
  const d = new Date();
  return {
    monthStart: new Date(d.getFullYear(), d.getMonth(), 1),
    monthEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function buildRankConditionProgress({
  rankConfig,
  currentRankCode,
  directCount,
  totalDownlineCount,
  monthlyNewActiveCount,
  requiredDesignationConditions = [],
}) {
  const conditions = [];

  if ((rankConfig.requiredRankCode ?? null) != null) {
    const required = Number(rankConfig.requiredRankCode);
    const current = Number(currentRankCode);
    const percent =
      required > 0 ? clampPercent((current / required) * 100) : 100;
    conditions.push({
      key: "requiredRank",
      label: "Required Previous Rank",
      current,
      required,
      percent,
      achieved: current >= required,
    });
  }

  if ((rankConfig.selfSaleRequired ?? 0) > 0) {
    const required = Number(rankConfig.selfSaleRequired);
    const current = Number(directCount);
    const percent =
      required > 0 ? clampPercent((current / required) * 100) : 100;
    conditions.push({
      key: "directCount",
      label: "Direct Count",
      current,
      required,
      percent,
      achieved: current >= required,
    });
  }

  if ((rankConfig.teamSizeRequired ?? 0) > 0) {
    const required = Number(rankConfig.teamSizeRequired);
    const current = Number(totalDownlineCount);
    const percent =
      required > 0 ? clampPercent((current / required) * 100) : 100;
    conditions.push({
      key: "teamSize",
      label: "Team Size",
      current,
      required,
      percent,
      achieved: current >= required,
    });
  }

  if ((rankConfig.monthlyTarget ?? 0) > 0) {
    const required = Number(rankConfig.monthlyTarget);
    const current = Number(monthlyNewActiveCount);
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

  if ((rankConfig.capping ?? 0) > 0) {
    const cappingValue = Number(rankConfig.capping);
    conditions.push({
      key: "capping",
      label: "Capping",
      current: null,
      required: null,
      note: `Limit: ${cappingValue.toFixed(2)}`,
      percent: 100,
      achieved: true,
    });
  }

  if (requiredDesignationConditions.length > 0) {
    conditions.push(...requiredDesignationConditions);
  }

  const overallPercent =
    conditions.length > 0
      ? Math.min(...conditions.map((c) => clampPercent(c.percent)))
      : 100;

  return {
    overallPercent: clampPercent(overallPercent),
    conditions,
  };
}

/**
 * GET /api/users/rank
 */
async function getRankInfo(req, res) {
  try {
    const userId = req.user.id;
    const uid = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const [user, settings] = await Promise.all([
      User.findById(uid)
        .select("rankCode directCount totalDownlineCount status isPaid")
        .lean(),
      WalletSettings.getOrCreateSettings(),
    ]);

    if (!user || user.status !== 1 || user.isPaid !== true) {
      return res.status(200).json({
        status: true,
        response: {
          currentRank: null,
          nextRank: null,
          commissionEarnedThisMonth: "0.00",
          metrics: {
            currentRankCode: 0,
            directCount: 0,
            totalDownlineCount: 0,
            monthlyNewActiveCount: 0,
          },
          levels: [],
          ranks: [],
        },
      });
    }

    const ranks = (settings.ranks || []).sort(
      (a, b) => a.rankCode - b.rankCode,
    );
    const currentRankCode = user.rankCode ?? 0;
    const currentRankConfig = ranks.find((r) => r.rankCode === currentRankCode);
    const registrationFee = Number(settings?.registrationFee ?? 0);
    const registrationFeeCents = toCents(registrationFee);
    const payoutSettings = settings?.commissionPayoutSettings || {};

    let commissionEarnedThisMonth = 0;
    const { monthStart, monthEnd } = getCurrentMonthBounds();
    const rankTxs = await WalletTransaction.find({
      userId: uid,
      type: "RANK_INCOME",
      direction: "CREDIT",
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    for (const tx of rankTxs) {
      commissionEarnedThisMonth += parseFloat(tx.amount?.toString?.() || "0");
    }

    // Metrics used for club/rank progress UI.
    const directCount = user.directCount ?? 0;
    const totalDownlineCount = user.totalDownlineCount ?? 0;
    const monthlyNewActiveCount = await getMonthlyDownlineActiveCount(uid, {
      monthStart,
      monthEnd,
    });
    const downlineIds = await getDownlineIds(uid);
    const activeDownlineIds = await User.find({
      _id: { $in: downlineIds },
      status: 1,
    })
      .select("_id")
      .lean();
    const activeDownlineIdList = activeDownlineIds.map((d) => d._id);
    const designationNameByCode = new Map(
      (settings.designations || []).map((d) => [
        d.designationCode,
        d.name || `Designation ${d.designationCode}`,
      ]),
    );

    // Same process as admin ranks overview.
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
    const adminSurchargePercent = Number(settings.adminSurchargePercent ?? 0);
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

    const rankUsersSummary = await User.aggregate([
      {
        $match: {
          status: 1,
          isPaid: true,
          rankCode: { $in: ranks.map((r) => r.rankCode) },
        },
      },
      { $group: { _id: "$rankCode", userCount: { $sum: 1 } } },
    ]);
    const rankUserCountMap = new Map(
      rankUsersSummary.map((s) => [s._id, s.userCount]),
    );

    let nextRank = null;
    const nextRankCode = currentRankCode === 0 ? 1 : currentRankCode + 1;
    const nextRankConfig = ranks.find((r) => r.rankCode === nextRankCode);
    if (nextRankConfig) {
      const monthlyCount = monthlyNewActiveCount;
      const { eligible, reason } = await checkRankEligibility(
        uid,
        nextRankCode,
        {
          userRankCode: currentRankCode === 0 ? null : currentRankCode,
          directCount: user.directCount,
          downlineSize: user.totalDownlineCount,
          monthlyDownlineActiveCount: monthlyCount,
          monthBounds: { monthStart, monthEnd },
        },
      );

      const progress = [];
      if ((nextRankConfig.selfSaleRequired ?? 0) > 0) {
        progress.push({
          label: "Direct Count",
          current: user.directCount ?? 0,
          required: nextRankConfig.selfSaleRequired,
        });
      }
      if ((nextRankConfig.teamSizeRequired ?? 0) > 0) {
        progress.push({
          label: "Team Size",
          current: user.totalDownlineCount ?? 0,
          required: nextRankConfig.teamSizeRequired,
        });
      }
      if ((nextRankConfig.monthlyTarget ?? 0) > 0) {
        progress.push({
          label: "Monthly New Active",
          current: monthlyCount,
          required: nextRankConfig.monthlyTarget,
        });
      }

      nextRank = {
        rankCode: nextRankCode,
        name: nextRankConfig.name,
        eligible,
        reason: reason || null,
        progress,
      };
    }

    return res.status(200).json({
      status: true,
      response: {
        currentRank: currentRankConfig
          ? {
              rankCode: currentRankConfig.rankCode,
              name: currentRankConfig.name,
            }
          : null,
        nextRank,
        commissionEarnedThisMonth: commissionEarnedThisMonth.toFixed(2),
        levels: (settings.levels || [])
          .slice()
          .sort((a, b) => a.levelNumber - b.levelNumber)
          .map((l) => ({
            levelNumber: l.levelNumber,
            walletKey: l.walletKey,
            commissionPercent: l.commissionPercent ?? 0,
            // Used for UI "commission amount per registration fee".
            commissionAmount: (
              computeCommissionCents(
                registrationFeeCents,
                l.commissionPercent ?? 0,
              ) / 100
            ).toFixed(2),
          })),
        metrics: {
          currentRankCode,
          directCount,
          totalDownlineCount,
          monthlyNewActiveCount,
        },
        ranks: await Promise.all(
          ranks.map(async (r) => {
            const requiredDesignationConditions = [];
            const requiredDesignations = Array.isArray(r.requiredDesignations)
              ? r.requiredDesignations
              : [];

            for (const rd of requiredDesignations) {
              const code = Number(rd.designationCode);
              const minCount = Number(rd.minCount || 1);
              let currentCount = 0;
              if (
                activeDownlineIdList.length > 0 &&
                Number.isFinite(code)
              ) {
                currentCount = await UserDesignation.countDocuments({
                  userId: { $in: activeDownlineIdList },
                  designationCode: code,
                  status: "APPROVED",
                });
              }
              const percent =
                minCount > 0
                  ? clampPercent((currentCount / minCount) * 100)
                  : 100;
              requiredDesignationConditions.push({
                key: `requiredDesignation_${code}`,
                label: `${designationNameByCode.get(code) || `Designation ${code}`} Holders`,
                current: currentCount,
                required: minCount,
                percent,
                achieved: currentCount >= minCount,
              });
            }

            const progress = buildRankConditionProgress({
              rankConfig: r,
              currentRankCode,
              directCount,
              totalDownlineCount,
              monthlyNewActiveCount,
              requiredDesignationConditions,
            });
            const achieved = currentRankCode >= Number(r.rankCode);
            const eligibility = await checkRankEligibility(uid, r.rankCode, {
              userRankCode: currentRankCode === 0 ? null : currentRankCode,
              directCount,
              downlineSize: totalDownlineCount,
              monthlyDownlineActiveCount: monthlyNewActiveCount,
              monthBounds: { monthStart, monthEnd },
            });
            const eligibleForCurrentConditions = achieved
              ? true
              : eligibility.eligible === true;
            const rankPool =
              (companyProfitPool * Number(r.commissionPercent || 0)) / 100;
            const rankPoolPerActivation =
              (companyProfitPerActivation * Number(r.commissionPercent || 0)) /
              100;
            const capping = Number(r.capping || 0);
            const requiredDesignationCountBasis = Array.isArray(
              r.requiredDesignations,
            )
              ? r.requiredDesignations.reduce(
                  (mx, rd) => Math.max(mx, Number(rd?.minCount || 0)),
                  0,
                )
              : 0;
            const qualificationActivationBasis = Math.max(
              1,
              Number(r.selfSaleRequired || 0),
              Number(r.teamSizeRequired || 0),
              Number(r.monthlyTarget || 0),
              requiredDesignationCountBasis,
            );
            const qualificationPool =
              companyProfitPerActivation * qualificationActivationBasis;
            const qualificationRankPool =
              (qualificationPool * Number(r.commissionPercent || 0)) / 100;
            const amountToDistribute =
              capping > 0 && rankPool > capping ? capping : rankPool;
            const amountForSingleActivation =
              capping > 0 && rankPoolPerActivation > capping
                ? capping
                : rankPoolPerActivation;
            const amountForQualificationBasis =
              capping > 0 && qualificationRankPool > capping
                ? capping
                : qualificationRankPool;
            const userCount = rankUserCountMap.get(r.rankCode) || 0;
            const actualPerUserAmount =
              userCount > 0 ? amountToDistribute / userCount : 0;
            const potentialSingleUserAmount =
              Math.round(amountForQualificationBasis * 100) / 100;
            return {
              rankCode: r.rankCode,
              name: r.name,
              commissionPercent: r.commissionPercent ?? 0,
              commissionAmount: (
                computeCommissionCents(
                  registrationFeeCents,
                  r.commissionPercent ?? 0,
                ) / 100
              ).toFixed(2),
              teamSizeRequired: r.teamSizeRequired ?? 0,
              monthlyTarget: r.monthlyTarget ?? 0,
              capping: r.capping ?? 0,
              isCurrent: Number(r.rankCode) === Number(currentRankCode),
              achieved,
              pending: !achieved,
              eligibleForCurrentConditions,
              blockedReason: eligibleForCurrentConditions
                ? null
                : eligibility.reason || "Conditions not met",
              userCount,
              rankPool: Math.round(rankPool * 100) / 100,
              amountToDistribute: Math.round(amountToDistribute * 100) / 100,
              actualPerUserAmount: Math.round(actualPerUserAmount * 100) / 100,
              perActivationAmount:
                Math.round(amountForSingleActivation * 100) / 100,
              qualificationActivationBasis,
              assumedSingleUserAmount: potentialSingleUserAmount,
              overallPercent: achieved ? 100 : progress.overallPercent,
              conditions: progress.conditions.map((c) => ({
                ...c,
                percent: achieved ? 100 : c.percent,
                achieved: achieved ? true : c.achieved,
              })),
            };
          }),
        ),
        rankBenefitCalculation: {
          periodKey: payoutBounds.periodKey,
          activationCount: activationCountInPeriod,
          registrationFee,
          levelsPercent: Math.round(sumLevels * 100) / 100,
          designationsPercent: Math.round(sumDesignations * 100) / 100,
          companyProfitPercent: Math.round(companyProfitPercent * 100) / 100,
          companyProfitPool: Math.round(companyProfitPool * 100) / 100,
          companyProfitPerActivation:
            Math.round(companyProfitPerActivation * 100) / 100,
          scheduleType: scheduleType,
          formula: `Company Profit % = 100 - Levels(${Math.round(sumLevels * 100) / 100}%) - Designations(${Math.round(sumDesignations * 100) / 100}%) = ${Math.round(companyProfitPercent * 100) / 100}%`,
          poolFormula: `Pool = (${Math.round(companyProfitPercent * 100) / 100}% ÷ 100) × ${activationCountInPeriod} activations × ₹${registrationFee} = ₹${Math.round(companyProfitPool * 100) / 100}`,
        },
      },
    });
  } catch (err) {
    console.error("getRankInfo error:", err);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
}

module.exports = { getRankInfo };
