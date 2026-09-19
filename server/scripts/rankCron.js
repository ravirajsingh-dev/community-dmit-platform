/**
 * Rank Commission Monthly Cron - QA Q16
 *
 * Runs monthly rank commission payout for previous month.
 * Schedule: 1st of each month at 1 AM (e.g. 0 1 1 * *)
 *
 * Run manually:
 *   node server/scripts/rankCron.js
 *   node server/scripts/rankCron.js 2025 2  # for Feb 2025
 *
 * Requires: MONGO_URI in env
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { runMonthlyRankCommission } = require("../services/rankCommissionService");

async function run() {
  let year, month;
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    year = parseInt(args[0], 10);
    month = parseInt(args[1], 10) - 1; // 0-indexed
    if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
      console.error("Usage: node rankCron.js [year month]");
      process.exit(1);
    }
  } else {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth() - 1; // previous month
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`[Rank Cron] Connected. Running for ${year}-${String(month + 1).padStart(2, "0")}`);

    const result = await runMonthlyRankCommission(year, month);
    console.log(`[Rank Cron] Distributed ₹${result.distributed.toFixed(2)}`);
    if (result.breakdown?.length) {
      result.breakdown.forEach((b) => {
        console.log(`  Rank ${b.rankCode} (${b.rankName}): ${b.userCount} users, ₹${b.perUserAmount} each`);
      });
    }
  } catch (err) {
    console.error("[Rank Cron] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[Rank Cron] Disconnected");
    process.exit(0);
  }
}

run();
