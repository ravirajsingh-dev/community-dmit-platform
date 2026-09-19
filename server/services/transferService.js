const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const {
  creditMainWallet,
  debitMainWallet,
  debitClubWallet,
  getOrCreateWallet,
  validateRequestId,
} = require("./walletService");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const { buildTransactionDescription, formatAmountForDescription } = require("../utils/transactionDescriptionEngine");

/**
 * Transfer MAIN balance from one user to another.
 * Idempotent: transfer:<uuid>:<fromUserId>:MAIN (debit), requestId:credit (credit).
 */
async function transferMainToMain(fromUserId, toUserId, amount, options = {}) {
  const { requestId, session: extSession = null, fromMemberId, fromUserName, toMemberId, toUserName, isAdminTransfer } = options;
  if (!requestId || typeof requestId !== "string" || !requestId.trim())
    throw new Error("requestId (UUID) is required");
  const uuid = requestId.trim();
  if (
    !require("./walletService").validateRequestId(uuid) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    throw new Error("requestId must be a valid UUID");
  }
  if (fromUserId.equals && fromUserId.equals(toUserId))
    throw new Error("Cannot transfer to self");

  const amtNum = parseFloat(String(amount));
  if (!isAdminTransfer) {
    const settings = await WalletSettings.getOrCreateSettings();
    const mainMin = settings?.mainMinWithdrawal;
    const mainMax = settings?.mainMaxWithdrawal;
    if (mainMin != null && mainMin > 0 && amtNum < mainMin)
      throw new Error(`Minimum withdrawal from main wallet is ₹${mainMin}`);
    if (mainMax != null && mainMax > 0 && amtNum > mainMax)
      throw new Error(`Maximum withdrawal from main wallet is ₹${mainMax}`);
  }

  const amtStr = formatAmountForDescription(amount);
  const debitDesc = buildTransactionDescription("TRANSFER_DEBIT", {
    amount: amtStr,
    toMemberId: toMemberId ?? String(toUserId),
    toUserName: toUserName ?? "—",
  });
  const creditDesc = buildTransactionDescription("TRANSFER_CREDIT", {
    amount: amtStr,
    fromMemberId: fromMemberId ?? String(fromUserId),
    fromUserName: fromUserName ?? "—",
  });

  const debitReq = `transfer:${uuid}:${fromUserId}:MAIN`;
  const creditReq = debitReq + ":credit";

  const runTx = async (session) => {
    await getOrCreateWallet(toUserId, session);
    const debitResult = await debitMainWallet(fromUserId, amount, {
      type: "TRANSFER",
      requestId: debitReq,
      description: debitDesc,
      session,
    });
    if (debitResult.idempotent) {
      const WalletTransaction = require("../models/WalletTransaction");
      const creditExisting = await WalletTransaction.findOne({
        requestId: creditReq,
      })
        .session(session)
        .lean();
      const Wallet = require("../models/Wallet");
      const toWallet = await Wallet.findOne({ userId: toUserId })
        .session(session)
        .lean();
      return {
        fromWallet: debitResult.wallet,
        toWallet: toWallet || {
          balance: "0",
          clubBalances: {},
          totalBalance: "0",
        },
        debitTx: debitResult.transaction,
        creditTx: creditExisting,
        idempotent: true,
      };
    }
    const creditResult = await creditMainWallet(toUserId, amount, {
      type: "TRANSFER",
      requestId: creditReq,
      description: creditDesc,
      session,
    });
    return {
      fromWallet: debitResult.wallet,
      toWallet: creditResult.wallet,
      debitTx: debitResult.transaction,
      creditTx: creditResult.transaction,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

/**
 * Transfer club balance to MAIN for same user.
 * Idempotent: transfer:<uuid>:<userId>:<clubKey> (debit), requestId:credit (credit).
 */
async function transferClubToMain(userId, clubKey, amount, options = {}) {
  const { requestId, session: extSession = null } = options;
  if (!requestId || typeof requestId !== "string" || !requestId.trim())
    throw new Error("requestId (UUID) is required");
  const uuid = requestId.trim();
  const { validateRequestId: valReqId } = require("./walletService");
  if (
    !valReqId(uuid) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    throw new Error("requestId must be a valid UUID");
  }

  const key = String(clubKey).trim().toUpperCase();

  const settings = await WalletSettings.getOrCreateSettings();
  const clubs = settings.clubs || [];
  const club = clubs.find(
    (c) => (c.walletKey || "").trim().toUpperCase() === key,
  );
  if (club) {
    const minWithdraw = club.minWithdrawal ?? club.minTransfer ?? 0;
    const maxWithdraw = club.maxWithdrawal ?? club.maxTransfer ?? 0;
    const amtNum = parseFloat(String(amount));
    const clubName = club.name || key;
    if (minWithdraw > 0 && amtNum < minWithdraw)
      throw new Error(`Minimum withdrawal for ${clubName} club is ₹${minWithdraw}`);
    if (maxWithdraw > 0 && amtNum > maxWithdraw)
      throw new Error(`Maximum withdrawal for ${clubName} club is ₹${maxWithdraw}`);
  }

  const amtStr = formatAmountForDescription(amount);
  const debitDesc = buildTransactionDescription("CLUB_TO_MAIN_DEBIT", {
    amount: amtStr,
    clubKey: key,
  });
  const creditDesc = buildTransactionDescription("CLUB_TO_MAIN_CREDIT", {
    amount: amtStr,
    clubKey: key,
  });

  const debitReq = `transfer:${uuid}:${userId}:${key}`;
  const creditReq = debitReq + ":credit";

  const runTx = async (session) => {
    const debitResult = await debitClubWallet(userId, key, amount, {
      type: "TRANSFER",
      requestId: debitReq,
      description: debitDesc,
      session,
    });
    if (debitResult.idempotent) {
      const WalletTransaction = require("../models/WalletTransaction");
      const creditExisting = await WalletTransaction.findOne({
        requestId: creditReq,
      })
        .session(session)
        .lean();
      const Wallet = require("../models/Wallet");
      const mainWallet = await Wallet.findOne({ userId: userId })
        .session(session)
        .lean();
      return {
        clubWallet: debitResult.wallet,
        mainWallet: mainWallet || {
          balance: "0",
          clubBalances: {},
          totalBalance: "0",
        },
        debitTx: debitResult.transaction,
        creditTx: creditExisting,
        idempotent: true,
      };
    }
    const creditResult = await creditMainWallet(userId, amount, {
      type: "TRANSFER",
      requestId: creditReq,
      description: creditDesc,
      session,
    });
    return {
      clubWallet: debitResult.wallet,
      mainWallet: creditResult.wallet,
      debitTx: debitResult.transaction,
      creditTx: creditResult.transaction,
      idempotent: false,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

/**
 * Admin-initiated user-to-user transfer.
 * Supports MAIN and club wallets. Uses type ADMIN_TRANSFER, saves adminId.
 * Idempotent: admin:transfer:uuid (debit), admin:transfer:uuid:credit (credit).
 */
async function adminTransferUserToUser(fromUserId, toUserId, walletKey, amount, options = {}) {
  const {
    requestId,
    adminId,
    fromMemberId,
    fromUserName,
    toMemberId,
    toUserName,
    session: extSession = null,
  } = options;
  if (!requestId || typeof requestId !== "string" || !requestId.trim())
    throw new Error("requestId (UUID) is required");
  if (!adminId) throw new Error("adminId is required");
  const uuid = requestId.trim();
  if (
    !validateRequestId(uuid) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
  ) {
    throw new Error("requestId must be a valid UUID");
  }
  const fromId = fromUserId instanceof mongoose.Types.ObjectId ? fromUserId : new mongoose.Types.ObjectId(fromUserId);
  const toId = toUserId instanceof mongoose.Types.ObjectId ? toUserId : new mongoose.Types.ObjectId(toUserId);
  if (fromId.equals(toId)) throw new Error("Cannot transfer to self");

  const key = String(walletKey || "MAIN").trim().toUpperCase();
  const amtStr = formatAmountForDescription(amount);
  const debitDesc = buildTransactionDescription("ADMIN_TRANSFER_DEBIT", {
    amount: amtStr,
    toMemberId: toMemberId ?? String(toId),
    toUserName: toUserName ?? "—",
  });
  const creditDesc = buildTransactionDescription("ADMIN_TRANSFER_CREDIT", {
    amount: amtStr,
    fromMemberId: fromMemberId ?? String(fromId),
    fromUserName: fromUserName ?? "—",
  });

  const debitReq = `admin:transfer:${uuid}`;
  const creditReq = debitReq + ":credit";

  const runTx = async (session) => {
    await getOrCreateWallet(toId, session);

    let debitResult;
    let creditResult;

    if (key === "MAIN") {
      debitResult = await debitMainWallet(fromId, amount, {
        type: "ADMIN_TRANSFER",
        requestId: debitReq,
        description: debitDesc,
        adminId,
        session,
      });
      if (debitResult.idempotent) {
        const toWallet = await Wallet.findOne({ userId: toId }).session(session).lean();
        const creditExisting = await WalletTransaction.findOne({ requestId: creditReq })
          .session(session)
          .lean();
        return {
          fromWallet: debitResult.wallet,
          toWallet: toWallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
          debitTx: debitResult.transaction,
          creditTx: creditExisting,
        };
      }
      creditResult = await creditMainWallet(toId, amount, {
        type: "ADMIN_TRANSFER",
        requestId: creditReq,
        description: creditDesc,
        adminId,
        session,
      });
    } else {
      debitResult = await debitClubWallet(fromId, key, amount, {
        type: "ADMIN_TRANSFER",
        requestId: debitReq,
        description: debitDesc,
        adminId,
        session,
      });
      if (debitResult.idempotent) {
        const toWallet = await Wallet.findOne({ userId: toId }).session(session).lean();
        const creditExisting = await WalletTransaction.findOne({ requestId: creditReq })
          .session(session)
          .lean();
        return {
          fromWallet: debitResult.wallet,
          toWallet: toWallet || { balance: "0", clubBalances: {}, totalBalance: "0" },
          debitTx: debitResult.transaction,
          creditTx: creditExisting,
        };
      }
      creditResult = await creditClubWallet(toId, key, amount, {
        type: "ADMIN_TRANSFER",
        requestId: creditReq,
        description: creditDesc,
        adminId,
        session,
      });
    }

    return {
      fromWallet: debitResult.wallet,
      toWallet: creditResult.wallet,
      debitTx: debitResult.transaction,
      creditTx: creditResult.transaction,
    };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

module.exports = {
  transferMainToMain,
  transferClubToMain,
  adminTransferUserToUser,
};
