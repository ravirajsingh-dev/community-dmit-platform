/**
 * Bulk-approve eligible designations based on current eligibility rules.
 *
 * IMPORTANT:
 * - Requires env vars (PASSWORD_ENCRYPTION_KEY, JWT secrets, etc.) because models load server config.
 * - Recommended flow:
 *   1) Backfill `user_designations` from embedded `User.designations`:
 *        node server/scripts/migrateDesignationsToCollection.js
 *   2) Dry run:
 *        DRY_RUN=1 node server/scripts/achieveEligibleDesignations.js
 *   3) Apply:
 *        node server/scripts/achieveEligibleDesignations.js
 *
 * Dry run validates eligibility and simulates actions without writing.
 *
 * Params (env):
 * - DRY_RUN=1
 * - DESIGNATION_CODES="1,2,3" (optional; defaults to active WalletSettings.designations)
 * - USER_STATUS_ACTIVE_ONLY=1 (default: 1)
 * - SET_ONLINE_ON_APPROVAL=1 (default: 0) - only for newly approved designs
 * - VERIFY_SAMPLE=5 (default: 5) - verify eligibility for newly-approved sample users
 */

try {
  // Optional: some environments don't have dotenv installed, but .env is usually sourced externally.
  require("dotenv").config();
} catch {
  /* dotenv optional */
}

const mongoose = require("mongoose");

const Admin = require("../models/Admin");
const User = require("../models/User");
const UserDesignation = require("../models/UserDesignation");
const WalletSettings = require("../models/WalletSettings");

const {
  getCurrentMonthBounds,
  evaluateEligibility,
  getMonthlyDirectCount,
  getRequiredDesignationHolderCount,
} = require("../services/designationEligibilityService");

const {
  applyForDesignation,
  transitionDesignationStatus,
} = require("../services/designationService");

function parseCsvInts(s) {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n));
}

