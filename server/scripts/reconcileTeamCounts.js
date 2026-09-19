/**
 * Data Reconciliation Script — Team Counts Audit
 *
 * Nightly audit: validates directCount and totalDownlineCount against actual DB counts.
 * Logs mismatches for manual review.
 *
 * Usage: node server/scripts/reconcileTeamCounts.js
 * Requires: MONGO_URI in env
 *
 * Output: Logs mismatches to stdout. Exit 0 = no errors, 1 = mismatches found.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");

const BATCH_SIZE = 1000;

async function reconcile() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[RECONCILE] Connected to MongoDB");
  console.log("[RECONCILE] Starting audit at", new Date().toISOString());

  const mismatches = [];
  let processed = 0;
  let skip = 0;
  const totalUsers = await User.countDocuments({});

  while (skip < totalUsers) {
    const users = await User.find({})
      .select("_id memberId directCount totalDownlineCount referredBy")
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    for (const user of users) {
      const [actualDirect, actualTotal] = await Promise.all([
        User.countDocuments({ referredBy: user._id }),
        UserHierarchy.countDocuments({ ancestor: user._id }),
      ]);

      const storedDirect = user.directCount ?? 0;
      const storedTotal = user.totalDownlineCount ?? 0;

      if (actualDirect !== storedDirect || actualTotal !== storedTotal) {
        mismatches.push({
          userId: user._id.toString(),
          memberId: user.memberId,
          directCount: { stored: storedDirect, actual: actualDirect },
          totalDownlineCount: { stored: storedTotal, actual: actualTotal },
        });
      }
      processed++;
    }
    skip += BATCH_SIZE;
  }

  console.log("[RECONCILE] Processed", processed, "users");

  if (mismatches.length > 0) {
    console.error("[RECONCILE] Mismatches found:", mismatches.length);
    mismatches.forEach((m) => {
      console.error(
        JSON.stringify({
          memberId: m.memberId,
          directCount: m.directCount,
          totalDownlineCount: m.totalDownlineCount,
        })
      );
    });
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("[RECONCILE] No mismatches. Audit passed.");
  await mongoose.disconnect();
  process.exit(0);
}

reconcile().catch((err) => {
  console.error("[RECONCILE] Error:", err);
  process.exit(1);
});
