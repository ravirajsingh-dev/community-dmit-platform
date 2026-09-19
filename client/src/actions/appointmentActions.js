import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setDesignationOnline } from "./designationActions";

export const APPOINTMENT_HOLDERS_REQUEST = "APPOINTMENT_HOLDERS_REQUEST";
export const APPOINTMENT_HOLDERS_SUCCESS = "APPOINTMENT_HOLDERS_SUCCESS";
export const APPOINTMENT_HOLDERS_ERROR = "APPOINTMENT_HOLDERS_ERROR";
export const APPOINTMENT_BOOK_REQUEST = "APPOINTMENT_BOOK_REQUEST";
export const APPOINTMENT_BOOK_SUCCESS = "APPOINTMENT_BOOK_SUCCESS";
export const APPOINTMENT_BOOK_ERROR = "APPOINTMENT_BOOK_ERROR";
export const APPOINTMENT_MY_REQUEST = "APPOINTMENT_MY_REQUEST";
export const APPOINTMENT_MY_SUCCESS = "APPOINTMENT_MY_SUCCESS";
export const APPOINTMENT_MY_ERROR = "APPOINTMENT_MY_ERROR";
export const APPOINTMENT_CANCEL_REQUEST = "APPOINTMENT_CANCEL_REQUEST";
export const APPOINTMENT_CANCEL_SUCCESS = "APPOINTMENT_CANCEL_SUCCESS";
export const APPOINTMENT_CANCEL_ERROR = "APPOINTMENT_CANCEL_ERROR";
export const APPOINTMENT_RATE_REQUEST = "APPOINTMENT_RATE_REQUEST";
export const APPOINTMENT_RATE_SUCCESS = "APPOINTMENT_RATE_SUCCESS";
export const APPOINTMENT_RATE_ERROR = "APPOINTMENT_RATE_ERROR";
export const APPOINTMENT_ASSIGNED_REQUEST = "APPOINTMENT_ASSIGNED_REQUEST";
export const APPOINTMENT_ASSIGNED_SUCCESS = "APPOINTMENT_ASSIGNED_SUCCESS";
export const APPOINTMENT_ASSIGNED_ERROR = "APPOINTMENT_ASSIGNED_ERROR";
export const APPOINTMENT_ACCEPT_REQUEST = "APPOINTMENT_ACCEPT_REQUEST";
export const APPOINTMENT_ACCEPT_SUCCESS = "APPOINTMENT_ACCEPT_SUCCESS";
export const APPOINTMENT_ACCEPT_ERROR = "APPOINTMENT_ACCEPT_ERROR";
export const APPOINTMENT_COMPLETE_REQUEST = "APPOINTMENT_COMPLETE_REQUEST";
export const APPOINTMENT_COMPLETE_SUCCESS = "APPOINTMENT_COMPLETE_SUCCESS";
export const APPOINTMENT_COMPLETE_ERROR = "APPOINTMENT_COMPLETE_ERROR";
export const APPOINTMENT_REJECT_REQUEST = "APPOINTMENT_REJECT_REQUEST";
export const APPOINTMENT_REJECT_SUCCESS = "APPOINTMENT_REJECT_SUCCESS";
export const APPOINTMENT_REJECT_ERROR = "APPOINTMENT_REJECT_ERROR";
export const APPOINTMENT_REQUEST_CANCEL_REQUEST = "APPOINTMENT_REQUEST_CANCEL_REQUEST";
export const APPOINTMENT_REQUEST_CANCEL_SUCCESS = "APPOINTMENT_REQUEST_CANCEL_SUCCESS";
export const APPOINTMENT_REQUEST_CANCEL_ERROR = "APPOINTMENT_REQUEST_CANCEL_ERROR";
export const APPOINTMENT_TOGGLE_ONLINE_REQUEST = "APPOINTMENT_TOGGLE_ONLINE_REQUEST";
export const APPOINTMENT_TOGGLE_ONLINE_SUCCESS = "APPOINTMENT_TOGGLE_ONLINE_SUCCESS";
export const APPOINTMENT_TOGGLE_ONLINE_ERROR = "APPOINTMENT_TOGGLE_ONLINE_ERROR";

export const SET_APPLIED_PARAMS_BOOK_APPOINTMENT = "SET_APPLIED_PARAMS_BOOK_APPOINTMENT";
export const SET_APPLIED_PARAMS_MY_BOOKINGS = "SET_APPLIED_PARAMS_MY_BOOKINGS";
export const SET_APPLIED_PARAMS_ASSIGNED_TO_ME = "SET_APPLIED_PARAMS_ASSIGNED_TO_ME";

export const setAppliedParamsBookAppointment = (payload) => ({
  type: SET_APPLIED_PARAMS_BOOK_APPOINTMENT,
  payload,
});

