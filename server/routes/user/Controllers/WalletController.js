const response = require("../../../config/response");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const User = require("../../../models/User");
const WalletTransaction = require("../../../models/WalletTransaction");
const Wallet = require("../../../models/Wallet");
const {
  getWalletDetails,
  getWalletTransactions,
} = require("../../../services/walletService");
const {
  transferMainToMain,
  transferClubToMain,
} = require("../../../services/transferService");
const {
  maybeTriggerWalletActivation,
} = require("../../../services/levelCommissionService");
const WalletSettings = require("../../../models/WalletSettings");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Authentication required" },
        "Authentication required",
        401,
      );
    }
    const details = await getWalletDetails(new mongoose.Types.ObjectId(userId));
    const settings = await WalletSettings.getOrCreateSettings();
    const clubs = (settings.clubs || [])
      .map((c) => ({
        clubKey: (c.walletKey || "").trim().toUpperCase(),
        name: c.name || c.walletKey || "",
        minTransfer: c.minTransfer ?? 0,
        maxTransfer: c.maxTransfer ?? 0,
      }))
      .filter((c) => c.clubKey);
    return response.successResponse(
      res,
      { ...details, availableClubs: clubs },
      "Wallet details",
    );
  } catch (err) {
    console.error("Get wallet error:", err);
    return response.errorResponse(res, {}, "Failed to fetch wallet", 500);
  }
};

const getLevelIncome = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Authentication required" },
        "Authentication required",
        401,
      );
    }
    const { page = 1, limit = 20, fromDate, toDate } = req.query;
    const result = await getWalletTransactions(
      new mongoose.Types.ObjectId(userId),
      {
        page,
        limit,
        type: "LEVEL_INCOME",
        direction: "CREDIT",
        fromDate,
        toDate,
      },
    );
    return response.successResponse(
      res,
      { transactions: result.transactions, pagination: result.pagination },
      "Level income",
    );
  } catch (err) {
    console.error("Get level income error:", err);
    return response.errorResponse(res, {}, "Failed to fetch level income", 500);
  }
};

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Authentication required" },
        "Authentication required",
        401,
      );
    }
    const { page, limit, walletKey, walletType, type, direction, fromDate, toDate } =
      req.query;
    const result = await getWalletTransactions(
      new mongoose.Types.ObjectId(userId),
      {
        page,
        limit,
        walletKey,
        walletType,
        type,
        direction,
        fromDate,
        toDate,
      },
    );
    return response.successResponse(res, result, "Transactions");
  } catch (err) {
    console.error("Get transactions error:", err);
    return response.errorResponse(res, {}, "Failed to fetch transactions", 500);
  }
};

const transfer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400,
    );
  }
  try {
    const userId = req.user.id;
    const { toMemberId, amount, requestId } = req.body;

    const key = typeof requestId === "string" ? requestId.trim() : "";
    if (!key) {
      return response.errorResponse(
        res,
        [{ path: "requestId", msg: "requestId (UUID) is required" }],
        "Validation Error",
        400,
      );
    }
    if (!UUID_REGEX.test(key)) {
      return response.errorResponse(
        res,
        [{ path: "requestId", msg: "requestId must be a valid UUID format" }],
        "Validation Error",
        400,
      );
    }

    if (!toMemberId || amount == null || amount <= 0) {
      return response.errorResponse(
        res,
        [
          {
            path: "toMemberId",
            msg: "toMemberId and positive amount are required",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const fromUserId = new mongoose.Types.ObjectId(userId);
    const normalizedToMemberId = String(toMemberId).trim().toUpperCase();

    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId).select("_id memberId status").lean(),
      User.findOne({
        $or: [
          { memberId: normalizedToMemberId },
          {
            _id: mongoose.Types.ObjectId.isValid(toMemberId)
              ? new mongoose.Types.ObjectId(toMemberId)
              : null,
          },
        ].filter((q) => q._id || q.memberId),
      })
        .select("_id memberId name status")
        .lean(),
    ]);

    if (!fromUser || (fromUser.status !== 1 && fromUser.status !== 4)) {
      return response.errorResponse(
        res,
        [{ path: "status", msg: "Your account must be active to transfer" }],
        "Validation Error",
        400,
      );
    }

    if (!toUser) {
      return response.errorResponse(
        res,
        [{ path: "toMemberId", msg: "Recipient not found" }],
        "Recipient not found",
        404,
      );
    }

    if (toUser.status !== 1 && toUser.status !== 4) {
      return response.errorResponse(
        res,
        [{ path: "toMemberId", msg: "Recipient account is inactive" }],
        "Validation Error",
        400,
      );
    }

    const toUserId = toUser._id;
    const isSelfTransfer =
      fromUserId.equals(toUserId) ||
      (fromUser.memberId && fromUser.memberId === (toUser.memberId || ""));

    if (isSelfTransfer) {
      return response.errorResponse(
        res,
        [{ path: "toMemberId", msg: "Cannot transfer to your own account" }],
        "Validation Error",
        400,
      );
    }

    try {
      const result = await transferMainToMain(fromUserId, toUserId, amount, {
        requestId: key,
        fromMemberId: fromUser?.memberId ?? String(fromUserId),
        fromUserName: fromUser?.name ?? "—",
        toMemberId: toUser?.memberId ?? String(toUserId),
        toUserName: toUser?.name ?? "—",
      });
      let activationTriggered = false;
      let activationSummary = null;
      const walletKey = "MAIN";
      if (walletKey === "MAIN" && toUser.status === 4) {
        const activationResult = await maybeTriggerWalletActivation(toUserId);
        activationTriggered = activationResult.activated === true;
        if (activationTriggered) {
          activationSummary = {
            totalDistributed: activationResult.totalDistributed || "0.00",
          };
        }
      }
      return response.successResponse(res, {
        ...result,
        transferSuccess: true,
        activationTriggered,
        activationSummary,
      }, activationTriggered ? "User activated successfully." : "Transfer completed");
    } catch (txErr) {
      if (isDuplicateKeyError(txErr)) {
        const debitReqId = `transfer:${key}:${fromUserId}:MAIN`;
        const debitTx = await WalletTransaction.findOne({
          requestId: debitReqId,
        }).lean();
        if (debitTx && debitTx.userId.toString() === fromUserId.toString()) {
          const creditTx = await WalletTransaction.findOne({
            requestId: debitReqId + ":credit",
          }).lean();
          const fromWallet = await Wallet.findOne({
            userId: fromUserId,
          }).lean();
          const toWallet = await Wallet.findOne({ userId: toUserId }).lean();
          let activationTriggered = false;
          let activationSummary = null;
          const walletKey = "MAIN";
          if (walletKey === "MAIN" && toUser.status === 4) {
            const activationResult = await maybeTriggerWalletActivation(toUserId);
            activationTriggered = activationResult.activated === true;
            if (activationTriggered) {
              activationSummary = {
                totalDistributed: activationResult.totalDistributed || "0.00",
              };
            }
          }
          return response.successResponse(
            res,
            {
              fromWallet: fromWallet || { balance: "0", totalBalance: "0" },
              toWallet: toWallet || { balance: "0", totalBalance: "0" },
              debitTx,
              creditTx: creditTx || null,
              idempotent: true,
              transferSuccess: true,
              activationTriggered,
              activationSummary,
            },
            activationTriggered ? "User activated successfully." : "Transfer completed",
          );
        }
      }
      throw txErr;
    }
  } catch (err) {
    if (err.message === "Insufficient balance") {
      return response.errorResponse(
        res,
        { msg: "Insufficient balance" },
        "Insufficient balance",
        400,
      );
    }
    if (err.message && err.message.startsWith("Invalid amount")) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Validation Error",
        400,
      );
    }
    console.error("Transfer error:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "Transfer failed",
      500,
    );
  }
};

