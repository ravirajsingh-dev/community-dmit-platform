/**
 * Migration: Rename legacy collections to SBI PRO
 * Run once when upgrading to SBI PRO naming.
 *
 * Usage: node server/scripts/migrateSbiProCollections.js
 * Requires: MONGO_URI in env
 *
 * Copies:
 *   dmit_sessions -> sbi_pro_sessions
 *   dmit_finger_analyses -> sbi_pro_finger_analyses
 *
 * Does NOT drop source collections (safe rollback).
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  try {
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    if (names.includes("dmit_sessions")) {
      if (names.includes("sbi_pro_sessions")) {
        console.log("[Migrate] sbi_pro_sessions already exists, skipping dmit_sessions copy");
      } else {
        await db.collection("dmit_sessions").aggregate([{ $out: "sbi_pro_sessions" }]).toArray();
        console.log("[Migrate] Copied dmit_sessions -> sbi_pro_sessions");
      }
    } else {
      console.log("[Migrate] dmit_sessions not found (fresh install?), nothing to migrate");
    }

    if (names.includes("dmit_finger_analyses")) {
      if (names.includes("sbi_pro_finger_analyses")) {
        console.log("[Migrate] sbi_pro_finger_analyses already exists, skipping");
      } else {
        await db.collection("dmit_finger_analyses").aggregate([{ $out: "sbi_pro_finger_analyses" }]).toArray();
        console.log("[Migrate] Copied dmit_finger_analyses -> sbi_pro_finger_analyses");
      }
    } else {
      console.log("[Migrate] dmit_finger_analyses not found, nothing to migrate");
    }

    console.log("[Migrate] Done. Old collections (dmit_*) kept for rollback. Delete manually if desired.");
  } catch (err) {
    console.error("[Migrate] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
