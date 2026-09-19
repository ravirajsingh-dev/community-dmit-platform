const mongoose = require("mongoose");
const crypto = require("crypto");

const WalletSettings = require("../models/WalletSettings");
const WalletWithdrawalRequest = require("../models/WalletWithdrawalRequest");
const User = require("../models/User");
const { getOrCreateWallet, debitMainWallet, creditMainWallet } = require("./walletService");
const { toCents, computeCommissionCents, centsToDecimal } = require("../utils/financialMath");
const { generateQRCodeWithAmount } = require("../utils/qrCodeUtils");
const Wallet = require("../models/Wallet");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuidFormat(requestId) {
  if (!requestId || typeof requestId !== "string" || !UUID_REGEX.test(requestId.trim())) {
    throw new Error("requestId must be a valid UUID format");
  }
}

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function safeNum(n) {
  const x = typeof n === "number" ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : 0;
}

function normalizePaymentDetails(paymentMethod, paymentDetails) {
  const pd = paymentDetails || {};
  const out = {
    upiId: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifsc: "",
    chequeNumber: "",
    chequeBankName: "",
  };

  if (paymentMethod === "UPI") {
    out.upiId = String(pd.upiId || "").trim();
  }
  if (paymentMethod === "BANK") {
    out.bankName = String(pd.bankName || "").trim();
    out.accountHolderName = String(pd.accountHolderName || "").trim();
    out.accountNumber = String(pd.accountNumber || "").trim();
    out.ifsc = String(pd.ifsc || "").trim().toUpperCase();
  }
  if (paymentMethod === "CHEQUE") {
    out.chequeNumber = String(pd.chequeNumber || "").trim();
    out.chequeBankName = String(pd.chequeBankName || "").trim();
  }
  return out;
}

async function createWithdrawalRequest(userId, payload) {
  const {
    requestId,
    amount,
    paymentMethod,
    paymentDetails,
  } = payload || {};

  assertUuidFormat(requestId);

  if (!userId) throw new Error("Authentication required");

  const amtCents = toCents(amount);
  if (amtCents <= 0) throw new Error("Amount must be a valid number >= 0.01");

  const settings = await WalletSettings.getOrCreateSettings();
  if (!settings?.isWithdrawalEnabled) throw new Error("Withdrawal is currently disabled");

  const mainMin = settings.mainMinWithdrawal ?? null;
  const mainMax = settings.mainMaxWithdrawal ?? null;

  const minCents = mainMin == null ? null : toCents(mainMin);
  const maxCents = mainMax == null ? null : toCents(mainMax);

  if (minCents != null && minCents > 0 && amtCents < minCents) {
    throw new Error(`Minimum withdrawal from main wallet is ₹${(minCents / 100).toFixed(2)}`);
  }
  if (maxCents != null && maxCents > 0 && amtCents > maxCents) {
    throw new Error(`Maximum withdrawal from main wallet is ₹${(maxCents / 100).toFixed(2)}`);
  }

  const { start, end } = getDayRange(new Date());
  const pendingCount = await WalletWithdrawalRequest.countDocuments({
    userId,
    status: "PENDING",
  });
  if (pendingCount > 0) {
    throw new Error("Withdrawal request already pending. You cannot submit another request.");
  }

  if (settings.maxUserTransactionsPerDay != null) {
    const maxPerDay = safeNum(settings.maxUserTransactionsPerDay);
    if (Number.isFinite(maxPerDay) && maxPerDay >= 0) {
      const approvedToday = await WalletWithdrawalRequest.countDocuments({
        userId,
        status: "APPROVED",
        approvedAt: { $gte: start, $lte: end },
      });
      if (approvedToday >= maxPerDay) {
        throw new Error("Daily withdrawal limit reached. Try again tomorrow.");
      }
    }
  }

  const existing = await WalletWithdrawalRequest.findOne({
    userId,
    idempotencyKey: requestId,
  }).lean();
  if (existing) return existing;

  const user = await User.findById(userId).select("_id memberId name").lean();
  if (!user) throw new Error("User not found");

  const wallet = await Wallet.findOne({ userId }).lean();
  const availableCents = toCents(wallet?.balance ?? 0);
  if (amtCents > availableCents) throw new Error("Insufficient wallet balance for withdrawal");

  const surchargePercent = safeNum(settings.adminWithdrawalSurchargePercent);
  const surchargeCents = computeCommissionCents(amtCents, surchargePercent);
  const netCents = amtCents - surchargeCents;
  if (netCents <= 0) throw new Error("Invalid withdrawal amount after surcharge calculation");

  const normalizedDetails = normalizePaymentDetails(paymentMethod, paymentDetails);

  const holdTxnReqId = requestId.trim();
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await getOrCreateWallet(userId, session);

    // Create the request doc first (unique key ensures idempotency).
    const createdRequest = await WalletWithdrawalRequest.create(
      [
        {
          userId,
          memberId: user.memberId || "",
          userName: user.name || "",
          idempotencyKey: holdTxnReqId,
          amount: centsToDecimal(amtCents),
          adminWithdrawalSurchargePercent: surchargePercent,
          adminWithdrawalSurchargeAmount: centsToDecimal(surchargeCents),
          netPayoutAmount: centsToDecimal(netCents),
          paymentMethod,
          paymentDetails: normalizedDetails,
          status: "PENDING",
        },
      ],
      { session },
    );

    // Hold funds by debiting MAIN wallet immediately.
    const debitResult = await debitMainWallet(userId, amount, {
      type: "WITHDRAWAL_HOLD",
      requestId: holdTxnReqId,
      description: "Withdrawal request hold",
      session,
    });

    // debitMainWallet returns wallet/transaction. We mainly need status consistency.
    if (!debitResult) throw new Error("Failed to create withdrawal hold");

    await session.commitTransaction();

    return createdRequest?.[0]?.toObject?.() || createdRequest?.[0];
  } catch (err) {
    await session.abortTransaction();
    // If the request already exists (race), return it.
    if (err && err.code === 11000) {
      const existing2 = await WalletWithdrawalRequest.findOne({
        userId,
        idempotencyKey: requestId,
      }).lean();
      if (existing2) return existing2;
    }
    throw err;
  } finally {
    session.endSession();
  }
}

