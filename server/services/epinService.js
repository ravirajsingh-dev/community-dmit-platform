const mongoose = require("mongoose");
const EPin = require("../models/EPin");
const EPinTransferReport = require("../models/EPinTransferReport");
const User = require("../models/User");
const { generateEPin } = require("../helpers/epinGenerator");

const EPIN_REGEX = /^G[A-Z0-9]{19}$/;

/**
 * Validate E-PIN format
 * @param {string} epinId
 * @returns {boolean}
 */
const isValidEPinFormat = (epinId) => {
  if (!epinId || typeof epinId !== "string") return false;
  return EPIN_REGEX.test(epinId.trim().toUpperCase());
};

/**
 * Normalize E-PIN (uppercase, trim)
 * @param {string} epinId
 * @returns {string}
 */
const normalizeEPinId = (epinId) => {
  if (!epinId || typeof epinId !== "string") return "";
  return epinId.trim().toUpperCase();
};

/**
 * Create N E-PINs and assign to a member
 * @param {ObjectId} adminId - Admin/SubAdmin _id (createdBy)
 * @param {ObjectId} memberId - User _id (ownerId)
 * @param {number} count - Number of E-PINs to create
 * @param {mongoose.ClientSession} [session] - Optional session
 * @returns {Promise<{epins: EPin[], count: number}>}
 */
const createEPins = async (adminId, memberId, count, session = null) => {
  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID");
  }
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid member ID");
  }
  if (!count || typeof count !== "number" || count < 1 || count > 100) {
    throw new Error("Count must be between 1 and 100");
  }

  const member = session
    ? await User.findById(memberId).session(session).lean()
    : await User.findById(memberId).lean();

  if (!member) {
    throw new Error("Member not found");
  }

  const epinsToInsert = [];

  for (let i = 0; i < count; i++) {
    const epinId = await generateEPin({ session });
    epinsToInsert.push({
      epinId,
      ownerId: memberId,
      status: "unused",
      createdBy: adminId,
    });
  }

  const options = session ? { session } : {};
  const inserted = await EPin.insertMany(epinsToInsert, options);

  const now = new Date();
  const activityReport = new EPinTransferReport({
    activityType: "admin_create",
    toUser: memberId,
    adminId,
    count: inserted.length,
    epinIds: inserted.map((e) => e._id),
    epinDisplayIds: inserted.map((e) => e.epinId),
    transferredByAdmin: true,
    transferredAt: now,
  });
  await activityReport.save(options);

  return {
    epins: inserted,
    count: inserted.length,
  };
};

/**
 * Transfer E-PIN from one user to another
 * Atomic update: only succeeds if E-PIN is unused and owned by fromUserId.
 * @param {ObjectId} fromUserId - Current owner
 * @param {ObjectId} toUserId - New owner
 * @param {string} epinId - E-PIN string
 * @param {boolean} [transferredByAdmin=false]
 * @param {mongoose.ClientSession} [session] - Optional session
 * @returns {Promise<EPin>}
 */
const transferEPin = async (
  fromUserId,
  toUserId,
  epinId,
  transferredByAdmin = false,
  session = null
) => {
  const normalizedId = normalizeEPinId(epinId);
  if (!isValidEPinFormat(normalizedId)) {
    throw new Error("Invalid E-PIN format");
  }
  if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) {
    throw new Error("Invalid from user ID");
  }
  if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
    throw new Error("Invalid to user ID");
  }
  if (fromUserId.toString() === toUserId.toString()) {
    throw new Error("Cannot transfer E-PIN to yourself");
  }

  const toUser = session
    ? await User.findById(toUserId).session(session).lean()
    : await User.findById(toUserId).lean();

  if (!toUser) {
    throw new Error("Recipient not found");
  }

  const filter = {
    epinId: normalizedId,
    status: "unused",
    ownerId: fromUserId,
  };
  const options = session ? { returnDocument: "after", session } : { returnDocument: "after" };
  const epin = await EPin.findOneAndUpdate(
    filter,
    { $set: { ownerId: toUserId } },
    options
  );

  if (!epin) {
    throw new Error("E-PIN not found, already used, or you do not own it");
  }

  const opts = session ? { session } : {};
  const report = new EPinTransferReport({
    activityType: "transfer",
    fromUser: fromUserId,
    toUser: toUserId,
    count: 1,
    epinIds: [epin._id],
    epinDisplayIds: [epin.epinId],
    transferredByAdmin,
    transferredAt: new Date(),
  });
  await report.save(opts);

  return epin;
};

/**
 * Use E-PIN (mark as used by user)
 * For normal use: owner uses their own EPin
 * @param {ObjectId} userId - User using the E-PIN (must be owner)
 * @param {string} epinId - E-PIN string
 * @param {mongoose.ClientSession} [session] - Optional session
 * @returns {Promise<EPin>}
 */
