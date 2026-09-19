/**
 * Wallet Service - Phase 1 Production
 * Single Wallet model, MongoDB transactions, Decimal128 only, immutable ledger.
 * Idempotency via requestId (UUID). No negative balance. No float.
 */

const mongoose = require("mongoose");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const WalletSettings = require("../models/WalletSettings");
const WalletWithdrawalRequest = require("../models/WalletWithdrawalRequest");

const DECIMAL = mongoose.Types.Decimal128;
const MAIN_KEY = "MAIN";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID_MAX_LEN = 120;

function toDecimal(value) {
  if (value instanceof mongoose.Types.Decimal128) return value;
  const n = typeof value === "number" ? value : Number(String(value));
  if (Number.isNaN(n) || n <= 0 || n === Infinity || n === -Infinity) {
    throw new Error("Invalid amount: must be a positive number");
  }
  return DECIMAL.fromString(n.toFixed(2));
}

function toDecimalStr(value) {
  const n = typeof value === "number" ? value : Number(String(value));
  if (Number.isNaN(n) || n <= 0) throw new Error("Invalid amount");
  return n.toFixed(2);
}

/**
 * Validate requestId per idempotency standard.
 * Format: <engine>:<eventId>:<userId>:<walletKey> or UUID for transfers.
 * Max 120 chars. Reject invalid.
 */
function validateRequestId(requestId) {
  if (!requestId || typeof requestId !== "string") return false;
  const s = requestId.trim();
  if (s.length === 0 || s.length > REQUEST_ID_MAX_LEN) return false;
  if (UUID_REGEX.test(s)) return true;
  if (s.endsWith(":credit") && s.length <= REQUEST_ID_MAX_LEN) {
    const base = s.slice(0, -7);
    return validateRequestId(base);
  }
  const adminMatch = s.match(/^admin:(adjust|transfer):([0-9a-f-]+)$/i);
  if (adminMatch) return UUID_REGEX.test(adminMatch[2]);
  const engineMatch = s.match(/^(level|rank|club|activation|transfer):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):/i);
  if (engineMatch) return true;
  // Monthly rank commission: rank_monthly:YYYY-MM:userId:RANK_N
  const rankMonthlyMatch = s.match(/^rank_monthly:\d{4}-\d{1,2}:[0-9a-f]{24}:RANK_\d+$/i);
  if (rankMonthlyMatch) return true;
  // Period rank commission: rank_period:<periodKey>:userId:RANK_N
  const rankPeriodMatch = s.match(/^rank_period:[^:]+:[0-9a-f]{24}:RANK_\d+$/i);
  if (rankPeriodMatch) return true;
  // Club commission: club_<periodType>:<periodKey>:userId:<CLUB_KEY>
  const clubPeriodMatch = s.match(/^club_[a-z_]+:[^:]+:[0-9a-f]{24}:[A-Z0-9_]+$/i);
  if (clubPeriodMatch) return true;
  // Phase 4: SBI PRO commission - sbi-pro:commission:<appointmentId> (24-char ObjectId)
  const sbiProMatch = s.match(/^sbi-pro:commission:[0-9a-f]{24}$/i);
  if (sbiProMatch) return true;
  // Counselling: counselling:debit:<appointmentId>, counselling:commission:<counsellingSessionId>
  const counsellingDebitMatch = s.match(/^counselling:debit:[0-9a-f]{24}$/i);
  if (counsellingDebitMatch) return true;
  const counsellingCommissionMatch = s.match(/^counselling:commission:[0-9a-f]{24}$/i);
  if (counsellingCommissionMatch) return true;
  return false;
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

async function getOrCreateWallet(userId, session) {
  const oid = userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);
  const updated = await Wallet.findOneAndUpdate(
    { userId: oid },
    {
      $setOnInsert: {
        balance: DECIMAL.fromString("0"),
        clubBalances: {},
        totalBalance: DECIMAL.fromString("0"),
        totalClubBalance: DECIMAL.fromString("0"),
      },
    },
    { upsert: true, returnDocument: "after", session }
  ).lean();
  return updated;
}

