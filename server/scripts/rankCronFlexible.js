/**
 * Rank & Club Commission Flexible Cron
 * Reads commissionPayoutSettings from WalletSettings and runs payout if today + time match schedule.
 *
 * Schedule types:
 * - daily: run every day for yesterday
 * - weekly: run on customDayOfWeek (0=Sun) for previous week
 * - monthly: run on customDayOfMonth (e.g. 5 = 5th) for previous month
 * - quarterly: run on 1st of Jan,Apr,Jul,Oct for previous quarter
 * - half_yearly: run on 1st of Jan,Jul for previous half
 * - yearly: run on 1st Jan for previous year
 * - custom: same as monthly
 *
 * Usage:
 *   node server/scripts/rankCronFlexible.js
 *   node server/scripts/rankCronFlexible.js --force  # run regardless of schedule
 *
 * Recommended system cron: run every minute, script self-checks date + time:
 *   * * * * * cd /path/to/app && node server/scripts/rankCronFlexible.js >> logs/rank-cron.log 2>&1
 *
 * Then admin can control:
 *   - scheduleType (daily/weekly/monthly/...)
 *   - customDayOfMonth/customDayOfWeek
 *   - payoutTimeHH/payoutTimeMM (24h)
 * from Commission Payout Management → Payout Schedule.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const WalletSettings = require("../models/WalletSettings");
const CommissionPayoutSummary = require("../models/CommissionPayoutSummary");
const {
  runRankCommissionForPeriod,
  getPeriodBounds,
} = require("../services/rankCommissionService");
const {
  runClubCommissionForSchedule,
} = require("../services/clubCommissionService");

function shouldRunNow(settings) {
  const payout = settings.commissionPayoutSettings || {};
  const scheduleType = payout.scheduleType || "monthly";
  const customDayOfMonth = payout.customDayOfMonth ?? 1;
  const customDayOfWeek = payout.customDayOfWeek ?? 0;
  const payoutTimeHH = payout.payoutTimeHH ?? 1;
  const payoutTimeMM = payout.payoutTimeMM ?? 0;

  const now = new Date();
  const today = now.getDate();
  const dayOfWeek = now.getDay();
  const month = now.getMonth();
  const year = now.getFullYear();

  let dateMatch = false;
  switch (scheduleType) {
    case "daily":
      dateMatch = true;
      break;
    case "weekly":
      dateMatch = dayOfWeek === customDayOfWeek;
      break;
    case "monthly":
    case "custom":
      dateMatch =
        today ===
        Math.min(customDayOfMonth, new Date(year, month + 1, 0).getDate());
      break;
    case "quarterly":
      dateMatch = today === 1 && [0, 3, 6, 9].includes(month);
      break;
    case "half_yearly":
      dateMatch = today === 1 && [0, 6].includes(month);
      break;
    case "yearly":
      dateMatch = today === 1 && month === 0;
      break;
    default:
      dateMatch = today === 1;
      break;
  }

  if (!dateMatch) return false;

  // Time of day match (minute-level). Cron should run at least once per minute.
  const hh = now.getHours();
  const mm = now.getMinutes();
  return hh === payoutTimeHH && mm === payoutTimeMM;
}

async function run() {
  const forceRun = process.argv.includes("--force");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const settings = await WalletSettings.getOrCreateSettings();
    const payout = settings.commissionPayoutSettings || {};
    const scheduleType = payout.scheduleType || "monthly";

    if (!forceRun && !shouldRunNow(settings)) {
      console.log(
        "[Rank/Club Cron Flexible] Skipping - date/time do not match schedule.",
      );
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    const now = new Date();
    // Determine which period to run based on last processed summary (if any)
    const lastSummary = await CommissionPayoutSummary.findOne({
      payoutType: "rank",
      isPaid: true,
      periodEnd: { $ne: null },
    })
      .sort({ periodEnd: -1 })
      .lean()
      .exec();

    let refDate;
    if (lastSummary?.periodEnd) {
      // Start from the day after the last processed period end
      const d = new Date(lastSummary.periodEnd);
      d.setDate(d.getDate() + 1);
      refDate = d;
    } else {
      // Seed: behave like original logic (previous period from "now")
      switch (scheduleType) {
        case "daily":
          refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          break;
        case "weekly":
          refDate = new Date(now);
          refDate.setDate(refDate.getDate() - 7);
          break;
        default:
          refDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      }
    }

    const bounds = getPeriodBounds(scheduleType, refDate);

    // Prevent duplicate automatic payout for same periodKey + payoutType
    const existingRankSummary = await require("../models/CommissionPayoutSummary")
      .findOne({ periodKey: bounds.periodKey, payoutType: "rank", isPaid: true })
      .lean()
      .exec();
    const existingClubSummary = await require("../models/CommissionPayoutSummary")
      .findOne({ periodKey: bounds.periodKey, payoutType: "club", isPaid: true })
      .lean()
      .exec();
    if (!forceRun && existingRankSummary && existingClubSummary) {
      console.log(
        `[Rank/Club Cron Flexible] Skipping - payout already marked paid for ${bounds.periodKey}.`,
      );
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    console.log(
      `[Rank/Club Cron Flexible] Running for ${bounds.periodKey} (${scheduleType})`,
    );

    const rankResult = await runRankCommissionForPeriod(
      bounds.periodStart,
      bounds.periodEnd,
      bounds.periodKey,
      { dryRun: false },
    );
    console.log(
      `[Rank Cron Flexible] Distributed ₹${rankResult.distributed.toFixed(2)}`,
    );
    if (rankResult.breakdown?.length) {
      rankResult.breakdown.forEach((b) => {
        console.log(
          `  Rank ${b.rankCode} (${b.rankName}): ${b.userCount} users, ₹${b.perUserAmount} each`,
        );
      });
    }

    // Run club commission for same schedule/period
    const clubResult = await runClubCommissionForSchedule(scheduleType, refDate, {
      dryRun: false,
    });
    console.log(
      `[Club Cron Flexible] Distributed ₹${(clubResult.distributed || 0).toFixed(
        2,
      )}`,
    );

    // Update cursor to mark this period as the last processed one
    await CommissionPayoutCursor.findOneAndUpdate(
      { singletonKey: "GLOBAL" },
      {
        $set: {
          singletonKey: "GLOBAL",
          lastPeriodKey: bounds.periodKey,
          lastPeriodEnd: bounds.periodEnd,
        },
      },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error("[Rank Cron Flexible] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[Rank Cron Flexible] Done");
    process.exit(0);
  }
}

run();
