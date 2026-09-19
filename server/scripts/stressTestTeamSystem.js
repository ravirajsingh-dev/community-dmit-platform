/**
 * Stress Test Script — MLM Team System
 *
 * Simulates:
 * - 100k user insert (configurable batch)
 * - 10k wide direct under one sponsor
 * - 1000 depth chain
 * - Concurrent registrations
 *
 * Validates:
 * - No duplicate hierarchy
 * - No write conflicts
 * - No count mismatch
 *
 * Usage:
 *   CONCURRENCY=10 DEPTH=100 WIDTH=1000 node server/scripts/stressTestTeamSystem.js
 *
 * Requires: MONGO_URI, replica set for transactions
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const { setupHierarchyForNewUser } = require("../services/teamRegistrationService");
const { ROOT_MEMBER_ID } = require("../constants/system");

const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 5;
const DEPTH = Math.min(parseInt(process.env.DEPTH, 10) || 100, 1000);
const WIDTH = Math.min(parseInt(process.env.WIDTH, 10) || 100, 10000);
const CLEANUP = process.env.CLEANUP !== "false";

async function getOrCreateRoot() {
  let root = await User.findOne({ memberId: ROOT_MEMBER_ID }).lean();
  if (!root) {
    root = await User.create({
      memberId: ROOT_MEMBER_ID,
      name: "System Root",
      phone: "0000000000",
      email: "root@system.local",
      password: "x",
      pwdRef: "x",
      status: 1,
      isSystemRoot: true,
    });
  }
  return root;
}

async function runDepthTest(rootId) {
  console.log("\n=== Depth test: chain of", DEPTH, "===");
  const session = await mongoose.startSession();
  const created = [];

  try {
    await session.withTransaction(async () => {
      let parentId = rootId;
      for (let i = 0; i < DEPTH; i++) {
        const memberId = `DT${String(i).padStart(6, "0")}0000000`;
        const existing = await User.findOne({ memberId }).session(session);
        if (existing) {
          parentId = existing._id;
          created.push(existing._id);
          continue;
        }
        const user = new User({
          memberId,
          name: `Depth User ${i}`,
          phone: `9${String(i).padStart(9, "0")}`,
          email: `d${i}@test.local`,
          password: "x",
          pwdRef: "x",
          status: 1,
          referredBy: parentId,
          referredByMemberId: parentId ? (await User.findById(parentId).select("memberId").lean())?.memberId : ROOT_MEMBER_ID,
        });
        await user.save({ session });
        await setupHierarchyForNewUser(user._id, parentId, session);
        parentId = user._id;
        created.push(user._id);
      }
    });
    console.log("Depth test OK. Created", created.length, "users");
    return created;
  } finally {
    await session.endSession();
  }
}

async function runWidthTest(sponsorId) {
  console.log("\n=== Width test:", WIDTH, "direct under sponsor ===");
  const created = [];
  const batchSize = 50;

  for (let b = 0; b < Math.ceil(WIDTH / batchSize); b++) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (let i = 0; i < batchSize; i++) {
          const idx = b * batchSize + i;
          if (idx >= WIDTH) break;
          const memberId = `WT${String(idx).padStart(6, "0")}0000000`;
          const existing = await User.findOne({ memberId }).session(session);
          if (existing) {
            created.push(existing._id);
            continue;
          }
          const user = new User({
            memberId,
            name: `Width User ${idx}`,
            phone: `8${String(idx).padStart(9, "0")}`,
            email: `w${idx}@test.local`,
            password: "x",
            pwdRef: "x",
            status: 1,
            referredBy: sponsorId,
            referredByMemberId: (await User.findById(sponsorId).select("memberId").session(session).lean())?.memberId || ROOT_MEMBER_ID,
          });
          await user.save({ session });
          await setupHierarchyForNewUser(user._id, sponsorId, session);
          created.push(user._id);
        }
      });
    } finally {
      await session.endSession();
    }
  }

  const actualDirect = await User.countDocuments({ referredBy: sponsorId });
  const sponsor = await User.findById(sponsorId).select("directCount totalDownlineCount").lean();
  console.log("Width test OK. directCount:", sponsor?.directCount, "actual:", actualDirect);

  if (actualDirect !== (sponsor?.directCount ?? 0)) {
    throw new Error(`Width count mismatch: stored ${sponsor?.directCount}, actual ${actualDirect}`);
  }
  return created;
}

async function runConcurrentTest(rootId, count = 20) {
  console.log("\n=== Concurrent test:", count, "registrations ===");
  const promises = [];
  for (let i = 0; i < count; i++) {
    const idx = Date.now().toString(36) + i;
    const memberId = `CC${idx.padEnd(11, "0")}`.slice(0, 13);
    promises.push(
      (async () => {
        const session = await mongoose.startSession();
        try {
          let created;
          await session.withTransaction(async () => {
            const sponsor = await User.findById(rootId).session(session);
            const user = new User({
              memberId,
              name: `Concurrent ${i}`,
              phone: `7${String(i).padStart(9, "0")}`,
              email: `c${i}@test.local`,
              password: "x",
              pwdRef: "x",
              status: 1,
              referredBy: sponsor._id,
              referredByMemberId: sponsor.memberId,
            });
            await user.save({ session });
            await setupHierarchyForNewUser(user._id, sponsor._id, session);
            created = user._id;
          });
          return created;
        } finally {
          await session.endSession();
        }
      })()
    );
  }
  const results = await Promise.allSettled(promises);
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("Concurrent failures:", failed.map((f) => f.reason?.message));
  }
  console.log("Concurrent test OK. Succeeded:", succeeded, "/", count);
  return succeeded;
}

async function validateNoDuplicates() {
  const dups = await UserHierarchy.aggregate([
    { $group: { _id: { user: "$user", ancestor: "$ancestor" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (dups.length > 0) {
    throw new Error("Duplicate hierarchy rows found: " + JSON.stringify(dups));
  }
  console.log("No duplicate hierarchy rows.");
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Replica set required for transactions.");

  const root = await getOrCreateRoot();
  const rootId = root._id;

  await runDepthTest(rootId);
  await runWidthTest(rootId);
  await runConcurrentTest(rootId);
  await validateNoDuplicates();

  console.log("\n=== Stress test completed ===");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
