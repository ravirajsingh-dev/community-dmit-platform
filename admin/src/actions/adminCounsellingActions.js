import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_COUNSELLING_REQUEST = "ADMIN_COUNSELLING_REQUEST";
export const ADMIN_COUNSELLING_SUCCESS = "ADMIN_COUNSELLING_SUCCESS";
export const ADMIN_COUNSELLING_ERROR = "ADMIN_COUNSELLING_ERROR";
export const ADMIN_COUNSELLING_CONFIRM_REQUEST = "ADMIN_COUNSELLING_CONFIRM_REQUEST";
export const ADMIN_COUNSELLING_CONFIRM_SUCCESS = "ADMIN_COUNSELLING_CONFIRM_SUCCESS";
export const ADMIN_COUNSELLING_CONFIRM_ERROR = "ADMIN_COUNSELLING_CONFIRM_ERROR";

/** GET /api/admin/counselling-sessions */
export const getAdminCounsellingSessions = (params = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_COUNSELLING_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || undefined,
      counsellorMemberId: params.counsellorMemberId || undefined,
      requesterMemberId: params.requesterMemberId || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
    };
    const res = await api.get("/api/admin/counselling-sessions", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: ADMIN_COUNSELLING_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({
        type: ADMIN_COUNSELLING_SUCCESS,
        payload: { sessions: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_COUNSELLING_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to fetch counselling sessions", "danger")
    );
  }
};

/** POST /api/admin/counselling-sessions/:id/confirm-close */
export const adminConfirmCloseCounselling = (sessionId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_COUNSELLING_CONFIRM_REQUEST });
  try {
    const res = await api.post(`/api/admin/counselling-sessions/${sessionId}/confirm-close`);
    if (res.data?.status) {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_SUCCESS });
      dispatch(setAlert("Session closed by admin (commission credited)", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
      dispatch(setAlert(res.data?.message || "Failed to close", "danger"));
    }
  } catch (err) {
    dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to close session", "danger")
    );
  }
};

/** POST /api/admin/counselling-sessions/:id/close-without-commission */
export const adminCloseWithoutCommissionCounselling = (sessionId, reason, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_COUNSELLING_CONFIRM_REQUEST });
  try {
    const res = await api.post(`/api/admin/counselling-sessions/${sessionId}/close-without-commission`, {
      reason,
    });
    if (res.data?.status) {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_SUCCESS });
      dispatch(setAlert("Session marked for re-counselling without commission", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
      dispatch(setAlert(res.data?.message || "Failed", "danger"));
    }
  } catch (err) {
    dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed", "danger"));
  }
};

/** POST /api/admin/counselling-sessions/:id/request-recounselling */
export const adminRequestRecounsellingCounselling = (sessionId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_COUNSELLING_CONFIRM_REQUEST });
  try {
    const res = await api.post(`/api/admin/counselling-sessions/${sessionId}/request-recounselling`);
    if (res.data?.status) {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_SUCCESS });
      dispatch(setAlert(res.data?.message || "Re-counselling requested", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
      dispatch(setAlert(res.data?.message || "Failed", "danger"));
    }
  } catch (err) {
    dispatch({ type: ADMIN_COUNSELLING_CONFIRM_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed", "danger"));
  }
};
