const mongoose = require("mongoose");
const response = require("../../../config/response");
const WalletTransaction = require("../../../models/WalletTransaction");
const User = require("../../../models/User");

/**
 * GET /api/admin/level-commission/stats
 * Derived from wallet_transactions (immutable ledger). No LevelCommissionRecord.
 */
const getLevelCommissionStats = async (req, res) => {
  try {
    const [activationAgg, levelAgg] = await Promise.all([
      WalletTransaction.aggregate([
        { $match: { type: "ACTIVATION", direction: "DEBIT" } },
        {
          $group: {
            _id: null,
            totalActivationRevenue: { $sum: "$amount" },
            recordCount: { $sum: 1 },
          },
        },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: "LEVEL_INCOME", direction: "CREDIT" } },
        {
          $group: {
            _id: null,
            totalDistributed: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const activation = activationAgg[0] || {};
    const level = levelAgg[0] || {};

    const totalActivationRevenue = parseFloat(activation.totalActivationRevenue?.toString?.() || "0");
    const totalDistributed = parseFloat(level.totalDistributed?.toString?.() || "0");

    return response.successResponse(
      res,
      {
        totalActivationRevenue: totalActivationRevenue.toFixed(2),
        totalDistributed: totalDistributed.toFixed(2),
        recordCount: activation.recordCount ?? 0,
      },
      "Level commission stats"
    );
  } catch (err) {
    console.error("Level commission stats error:", err);
    return response.errorResponse(res, {}, "Failed to fetch stats", 500);
  }
};

/**
 * Parse requestId to extract activation event info.
 * Format: level:eventId:activatedUserId:walletKey or activation:eventId:activatedUserId:MAIN
 */
function parseRequestId(requestId) {
  if (!requestId || typeof requestId !== "string") return null;
  const parts = requestId.split(":");
  if (parts.length < 3) return null;
  const [prefix, eventId, activatedUserId] = parts;
  if (prefix === "activation" || prefix === "level") {
    return { eventId, activatedUserId };
  }
  return null;
}

/**
 * GET /api/admin/level-commission/history
 * Derived from wallet_transactions. Query: page, limit, userId, newUserId, fromDate, toDate, sponsorMemberId
 */
const getLevelCommissionHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      newUserId,
      fromDate,
      toDate,
      sponsorMemberId,
    } = req.query;

    const skip = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    let activationMatch = { type: "ACTIVATION", direction: "DEBIT" };
    if (newUserId && mongoose.Types.ObjectId.isValid(newUserId)) {
      activationMatch.userId = new mongoose.Types.ObjectId(newUserId);
    }
    if (fromDate || toDate) {
      activationMatch.createdAt = {};
      if (fromDate) activationMatch.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        activationMatch.createdAt.$lte = d;
      }
    }

    let sponsorId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      sponsorId = new mongoose.Types.ObjectId(userId);
    } else if (sponsorMemberId && String(sponsorMemberId).trim()) {
      const sponsor = await User.findOne({ memberId: String(sponsorMemberId).trim().toUpperCase() })
        .select("_id")
        .lean();
      if (sponsor) sponsorId = sponsor._id;
    }

    let activationIds = null;
    if (sponsorId) {
      const levelTxs = await WalletTransaction.find({
        type: "LEVEL_INCOME",
        direction: "CREDIT",
        userId: sponsorId,
      })
        .select("requestId")
        .lean();
      const eventKeys = new Set();
      for (const tx of levelTxs) {
        const parsed = parseRequestId(tx.requestId);
        if (parsed) eventKeys.add(`${parsed.eventId}:${parsed.activatedUserId}`);
      }
      if (eventKeys.size === 0) {
        return response.successResponse(res, {
          records: [],
          pagination: { page: parseInt(page, 10), limit: safeLimit, totalCount: 0, totalPages: 0 },
        }, "Level commission history");
      }
      activationIds = Array.from(eventKeys);
    }

    const activationPipeline = [
      { $match: activationMatch },
      { $sort: { createdAt: -1 } },
    ];

    if (activationIds && activationIds.length > 0) {
      activationPipeline[0].$match.$or = activationIds.map((key) => {
        const [eventId, activatedUserId] = key.split(":");
        return { requestId: new RegExp(`^activation:${eventId}:${activatedUserId}:`) };
      });
    }

    const [activationTxs, totalCount] = await Promise.all([
      WalletTransaction.aggregate([
        ...activationPipeline,
        { $skip: skip },
        { $limit: safeLimit },
      ]),
      activationIds
        ? WalletTransaction.countDocuments({
            ...activationMatch,
            $or: activationIds.map((key) => {
              const [eventId, activatedUserId] = key.split(":");
              return { requestId: new RegExp(`^activation:${eventId}:${activatedUserId}:`) };
            }),
          })
        : WalletTransaction.countDocuments(activationMatch),
    ]);

    // Pre-compute activation keys and user ids for batch queries
    const activationKeyById = new Map();
    const activatedUserIdsSet = new Set();
    for (const act of activationTxs) {
      const parsed = parseRequestId(act.requestId);
      const activatedUserId =
        (parsed?.activatedUserId && parsed.activatedUserId.toString()) ||
        (act.userId && act.userId.toString && act.userId.toString()) ||
        null;
      const eventId = parsed?.eventId;
      if (eventId && activatedUserId) {
        const key = `${eventId}:${activatedUserId}`;
        activationKeyById.set(act._id.toString(), { key, activatedUserId, eventId });
        activatedUserIdsSet.add(activatedUserId);
      }
    }

    // Batch-load all new users for this page
    const activatedUserIds = Array.from(activatedUserIdsSet).map((id) => new mongoose.Types.ObjectId(id));
    const usersById = new Map();
    if (activatedUserIds.length > 0) {
      const users = await User.find({ _id: { $in: activatedUserIds } })
        .select("memberId")
        .lean();
      for (const u of users) {
        usersById.set(u._id.toString(), u);
      }
    }

    // Batch-load all level income transactions for the activations on this page
    const orConditions = [];
    for (const { eventId, activatedUserId } of activationKeyById.values()) {
      orConditions.push({
        requestId: new RegExp(`^level:${eventId}:${activatedUserId}:`),
      });
    }

    const levelTxsByKey = new Map();
    if (orConditions.length > 0) {
      const levelTxs = await WalletTransaction.find({
        type: "LEVEL_INCOME",
        direction: "CREDIT",
        $or: orConditions,
      })
        .populate("userId", "memberId")
        .lean();

      for (const lt of levelTxs) {
        const parsed = parseRequestId(lt.requestId);
        if (!parsed?.eventId || !parsed?.activatedUserId) continue;
        const key = `${parsed.eventId}:${parsed.activatedUserId}`;
        if (!levelTxsByKey.has(key)) levelTxsByKey.set(key, []);
        levelTxsByKey.get(key).push(lt);
      }
    }

    const items = [];
    for (const act of activationTxs) {
      const actIdStr = act._id.toString();
      const parsed = parseRequestId(act.requestId);
      const meta = activationKeyById.get(actIdStr) || {};
      const activatedUserId =
        meta.activatedUserId ||
        (parsed?.activatedUserId && parsed.activatedUserId.toString()) ||
        (act.userId && act.userId.toString && act.userId.toString()) ||
        null;
      const eventId = meta.eventId || parsed?.eventId;
      const regFee = parseFloat(act.amount?.toString?.() || "0");

      let newUserMemberId = "-";
      if (activatedUserId) {
        const u = usersById.get(activatedUserId);
        newUserMemberId = u?.memberId || activatedUserId;
      }

      let totalDistributed = 0;
      const levelBreakdown = [];
      if (eventId && activatedUserId) {
        const key = `${eventId}:${activatedUserId}`;
        const levelTxsForActivation = levelTxsByKey.get(key) || [];
        for (const lt of levelTxsForActivation) {
          const amt = parseFloat(lt.amount?.toString?.() || "0");
          totalDistributed += amt;
          const descMatch = (lt.description || "").match(/Level (\d+)/);
          levelBreakdown.push({
            levelNumber: parseInt(descMatch?.[1] || "0", 10),
            walletKey: lt.walletKey || "MAIN",
            commissionPercent: 0,
            sponsorId: lt.userId?._id,
            sponsorMemberId: lt.userId?.memberId || "-",
            amount: amt.toFixed(2),
          });
        }
      }
      levelBreakdown.sort((a, b) => a.levelNumber - b.levelNumber);

      items.push({
        _id: act._id,
        newUserId: act.userId,
        newUserMemberId,
        registrationFee: regFee.toFixed(2),
        totalDistributed: totalDistributed.toFixed(2),
        levelBreakdown,
        createdAt: act.createdAt,
      });
    }

    return response.successResponse(
      res,
      {
        records: items,
        pagination: {
          page: parseInt(page, 10),
          limit: safeLimit,
          totalCount,
          totalPages: Math.ceil(totalCount / safeLimit),
        },
      },
      "Level commission history"
    );
  } catch (err) {
    console.error("Level commission history error:", err);
    return response.errorResponse(res, {}, "Failed to fetch history", 500);
  }
};

module.exports = {
  getLevelCommissionStats,
  getLevelCommissionHistory,
};
