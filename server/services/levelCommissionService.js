/**
 * Level Commission Service - Hardened
 * Transfer-based activation only. Commission from activationFee. No burn.
 */

const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../models/User");
const WalletSettings = require("../models/WalletSettings");
const WalletTransaction = require("../models/WalletTransaction");
const Wallet = require("../models/Wallet");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const { debitMainWallet, getOrCreateWallet } = require("./walletService");
const { distributeLevelIncome, getEligibleUplineChain } = require("./incomeService");
const { onUserBecameActive } = require("./userStatusTransitionService");
const { checkActivatedUserForRank1, checkUplinesRankOnActivation } = require("./rankService");
const { buildTransactionDescription, formatAmountForDescription } = require("../utils/transactionDescriptionEngine");
const { toCents } = require("../utils/financialMath");

async function performActivationAndLevelDistribution(activatedUserId, options = {}) {
  const { session } = options;

  if (!session) throw new Error("levelCommissionService requires session for atomic execution");
  if (!activatedUserId || !mongoose.Types.ObjectId.isValid(activatedUserId)) {
    throw new Error("Invalid activatedUserId for activation");
  }

  const settings = await WalletSettings.findOne().session(session).lean();
  if (!settings) throw new Error("WalletSettings not found");

  const registrationFeeNum = Number(settings.registrationFee) || 0;
  const registrationFeeStr = registrationFeeNum.toFixed(2);

  if (registrationFeeNum <= 0) {
    await User.findByIdAndUpdate(activatedUserId, { $set: { status: 1, isPaid: true } }, { session });
    await onUserBecameActive(activatedUserId, session);
    await checkActivatedUserForRank1(activatedUserId, { session });
    return {
      totalDistributed: "0.00",
      levelBreakdown: [],
    };
  }

  await getOrCreateWallet(activatedUserId, session);

  const activationEventId = crypto.randomUUID();

  const existingActivationDebit = await WalletTransaction.findOne({
    userId: activatedUserId,
    type: "ACTIVATION",
    direction: "DEBIT",
  })
    .session(session)
    .lean();

  if (existingActivationDebit) {
    const prevLevelTxs = await WalletTransaction.find({
      type: "LEVEL_INCOME",
      direction: "CREDIT",
      requestId: new RegExp(`^level:[^:]+:${activatedUserId}:`),
    })
      .session(session)
      .lean();
    let prevTotal = 0;
    for (const lt of prevLevelTxs) prevTotal += parseFloat(lt.amount?.toString?.() || "0");
    return {
      totalDistributed: prevTotal.toFixed(2),
      levelBreakdown: [],
    };
  }

  const amtStr = formatAmountForDescription(registrationFeeStr);

  const activationDebitDesc = buildTransactionDescription("ACTIVATION_DEBIT", {
    amount: amtStr,
  });
  const feeReqId = `activation:${activationEventId}:${activatedUserId}:MAIN`;
  await debitMainWallet(activatedUserId, registrationFeeStr, {
    type: "ACTIVATION",
    requestId: feeReqId,
    description: activationDebitDesc,
    session,
  });

  const remainingAmountCentsRef = { value: toCents(registrationFeeStr) };
  const levelResult = await distributeLevelIncome(activatedUserId, registrationFeeStr, {
    session,
    activationEventId,
    remainingAmountCentsRef,
  });

  const levelBreakdownDocs = (levelResult.levelBreakdown || []).map((lb) => ({
    levelNumber: lb.levelNumber,
    walletKey: lb.walletKey,
    commissionPercent: lb.commissionPercent,
    sponsorId: lb.sponsorId,
    sponsorMemberId: lb.sponsorMemberId,
    amount: lb.amount,
  }));

  await User.findByIdAndUpdate(activatedUserId, { $set: { status: 1, isPaid: true } }, { session });
  await onUserBecameActive(activatedUserId, session);

  // QA Q2/Q24: Check activated user for Rank 1 (wallet setting conditions)
  await checkActivatedUserForRank1(activatedUserId, { session });

  return {
    totalDistributed: levelResult.totalDistributed || "0.00",
    levelBreakdown: levelBreakdownDocs,
  };
}

async function maybeTriggerWalletActivation(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { activated: false, totalDistributed: "0.00" };
  }

  let result = { activated: false, totalDistributed: "0.00" };

  const runTx = async (session) => {
    const user = await User.findById(userId).select("status isPaid").session(session).lean();
    const settings = await WalletSettings.findOne().session(session).lean();
    const existingActivationDebit = await WalletTransaction.findOne({
      userId,
      type: "ACTIVATION",
      direction: "DEBIT",
    })
      .session(session)
      .lean();
    if (!user || user.status !== 4 || user.isPaid === true || existingActivationDebit)
      return { activated: false };

    const registrationFee = Number(settings?.registrationFee) || 0;
    if (registrationFee <= 0) return { activated: false };

    const wallet = await Wallet.findOne({ userId }).session(session).lean();
    const balance = wallet?.balance ? parseFloat(wallet.balance.toString()) : 0;
    if (balance < registrationFee) return { activated: false };

    const activationResult = await performActivationAndLevelDistribution(userId, { session });
    return {
      activated: true,
      totalDistributed: activationResult.totalDistributed,
    };
  };

  result = await runWithTransactionRetry(runTx);
  // QA Q7: Check uplines for rank upgrade in background (non-blocking)
  if (result.activated) {
    checkUplinesRankOnActivation(userId);
  }
  return result;
}

module.exports = {
  performActivationAndLevelDistribution,
  maybeTriggerWalletActivation,
};