async function listWithdrawalRequests(userId, filters = {}) {
  const { status, excludePending, page = 1, limit = 20 } = filters || {};
  const safePage = parseInt(page, 10) || 1;
  const safeLimit = parseInt(limit, 10) || 20;
  const skip = Math.max(0, (safePage - 1) * safeLimit);

  const query = { userId };
  const ex =
    excludePending === true ||
    excludePending === "true" ||
    excludePending === 1 ||
    excludePending === "1";
  if (ex) {
    query.status = { $in: ["APPROVED", "REJECTED", "CANCELLED"] };
  } else if (status) {
    query.status = status;
  }

  const [items, totalCount] = await Promise.all([
    WalletWithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    WalletWithdrawalRequest.countDocuments(query),
  ]);

  return {
    items: (items || []).map(normalizeWithdrawalDoc),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / safeLimit),
    },
  };
}

function generateUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // RFC4122 v4 fallback (so it still passes UUID validation in walletService)
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeWithdrawalDoc(doc) {
  if (!doc) return doc;
  const toStr = (v) => (v && typeof v.toString === "function" ? v.toString() : v);
  return {
    ...doc,
    amount: toStr(doc.amount) ?? "0",
    adminWithdrawalSurchargeAmount: toStr(doc.adminWithdrawalSurchargeAmount) ?? "0",
    netPayoutAmount: toStr(doc.netPayoutAmount) ?? "0",
  };
}

async function cancelWithdrawalRequest(userId, withdrawalRequestId) {
  if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
    throw new Error("Invalid withdrawal request id");
  }

  const reqDoc = await WalletWithdrawalRequest.findOne({
    _id: withdrawalRequestId,
    userId,
    status: "PENDING",
  }).lean();

  if (!reqDoc) throw new Error("Withdrawal request not found or not pending");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await WalletWithdrawalRequest.updateOne(
      {
        _id: withdrawalRequestId,
        userId,
        status: "PENDING",
      },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      },
      { session },
    );

    await creditMainWallet(userId, reqDoc.amount, {
      type: "WITHDRAWAL_RELEASE",
      requestId: generateUuid(),
      description: "Withdrawal request cancelled release",
      session,
    });

    await session.commitTransaction();

    const updated = await WalletWithdrawalRequest.findOne({ _id: withdrawalRequestId }).lean();
    return normalizeWithdrawalDoc(updated);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function adminListWithdrawalRequests(filters = {}) {
  const {
    status,
    page = 1,
    limit = 20,
    search = "",
    memberId: memberIdFilter,
    paymentMethod,
    fromDate,
    toDate,
  } = filters || {};

  const safePage = parseInt(page, 10) || 1;
  const safeLimit = parseInt(limit, 10) || 20;
  const skip = Math.max(0, (safePage - 1) * safeLimit);

  const query = {};
  if (status) query.status = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  const mid = memberIdFilter != null ? String(memberIdFilter).trim() : "";
  if (mid) {
    query.memberId = mid;
  } else if (search && String(search).trim()) {
    const s = String(search).trim();
    query.$or = [{ memberId: s }, { userName: new RegExp(s, "i") }];
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const d = new Date(toDate);
      d.setHours(23, 59, 59, 999);
      query.createdAt.$lte = d;
    }
  }

  const [items, totalCount] = await Promise.all([
    WalletWithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    WalletWithdrawalRequest.countDocuments(query),
  ]);

  return {
    items: (items || []).map(normalizeWithdrawalDoc),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / safeLimit),
    },
  };
}

