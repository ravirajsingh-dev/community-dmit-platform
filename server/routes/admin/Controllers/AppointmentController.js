/**
 * Admin Appointment Controller - Phase-2.1
 *
 * GET /api/admin/appointments?status=&designationCode=&page=&limit=
 * POST /api/admin/appointments/approve-cancel
 * POST /api/admin/appointments/reject-cancel
 * POST /api/admin/appointments/cancel
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  getAdminAppointments,
  adminCreateSbiProOverride,
  approveCancelRequest,
  rejectCancelRequest,
  adminCancelAppointment,
} = require("../../../services/appointmentService");

/**
 * GET /api/admin/appointments
 * Query: status, designationCode, page, limit
 */
async function listAppointments(req, res) {
  try {
    const { status, designationCode, dateFrom, dateTo, page, limit } = req.query;
    const options = { page, limit };
    if (status) options.status = status;
    if (designationCode != null) {
      const code = parseInt(designationCode, 10);
      if (!Number.isNaN(code)) options.designationCode = code;
    }
    if (dateFrom) options.dateFrom = dateFrom;
    if (dateTo) options.dateTo = dateTo;

    const result = await getAdminAppointments(options);

    return response.successResponse(
      res,
      {
        appointments: result.appointments,
        pagination: result.pagination,
        designations: result.designations || [],
      },
      "Appointments retrieved"
    );
  } catch (err) {
    console.error("listAppointments error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch appointments" }],
      "Failed to fetch appointments",
      500
    );
  }
}

/**
 * POST /api/admin/appointments/approve-cancel
 * Body: { appointmentId }
 */
async function approveCancel(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation failed",
        400
      );
    }

    const adminId = req.user?.id;
    const { appointmentId } = req.body;

    const result = await approveCancelRequest(appointmentId, adminId);

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400
      );
    }

    return response.successResponse(
      res,
      { appointment: result.appointment },
      "Cancel request approved"
    );
  } catch (err) {
    console.error("approveCancel error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to approve cancel" }],
      "Failed to approve cancel",
      500
    );
  }
}

/**
 * POST /api/admin/appointments/reject-cancel
 * Body: { appointmentId }
 */
async function rejectCancel(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation failed",
        400
      );
    }

    const { appointmentId } = req.body;

    const result = await rejectCancelRequest(appointmentId);

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400
      );
    }

    return response.successResponse(res, {}, "Cancel request rejected");
  } catch (err) {
    console.error("rejectCancel error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to reject cancel" }],
      "Failed to reject cancel",
      500
    );
  }
}

/**
 * POST /api/admin/appointments/create-sbi-pro-override
 * Phase 7: Create SBI PRO appointment bypassing lock (user: "finger analysis vapas kro")
 * Body: { requesterId, holderId, dateKey, slotId, beneficiary? }
 */
async function createSbiProOverride(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const adminId = req.user?.id;
    const { requesterId, holderId, dateKey, slotId, beneficiary } = req.body;

    const result = await adminCreateSbiProOverride(adminId, {
      requesterId,
      holderId,
      dateKey,
      slotId,
      beneficiary: beneficiary || { type: "SELF" },
    });

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400
      );
    }

    return response.successResponse(
      res,
      { appointment: result.appointment },
      "SBI PRO appointment created (override)"
    );
  } catch (err) {
    console.error("createSbiProOverride error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to create" }],
      "Failed to create",
      500
    );
  }
}

/**
 * POST /api/admin/appointments/cancel
 * Body: { appointmentId, reason? }
 */
async function cancel(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation failed",
        400
      );
    }

    const adminId = req.user?.id;
    const { appointmentId, reason } = req.body;

    const result = await adminCancelAppointment(
      appointmentId,
      adminId,
      reason
    );

    if (!result.success) {
      return response.errorResponse(
        res,
        [{ msg: result.reason }],
        result.reason,
        400
      );
    }

    return response.successResponse(
      res,
      { appointment: result.appointment },
      "Appointment cancelled"
    );
  } catch (err) {
    console.error("cancel error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to cancel" }],
      "Failed to cancel",
      500
    );
  }
}

module.exports = {
  listAppointments,
  createSbiProOverride,
  approveCancel,
  rejectCancel,
  cancel,
};
