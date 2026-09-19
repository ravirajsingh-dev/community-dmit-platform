const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/User");
const UserDesignation = require("../models/UserDesignation");
const Admin = require("../models/Admin");
const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const Appointment = require("../models/Appointment");
const SbiProSession = require("../models/SbiProSession");
const CounsellingSession = require("../models/CounsellingSession");
const SlotDefinition = require("../models/SlotDefinition");

const { ROOT_MEMBER_ID } = require("../constants/system");
const { setupHierarchyForNewUser } = require("../services/teamRegistrationService");
const { onUserBecameActive } = require("../services/userStatusTransitionService");
const { applyForDesignation, transitionDesignationStatus } = require("../services/designationService");
const { checkAndUpgradeRank } = require("../services/rankService");
const { getActiveEligibleUsersForClub } = require("../services/clubEligibilityService");
const { runRankCommissionForPeriod } = require("../services/rankCommissionService");
const { creditMainWallet } = require("../services/walletService");
const { bookAppointment, acceptAppointment } = require("../services/appointmentService");
const { markAnalysisDone } = require("../services/sbiProSessionService");
const { creditTrainerCommission } = require("../services/sbiProCommissionService");
const { counsellorMarkComplete, userConfirmAndClose } = require("../services/counsellingSessionService");

const PASSWORD = "123456aa";

function getMonthBounds() {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
  };
}

function memberIdFromPhone(phone) {
  return `${phone}-01`;
}

function phoneFromIndex(i) {
  return String(7000000000 + i).slice(-10);
}

async function createRoot() {
  let root = await User.findOne({ memberId: ROOT_MEMBER_ID });
  if (root) return root;
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(PASSWORD, salt);
  root = await User.create({
    memberId: ROOT_MEMBER_ID,
    name: "GODJEE ROOT",
    phone: "9999999999",
    email: "admin@example.com",
    password: hashed,
    pwdRef: PASSWORD,
    status: 1,
    isPaid: true,
    isSystemRoot: true,
    referredBy: null,
    referredByMemberId: null,
    uuid: uuidv4(),
  });
  return root;
}

async function createAdmin() {
  let admin = await Admin.findOne({ role: 2 });
  if (admin) return admin;
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(PASSWORD, salt);
  admin = await Admin.create({
    name: "Automation Admin",
    email: `automation_${Date.now()}@local`,
    ccode: "AT",
    phone: "8888888888",
    admin_id: `ADM${String(Date.now()).slice(-12)}`,
    uuid: uuidv4(),
    password: hashed,
    admPwdRef: PASSWORD,
    txn_password: PASSWORD,
    txnRef: PASSWORD,
    status: 1,
    role: 2,
  });
  return admin;
}

async function createActiveUser({ idx, name, sponsor }) {
  const phone = phoneFromIndex(idx);
  const memberId = memberIdFromPhone(phone);
  const existing = await User.findOne({ memberId });
  if (existing) return existing;
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(PASSWORD, salt);
  const user = await User.create({
    memberId,
    name,
    phone,
    email: `${memberId.replace("-", "_")}@test.local`,
    password: hashed,
    pwdRef: PASSWORD,
    status: 1,
    isPaid: true,
    referredBy: sponsor._id,
    referredByMemberId: sponsor.memberId,
    uuid: uuidv4(),
  });
  await setupHierarchyForNewUser(user._id, sponsor._id);
  return user;
}