async function adminApproveWithdrawalRequest(
  adminId,
  withdrawalRequestId,
  remarks = "",
  payoutReference = "",
) {
  if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
    throw new Error("Invalid withdrawal request id");
  }
  if (!adminId) throw new Error("adminId is required");

  const pr = payoutReference != null ? String(payoutReference).trim().slice(0, 120) : "";

  const setDoc = {
    status: "APPROVED",
    adminId,
    approvedAt: new Date(),
    adminRemarks: remarks || "",
  };
  if (pr) setDoc.payoutReference = pr;

  const updated = await WalletWithdrawalRequest.findOneAndUpdate(
    { _id: withdrawalRequestId, status: "PENDING" },
    { $set: setDoc },
    { new: true },
  ).lean();

  if (!updated) throw new Error("Withdrawal request not found or not pending");
  return normalizeWithdrawalDoc(updated);
}

async function adminSetWithdrawalPayoutReference(adminId, withdrawalRequestId, payoutReference) {
  if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
    throw new Error("Invalid withdrawal request id");
  }
  if (!adminId) throw new Error("adminId is required");

  const pr = payoutReference != null ? String(payoutReference).trim().slice(0, 120) : "";
  if (!pr) throw new Error("Payout reference is required");

  const updated = await WalletWithdrawalRequest.findOneAndUpdate(
    { _id: withdrawalRequestId, status: "APPROVED" },
    { $set: { payoutReference: pr } },
    { new: true },
  ).lean();

  if (!updated) throw new Error("Withdrawal request not found or not approved");
  return normalizeWithdrawalDoc(updated);
}

async function adminRejectWithdrawalRequest(adminId, withdrawalRequestId, remarks = "") {
  if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
    throw new Error("Invalid withdrawal request id");
  }
  if (!adminId) throw new Error("adminId is required");

  const reqDoc = await WalletWithdrawalRequest.findOne({
    _id: withdrawalRequestId,
    status: "PENDING",
  }).lean();
  if (!reqDoc) throw new Error("Withdrawal request not found or not pending");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await WalletWithdrawalRequest.updateOne(
      { _id: withdrawalRequestId, status: "PENDING" },
      {
        $set: { status: "REJECTED", adminId, rejectedAt: new Date(), adminRemarks: remarks || "" },
      },
      { session },
    );

    await creditMainWallet(reqDoc.userId, reqDoc.amount, {
      type: "WITHDRAWAL_RELEASE",
      requestId: generateUuid(),
      description: "Withdrawal request rejected release",
      session,
    });

    await session.commitTransaction();
    const updated = await WalletWithdrawalRequest.findOne({ _id: withdrawalRequestId }).lean();
    return normalizeWithdrawalDoc(updated);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function adminGenerateWithdrawalUpiQr(withdrawalRequestId) {
  if (!mongoose.Types.ObjectId.isValid(withdrawalRequestId)) {
    throw new Error("Invalid withdrawal request id");
  }

  const reqDoc = await WalletWithdrawalRequest.findOne({
    _id: withdrawalRequestId,
  }).lean();
  if (!reqDoc) throw new Error("Withdrawal request not found");

  if (reqDoc.paymentMethod !== "UPI") throw new Error("UPI QR can only be generated for UPI withdrawals");

  const upiId = reqDoc.paymentDetails?.upiId;
  const receiverName = reqDoc.userName || "Receiver";
  const qrAmount = Number(reqDoc.netPayoutAmount?.toString?.() || reqDoc.netPayoutAmount || 0);
  if (qrAmount < 1) throw new Error("QR amount must be at least 1");

  const qr = await generateQRCodeWithAmount(upiId, receiverName, qrAmount);
  return qr;
}

module.exports = {
  createWithdrawalRequest,
  listWithdrawalRequests,
  cancelWithdrawalRequest,
  adminListWithdrawalRequests,
  adminApproveWithdrawalRequest,
  adminSetWithdrawalPayoutReference,
  adminRejectWithdrawalRequest,
  adminGenerateWithdrawalUpiQr,
};