const useEPin = async (userId, epinId, session = null) => {
  const normalizedId = normalizeEPinId(epinId);
  if (!isValidEPinFormat(normalizedId)) {
    throw new Error("Invalid E-PIN format");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const epin = session
    ? await EPin.findOne({ epinId: normalizedId }).session(session)
    : await EPin.findOne({ epinId: normalizedId });

  if (!epin) {
    throw new Error("E-PIN not found");
  }
  if (epin.status !== "unused") {
    throw new Error("E-PIN has already been used");
  }
  if (epin.ownerId.toString() !== userId.toString()) {
    throw new Error("You do not own this E-PIN");
  }

  epin.status = "used";
  epin.usedBy = userId;
  epin.usedAt = new Date();
  const options = session ? { session } : {};
  await epin.save(options);

  return epin;
};

/**
 * Use E-PIN for registration
 * Atomic update: only succeeds if E-PIN is unused.
 * E-PIN can belong to any user; usedBy = newly registered user.
 * Sponsor (referrer) pays the activation fee from their wallet.
 * @param {ObjectId} sponsorId - Sponsor (referrer) - used for activation payment
 * @param {string} epinId - E-PIN string
 * @param {ObjectId} newUserId - Newly registered user (usedBy)
 * @param {mongoose.ClientSession} [session] - Optional session
 * @returns {Promise<EPin>}
 */
const useEPinForRegistration = async (
  sponsorId,
  epinId,
  newUserId,
  session = null
) => {
  const normalizedId = normalizeEPinId(epinId);
  if (!isValidEPinFormat(normalizedId)) {
    throw new Error("Invalid E-PIN format");
  }
  if (!sponsorId || !mongoose.Types.ObjectId.isValid(sponsorId)) {
    throw new Error("Invalid sponsor ID");
  }
  if (!newUserId || !mongoose.Types.ObjectId.isValid(newUserId)) {
    throw new Error("Invalid new user ID");
  }

  const filter = {
    epinId: normalizedId,
    status: "unused",
  };
  const update = {
    $set: {
      status: "used",
      usedBy: newUserId,
      usedAt: new Date(),
    },
  };
  const options = session ? { returnDocument: "after", session } : { returnDocument: "after" };
  const epin = await EPin.findOneAndUpdate(filter, update, options);

  if (!epin) {
    throw new Error("E-PIN already used or invalid");
  }

  return epin;
};

/**
 * Get user's E-PINs with pagination and filters
 * Unused first, then used
 * @param {ObjectId} userId
 * @param {Object} filter - { status }
 * @param {Object} pagination - { page, limit }
 * @returns {Promise<{epins: EPin[], pagination: Object, totalCount: number, unusedCount: number, usedCount: number}>}
 */
const getUserEPins = async (userId, filter = {}, pagination = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const baseQuery = { ownerId: userId };
  const query = { ...baseQuery };
  if (filter.status) {
    if (["unused", "used"].includes(filter.status)) {
      query.status = filter.status;
    }
  }

  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 20));
  const skip = (page - 1) * limit;

  const [totalCount, unusedCount, usedCount, filteredCount, epins] = await Promise.all([
    EPin.countDocuments(baseQuery),
    EPin.countDocuments({ ...baseQuery, status: "unused" }),
    EPin.countDocuments({ ...baseQuery, status: "used" }),
    EPin.countDocuments(query),
    EPin.find(query)
      .sort({ status: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("usedBy", "name memberId")
      .lean(),
  ]);

  return {
    epins,
    pagination: {
      page,
      limit,
      total: filteredCount,
      pages: Math.ceil(filteredCount / limit),
    },
    totalCount,
    unusedCount,
    usedCount,
  };
};

/**
 * Transfer E-PINs by count (bulk transfer)
 * @param {ObjectId} fromUserId - Current owner
 * @param {ObjectId} toUserId - New owner
 * @param {number} count - Number of unused E-PINs to transfer
 * @param {boolean} [transferredByAdmin=false]
 * @param {mongoose.ClientSession} [session] - Optional session
 * @returns {Promise<{transferredCount: number, epinIds: string[]}>}
 */
const transferEPinsByCount = async (
  fromUserId,
  toUserId,
  count,
  transferredByAdmin = false,
  session = null
) => {
  if (!count || typeof count !== "number" || count < 1 || count > 10000) {
    throw new Error("Count must be between 1 and 10000");
  }
  if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) {
    throw new Error("Invalid from user ID");
  }
  if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
    throw new Error("Invalid to user ID");
  }
  if (fromUserId.toString() === toUserId.toString()) {
    throw new Error("Cannot transfer E-PINs to yourself");
  }

  const toUser = session
    ? await User.findById(toUserId).session(session).lean()
    : await User.findById(toUserId).lean();
  if (!toUser) {
    throw new Error("Recipient not found");
  }

  const query = { ownerId: fromUserId, status: "unused" };
  const epins = session
    ? await EPin.find(query).sort({ createdAt: 1 }).limit(count).session(session).lean()
    : await EPin.find(query).sort({ createdAt: 1 }).limit(count).lean();

  if (!epins || epins.length < count) {
    throw new Error(
      `Insufficient unused E-PINs. Available: ${epins?.length || 0}, requested: ${count}`
    );
  }

  const epinIds = epins.map((e) => e.epinId);
  const epinObjectIds = epins.map((e) => e._id);

  const options = session ? { session } : {};
  const now = new Date();

  const bulkResult = await EPin.bulkWrite(
    [
      {
        updateMany: {
          filter: {
            _id: { $in: epinObjectIds },
            status: "unused",
            ownerId: fromUserId,
          },
          update: { $set: { ownerId: toUserId } },
        },
      },
    ],
    options
  );

  const modifiedCount = bulkResult.modifiedCount ?? 0;
  if (modifiedCount !== epinObjectIds.length) {
    throw new Error(
      `Bulk transfer failed: expected to transfer ${epinObjectIds.length} E-PINs but only ${modifiedCount} were available. Some may have been used or transferred concurrently.`
    );
  }

  const report = new EPinTransferReport({
    activityType: "transfer",
    fromUser: fromUserId,
    toUser: toUserId,
    count: epins.length,
    epinIds: epinObjectIds,
    epinDisplayIds: epinIds,
    transferredByAdmin,
    transferredAt: now,
  });
  await report.save(options);

  return {
    transferredCount: epins.length,
    epinIds,
  };
};

