import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";

export const FETCH_MATRIMONIAL_APPLICATIONS_START = "FETCH_MATRIMONIAL_APPLICATIONS_START";
export const FETCH_MATRIMONIAL_APPLICATIONS_SUCCESS = "FETCH_MATRIMONIAL_APPLICATIONS_SUCCESS";
export const FETCH_MATRIMONIAL_APPLICATIONS_FAIL = "FETCH_MATRIMONIAL_APPLICATIONS_FAIL";
export const FETCH_MATRIMONIAL_PROFILE_START = "FETCH_MATRIMONIAL_PROFILE_START";
export const FETCH_MATRIMONIAL_PROFILE_SUCCESS = "FETCH_MATRIMONIAL_PROFILE_SUCCESS";
export const FETCH_MATRIMONIAL_PROFILE_FAIL = "FETCH_MATRIMONIAL_PROFILE_FAIL";
export const UPDATE_MATRIMONIAL_START = "UPDATE_MATRIMONIAL_START";
export const UPDATE_MATRIMONIAL_SUCCESS = "UPDATE_MATRIMONIAL_SUCCESS";
export const UPDATE_MATRIMONIAL_FAIL = "UPDATE_MATRIMONIAL_FAIL";
export const DELETE_MATRIMONIAL_START = "DELETE_MATRIMONIAL_START";
export const DELETE_MATRIMONIAL_SUCCESS = "DELETE_MATRIMONIAL_SUCCESS";
export const DELETE_MATRIMONIAL_FAIL = "DELETE_MATRIMONIAL_FAIL";

/**
 * Fetch matrimonial profiles with filters (no approval status).
 */
export const fetchMatrimonialApplications = (params = {}) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: FETCH_MATRIMONIAL_APPLICATIONS_START });

  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        queryParams.append(key, params[key]);
      }
    });

    const res = await api.get(`/api/admin/matrimonial/applications?${queryParams.toString()}`);

    if (res.data.status === true) {
      dispatch({
        type: FETCH_MATRIMONIAL_APPLICATIONS_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({ type: FETCH_MATRIMONIAL_APPLICATIONS_FAIL });
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    dispatch({ type: FETCH_MATRIMONIAL_APPLICATIONS_FAIL });
    if (err.response?.data?.errors?.length > 0) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      dispatch(setAlert(err.response.data.message || "Failed to fetch profiles", "danger"));
    } else {
      dispatch(setAlert("Failed to fetch matrimonial profiles", "danger"));
    }
  }
};

/**
 * Fetch single matrimonial profile by ID.
 */
export const fetchMatrimonialProfileById = (id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch({ type: FETCH_MATRIMONIAL_PROFILE_START });
  try {
    const res = await api.get(`/api/admin/matrimonial/applications/${id}`);
    if (res.data.status === true) {
      dispatch({ type: FETCH_MATRIMONIAL_PROFILE_SUCCESS, payload: res.data.response });
      return res.data.response;
    }
    dispatch({ type: FETCH_MATRIMONIAL_PROFILE_FAIL });
    return null;
  } catch (err) {
    dispatch({ type: FETCH_MATRIMONIAL_PROFILE_FAIL });
    return null;
  }
};

/**
 * Update matrimonial profile (data correction). No approve/reject.
 */
export const updateMatrimonialProfile = (id, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: UPDATE_MATRIMONIAL_START });
  try {
    const res = await api.put(`/api/admin/matrimonial/applications/${id}`, payload);
    if (res.data.status === true) {
      dispatch({ type: UPDATE_MATRIMONIAL_SUCCESS, payload: res.data.response });
      dispatch(setAlert("Profile updated", "success"));
      return res.data;
    }
    dispatch({ type: UPDATE_MATRIMONIAL_FAIL });
    dispatch(setAlert(res.data?.message || "Update failed", "danger"));
    return res.data ? res.data : { status: false };
  } catch (err) {
    dispatch({ type: UPDATE_MATRIMONIAL_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Update failed", "danger"));
    return { status: false };
  }
};

/**
 * Hard delete matrimonial profile. Permanent.
 */
export const deleteMatrimonialProfile = (id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch({ type: DELETE_MATRIMONIAL_START });
  try {
    const res = await api.delete(`/api/admin/matrimonial/applications/${id}`);
    if (res.data.status === true) {
      dispatch({ type: DELETE_MATRIMONIAL_SUCCESS, payload: id });
      dispatch(setAlert("Matrimonial profile deleted permanently.", "success"));
      return res.data;
    }
    dispatch({ type: DELETE_MATRIMONIAL_FAIL });
    dispatch(setAlert(res.data?.message || "Delete failed", "danger"));
    return res.data ? res.data : { status: false };
  } catch (err) {
    dispatch({ type: DELETE_MATRIMONIAL_FAIL });
    dispatch(setAlert(err.response?.data?.message || "Delete failed", "danger"));
    return { status: false };
  }
};
