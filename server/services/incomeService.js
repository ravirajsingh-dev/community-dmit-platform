/**
 * Income Service - Hardened
 * Level, Rank, Club income engines. Integer cents for all commission math.
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const WalletSettings = require("../models/WalletSettings");
const { creditMainWallet, creditClubWallet, getOrCreateWallet } = require("./walletService");
const { runWithTransactionRetry } = require("../utils/transactionRetry");
const { toCents, computeCommissionCents } = require("../utils/financialMath");
const { buildTransactionDescription } = require("../utils/transactionDescriptionEngine");

/**
 * Walk upline via referredBy. Return sponsors with level numbers.
 * Break when sponsor inactive (status !== 1 or isPaid !== true).
 */
async function getEligibleUplineChain(activatedUserId, maxLevels, session = null) {
  const opts = session ? { session } : {};
  const chain = [];
  let currentId = activatedUserId;

  for (let levelNum = 1; levelNum <= maxLevels; levelNum++) {
    const user = await User.findById(currentId).select("referredBy status isPaid memberId").setOptions(opts).lean();
    if (!user || !user.referredBy) break;
    const sponsor = await User.findById(user.referredBy).select("_id memberId status isPaid").setOptions(opts).lean();
    if (!sponsor) break;
    if (sponsor.status !== 1 || sponsor.isPaid !== true) {
      // Sponsor is not eligible for commission (status must be 1 AND isPaid must be true).
      // Skip and keep walking upwards in the upline chain.
      if (process.env.DEBUG_LEVEL_COMMISSION_SKIP_LOGS === "1") {
        console.log(`Skipping sponsor ${sponsor._id} (inactive/unpaid)`);
      }
      currentId = sponsor._id;
      continue;
    }
    chain.push({ levelNumber: levelNum, sponsorId: sponsor._id, sponsorMemberId: sponsor.memberId || "" });
    currentId = sponsor._id;
  }
  return chain;
}

/**
 * LEVEL INCOME ENGINE
 * Integer cents only. Idempotent: level:<eventId>:<userId>:<walletKey>
 * Commission comes from remainingAmountCentsRef; never mints. Stops when remaining <= 0.
 */
async function distributeLevelIncome(activatedUserId, registrationFeeAmount, options = {}) {
  const { session: extSession = null, activationEventId, remainingAmountCentsRef } = options;
  if (!extSession) throw new Error("incomeService.distributeLevelIncome requires session");

  const eventId = activationEventId || require("crypto").randomUUID();

  const settings = await WalletSettings.findOne().session(extSession).lean();
  if (!settings) throw new Error("WalletSettings not found");

  const levels = settings.levels || [];
  if (levels.length === 0) return { totalDistributed: "0.00", levelBreakdown: [] };

  const feeCents = toCents(registrationFeeAmount);
  if (feeCents <= 0) return { totalDistributed: "0.00", levelBreakdown: [] };

  const remainingRef = remainingAmountCentsRef || { value: feeCents };

  const activatedUser = await User.findById(activatedUserId).select("memberId name").setOptions({ session: extSession }).lean();
  const fromMemberId = activatedUser?.memberId ?? String(activatedUserId);
  const fromUserName = activatedUser?.name ?? "—";

  const chain = await getEligibleUplineChain(activatedUserId, levels.length, extSession);
  const levelBreakdown = [];
  let totalCents = 0;

  for (const { levelNumber, sponsorId, sponsorMemberId } of chain) {
    if (remainingRef.value <= 0) break;

    const levelConfig = levels.find((l) => l.levelNumber === levelNumber) || levels[levelNumber - 1];
    const percent = levelConfig?.commissionPercent ?? 0;
    if (percent <= 0) continue;

    let commissionCents = computeCommissionCents(feeCents, percent);
    commissionCents = Math.min(commissionCents, remainingRef.value);
    if (commissionCents <= 0) continue;

    remainingRef.value -= commissionCents;
    totalCents += commissionCents;

    const walletKey = (levelConfig?.walletKey || `L${levelNumber}`).trim().toUpperCase();
    const requestId = `level:${eventId}:${activatedUserId}:${walletKey}`;
    const amountStr = (commissionCents / 100).toFixed(2);
    const description = buildTransactionDescription("LEVEL_INCOME", {
      amount: amountStr,
      level: levelNumber,
      fromMemberId,
      fromUserName,
    });

    await getOrCreateWallet(sponsorId, extSession);
    await creditMainWallet(sponsorId, amountStr, {
      type: "LEVEL_INCOME",
      requestId,
      description,
      session: extSession,
    });

    levelBreakdown.push({
      levelNumber,
      walletKey: levelConfig?.walletKey || `LEVEL_${levelNumber}`,
      commissionPercent: percent,
      sponsorId,
      sponsorMemberId,
      amount: amountStr,
    });
  }

  const totalDistributed = (totalCents / 100).toFixed(2);
  return { totalDistributed, levelBreakdown };
}