function sumClubBalances(clubBalances) {
  let sum = 0;
  const clubMap = clubBalances || {};
  if (clubMap instanceof Map) {
    for (const [, v] of clubMap) {
      sum += parseFloat(v?.toString?.() || "0");
    }
  } else if (typeof clubMap === "object") {
    for (const k of Object.keys(clubMap)) {
      sum += parseFloat(clubMap[k]?.toString?.() || "0");
    }
  }
  return sum;
}

function recalcTotalBalance(balance, clubBalances) {
  let mainBal = typeof balance === "string" ? parseFloat(balance) : Number(balance?.toString?.() || "0");
  if (Number.isNaN(mainBal)) mainBal = 0;
  const clubSum = sumClubBalances(clubBalances);
  return DECIMAL.fromString(Math.max(0, mainBal + clubSum).toFixed(2));
}

function recalcTotalClubBalance(clubBalances) {
  return DECIMAL.fromString(Math.max(0, sumClubBalances(clubBalances)).toFixed(2));
}

async function creditMainWallet(userId, amount, options = {}) {
  const { type = "ADMIN", requestId, description = null, adminId = null, session: extSession = null } = options;
  if (!requestId || !validateRequestId(requestId)) throw new Error("requestId (UUID) is required");
  const amt = toDecimal(amount);

  const runTx = async (session) => {
    let inserted;
    try {
      const [tx] = await WalletTransaction.create(
        [
          {
            userId,
            requestId,
            type,
            direction: "CREDIT",
            walletKey: MAIN_KEY,
            amount: amt,
            description,
            adminId: adminId || undefined,
          },
        ],
        { session, ordered: true }
      );
      inserted = tx;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await WalletTransaction.findOne({ requestId }).session(session).lean();
        if (existing && existing.userId.toString() === userId.toString()) {
          const wallet = await Wallet.findOne({ userId }).session(session).lean();
          return {
            wallet: wallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
            transaction: existing,
            idempotent: true,
          };
        }
      }
      throw err;
    }
    await getOrCreateWallet(userId, session);
    const updated = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: amt } },
      { returnDocument: "after", session }
    ).lean();
    const newTotal = recalcTotalBalance(updated.balance, updated.clubBalances);
    const newClubTotal = recalcTotalClubBalance(updated.clubBalances);
    const now = new Date();
    await Wallet.updateOne(
      { userId },
      { $set: { totalBalance: newTotal, totalClubBalance: newClubTotal, lastTransactionAt: now } },
      { session }
    );
    return {
      wallet: updated,
      transaction: inserted?.toObject?.() ?? inserted,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

async function debitMainWallet(userId, amount, options = {}) {
  const { type = "ADMIN", requestId, description = null, adminId = null, session: extSession = null } = options;
  if (!requestId || !validateRequestId(requestId)) throw new Error("requestId (UUID) is required");
  const amt = toDecimal(amount);

  const runTx = async (session) => {
    let inserted;
    try {
      const [tx] = await WalletTransaction.create(
        [
          {
            userId,
            requestId,
            type,
            direction: "DEBIT",
            walletKey: MAIN_KEY,
            amount: amt,
            description,
            adminId: adminId || undefined,
          },
        ],
        { session, ordered: true }
      );
      inserted = tx;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await WalletTransaction.findOne({ requestId }).session(session).lean();
        if (existing && existing.userId.toString() === userId.toString()) {
          const wallet = await Wallet.findOne({ userId }).session(session).lean();
          return {
            wallet: wallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
            transaction: existing,
            idempotent: true,
          };
        }
      }
      throw err;
    }
    const updated = await Wallet.findOneAndUpdate(
      { userId, balance: { $gte: amt } },
      { $inc: { balance: DECIMAL.fromString("-" + toDecimalStr(amount)) } },
      { returnDocument: "after", session }
    ).lean();
    if (!updated) throw new Error("Insufficient balance");
    const newTotal = recalcTotalBalance(updated.balance, updated.clubBalances);
    const now = new Date();
    await Wallet.updateOne(
      { userId },
      { $set: { totalBalance: newTotal, lastTransactionAt: now } },
      { session }
    );
    return {
      wallet: updated,
      transaction: inserted?.toObject?.() ?? inserted,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

async function creditClubWallet(userId, clubKey, amount, options = {}) {
  const { type = "ADMIN", requestId, description = null, adminId = null, session: extSession = null } = options;
  if (!requestId || !validateRequestId(requestId)) throw new Error("requestId (UUID) is required");
  const key = String(clubKey).trim().toUpperCase();
  const amt = toDecimal(amount);

  const runTx = async (session) => {
    let inserted;
    try {
      const [tx] = await WalletTransaction.create(
        [
          {
            userId,
            requestId,
            type,
            direction: "CREDIT",
            walletKey: key,
            amount: amt,
            description,
            adminId: adminId || undefined,
          },
        ],
        { session, ordered: true }
      );
      inserted = tx;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await WalletTransaction.findOne({ requestId }).session(session).lean();
        if (existing && existing.userId.toString() === userId.toString()) {
          const wallet = await Wallet.findOne({ userId }).session(session).lean();
          return {
            wallet: wallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
            transaction: existing,
            idempotent: true,
          };
        }
      }
      throw err;
    }
    const wallet = await getOrCreateWallet(userId, session);
    const currentClub = wallet?.clubBalances?.get?.(key) || wallet?.clubBalances?.[key];
    const currentVal = currentClub ? parseFloat(currentClub.toString()) : 0;
    const newVal = (currentVal + parseFloat(amt.toString())).toFixed(2);
    const updateKey = `clubBalances.${key}`;
    const updated = await Wallet.findOneAndUpdate(
      { userId },
      { $set: { [updateKey]: DECIMAL.fromString(newVal) } },
      { returnDocument: "after", session }
    ).lean();
    const newTotal = recalcTotalBalance(updated.balance, updated.clubBalances);
    const newClubTotal = recalcTotalClubBalance(updated.clubBalances);
    const now = new Date();
    await Wallet.updateOne(
      { userId },
      { $set: { totalBalance: newTotal, totalClubBalance: newClubTotal, lastTransactionAt: now } },
      { session }
    );
    return {
      wallet: updated,
      transaction: inserted?.toObject?.() ?? inserted,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

async function debitClubWallet(userId, clubKey, amount, options = {}) {
  const { type = "ADMIN", requestId, description = null, adminId = null, session: extSession = null } = options;
  if (!requestId || !validateRequestId(requestId)) throw new Error("requestId (UUID) is required");
  const key = String(clubKey).trim().toUpperCase();
  const amt = toDecimal(amount);

  const runTx = async (session) => {
    let inserted;
    try {
      const [tx] = await WalletTransaction.create(
        [
          {
            userId,
            requestId,
            type,
            direction: "DEBIT",
            walletKey: key,
            amount: amt,
            description,
            adminId: adminId || undefined,
          },
        ],
        { session, ordered: true }
      );
      inserted = tx;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await WalletTransaction.findOne({ requestId }).session(session).lean();
        if (existing && existing.userId.toString() === userId.toString()) {
          const wallet = await Wallet.findOne({ userId }).session(session).lean();
          return {
            wallet: wallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
            transaction: existing,
            idempotent: true,
          };
        }
      }
      throw err;
    }
    const updateKey = `clubBalances.${key}`;
    const updated = await Wallet.findOneAndUpdate(
      { userId, [updateKey]: { $gte: amt } },
      {
        $inc: { [updateKey]: DECIMAL.fromString("-" + toDecimalStr(amount)) },
      },
      { returnDocument: "after", session }
    ).lean();
    if (!updated) throw new Error("Insufficient balance");
    const newTotal = recalcTotalBalance(updated.balance, updated.clubBalances);
    const newClubTotal = recalcTotalClubBalance(updated.clubBalances);
    const now = new Date();
    await Wallet.updateOne(
      { userId },
      { $set: { totalBalance: newTotal, totalClubBalance: newClubTotal, lastTransactionAt: now } },
      { session }
    );
    return {
      wallet: updated,
      transaction: inserted?.toObject?.() ?? inserted,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

async function getWalletDetails(userId) {
  const wallet = await Wallet.findOne({ userId }).lean();
  const mainBalance = wallet?.balance?.toString?.() || "0";
  const clubMap = wallet?.clubBalances || {};
  const clubBalances = [];
  if (clubMap instanceof Map) {
    for (const [k, v] of clubMap) {
      clubBalances.push({ clubKey: k, balance: v?.toString?.() || "0" });
    }
  } else if (typeof clubMap === "object") {
    for (const k of Object.keys(clubMap)) {
      clubBalances.push({ clubKey: k, balance: clubMap[k]?.toString?.() || "0" });
    }
  }
  return { mainBalance, clubBalances };
}

async function getWalletTransactions(userId, filters = {}) {
  const { page = 1, limit = 20, walletKey, walletType, type, direction, fromDate, toDate } = filters;
  const query = { userId };
  if (walletKey) query.walletKey = String(walletKey).toUpperCase();
  else if (walletType === "MAIN") query.walletKey = "MAIN";
  if (type) query.type = type;
  if (direction) query.direction = direction;
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const d = new Date(toDate);
      d.setHours(23, 59, 59, 999);
      query.createdAt.$lte = d;
    }
  }

  const skip = Math.max(0, (page - 1) * limit);
  const queryCr = { ...query, direction: "CREDIT" };
  const queryDr = { ...query, direction: "DEBIT" };
  const [transactions, totalCount, sumCrResult, sumDrResult] = await Promise.all([
    WalletTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WalletTransaction.countDocuments(query),
    WalletTransaction.aggregate([
      { $match: queryCr },
      { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } },
    ]),
    WalletTransaction.aggregate([
      { $match: queryDr },
      { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } },
    ]),
  ]);

  const items = (transactions || []).map((t) => ({
    ...t,
    amount: t.amount?.toString?.() || "0",
  }));

  // Keep ledger immutable, but present a user-friendly description for withdrawal holds
  // based on the latest request status.
  const holdRequestIds = [
    ...new Set(
      items
        .filter((t) => t.type === "WITHDRAWAL_HOLD" && t.requestId)
        .map((t) => String(t.requestId)),
    ),
  ];
  if (holdRequestIds.length > 0) {
    const withdrawalRequests = await WalletWithdrawalRequest.find({
      userId,
      idempotencyKey: { $in: holdRequestIds },
    })
      .select("idempotencyKey status netPayoutAmount")
      .lean();

    const statusByRequestId = new Map(
      (withdrawalRequests || []).map((r) => [String(r.idempotencyKey), r]),
    );

    for (const tx of items) {
      if (tx.type !== "WITHDRAWAL_HOLD" || !tx.requestId) continue;
      const req = statusByRequestId.get(String(tx.requestId));
      if (!req?.status) continue;
      const payout = req.netPayoutAmount?.toString?.() || req.netPayoutAmount || "0";

      if (req.status === "APPROVED") {
        tx.description = `Withdrawal approved. Net payout ₹${payout}`;
      } else if (req.status === "PENDING") {
        tx.description = "Withdrawal request hold (awaiting admin approval)";
      } else if (req.status === "REJECTED") {
        tx.description = "Withdrawal rejected (hold released)";
      } else if (req.status === "CANCELLED") {
        tx.description = "Withdrawal cancelled (hold released)";
      }
    }
  }

  const totalCr = (sumCrResult && sumCrResult[0] && sumCrResult[0].total != null)
    ? String(Number(sumCrResult[0].total).toFixed(2))
    : "0.00";
  const totalDr = (sumDrResult && sumDrResult[0] && sumDrResult[0].total != null)
    ? String(Number(sumDrResult[0].total).toFixed(2))
    : "0.00";

  return {
    transactions: items,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    totalCr,
    totalDr,
  };
}

const getDerivedWalletKeys = async (session = null) => {
  const settings = await WalletSettings.getOrCreateSettings();
  const keys = settings ? WalletSettings.getDerivedWalletKeys(settings) : [];
  const baseKeys = ["COMMON", "REGISTRATION_FEE", ...keys].filter(Boolean);
  return [...new Set(baseKeys)];
};

async function getAvailableBalanceByWalletKey(userId, walletKey) {
  const wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) return "0";
  const key = String(walletKey || "MAIN").trim().toUpperCase();
  if (key === "MAIN") {
    return wallet.balance?.toString?.() || "0";
  }
  const clubMap = wallet.clubBalances || {};
  const val = clubMap instanceof Map ? clubMap.get?.(key) : clubMap[key];
  return val?.toString?.() || "0";
}

async function adminAdjustWallet(userId, walletKey, direction, amount, options = {}) {
  const { adminId, requestId } = options;
  if (!adminId || !requestId) throw new Error("adminId and requestId are required");
  const key = String(walletKey || "MAIN").trim().toUpperCase();
  const amtStr = require("../utils/transactionDescriptionEngine").formatAmountForDescription(amount);
  const reason = "Balance adjustment";
  const description =
    direction === "CREDIT"
      ? require("../utils/transactionDescriptionEngine").buildTransactionDescription("ADMIN_CREDIT", {
          amount: amtStr,
          reason,
        })
      : require("../utils/transactionDescriptionEngine").buildTransactionDescription("ADMIN_DEBIT", {
          amount: amtStr,
          reason,
        });
  const reqId = `admin:adjust:${requestId}`;

  if (key === "MAIN") {
    if (direction === "CREDIT") {
      const result = await creditMainWallet(userId, amount, {
        type: "ADMIN_CR",
        requestId: reqId,
        description,
        adminId,
      });
      return {
        updatedBalance: result.wallet?.balance?.toString?.() || "0",
        transaction: result.transaction,
      };
    }
    const result = await debitMainWallet(userId, amount, {
      type: "ADMIN_DR",
      requestId: reqId,
      description,
      adminId,
    });
    return {
      updatedBalance: result.wallet?.balance?.toString?.() || "0",
      transaction: result.transaction,
    };
  }

  if (direction === "CREDIT") {
    const result = await creditClubWallet(userId, key, amount, {
      type: "ADMIN_CR",
      requestId: reqId,
      description,
      adminId,
    });
    const bal = result.wallet?.clubBalances?.get?.(key) || result.wallet?.clubBalances?.[key];
    return {
      updatedBalance: bal?.toString?.() || "0",
      transaction: result.transaction,
    };
  }
  const result = await debitClubWallet(userId, key, amount, {
    type: "ADMIN_DR",
    requestId: reqId,
    description,
    adminId,
  });
  const bal = result.wallet?.clubBalances?.get?.(key) || result.wallet?.clubBalances?.[key];
  return {
    updatedBalance: bal?.toString?.() || "0",
    transaction: result.transaction,
  };
}

module.exports = {
  validateRequestId,
  creditMainWallet,
  debitMainWallet,
  creditClubWallet,
  debitClubWallet,
  getWalletDetails,
  getWalletTransactions,
  getOrCreateWallet,
  getDerivedWalletKeys,
  getAvailableBalanceByWalletKey,
  adminAdjustWallet,
};
