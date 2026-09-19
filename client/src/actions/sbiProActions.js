import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import {
  SBI_PRO_ASSIGNED_REQUEST,
  SBI_PRO_ASSIGNED_SUCCESS,
  SBI_PRO_ASSIGNED_ERROR,
  SBI_PRO_SESSION_REQUEST,
  SBI_PRO_SESSION_SUCCESS,
  SBI_PRO_SESSION_ERROR,
  SBI_PRO_UPLOAD_REQUEST,
  SBI_PRO_UPLOAD_SUCCESS,
  SBI_PRO_UPLOAD_ERROR,
  SBI_PRO_SUBMIT_REQUEST,
  SBI_PRO_SUBMIT_SUCCESS,
  SBI_PRO_SUBMIT_ERROR,
  SBI_PRO_PENDING_VERIFICATION_REQUEST,
  SBI_PRO_PENDING_VERIFICATION_SUCCESS,
  SBI_PRO_PENDING_VERIFICATION_ERROR,
  SBI_PRO_VERIFY_REQUEST,
  SBI_PRO_VERIFY_SUCCESS,
  SBI_PRO_VERIFY_ERROR,
  SBI_PRO_REPORTS_REQUEST,
  SBI_PRO_REPORTS_SUCCESS,
  SBI_PRO_REPORTS_ERROR,
  SBI_PRO_CLIENT_REPORTS_REQUEST,
  SBI_PRO_CLIENT_REPORTS_SUCCESS,
  SBI_PRO_CLIENT_REPORTS_ERROR,
} from "@src/constants/sbiProActionTypes";
import { FINGER_TYPES } from "@src/constants/sbiProConstants";

export {
  SBI_PRO_ASSIGNED_REQUEST,
  SBI_PRO_ASSIGNED_SUCCESS,
  SBI_PRO_ASSIGNED_ERROR,
  SBI_PRO_SESSION_REQUEST,
  SBI_PRO_SESSION_SUCCESS,
  SBI_PRO_SESSION_ERROR,
  SBI_PRO_UPLOAD_REQUEST,
  SBI_PRO_UPLOAD_SUCCESS,
  SBI_PRO_UPLOAD_ERROR,
  SBI_PRO_SUBMIT_REQUEST,
  SBI_PRO_SUBMIT_SUCCESS,
  SBI_PRO_SUBMIT_ERROR,
  SBI_PRO_PENDING_VERIFICATION_REQUEST,
  SBI_PRO_PENDING_VERIFICATION_SUCCESS,
  SBI_PRO_PENDING_VERIFICATION_ERROR,
  SBI_PRO_VERIFY_REQUEST,
  SBI_PRO_VERIFY_SUCCESS,
  SBI_PRO_VERIFY_ERROR,
};

export { FINGER_TYPES };

