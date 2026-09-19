import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const COUNSELLING_LIST_REQUEST = "COUNSELLING_LIST_REQUEST";
export const COUNSELLING_LIST_SUCCESS = "COUNSELLING_LIST_SUCCESS";
export const COUNSELLING_LIST_ERROR = "COUNSELLING_LIST_ERROR";
export const COUNSELLING_CONFIRM_REQUEST = "COUNSELLING_CONFIRM_REQUEST";
export const COUNSELLING_CONFIRM_SUCCESS = "COUNSELLING_CONFIRM_SUCCESS";
export const COUNSELLING_CONFIRM_ERROR = "COUNSELLING_CONFIRM_ERROR";
export const COUNSELLING_PENDING_COUNT_SUCCESS = "COUNSELLING_PENDING_COUNT_SUCCESS";
export const SET_APPLIED_PARAMS_MY_COUNSELLING = "SET_APPLIED_PARAMS_MY_COUNSELLING";

export const setAppliedParamsMyCounselling = (payload) => ({
  type: SET_APPLIED_PARAMS_MY_COUNSELLING,
  payload,
});

export const getMyCounsellingSessions = (params = {}) => async (dispatch) => {
  dispatch({ type: COUNSELLING_LIST_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || undefined,
    };
    const res = await api.get("/api/users/counselling-sessions", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: COUNSELLING_LIST_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({
        type: COUNSELLING_LIST_SUCCESS,
        payload: { sessions: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: COUNSELLING_LIST_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to fetch counselling sessions", "danger")
    );
  }
};

/** GET /api/users/counselling-sessions/pending-count - for banner on Appointments hub */
export const getPendingCounsellingCount = () => async (dispatch) => {
  try {
    const res = await api.get("/api/users/counselling-sessions/pending-count");
    if (res.data?.status && res.data?.response?.count != null) {
      dispatch({
        type: COUNSELLING_PENDING_COUNT_SUCCESS,
        payload: { count: res.data.response.count },
      });
    }
  } catch {
    // Silently ignore - banner is optional
  }
};

export const confirmCloseCounselling = (sessionId, data, onSuccess) => async (dispatch) => {
  dispatch({ type: COUNSELLING_CONFIRM_REQUEST });
  try {
    const res = await api.post(`/api/users/counselling-sessions/${sessionId}/confirm-close`, data);
    if (res.data?.status) {
      dispatch({ type: COUNSELLING_CONFIRM_SUCCESS });
      dispatch(setAlert(res.data?.message || "Updated", "success"));
      if (onSuccess) onSuccess(res.data?.response);
    } else {
      dispatch({ type: COUNSELLING_CONFIRM_ERROR });
      dispatch(setAlert(res.data?.message || "Failed", "danger"));
    }
  } catch (err) {
    dispatch({ type: COUNSELLING_CONFIRM_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to confirm", "danger")
    );
  }
};

/** POST /api/users/counselling-sessions/:id/mark-resolved - Counsellor marks issue resolved */
export const markResolvedCounselling = (sessionId, onSuccess) => async (dispatch) => {
  dispatch({ type: COUNSELLING_CONFIRM_REQUEST });
  try {
    const res = await api.post(`/api/users/counselling-sessions/${sessionId}/mark-resolved`);
    if (res.data?.status) {
      dispatch({ type: COUNSELLING_CONFIRM_SUCCESS });
      dispatch(setAlert(res.data?.message || "Marked as resolved", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: COUNSELLING_CONFIRM_ERROR });
      dispatch(setAlert(res.data?.message || "Failed", "danger"));
    }
  } catch (err) {
    dispatch({ type: COUNSELLING_CONFIRM_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to mark resolved", "danger")
    );
  }
};
