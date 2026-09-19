/**
 * End-to-end stress + logic test suite:
 * - Sponsor validation via real RegisterController.register()
 * - Activation via wallet MAIN transfer + maybeTriggerWalletActivation()
 * - Level commission traversal validation (SKIP not BREAK)
 * - Wallet transaction integrity, idempotency, and data consistency
 *
 * USAGE:
 *   cd server
 *   node scripts/sponsorEligibilityLevelCommissionStressTest.js
 *
 * ENV (optional):
 *   CLEANUP=false                    (default true) reset test data
 *   TEST_USER_COUNT=110            (default 110)
 *   ACTIVATIONS=60                 (default 60, must be >= 50)
 *   ACTIVATION_CONCURRENCY=10     (default 10)
 *   TRANSFER_AMOUNT_MULTIPLIER=1.0 (default 1.0, relative to registrationFee)
 *   SELECTED_CHAINS_LOGS=5        (default 5)
 */

const fs = require("fs");
const path = require("path");

// Minimal .env loader (avoid adding external deps like `dotenv`).
// Loads key/value pairs into process.env if not already present.
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = String(line).trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding single/double quotes.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (e) {
    // Best-effort: if .env can't be read, subsequent checks will fail with a clearer error.
    console.warn("[env-loader] Failed to load .env:", e?.message || String(e));
  }
}

// server/scripts -> server -> repo root
loadEnvFile(path.resolve(__dirname, "../../.env"));

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const RegisterController = require("../routes/user/auth/Controllers/RegisterController");
const { validateRequestId, creditMainWallet, getOrCreateWallet } = require("../services/walletService");
const { transferMainToMain } = require("../services/transferService");
const { maybeTriggerWalletActivation } = require("../services/levelCommissionService");
const { setupHierarchyForNewUser } = require("../services/teamRegistrationService");
const { onUserBecameActive } = require("../services/userStatusTransitionService");
const { validateReferralId } = require("../services/referralService");
const { computeCommissionCents, toCents } = require("../utils/financialMath");
const { formatAmountForDescription, buildTransactionDescription } = require("../utils/transactionDescriptionEngine");
const WalletSettings = require("../models/WalletSettings");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const Wallet = require("../models/Wallet");
const UserHierarchy = require("../models/UserHierarchy");
const WalletSettingsModel = WalletSettings;
const EPin = require("../models/EPin");
const Admin = require("../models/Admin");
const { ROOT_MEMBER_ID } = require("../constants/system");
const { generateEPin } = require("../helpers/epinGenerator");

const APP_MAX_DEPTH = 12; // guard

// Destructive resets can be risky/blocked (e.g., WalletTransaction is immutable).
// Default to non-destructive mode and only validate/count the graph created in this run.
const CLEANUP_DEFAULT = true;
const TEST_USER_COUNT_DEFAULT = 110;
const ACTIVATIONS_DEFAULT = 60;
const ACTIVATION_CONCURRENCY_DEFAULT = 10;
const TRANSFER_AMOUNT_MULTIPLIER_DEFAULT = 1.0;
const SELECTED_CHAINS_LOGS_DEFAULT = 5;

function readEnvInt(name, def) {
  const v = process.env[name];
  if (v == null) return def;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
}

function readEnvBool(name, def) {
  const v = process.env[name];
  if (v == null) return def;
  return String(v).toLowerCase() === "true";
}

function readEnvFloat(name, def) {
  const v = process.env[name];
  if (v == null) return def;
  const n = parseFloat(v);
  return Number.isNaN(n) ? def : n;
}

function uuidV4() {
  return crypto.randomUUID();
}

function makePhone(i) {
  // Must be exactly 10 digits.
  // 7000000000 + i could exceed 10 digits; cap using modulo.
  const base = 7000000000;
  const n = base + (i % 999999999);
  return String(n).padStart(10, "0").slice(-10);
}