export const getMySbiProReports = () => async (dispatch) => {
  dispatch({ type: SBI_PRO_REPORTS_REQUEST });
  try {
    const res = await api.get("/api/users/sbi-pro-sessions/my-reports");
    const sessions = res.data?.status && res.data?.response?.sessions
      ? res.data.response.sessions
      : [];
    dispatch({ type: SBI_PRO_REPORTS_SUCCESS, payload: { sessions } });
    return sessions;
  } catch (err) {
    dispatch({ type: SBI_PRO_REPORTS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch reports", "danger"));
    return [];
  }
};

export const getClientReports = () => async (dispatch) => {
  dispatch({ type: SBI_PRO_CLIENT_REPORTS_REQUEST });
  try {
    const res = await api.get("/api/users/sbi-pro-sessions/client-reports");
    const sessions = res.data?.status && res.data?.response?.sessions
      ? res.data.response.sessions
      : [];
    dispatch({ type: SBI_PRO_CLIENT_REPORTS_SUCCESS, payload: { sessions } });
    return sessions;
  } catch (err) {
    dispatch({ type: SBI_PRO_CLIENT_REPORTS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch client reports", "danger"));
    return [];
  }
};

export const getAssignedSbiProSessions = (params = {}) => async (dispatch) => {
  dispatch({ type: SBI_PRO_ASSIGNED_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || undefined,
    };
    const res = await api.get("/api/users/sbi-pro-sessions/assigned", {
      params: query,
    });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: SBI_PRO_ASSIGNED_SUCCESS,
        payload: {
          sessions: res.data.response.sessions || [],
          pagination: res.data.response.pagination || {},
        },
      });
    } else {
      dispatch({
        type: SBI_PRO_ASSIGNED_SUCCESS,
        payload: { sessions: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_ASSIGNED_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch SBI PRO sessions",
        "danger"
      )
    );
  }
};

export const getSbiProSession = (appointmentId) => async (dispatch) => {
  dispatch({ type: SBI_PRO_SESSION_REQUEST });
  try {
    const res = await api.get(
      `/api/users/sbi-pro-sessions/${appointmentId}`
    );
    if (res.data?.status && res.data?.response?.session) {
      dispatch({
        type: SBI_PRO_SESSION_SUCCESS,
        payload: { session: res.data.response.session },
      });
    } else {
      dispatch({ type: SBI_PRO_SESSION_ERROR });
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_SESSION_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch session",
        "danger"
      )
    );
  }
};

export const uploadSbiProFinger = (appointmentId, fingerType, file, onSuccess) => async (dispatch) => {
  dispatch({ type: SBI_PRO_UPLOAD_REQUEST, meta: { fingerType } });
  try {
    const formData = new FormData();
    formData.append("appointmentId", appointmentId);
    formData.append("fingerType", fingerType);
    formData.append("image", file);

    const res = await api.post("/api/users/sbi-pro-sessions/upload", formData);
    if (res.data?.status) {
      dispatch({
        type: SBI_PRO_UPLOAD_SUCCESS,
        payload: { session: res.data.response?.session },
        meta: { fingerType },
      });
      dispatch(setAlert("Image uploaded", "success"));
      if (onSuccess) onSuccess(res.data.response?.session);
    } else {
      dispatch({ type: SBI_PRO_UPLOAD_ERROR, meta: { fingerType } });
      dispatch(
        setAlert(res.data?.message || "Upload failed", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_UPLOAD_ERROR, meta: { fingerType } });
    dispatch(
      setAlert(
        err.response?.data?.message || "Upload failed",
        "danger"
      )
    );
  }
};

export const submitSbiProSession = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: SBI_PRO_SUBMIT_REQUEST });
  try {
    const res = await api.post("/api/users/sbi-pro-sessions/submit", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({
        type: SBI_PRO_SUBMIT_SUCCESS,
        payload: { session: res.data.response?.session },
      });
      dispatch(setAlert("Session submitted for verification", "success"));
      if (onSuccess) onSuccess(res.data.response?.session);
    } else {
      dispatch({ type: SBI_PRO_SUBMIT_ERROR });
      dispatch(
        setAlert(res.data?.message || "Submit failed", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_SUBMIT_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Submit failed",
        "danger"
      )
    );
  }
};

export const getPendingSbiProVerification = () => async (dispatch) => {
  dispatch({ type: SBI_PRO_PENDING_VERIFICATION_REQUEST });
  try {
    const res = await api.get("/api/users/sbi-pro-sessions/pending-verification");
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: SBI_PRO_PENDING_VERIFICATION_SUCCESS,
        payload: {
          sessions: res.data.response.sessions || [],
        },
      });
    } else {
      dispatch({
        type: SBI_PRO_PENDING_VERIFICATION_SUCCESS,
        payload: { sessions: [] },
      });
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_PENDING_VERIFICATION_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch pending verifications",
        "danger"
      )
    );
  }
};

export const verifySbiProSession = (appointmentId, confirm, onSuccess) => async (dispatch) => {
  dispatch({ type: SBI_PRO_VERIFY_REQUEST });
  try {
    const res = await api.post("/api/users/sbi-pro-sessions/verify", {
      appointmentId,
      confirm,
    });
    if (res.data?.status) {
      dispatch({
        type: SBI_PRO_VERIFY_SUCCESS,
        payload: { session: res.data.response?.session },
      });
      dispatch(
        setAlert(
          confirm ? "Verification confirmed" : "Session reopened for trainer",
          "success"
        )
      );
      if (onSuccess) onSuccess(res.data.response?.session);
    } else {
      dispatch({ type: SBI_PRO_VERIFY_ERROR });
      dispatch(
        setAlert(res.data?.message || "Verify failed", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: SBI_PRO_VERIFY_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Verify failed",
        "danger"
      )
    );
  }
};
