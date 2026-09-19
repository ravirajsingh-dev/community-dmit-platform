/**
 * Migration Script: Adjacency List → Closure Table
 *
 * Migrates existing users (referredBy chain) to user_hierarchy collection.
 * 1. For each user: traverse referredBy chain, insert closure rows
 * 2. Calculate directCount per user
 * 3. Calculate totalDownlineCount via aggregation
 * 4. Verify integrity
 *
 * Usage: BATCH_SIZE=500 node scripts/migrateClosureTable.js
 * Requires: MONGO_URI in env
 *
 * Safe to run multiple times (idempotent for hierarchy; counts recalculated).
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const { ROOT_MEMBER_ID } = require("../constants/system");

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 500;

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const rootUser = await User.findOne({ memberId: ROOT_MEMBER_ID }).lean();
  if (!rootUser) {
    throw new Error("Root user not found. Ensure ROOT_MEMBER_ID exists.");
  }

  const totalUsers = await User.countDocuments({});
  console.log(`Total users: ${totalUsers}`);

  let processed = 0;
  let skip = 0;
  const seenUserIds = new Set();

  while (skip < totalUsers) {
    const users = await User.find({})
      .select("_id referredBy memberId")
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    for (const user of users) {
      if (user.memberId === ROOT_MEMBER_ID) continue;
      if (!user.referredBy) continue;

      const sponsorId = user.referredBy;
      const chain = [];

      let currentId = sponsorId;
      let level = 1;
      while (currentId) {
        chain.push({ ancestor: currentId, level });
        const parent = await User.findById(currentId)
          .select("referredBy")
          .lean();
        if (!parent || !parent.referredBy) break;
        currentId = parent.referredBy;
        level++;
      }

      const toInsert = chain.map((c) => ({
        user: user._id,
        ancestor: c.ancestor,
        level: c.level,
      }));

      if (toInsert.length > 0) {
        const ops = toInsert.map((row) => ({
          updateOne: {
            filter: { user: row.user, ancestor: row.ancestor },
            update: { $setOnInsert: { user: row.user, ancestor: row.ancestor, level: row.level } },
            upsert: true,
          },
        }));
        await UserHierarchy.bulkWrite(ops, { ordered: false });
      }
      processed++;
    }

    skip += BATCH_SIZE;
    console.log(`Processed ${processed}/${totalUsers} users`);
  }

  console.log("Calculating directCount...");
  const directCountResult = await User.aggregate([
    { $match: { referredBy: { $exists: true, $ne: null } } },
    { $group: { _id: "$referredBy", count: { $sum: 1 } } },
  ]);

  for (const item of directCountResult) {
    await User.updateOne(
      { _id: item._id },
      { $set: { directCount: item.count } }
    );
  }
  await User.updateMany(
    { _id: { $nin: directCountResult.map((r) => r._id) } },
    { $set: { directCount: 0 } }
  );

  console.log("Calculating totalDownlineCount...");
  const totalDownlineResult = await UserHierarchy.aggregate([
    { $group: { _id: "$ancestor", count: { $sum: 1 } } },
  ]);

  for (const item of totalDownlineResult) {
    await User.updateOne(
      { _id: item._id },
      { $set: { totalDownlineCount: item.count } }
    );
  }
  await User.updateMany(
    { _id: { $nin: totalDownlineResult.map((r) => r._id) } },
    { $set: { totalDownlineCount: 0 } }
  );

  console.log("Verification...");
  const sample = await User.findOne({
    referredBy: { $exists: true, $ne: null },
  })
    .select("_id directCount totalDownlineCount")
    .lean();

  if (sample) {
    const actualDirect = await User.countDocuments({ referredBy: sample._id });
    const actualTotal = await UserHierarchy.countDocuments({
      ancestor: sample._id,
    });
    const u = await User.findById(sample._id)
      .select("directCount totalDownlineCount")
      .lean();
    console.log(
      `Sample user ${sample._id}: directCount ${u.directCount} (actual ${actualDirect}), totalDownlineCount ${u.totalDownlineCount} (actual ${actualTotal})`
    );
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