export const setAppliedParamsMyBookings = (payload) => ({
  type: SET_APPLIED_PARAMS_MY_BOOKINGS,
  payload,
});

export const setAppliedParamsAssignedToMe = (payload) => ({
  type: SET_APPLIED_PARAMS_ASSIGNED_TO_ME,
  payload,
});

export const getSlotsByDesignation = (designationCode) => async (dispatch) => {
  try {
    const res = await api.get(
      `/api/users/appointments/slots/${designationCode}?limit=50`
    );
    return res.data?.response?.slots || [];
  } catch {
    return [];
  }
};

export const getSlotsAvailability =
  (holderId, designationCode, dateKey) => async (dispatch) => {
    try {
      const res = await api.get("/api/users/appointments/slots-availability", {
        params: { holderId, designationCode, dateKey },
      });
      return res.data?.response?.slots || [];
    } catch {
      return [];
    }
  };

export const getNextAvailableDate = (holderId, designationCode) => async () => {
  try {
    const res = await api.get(
      `/api/users/appointments/next-available/${holderId}/${designationCode}`
    );
    return res.data?.response?.nextAvailableDate || null;
  } catch {
    return null;
  }
};

export const bookAppointmentBatch =
  (holderId, designationCode, dateKey, slotId, beneficiaries) => async (dispatch) => {
    dispatch({ type: APPOINTMENT_BOOK_REQUEST });
    try {
      const res = await api.post("/api/users/appointments/book-batch", {
        holderId,
        designationCode,
        dateKey,
        slotId,
        beneficiaries,
      });
      if (res.data?.status) {
        dispatch({ type: APPOINTMENT_BOOK_SUCCESS });
        dispatch(setAlert("Appointments requested successfully", "success"));
      } else {
        dispatch({ type: APPOINTMENT_BOOK_ERROR });
        dispatch(setAlert(res.data?.message || "Failed to book", "danger"));
      }
    } catch (err) {
      dispatch({ type: APPOINTMENT_BOOK_ERROR });
      dispatch(setAlert(err.response?.data?.message || "Failed to book", "danger"));
    }
  };

export const getAppointmentHolders =
  (designationCode, params = {}) =>
  async (dispatch) => {
    dispatch({ type: APPOINTMENT_HOLDERS_REQUEST });
    try {
      const query = {
        page: params.page || 1,
        limit: params.limit || 20,
        online: params.online ? "true" : undefined,
        sortBy: params.sortBy || undefined,
        sameDownlineFirst: params.sameDownlineFirst ? "true" : undefined,
        name: params.name || undefined,
        memberId: params.memberId || undefined,
        phone: params.phone || undefined,
        rating: params.rating || undefined,
        status: params.status || undefined,
        countryId: params.countryId || undefined,
        stateId: params.stateId || undefined,
        districtId: params.districtId || undefined,
        villageId: params.villageId || undefined,
      };
      const res = await api.get(
        `/api/users/appointments/holders/${designationCode}`,
        { params: query }
      );
      if (res.data?.status && res.data?.response) {
        dispatch({
          type: APPOINTMENT_HOLDERS_SUCCESS,
          payload: { ...res.data.response, designationCode },
        });
      } else {
        dispatch({
          type: APPOINTMENT_HOLDERS_SUCCESS,
          payload: { holders: [], pagination: {}, designationCode },
        });
      }
    } catch (err) {
      dispatch({ type: APPOINTMENT_HOLDERS_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch holders",
          "danger"
        )
      );
    }
  };

export const bookAppointment =
  (holderId, designationCode, dateKey, slotId) => async (dispatch) => {
    dispatch({ type: APPOINTMENT_BOOK_REQUEST });
    try {
      const res = await api.post("/api/users/appointments/book", {
        holderId,
        designationCode,
        dateKey,
        slotId,
      });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_BOOK_SUCCESS });
      dispatch(setAlert("Appointment requested successfully", "success"));
      return { success: true, response: res.data?.response };
    } else {
      dispatch({ type: APPOINTMENT_BOOK_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to book appointment", "danger")
      );
      return {
        success: false,
        message: res.data?.message || "Failed to book appointment",
      };
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_BOOK_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to book appointment",
        "danger"
      )
    );
    return {
      success: false,
      message: err.response?.data?.message || "Failed to book appointment",
    };
  }
};

export const getMyAppointments = (params = {}) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_MY_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
      requestedFrom: params.requestedFrom || undefined,
      requestedTo: params.requestedTo || undefined,
      holderSearch: params.holderSearch || undefined,
      forWhomSearch: params.forWhomSearch || undefined,
    };
    const res = await api.get("/api/users/appointments/my", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: APPOINTMENT_MY_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({
        type: APPOINTMENT_MY_SUCCESS,
        payload: { appointments: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_MY_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch appointments",
        "danger"
      )
    );
  }
};

