/**
 * User Appointment Controller - Phase-2.1
 *
 * User APIs: book, my, cancel, rate
 * Holder APIs: assigned, accept, complete, request-cancel, toggle-online
 * Shared: holders list for booking
 */

const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const UserDetails = require("../../../models/UserDetails");

function appointmentErrorResponse(res, reason, statusCode = 400, code = null) {
  return response.errorResponse(
    res,
    [{ msg: reason }],
    reason,
    statusCode,
    false,
    code ? { code } : {}
  );
}
const {
  bookAppointment,
  bookAppointmentBatch,
  getMyAppointments,
  cancelByUser,
  rateAppointment,
  getAssignedAppointments,
  acceptAppointment,
  completeAppointment,
  rejectAppointment,
  requestCancelAppointment,
  toggleHolderOnline,
  getHoldersForBooking,
  getSlotsWithAvailability,
  getNextAvailableSlot,
} = require("../../../services/appointmentService");
const Appointment = require("../../../models/Appointment");
const {
  counsellorMarkComplete,
} = require("../../../services/counsellingSessionService");

/**
 * GET /api/users/appointments/holders/:designationCode
 * List designation holders for booking (with filters)
 */
async function getHolders(req, res) {
  try {
    const userId = req.user.id;
    const designationCode = parseInt(req.params.designationCode, 10);

    if (Number.isNaN(designationCode) || designationCode < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid designationCode" }],
        "Invalid designationCode",
        400
      );
    }

    const userDetails = await UserDetails.findOne({ userId })
      .select("address countryId stateId districtId villageId")
      .lean();
    const hasCompleteAddress =
      !!userDetails &&
      !!userDetails.address &&
      !!userDetails.countryId &&
      !!userDetails.stateId &&
      !!userDetails.districtId &&
      !!userDetails.villageId;

    if (!hasCompleteAddress) {
      return appointmentErrorResponse(
        res,
        "Please complete your Address Details (country, state, district, native village and current address) in your profile before booking any appointment.",
        400,
        "ADDRESS_INCOMPLETE",
      );
    }

    const result = await getHoldersForBooking(userId, designationCode, {
      page: req.query.page,
      limit: req.query.limit,
      online: req.query.online === "true",
      sortBy: req.query.sortBy || null,
      sameDownlineFirst: req.query.sameDownlineFirst === "true",
      name: req.query.name || null,
      memberId: req.query.memberId || null,
      phone: req.query.phone || null,
      rating: req.query.rating || null,
      status: req.query.status || null,
      countryId: req.query.countryId || null,
      stateId: req.query.stateId || null,
      districtId: req.query.districtId || null,
      villageId: req.query.villageId || null,
    });

    return response.successResponse(
      res,
      { holders: result.holders, pagination: result.pagination },
      "Holders retrieved"
    );
  } catch (err) {
    console.error("getHolders error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch holders" }],
      "Failed to fetch holders",
      500
    );
  }
}

/**
 * POST /api/users/appointments/book
 * Body: { holderId, designationCode, dateKey, slotId, beneficiary? }
 * beneficiary: { type: "SELF"|"OTHER", name?, phone? } for SBI PRO
 */
async function book(req, res) {
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

    const userId = req.user.id;
    const { holderId, designationCode, dateKey, slotId, beneficiary } = req.body;

    const userDetails = await UserDetails.findOne({ userId })
      .select("address countryId stateId districtId villageId")
      .lean();
    const hasCompleteAddress =
      !!userDetails &&
      !!userDetails.address &&
      !!userDetails.countryId &&
      !!userDetails.stateId &&
      !!userDetails.districtId &&
      !!userDetails.villageId;

    if (!hasCompleteAddress) {
      return appointmentErrorResponse(
        res,
        "Please complete your Address Details (country, state, district, native village and current address) in your profile before booking any appointment.",
        400,
        "ADDRESS_INCOMPLETE",
      );
    }

    const result = await bookAppointment(
      userId,
      holderId,
      designationCode,
      dateKey,
      slotId,
      beneficiary || {}
    );

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(
      res,
      { appointment: result.appointment },
      "Appointment requested"
    );
  } catch (err) {
    console.error("book error:", err);
    return appointmentErrorResponse(
      res,
      err.message || "Failed to book",
      500,
      err.code || undefined
    );
  }
}

/**
 * POST /api/users/appointments/book-batch
 * Body: { holderId, designationCode, dateKey, slotId, beneficiaries }
 * beneficiaries: [{ type, name?, phone? }, ...]
 */
