import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_SLOTS_REQUEST = "ADMIN_SLOTS_REQUEST";
export const ADMIN_SLOTS_SUCCESS = "ADMIN_SLOTS_SUCCESS";
export const ADMIN_SLOTS_ERROR = "ADMIN_SLOTS_ERROR";
export const ADMIN_SLOT_CREATE_REQUEST = "ADMIN_SLOT_CREATE_REQUEST";
export const ADMIN_SLOT_CREATE_SUCCESS = "ADMIN_SLOT_CREATE_SUCCESS";
export const ADMIN_SLOT_CREATE_ERROR = "ADMIN_SLOT_CREATE_ERROR";
export const ADMIN_SLOT_UPDATE_REQUEST = "ADMIN_SLOT_UPDATE_REQUEST";
export const ADMIN_SLOT_UPDATE_SUCCESS = "ADMIN_SLOT_UPDATE_SUCCESS";
export const ADMIN_SLOT_UPDATE_ERROR = "ADMIN_SLOT_UPDATE_ERROR";
export const ADMIN_SLOT_TOGGLE_REQUEST = "ADMIN_SLOT_TOGGLE_REQUEST";
export const ADMIN_SLOT_TOGGLE_SUCCESS = "ADMIN_SLOT_TOGGLE_SUCCESS";
export const ADMIN_SLOT_TOGGLE_ERROR = "ADMIN_SLOT_TOGGLE_ERROR";

export const getAdminSlots = (params = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_SLOTS_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.designationCode && { designationCode: params.designationCode }),
    };
    const res = await api.get("/api/admin/slots", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: ADMIN_SLOTS_SUCCESS,
        payload: {
          slots: res.data.response.slots || [],
          pagination: res.data.response.pagination || {},
          designations: res.data.response.designations || [],
        },
      });
    } else {
      dispatch({
        type: ADMIN_SLOTS_SUCCESS,
        payload: { slots: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_SLOTS_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to fetch slots", "danger")
    );
  }
};

export const createSlot = (data, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_SLOT_CREATE_REQUEST });
  try {
    const res = await api.post("/api/admin/slots", data);
    if (res.data?.status) {
      dispatch({ type: ADMIN_SLOT_CREATE_SUCCESS });
      dispatch(setAlert("Slot created", "success"));
      if (onSuccess) onSuccess(res.data?.response?.slot);
    } else {
      dispatch({ type: ADMIN_SLOT_CREATE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to create slot", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_SLOT_CREATE_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to create slot", "danger")
    );
  }
};

export const updateSlot = (slotId, data, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_SLOT_UPDATE_REQUEST });
  try {
    const res = await api.put(`/api/admin/slots/${slotId}`, data);
    if (res.data?.status) {
      dispatch({ type: ADMIN_SLOT_UPDATE_SUCCESS });
      dispatch(setAlert("Slot updated", "success"));
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_SLOT_UPDATE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to update slot", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_SLOT_UPDATE_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to update slot", "danger")
    );
  }
};

export const toggleSlot = (slotId, onSuccess) => async (dispatch) => {
  dispatch({ type: ADMIN_SLOT_TOGGLE_REQUEST });
  try {
    const res = await api.patch(`/api/admin/slots/${slotId}/toggle`);
    if (res.data?.status) {
      dispatch({ type: ADMIN_SLOT_TOGGLE_SUCCESS });
      dispatch(
        setAlert(
          res.data?.response?.active ? "Slot activated" : "Slot deactivated",
          "success"
        )
      );
      if (onSuccess) onSuccess();
    } else {
      dispatch({ type: ADMIN_SLOT_TOGGLE_ERROR });
      dispatch(
        setAlert(res.data?.message || "Failed to toggle slot", "danger")
      );
    }
  } catch (err) {
    dispatch({ type: ADMIN_SLOT_TOGGLE_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to toggle slot", "danger")
    );
  }
};