/**
 * RANK INCOME ENGINE
 * Integer cents. Idempotent: rank:<eventId>:<userId>:<walletKey>
 */
async function distributeRankIncome(userId, rankCode, amount, options = {}) {
  const { requestId, eventId, session: extSession = null } = options;
  const crypto = require("crypto");
  const evId = eventId || crypto.randomUUID();
  const id = requestId || `rank:${evId}:${userId}:RANK_${rankCode}`;
  if (!id) throw new Error("requestId or eventId required for rank income idempotency");

  const runTx = async (session) => {
    const settings = await WalletSettings.findOne().session(session).lean();
    if (!settings) throw new Error("WalletSettings not found");

    const ranks = settings.ranks || [];
    const rankConfig = ranks.find((r) => r.rankCode === rankCode);
    const percent = rankConfig?.commissionPercent ?? 0;
    if (percent <= 0) return { credited: "0.00" };

    const amountCents = toCents(amount);
    if (amountCents <= 0) return { credited: "0.00" };

    const commissionCents = computeCommissionCents(amountCents, percent);
    if (commissionCents <= 0) return { credited: "0.00" };

    const amountStr = (commissionCents / 100).toFixed(2);
    const description = buildTransactionDescription("RANK_INCOME", {
      amount: amountStr,
      rankCode,
    });
    await getOrCreateWallet(userId, session);
    await creditMainWallet(userId, amountStr, {
      type: "RANK_INCOME",
      requestId: id,
      description,
      session,
    });
    return { credited: amountStr };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

/**
 * CLUB INCOME ENGINE
 * Integer cents. Idempotent: club:<eventId>:<userId>:<walletKey>
 */
async function distributeClubIncome(userId, clubKey, amount, options = {}) {
  const { requestId, eventId, session: extSession = null } = options;
  const key = String(clubKey).trim().toUpperCase();
  const crypto = require("crypto");
  const evId = eventId || crypto.randomUUID();
  const id = requestId || `club:${evId}:${userId}:${key}`;
  if (!key) throw new Error("clubKey required");

  const runTx = async (session) => {
    const settings = await WalletSettings.findOne().session(session).lean();
    if (!settings) throw new Error("WalletSettings not found");

    const clubs = settings.clubs || [];
    const clubConfig = clubs.find((c) => (c.walletKey || "").trim().toUpperCase() === key);
    const walletKey = clubConfig?.walletKey?.trim().toUpperCase() || key;

    const percent = clubConfig?.commissionPercent ?? 0;
    if (percent <= 0) return { credited: "0.00" };

    const amountCents = toCents(amount);
    if (amountCents <= 0) return { credited: "0.00" };

    const commissionCents = computeCommissionCents(amountCents, percent);
    if (commissionCents <= 0) return { credited: "0.00" };

    const amountStr = (commissionCents / 100).toFixed(2);
    const description = buildTransactionDescription("CLUB_INCOME", {
      amount: amountStr,
      clubKey: walletKey,
    });
    await creditClubWallet(userId, walletKey, amountStr, {
      type: "CLUB_INCOME",
      requestId: id,
      description,
      session,
    });
    return { credited: amountStr };
  };

  if (extSession) return runTx(extSession);
  return runWithTransactionRetry(runTx);
}

module.exports = {
  getEligibleUplineChain,
  distributeLevelIncome,
  distributeRankIncome,
  distributeClubIncome,
};