function getOrderForDesignationCodes(configs) {
  // Topological order by requiredDesignationCode (if configured).
  // Fallback: ascending designationCode.
  const codes = configs.map((c) => c.designationCode);
  const indeg = new Map();
  const adj = new Map();
  for (const code of codes) {
    indeg.set(code, 0);
    adj.set(code, []);
  }

  for (const c of configs) {
    const req = c.requiredDesignationCode;
    if (req != null && codes.includes(req)) {
      adj.get(req).push(c.designationCode);
      indeg.set(c.designationCode, (indeg.get(c.designationCode) || 0) + 1);
    }
  }

  const queue = [];
  for (const code of codes) {
    if ((indeg.get(code) || 0) === 0) queue.push(code);
  }
  queue.sort((a, b) => a - b);

  const result = [];
  while (queue.length > 0) {
    const n = queue.shift();
    result.push(n);
    for (const m of adj.get(n) || []) {
      indeg.set(m, indeg.get(m) - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }

  if (result.length !== codes.length) {
    // Cycle/missing config: safe fallback
    return [...codes].sort((a, b) => a - b);
  }
  return result;
}

async function main() {
  const DRY_RUN = String(process.env.DRY_RUN || "0") === "1";
  const SET_ONLINE_ON_APPROVAL =
    String(process.env.SET_ONLINE_ON_APPROVAL || "0") === "1";
  const VERIFY_SAMPLE = parseInt(process.env.VERIFY_SAMPLE || "5", 10);
  const USER_STATUS_ACTIVE_ONLY =
    String(process.env.USER_STATUS_ACTIVE_ONLY || "1") === "1";

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI env var");
  }

  const mongoUri = process.env.MONGO_URI;

  await mongoose.connect(mongoUri);

  const admin = await Admin.findOne({ status: 1 }).select("_id").lean();
  if (!admin) {
    throw new Error("No active admin found in `admins` collection");
  }

  const settings = await WalletSettings.getOrCreateSettings();
  const activeDesignations = (settings.designations || []).filter(
    (d) => d.isActive !== false,
  );

  if (activeDesignations.length === 0) {
    throw new Error("No active designations found in WalletSettings.designations");
  }

  const filterCodes = parseCsvInts(process.env.DESIGNATION_CODES);
  const configs = (filterCodes.length > 0
    ? activeDesignations.filter((d) => filterCodes.includes(d.designationCode))
    : activeDesignations
  ).filter(Boolean);

  const order = getOrderForDesignationCodes(configs);
  const monthBounds = getCurrentMonthBounds();

  const userQuery = {
    ...(USER_STATUS_ACTIVE_ONLY ? { status: 1 } : {}),
    isSystemRoot: { $ne: true },
  };

  const users = await User.find(userQuery).select("_id directCount totalDownlineCount").lean();
  console.log(
    `[achieveEligibleDesignations] users=${users.length} designations=${order.join(",")} DRY_RUN=${DRY_RUN}`,
  );

  // Pre-fetch approved set so we can measure newly-approved.
  const userIds = users.map((u) => u._id);
  const preApproved = new Set();
  if (userIds.length > 0) {
    const pre = await UserDesignation.find({
      userId: { $in: userIds },
      designationCode: { $in: order },
      status: "APPROVED",
    })
      .select("userId designationCode")
      .lean();
    for (const d of pre) {
      preApproved.add(`${d.userId.toString()}|${d.designationCode}`);
    }
  }

  const stats = {
    attemptedApply: 0,
    approved: 0,
    alreadyApproved: 0,
    skippedNotEligible: 0,
    failures: 0,
    newlyApproved: 0,
  };

  // Helper to check eligibility without writing.
  const checkEligible = async (user, cfg) => {
    const monthlyDirectCount = await getMonthlyDirectCount(user._id, monthBounds);
    let currentRequiredDesignationCount = undefined;
    if (cfg.requiredDesignationCode != null && (cfg.requiredDesignationCount ?? 0) > 0) {
      currentRequiredDesignationCount = await getRequiredDesignationHolderCount(
        user._id,
        cfg.requiredDesignationCode,
      );
    }
    const { eligible } = evaluateEligibility(
      cfg,
      user,
      monthBounds,
      monthlyDirectCount,
      currentRequiredDesignationCount,
    );
    return eligible;
  };

  for (const designationCode of order) {
    const cfg = configs.find((c) => c.designationCode === designationCode);
    if (!cfg) continue;

    console.log(`[achieveEligibleDesignations] designationCode=${designationCode} (${cfg.name})`);

    for (const user of users) {
      const key = `${user._id.toString()}|${designationCode}`;

      const existing = await UserDesignation.findOne({
        userId: user._id,
        designationCode,
      })
        .select("status")
        .lean();

      if (existing?.status === "APPROVED") {
        stats.alreadyApproved += 1;
        continue;
      }

      // DRY_RUN: simulate by evaluating eligibility only.
      if (DRY_RUN) {
        const eligible = await checkEligible(user, cfg);
        if (!eligible) {
          stats.skippedNotEligible += 1;
          continue;
        }
        // eligible but not yet approved
        stats.attemptedApply += 1;
        continue;
      }

      // APPLY mode: state-machine safe calls.
      try {
        // If pending, directly approve; else apply then approve.
        if (existing?.status === "PENDING") {
          const approved = await transitionDesignationStatus(
            user._id,
            designationCode,
            "APPROVED",
            "Auto-approved (bulk eligible achiever)",
            admin._id,
          );
          if (approved.success) {
            stats.approved += 1;
            if (!preApproved.has(key)) {
              stats.newlyApproved += 1;
            }
            if (SET_ONLINE_ON_APPROVAL) {
              await UserDesignation.updateOne(
                { userId: user._id, designationCode, status: "APPROVED" },
                { $set: { online: true } },
              );
            }
          } else {
            stats.skippedNotEligible += 1;
          }
          continue;
        }

        stats.attemptedApply += 1;
        const applied = await applyForDesignation(user._id, designationCode);
        if (!applied.success) {
          stats.skippedNotEligible += 1;
          continue;
        }

        const approved = await transitionDesignationStatus(
          user._id,
          designationCode,
          "APPROVED",
          "Auto-approved (bulk eligible achiever)",
          admin._id,
        );
        if (approved.success) {
          stats.approved += 1;
          if (!preApproved.has(key)) {
            stats.newlyApproved += 1;
          }
          if (SET_ONLINE_ON_APPROVAL) {
            await UserDesignation.updateOne(
              { userId: user._id, designationCode, status: "APPROVED" },
              { $set: { online: true } },
            );
          }
        } else {
          stats.skippedNotEligible += 1;
        }
      } catch (e) {
        stats.failures += 1;
        console.error(
          `  [fail] user=${user._id} code=${designationCode} err=${e?.message || e}`,
        );
      }
    }
  }

  console.log("[achieveEligibleDesignations] done:", stats);

  if (!DRY_RUN && VERIFY_SAMPLE > 0 && stats.newlyApproved > 0) {
    // Sample-verify: check that newly approved users are eligible by recomputing eligibility.
    // We do this by pulling a random sample of APPROVED docs with status APPROVED and re-checking.
    const newly = await UserDesignation.find({
      userId: { $in: userIds },
      designationCode: { $in: order },
      status: "APPROVED",
    })
      .select("userId designationCode appliedAt")
      .lean();

    // Deterministic sample: newest by approvedAt/appliedAt isn't always available across status changes,
    // so just take first N after sort.
    newly.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
    const sample = newly.slice(0, VERIFY_SAMPLE);

    let ok = 0;
    for (const item of sample) {
      const u = users.find((x) => x._id.toString() === item.userId.toString());
      const cfg = configs.find((c) => c.designationCode === item.designationCode);
      if (!u || !cfg) continue;
      const eligible = await checkEligible(u, cfg);
      if (eligible) ok += 1;
      else {
        console.warn(
          `[verify-fail] user=${item.userId} code=${item.designationCode} expected eligible but got ineligible`,
        );
      }
    }
    console.log(`[achieveEligibleDesignations] verify sample ok=${ok}/${VERIFY_SAMPLE}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("[achieveEligibleDesignations] fatal:", e);
  process.exit(1);
});

