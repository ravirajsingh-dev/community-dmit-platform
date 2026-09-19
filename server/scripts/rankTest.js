/**
 * Rank System Integration Test
 *
 * Uses REAL flow: create users, hierarchy, designation apply/approve,
 * wallet credit, maybeTriggerWalletActivation. Verifies rank achievement
 * and RANK_INCOME commission.
 *
 * Admin wallet settings (use as-is, do not modify):
 *   Rank 1 (EXPERT):  selfSale 1, teamSize 1, requiredDesignations 1-TRAINER(1), monthlyTarget 1
 *   Rank 2 (PROFESSIONAL): teamSize 5, requiredRankCode 1, monthlyTarget 1
 *
 * Run: node server/scripts/rankTest.js
 * Or:  MONGO_URI=mongodb://... node server/scripts/rankTest.js
 */

(function loadEnv() {
  const path = require("path");
  const fs = require("fs");
  const envPath = path.resolve(__dirname, "../../.env");
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* ignore */
  }
})();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const Wallet = require("../models/Wallet");
const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const { ROOT_MEMBER_ID } = require("../constants/system");
const { setupHierarchyForNewUser } = require("../services/teamRegistrationService");
const { applyForDesignation, processDesignationDecision } = require("../services/designationService");
const { maybeTriggerWalletActivation } = require("../services/levelCommissionService");
const { runMonthlyRankCommission } = require("../services/rankCommissionService");
const { creditMainWallet, getOrCreateWallet } = require("../services/walletService");
const { runWithTransactionRetry } = require("../utils/transactionRetry");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/godjee";
const BASE_PHONE = 9870000000 + (Date.now() % 10000000);

/** Generate unique 13-char memberId: XXXXXXXX-XX */
function nextMemberId(seq) {
  const ph = String(BASE_PHONE + seq).slice(-10);
  const s = String(seq % 100).padStart(2, "0");
  return `${ph}-${s}`;
}