async function bookBatch(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(res, errors.array(), "Validation failed", 400);
    }

    const userId = req.user.id;
    const { holderId, designationCode, dateKey, slotId, beneficiaries } = req.body;

    const result = await bookAppointmentBatch(
      userId,
      holderId,
      designationCode,
      dateKey,
      slotId,
      Array.isArray(beneficiaries) ? beneficiaries : []
    );

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(
      res,
      { appointments: result.appointments },
      "Appointments requested"
    );
  } catch (err) {
    console.error("bookBatch error:", err);
    return appointmentErrorResponse(
      res,
      err.message || "Failed to book",
      500,
      err.code || undefined
    );
  }
}

/**
 * GET /api/users/appointments/my
 */
async function getMy(req, res) {
  try {
    const userId = req.user.id;
    const result = await getMyAppointments(userId, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      requestedFrom: req.query.requestedFrom,
      requestedTo: req.query.requestedTo,
      holderSearch: req.query.holderSearch,
      forWhomSearch: req.query.forWhomSearch,
    });

    return response.successResponse(
      res,
      { appointments: result.appointments, pagination: result.pagination },
      "My appointments retrieved"
    );
  } catch (err) {
    console.error("getMy error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch appointments" }],
      "Failed to fetch appointments",
      500
    );
  }
}

/**
 * POST /api/users/appointments/cancel
 * Body: { appointmentId }
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

    const userId = req.user.id;
    const { appointmentId } = req.body;

    const result = await cancelByUser(userId, appointmentId);

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(res, {}, "Appointment cancelled");
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

/**
 * POST /api/users/appointments/rate
 * Body: { appointmentId, rating, review? }
 */
async function rate(req, res) {
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

    const userId = req.user.id;
    const { appointmentId, rating, review } = req.body;

    const result = await rateAppointment(
      userId,
      appointmentId,
      parseFloat(rating),
      review
    );

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(res, {}, "Rating submitted");
  } catch (err) {
    console.error("rate error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to rate" }],
      "Failed to rate",
      500
    );
  }
}

/**
 * GET /api/users/appointments/assigned
 * Holder view: appointments assigned to me
 */
async function getAssigned(req, res) {
  try {
    const userId = req.user.id;
    const result = await getAssignedAppointments(userId, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      designationCode: req.query.designationCode,
      requestedFrom: req.query.requestedFrom,
      requestedTo: req.query.requestedTo,
      forWhomSearch: req.query.forWhomSearch,
    });

    return response.successResponse(
      res,
      { appointments: result.appointments, pagination: result.pagination },
      "Assigned appointments retrieved"
    );
  } catch (err) {
    console.error("getAssigned error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch appointments" }],
      "Failed to fetch appointments",
      500
    );
  }
}

/**
 * POST /api/users/appointments/accept
 * Body: { appointmentId }
 */
async function accept(req, res) {
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

    const userId = req.user.id;
    const { appointmentId } = req.body;

    const result = await acceptAppointment(userId, appointmentId);

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(
      res,
      { appointment: result.appointment },
      "Appointment accepted"
    );
  } catch (err) {
    console.error("accept error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to accept" }],
      "Failed to accept",
      500
    );
  }
}

/**
 * POST /api/users/appointments/complete
 * Body: { appointmentId, notes?, durationMinutes?, mode? } (mode/notes/duration for Counsellor)
 */
async function complete(req, res) {
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

    const userId = req.user.id;
    const { appointmentId, notes, durationMinutes, mode } = req.body;

    const apt = await Appointment.findOne({
      _id: appointmentId,
      assignedTo: userId,
      status: "ACCEPTED",
    }).lean();

    if (!apt) {
      return appointmentErrorResponse(res, "Appointment not found or not in ACCEPTED status", 400, "APPOINTMENT_NOT_FOUND");
    }

    // Designation 2 (Counsellor): use CounsellingSession flow
    if (apt.designationCode === 2) {
      const result = await counsellorMarkComplete(userId, appointmentId, {
        notes,
        durationMinutes: durationMinutes != null ? parseInt(durationMinutes, 10) : null,
        mode: mode && ["ONLINE", "OFFLINE"].includes(mode) ? mode : null,
      });
      if (!result.success) {
        return appointmentErrorResponse(res, result.reason, 400, result.code);
      }
      return response.successResponse(
        res,
        { session: result.session },
        "Counselling marked complete. User confirmation pending."
      );
    }

    const result = await completeAppointment(userId, appointmentId);
    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }
    return response.successResponse(
      res,
      { appointment: result.appointment },
      "Appointment completed"
    );
  } catch (err) {
    console.error("complete error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to complete" }],
      "Failed to complete",
      500
    );
  }
}

/**
 * POST /api/users/appointments/reject
 * Body: { appointmentId }
 */
