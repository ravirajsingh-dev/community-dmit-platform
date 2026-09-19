/**
 * Migration Script: Embedded -> Separate Collection
 *
 * Backfills `user_designations` from `User.designations[]` embedded docs,
 * and transfers holder availability/rating from `User.designationStats[]`.
 *
 * Semantics preserved:
 * - Keep at most ONE doc per (userId, designationCode)
 * - Pick the "latest" embedded entry per code (appliedAt desc, approvedAt desc, embedded _id desc)
 * - Upsert the selected entry into `user_designations`
 *
 * Usage:
 *   MONGO_URI=... node server/scripts/migrateDesignationsToCollection.js
 *   BATCH_SIZE=5000 node server/scripts/migrateDesignationsToCollection.js
 *   SKIP_INIT=1 node server/scripts/migrateDesignationsToCollection.js  # indexes only
 */

try {
  require("dotenv").config();
} catch {
  // dotenv is optional in some environments
}
const mongoose = require("mongoose");
const UserDesignation = require("../models/UserDesignation");

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "5000", 10);

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  console.log("Syncing user_designations indexes...");
  await UserDesignation.syncIndexes();
  console.log("Indexes synced");

  if (process.env.SKIP_INIT === "1") {
    console.log("SKIP_INIT=1, skipping backfill");
    await mongoose.disconnect();
    return;
  }

  const usersCol = mongoose.connection.collection("users");

  let processedUsers = 0;
  let upserts = 0;
  let lastId = null;

  while (true) {
    const match = lastId ? { _id: { $gt: lastId }, designations: { $exists: true } } : { designations: { $exists: true } };

    const users = await usersCol
      .find(match, { projection: { _id: 1, designations: 1, designationStats: 1 } })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (users.length === 0) break;
    lastId = users[users.length - 1]._id;

    const ops = [];

    for (const u of users) {
      const byCode = new Map();
      const entries = Array.isArray(u.designations) ? u.designations : [];
      const statsEntries = Array.isArray(u.designationStats)
        ? u.designationStats
        : [];
      const statsByCode = new Map(
        statsEntries.map((s) => [Number(s.designationCode), s]),
      );
      if (entries.length === 0) continue;

      // Sort all entries descending so first seen per designationCode is the "latest".
      entries.sort((a, b) => {
        const aApplied = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
        const bApplied = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
        if (bApplied !== aApplied) return bApplied - aApplied;
        const aApproved = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
        const bApproved = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
        if (bApproved !== aApproved) return bApproved - aApproved;
        const aId = a._id ? String(a._id) : "";
        const bId = b._id ? String(b._id) : "";
        return bId.localeCompare(aId);
      });

      for (const entry of entries) {
        if (entry?.designationCode == null) continue;
        if (!byCode.has(entry.designationCode)) {
          byCode.set(entry.designationCode, entry);
        }
      }

      for (const [designationCode, entry] of byCode.entries()) {
        const stat = statsByCode.get(Number(designationCode)) || {};
        const online = stat?.online === true;
        const avgRating = typeof stat?.avgRating === "number" ? stat.avgRating : 0;
        const totalRatings =
          typeof stat?.totalRatings === "number" ? stat.totalRatings : 0;

        ops.push({
          updateOne: {
            filter: { userId: u._id, designationCode },
            update: {
              $set: {
                status: entry.status,
                appliedAt: entry.appliedAt,
                approvedAt: entry.approvedAt ?? null,
                approvedBy: entry.approvedBy ?? null,
                remarks: entry.remarks ?? null,
                online,
                avgRating,
                totalRatings,
              },
              $setOnInsert: {
                userId: u._id,
                designationCode,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) {
      const res = await UserDesignation.bulkWrite(ops, { ordered: false });
      // bulkWrite doesn't always expose exact modified/upserted counts consistently across versions.
      upserts += res?.upsertedCount ?? 0;
    }

    processedUsers += users.length;
    console.log(
      `Processed users: ${processedUsers}, upserts so far: ${upserts}`,
    );

    if (users.length < BATCH_SIZE) break;
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