async function resetDataKeepConfig() {
  const db = mongoose.connection.db;
  const collections = [
    "wallet_transactions",
    "wallets",
    "user_hierarchy",
    "epins",
    "appointments",
    "sbi_pro_sessions",
    "counselling_sessions",
    "users",
    "admins",
    "slotdefinitions",
  ];
  for (const name of collections) {
    try {
      await db.dropCollection(name);
    } catch (e) {
      const msg = String(e.message || "").toLowerCase();
      if (!msg.includes("not found")) throw e;
    }
  }
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  await resetDataKeepConfig();
  console.log("Database reset complete (users/wallets/tx/sessions/appointments)");

  const root = await createRoot();
  const admin = await createAdmin();
  const settings = await WalletSettings.getOrCreateSettings();
  console.log(`Root/Admin ready, registrationFee=${settings.registrationFee}`);

  let idx = 1;
  const leaders = [];
  const topLeaders = [];
  const leaderChildren = new Map();
  const firstChildPerTopLeader = [];

  console.log("Creating 50 leaders...");
  for (let i = 0; i < 50; i++) {
    const leader = await createActiveUser({
      idx: idx++,
      name: `Leader ${i + 1}`,
      sponsor: root,
    });
    leaders.push(leader);
    if (i < 20) topLeaders.push(leader);
    leaderChildren.set(String(leader._id), []);
  }
  console.log(`Leaders created: ${leaders.length}`);

  console.log("Creating downlines for leaders...");
  for (let i = 0; i < leaders.length; i++) {
    const leader = leaders[i];
    const childCount = i < 20 ? 15 : 2;
    for (let c = 0; c < childCount; c++) {
      const child = await createActiveUser({
        idx: idx++,
        name: `Member ${i + 1}-${c + 1}`,
        sponsor: leader,
      });
      leaderChildren.get(String(leader._id)).push(child);
      if (i < 20 && c === 0) firstChildPerTopLeader.push(child);
    }
  }
  console.log(`Downline users created, total users so far: ${idx - 1}`);

  console.log("Creating extra 2-child structure for top leaders' first child...");
  for (let i = 0; i < firstChildPerTopLeader.length; i++) {
    const parent = firstChildPerTopLeader[i];
    for (let j = 0; j < 2; j++) {
      await createActiveUser({
        idx: idx++,
        name: `SubMember ${i + 1}-${j + 1}`,
        sponsor: parent,
      });
    }
  }
  console.log(`Hierarchy build complete, users created: ${idx - 1}`);

  console.log("Recomputing team active counters...");
  const allActive = await User.find({ status: 1, isSystemRoot: { $ne: true } })
    .select("_id")
    .lean();
  for (const u of allActive) {
    await onUserBecameActive(u._id);
  }
  console.log(`Active transition sync done for users: ${allActive.length}`);

  console.log("Applying designation 1 for 50 leaders...");
  for (const leader of leaders) {
    const applied = await applyForDesignation(leader._id, 1);
    if (applied.success) {
      await transitionDesignationStatus(
        leader._id,
        1,
        "APPROVED",
        "Auto-approved for realistic test",
        admin._id
      );
    }
  }
  console.log("Designation approvals completed");

  console.log("Force-assigning designation 1 on one downline per top leader for rank gating...");
  const now = new Date();
  for (const child of firstChildPerTopLeader) {
    await UserDesignation.updateOne(
      {
        userId: child._id,
        designationCode: 1,
      },
      {
        $set: {
          status: "APPROVED",
          appliedAt: now,
          approvedAt: now,
          approvedBy: admin._id,
          remarks: "Synthetic approval for rank requirement test",
          online: true,
          avgRating: 0,
          totalRatings: 0,
        },
      },
      { upsert: true },
    );
  }

  console.log("Upgrading top 20 leaders across all rank steps...");
  for (const leader of topLeaders) {
    await checkAndUpgradeRank(leader._id);
    await checkAndUpgradeRank(leader._id);
    await checkAndUpgradeRank(leader._id);
    await checkAndUpgradeRank(leader._id);
  }

  console.log("Funding one requester for appointment flow...");
  const requester = leaders[25];
  const trainer = leaders[0];
  const counsellor = leaders[1];
  await creditMainWallet(requester._id, "20000.00", {
    type: "ADMIN_CR",
    requestId: uuidv4(),
    description: "Automation funding",
  });

  const s1 = await SlotDefinition.findOneAndUpdate(
    { designationCode: 1, label: "AUTO-D1" },
    {
      $set: {
        designationCode: 1,
        label: "AUTO-D1",
        startTime: "09:00",
        endTime: "10:00",
        capacity: 20,
        active: true,
      },
    },
    { upsert: true, new: true }
  );
  const s2 = await SlotDefinition.findOneAndUpdate(
    { designationCode: 2, label: "AUTO-D2" },
    {
      $set: {
        designationCode: 2,
        label: "AUTO-D2",
        startTime: "10:00",
        endTime: "11:00",
        capacity: 20,
        active: true,
      },
    },
    { upsert: true, new: true }
  );

  const b1 = await bookAppointment(requester._id, trainer._id, 1, "2031-01-15", s1._id, { type: "SELF" });
  if (b1.success) {
    await acceptAppointment(trainer._id, b1.appointment._id);
    await SbiProSession.updateOne(
      { appointmentId: b1.appointment._id },
      { $set: { status: "ANALYSIS_PENDING" } }
    );
    const done = await markAnalysisDone(b1.appointment._id);
    if (done.success) {
      await creditTrainerCommission(b1.appointment._id, done.session.trainerId, admin._id);
    }
  }

  const b2 = await bookAppointment(requester._id, counsellor._id, 2, "2031-01-16", s2._id, {});
  if (b2.success) {
    await acceptAppointment(counsellor._id, b2.appointment._id);
    const cm = await counsellorMarkComplete(counsellor._id, b2.appointment._id, {
      notes: "Auto counselling completion",
      durationMinutes: 35,
      mode: "online",
    });
    if (cm.success) {
      await userConfirmAndClose(requester._id, cm.session._id, {
        counsellingDone: true,
        hasIssue: false,
        rating: 5,
      });
    }
  }

  console.log("Running monthly rank commission for current month...");
  const month = getMonthBounds();
  await runRankCommissionForPeriod(month.start, month.end, month.key, { dryRun: false });

  const totalUsers = await User.countDocuments({ isSystemRoot: { $ne: true } });
  const activeUsers = await User.countDocuments({ isSystemRoot: { $ne: true }, status: 1 });
  const paidUsers = await User.countDocuments({ isSystemRoot: { $ne: true }, isPaid: true });
  const topRankUsers = await User.countDocuments({ rankCode: 4, status: 1, isPaid: true });
  const nonSystemRootIds = await User.find({
    isSystemRoot: { $ne: true },
  })
    .select("_id")
    .lean();
  const desApproved = await UserDesignation.countDocuments({
    designationCode: 1,
    status: "APPROVED",
    userId: { $in: nonSystemRootIds.map((u) => u._id) },
  });

  const clubs = settings.clubs || [];
  const clubCounts = [];
  for (const c of clubs) {
    const eligible = await getActiveEligibleUsersForClub(c, {
      periodStart: month.start,
      periodEnd: month.end,
    });
    clubCounts.push({ name: c.name, count: eligible.length });
  }

  console.log("\n=== FINAL SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        totalUsers,
        activeUsers,
        paidUsers,
        activePaidConsistency: activeUsers === paidUsers,
        topRankUsers,
        designation1ApprovedUsers: desApproved,
        clubEligibleCounts: clubCounts,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("fullResetRealistic300Test failed:", e);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
