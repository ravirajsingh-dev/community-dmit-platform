/**
 * Admin Wallet Management Controller
 * Handles: wallet types, member resolution, balance, adjust, transfer, lists.
 */

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const User = require("../../../models/User");
const Wallet = require("../../../models/Wallet");
const WalletTransaction = require("../../../models/WalletTransaction");
const WalletSettings = require("../../../models/WalletSettings");
const {
  getDerivedWalletKeys,
  getAvailableBalanceByWalletKey,
  adminAdjustWallet,
} = require("../../../services/walletService");
const { adminTransferUserToUser } = require("../../../services/transferService");
const { maybeTriggerWalletActivation } = require("../../../services/levelCommissionService");

const MAIN_KEY = "MAIN";

/**
 * GET /api/admin/wallet-management/wallet-types
 * Returns MAIN + derived wallet keys from WalletSettings
 */
const getWalletTypes = async (req, res) => {
  try {
    const settings = await WalletSettings.getOrCreateSettings();
    const derived = settings ? WalletSettings.getDerivedWalletKeys(settings) : [];
    const keys = [MAIN_KEY, ...derived];
    const walletTypes = keys.map((key) => ({
      key,
      name: key === MAIN_KEY ? "MAIN" : key,
    }));

    const seenClubKeys = new Set();
    const walletTypesMainClubs = [{ key: MAIN_KEY, name: "MAIN" }];
    for (const c of settings?.clubs || []) {
      const k = (c.walletKey || "").trim().toUpperCase();
      if (!k || seenClubKeys.has(k)) continue;
      seenClubKeys.add(k);
      const clubName = (c.name || "").trim();
      walletTypesMainClubs.push({
        key: k,
        name: clubName ? `${clubName} (${k})` : k,
      });
    }

    return response.successResponse(
      res,
      { walletTypes, walletTypesMainClubs },
      "Wallet types retrieved successfully."
    );
  } catch (err) {
    console.error("Error in getWalletTypes:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/resolve-member?memberId=XXX
 * Resolve user by memberId, return userId, memberId, name
 */
const resolveMember = async (req, res) => {
  try {
    const { memberId } = req.query;
    if (!memberId || typeof memberId !== "string" || !memberId.trim()) {
      return response.errorResponse(
        res,
        { msg: "memberId is required" },
        "memberId is required",
        400
      );
    }
    const user = await User.findOne({ memberId: memberId.trim() })
      .select("_id memberId name")
      .lean();
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Member not found" },
        "Member not found",
        404
      );
    }
    return response.successResponse(
      res,
      {
        userId: user._id,
        memberId: user.memberId,
        name: user.name,
      },
      "Member resolved successfully."
    );
  } catch (err) {
    console.error("Error in resolveMember:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/balance?userId=XXX&walletKey=YYY
 * Get available balance for user + wallet key
 */
const getBalance = async (req, res) => {
  try {
    const { userId, walletKey } = req.query;
    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "userId is required" },
        "userId is required",
        400
      );
    }
    const key = (walletKey || MAIN_KEY).toString().trim().toUpperCase() || MAIN_KEY;
    const balance = await getAvailableBalanceByWalletKey(userId, key);
    return response.successResponse(
      res,
      { availableBalance: balance },
      "Balance retrieved successfully."
    );
  } catch (err) {
    console.error("Error in getBalance:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * POST /api/admin/wallet-management/adjust
 * Admin credit/debit to user wallet
 */
const adminAdjust = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }
    const { transactionType, memberId, walletKey, amount, idempotencyKey } = req.body;
    const adminId = req.user?.id;
    if (!adminId) {
      return response.errorResponse(res, { msg: "Unauthorized" }, "Unauthorized", 401);
    }

    const user = await User.findOne({ memberId: memberId.trim() }).lean();
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Member not found" },
        "Member not found",
        404
      );
    }
    const userId = user._id;
    const key = (walletKey || MAIN_KEY).toString().trim().toUpperCase() || MAIN_KEY;
    const direction = transactionType === "Credit" ? "CREDIT" : "DEBIT";

    const result = await adminAdjustWallet(userId, key, direction, amount, {
      adminId,
      requestId: idempotencyKey,
    });

    let activationTriggered = false;
    let activationSummary = null;
    let updatedUser = null;
    if (direction === "CREDIT" && key === MAIN_KEY && user.status === 4 && user.isPaid === false) {
      const activationResult = await maybeTriggerWalletActivation(userId);
      activationTriggered = activationResult.activated === true;
      if (activationTriggered) {
        activationSummary = {
          totalDistributed: activationResult.totalDistributed || "0.00",
        };
        const fresh = await User.findById(userId).select("status isPaid").lean();
        if (fresh) updatedUser = { status: fresh.status, isPaid: fresh.isPaid };
      }
    }

    return response.successResponse(
      res,
      {
        updatedBalance: result.updatedBalance,
        transaction: result.transaction,
        activationTriggered,
        activationSummary,
        updatedUser,
      },
      activationTriggered ? "Amount credited. User activated successfully." : (direction === "CREDIT" ? "Amount credited successfully." : "Amount debited successfully.")
    );
  } catch (err) {
    console.error("Error in adminAdjust:", err);
    const statusCode = err.message?.includes("Insufficient balance") ? 400 : 500;
    return response.errorResponse(
      res,
      { msg: err.message || "Server Error" },
      err.message || "Server Error",
      statusCode
    );
  }
};

