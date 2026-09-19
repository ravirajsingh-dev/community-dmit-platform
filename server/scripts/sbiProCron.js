/**
 * SBI PRO Auto-Verification Cron - Phase 3
 *
 * VERIFICATION_PENDING + 24h passed -> auto VERIFIED -> ANALYSIS_PENDING
 *
 * Run hourly via cron:
 *   0 * * * * cd /path/to/godjee && node server/scripts/sbiProCron.js
 *
 * Or run manually:
 *   node server/scripts/sbiProCron.js
 *
 * Requires: MONGO_URI in env
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { autoVerifyAfter24Hours } = require("../services/sbiProSessionService");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[SBI PRO Cron] Connected to MongoDB");

    const result = await autoVerifyAfter24Hours();
    console.log(
      `[SBI PRO Cron] Auto-verified ${result.modifiedCount} session(s) after 24h`
    );
  } catch (err) {
    console.error("[SBI PRO Cron] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[SBI PRO Cron] Disconnected");
    process.exit(0);
  }
}

run();