const clubTransfer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400,
    );
  }
  try {
    const userId = req.user.id;
    const { clubKey, amount, requestId } = req.body;

    const key = typeof requestId === "string" ? requestId.trim() : "";
    if (!key) {
      return response.errorResponse(
        res,
        [{ path: "requestId", msg: "requestId (UUID) is required" }],
        "Validation Error",
        400,
      );
    }
    if (!UUID_REGEX.test(key)) {
      return response.errorResponse(
        res,
        [{ path: "requestId", msg: "requestId must be a valid UUID format" }],
        "Validation Error",
        400,
      );
    }

    if (!clubKey || amount == null || amount <= 0) {
      return response.errorResponse(
        res,
        { msg: "clubKey and positive amount are required" },
        "Validation Error",
        400,
      );
    }

    const settings = await WalletSettings.getOrCreateSettings();
    const clubs = settings.clubs || [];
    const clubKeyVal = String(clubKey).trim().toUpperCase();
    const club = clubs.find(
      (c) => (c.walletKey || "").trim().toUpperCase() === clubKeyVal,
    );

    if (!club) {
      return response.errorResponse(
        res,
        { msg: "Invalid club" },
        "Invalid club",
        400,
      );
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    try {
      const result = await transferClubToMain(userIdObj, clubKeyVal, amount, {
        requestId: key,
      });
      return response.successResponse(res, result, "Club transfer completed");
    } catch (txErr) {
      if (isDuplicateKeyError(txErr)) {
        const debitReqId = `transfer:${key}:${userIdObj}:${clubKeyVal}`;
        const debitTx = await WalletTransaction.findOne({
          requestId: debitReqId,
        }).lean();
        if (debitTx && debitTx.userId.toString() === userIdObj.toString()) {
          const creditTx = await WalletTransaction.findOne({
            requestId: debitReqId + ":credit",
          }).lean();
          const wallet = await Wallet.findOne({ userId: userIdObj }).lean();
          return response.successResponse(
            res,
            {
              clubWallet: debitTx ? { clubKey: clubKeyVal } : null,
              mainWallet: wallet || { balance: "0", totalBalance: "0" },
              debitTx,
              creditTx: creditTx || null,
              idempotent: true,
            },
            "Club transfer completed",
          );
        }
      }
      throw txErr;
    }
  } catch (err) {
    if (err.message === "Insufficient balance") {
      return response.errorResponse(
        res,
        { msg: "Insufficient balance" },
        "Insufficient balance",
        400,
      );
    }
    if (
      (err.message && err.message.startsWith("Invalid amount")) ||
      (err.message && err.message.startsWith("Minimum transfer")) ||
      (err.message && err.message.startsWith("Maximum transfer"))
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Validation Error",
        400,
      );
    }
    console.error("Club transfer error:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "Club transfer failed",
      500,
    );
  }
};

module.exports = {
  getWallet,
  getTransactions,
  getLevelIncome,
  transfer,
  clubTransfer,
};