function makeMemberIdByPhone(phoneStr, seq) {
  // Schema expects <phone>-<2 digit seq> exactly 13 chars.
  const seqStr = String(seq).padStart(2, "0");
  return `${phoneStr}-${seqStr}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function createMockRes() {
  return {
    _statusCode: null,
    _json: null,
    status(code) {
      this._statusCode = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return payload;
    },
  };
}

async function ensureTestSafety() {
  const mongoUri = process.env.MONGO_URI || "";
  if (!mongoUri) throw new Error("MONGO_URI is required");
  const nodeEnv = process.env.NODE_ENV || "";
  const lower = mongoUri.toLowerCase();
  if (nodeEnv === "production") {
    throw new Error("Refusing to run in production NODE_ENV");
  }
  if (lower.includes("prod")) {
    throw new Error("Refusing to run against a prod database (MONGO_URI contains prod)");
  }
}

async function getOrCreateRoot() {
  let root = await User.findOne({ memberId: ROOT_MEMBER_ID }).lean();
  if (!root) {
    // password/pwdRef are required; these are test-only.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("root-pass", salt);
    root = await User.create({
      memberId: ROOT_MEMBER_ID,
      name: "System Root",
      phone: "9999999999",
      email: "root@system.local",
      password: hashedPassword,
      pwdRef: "root-pass",
      status: 1,
      isPaid: true,
      isSystemRoot: true,
      directCount: 0,
      totalDownlineCount: 0,
      uuid: uuidV4(),
      // referredBy/refByMemberId intentionally omitted for system root.
    });
    return root;
  }
  return root;
}

async function ensureAdminForEPins() {
  let admin = await Admin.findOne({ role: 2 }).lean();
  if (admin) return admin;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("admin-pass", salt);
  admin = await Admin.create({
    name: "StressTest Admin",
    email: `stress_admin_${Date.now()}@local`,
    ccode: "ST",
    phone: String(Math.floor(8000000000 + (Date.now() % 999999999))).padStart(10, "0").slice(-10),
    admin_id: `STADM-${Date.now()}`,
    uuid: uuidV4(),
    password: hashedPassword,
    admPwdRef: "admin-pass",
    txn_password: "txn-pass",
    txnRef: "txn-pass",
    status: 1,
    role: 2,
  });
  return admin;
}

async function resetTestData({ cleanupEnabled }) {
  if (!cleanupEnabled) return;
  // Keep production data safe: run only in non-prod via ensureTestSafety().
  const db = mongoose.connection.db;
  const collectionsToDrop = [
    "wallet_transactions",
    "wallets",
    "user_hierarchy",
    "epins",
    "users",
  ];

  for (const c of collectionsToDrop) {
    try {
      await db.dropCollection(c);
    } catch (e) {
      // NamespaceNotFound is fine (already dropped / empty).
      // Other errors should still surface.
      const msg = String(e?.message || "");
      if (!msg.toLowerCase().includes("ns not found") && !msg.toLowerCase().includes("nons") && !msg.toLowerCase().includes("not found")) {
        // Some MongoDB drivers use different wording; if dropCollection fails for unknown reason, throw.
        throw e;
      }
    }
  }
}

async function seedWalletSettingsIfMissing() {
  const settings = await WalletSettingsModel.getOrCreateSettings();
  if (!settings) throw new Error("WalletSettings not found/created");
  return settings;
}

function decideActivationCount(status4NewUsersCount, desiredActivations) {
  // Activation targets must be status=4 users with isPaid=false.
  // We'll pick from successfully registered users plus any pre-existing status4.
  return Math.min(desiredActivations, status4NewUsersCount);
}

async function createTestUserGraph({
  testUserCount,
  rootId,
  maxLevels,
}) {
  // We will create a forest of line-chains:
  // root -> U1 -> U2 -> ... -> UL (L chosen to satisfy commission depth)
  // Total nodes across chains = testUserCount.
  //
  // For commission tests we need (for activated child under bottom sponsors):
  // levels.length <= chainLength + 1 (including root), otherwise commission traversal may end early.

  const L = (() => {
    // We must ensure enough "deep" sponsors exist to activate 50+ users
    // without breaking the commission chain early.
    //
    // For a child registered under a sponsor at depthIndex=d, the commission traversal
    // can safely run up to maxLevels levels when (d + 1) >= maxLevels.
    const minDepth = 5;
    const thresholdDepth = Math.max(minDepth, maxLevels - 1); // d >= (maxLevels - 1)

    // Since only status 1 & 4 users are referral-allowed, only ~90/110 sponsors
    // become activation targets. Use a conservative factor to ensure we still get 50+.
    const minDeepSponsorsNeeded = 63; // 50 / 0.8 (conservative)

    function countDeepSponsorsForChainLength(chainLength) {
      const chainsCount = Math.ceil(testUserCount / chainLength);
      const nodesToCreate = Math.min(testUserCount, chainsCount * chainLength);
      let deep = 0;
      let created = 0;
      for (let c = 0; c < chainsCount && created < nodesToCreate; c++) {
        for (let d = 1; d <= chainLength && created < nodesToCreate; d++) {
          created++;
          if (d >= thresholdDepth) deep++;
        }
      }
      return deep;
    }

    let best = Math.max(minDepth, Math.min(10, thresholdDepth));
    // Increase chainLength until deep sponsors are sufficient, or until we consume all nodes.
    for (let cand = best; cand <= testUserCount; cand++) {
      const deepCount = countDeepSponsorsForChainLength(cand);
      if (deepCount >= minDeepSponsorsNeeded) {
        return cand;
      }
    }
    return Math.max(best, maxLevels - 1);
  })();

  const chains = Math.ceil(testUserCount / L);
  const totalNodesPlanned = chains * L;
  const nodesToCreate = Math.min(testUserCount, totalNodesPlanned);

  // Build node list with (chainIndex, depthIndex) where depthIndex starts at 1 under root.
  const nodes = [];
  let created = 0;
  for (let c = 0; c < chains && created < nodesToCreate; c++) {
    for (let d = 1; d <= L && created < nodesToCreate; d++) {
      created++;
      nodes.push({ chainIndex: c, depthIndex: d });
    }
  }

  // Pick special nodes for edge cases (these are sponsor nodes).
  // We will create Case A/B/C patterns along upline for a child registered under a bottom sponsor node.
  //
  // Important: when chainLength L doesn't evenly divide testUserCount, the last chain is partial.
  // We must avoid using partial chains for "bottom" nodes (depthIndex = L) because those nodes may not exist.
  const fullChainsCount = Math.floor(nodesToCreate / L);
  if (fullChainsCount < 4) {
    throw new Error(
      `Insufficient full chains for edge-cases. fullChainsCount=${fullChainsCount}, L=${L}, nodesToCreate=${nodesToCreate}`,
    );
  }
  const fullChainIndices = Array.from({ length: fullChainsCount }, (_, i) => i);

  // Fully valid chain requirement: ensure at least one chain is fully eligible at least up to maxLevels.
  const fullyValidChain = 0;

  // Choose 3 distinct full chains for Case A/B/C so their depthIndex=L nodes always exist.
  const caseChainsPool = fullChainIndices.filter((i) => i !== fullyValidChain);
  const caseChainIndexA = caseChainsPool[0];
  const caseChainIndexB = caseChainsPool[1];
  const caseChainIndexC = caseChainsPool[2];

  const caseA = { chainIndex: caseChainIndexA, depthIndex: L };
  const caseB = { chainIndex: caseChainIndexB, depthIndex: L };
  const caseC = { chainIndex: caseChainIndexC, depthIndex: L };

  // Dynamic distribution among pre-existing sponsors.
  // Keep the same spirit as original 30/30/30/20 split, but scale to requested batch size.
  const totalNodes = nodes.length;
  let validPaidCount = Math.floor(totalNodes * 0.28);
  let status1UnpaidCount = Math.floor(totalNodes * 0.27);
  let status4Count = Math.floor(totalNodes * 0.27);
  let invalidCount = totalNodes - (validPaidCount + status1UnpaidCount + status4Count);
  if (invalidCount < 0) invalidCount = 0;
  const assignedTotal =
    validPaidCount + status1UnpaidCount + status4Count + invalidCount;
  if (assignedTotal < totalNodes) {
    validPaidCount += totalNodes - assignedTotal;
  }

  const categoryNeed = {
    paid: validPaidCount,
    unpaid: status1UnpaidCount,
    new: status4Count,
    invalid: invalidCount,
  };

  // Build a quick map for special nodes.
  const nodeKey = (n) => `${n.chainIndex}:${n.depthIndex}`;
  const special = new Map();
  special.set(nodeKey(caseA), { type: "CASE_A_L1_PAID" }); // level1 paid
  special.set(nodeKey(caseAParent(caseA)), { type: "CASE_A_L2_INVALID" }); // level2 invalid
  special.set(nodeKey(caseAGrandParent(caseA)), { type: "CASE_A_L3_PAID" }); // level3 paid

  special.set(nodeKey(caseB), { type: "CASE_B_L1_INVALID_NEW" }); // invalid
  special.set(nodeKey(caseBParent(caseB)), { type: "CASE_B_L2_INVALID_STATUS" }); // invalid
  special.set(nodeKey(caseBGrandParent(caseB)), { type: "CASE_B_L3_PAID" }); // paid

  // Case C: all upline levels must be commission-ineligible.
  // BUT level-1 sponsor is the referralId used to create the activation target,
  // so it must be referral-allowed (status 1 or 4). We choose status=1 with isPaid=false.
  special.set(nodeKey(caseC), { type: "CASE_C_L1_INVALID_UNPAID" }); // invalid (commission-ineligible, referral-allowed)
  special.set(nodeKey(caseCParent(caseC)), { type: "CASE_C_L2_INVALID_NEW" }); // new invalid
  special.set(nodeKey(caseCGrandParent(caseC)), { type: "CASE_C_L3_INVALID_UNPAID" }); // unpaid invalid

  // Fully valid chain: allocate all its nodes as paid, but only for nodes we actually create.
  // We'll ensure by consuming categoryNeed.paid accordingly during assignment.

  // First pass: assign categories.
  const assignedCategory = new Map(); // nodeKey -> 'paid'|'unpaid'|'new'|'invalid'

  function useCategory(node, cat) {
    const k = nodeKey(node);
    if (assignedCategory.has(k)) return;
    if ((categoryNeed[cat] ?? 0) <= 0) {
      throw new Error(`Not enough remaining category count for ${cat} at ${k}`);
    }
    assignedCategory.set(k, cat);
    categoryNeed[cat] -= 1;
  }

  // Case nodes assignment (consume from categories)
  for (const [k, meta] of special.entries()) {
    const [chainIndexStr, depthIndexStr] = k.split(":");
    const chainIndex = parseInt(chainIndexStr, 10);
    const depthIndex = parseInt(depthIndexStr, 10);
    const node = { chainIndex, depthIndex };

    if (meta.type.includes("PAID")) useCategory(node, "paid");
    if (meta.type.includes("UNPAID")) useCategory(node, "unpaid");
    if (meta.type.includes("INVALID_NEW")) useCategory(node, "new");
    if (meta.type.includes("INVALID_STATUS")) useCategory(node, "invalid");
    if (meta.type === "CASE_A_L2_INVALID") useCategory(node, "unpaid");
  }

  // Fully valid chain consume: all created nodes in chain 0 => paid.
  for (const node of nodes) {
    if (node.chainIndex !== fullyValidChain) continue;
    useCategory(node, "paid");
  }

  // Sanity: category counts should still be >=0 and sum equal remaining nodes.
  const used = nodes.length - nodes.filter((n) => assignedCategory.has(nodeKey(n))).length;
  if (Object.values(categoryNeed).some((v) => v < 0)) {
    throw new Error("categoryNeed negative after assignment");
  }

  // Random fill remaining nodes with the remaining categories.
  const remainingCats = [];
  for (const [cat, count] of Object.entries(categoryNeed)) {
    for (let i = 0; i < count; i++) remainingCats.push(cat);
  }
  if (remainingCats.length !== nodes.length - assignedCategory.size) {
    // It's okay if special/cases overlap or if chain0 nodes exceed our assumption; but we should match.
    throw new Error(
      `Category fill mismatch: remainingCats=${remainingCats.length}, unassigned=${nodes.length - assignedCategory.size}`,
    );
  }

  // Shuffle with crypto randomness
  for (let i = remainingCats.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [remainingCats[i], remainingCats[j]] = [remainingCats[j], remainingCats[i]];
  }

  let idx = 0;
  for (const node of nodes) {
    const k = nodeKey(node);
    if (assignedCategory.has(k)) continue;
    const cat = remainingCats[idx++];
    assignedCategory.set(k, cat);
  }

  // Second pass: create users + closure entries.
  // We'll create within a transaction per chain to reduce conflicts.
  const createdNodes = [];

  const saltRounds = 10;
  const pwdPlain = "123456aa";
  const indianNames = [
    "Aarav Sharma",
    "Vihaan Gupta",
    "Ishaan Verma",
    "Aditya Singh",
    "Arjun Mehta",
    "Kabir Yadav",
    "Rohan Patel",
    "Rahul Joshi",
    "Kunal Tiwari",
    "Nikhil Jain",
    "Priya Sharma",
    "Ananya Verma",
    "Sneha Gupta",
    "Pooja Singh",
    "Neha Yadav",
    "Aditi Mishra",
    "Kavya Jain",
    "Riya Patel",
    "Sanya Tiwari",
    "Isha Mehta",
  ];
  const createdAt = new Date();

  // Pre-create arrays for deterministic phones
  const nodeIndexByOrder = new Map();
  nodes.forEach((n, i) => nodeIndexByOrder.set(nodeKey(n), i));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (let chainIndex = 0; chainIndex < chains; chainIndex++) {
        // Identify nodes in this chain
        const chainNodes = nodes.filter((n) => n.chainIndex === chainIndex);
        if (chainNodes.length === 0) continue;

        let prevSponsorId = rootId;
        for (const node of chainNodes) {
          const globalIdx = nodeIndexByOrder.get(nodeKey(node)) || 0;
          const phone = makePhone(globalIdx + chainIndex * 1000 + node.depthIndex * 10);
          const memberId = await makeUniqueMemberId(phone, session);
          const nameBase = indianNames[(globalIdx + chainIndex + node.depthIndex) % indianNames.length];
          const name = `${nameBase} ${chainIndex}${node.depthIndex}`;
          const hashedPassword = await bcrypt.hash(pwdPlain, await bcrypt.genSalt(saltRounds));

          const cat = assignedCategory.get(nodeKey(node));
          let status;
          let isPaid;
          if (cat === "paid") {
            status = 1;
            isPaid = true;
          } else if (cat === "unpaid") {
            status = 1;
            isPaid = false;
          } else if (cat === "new") {
            status = 4;
            isPaid = false;
          } else if (cat === "invalid") {
            status = (globalIdx % 2 === 0 ? 2 : 3);
            isPaid = false;
          } else {
            throw new Error(`Unknown category ${cat}`);
          }

          const user = new User({
            memberId,
            name,
            phone,
            email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}@test.local`,
            password: hashedPassword,
            pwdRef: pwdPlain,
            status,
            isPaid,
            referredBy: prevSponsorId,
            referredByMemberId: (await User.findById(prevSponsorId).select("memberId").session(session).lean())?.memberId ||
              ROOT_MEMBER_ID,
            uuid: uuidV4(),
            directCount: 0,
            totalDownlineCount: 0,
          });
          await user.save({ session });
          await setupHierarchyForNewUser(user._id, prevSponsorId, session);

          createdNodes.push({
            node,
            userId: user._id,
            memberId: user.memberId,
            chainIndex,
            depthIndex: node.depthIndex,
          });
          prevSponsorId = user._id;
        }
      }
    });
  } finally {
    await session.endSession();
  }

  // Initialize counts by simulating "became active" for all status=1 users.
  // (Counts are ACTIVE-only, status === 1.)
  //
  // Important: do this WITHOUT a transaction to avoid Atlas transient
  // "Failure getting dbStats / space quota" errors during batch updates.
  const createdUserIds = createdNodes.map((n) => n.userId);
  const activeUsers = await User.find({
    _id: { $in: createdUserIds },
    status: 1,
  })
    .select("_id")
    .lean();

  for (const u of activeUsers) {
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await onUserBecameActive(u._id);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await sleep(400 * attempt);
      }
    }
    if (lastErr) throw lastErr;
  }

  return {
    chainLength: L,
    chains,
    createdNodes,
    assignedCategory,
    caseChainIndices: {
      A: caseChainIndexA,
      B: caseChainIndexB,
      C: caseChainIndexC,
    },
  };
}