export const cancelAppointment = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_CANCEL_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/cancel", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_CANCEL_SUCCESS });
      dispatch(setAlert("Appointment cancelled", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: APPOINTMENT_CANCEL_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to cancel", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_CANCEL_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to cancel",
        "danger"
      )
    );
  }
};

export const rateAppointment = (appointmentId, rating, review, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_RATE_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/rate", {
      appointmentId,
      rating,
      review,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_RATE_SUCCESS });
      dispatch(setAlert("Rating submitted", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: APPOINTMENT_RATE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to submit rating", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_RATE_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to submit rating",
        "danger"
      )
    );
  }
};

export const getAssignedAppointments = (params = {}) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_ASSIGNED_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
      designationCode: params.designationCode != null && params.designationCode !== "" ? params.designationCode : undefined,
      requestedFrom: params.requestedFrom || undefined,
      requestedTo: params.requestedTo || undefined,
      forWhomSearch: params.forWhomSearch || undefined,
    };
    const res = await api.get("/api/users/appointments/assigned", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: APPOINTMENT_ASSIGNED_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({
        type: APPOINTMENT_ASSIGNED_SUCCESS,
        payload: { appointments: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_ASSIGNED_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch assigned appointments",
        "danger"
      )
    );
  }
};

export const acceptAppointment = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_ACCEPT_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/accept", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_ACCEPT_SUCCESS });
      dispatch(setAlert("Appointment accepted", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: APPOINTMENT_ACCEPT_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to accept", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_ACCEPT_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to accept",
        "danger"
      )
    );
  }
};

export const completeAppointment = (appointmentId, options = {}, onSuccess) => async (dispatch) => {
  // options: { notes?, durationMinutes?, mode? } for Counsellor
  const cb = typeof options === "function" ? options : onSuccess;
  const opts = typeof options === "function" ? {} : options || {};
  dispatch({ type: APPOINTMENT_COMPLETE_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/complete", {
      appointmentId,
      notes: opts.notes,
      durationMinutes: opts.durationMinutes,
      mode: opts.mode,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_COMPLETE_SUCCESS });
      dispatch(setAlert(res.data?.message || "Appointment completed", "success"));
      const callback = typeof options === "function" ? options : onSuccess;
      if (callback) callback();
    } else {
      dispatch({ type: APPOINTMENT_COMPLETE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to complete", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_COMPLETE_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to complete",
        "danger"
      )
    );
  }
};

export const rejectAppointment = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_REJECT_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/reject", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_REJECT_SUCCESS });
      dispatch(setAlert("Appointment rejected", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: APPOINTMENT_REJECT_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to reject", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_REJECT_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to reject",
        "danger"
      )
    );
  }
};

export const requestCancelAppointment = (appointmentId, reason, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_REQUEST_CANCEL_REQUEST });
  try {
    const res = await api.post("/api/users/appointments/request-cancel", {
      appointmentId,
      reason,
    });
    if (res.data?.status) {
      dispatch({ type: APPOINTMENT_REQUEST_CANCEL_SUCCESS });
      dispatch(setAlert("Cancel request submitted", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: APPOINTMENT_REQUEST_CANCEL_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to request cancel", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_REQUEST_CANCEL_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to request cancel",
        "danger"
      )
    );
  }
};

export const toggleHolderOnline = (designationCode, onSuccess) => async (dispatch) => {
  dispatch({ type: APPOINTMENT_TOGGLE_ONLINE_REQUEST });
  const code = typeof designationCode === "number" ? designationCode : parseInt(designationCode, 10);
  if (Number.isNaN(code)) {
    dispatch({ type: APPOINTMENT_TOGGLE_ONLINE_ERROR });
    dispatch(setAlert("Invalid designation", "danger"));
    return;
  }
  try {
    const res = await api.post("/api/users/appointments/toggle-online", {
      designationCode: code,
    });
    const ok = res.data?.status === true;
    const online = res.data?.response?.online ?? res.data?.online;
    if (ok && typeof online === "boolean") {
      dispatch({
        type: APPOINTMENT_TOGGLE_ONLINE_SUCCESS,
        payload: { designationCode: code, online },
      });
      dispatch(setDesignationOnline(code, online));
      dispatch(
        setAlert(
          online ? "You are now available" : "You are now offline",
          "success"
        )
      );
      if (onSuccess) onSuccess(online);
    } else {
      dispatch({ type: APPOINTMENT_TOGGLE_ONLINE_ERROR });
      const msg = res.data?.message || (Array.isArray(res.data?.errors) && res.data.errors[0]?.msg) || "Failed to toggle";
      dispatch(setAlert(msg, "danger"));
    }
  } catch (err) {
    dispatch({ type: APPOINTMENT_TOGGLE_ONLINE_ERROR });
    const msg = err.response?.data?.message
      || (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg)
      || err.message
      || "Failed to toggle";
    dispatch(setAlert(msg, "danger"));
  }
};
