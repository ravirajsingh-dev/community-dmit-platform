/**
 * User Status Transition Service - Idempotency & Consistency Tests
 *
 * Run: node server/tests/userStatusTransitionService.test.js
 * (Loads .env from project root; set MONGO_URI for integration tests)
 *
 * Tests:
 * 1. ACTIVE → INACTIVE → INACTIVE: counts decrement once only
 * 2. INACTIVE → ACTIVE → ACTIVE: counts increment once only
 * 3. ACTIVE → BLOCKED → ACTIVE: decrement once, increment once
 * 4. Status unchanged: no DB writes (idempotent early return)
 */

// Load .env from project root (requires dotenv: npm install dotenv, or run with env vars set)
try {
  const path = require("path");
  const envPath = path.resolve(process.cwd(), ".env");
  require("dotenv").config({ path: envPath });
} catch {
  /* dotenv optional */
}

const mongoose = require("mongoose");
const User = require("../models/User");
const UserHierarchy = require("../models/UserHierarchy");
const {
  handleStatusTransition,
  ACTIVE_STATUS,
} = require("../services/userStatusTransitionService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/godjee_test";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runTests() {
  if (!process.env.MONGO_URI) {
    console.log("Skipping integration tests (set MONGO_URI to run, e.g. MONGO_URI=mongodb://localhost:27017/godjee_test)");
    return;
  }

  await mongoose.connect(MONGO_URI);
  const session = await mongoose.startSession();

  try {
    console.log("Running userStatusTransitionService tests...");

    // --- Setup: root -> sponsor -> child ---
    const root = await User.create(
      [
        {
          memberId: "R_TEST_ROOT",
          name: "Root",
          phone: "9900112233",
          email: "root@test.local",
          password: "test123",
          status: 1,
          directCount: 0,
          totalDownlineCount: 0,
          referredBy: null,
          referredByMemberId: null,
        },
      ],
      { session }
    );
    const sponsor = await User.create(
      [
        {
          memberId: "M_TEST_SPONSOR",
          name: "Sponsor",
          phone: "9900112234",
          email: "sponsor@test.local",
          password: "test123",
          status: 1,
          directCount: 0,
          totalDownlineCount: 0,
          referredBy: root[0]._id,
          referredByMemberId: "R_TEST_ROOT",
        },
      ],
      { session }
    );
    const child = await User.create(
      [
        {
          memberId: "M_TEST_CHILD",
          name: "Child",
          phone: "9900112235",
          email: "child@test.local",
          password: "test123",
          status: 4, // New
          directCount: 0,
          totalDownlineCount: 0,
          referredBy: sponsor[0]._id,
          referredByMemberId: "M_TEST_SPONSOR",
        },
      ],
      { session }
    );

    await session.startTransaction();

    // Hierarchy: sponsor under root, child under sponsor
    await UserHierarchy.create(
      [
        { user: sponsor[0]._id, ancestor: root[0]._id, level: 1 },
        { user: child[0]._id, ancestor: sponsor[0]._id, level: 1 },
        { user: child[0]._id, ancestor: root[0]._id, level: 2 },
      ],
      { session }
    );

    await session.commitTransaction();

    const rootId = root[0]._id;
    const sponsorId = sponsor[0]._id;
    const childId = child[0]._id;

    async function getCounts() {
      const r = await User.findById(rootId).select("directCount totalDownlineCount").lean();
      const s = await User.findById(sponsorId).select("directCount totalDownlineCount").lean();
      return {
        root: { direct: r?.directCount ?? 0, total: r?.totalDownlineCount ?? 0 },
        sponsor: { direct: s?.directCount ?? 0, total: s?.totalDownlineCount ?? 0 },
      };
    }

    // --- Test 4: Status unchanged - no DB writes ---
    await handleStatusTransition(childId, 4, 4);
    await handleStatusTransition(childId, 1, 1);
    let counts = await getCounts();
    assert(
      counts.sponsor.direct === 0 && counts.sponsor.total === 0 && counts.root.total === 0,
      `Test 4 failed: unchanged status should not modify counts, got sponsor.direct=${counts.sponsor.direct} sponsor.total=${counts.sponsor.total}`
    );
    console.log("  Test 4 OK: Status unchanged → no count changes");

    // --- Test 2: INACTIVE → ACTIVE → ACTIVE (increment once only) ---
    await handleStatusTransition(childId, 4, 1);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 1 && counts.sponsor.total === 1 && counts.root.total === 1,
      `Test 2a failed: after 4→1 expected sponsor.direct=1, got ${counts.sponsor.direct}`
    );
    // Second transition: ACTIVE → ACTIVE (should do nothing)
    await handleStatusTransition(childId, 1, 1);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 1 && counts.sponsor.total === 1,
      `Test 2b failed: ACTIVE→ACTIVE must not double-increment, expected direct=1 total=1, got direct=${counts.sponsor.direct} total=${counts.sponsor.total}`
    );
    console.log("  Test 2 OK: INACTIVE→ACTIVE→ACTIVE → increment once only");

    // --- Test 1: ACTIVE → INACTIVE → INACTIVE (decrement once only) ---
    await handleStatusTransition(childId, 1, 2);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 0 && counts.sponsor.total === 0,
      `Test 1a failed: after 1→2 expected sponsor.direct=0, got ${counts.sponsor.direct}`
    );
    // Second transition: INACTIVE → INACTIVE (should do nothing)
    await handleStatusTransition(childId, 2, 2);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 0 && counts.sponsor.total === 0,
      `Test 1b failed: INACTIVE→INACTIVE must not double-decrement, expected direct=0, got ${counts.sponsor.direct}`
    );
    console.log("  Test 1 OK: ACTIVE→INACTIVE→INACTIVE → decrement once only");

    // --- Test 3: ACTIVE → BLOCKED → ACTIVE (decrement once, increment once) ---
    await handleStatusTransition(childId, 2, 1);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 1 && counts.sponsor.total === 1,
      `Test 3 setup: expected sponsor.direct=1 after 2→1, got ${counts.sponsor.direct}`
    );
    await handleStatusTransition(childId, 1, 3);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 0 && counts.sponsor.total === 0,
      `Test 3a failed: after 1→3 (BLOCKED) expected direct=0, got ${counts.sponsor.direct}`
    );
    await handleStatusTransition(childId, 3, 1);
    counts = await getCounts();
    assert(
      counts.sponsor.direct === 1 && counts.sponsor.total === 1,
      `Test 3b failed: after 3→1 expected direct=1, got ${counts.sponsor.direct}`
    );
    console.log("  Test 3 OK: ACTIVE→BLOCKED→ACTIVE → decrement once, increment once");

    // Cleanup
    await UserHierarchy.deleteMany({
      user: { $in: [rootId, sponsorId, childId] },
      ancestor: { $in: [rootId, sponsorId, childId] },
    });
    await User.deleteMany({ _id: { $in: [rootId, sponsorId, childId] } });

    console.log("✅ All userStatusTransitionService tests passed");
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
