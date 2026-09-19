const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  createEPins,
  getUserEPins,
  transferEPinsByCount,
  deleteUnusedEPinsByCount,
  isValidEPinFormat,
  normalizeEPinId,
} = require("../../../services/epinService");
const EPin = require("../../../models/EPin");
const EPinTransferReport = require("../../../models/EPinTransferReport");
const User = require("../../../models/User");

/**
 * POST /api/admin/epins/delete-bulk
 * Delete N unused E-PINs of a member
 */
const deleteEPinsBulk = async (req, res) => {
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
    const { memberId, count } = req.body;

    let userId = memberId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      const member = await User.findOne({
        memberId: String(memberId).trim().toUpperCase(),
      })
        .select("_id")
        .lean();
      if (!member) {
        return response.errorResponse(
          res,
          [{ msg: "Member not found" }],
          "Member not found",
          404
        );
      }
      userId = member._id;
    }

    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 10000) {
      return response.errorResponse(
        res,
        [{ msg: "Count must be between 1 and 10000" }],
        "Validation Error",
        400
      );
    }

    const adminId = req.user?.id || req.userObj?._id;
    if (!adminId) {
      return response.errorResponse(
        res,
        [{ msg: "Admin authentication required" }],
        "Unauthorized",
        401
      );
    }

    const result = await deleteUnusedEPinsByCount(userId, countNum, adminId);

    return response.successResponse(
      res,
      {
        deletedCount: result.deletedCount,
        remainingUnused: result.remainingUnused,
      },
      `Successfully deleted ${result.deletedCount} unused E-PIN(s)`,
      200
    );
  } catch (err) {
    console.error("Delete EPins bulk error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to delete E-PINs" }],
      err.message || "Failed to delete E-PINs",
      400
    );
  }
};

/**
 * POST /api/admin/epins/create
 * Create N E-PINs for a member
 */
const createEPinsForMember = async (req, res) => {
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
    const adminId = req.user?.id || req.userObj?._id;
    const { memberId, count } = req.body;

    if (!adminId) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Admin authentication required" }],
        "Unauthorized",
        401
      );
    }

    let userId = memberId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      const member = await User.findOne({
        memberId: String(memberId).trim().toUpperCase(),
      })
        .select("_id")
        .lean();
      if (!member) {
        await session.abortTransaction();
        session.endSession();
        return response.errorResponse(
          res,
          [{ msg: "Member not found" }],
          "Member not found",
          404
        );
      }
      userId = member._id;
    }

    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Count must be between 1 and 100" }],
        "Validation Error",
        400
      );
    }

    const result = await createEPins(adminId, userId, countNum, session);

    await session.commitTransaction();
    session.endSession();

    return response.successResponse(
      res,
      {
        epins: result.epins.map((e) => ({
          epinId: e.epinId,
          ownerId: e.ownerId,
          status: e.status,
        })),
        count: result.count,
      },
      `Successfully created ${result.count} E-PIN(s)`,
      201
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create EPins error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to create E-PINs" }],
      err.message || "Failed to create E-PINs",
      400
    );
  }
};

/**
 * POST /api/admin/epins/transfer-bulk
 * Admin bulk transfer E-PINs from one user to another
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
    const { fromMemberId, toMemberId, count } = req.body;
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 10000) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "Count must be between 1 and 10000" }],
        "Validation Error",
        400
      );
    }

    const fromMember = await User.findOne({
      memberId: String(fromMemberId).trim().toUpperCase(),
    })
      .select("_id")
      .session(session)
      .lean();
    if (!fromMember) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "From member not found" }],
        "From member not found",
        404
      );
    }

    const toMember = await User.findOne({
      memberId: String(toMemberId).trim().toUpperCase(),
    })
      .select("_id")
      .session(session)
      .lean();
    if (!toMember) {
      await session.abortTransaction();
      session.endSession();
      return response.errorResponse(
        res,
        [{ msg: "To member not found" }],
        "To member not found",
        404
      );
    }

    const result = await transferEPinsByCount(
      fromMember._id,
      toMember._id,
      countNum,
      true,
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
    console.error("Admin transfer EPins bulk error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Transfer failed" }],
      err.message || "Transfer failed",
      400
    );
  }
};

/**
 * DELETE /api/admin/epins/:epinId
 * Delete E-PIN only if unused
 */