/**
 * POST /api/admin/wallet-management/transfer
 * Admin user-to-user transfer
 */
const adminTransfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }
    const { fromMemberId, toMemberId, walletKey, amount, idempotencyKey } = req.body;
    const adminId = req.user?.id;
    if (!adminId) {
      return response.errorResponse(res, { msg: "Unauthorized" }, "Unauthorized", 401);
    }

    const [fromUser, toUser] = await Promise.all([
      User.findOne({ memberId: fromMemberId.trim() }).lean(),
      User.findOne({ memberId: toMemberId.trim() }).lean(),
    ]);
    if (!fromUser) {
      return response.errorResponse(
        res,
        { msg: "From member not found" },
        "From member not found",
        404
      );
    }
    if (!toUser) {
      return response.errorResponse(
        res,
        { msg: "To member not found" },
        "To member not found",
        404
      );
    }
    if (fromUser._id.equals(toUser._id)) {
      return response.errorResponse(
        res,
        { msg: "Cannot transfer to self" },
        "Cannot transfer to self",
        400
      );
    }

    const key = (walletKey || MAIN_KEY).toString().trim().toUpperCase() || MAIN_KEY;
    const result = await adminTransferUserToUser(
      fromUser._id,
      toUser._id,
      key,
      amount,
      {
        requestId: idempotencyKey,
        adminId,
        fromMemberId: fromUser.memberId,
        fromUserName: fromUser.name,
        toMemberId: toUser.memberId,
        toUserName: toUser.name,
      }
    );

    let activationTriggered = false;
    let activationSummary = null;
    let updatedToUser = null;
    if (key === MAIN_KEY && toUser.status === 4 && toUser.isPaid === false) {
      const activationResult = await maybeTriggerWalletActivation(toUser._id);
      activationTriggered = activationResult.activated === true;
      if (activationTriggered) {
        activationSummary = {
          totalDistributed: activationResult.totalDistributed || "0.00",
        };
        const fresh = await User.findById(toUser._id).select("status isPaid").lean();
        if (fresh) updatedToUser = { status: fresh.status, isPaid: fresh.isPaid };
      }
    }

    const fromBal = key === MAIN_KEY
      ? result.fromWallet?.balance?.toString?.() || "0"
      : (result.fromWallet?.clubBalances?.get?.(key) || result.fromWallet?.clubBalances?.[key])?.toString?.() || "0";
    const toBal = key === MAIN_KEY
      ? result.toWallet?.balance?.toString?.() || "0"
      : (result.toWallet?.clubBalances?.get?.(key) || result.toWallet?.clubBalances?.[key])?.toString?.() || "0";

    return response.successResponse(
      res,
      {
        transferSuccess: true,
        activationTriggered,
        activationSummary,
        updatedToUser,
        fromUpdatedBalance: fromBal,
        toUpdatedBalance: toBal,
        debitTx: result.debitTx,
        creditTx: result.creditTx,
      },
      activationTriggered ? "Transfer completed. User activated successfully." : "Transfer completed successfully."
    );
  } catch (err) {
    console.error("Error in adminTransfer:", err);
    const statusCode = err.message?.includes("Insufficient balance") ||
      err.message?.includes("Cannot transfer to self") ? 400 : 500;
    return response.errorResponse(
      res,
      { msg: err.message || "Server Error" },
      err.message || "Server Error",
      statusCode
    );
  }
};