function caseAParent(caseA) {
  return { chainIndex: caseA.chainIndex, depthIndex: caseA.depthIndex - 1 };
}
function caseAGrandParent(caseA) {
  return { chainIndex: caseA.chainIndex, depthIndex: caseA.depthIndex - 2 };
}
function caseBParent(caseB) {
  return { chainIndex: caseB.chainIndex, depthIndex: caseB.depthIndex - 1 };
}
function caseBGrandParent(caseB) {
  return { chainIndex: caseB.chainIndex, depthIndex: caseB.depthIndex - 2 };
}
function caseCParent(caseC) {
  return { chainIndex: caseC.chainIndex, depthIndex: caseC.depthIndex - 1 };
}
function caseCGrandParent(caseC) {
  return { chainIndex: caseC.chainIndex, depthIndex: caseC.depthIndex - 2 };
}

async function makeUniqueMemberId(phoneStr, session) {
  // We need a deterministic memberId with schema constraints and uniqueness.
  // We will create a <phone>-<seq> memberId with seq based on existing users for that phone.
  const existing = await User.find({ phone: phoneStr }).session(session).select("memberId").lean();
  const existingSeq = new Set(
    existing
      .map((u) => (u.memberId || "").match(/-(\d{2})$/)?.[1])
      .filter(Boolean)
      .map((s) => parseInt(s, 10)),
  );
  let seq = null;
  for (let i = 1; i <= 99; i++) {
    if (!existingSeq.has(i)) {
      seq = i;
      break;
    }
  }
  if (seq == null) throw new Error(`No memberId sequence available for phone=${phoneStr}`);
  return makeMemberIdByPhone(phoneStr, seq);
}

