/**
 * Slot Service - Phase-2.2
 *
 * Slot definition CRUD and listing for designation-based appointment slots.
 * Issue 4: Slot overlap prevention on create/update.
 */

const SlotDefinition = require("../models/SlotDefinition");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination");
const { runWithTransactionRetry } = require("../utils/transactionRetry");

/**
 * Convert HH:mm to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Check if two time ranges overlap.
 * Overlap: newStart < existingEnd AND newEnd > existingStart
 */
function timesOverlap(newStart, newEnd, existingStart, existingEnd) {
  const ns = timeToMinutes(newStart);
  const ne = timeToMinutes(newEnd);
  const es = timeToMinutes(existingStart);
  const ee = timeToMinutes(existingEnd);
  if (ns == null || ne == null || es == null || ee == null) return false;
  return ns < ee && ne > es;
}

/**
 * List slots by designation (active only by default)
 */
async function getSlotsByDesignation(designationCode, options = {}) {
  const code = parseInt(designationCode, 10);
  if (Number.isNaN(code) || code < 1) {
    return { slots: [], pagination: buildPaginationMeta(1, 20, 0) };
  }

  const { page, limit, skip } = parsePaginationParams(options);
  const { activeOnly = true } = options;

  const query = { designationCode: code };
  if (activeOnly) query.active = true;

  const [slots, totalCount] = await Promise.all([
    SlotDefinition.find(query).sort({ startTime: 1 }).skip(skip).limit(limit).lean(),
    SlotDefinition.countDocuments(query),
  ]);

  return {
    slots,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

/**
 * Get single slot by ID
 */
async function getSlotById(slotId) {
  return SlotDefinition.findById(slotId).lean();
}

/**
 * Create slot - Issue 4: reject if overlaps existing active slots.
 * Uses transaction to prevent TOCTOU race: overlap check + insert are atomic.
 */
async function createSlot(data) {
  const designationCode = parseInt(data.designationCode, 10);
  const startTime = String(data.startTime || "").trim();
  const endTime = String(data.endTime || "").trim();

  return runWithTransactionRetry(async (session) => {
    const existing = await SlotDefinition.find({
      designationCode,
      active: true,
    })
      .session(session)
      .lean();

    for (const s of existing) {
      if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
        const err = new Error("SLOT_TIME_OVERLAP");
        err.code = "SLOT_TIME_OVERLAP";
        throw err;
      }
    }

    const [slot] = await SlotDefinition.create([data], { session });
    return slot.toObject();
  });
}

/**
 * Update slot - Issue 4: reject if updated times overlap existing active slots.
 * Uses transaction to prevent TOCTOU race: overlap check + update are atomic.
 */
async function updateSlot(slotId, data) {
  return runWithTransactionRetry(async (session) => {
    const slot = await SlotDefinition.findById(slotId).session(session);
    if (!slot) return null;

    const designationCode = slot.designationCode;
    const startTime =
      data.startTime !== undefined ? String(data.startTime).trim() : slot.startTime;
    const endTime =
      data.endTime !== undefined ? String(data.endTime).trim() : slot.endTime;

    const existing = await SlotDefinition.find({
      designationCode,
      active: true,
      _id: { $ne: slotId },
    })
      .session(session)
      .lean();

    for (const s of existing) {
      if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
        const err = new Error("SLOT_TIME_OVERLAP");
        err.code = "SLOT_TIME_OVERLAP";
        throw err;
      }
    }

    Object.assign(slot, data);
    await slot.save({ runValidators: true, session });
    return slot.toObject();
  });
}

/**
 * Toggle slot active status
 */
async function toggleSlotActive(slotId) {
  const slot = await SlotDefinition.findById(slotId);
  if (!slot) return null;
  slot.active = !slot.active;
  await slot.save();
  return slot.toObject();
}

/**
 * Admin: List all slots with optional designation filter
 */
async function getAdminSlots(options = {}) {
  const { designationCode } = options;
  const { page, limit, skip } = parsePaginationParams(options);

  const query = {};
  if (designationCode != null && designationCode !== "") {
    query.designationCode = parseInt(designationCode, 10);
  }

  const [slots, totalCount] = await Promise.all([
    SlotDefinition.find(query).sort({ designationCode: 1, startTime: 1 }).skip(skip).limit(limit).lean(),
    SlotDefinition.countDocuments(query),
  ]);

  return {
    slots,
    pagination: buildPaginationMeta(page, limit, totalCount),
  };
}

module.exports = {
  getSlotsByDesignation,
  getSlotById,
  createSlot,
  updateSlot,
  toggleSlotActive,
  getAdminSlots,
};
