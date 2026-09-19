import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_APPOINTMENTS_REQUEST = "ADMIN_APPOINTMENTS_REQUEST";
export const ADMIN_APPOINTMENTS_SUCCESS = "ADMIN_APPOINTMENTS_SUCCESS";
export const ADMIN_APPOINTMENTS_ERROR = "ADMIN_APPOINTMENTS_ERROR";
export const ADMIN_APPOINTMENT_APPROVE_CANCEL_REQUEST =
  "ADMIN_APPOINTMENT_APPROVE_CANCEL_REQUEST";
export const ADMIN_APPOINTMENT_APPROVE_CANCEL_SUCCESS =
  "ADMIN_APPOINTMENT_APPROVE_CANCEL_SUCCESS";
export const ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR =
  "ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR";
export const ADMIN_APPOINTMENT_REJECT_CANCEL_REQUEST =
  "ADMIN_APPOINTMENT_REJECT_CANCEL_REQUEST";
export const ADMIN_APPOINTMENT_REJECT_CANCEL_SUCCESS =
  "ADMIN_APPOINTMENT_REJECT_CANCEL_SUCCESS";
export const ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR =
  "ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR";
export const ADMIN_APPOINTMENT_CANCEL_REQUEST = "ADMIN_APPOINTMENT_CANCEL_REQUEST";
export const ADMIN_APPOINTMENT_CANCEL_SUCCESS = "ADMIN_APPOINTMENT_CANCEL_SUCCESS";
export const ADMIN_APPOINTMENT_CANCEL_ERROR = "ADMIN_APPOINTMENT_CANCEL_ERROR";

/** GET /api/admin/appointments?status=&designationCode=&dateFrom=&dateTo=&page=&limit= */
export const getAppointments = (params = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_APPOINTMENTS_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: Math.min(params.limit || 20, 100),
      ...(params.status && { status: params.status }),
      ...(params.designationCode && { designationCode: params.designationCode }),
      ...(params.dateFrom && { dateFrom: params.dateFrom }),
      ...(params.dateTo && { dateTo: params.dateTo }),
    };
    const res = await api.get("/api/admin/appointments", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: ADMIN_APPOINTMENTS_SUCCESS,
        payload: {
          appointments: res.data.response.appointments || [],
          pagination: res.data.response.pagination || {},
          designations: res.data.response.designations || [],
        },
      });
    } else {
      dispatch({
        type: ADMIN_APPOINTMENTS_SUCCESS,
        payload: { appointments: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_APPOINTMENTS_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch appointments",
        "danger"
      )
    );
  }
};

/** POST /api/admin/appointments/approve-cancel */
export const approveCancelRequest = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_APPOINTMENT_APPROVE_CANCEL_REQUEST });
  try {
    const res = await api.post("/api/admin/appointments/approve-cancel", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: ADMIN_APPOINTMENT_APPROVE_CANCEL_SUCCESS });
      dispatch(setAlert("Cancel request approved", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to approve", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_APPOINTMENT_APPROVE_CANCEL_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to approve",
        "danger"
      )
    );
  }
};

/** POST /api/admin/appointments/reject-cancel */
export const rejectCancelRequest = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_APPOINTMENT_REJECT_CANCEL_REQUEST });
  try {
    const res = await api.post("/api/admin/appointments/reject-cancel", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: ADMIN_APPOINTMENT_REJECT_CANCEL_SUCCESS });
      dispatch(setAlert("Cancel request rejected", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to reject", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_APPOINTMENT_REJECT_CANCEL_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to reject",
        "danger"
      )
    );
  }
};

/** POST /api/admin/appointments/create-sbi-pro-override - Phase 7 */
export const createSbiProOverride = (payload, onSuccess) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/appointments/create-sbi-pro-override", payload);
    if (res.data?.status) {
      dispatch(setAlert("SBI PRO appointment created (override)", "success"));
      if (onSuccess) onSuccess(res.data?.response?.appointment);
    } else {
      dispatch(setAlert(res.data?.message || "Failed to create", "danger"));
    }
  } catch (err) {
    dispatch(setAlert(err.response?.data?.message || "Failed to create", "danger"));
  }
};

/** POST /api/admin/appointments/cancel */
export const adminCancelAppointment =
  (appointmentId, reason, onSuccess) => async (dispatch) => {
    dispatch({ type: ADMIN_APPOINTMENT_CANCEL_REQUEST });
    try {
      const res = await api.post("/api/admin/appointments/cancel", {
        appointmentId,
        reason,
      });
      if (res.data?.status) {
        dispatch({ type: ADMIN_APPOINTMENT_CANCEL_SUCCESS });
        dispatch(setAlert("Appointment cancelled", "success"));
        if (onSuccess) onSuccess();
      } else {
        dispatch({ type: ADMIN_APPOINTMENT_CANCEL_ERROR });
        dispatch(
          setAlert(res.data?.message || "Failed to cancel", "danger")
        );
      }
    } catch (err) {
      dispatch({ type: ADMIN_APPOINTMENT_CANCEL_ERROR });
      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to cancel",
          "danger"
        )
      );
    }
  };