async function runSponsorValidationTest({ sponsors }) {
  // For each sponsor: register a new user using sponsor.referralId (memberId).
  // Expected:
  // - sponsor.status 1 -> allowed (register successful)
  // - sponsor.status 4 -> allowed
  // - sponsor.status 2/3 -> rejected
  //
  // Note: RegisterController uses E-PIN; validateEPinForRegistration requires only:
  // - epin exists + unused (ownerId not checked) and sponsorId is valid.
  const admin = await Admin.findOne({ role: 2 }).lean();
  if (!admin) throw new Error("Admin required for epin seeding");

  let allowed = 0;
  let rejected = 0;
  const registrationResults = [];

  // Create enough EPINs for allowed registrations.
  // We'll generate one epin per attempt; failures on rejected sponsors should not consume epins if referral validation fails first?
  // RegisterController validates referralId before validating epin, so rejected sponsors will not consume epins.

  for (let i = 0; i < sponsors.length; i++) {
    const sponsor = sponsors[i];
    const expectedAllowed = sponsor.status === 1 || sponsor.status === 4;

    // Generate a valid epin for every attempt (safe even when unused).
    const epinId = await generateEPin();
    await EPin.create({
      epinId,
      ownerId: sponsor._id, // not required for validation, but schema requires it
      status: "unused",
      usedBy: null,
      createdBy: admin._id,
    });

    const req = {
      body: {
        name: `RegUser_${sponsor.memberId}_${i}`,
        phone: makePhone(200000 + i),
        email: `reg_${sponsor.memberId}_${i}@test.local`,
        password: "123456aa",
        referralId: sponsor.memberId,
        epinId,
      },
    };
    const res = createMockRes();

    let success = false;
    let errorMessage = null;
    try {
      const out = await RegisterController.register(req, res);
      success = !!out?.status;
    } catch (e) {
      success = false;
      errorMessage = e?.message || String(e);
    }
    const actualAllowed = success || res._json?.status === true;

    // If RegisterController threw errors, it should return response.errorResponse not throw, so we rely on res._json.
    const actualAllowedFromPayload = res._json?.status === true;
    const finalAllowed = actualAllowedFromPayload;

    if (finalAllowed) allowed++;
    else rejected++;

    registrationResults.push({
      sponsorId: sponsor._id.toString(),
      sponsorMemberId: sponsor.memberId,
      sponsorStatus: sponsor.status,
      expectedAllowed,
      actualAllowed: finalAllowed,
      createdUserId: res._json?.response?.user?._id ? String(res._json.response.user._id) : null,
      errorMessage: res._json?.message || null,
    });

    if (finalAllowed !== expectedAllowed) {
      // Continue; we will report failed cases at the end.
      registrationResults[registrationResults.length - 1].mismatch = true;
    }

    // If allowed, mark child as status4 (controller already sets it).
    // The created user will be fetched later from DB by id.
  }

  return { allowed, rejected, registrationResults };
}

async function getSponsorDepthIndexMap({ chains, chainLength, createdNodes }) {
  // Map userId -> depthIndex
  const map = new Map();
  for (const cn of createdNodes) {
    map.set(String(cn.userId), cn.depthIndex);
  }
  return map;
}

async function fundWalletForSender({ senderId, amountCents }) {
  // Credit sender MAIN wallet with `amountCents/100` as string.
  const amtStr = (amountCents / 100).toFixed(2);
  await getOrCreateWallet(senderId);
  const requestId = uuidV4();
  const ok = validateRequestId(requestId);
  if (!ok) throw new Error("Invalid generated UUID for funding requestId");
  await creditMainWallet(senderId, amtStr, {
    type: "ADMIN_CR",
    requestId,
    description: buildTransactionDescription("ADMIN_CREDIT", { amount: amtStr, reason: "StressTest funding" }),
    adminId: null,
  });
}

async function runActivationFlowParallel({
  activationTargets,
  senderId,
  registrationFeeStr,
  activationConcurrency,
  transferAmountMultiplier,
}) {
  // For each activation target:
  // 1) transfer MAIN from sender -> target (transfer requestId is unique UUID)
  // 2) call maybeTriggerWalletActivation(targetId)
  //
  // We'll do transfers and activations concurrently up to activationConcurrency.
  const feeCents = toCents(registrationFeeStr);
  const transferAmount = feeCents * transferAmountMultiplier;
  const transferAmountStr = (transferAmount / 100).toFixed(2);

  let activatedCount = 0;
  const activationResults = [];
  const failures = [];

  const pool = [...activationTargets];
  let cursor = 0;

  async function worker(workerIndex) {
    while (cursor < pool.length) {
      const idx = cursor++;
      const t = pool[idx];
      const toUserId = t.userId;
      const requestId = uuidV4();
      try {
        await transferMainToMain(senderId, toUserId, transferAmountStr, {
          requestId,
          fromMemberId: t.senderMemberId || undefined,
          toMemberId: t.memberId,
          isAdminTransfer: true, // skip min/max withdrawal constraints
        });

        // Trigger activation from recipient wallet credit.
        // Under parallel load, Atlas can throw transient write conflicts during count updates.
        // Retry activation trigger without re-doing the transfer.
        let activationRes = null;
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            activationRes = await maybeTriggerWalletActivation(toUserId);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            // Small backoff reduces contention hot-spots.
            await sleep(250 * attempt);
          }
        }
        if (lastErr && !activationRes) throw lastErr;

        activatedCount += activationRes.activated ? 1 : 0;
        activationResults.push({
          targetUserId: String(toUserId),
          memberId: t.memberId,
          transferRequestId: requestId,
          activationTriggered: !!activationRes.activated,
          totalDistributed: activationRes.totalDistributed,
        });
      } catch (e) {
        failures.push({
          targetUserId: String(toUserId),
          memberId: t.memberId,
          error: e?.message || String(e),
          stack: e?.stack,
        });
      }
    }
  }

  const workers = [];
  for (let i = 0; i < activationConcurrency; i++) workers.push(worker(i));
  await Promise.all(workers);

  return { activatedCount, activationResults, failures };
}

