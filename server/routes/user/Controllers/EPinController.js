const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getUserEPins,
  transferEPin,
  transferEPinsByCount,
  normalizeEPinId,
} = require("../../../services/epinService");
const EPinTransferReport = require("../../../models/EPinTransferReport");
const User = require("../../../models/User");

/**
 * GET /api/users/epins
 * List own E-PINs with pagination
 */
const listOwnEPins = async (req, res) => {
  try {
    const userId = req.user?.id || req.userObj?._id;
    if (!userId) {
      return response.errorResponse(
        res,
        [{ msg: "Authentication required" }],
        "Unauthorized",
        401
      );
    }

    const { page, limit, status } = req.query;
    const filter = status ? { status } : {};
    const pagination = { page, limit };

    const result = await getUserEPins(userId, filter, pagination);

    return response.successResponse(res, {
      epins: result.epins,
      pagination: result.pagination,
      totalCount: result.totalCount,
      unusedCount: result.unusedCount,
      usedCount: result.usedCount,
    });
  } catch (err) {
    console.error("List EPins error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch E-PINs" }],
      err.message || "Failed to fetch E-PINs",
      500
    );
  }
};

/**
 * POST /api/users/epins/transfer
 * Transfer E-PIN to another member
 */
const transferEPinToMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400
    );
  }

  try {
    const userId = req.user?.id || req.userObj?._id;
    if (!userId) {
      return response.errorResponse(
        res,
        [{ msg: "Authentication required" }],
        "Unauthorized",
        401
      );
    }

    const { toMemberId, epinId } = req.body;

    const toUser = await User.findOne({ memberId: toMemberId.trim().toUpperCase() }).lean();
    if (!toUser) {
      return response.errorResponse(
        res,
        [{ msg: "Recipient member not found" }],
        "Recipient not found",
        404
      );
    }

    await transferEPin(userId, toUser._id, epinId, false);

    return response.successResponse(
      res,
      { epinId: normalizeEPinId(epinId) },
      "E-PIN transferred successfully"
    );
  } catch (err) {
    console.error("Transfer EPin error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Transfer failed" }],
      err.message || "Transfer failed",
      400
    );
  }
};

/**
 * POST /api/users/epins/transfer-bulk
 * Bulk transfer E-PINs by count
 */
const transferEPinsBulk = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      errors.array().map((e) => ({ path: e.param, msg: e.msg })),
      "Validation Error",
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id || req.userObj?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Authentication required" }],
        "Unauthorized",
        401
      );
    }

    const { toMemberId, count } = req.body;
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Count must be a positive integer" }],
        "Validation Error",
        400
      );
    }

    const toUser = await User.findOne({ memberId: toMemberId.trim().toUpperCase() })
      .session(session)
      .lean();
    if (!toUser) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Recipient member not found" }],
        "Recipient not found",
        404
      );
    }

    const result = await transferEPinsByCount(
      userId,
      toUser._id,
      countNum,
      false,
      session
    );

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {
        transferredCount: result.transferredCount,
        epinIds: result.epinIds,
      },
      `Successfully transferred ${result.transferredCount} E-PIN(s)`,
      200
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transfer EPins bulk error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Transfer failed" }],
      err.message || "Transfer failed",
      400
    );
  }
};

/**
 * GET /api/users/epins/transfer-report
 * Get user's transfer history (as sender or recipient)
 */
const getTransferReport = async (req, res) => {
  try {
    const userId = req.user?.id || req.userObj?._id;
    if (!userId) {
      return response.errorResponse(
        res,
        [{ msg: "Authentication required" }],
        "Unauthorized",
        401
      );
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      $and: [
        {
          $or: [{ activityType: "transfer" }, { activityType: { $exists: false } }],
        },
        {
          $or: [{ fromUser: userId }, { toUser: userId }],
        },
      ],
    };

    const [total, transfers] = await Promise.all([
      EPinTransferReport.countDocuments(query),
      EPinTransferReport.find(query)
        .sort({ transferredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("fromUser", "name memberId")
        .populate("toUser", "name memberId")
        .populate("epinIds", "epinId")
        .lean(),
    ]);

    const transformedTransfers = transfers.map((t) => {
      if (t.count == null && t.epinRef) {
        return { ...t, count: 1, epinIds: t.epinIds || [t.epinRef] };
      }
      return t;
    });

    return response.successResponse(res, {
      transfers: transformedTransfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Get transfer report error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch transfer report" }],
      err.message || "Failed to fetch transfer report",
      500
    );
  }
};

module.exports = {
  listOwnEPins,
  transferEPinToMember,
  transferEPinsBulk,
  getTransferReport,
};
