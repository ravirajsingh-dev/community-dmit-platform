import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_SBI_PRO_LIST_REQUEST = "ADMIN_SBI_PRO_LIST_REQUEST";
export const ADMIN_SBI_PRO_LIST_SUCCESS = "ADMIN_SBI_PRO_LIST_SUCCESS";
export const ADMIN_SBI_PRO_LIST_ERROR = "ADMIN_SBI_PRO_LIST_ERROR";
export const ADMIN_SBI_PRO_COMPLETE_REQUEST = "ADMIN_SBI_PRO_COMPLETE_REQUEST";
export const ADMIN_SBI_PRO_COMPLETE_SUCCESS = "ADMIN_SBI_PRO_COMPLETE_SUCCESS";
export const ADMIN_SBI_PRO_COMPLETE_ERROR = "ADMIN_SBI_PRO_COMPLETE_ERROR";

export const getAdminSbiProSessions = (params = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_SBI_PRO_LIST_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: Math.min(params.limit || 20, 100),
      ...(params.status && { status: params.status }),
      ...(params.trainerId && { trainerId: params.trainerId }),
      ...(params.userMemberId && { userMemberId: params.userMemberId }),
      ...(params.dateFrom && { dateFrom: params.dateFrom }),
      ...(params.dateTo && { dateTo: params.dateTo }),
    };
    const res = await api.get("/api/admin/sbi-pro-sessions", { params: query });
    const data = res?.data;
    const response = data?.response;
    if (data?.status === true) {
      dispatch({
        type: ADMIN_SBI_PRO_LIST_SUCCESS,
        payload: {
          sessions: Array.isArray(response?.sessions) ? response.sessions : [],
          pagination: response?.pagination || {},
        },
      });
    } else {
      dispatch({
        type: ADMIN_SBI_PRO_LIST_SUCCESS,
        payload: { sessions: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_SBI_PRO_LIST_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || err.message || "Failed to fetch SBI PRO sessions",
        "danger"
      )
    );
  }
};

export const deleteSbiProFingerImage = (appointmentId, fingerType) => async (dispatch) => {
  try {
    const res = await api.delete("/api/admin/sbi-pro-sessions/image", {
      params: { appointmentId, fingerType },
    });
    if (res.data?.status) {
      dispatch(setAlert("Image deleted permanently from storage", "success"));
      return res.data?.response?.session ?? null;
    }
    dispatch(setAlert(res.data?.message || "Failed to delete", "danger"));
    return null;
  } catch (err) {
    dispatch(
      setAlert(err.response?.data?.message || "Failed to delete image", "danger")
    );
    throw err;
  }
};

export const deleteSbiProAllFingerImages = (appointmentId, onSuccess) => async (dispatch) => {
  try {
    const res = await api.delete("/api/admin/sbi-pro-sessions/images", {
      params: { appointmentId },
    });
    if (res.data?.status) {
      dispatch(setAlert("All finger images deleted permanently from storage", "success"));
      if (onSuccess) onSuccess(res.data?.response?.session);
      return res.data?.response?.session ?? null;
    }
    dispatch(setAlert(res.data?.message || "Failed to delete", "danger"));
    return null;
  } catch (err) {
    dispatch(
      setAlert(err.response?.data?.message || "Failed to delete images", "danger")
    );
    throw err;
  }
};

export const getSbiProFingerAnalysis = (appointmentId) => async () => {
  const res = await api.get(`/api/admin/sbi-pro-sessions/analysis/${appointmentId}`);
  return res.data?.response ?? { fingers: {} };
};

export const saveSbiProFingerAnalysis = (appointmentId, fingers, onSuccess) => async (dispatch) => {
  try {
    const res = await api.put("/api/admin/sbi-pro-sessions/analysis", {
      appointmentId,
      fingers,
    });
    if (res.data?.status) {
      dispatch(setAlert("Finger analysis saved successfully", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch(setAlert(res.data?.message || "Failed to save", "danger"));
    }
  } catch (err) {
    dispatch(
      setAlert(err.response?.data?.message || "Failed to save finger analysis", "danger")
    );
    throw err;
  }
};

export const uploadSbiProReport = (appointmentId, file, onComplete) => async (dispatch) => {
  try {
    const formData = new FormData();
    formData.append("appointmentId", appointmentId);
    formData.append("file", file);
    const res = await api.post("/api/admin/sbi-pro-sessions/upload-report", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data?.status) {
      dispatch(setAlert("Report uploaded, session closed", "success"));
      if (onComplete) onComplete(res.data?.response?.session);
    } else {
      dispatch(setAlert(res.data?.message || "Failed to upload report", "danger"));
      if (onComplete) onComplete(null);
    }
  } catch (err) {
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to upload report",
        "danger"
      )
    );
    if (onComplete) onComplete(null);
  }
};

export const replaceSbiProReport = (appointmentId, file, onComplete) => async (dispatch) => {
  try {
    const formData = new FormData();
    formData.append("appointmentId", appointmentId);
    formData.append("file", file);
    const res = await api.post("/api/admin/sbi-pro-sessions/replace-report", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data?.status) {
      dispatch(setAlert("Report replaced successfully", "success"));
      if (onComplete) onComplete(res.data?.response?.session);
    } else {
      dispatch(setAlert(res.data?.message || "Failed to replace report", "danger"));
      if (onComplete) onComplete(null);
    }
  } catch (err) {
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to replace report",
        "danger"
      )
    );
    if (onComplete) onComplete(null);
  }
};

export const completeSbiProAnalysis = (appointmentId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_SBI_PRO_COMPLETE_REQUEST });
  try {
    const res = await api.post("/api/admin/sbi-pro-sessions/complete", {
      appointmentId,
    });
    if (res.data?.status) {
      dispatch({ type: ADMIN_SBI_PRO_COMPLETE_SUCCESS });
      dispatch(setAlert("Analysis marked done, session closed", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_SBI_PRO_COMPLETE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to complete", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_SBI_PRO_COMPLETE_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to complete",
        "danger"
      )
    );
  }
};