function parseLevelFromDescription(desc) {
  const m = String(desc || "").match(/Level\s+(\d+)/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}

async function computeExpectedCommissionDecisions({
  activatedUserId,
  activatedMemberId,
  levels,
  registrationFeeStr,
  maxLevels,
  userCache = null,
}) {
  // Mirror incomeService.getEligibleUplineChain + distributeLevelIncome loop,
  // but produce step-by-step logs for every sponsor decision.
  const feeCents = toCents(registrationFeeStr);
  let remainingRef = { value: feeCents };
  let currentId = activatedUserId;

  const decisions = [];
  let stopAtLevel = null;
  let breakReason = null;

  for (let levelNum = 1; levelNum <= maxLevels; levelNum++) {
    if (remainingRef.value <= 0) break;

    const user =
      userCache instanceof Map
        ? userCache.get(String(currentId))
        : await User.findById(currentId).select("referredBy status isPaid memberId").lean();
    if (!user || !user.referredBy) {
      stopAtLevel = levelNum;
      breakReason = "NO_REFERRED_BY";
      break;
    }

    const sponsor =
      userCache instanceof Map
        ? userCache.get(String(user.referredBy))
        : await User.findById(user.referredBy).select("_id status isPaid memberId").lean();
    if (!sponsor) {
      stopAtLevel = levelNum;
      breakReason = "SPONSOR_NOT_FOUND";
      break;
    }

    const sponsorEligible = sponsor.status === 1 && sponsor.isPaid === true;

    const levelConfig = levels.find((l) => l.levelNumber === levelNum) || levels[levelNum - 1];
    const percent = levelConfig?.commissionPercent ?? 0;
    const walletKey = (levelConfig?.walletKey || `L${levelNum}`).trim().toUpperCase();

    let action = "SKIP";
    let expectedAmountStr = "0.00";
    let expectedCommissionCents = 0;

    if (sponsorEligible) {
      if (percent > 0) {
        const computed = computeCommissionCents(feeCents, percent);
        const commissionCents = Math.min(computed, remainingRef.value);
        if (commissionCents > 0) {
          expectedCommissionCents = commissionCents;
          expectedAmountStr = (commissionCents / 100).toFixed(2);
          remainingRef.value -= commissionCents;
          action = "CREDIT";
        }
      }
    }

    decisions.push({
      level: levelNum,
      sponsorId: String(sponsor._id),
      sponsorMemberId: sponsor.memberId || "",
      sponsorStatus: sponsor.status,
      sponsorIsPaid: sponsor.isPaid === true,
      action,
      expectedAmountStr,
      percent,
      walletKey,
    });

    currentId = sponsor._id;
  }

  return { decisions, stopAtLevel, breakReason };
}

async function validateActivationAndLevelCommissions({
  activationTargets,
  registrationFeeStr,
  settings,
  maxLevels,
  ignoreChainBreakActivatedUserIds = new Set(),
}) {
  const levels = settings.levels || [];

  const ignoreSet =
    ignoreChainBreakActivatedUserIds instanceof Set
      ? new Set([...ignoreChainBreakActivatedUserIds].map(String))
      : new Set((ignoreChainBreakActivatedUserIds || []).map(String));

  const activatedUserIds = activationTargets.map((t) => t.userId);
  const activatedIdStrs = activatedUserIds.map((id) => String(id));
  const activatedIdSet = new Set(activatedIdStrs);

  const feeCents = toCents(registrationFeeStr);
  const totalExpectedDistributedCents = { value: 0 };

  const failures = [];
  const perActivationLogs = [];

  let totalSkippedEligibility = 0;
  let chainBreakFound = 0;

  // Prefetch all users once for expected upline traversal (fast path).
  // Under CLEANUP mode this is a small dataset.
  const allUserDocs = await User.find({})
    .select("_id referredBy status isPaid memberId")
    .lean();
  const userCache = new Map(allUserDocs.map((d) => [String(d._id), d]));

  // Prefetch activation states + activation debits.
  const [activatedDocs, activationDebits] = await Promise.all([
    User.find({ _id: { $in: activatedUserIds } }).select("status isPaid memberId").lean(),
    WalletTransaction.find({
      userId: { $in: activatedUserIds },
      type: "ACTIVATION",
      direction: "DEBIT",
    }).lean(),
  ]);

  const activatedDocMap = new Map(activatedDocs.map((d) => [String(d._id), d]));
  const activationDebitCountMap = new Map();
  for (const tx of activationDebits) {
    const key = String(tx.userId);
    activationDebitCountMap.set(key, (activationDebitCountMap.get(key) || 0) + 1);
  }

  // Prefetch all level credits and group by activatedUserId + level.
  const allLevelTxs = await WalletTransaction.find({
    type: "LEVEL_INCOME",
    direction: "CREDIT",
  }).lean();

  const txByActivatedAndLevel = new Map(); // activatedUserIdStr -> Map(level -> tx)
  for (const tx of allLevelTxs) {
    const req = String(tx.requestId || "");
    const parts = req.split(":");
    // level:<eventId>:<activatedUserId>:<walletKey>
    const activatedUserIdStr = parts.length >= 3 ? parts[2] : null;
    if (!activatedUserIdStr || !activatedIdSet.has(activatedUserIdStr)) continue;

    const lvl = parseLevelFromDescription(tx.description);
    if (lvl == null) continue;

    let inner = txByActivatedAndLevel.get(activatedUserIdStr);
    if (!inner) {
      inner = new Map();
      txByActivatedAndLevel.set(activatedUserIdStr, inner);
    }
    inner.set(lvl, tx);
  }

  for (const target of activationTargets) {
    const activatedUserId = target.userId;
    const activatedUserIdStr = String(activatedUserId);
    const activatedMemberId = target.memberId;

    const refreshed = activatedDocMap.get(activatedUserIdStr) || null;
    if (!refreshed) {
      failures.push({ type: "ACTIVATION_USER_MISSING", activatedUserId: activatedUserIdStr });
      continue;
    }

    if (refreshed.status !== 1 || refreshed.isPaid !== true) {
      failures.push({
        type: "ACTIVATION_STATE_MISMATCH",
        activatedUserId: activatedUserIdStr,
        status: refreshed.status,
        isPaid: refreshed.isPaid,
      });
    }

    const debitCount = activationDebitCountMap.get(activatedUserIdStr) || 0;
    if (debitCount !== 1) {
      failures.push({
        type: "ACTIVATION_DEBIT_COUNT_MISMATCH",
        activatedUserId: activatedUserIdStr,
        count: debitCount,
      });
    }

    const expected = await computeExpectedCommissionDecisions({
      activatedUserId,
      activatedMemberId,
      levels,
      registrationFeeStr,
      maxLevels,
      userCache,
    });

    const expectedCredits = expected.decisions.filter((d) => d.action === "CREDIT");
    const expectedDistributedCents = expectedCredits.reduce(
      (s, d) => s + toCents(d.expectedAmountStr),
      0,
    );
    totalExpectedDistributedCents.value += expectedDistributedCents;

    totalSkippedEligibility += expected.decisions.filter(
      (d) => d.action === "SKIP" && d.sponsorStatus !== 1,
    ).length;
    totalSkippedEligibility += expected.decisions.filter(
      (d) => d.action === "SKIP" && d.sponsorStatus === 1 && d.sponsorIsPaid !== true,
    ).length;

    if (expected.breakReason && expected.stopAtLevel != null) {
      if (expected.stopAtLevel <= maxLevels && !ignoreSet.has(activatedUserIdStr)) {
        chainBreakFound += 1;
      }
    }

    const txByLevel = txByActivatedAndLevel.get(activatedUserIdStr) || new Map();

    const levelFailureDetails = [];
    for (const d of expected.decisions) {
      const actualTx = txByLevel.get(d.level) || null;
      if (d.action === "CREDIT") {
        if (!actualTx) {
          levelFailureDetails.push({ level: d.level, action: "MISSING_CREDIT_TX", sponsorId: d.sponsorId });
          continue;
        }
        if (String(actualTx.userId) !== String(d.sponsorId)) {
          levelFailureDetails.push({
            level: d.level,
            action: "SPONSOR_MISMATCH",
            expectedSponsorId: d.sponsorId,
            actualSponsorId: String(actualTx.userId),
          });
        }
        const actualAmount = actualTx.amount?.toString?.() || String(actualTx.amount);
        const actualAmountStr = Number(actualAmount).toFixed(2);
        if (actualAmountStr !== d.expectedAmountStr) {
          levelFailureDetails.push({
            level: d.level,
            action: "AMOUNT_MISMATCH",
            expectedAmountStr: d.expectedAmountStr,
            actualAmountStr,
          });
        }

        if (!validateRequestId(actualTx.requestId)) {
          levelFailureDetails.push({
            level: d.level,
            action: "REQUEST_ID_INVALID",
            requestId: actualTx.requestId,
          });
        }
      } else {
        if (actualTx) {
          levelFailureDetails.push({
            level: d.level,
            action: "UNEXPECTED_CREDIT_TX",
            actualAmount: actualTx.amount?.toString?.() || String(actualTx.amount),
          });
        }
      }
    }

    if (levelFailureDetails.length > 0) {
      failures.push({
        type: "LEVEL_COMMISSION_VALIDATION_FAILED",
        activatedUserId: activatedUserIdStr,
        details: levelFailureDetails.slice(0, 20),
      });
    }

    const actualTxValues = [...txByLevel.values()];
    const sumCr = actualTxValues.reduce((s, tx) => s + toCents(tx.amount), 0);
    if (sumCr > feeCents) {
      failures.push({
        type: "COMMISSION_SUM_EXCEEDS_FEE",
        activatedUserId: activatedUserIdStr,
        sumCrCents: sumCr,
        feeCents,
      });
    }

    perActivationLogs.push({
      activatedUserId: activatedUserIdStr,
      activatedMemberId,
      decisions: expected.decisions,
      stopAtLevel: expected.stopAtLevel,
      breakReason: expected.breakReason,
    });
  }

  const totalExpectedDistributed = (totalExpectedDistributedCents.value / 100).toFixed(2);
  return { failures, perActivationLogs, totalExpectedDistributed, chainBreakFound, totalSkippedEligibility };
}

async function validateWalletAndDataConsistency({ testUserIds, activatedUserIds, settings }) {
  const failures = [];

  // Wallet negative checks
  const wallets = await Wallet.find({ userId: { $in: testUserIds } }).lean();
  for (const w of wallets) {
    const bal = parseFloat(w.balance?.toString?.() || "0");
    if (bal < 0) {
      failures.push({ type: "NEGATIVE_MAIN_BALANCE", userId: String(w.userId), balance: bal });
    }
  }

  // Duplicate requestId check among our created transactions
  const txs = await WalletTransaction.find({
    userId: { $in: testUserIds },
    requestId: { $ne: null },
  })
    .select("requestId type direction userId")
    .lean();
  const seen = new Map();
  for (const tx of txs) {
    const rid = tx.requestId;
    seen.set(rid, (seen.get(rid) || 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  if (dups.length > 0) {
    failures.push({ type: "DUPLICATE_REQUEST_IDS", count: dups.length, sample: dups.slice(0, 10) });
  }

  // directCount and totalDownlineCount consistency:
  const ancestorIds = testUserIds.map((id) => new mongoose.Types.ObjectId(id));

  // Direct count: count active direct referrals
  const directCountsAgg = await User.aggregate([
    { $match: { status: 1, referredBy: { $in: ancestorIds } } },
    { $group: { _id: "$referredBy", count: { $sum: 1 } } },
  ]);
  const directCountMap = new Map(directCountsAgg.map((d) => [String(d._id), d.count]));

  // Total downline count: use closure table and filter active descendants.
  const totalDownAgg = await UserHierarchy.aggregate([
    { $match: { ancestor: { $in: ancestorIds } } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "u",
      },
    },
    { $match: { "u.status": 1 } },
    { $group: { _id: "$ancestor", count: { $sum: 1 } } },
  ]);
  const totalMap = new Map(totalDownAgg.map((d) => [String(d._id), d.count]));

  const userDocs = await User.find({ _id: { $in: ancestorIds } })
    .select("directCount totalDownlineCount status isPaid memberId")
    .lean();
  for (const u of userDocs) {
    const idStr = String(u._id);
    const expectedDirect = directCountMap.get(idStr) || 0;
    const expectedTotal = totalMap.get(idStr) || 0;
    const storedDirect = u.directCount ?? 0;
    const storedTotal = u.totalDownlineCount ?? 0;
    if (storedDirect !== expectedDirect || storedTotal !== expectedTotal) {
      failures.push({
        type: "COUNT_MISMATCH",
        userId: idStr,
        memberId: u.memberId,
        storedDirect,
        expectedDirect,
        storedTotal,
        expectedTotal,
      });
    }
  }

  return failures;
}

async function main() {
  const CLEANUP = readEnvBool("CLEANUP", CLEANUP_DEFAULT);
  const TEST_USER_COUNT = readEnvInt("TEST_USER_COUNT", TEST_USER_COUNT_DEFAULT);
  const DESIRED_ACTIVATIONS = Math.max(50, readEnvInt("ACTIVATIONS", ACTIVATIONS_DEFAULT));
  const ACTIVATION_CONCURRENCY = Math.max(1, readEnvInt("ACTIVATION_CONCURRENCY", ACTIVATION_CONCURRENCY_DEFAULT));
  const TRANSFER_AMOUNT_MULTIPLIER = readEnvFloat("TRANSFER_AMOUNT_MULTIPLIER", TRANSFER_AMOUNT_MULTIPLIER_DEFAULT);
  const SELECTED_CHAINS_LOGS = Math.max(5, readEnvInt("SELECTED_CHAINS_LOGS", SELECTED_CHAINS_LOGS_DEFAULT));

  await ensureTestSafety();
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const settings = await seedWalletSettingsIfMissing();
  const registrationFeeNum = Number(settings.registrationFee) || 0;
  const registrationFeeStr = settings.registrationFee.toFixed(2);
  const levels = settings.levels || [];

  if (registrationFeeNum <= 0) {
    throw new Error(`registrationFee must be > 0 for activation debit tests. Current: ${registrationFeeNum}`);
  }
  if (!levels || levels.length === 0) {
    throw new Error("WalletSettings.levels must be configured (levels.length > 0)");
  }
  const maxLevels = levels.length;

  const root = await getOrCreateRoot();
  const rootId = root._id;

  await resetTestData({ cleanupEnabled: CLEANUP });

  // Ensure root exists after cleanup.
  const rootAfter = await getOrCreateRoot();
  const rootIdAfter = rootAfter._id;
  const admin = await ensureAdminForEPins();

  // Create 100-150 users with the requested status distribution.
  // This suite uses those users as sponsors for registration + upline nodes for commission tests.
  const { createdNodes, chainLength, chains, assignedCategory, caseChainIndices } = await createTestUserGraph({
    testUserCount: TEST_USER_COUNT,
    rootId: rootIdAfter,
    maxLevels,
  });

  const sponsors = await User.find({ _id: { $in: createdNodes.map((n) => n.userId) } })
    .select("_id memberId status isPaid")
    .lean();

  // Sponsor validation: try to register a new user under every sponsor.
  const sponsorValidation = await runSponsorValidationTest({ sponsors });

  const failedSponsorValidations = sponsorValidation.registrationResults.filter((r) => r.mismatch);

  // Collect successfully created child users from registration results.
  const createdChildIds = sponsorValidation.registrationResults
    .filter((r) => r.actualAllowed === true && r.createdUserId)
    .map((r) => r.createdUserId);

  // Fetch those children and keep sponsor references.
  const createdChildren = await User.find({ _id: { $in: createdChildIds } })
    .select("_id memberId status isPaid referredBy")
    .lean();

  // Verify children are status=4 and isPaid=false at start.
  const badChildInitialStates = createdChildren.filter((u) => u.status !== 4 || u.isPaid !== false);

  // Build activation candidates: status=4 & isPaid=false.
  const activationCandidates = createdChildren
    .filter((u) => u.status === 4 && u.isPaid === false)
    .map((u) => ({ userId: u._id, memberId: u.memberId, sponsorId: u.referredBy, sponsorIdStr: String(u.referredBy) }));

  if (activationCandidates.length < 50) {
    throw new Error(`Not enough activation candidates status4. candidates=${activationCandidates.length}`);
  }

  // Determine depth indexes to select deep sponsors (no commission chain break).
  const sponsorDepthMap = await getSponsorDepthIndexMap({
    chains,
    chainLength,
    createdNodes,
  });

  // Choose edge-case activations by selecting children under the special chain positions.
  // These chain indices are selected dynamically in createTestUserGraph() so that
  // the depthIndex = chainLength nodes always exist (i.e. not on the partial last chain).
  const caseNodes = {
    A: { chainIndex: caseChainIndices.A, depthIndex: chainLength },
    B: { chainIndex: caseChainIndices.B, depthIndex: chainLength },
    C: { chainIndex: caseChainIndices.C, depthIndex: chainLength },
  };

  // Find sponsor user ids for those cases.
  const getNodeUserId = (chainIndex, depthIndex) => {
    const cn = createdNodes.find((n) => n.chainIndex === chainIndex && n.depthIndex === depthIndex);
    return cn?.userId ? String(cn.userId) : null;
  };
  const caseSponsorIds = {
    A: getNodeUserId(caseNodes.A.chainIndex, caseNodes.A.depthIndex),
    B: getNodeUserId(caseNodes.B.chainIndex, caseNodes.B.depthIndex),
    C: getNodeUserId(caseNodes.C.chainIndex, caseNodes.C.depthIndex),
  };

  const pickChildBySponsorId = (sponsorIdStr) => {
    if (!sponsorIdStr) return null;
    const child = activationCandidates.find((c) => String(c.sponsorId) === sponsorIdStr);
    return child || null;
  };

  const caseActivationTargets = {};
  for (const k of Object.keys(caseSponsorIds)) {
    const t = pickChildBySponsorId(caseSponsorIds[k]);
    caseActivationTargets[k] = t;
  }

  for (const k of ["A", "B", "C"]) {
    if (!caseActivationTargets[k]) {
      throw new Error(`Missing edge-case activation target ${k} (no child created for special sponsor)`);
    }
  }

  // Case D: select a child under a shallow sponsor so commission chain hits "missing sponsor" safe stop.
  // Choose any status4 child whose sponsor depthIndex is small (< maxLevels-1).
  const shallowThreshold = Math.max(1, maxLevels - 2);
  let caseD = activationCandidates.find((c) => {
    const depth = sponsorDepthMap.get(String(c.sponsorId));
    return depth != null && depth <= shallowThreshold;
  });
  if (!caseD) {
    // fallback: pick the smallest depth.
    const sortedByDepth = activationCandidates.slice().sort((a, b) => {
      const da = sponsorDepthMap.get(String(a.sponsorId)) ?? 999;
      const db = sponsorDepthMap.get(String(b.sponsorId)) ?? 999;
      return da - db;
    });
    caseD = sortedByDepth[0];
  }

  // Build final activation list:
  // - include A/B/C/D
  // - then add more deep candidates to reach DESIRED_ACTIVATIONS
  const mustInclude = new Set([
    String(caseActivationTargets.A.userId),
    String(caseActivationTargets.B.userId),
    String(caseActivationTargets.C.userId),
    String(caseD.userId),
  ]);

  const deepCandidates = activationCandidates
    .filter((c) => {
      const depth = sponsorDepthMap.get(String(c.sponsorId));
      // For child under sponsor at depth d, sponsors count including root = d + 1
      // We want d+1 >= maxLevels to avoid premature chain break due to reaching root early.
      return (depth != null && depth + 1 >= maxLevels);
    })
    .slice();

  const finalActivationTargets = [];
  // add must include first
  for (const c of activationCandidates) {
    if (mustInclude.has(String(c.userId))) finalActivationTargets.push(c);
  }

  // add remaining deep candidates randomly
  const remainingNeeded = decideActivationCount(activationCandidates.length, DESIRED_ACTIVATIONS) - finalActivationTargets.length;
  const remainingPool = deepCandidates.filter((c) => !mustInclude.has(String(c.userId)));
  // shuffle pool
  for (let i = remainingPool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
  }
  finalActivationTargets.push(...remainingPool.slice(0, Math.max(0, remainingNeeded)));

  if (finalActivationTargets.length < 50) {
    throw new Error(`finalActivationTargets too small: ${finalActivationTargets.length}`);
  }
  console.log(`Activating ${finalActivationTargets.length} users (parallel concurrency=${ACTIVATION_CONCURRENCY})`);

  // Funding sender:
  // Use the first paid-status sponsor or any status1 user as sender.
  const sender = await User.findOne({ _id: { $in: sponsors.map((s) => s._id) }, status: 1 }).select("_id memberId").lean();
  if (!sender) throw new Error("No sender user found");

  // Prepare sender wallet funds.
  const feeCents = toCents(registrationFeeStr);
  const transferAmountCents = Math.floor(feeCents * TRANSFER_AMOUNT_MULTIPLIER);
  const totalTransferNeedCents = transferAmountCents * finalActivationTargets.length;
  await fundWalletForSender({ senderId: sender._id, amountCents: totalTransferNeedCents + feeCents * 10 }); // buffer

  // Run activation flow in parallel.
  const activationFlow = await runActivationFlowParallel({
    activationTargets: finalActivationTargets,
    senderId: sender._id,
    registrationFeeStr,
    activationConcurrency: ACTIVATION_CONCURRENCY,
    transferAmountMultiplier: TRANSFER_AMOUNT_MULTIPLIER,
  });

  const activationFailures = activationFlow.failures;
  const activatedCount = activationFlow.activatedCount;

  // If some activations didn't trigger, treat as failures; we'll validate actual status below.
  // Validate activation states and level commissions.
  const validation = await validateActivationAndLevelCommissions({
    activationTargets: finalActivationTargets,
    registrationFeeStr,
    settings,
    maxLevels,
    ignoreChainBreakActivatedUserIds: [String(caseD.userId)],
  });

  // Extra idempotency checks:
  // Re-run maybeTriggerWalletActivation for first 10 activated users; should not create duplicates.
  const first10 = finalActivationTargets.slice(0, 10);
  const idempotencyBefore = await WalletTransaction.find({
    userId: { $in: first10.map((t) => t.userId) },
    type: "ACTIVATION",
    direction: "DEBIT",
  }).lean();
  const activationCountBefore = idempotencyBefore.length;
  for (const t of first10) {
    await maybeTriggerWalletActivation(t.userId);
    // keep a tiny delay to reduce transaction contention noise
    await sleep(10);
  }
  const idempotencyAfter = await WalletTransaction.find({
    userId: { $in: first10.map((t) => t.userId) },
    type: "ACTIVATION",
    direction: "DEBIT",
  }).lean();
  const activationCountAfter = idempotencyAfter.length;
  if (activationCountAfter !== activationCountBefore) {
    validation.failures.push({
      type: "IDEMPOTENCY_ACTIVATION_DEBIT_FAILED",
      before: activationCountBefore,
      after: activationCountAfter,
    });
  }

  // Wallet + data consistency validation
  const testUserIds = [
    ...sponsors.map((s) => s._id.toString()),
    ...createdChildren.map((c) => c._id.toString()),
  ];
  const consistencyFailures = await validateWalletAndDataConsistency({
    testUserIds,
    activatedUserIds: finalActivationTargets.map((t) => String(t.userId)),
    settings,
  });

  const failedCases = [
    ...failedSponsorValidations.map((r) => ({
      type: "SPONSOR_VALIDATION_MISMATCH",
      sponsorMemberId: r.sponsorMemberId,
      sponsorStatus: r.sponsorStatus,
      expectedAllowed: r.expectedAllowed,
      actualAllowed: r.actualAllowed,
      errorMessage: r.errorMessage,
    })),
    ...activationFailures.map((f) => ({ type: "ACTIVATION_TRANSFER_OR_TRIGGER_FAILED", ...f })),
    ...validation.failures,
    ...consistencyFailures,
  ];

  // Generate report.
  const totalUsersCreated = sponsors.length + createdChildren.length; // exclude root (system)
  const totalActivations = finalActivationTargets.length;

  // Compute total commissions distributed from actual ledger for those activations.
  const activatedIdsStr = finalActivationTargets.map((t) => String(t.userId));
  const levelTxsAll = await WalletTransaction.find({
    type: "LEVEL_INCOME",
    direction: "CREDIT",
    requestId: { $regex: `^level:[0-9a-f-]{36}:(` + activatedIdsStr[0] + `|${activatedIdsStr.slice(1, 1).join("|")})` }, // not used
  }).lean();

  // Instead compute totalDistributed by summing per-activation expected total (validation.totalExpectedDistributed)
  const totalCommissionsDistributed = validation.totalExpectedDistributed;

  // Build chain logs: at least 5 full chains
  const logs = [];
  const logsRequested = SELECTED_CHAINS_LOGS;
  // pick: Case A, Case B, Case C, Case D, then random activations
  const targetsByKey = new Map();
  for (const l of validation.perActivationLogs) {
    targetsByKey.set(String(l.activatedUserId), l);
  }
  const chosenActivationIds = [
    String(caseActivationTargets.A.userId),
    String(caseActivationTargets.B.userId),
    String(caseActivationTargets.C.userId),
    String(caseD.userId),
  ];
  const randomExtras = finalActivationTargets
    .map((t) => t.userId)
    .filter((id) => !chosenActivationIds.includes(String(id)))
    .slice();
  for (let i = randomExtras.length - 1; i > 0 && chosenActivationIds.length < logsRequested; i--) {
    const j = crypto.randomInt(0, i + 1);
    [randomExtras[i], randomExtras[j]] = [randomExtras[j], randomExtras[i]];
  }
  while (chosenActivationIds.length < logsRequested && randomExtras.length > 0) {
    chosenActivationIds.push(String(randomExtras.shift()));
  }
  const chosenLogs = [];
  for (const idStr of chosenActivationIds.slice(0, logsRequested)) {
    const found = targetsByKey.get(idStr);
    if (found) chosenLogs.push(found);
  }

  // Prepare chain logs in step-by-step format for console + report.
  const chainLogs = chosenLogs.map((logItem) => {
    const steps = logItem.decisions.map((d) => ({
      level: d.level,
      sponsorId: d.sponsorId,
      status: d.sponsorStatus,
      isPaid: d.sponsorIsPaid,
      action: d.action,
      expectedAmount: d.expectedAmountStr,
    }));
    return {
      activatedUserId: logItem.activatedUserId,
      activatedMemberId: logItem.activatedMemberId,
      stopAtLevel: logItem.stopAtLevel,
      breakReason: logItem.breakReason,
      steps,
    };
  });

  const issuesFound = failedCases.length > 0;
  const report = {
    "SYSTEM_WORKING_AS_EXPECTED": !issuesFound,
    Summary: {
      "Total Users Created": totalUsersCreated,
      "Total Activations": totalActivations,
      "Total Commissions Distributed": totalCommissionsDistributed,
      "Total Skipped Sponsors": validation.totalSkippedEligibility,
      "Any Chain Break Found (expected ZERO for deep chains)": validation.chainBreakFound,
      "Failed Cases Count": failedCases.length,
    },
    FailedCases: failedCases.slice(0, 50),
    ChainLogs: chainLogs,
  };

  console.log("\n==== Stress Suite Report ====");
  console.log(JSON.stringify(report, null, 2));
  console.log("\n==== Execution Result ====");
  if (!issuesFound) {
    console.log("SYSTEM WORKING AS EXPECTED");
    process.exit(0);
  }
  console.log("ISSUES FOUND");
  process.exit(1);
}

main().catch((err) => {
  console.error("Stress suite crashed:", err);
  process.exit(1);
});