/**
 * GET /api/admin/wallet-management/admin-transactions
 * List admin CR/DR transactions only, with filters
 */
const listAdminTransactions = async (req, res) => {
  try {
    const {
      memberId,
      walletKey,
      transactionType,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { type: { $in: ["ADMIN_CR", "ADMIN_DR"] }, adminId: { $ne: null } };
    if (memberId && memberId.trim()) {
      const user = await User.findOne({ memberId: memberId.trim() }).select("_id").lean();
      if (user) query.userId = user._id;
      else query.userId = new mongoose.Types.ObjectId(0);
    }
    if (walletKey && walletKey.trim()) {
      query.walletKey = walletKey.trim().toUpperCase();
    }
    if (transactionType === "Credit") query.direction = "CREDIT";
    else if (transactionType === "Debit") query.direction = "DEBIT";
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    const skip = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
    const [transactions, totalCount, summaryAgg] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("userId", "memberId name")
        .lean(),
      WalletTransaction.countDocuments(query),
      WalletTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCredit: {
              $sum: {
                $cond: [
                  { $eq: ["$direction", "CREDIT"] },
                  { $toDecimal: "$amount" },
                  { $toDecimal: "0" },
                ],
              },
            },
            totalDebit: {
              $sum: {
                $cond: [
                  { $eq: ["$direction", "DEBIT"] },
                  { $toDecimal: "$amount" },
                  { $toDecimal: "0" },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const sumRow = summaryAgg && summaryAgg[0];
    let totalCreditStr = "0";
    let totalDebitStr = "0";
    let totalAmountStr = "0";
    if (sumRow) {
      totalCreditStr =
        sumRow.totalCredit != null ? sumRow.totalCredit.toString() : "0";
      totalDebitStr = sumRow.totalDebit != null ? sumRow.totalDebit.toString() : "0";
      const tc = parseFloat(totalCreditStr) || 0;
      const td = parseFloat(totalDebitStr) || 0;
      totalAmountStr = (tc - td).toFixed(2);
    }

    const items = (transactions || []).map((t) => ({
      _id: t._id,
      memberId: t.userId?.memberId || t.userId,
      walletType: t.walletKey,
      credit: t.direction === "CREDIT" ? (t.amount?.toString?.() || "0") : "-",
      debit: t.direction === "DEBIT" ? (t.amount?.toString?.() || "0") : "-",
      description: t.description,
      createdAt: t.createdAt,
    }));

    return response.successResponse(
      res,
      {
        transactions: items,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
        summary: {
          totalCredit: totalCreditStr,
          totalDebit: totalDebitStr,
          totalAmount: totalAmountStr,
        },
      },
      "Admin transactions retrieved successfully."
    );
  } catch (err) {
    console.error("Error in listAdminTransactions:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/wallet-details
 * Full project wallet transaction listing with aggregation, summary
 */
const walletDetails = async (req, res) => {
  try {
    const {
      memberId,
      walletKey,
      type,
      transactionType,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const match = {};
    if (memberId && memberId.trim()) {
      const user = await User.findOne({ memberId: memberId.trim() }).select("_id").lean();
      if (user) match.userId = user._id;
      else match.userId = new mongoose.Types.ObjectId(0);
    }
    if (walletKey && walletKey.trim()) {
      match.walletKey = walletKey.trim().toUpperCase();
    }
    if (type && type.trim()) {
      match.type = type.trim();
    }
    if (transactionType && transactionType.trim()) {
      if (transactionType === "Credit") match.direction = "CREDIT";
      else if (transactionType === "Debit") match.direction = "DEBIT";
    }
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        match.createdAt.$lte = d;
      }
    }

    const facet = {
      summary: [
        { $match: match },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            totalCredit: {
              $sum: { $cond: [{ $eq: ["$direction", "CREDIT"] }, "$amount", 0] },
            },
            totalDebit: {
              $sum: { $cond: [{ $eq: ["$direction", "DEBIT"] }, "$amount", 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRecords: 1,
            totalCredit: { $toString: "$totalCredit" },
            totalDebit: { $toString: "$totalDebit" },
            netBalance: {
              $toString: {
                $subtract: [
                  { $cond: [{ $eq: ["$direction", "CREDIT"] }, { $sum: "$amount" }, 0] },
                  { $cond: [{ $eq: ["$direction", "DEBIT"] }, { $sum: "$amount" }, 0] },
                ],
              },
            },
          },
        },
      ],
      transactions: [
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10)) },
        { $limit: parseInt(limit, 10) },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            memberId: "$user.memberId",
            walletKey: 1,
            direction: 1,
            amount: { $toString: "$amount" },
            description: 1,
            createdAt: 1,
          },
        },
      ],
    };

    const summaryPipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalCredit: {
            $sum: {
              $cond: [
                { $eq: ["$direction", "CREDIT"] },
                { $convert: { input: "$amount", to: "double" } },
                0,
              ],
            },
          },
          totalDebit: {
            $sum: {
              $cond: [
                { $eq: ["$direction", "DEBIT"] },
                { $convert: { input: "$amount", to: "double" } },
                0,
              ],
            },
          },
        },
      },
    ];

    const [summaryResult, transactions, totalCount] = await Promise.all([
      WalletTransaction.aggregate(summaryPipeline),
      WalletTransaction.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10)) },
        { $limit: parseInt(limit, 10) },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            memberId: "$user.memberId",
            amountStr: { $toString: "$amount" },
          },
        },
        {
          $project: {
            memberId: 1,
            walletKey: 1,
            direction: 1,
            amountStr: 1,
            description: 1,
            createdAt: 1,
          },
        },
      ]),
      WalletTransaction.countDocuments(match),
    ]);

    const s = summaryResult[0] || {};
    const totalCredit = (s.totalCredit || 0).toFixed(2);
    const totalDebit = (s.totalDebit || 0).toFixed(2);
    const netBalance = (parseFloat(totalCredit) - parseFloat(totalDebit)).toFixed(2);

    const items = transactions.map((t) => ({
      memberId: t.memberId,
      walletType: t.walletKey,
      creditAmount: t.direction === "CREDIT" ? t.amountStr : "-",
      debitAmount: t.direction === "DEBIT" ? t.amountStr : "-",
      balance: t.direction === "CREDIT" ? t.amountStr : "-" + t.amountStr,
      description: t.description,
      createdAt: t.createdAt,
    }));

    return response.successResponse(
      res,
      {
        summary: {
          totalRecords: s.totalRecords || 0,
          totalCredit,
          totalDebit,
          netBalance,
        },
        transactions: items,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Wallet details retrieved successfully."
    );
  } catch (err) {
    console.error("Error in walletDetails:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/member-balance
 * List users with available balance > 0, sorted by balance DESC
 */
const memberBalance = async (req, res) => {
  try {
    const {
      memberId,
      fromDate,
      toDate,
      walletKey,
      page = 1,
      limit = 20,
    } = req.query;

    const key = (walletKey || MAIN_KEY).toString().trim().toUpperCase() || MAIN_KEY;
    const balancePath = key === MAIN_KEY ? "balance" : `clubBalances.${key}`;

    const walletMatch = { [balancePath]: { $gt: 0 } };
    if (memberId && memberId.trim()) {
      const user = await User.findOne({ memberId: memberId.trim() }).select("_id").lean();
      if (user) walletMatch.userId = user._id;
      else walletMatch.userId = new mongoose.Types.ObjectId(0);
    }

    const [wallets, totalCount, sumResult] = await Promise.all([
      Wallet.find(walletMatch)
        .sort({ [balancePath]: -1 })
        .skip(Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10)))
        .limit(parseInt(limit, 10))
        .populate("userId", "memberId name")
        .lean(),
      Wallet.countDocuments(walletMatch),
      key === MAIN_KEY
        ? Wallet.aggregate([
            { $match: walletMatch },
            { $group: { _id: null, total: { $sum: { $toDouble: "$balance" } } } },
          ])
        : Wallet.aggregate([
            { $match: walletMatch },
            {
              $project: {
                val: {
                  $reduce: {
                    input: { $objectToArray: { $ifNull: ["$clubBalances", {}] } },
                    initialValue: 0,
                    in: {
                      $cond: [
                        { $eq: ["$$this.k", key] },
                        { $add: ["$$value", { $toDouble: "$$this.v" }] },
                        "$$value",
                      ],
                    },
                  },
                },
              },
            },
            { $group: { _id: null, total: { $sum: "$val" } } },
          ]),
    ]);

    const items = (wallets || []).map((w) => {
      const bal = key === MAIN_KEY
        ? w.balance?.toString?.() || "0"
        : (w.clubBalances?.get?.(key) || w.clubBalances?.[key])?.toString?.() || "0";
      return {
        memberId: w.userId?.memberId || w.userId,
        userName: w.userId?.name || "-",
        walletName: key,
        availableBalance: bal,
      };
    });

    const totalAvail = (sumResult[0]?.total || 0).toFixed(2);

    return response.successResponse(
      res,
      {
        summary: {
          totalRecords: totalCount,
          totalAvailableBalance: totalAvail,
        },
        memberBalances: items,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Member balance retrieved successfully."
    );
  } catch (err) {
    console.error("Error in memberBalance:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/transfer-report
 * User-to-user transfers (TRANSFER and ADMIN_TRANSFER)
 */
const transferReport = async (req, res) => {
  try {
    const {
      fromMemberId,
      toMemberId,
      walletKey,
      transferType,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { type: { $in: ["TRANSFER", "ADMIN_TRANSFER"] }, direction: "DEBIT" };
    if (fromMemberId && fromMemberId.trim()) {
      const user = await User.findOne({ memberId: fromMemberId.trim() }).select("_id").lean();
      if (user) query.userId = user._id;
      else query.userId = new mongoose.Types.ObjectId(0);
    }
    if (walletKey && walletKey.trim()) {
      query.walletKey = walletKey.trim().toUpperCase();
    }
    if (transferType === "User Transfer") query.type = "TRANSFER";
    else if (transferType === "Admin Transfer") query.type = "ADMIN_TRANSFER";
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        query.createdAt.$lte = d;
      }
    }

    const skip = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
    const [debitTxs, totalCount, summaryAgg] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("userId", "memberId name")
        .lean(),
      WalletTransaction.countDocuments(query),
      WalletTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: {
                $convert: {
                  input: "$amount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
            totalUserTransferAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "TRANSFER"] },
                  {
                    $convert: {
                      input: "$amount",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  0,
                ],
              },
            },
            totalAdminTransferAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "ADMIN_TRANSFER"] },
                  {
                    $convert: {
                      input: "$amount",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summaryRow = summaryAgg?.[0] || {};
    const totalAmount = (summaryRow.totalAmount || 0).toFixed(2);
    const totalUserTransferAmount = (summaryRow.totalUserTransferAmount || 0).toFixed(2);
    const totalAdminTransferAmount = (summaryRow.totalAdminTransferAmount || 0).toFixed(2);

    const items = [];
    for (const d of debitTxs) {
      const reqIdBase = d.requestId?.replace(/:credit$/, "") || d.requestId;
      const creditTx = await WalletTransaction.findOne({
        requestId: reqIdBase + ":credit",
      })
        .populate("userId", "memberId name")
        .lean();
      const fromUser = d.userId;
      const toUser = creditTx?.userId;
      let activationTriggered = false;
      const toUserId = toUser?._id || toUser?.id;
      if (toUserId && d.walletKey === "MAIN") {
        const txTime = d.createdAt ? new Date(d.createdAt).getTime() : 0;
        const windowStart = new Date(txTime - 60000);
        const windowEnd = new Date(txTime + 60000);
        const activationDebit = await WalletTransaction.findOne({
          userId: toUserId,
          type: "ACTIVATION",
          direction: "DEBIT",
          createdAt: { $gte: windowStart, $lte: windowEnd },
        }).lean();
        activationTriggered = !!activationDebit;
      }
      items.push({
        fromUser: fromUser?.memberId
          ? `${fromUser.memberId} (${fromUser.name || ""})`
          : d.userId,
        toUser: toUser?.memberId
          ? `${toUser.memberId} (${toUser.name || ""})`
          : "—",
        walletType: d.walletKey,
        amount: d.amount?.toString?.() || "0",
        transferType: d.type === "ADMIN_TRANSFER" ? "Admin Transfer" : "User Transfer",
        activationTriggered,
        createdAt: d.createdAt,
      });
    }

    let finalItems = items;
    if (toMemberId && toMemberId.trim()) {
      const toUser = await User.findOne({ memberId: toMemberId.trim() }).select("memberId name").lean();
      if (toUser) {
        finalItems = items.filter((i) => String(i.toUser).includes(toUser.memberId));
      }
    }

    return response.successResponse(
      res,
      {
        transfers: finalItems,
        summary: {
          totalTransfers: totalCount,
          totalAmount,
          totalUserTransferAmount,
          totalAdminTransferAmount,
        },
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Transfer report retrieved successfully."
    );
  } catch (err) {
    console.error("Error in transferReport:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/admin/wallet-management/user-activation-stats?userId=XXX
 * Returns activation status, total commission distributed for a user
 */
const getUserActivationStats = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "userId is required" },
        "userId is required",
        400
      );
    }
    const uid = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(uid).select("status isPaid memberId").lean();
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404
      );
    }
    const activationStatus = user.status === 1 && user.isPaid === true ? "Active" : user.status === 4 ? "Pending" : "Inactive";
    let totalCommissionDistributed = "0.00";

    const activationDebit = await WalletTransaction.findOne({
      userId: uid,
      type: "ACTIVATION",
      direction: "DEBIT",
    }).lean();
    if (activationDebit) {
      const requestId = activationDebit.requestId || "";
      const parts = requestId.split(":");
      const eventId = parts[1];
      const activatedUserId = parts[2];
      if (eventId && activatedUserId) {
        const levelSum = await WalletTransaction.aggregate([
          {
            $match: {
              type: "LEVEL_INCOME",
              direction: "CREDIT",
              requestId: new RegExp(`^level:${eventId}:${activatedUserId}:`),
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        totalCommissionDistributed = (levelSum[0]?.total ? parseFloat(levelSum[0].total.toString()) : 0).toFixed(2);
      }
    }
    return response.successResponse(
      res,
      {
        activationStatus,
        totalCommissionDistributed,
      },
      "User activation stats retrieved."
    );
  } catch (err) {
    console.error("Error in getUserActivationStats:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getWalletTypes,
  resolveMember,
  getBalance,
  adminAdjust,
  adminTransfer,
  listAdminTransactions,
  walletDetails,
  memberBalance,
  transferReport,
  getUserActivationStats,
};