function log(msg) {
  console.log(`[RankTest] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Create user with hierarchy under sponsor */
async function createUserUnderSponsor(sponsorId, data) {
  return runWithTransactionRetry(async (session) => {
    const user = new User(data);
    await user.save({ session });
    await setupHierarchyForNewUser(user._id, sponsorId, session);
    return user;
  });
}

/** Credit MAIN wallet for activation */
async function creditUserForActivation(userId, amount) {
  const reqId = crypto.randomUUID();
  await getOrCreateWallet(userId);
  await creditMainWallet(userId, amount, {
    type: "ADMIN_CR",
    requestId: reqId,
    description: "Rank test - activation balance",
  });
}

/** Ensure designation 1 (TRAINER) exists with minimal reqs for testing */
async function ensureDesignation1(settings) {
  const designations = settings.designations || [];
  const des1 = designations.find((d) => d.designationCode === 1);
  if (!des1) {
    log("WARN: Designation 1 (TRAINER) not found. Rank 1 requires 1-TRAINER(1) in downline.");
    return false;
  }
  return true;
}

async function run() {
  log("Connecting...");
  await mongoose.connect(MONGO_URI);

  const root = await User.findOne({ memberId: ROOT_MEMBER_ID }).lean();
  if (!root) {
    log("ERROR: Root user not found. Run seeds/createRootUser.js first.");
    process.exit(1);
  }
  const rootId = root._id;

  const settings = await WalletSettings.getOrCreateSettings();
  const regFee = Number(settings?.registrationFee) || 100;
  const ranks = settings?.ranks || [];
  if (ranks.length < 2) {
    log("ERROR: Need at least 2 ranks in WalletSettings. Admin should configure Rank 1 and Rank 2.");
    process.exit(1);
  }

  const hasDes1 = await ensureDesignation1(settings);
  if (!hasDes1) {
    log("Proceeding but Rank 1 may fail requiredDesignations check.");
  }

  log(`registrationFee: ${regFee}, ranks: ${ranks.map((r) => r.name).join(", ")}`);

  const created = { users: [], memberIds: [] };

  try {
    // --- Phase 1: Create 2 Rank 1 achievers (A1, A2) with direct TRAINER downline ---
    log("Phase 1: Creating Rank 1 candidates (A1, A2)...");
    let seq = 0;
    const mid = (n) => nextMemberId(seq++);
    const ph = (n) => String(BASE_PHONE + n).slice(-10);

    const a1 = await createUserUnderSponsor(rootId, {
      memberId: mid(),
      name: "RankTest A1",
      phone: ph(1),
      email: `a1_${BASE_PHONE}_1@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: rootId,
      referredByMemberId: ROOT_MEMBER_ID,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(a1);
    await creditUserForActivation(a1._id, regFee + 10);
    await maybeTriggerWalletActivation(a1._id);
    await sleep(500);

    // B1 under A1 - B1 needs 5 directs for TRAINER designation. Create C1..C5 under B1.
    const b1 = await createUserUnderSponsor(a1._id, {
      memberId: mid(),
      name: "RankTest B1",
      phone: ph(2),
      email: `b1_${BASE_PHONE}_2@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: a1._id,
      referredByMemberId: a1.memberId,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(b1);

    for (let i = 1; i <= 5; i++) {
      const ci = await createUserUnderSponsor(b1._id, {
        memberId: mid(),
        name: `RankTest C1_${i}`,
        phone: ph(2 + i),
        email: `c1_${i}_${BASE_PHONE}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: b1._id,
        referredByMemberId: b1.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(ci);
      await creditUserForActivation(ci._id, regFee + 10);
      await maybeTriggerWalletActivation(ci._id);
      await sleep(300);
    }
    await sleep(1500);

    const a2 = await createUserUnderSponsor(rootId, {
      memberId: mid(),
      name: "RankTest A2",
      phone: ph(8),
      email: `a2_${BASE_PHONE}_3@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: rootId,
      referredByMemberId: ROOT_MEMBER_ID,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(a2);
    await creditUserForActivation(a2._id, regFee + 10);
    await maybeTriggerWalletActivation(a2._id);
    await sleep(500);

    const b2 = await createUserUnderSponsor(a2._id, {
      memberId: mid(),
      name: "RankTest B2",
      phone: ph(9),
      email: `b2_${BASE_PHONE}_4@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: a2._id,
      referredByMemberId: a2.memberId,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(b2);

    for (let i = 1; i <= 5; i++) {
      const ci = await createUserUnderSponsor(b2._id, {
        memberId: mid(),
        name: `RankTest C2_${i}`,
        phone: ph(9 + i),
        email: `c2_${i}_${BASE_PHONE}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: b2._id,
        referredByMemberId: b2.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(ci);
      await creditUserForActivation(ci._id, regFee + 10);
      await maybeTriggerWalletActivation(ci._id);
      await sleep(300);
    }
    await sleep(1500);

    log("B1, B2 apply for designation 1 (TRAINER) - now have 5 directs...");
    const adminOid = rootId;
    const apply1 = await applyForDesignation(b1._id, 1);
    const apply2 = await applyForDesignation(b2._id, 1);
    if (!apply1.success) log(`B1 apply failed: ${apply1.reason}`);
    if (!apply2.success) log(`B2 apply failed: ${apply2.reason}`);

    log("Admin approves B1, B2 designation...");
    if (apply1.success) await processDesignationDecision(b1._id, 1, "approve", "Rank test", adminOid);
    if (apply2.success) await processDesignationDecision(b2._id, 1, "approve", "Rank test", adminOid);

    log("Crediting B1, B2 for activation...");
    await creditUserForActivation(b1._id, regFee + 10);
    await creditUserForActivation(b2._id, regFee + 10);

    log("Activating B1...");
    const act1 = await maybeTriggerWalletActivation(b1._id);
    log(`  B1 activated: ${act1.activated}`);
    await sleep(2500);

    log("Activating B2...");
    const act2 = await maybeTriggerWalletActivation(b2._id);
    log(`  B2 activated: ${act2.activated}`);
    await sleep(2500);

    const a1Fresh = await User.findById(a1._id).select("rankCode directCount totalDownlineCount").lean();
    const a2Fresh = await User.findById(a2._id).select("rankCode directCount totalDownlineCount").lean();

    log(`A1: rankCode=${a1Fresh?.rankCode}, direct=${a1Fresh?.directCount}, downline=${a1Fresh?.totalDownlineCount}`);
    log(`A2: rankCode=${a2Fresh?.rankCode}, direct=${a2Fresh?.directCount}, downline=${a2Fresh?.totalDownlineCount}`);

    const rank1Achieved = (a1Fresh?.rankCode === 1 ? 1 : 0) + (a2Fresh?.rankCode === 1 ? 1 : 0);
    if (rank1Achieved < 2) {
      log(`WARN: Expected 2 Rank 1, got ${rank1Achieved}. Check requiredDesignations (1-TRAINER) in Rank 1 config.`);
    } else {
      log("✓ 2 users achieved Rank 1");
    }

    // --- Phase 2: Create 2 Rank 2 achievers (X, Y) - need Rank 1 + teamSize 5 ---
    log("Phase 2: Creating Rank 2 candidates (X, Y)...");
    const x = await createUserUnderSponsor(rootId, {
      memberId: mid(),
      name: "RankTest X",
      phone: ph(5),
      email: `x_${BASE_PHONE}_5@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: rootId,
      referredByMemberId: ROOT_MEMBER_ID,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(x);
    await creditUserForActivation(x._id, regFee + 10);
    await maybeTriggerWalletActivation(x._id);
    await sleep(500);

    const d1 = await createUserUnderSponsor(x._id, {
      memberId: mid(),
      name: "RankTest D1",
      phone: ph(6),
      email: `d1_${BASE_PHONE}_6@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: x._id,
      referredByMemberId: x.memberId,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(d1);
    for (let i = 1; i <= 5; i++) {
      const di = await createUserUnderSponsor(d1._id, {
        memberId: mid(),
        name: `RankTest D1_${i}`,
        phone: ph(6 + i),
        email: `d1_${i}_${BASE_PHONE}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: d1._id,
        referredByMemberId: d1.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(di);
      await creditUserForActivation(di._id, regFee + 10);
      await maybeTriggerWalletActivation(di._id);
      await sleep(300);
    }
    await sleep(1000);
    const applyD1 = await applyForDesignation(d1._id, 1);
    if (applyD1.success) await processDesignationDecision(d1._id, 1, "approve", "Rank test", adminOid);
    await creditUserForActivation(d1._id, regFee + 10);
    await maybeTriggerWalletActivation(d1._id);
    await sleep(1500);

    for (let i = 2; i <= 5; i++) {
      const di = await createUserUnderSponsor(x._id, {
        memberId: mid(),
        name: `RankTest D${i}`,
        phone: ph(20 + i),
        email: `d${i}_${BASE_PHONE}_${i}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: x._id,
        referredByMemberId: x.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(di);
      await creditUserForActivation(di._id, regFee + 10);
      await maybeTriggerWalletActivation(di._id);
      await sleep(500);
    }
    await sleep(1500);
    // One more activation to trigger Rank 2 upgrade for X (after Rank 1)
    const d6 = await createUserUnderSponsor(x._id, {
      memberId: mid(),
      name: "RankTest D6",
      phone: ph(26),
      email: `d6_${BASE_PHONE}@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: x._id,
      referredByMemberId: x.memberId,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(d6);
    await creditUserForActivation(d6._id, regFee + 10);
    await maybeTriggerWalletActivation(d6._id);
    await sleep(2500);

    const y = await createUserUnderSponsor(rootId, {
      memberId: mid(),
      name: "RankTest Y",
      phone: ph(30),
      email: `y_${BASE_PHONE}_12@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: rootId,
      referredByMemberId: ROOT_MEMBER_ID,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(y);
    await creditUserForActivation(y._id, regFee + 10);
    await maybeTriggerWalletActivation(y._id);
    await sleep(500);

    const e1 = await createUserUnderSponsor(y._id, {
      memberId: mid(),
      name: "RankTest E1",
      phone: ph(31),
      email: `e1_${BASE_PHONE}@test.local`,
      password: await bcrypt.hash("Test@123", 10),
      pwdRef: "Test@123",
      status: 4,
      isPaid: false,
      referredBy: y._id,
      referredByMemberId: y.memberId,
      directCount: 0,
      totalDownlineCount: 0,
    });
    created.users.push(e1);
    for (let i = 1; i <= 5; i++) {
      const fi = await createUserUnderSponsor(e1._id, {
        memberId: mid(),
        name: `RankTest F${i}`,
        phone: ph(31 + i),
        email: `f${i}_${BASE_PHONE}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: e1._id,
        referredByMemberId: e1.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(fi);
      await creditUserForActivation(fi._id, regFee + 10);
      await maybeTriggerWalletActivation(fi._id);
      await sleep(300);
    }
    await sleep(1000);
    const apE1 = await applyForDesignation(e1._id, 1);
    if (apE1.success) await processDesignationDecision(e1._id, 1, "approve", "Rank test", adminOid);
    await creditUserForActivation(e1._id, regFee + 10);
    await maybeTriggerWalletActivation(e1._id);
    await sleep(1500);
    for (let i = 2; i <= 6; i++) {
      const ei = await createUserUnderSponsor(y._id, {
        memberId: mid(),
        name: `RankTest E${i}`,
        phone: ph(37 + i),
        email: `e${i}_${BASE_PHONE}@test.local`,
        password: await bcrypt.hash("Test@123", 10),
        pwdRef: "Test@123",
        status: 4,
        isPaid: false,
        referredBy: y._id,
        referredByMemberId: y.memberId,
        directCount: 0,
        totalDownlineCount: 0,
      });
      created.users.push(ei);
      await creditUserForActivation(ei._id, regFee + 10);
      await maybeTriggerWalletActivation(ei._id);
      await sleep(500);
    }
    await sleep(2500);

    const xFresh = await User.findById(x._id).select("rankCode").lean();
    const yFresh = await User.findById(y._id).select("rankCode").lean();
    log(`X: rankCode=${xFresh?.rankCode}`);
    log(`Y: rankCode=${yFresh?.rankCode}`);
    const rank2Achieved = (xFresh?.rankCode === 2 ? 1 : 0) + (yFresh?.rankCode === 2 ? 1 : 0);
    if (rank2Achieved < 2) {
      log(`WARN: Expected 2 Rank 2, got ${rank2Achieved}. Check requiredRankCode=1, teamSize=5.`);
    } else {
      log("✓ 2 users achieved Rank 2");
    }

    // --- Phase 3: Run monthly rank commission and verify RANK_INCOME ---
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    log(`Phase 3: Running monthly rank commission for ${year}-${month + 1}...`);
    const result = await runMonthlyRankCommission(year, month);
    log(`Distributed: ₹${result.distributed.toFixed(2)}`);
    if (result.breakdown?.length) {
      result.breakdown.forEach((b) => {
        log(`  Rank ${b.rankCode} (${b.rankName}): ${b.userCount} users, ₹${b.perUserAmount} each`);
      });
    }

    const rankIncomeCount = await WalletTransaction.countDocuments({
      type: "RANK_INCOME",
      direction: "CREDIT",
      createdAt: { $gte: new Date(year, month, 1), $lte: new Date(year, month + 1, 0, 23, 59, 59, 999) },
    });
    log(`RANK_INCOME transactions this month: ${rankIncomeCount}`);

    const a1RankIncome = await WalletTransaction.find({
      userId: a1._id,
      type: "RANK_INCOME",
      direction: "CREDIT",
    }).lean();
    const a2RankIncome = await WalletTransaction.find({
      userId: a2._id,
      type: "RANK_INCOME",
      direction: "CREDIT",
    }).lean();

    log(`A1 RANK_INCOME: ${a1RankIncome.length} tx(s), total: ₹${a1RankIncome.reduce((s, t) => s + parseFloat(t.amount || 0), 0).toFixed(2)}`);
    log(`A2 RANK_INCOME: ${a2RankIncome.length} tx(s), total: ₹${a2RankIncome.reduce((s, t) => s + parseFloat(t.amount || 0), 0).toFixed(2)}`);

    const earningOk = result.distributed > 0 || rankIncomeCount > 0;
    if (!earningOk) {
      log("WARN: No RANK_INCOME distributed. Ensure activations exist this month for company profit pool.");
    } else {
      log("✓ Rank commission (RANK_INCOME) credited");
    }

    // --- Summary ---
    log("");
    log("=== RANK TEST SUMMARY ===");
    log(`Rank 1 achieved: ${rank1Achieved}/2 (A1, A2)`);
    log(`Rank 2 achieved: ${rank2Achieved}/2 (X, Y)`);
    log(`Monthly commission distributed: ₹${result.distributed.toFixed(2)}`);
    log(`RANK_INCOME tx count: ${rankIncomeCount}`);
    if (rank1Achieved >= 2 && rank2Achieved >= 2 && earningOk) {
      log("✓ RANK TEST PASSED");
    } else {
      log("⚠ RANK TEST had warnings - check config (requiredDesignations for Rank 1, etc.)");
    }
  } catch (err) {
    console.error("[RankTest] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log("Disconnected.");
    process.exit(0);
  }
}

run();