async function reject(req, res) {
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

    const userId = req.user.id;
    const { appointmentId } = req.body;

    const result = await rejectAppointment(userId, appointmentId);

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(res, {}, "Appointment rejected");
  } catch (err) {
    console.error("reject error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to reject" }],
      "Failed to reject",
      500
    );
  }
}

/**
 * POST /api/users/appointments/request-cancel
 * Body: { appointmentId, reason? }
 */
async function requestCancel(req, res) {
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

    const userId = req.user.id;
    const { appointmentId, reason } = req.body;

    const result = await requestCancelAppointment(
      userId,
      appointmentId,
      reason
    );

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(
      res,
      {},
      "Cancel request submitted"
    );
  } catch (err) {
    console.error("requestCancel error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to request cancel" }],
      "Failed to request cancel",
      500
    );
  }
}

/**
 * POST /api/users/appointments/toggle-online
 * Body: { designationCode }
 */
async function toggleOnline(req, res) {
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

    const userId = req.user.id;
    const designationCode = Number(req.body.designationCode);
    if (!Number.isInteger(designationCode) || designationCode < 1) {
      return appointmentErrorResponse(res, "Invalid designation code", 400);
    }

    const result = await toggleHolderOnline(userId, designationCode);

    if (!result.success) {
      return appointmentErrorResponse(res, result.reason, 400, result.code);
    }

    return response.successResponse(
      res,
      { online: !!result.online },
      result.online ? "You are now available" : "You are now offline"
    );
  } catch (err) {
    console.error("toggleOnline error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to toggle" }],
      "Failed to toggle",
      500
    );
  }
}

/**
 * GET /api/users/appointments/slots/:designationCode
 * List slots for designation
 */
async function getSlots(req, res) {
  try {
    const designationCode = parseInt(req.params.designationCode, 10);
    if (Number.isNaN(designationCode) || designationCode < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid designationCode" }],
        "Invalid designationCode",
        400
      );
    }
    const { getSlotsByDesignation } = require("../../../services/slotService");
    const result = await getSlotsByDesignation(designationCode, {
      page: req.query.page,
      limit: req.query.limit || 50,
      activeOnly: req.query.activeOnly !== "false",
    });
    return response.successResponse(
      res,
      result,
      "Slots retrieved"
    );
  } catch (err) {
    console.error("getSlots error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch slots" }],
      "Failed to fetch slots",
      500
    );
  }
}

/**
 * GET /api/users/appointments/slots-availability?holderId=&designationCode=&dateKey=
 * Get slots with booked count for holder+date
 */
async function getSlotsAvailability(req, res) {
  try {
    const { holderId, designationCode, dateKey } = req.query;
    if (!holderId || !designationCode || !dateKey) {
      return response.errorResponse(
        res,
        [{ msg: "holderId, designationCode, dateKey required" }],
        "Missing parameters",
        400
      );
    }
    const code = parseInt(designationCode, 10);
    if (Number.isNaN(code) || code < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid designationCode" }],
        "Invalid designationCode",
        400
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid dateKey (YYYY-MM-DD)" }],
        "Invalid dateKey",
        400
      );
    }
    const slots = await getSlotsWithAvailability(holderId, code, dateKey);
    return response.successResponse(
      res,
      { slots },
      "Slot availability retrieved"
    );
  } catch (err) {
    console.error("getSlotsAvailability error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch slot availability" }],
      "Failed to fetch slot availability",
      500
    );
  }
}

/**
 * GET /api/users/appointments/next-available/:holderId/:designationCode
 * Get next available date+slot for a holder (slot-aware)
 */
async function getNextAvailable(req, res) {
  try {
    const { holderId, designationCode } = req.params;
    const code = parseInt(designationCode, 10);

    if (Number.isNaN(code) || code < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid designationCode" }],
        "Invalid designationCode",
        400
      );
    }

    const next = await getNextAvailableSlot(holderId, code);
    if (typeof next === "string") {
      return response.successResponse(
        res,
        { dateKey: null, slotId: null, startTime: null, endTime: null, message: next },
        next
      );
    }
    return response.successResponse(
      res,
      {
        dateKey: next.dateKey,
        slotId: next.slotId,
        startTime: next.startTime,
        endTime: next.endTime,
      },
      "Next available slot retrieved"
    );
  } catch (err) {
    console.error("getNextAvailable error:", err);
    return response.errorResponse(
      res,
      [{ msg: err.message || "Failed to fetch next available" }],
      "Failed to fetch next available",
      500
    );
  }
}

module.exports = {
  getHolders,
  book,
  bookBatch,
  getMy,
  cancel,
  rate,
  getAssigned,
  accept,
  complete,
  reject,
  requestCancel,
  toggleOnline,
  getSlots,
  getSlotsAvailability,
  getNextAvailable,
};
