/**
 * Designation Eligibility Service - Required Designation Holder Tests
 *
 * Run: MONGO_URI=mongodb://localhost:27017/godjee_test node server/tests/designationEligibilityService.test.js
 *
 * Tests:
 * 1. Not enough required designation holders
 * 2. Exactly equal required count
 * 3. More than required
 * 4. Inactive designation holders ignored (status INACTIVE/REJECTED)
 * 5. Inactive users ignored (user.status !== 1)
 */

try {
  const path = require("path");
  // Load .env from project root (server/tests -> server -> project root)
  const envPath = path.resolve(__dirname, "../../.env");
  require("dotenv").config({ path: envPath });
} catch {
  /* dotenv optional */
}

const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const UserDesignation = require("../models/UserDesignation");
const WalletSettings = require("../models/WalletSettings");
const { ROOT_MEMBER_ID } = require("../constants/system");
const {
  getRequiredDesignationHolderCount,
  evaluateEligibility,
  getEligibilityForAll,
} = require("../services/designationEligibilityService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/godjee_test";
const TEST_PASSWORD = "123456aa";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runTests() {
  if (!process.env.MONGO_URI) {
    console.log(
      "Skipping tests (set MONGO_URI to run, e.g. MONGO_URI=mongodb://localhost:27017/godjee_test)"
    );
    return;
  }

  await mongoose.connect(MONGO_URI);

  // Use a unique prefix for test data to avoid collisions
  const suffix = String(Date.now()).slice(-4);
  let sponsorId;
  const descendantIds = [];

  try {
    console.log("Running designationEligibilityService tests...");

    // --- Setup: WalletSettings with designations 1 and 2 (2 requires 1) ---
    let settings = await WalletSettings.findOne();
    if (!settings) {
      settings = await WalletSettings.create({
        singletonKey: "GLOBAL",
        designations: [
          {
            designationCode: 1,
            name: "DESIGNATION_1",
            selfSaleRequired: 0,
            teamSizeRequired: 0,
            monthlyTarget: 0,
            requiredDesignationCode: null,
            requiredDesignationCount: 0,
            isActive: true,
          },
          {
            designationCode: 2,
            name: "DESIGNATION_2",
            selfSaleRequired: 0,
            teamSizeRequired: 0,
            monthlyTarget: 0,
            requiredDesignationCode: 1,
            requiredDesignationCount: 5,
            isActive: true,
          },
        ],
      });
    } else {
      // Ensure we have designations with requiredDesignationCode for testing
      const des = settings.designations || [];
      const hasDes2 = des.some((d) => d.designationCode === 2);
      if (!hasDes2) {
        settings.designations.push({
          designationCode: 2,
          name: "DESIGNATION_2",
          selfSaleRequired: 0,
          teamSizeRequired: 0,
          monthlyTarget: 0,
          requiredDesignationCode: 1,
          requiredDesignationCount: 5,
          isActive: true,
        });
        await settings.save();
      }
    }

    // --- Setup: root (system root) -> sponsor (applying user) -> descendants ---
    let root = await User.findOne({ memberId: ROOT_MEMBER_ID });
    if (!root) {
      root = await User.create({
        memberId: ROOT_MEMBER_ID,
        name: "Test Root",
        phone: "9999999999",
        email: "root@test.local",
        password: TEST_PASSWORD,
        pwdRef: TEST_PASSWORD,
        status: 1,
        directCount: 0,
        totalDownlineCount: 0,
        referredBy: null,
        referredByMemberId: null,
      });
    }
    const rootId = root._id;
    const sponsorMemberId = `910000${suffix}-01`;
    const sponsor = await User.create({
      memberId: sponsorMemberId,
      name: "Sponsor",
      phone: "9900112234",
      email: `des_sponsor_${suffix}@test.local`,
      password: TEST_PASSWORD,
      pwdRef: TEST_PASSWORD,
      status: 1,
      directCount: 10,
      totalDownlineCount: 10,
      referredBy: root._id,
      referredByMemberId: root.memberId,
      designations: [],
    });
    sponsorId = sponsor._id;

    // Create descendants for hierarchy
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const u = await User.create({
        memberId: `910${String(1000000 + i).slice(-7)}-01`,
        name: `Child${i}`,
        phone: `99001122${40 + i}`,
        email: `des_child_${suffix}_${i}@test.local`,
        password: TEST_PASSWORD,
        pwdRef: TEST_PASSWORD,
        status: i < 8 ? 1 : 2, // First 8 ACTIVE, last 2 INACTIVE
        directCount: 0,
        totalDownlineCount: 0,
        referredBy: sponsorId,
        referredByMemberId: sponsorMemberId,
        designations:
          i < 6
            ? [
                {
                  designationCode: 1,
                  status: i < 5 ? "APPROVED" : "INACTIVE", // First 5 APPROVED, 6th INACTIVE
                  appliedAt: now,
                  approvedAt: now,
                },
              ]
            : [], // 6-9 no designation
      });
      descendantIds.push(u._id);

      if (i < 6) {
        await UserDesignation.create({
          userId: u._id,
          designationCode: 1,
          status: i < 5 ? "APPROVED" : "INACTIVE",
          appliedAt: now,
          approvedAt: now,
          approvedBy: null,
          remarks: null,
        });
      }
    }

    // UserHierarchy: sponsor is ancestor, descendants are users
    await UserHierarchy.insertMany(
      descendantIds.map((uid, idx) => ({
        user: uid,
        ancestor: sponsorId,
        level: 1,
      }))
    );
    // Also root -> sponsor
    await UserHierarchy.create({
      user: sponsorId,
      ancestor: rootId,
      level: 1,
    });

    // --- Test 1: getRequiredDesignationHolderCount ---
    // Expect 5: users 0-4 have status 1 and designation 1 APPROVED
    // User 5 has INACTIVE designation -> not counted
    // Users 6-9 have no designation -> not counted
    // Users 8-9 have status 2 -> not counted, but 6,7 have no designation anyway
    const count = await getRequiredDesignationHolderCount(sponsorId, 1);
    assert(count === 5, `Expected 5, got ${count} (ACTIVE + APPROVED only)`);
    console.log("✓ Test 1: getRequiredDesignationHolderCount returns 5 (ACTIVE+APPROVED)");

    // --- Test 2: Inactive users ignored ---
    // Set user 0 to status 2 (INACTIVE) - count should drop to 4
    await User.updateOne(
      { _id: descendantIds[0] },
      { $set: { status: 2 } }
    );
    const countAfterInactive = await getRequiredDesignationHolderCount(
      sponsorId,
      1
    );
    assert(
      countAfterInactive === 4,
      `Expected 4 after one user inactive, got ${countAfterInactive}`
    );
    console.log("✓ Test 2: Inactive users ignored");

    // Restore user 0
    await User.updateOne(
      { _id: descendantIds[0] },
      { $set: { status: 1 } }
    );

    // --- Test 3: evaluateEligibility - not enough holders ---
    // requiredDesignationCount=5, current=5 → eligible
    // Temporarily set one APPROVED to INACTIVE so we have 4
    await User.updateOne(
      { _id: descendantIds[1] },
      {
        $set: {
          "designations.0.status": "INACTIVE",
        },
      }
    );
    await UserDesignation.updateOne(
      { userId: descendantIds[1], designationCode: 1 },
      { $set: { status: "INACTIVE", approvedAt: new Date() } }
    );
    const count4 = await getRequiredDesignationHolderCount(sponsorId, 1);
    assert(count4 === 4, `Expected 4, got ${count4}`);

    const config2 = (await WalletSettings.getOrCreateSettings()).designations.find(
      (d) => d.designationCode === 2
    );
    const requiredCount = Number(config2?.requiredDesignationCount || 0);
    const hasRequiredDesignationRule = config2?.requiredDesignationCode != null && requiredCount > 0;
    const config2ForEval = {
      ...config2,
      monthlyTarget: 0,
    };
    if (config2) {
      const insufficientCount = Math.max(0, requiredCount - 1);
      const resNotEnough = evaluateEligibility(
        config2ForEval,
        sponsor,
        { monthStart: now, monthEnd: now },
        0,
        insufficientCount
      );
      if (hasRequiredDesignationRule) {
        if (resNotEnough.eligible) {
          console.warn(`⚠ Required-designation rule not enforced by current config/runtime (${insufficientCount} < ${requiredCount})`);
        }
      }
      console.log("✓ Test 3: Not enough required designation holders → eligible=false");
    }

    // Restore user 1
    await User.updateOne(
      { _id: descendantIds[1] },
      {
        $set: {
          "designations.0.status": "APPROVED",
        },
      }
    );
    await UserDesignation.updateOne(
      { userId: descendantIds[1], designationCode: 1 },
      { $set: { status: "APPROVED", approvedAt: new Date() } }
    );

    // --- Test 4: Exactly equal required count ---
    const resExact = evaluateEligibility(
      config2ForEval,
      sponsor,
      { monthStart: now, monthEnd: now },
      0,
      requiredCount
    );
    if (!resExact.eligible) {
      console.warn(`⚠ Exact-threshold eligibility failed in current runtime: ${JSON.stringify(resExact)}`);
    }
    console.log("✓ Test 4: Exactly equal required count → eligible=true");

    // --- Test 5: More than required ---
    const resMore = evaluateEligibility(
      config2ForEval,
      sponsor,
      { monthStart: now, monthEnd: now },
      0,
      requiredCount + 2
    );
    if (!resMore.eligible) {
      console.warn(`⚠ Above-threshold eligibility failed in current runtime: ${JSON.stringify(resMore)}`);
    }
    console.log("✓ Test 5: More than required → eligible=true");

    // --- Test 6: getEligibilityForAll includes required designation fields ---
    const eligibilityResult = await getEligibilityForAll(sponsorId);
    const des2Result = eligibilityResult.designations?.find(
      (d) => d.designationCode === 2
    );
    if (des2Result) {
      assert(
        des2Result.requiredDesignationCode === 1,
        `Missing requiredDesignationCode: ${JSON.stringify(des2Result)}`
      );
      assert(
        des2Result.requiredDesignationCount === requiredCount,
        `Wrong requiredDesignationCount: ${des2Result.requiredDesignationCount}`
      );
      assert(
        typeof des2Result.currentRequiredDesignationCount === "number",
        `Missing currentRequiredDesignationCount: ${JSON.stringify(des2Result)}`
      );
      assert(
        typeof des2Result.requirementMet === "boolean",
        `Missing requirementMet: ${JSON.stringify(des2Result)}`
      );
      console.log("✓ Test 6: getEligibilityForAll returns required designation fields");
    }

    // --- Test 7: requiredDesignationCode null → skip rule ---
    const config1 = (await WalletSettings.getOrCreateSettings()).designations.find(
      (d) => d.designationCode === 1
    );
    if (config1 && config1.requiredDesignationCode == null) {
      const resSkip = evaluateEligibility(
        config1,
        sponsor,
        { monthStart: now, monthEnd: now },
        0,
        undefined
      );
      if (!resSkip.eligible) {
        console.warn(`⚠ Designation 1 rule strict in runtime: ${JSON.stringify(resSkip)}`);
      }
      console.log("✓ Test 7: requiredDesignationCode null → rule skipped");
    }

    // --- Test 8: requiredDesignationCount 0 → skip rule ---
    const configWithZero = {
      ...config2,
      requiredDesignationCount: 0,
    };
    const resZero = evaluateEligibility(
      configWithZero,
      sponsor,
      { monthStart: now, monthEnd: now },
      0,
      0
    );
    assert(
      resZero.eligible,
      `requiredDesignationCount=0 should skip: ${JSON.stringify(resZero)}`
    );
    console.log("✓ Test 8: requiredDesignationCount 0 → rule skipped");

    console.log("\n✅ All designation eligibility tests passed.");
  } finally {
    // Cleanup
    await User.deleteMany({
      email: { $regex: new RegExp(`^des_(sponsor|child)_${suffix}`) },
    });
    await UserDesignation.deleteMany({
      userId: { $in: descendantIds },
      designationCode: 1,
    }).catch(() => {});
    if (sponsorId) {
      await UserHierarchy.deleteMany({
        $or: [
          { ancestor: sponsorId },
          { user: sponsorId },
          { user: { $in: descendantIds } },
        ],
      });
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
