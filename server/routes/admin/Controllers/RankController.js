/**
 * Admin Rank Controller
 * QA Q21: Alag page - /admin/ranks
 * QA Q8: Admin override - manually assign rank
 *
 * GET /api/admin/ranks/users?rankCode=&page=&limit=
 * POST /api/admin/ranks/assign
 * GET /api/admin/ranks/summary
 */

const mongoose = require("mongoose");
const User = require("../../../models/User");
const WalletSettings = require("../../../models/WalletSettings");
const response = require("../../../config/response");

/**
 * GET /api/admin/ranks/users
 * List users filtered by rankCode
 */
async function listUsersByRank(req, res) {
  try {
    const { rankCode, page = 1, limit = 20, search, memberId, phone, name } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const match = { status: 1, isPaid: true };
    if (rankCode != null && rankCode !== "" && rankCode !== "all") {
      const code = parseInt(rankCode, 10);
      if (!Number.isNaN(code)) {
        match.rankCode = code;
      }
    }

    const buildRegex = (value) =>
      value
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const andConditions = [];
    if (memberId != null && memberId.toString().trim()) {
      const s = buildRegex(memberId.toString());
      andConditions.push({ memberId: new RegExp(s, "i") });
    }
    if (phone != null && phone.toString().trim()) {
      const s = buildRegex(phone.toString());
      andConditions.push({ phone: new RegExp(s, "i") });
    }
    if (name != null && name.toString().trim()) {
      const s = buildRegex(name.toString());
      andConditions.push({ name: new RegExp(s, "i") });
    }

    if (andConditions.length > 0) {
      match.$and = andConditions;
    } else if (search && search.trim()) {
      const s = buildRegex(search.toString());
      match.$or = [
        { memberId: new RegExp(s, "i") },
        { name: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(match)
        .select("memberId name phone email rankCode directCount totalDownlineCount createdAt")
        .sort({ rankCode: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(match),
    ]);

    const settings = await WalletSettings.getOrCreateSettings();
    const rankMap = new Map((settings.ranks || []).map((r) => [r.rankCode, r.name]));

    const rows = users.map((u) => ({
      _id: u._id,
      memberId: u.memberId,
      name: u.name,
      phone: u.phone,
      email: u.email,
      rankCode: u.rankCode,
      rankName: rankMap.get(u.rankCode) || `RANK_${u.rankCode}`,
      directCount: u.directCount ?? 0,
      totalDownlineCount: u.totalDownlineCount ?? 0,
      createdAt: u.createdAt,
    }));

    return response.successResponse(res, {
      users: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      ranks: (settings.ranks || []).map((r) => ({ rankCode: r.rankCode, name: r.name })),
    });
  } catch (err) {
    console.error("listUsersByRank error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

/**
 * GET /api/admin/ranks/summary
 * Count users per rank
 */
async function getRankSummary(req, res) {
  try {
    const settings = await WalletSettings.getOrCreateSettings();
    const ranks = settings.ranks || [];

    const summary = await User.aggregate([
      { $match: { status: 1, isPaid: true, rankCode: { $in: ranks.map((r) => r.rankCode) } } },
      { $group: { _id: "$rankCode", count: { $sum: 1 } } },
    ]);

    const rankMap = new Map(ranks.map((r) => [r.rankCode, r.name]));
    const result = ranks.map((r) => ({
      rankCode: r.rankCode,
      name: r.name,
      userCount: summary.find((s) => s._id === r.rankCode)?.count ?? 0,
    }));

    return response.successResponse(res, { summary: result });
  } catch (err) {
    console.error("getRankSummary error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

/**
 * POST /api/admin/ranks/assign
 * Admin override - manually assign rank (QA Q8)
 * Body: { userId, rankCode }
 */
async function assignRank(req, res) {
  try {
    const { userId, rankCode } = req.body;
    if (!userId || rankCode == null) {
      return response.errorResponse(
        res,
        { msg: "userId and rankCode are required" },
        "Validation Error",
        400
      );
    }

    const code = parseInt(rankCode, 10);
    if (Number.isNaN(code) || code < 1) {
      return response.errorResponse(
        res,
        { msg: "rankCode must be a positive integer" },
        "Validation Error",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid userId" },
        "Validation Error",
        400
      );
    }

    const settings = await WalletSettings.getOrCreateSettings();
    const rankConfig = (settings.ranks || []).find((r) => r.rankCode === code);
    if (!rankConfig) {
      return response.errorResponse(
        res,
        { msg: `Rank ${code} not found in configuration` },
        "Not found",
        404
      );
    }

    const user = await User.findById(userId).select("memberId name status isPaid").lean();
    if (!user) {
      return response.errorResponse(res, { msg: "User not found" }, "Not found", 404);
    }
    if (user.status !== 1 || user.isPaid !== true) {
      return response.errorResponse(
        res,
        { msg: "Only active paid users can be assigned a rank" },
        "Validation Error",
        400
      );
    }

    await User.findByIdAndUpdate(userId, { $set: { rankCode: code } });

    return response.successResponse(res, {
      userId,
      rankCode: code,
      rankName: rankConfig.name,
      message: `Rank ${rankConfig.name} assigned to ${user.memberId}`,
    });
  } catch (err) {
    console.error("assignRank error:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
}

module.exports = {
  listUsersByRank,
  getRankSummary,
  assignRank,
};
