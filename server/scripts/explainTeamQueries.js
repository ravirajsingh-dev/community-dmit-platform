/**
 * Performance Validation — Team Queries Index Usage
 *
 * Run: node server/scripts/explainTeamQueries.js
 * Requires: MONGO_URI, and at least one user with referredBy in DB
 *
 * Validates IXSCAN (index scan) used for all team queries.
 * Fails with exit 1 if COLLSCAN detected.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");

function assertIXSCAN(explain, label) {
  const plan = explain.queryPlanner?.winningPlan;
  if (!plan) {
    console.error(`[${label}] No winning plan found`);
    process.exit(1);
  }
  const stage = plan.stage || plan.inputStage?.stage;
  const usesIndex = plan.inputStage?.indexName || plan.indexName || stage === "IXSCAN";
  if (stage === "COLLSCAN" || (!usesIndex && !plan.inputStage?.inputStage?.indexName)) {
    console.error(`[${label}] COLLSCAN or non-index scan detected!`);
    console.error(JSON.stringify(plan, null, 2));
    process.exit(1);
  }
  console.log(`[${label}] IXSCAN OK - index used`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("=== Performance Validation: Team Queries ===\n");

  const sampleUser = await User.findOne({
    referredBy: { $exists: true, $ne: null },
  }).select("_id");
  if (!sampleUser) {
    console.log("No non-root user found. Create a user first.");
    await mongoose.disconnect();
    return;
  }
  const uid = sampleUser._id;

  console.log("\n--- 1. Direct team (User.find referredBy) ---");
  const ex1 = await User.find({ referredBy: uid })
    .sort({ createdAt: -1 })
    .limit(20)
    .explain("executionStats");
  console.log("Plan:", JSON.stringify(ex1.queryPlanner?.winningPlan, null, 2));
  assertIXSCAN(ex1, "Direct team");

  console.log("\n--- 2. Full downline (UserHierarchy ancestor) ---");
  const ex2 = await UserHierarchy.find({ ancestor: uid })
    .limit(20)
    .explain("executionStats");
  console.log("Plan:", JSON.stringify(ex2.queryPlanner?.winningPlan, null, 2));
  assertIXSCAN(ex2, "Full downline");

  console.log("\n--- 3. Level-wise (ancestor + level) ---");
  const ex3 = await UserHierarchy.find({ ancestor: uid, level: 1 })
    .limit(20)
    .explain("executionStats");
  console.log("Plan:", JSON.stringify(ex3.queryPlanner?.winningPlan, null, 2));
  assertIXSCAN(ex3, "Level-wise");

  console.log("\n=== All validations passed. IXSCAN confirmed. ===");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