const deleteEPin = async (req, res) => {
  try {
    const { epinId } = req.params;
    const normalizedId = normalizeEPinId(epinId);

    if (!isValidEPinFormat(normalizedId)) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid E-PIN format" }],
        "Validation Error",
        400
      );
    }

    const epin = await EPin.findOne({ epinId: normalizedId });

    if (!epin) {
      return response.errorResponse(
        res,
        [{ msg: "E-PIN not found" }],
        "E-PIN not found",
        404
      );
    }

    if (epin.status !== "unused") {
      return response.errorResponse(
        res,
        [{ msg: "Used E-PINs cannot be deleted" }],
        "Used E-PINs cannot be deleted",
        400
      );
    }

    const adminId = req.user?.id || req.userObj?._id;
    if (!adminId) {
      return response.errorResponse(
        res,
        [{ msg: "Admin authentication required" }],
        "Unauthorized",
        401
      );
    }

    const activityReport = new EPinTransferReport({
      activityType: "admin_delete",
      affectedUser: epin.ownerId,
      adminId,
      count: 1,
      epinIds: [epin._id],
      epinDisplayIds: [normalizedId],
      transferredByAdmin: true,
      transferredAt: new Date(),
    });
    await activityReport.save();

    await EPin.deleteOne({ epinId: normalizedId });

    return response.successResponse(
      res,
      { epinId: normalizedId },
      "E-PIN deleted successfully"
    );
  } catch (err) {
    console.error("Delete EPin error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to delete E-PIN" }],
      err.message || "Failed to delete E-PIN",
      500
    );
  }
};

/**
 * GET /api/admin/epins
 * List all E-PINs with filters and pagination
 */
