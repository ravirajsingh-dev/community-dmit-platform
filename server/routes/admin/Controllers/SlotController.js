/**
 * Admin Slot Controller - Phase-2.2
 *
 * Slot definition CRUD
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getAdminSlots,
  createSlot,
  updateSlot,
  toggleSlotActive,
} = require("../../../services/slotService");

/**
 * GET /api/admin/slots?designationCode=&page=&limit=
 */
async function listSlots(req, res) {
  try {
    const result = await getAdminSlots({
      designationCode: req.query.designationCode || undefined,
      page: req.query.page,
      limit: req.query.limit,
    });
    const WalletSettings = require("../../../models/WalletSettings");
    const settings = await WalletSettings.getOrCreateSettings();
    const designations = (settings.designations || []).map((d) => ({
      designationCode: d.designationCode,
      name: d.name,
    }));
    return response.successResponse(
      res,
      { ...result, designations },
      "Slots retrieved"
    );
  } catch (err) {
    console.error("listSlots error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch slots" }],
      "Failed to fetch slots",
      500
    );
  }
}

/**
 * POST /api/admin/slots
 * Body: { designationCode, label, startTime, endTime, capacity }
 */
async function create(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { designationCode, label, startTime, endTime, capacity } = req.body;
    const slot = await createSlot({
      designationCode: parseInt(designationCode, 10),
      label: String(label).trim(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      capacity: parseInt(capacity, 10),
      active: true,
    });
    return response.successResponse(res, { slot }, "Slot created");
  } catch (err) {
    console.error("createSlot error:", err);
    if (err.code === "SLOT_TIME_OVERLAP") {
      return response.errorResponse(
        res,
        [{ msg: "SLOT_TIME_OVERLAP" }],
        "Slot times overlap with existing active slot",
        400,
        false,
        { code: "SLOT_TIME_OVERLAP" }
      );
    }
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to create slot" }],
      "Failed to create slot",
      500
    );
  }
}

/**
 * PUT /api/admin/slots/:id
 * Body: { label?, startTime?, endTime?, capacity? }
 */
async function update(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const { id } = req.params;
    const updates = {};
    if (req.body.label !== undefined) updates.label = String(req.body.label).trim();
    if (req.body.startTime !== undefined) updates.startTime = String(req.body.startTime).trim();
    if (req.body.endTime !== undefined) updates.endTime = String(req.body.endTime).trim();
    if (req.body.capacity !== undefined) updates.capacity = parseInt(req.body.capacity, 10);
    if (req.body.active !== undefined) updates.active = !!req.body.active;

    const slot = await updateSlot(id, updates);
    if (!slot) {
      return response.errorResponse(
        res,
        [{ msg: "Slot not found" }],
        "Slot not found",
        404
      );
    }
    return response.successResponse(res, { slot }, "Slot updated");
  } catch (err) {
    console.error("updateSlot error:", err);
    if (err.code === "SLOT_TIME_OVERLAP") {
      return response.errorResponse(
        res,
        [{ msg: "SLOT_TIME_OVERLAP" }],
        "Slot times overlap with existing active slot",
        400,
        false,
        { code: "SLOT_TIME_OVERLAP" }
      );
    }
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to update slot" }],
      "Failed to update slot",
      500
    );
  }
}

/**
 * PATCH /api/admin/slots/:id/toggle
 */
async function toggle(req, res) {
  try {
    const { id } = req.params;
    const slot = await toggleSlotActive(id);
    if (!slot) {
      return response.errorResponse(
        res,
        [{ msg: "Slot not found" }],
        "Slot not found",
        404
      );
    }
    return response.successResponse(
      res,
      { slot, active: slot.active },
      slot.active ? "Slot activated" : "Slot deactivated"
    );
  } catch (err) {
    console.error("toggleSlot error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to toggle slot" }],
      "Failed to toggle slot",
      500
    );
  }
}

module.exports = {
  listSlots,
  create,
  update,
  toggle,
};
