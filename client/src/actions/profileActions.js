import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import {
  PROFILE_REQUEST,
  PROFILE_SUCCESS,
  PROFILE_FAIL,
  PROFILE_UPDATE_SUCCESS,
} from "@src/reducers/profileReducer";

/**
 * Get user profile (User + UserDetails)
 */
export const getUserProfile = () => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(PROFILE_REQUEST());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.get(`/api/users/profile`, config);

    if (res.data.status === true) {
      dispatch(PROFILE_SUCCESS(res.data.response));
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(PROFILE_FAIL(res.data.message || "Failed to load profile"));
      dispatch(setAlert(res.data.message || "Failed to load profile", "danger"));
      return null;
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    const errorMessage = err.response?.data?.message || "Failed to load profile";
    dispatch(PROFILE_FAIL(errorMessage));
    dispatch(setAlert(errorMessage, "danger"));
    return null;
  }
};

/**
 * Update user profile (User + UserDetails)
 */
export const updateUserProfile = (formData) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(PROFILE_REQUEST());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.put(`/api/users/profile`, formData, config);

    if (res.data.status === true) {
      dispatch(PROFILE_UPDATE_SUCCESS(res.data.response));
      dispatch(setAlert("Profile updated successfully", "success"));
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message || "Validation failed", "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(PROFILE_FAIL(res.data.message || "Failed to update profile"));
      return null;
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    const errorMessage = err.response?.data?.message || "Failed to update profile";
    dispatch(PROFILE_FAIL(errorMessage));
    dispatch(setAlert(errorMessage, "danger"));
    return null;
  }
};