const listEPins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      memberId,
      search,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query;

    const conditions = [];

    if (status && ["unused", "used"].includes(status)) {
      conditions.push({ status });
    }

    if (memberId && memberId.trim()) {
      if (mongoose.Types.ObjectId.isValid(memberId)) {
        conditions.push({ ownerId: memberId });
      } else {
        const member = await User.findOne({
          memberId: String(memberId).trim().toUpperCase(),
        })
          .select("_id")
          .lean();
        if (member) {
          conditions.push({ ownerId: member._id });
        }
      }
    }

    if (search && search.trim()) {
      const userSearchQuery = {
        $or: [
          { name: { $regex: search.trim(), $options: "i" } },
          { phone: { $regex: search.trim(), $options: "i" } },
          { memberId: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      };
      const matchingUsers = await User.find(userSearchQuery)
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      conditions.push({
        $or: [
          { ownerId: { $in: userIds } },
          { epinId: { $regex: search.trim(), $options: "i" } },
        ],
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortField = ["epinId", "status", "createdAt"].includes(orderBy)
      ? orderBy
      : "createdAt";
    const sortOrder = ascending === "asc" ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const [totalCount, unusedCount, usedCount, epins] = await Promise.all([
      EPin.countDocuments(query),
      EPin.countDocuments({ ...query, status: "unused" }),
      EPin.countDocuments({ ...query, status: "used" }),
      EPin.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate("ownerId", "name phone memberId email")
        .populate("usedBy", "name memberId")
        .lean(),
    ]);

    return response.successResponse(res, {
      epins,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
      totalCount,
      unusedCount,
      usedCount,
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
 * GET /api/admin/epins/transfers/:transferId
 * Get single transfer with E-PIN list
 */
const getTransferDetails = async (req, res) => {
  try {
    const { transferId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(transferId)) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid transfer ID" }],
        "Invalid transfer ID",
        400
      );
    }
    const transfer = await EPinTransferReport.findById(transferId)
      .populate("fromUser", "name phone memberId")
      .populate("toUser", "name phone memberId")
      .populate("affectedUser", "name phone memberId")
      .populate("adminId", "name admin_id email phone")
      .populate("epinIds", "epinId status ownerId")
      .lean();
    if (!transfer) {
      return response.errorResponse(
        res,
        [{ msg: "Transfer not found" }],
        "Transfer not found",
        404
      );
    }

    const activityType = transfer.activityType || "transfer";
    const isDeleteAudit = ["admin_bulk_delete", "admin_delete"].includes(activityType);

    let epins = (transfer.epinIds || []).map((ep) =>
      typeof ep === "object" && ep?.epinId
        ? { epinId: ep.epinId, status: ep.status }
        : { epinId: "-", status: "-" }
    );

    if (isDeleteAudit && transfer.epinDisplayIds?.length) {
      epins = transfer.epinDisplayIds.map((id) => ({
        epinId: id,
        status: "removed",
      }));
    }

    return response.successResponse(res, {
      transfer: {
        _id: transfer._id,
        activityType,
        fromUser: transfer.fromUser,
        toUser: transfer.toUser,
        affectedUser: transfer.affectedUser,
        adminId: transfer.adminId,
        count: transfer.count,
        transferredAt: transfer.transferredAt,
        transferredByAdmin: transfer.transferredByAdmin,
      },
      epins,
    });
  } catch (err) {
    console.error("Get transfer details error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch transfer details" }],
      err.message || "Failed to fetch transfer details",
      500
    );
  }
};

/**
 * GET /api/admin/epins/transfers
 * Full transfer audit report
 */
const getTransferReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      fromUser,
      toUser,
      memberId: memberIdParam,
      activityType,
      fromDate,
      toDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const andParts = [];
    const allowedTypes = EPinTransferReport.ACTIVITY_TYPES || [];

    if (activityType && allowedTypes.includes(String(activityType))) {
      if (String(activityType) === "transfer") {
        andParts.push({
          $or: [{ activityType: "transfer" }, { activityType: { $exists: false } }],
        });
      } else {
        andParts.push({ activityType: String(activityType) });
      }
    }

    if (fromUser && mongoose.Types.ObjectId.isValid(fromUser)) {
      andParts.push({ fromUser });
    }

    if (toUser && mongoose.Types.ObjectId.isValid(toUser)) {
      andParts.push({ toUser });
    }

    if (memberIdParam && String(memberIdParam).trim()) {
      const raw = String(memberIdParam).trim();
      let memberObjectId = null;
      if (mongoose.Types.ObjectId.isValid(raw)) {
        memberObjectId = raw;
      } else {
        const member = await User.findOne({
          memberId: raw.toUpperCase(),
        })
          .select("_id")
          .lean();
        if (member) memberObjectId = member._id;
      }
      if (memberObjectId) {
        andParts.push({
          $or: [
            { fromUser: memberObjectId },
            { toUser: memberObjectId },
            { affectedUser: memberObjectId },
          ],
        });
      } else {
        return response.successResponse(res, {
          transfers: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0,
          },
        });
      }
    }

    if (fromDate || toDate) {
      const transferredAt = {};
      if (fromDate) {
        transferredAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        transferredAt.$lte = endDate;
      }
      andParts.push({ transferredAt });
    }

    const query = andParts.length > 0 ? { $and: andParts } : {};

    const skip = (pageNum - 1) * limitNum;

    const [total, reports] = await Promise.all([
      EPinTransferReport.countDocuments(query),
      EPinTransferReport.find(query)
        .sort({ transferredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("fromUser", "name phone memberId")
        .populate("toUser", "name phone memberId")
        .populate("affectedUser", "name phone memberId")
        .populate("adminId", "name admin_id email")
        .populate("epinIds", "epinId")
        .lean(),
    ]);

    const transfers = reports.map((t) => {
      if (t.count == null && t.epinRef) {
        return { ...t, count: 1, epinIds: t.epinIds || [t.epinRef] };
      }
      return t;
    });

    return response.successResponse(res, {
      transfers,
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
  createEPinsForMember,
  transferEPinsBulk,
  deleteEPin,
  deleteEPinsBulk,
  listEPins,
  getTransferReport,
  getTransferDetails,
};
