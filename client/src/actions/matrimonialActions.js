import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";

export const MATRIMONIAL_APPLY_START = "MATRIMONIAL_APPLY_START";
export const MATRIMONIAL_APPLY_SUCCESS = "MATRIMONIAL_APPLY_SUCCESS";
export const MATRIMONIAL_APPLY_FAIL = "MATRIMONIAL_APPLY_FAIL";
export const MATRIMONIAL_FETCH_ME_START = "MATRIMONIAL_FETCH_ME_START";
export const MATRIMONIAL_FETCH_ME_SUCCESS = "MATRIMONIAL_FETCH_ME_SUCCESS";
export const MATRIMONIAL_FETCH_ME_FAIL = "MATRIMONIAL_FETCH_ME_FAIL";
export const MATRIMONIAL_UPDATE_START = "MATRIMONIAL_UPDATE_START";
export const MATRIMONIAL_UPDATE_SUCCESS = "MATRIMONIAL_UPDATE_SUCCESS";
export const MATRIMONIAL_UPDATE_FAIL = "MATRIMONIAL_UPDATE_FAIL";
export const MATRIMONIAL_ACTIVATE_START = "MATRIMONIAL_ACTIVATE_START";
export const MATRIMONIAL_ACTIVATE_SUCCESS = "MATRIMONIAL_ACTIVATE_SUCCESS";
export const MATRIMONIAL_ACTIVATE_FAIL = "MATRIMONIAL_ACTIVATE_FAIL";
export const MATRIMONIAL_DEACTIVATE_START = "MATRIMONIAL_DEACTIVATE_START";
export const MATRIMONIAL_DEACTIVATE_SUCCESS = "MATRIMONIAL_DEACTIVATE_SUCCESS";
export const MATRIMONIAL_DEACTIVATE_FAIL = "MATRIMONIAL_DEACTIVATE_FAIL";
export const MATRIMONIAL_DELETE_START = "MATRIMONIAL_DELETE_START";
export const MATRIMONIAL_DELETE_SUCCESS = "MATRIMONIAL_DELETE_SUCCESS";
export const MATRIMONIAL_DELETE_FAIL = "MATRIMONIAL_DELETE_FAIL";
export const MATRIMONIAL_LIST_START = "MATRIMONIAL_LIST_START";
export const MATRIMONIAL_LIST_SUCCESS = "MATRIMONIAL_LIST_SUCCESS";
export const MATRIMONIAL_LIST_FAIL = "MATRIMONIAL_LIST_FAIL";
export const MATRIMONIAL_PROFILE_START = "MATRIMONIAL_PROFILE_START";
export const MATRIMONIAL_PROFILE_SUCCESS = "MATRIMONIAL_PROFILE_SUCCESS";
export const MATRIMONIAL_PROFILE_FAIL = "MATRIMONIAL_PROFILE_FAIL";
export const MATRIMONIAL_MATCHES_START = "MATRIMONIAL_MATCHES_START";
export const MATRIMONIAL_MATCHES_SUCCESS = "MATRIMONIAL_MATCHES_SUCCESS";
export const MATRIMONIAL_MATCHES_FAIL = "MATRIMONIAL_MATCHES_FAIL";

/**
 * Apply for Matrimonial. Profile becomes visible immediately (no admin approval).
 * On validation failure returns { success: false, message, missingFields } so UI can show which fields to complete.
 */
export const applyForMatrimonial = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: MATRIMONIAL_APPLY_START });
  try {
    const res = await api.post("/api/users/matrimonial/apply");
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_APPLY_SUCCESS, payload: res.data.response });
      dispatch(setAlert(res.data.message || "Profile created. You are now visible in listings.", "success"));
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_APPLY_FAIL });
    const message = res.data?.message || res.data?.errors?.[0]?.msg || "Failed to apply";
    const missingFields = res.data?.missingFields || [];
    if (missingFields.length > 0) {
      dispatch(setAlert("Please complete the required profile fields below, then try again.", "warning"));
    } else {
      dispatch(setAlert(message, "danger"));
    }
    if (res.data?.errors?.length) {
      res.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
    }
    return { success: false, message, missingFields };
  } catch (err) {
    dispatch({ type: MATRIMONIAL_APPLY_FAIL });
    const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to apply";
    const missingFields = err.response?.data?.missingFields || [];
    if (missingFields.length > 0) {
      dispatch(setAlert("Please complete the required profile fields below, then try again.", "warning"));
    } else {
      dispatch(setAlert(message, "danger"));
    }
    return { success: false, message, missingFields };
  }
};