/**
 * Validate E-PIN for registration
 * E-PIN must exist and be unused. Can belong to any user.
 * @param {string} epinId
 * @param {ObjectId} sponsorId - Referrer's _id (used for activation flow)
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
const validateEPinForRegistration = async (epinId, sponsorId) => {
  const normalizedId = normalizeEPinId(epinId);
  if (!isValidEPinFormat(normalizedId)) {
    return { valid: false, message: "Invalid E-PIN format" };
  }
  if (!sponsorId || !mongoose.Types.ObjectId.isValid(sponsorId)) {
    return { valid: false, message: "Invalid sponsor" };
  }

  const epin = await EPin.findOne({ epinId: normalizedId }).lean();
  if (!epin) {
    return { valid: false, message: "E-PIN not found" };
  }
  if (epin.status !== "unused") {
    return { valid: false, message: "E-PIN has already been used" };
  }

  return { valid: true };
};

/**
 * Delete unused E-PINs by count (admin bulk delete)
 * @param {ObjectId} memberId - User _id whose unused E-PINs to delete
 * @param {number} count - Number of unused E-PINs to delete
 * @param {ObjectId|null} adminId - Admin who performed the action (audit report)
 * @returns {Promise<{deletedCount: number, remainingUnused: number}>}
 */
const deleteUnusedEPinsByCount = async (memberId, count, adminId = null) => {
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid member ID");
  }
  if (!count || typeof count !== "number" || count < 1 || count > 10000) {
    throw new Error("Count must be between 1 and 10000");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const query = { ownerId: memberId, status: "unused" };
    const epins = await EPin.find(query).sort({ createdAt: 1 }).limit(count).session(session).lean();

    if (!epins || epins.length < count) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(
        `Insufficient unused E-PINs. Available: ${epins?.length || 0}, requested: ${count}`
      );
    }

    const epinObjectIds = epins.map((e) => e._id);
    const epinDisplayIds = epins.map((e) => e.epinId);

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      const activityReport = new EPinTransferReport({
        activityType: "admin_bulk_delete",
        affectedUser: memberId,
        adminId,
        count: epins.length,
        epinIds: epinObjectIds,
        epinDisplayIds,
        transferredByAdmin: true,
        transferredAt: new Date(),
      });
      await activityReport.save({ session });
    }

    await EPin.deleteMany({ _id: { $in: epinObjectIds } }).session(session);

    const remainingUnused = await EPin.countDocuments(query).session(session);

    await session.commitTransaction();
    session.endSession();

    return {
      deletedCount: epins.length,
      remainingUnused,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

module.exports = {
  createEPins,
  transferEPin,
  transferEPinsByCount,
  useEPin,
  useEPinForRegistration,
  getUserEPins,
  validateEPinForRegistration,
  deleteUnusedEPinsByCount,
  isValidEPinFormat,
  normalizeEPinId,
};