export const getMyMatrimonialProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch({ type: MATRIMONIAL_FETCH_ME_START });
  try {
    const res = await api.get("/api/users/matrimonial/me");
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_FETCH_ME_SUCCESS, payload: res.data.response });
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_FETCH_ME_FAIL });
    return null;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_FETCH_ME_FAIL });
    return null;
  }
};

export const updateMatrimonialProfile = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: MATRIMONIAL_UPDATE_START });
  try {
    const res = await api.put("/api/users/matrimonial/me", payload);
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_UPDATE_SUCCESS, payload: res.data.response });
      dispatch(setAlert("Profile updated", "success"));
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_UPDATE_FAIL });
    dispatch(setAlert(res.data?.message || "Update failed", "danger"));
    return null;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_UPDATE_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Update failed", "danger"));
    return null;
  }
};

export const activateMatrimonialProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: MATRIMONIAL_ACTIVATE_START });
  try {
    const res = await api.put("/api/users/matrimonial/me/activate");
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_ACTIVATE_SUCCESS, payload: res.data.response });
      dispatch(setAlert("Profile activated. You are now visible in listings.", "success"));
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_ACTIVATE_FAIL });
    dispatch(setAlert(res.data?.message || "Activation failed", "danger"));
    return null;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_ACTIVATE_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Activation failed", "danger"));
    return null;
  }
};

export const deactivateMatrimonialProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: MATRIMONIAL_DEACTIVATE_START });
  try {
    const res = await api.put("/api/users/matrimonial/me/deactivate");
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_DEACTIVATE_SUCCESS, payload: res.data.response });
      dispatch(setAlert("Profile deactivated. You are hidden from listings.", "success"));
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_DEACTIVATE_FAIL });
    dispatch(setAlert(res.data?.message || "Deactivation failed", "danger"));
    return null;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_DEACTIVATE_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Deactivation failed", "danger"));
    return null;
  }
};

export const deleteMatrimonialProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: MATRIMONIAL_DELETE_START });
  try {
    const res = await api.delete("/api/users/matrimonial/me");
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_DELETE_SUCCESS });
      dispatch(setAlert("Matrimonial profile deleted permanently.", "success"));
      return true;
    }
    dispatch({ type: MATRIMONIAL_DELETE_FAIL });
    dispatch(setAlert(res.data?.message || "Delete failed", "danger"));
    return false;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_DELETE_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Delete failed", "danger"));
    return false;
  }
};

/**
 * Get matrimonial list with filters. Works even if user has not applied.
 * Params: page, limit, communityScope (my_community | all), communityId, vanshId, kulId, khampId, gotraId,
 * gender, maritalStatus, education, occupation, countryId, stateId, districtId, villageId, ageMin, ageMax, search.
 */
export const getMatrimonialList = (params = {}) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch({ type: MATRIMONIAL_LIST_START });
  try {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        query.set(key, params[key]);
      }
    });
    const res = await api.get(`/api/users/matrimonial/list?${query.toString()}`);
    if (res.data.status === true) {
      const payload = res.data.response;
      dispatch({ type: MATRIMONIAL_LIST_SUCCESS, payload });
      return payload;
    }
    dispatch({ type: MATRIMONIAL_LIST_FAIL });
    return { list: [], pagination: {} };
  } catch (err) {
    dispatch({ type: MATRIMONIAL_LIST_FAIL });
    return { list: [], pagination: {} };
  }
};

/**
 * Get full matrimonial profile by id. Records view.
 */
export const getMatrimonialProfileById = (id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch({ type: MATRIMONIAL_PROFILE_START });
  try {
    const res = await api.get(`/api/users/matrimonial/profile/${id}`);
    if (res.data.status === true) {
      dispatch({ type: MATRIMONIAL_PROFILE_SUCCESS, payload: res.data.response });
      return res.data.response;
    }
    dispatch({ type: MATRIMONIAL_PROFILE_FAIL });
    return null;
  } catch (err) {
    dispatch({ type: MATRIMONIAL_PROFILE_FAIL });
    return null;
  }
};

/**
 * Get matrimonial matches (alias for list with default params). Same community default, fallback all.
 */
export const getMatrimonialMatches = (params = {}) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch({ type: MATRIMONIAL_MATCHES_START });
  try {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        query.set(key, params[key]);
      }
    });
    const res = await api.get(`/api/users/matrimonial/matches?${query.toString()}`);
    if (res.data.status === true) {
      const payload = res.data.response;
      dispatch({ type: MATRIMONIAL_MATCHES_SUCCESS, payload });
      return payload;
    }
    dispatch({ type: MATRIMONIAL_MATCHES_FAIL });
    return { list: [], pagination: {} };
  } catch (err) {
    dispatch({ type: MATRIMONIAL_MATCHES_FAIL });
    return { list: [], pagination: {} };
  }
};
