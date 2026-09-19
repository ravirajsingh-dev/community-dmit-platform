import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  commonSettingsUpdated,
  commonSettingsError,
  loadingCommonSettings,
  loadingOnCommonSettingsSubmit,
  resetCommonSettings,
  commonSettingsFetched,
} from "@reducers/adminCommonSettingsReducer";

/**
 * Get common settings
 * Auto-creates default settings if not found
 */
export const getCommonSettings = () => async (dispatch) => {
  try {
    dispatch(loadingCommonSettings());

    const res = await api.get(`/api/admin/settings`);

    if (res.data.status === true) {
      dispatch(commonSettingsFetched(res.data.response));
    } else {
      dispatch(
        commonSettingsError({
          msg: res.data.message || "Failed to fetch settings",
          status: res.status || 500,
        })
      );
      dispatch(setAlert(res.data.message || "Failed to fetch settings", "danger"));
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          commonSettingsError({
            msg: err.response.statusText || "Error fetching settings",
            status: err.response.status || 500,
          })
        );

      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch settings",
          "danger"
        )
      );
    }
  }
};

/**
 * Update common settings
 */
export const updateCommonSettings = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnCommonSettingsSubmit());
  dispatch(removeAlert());
  try {
    // If FormData, let axios set Content-Type automatically
    const config = formData instanceof FormData 
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : { headers: { "Content-Type": "application/json" } };
    
    const res = await api.put(`/api/admin/settings`, formData, config);

    if (res.data.status === true) {
      dispatch(commonSettingsUpdated(res.data.response));
      dispatch(setAlert("Settings updated successfully.", "success"));
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update settings.", "danger"));
      }
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errors = err.response?.data?.errors;
      if (errors) {
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
      err.response &&
        dispatch(
          commonSettingsError({
            msg: err.response.statusText || "Error updating settings",
            status: err.response.status || 500,
          })
        );

      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to update settings",
          "danger"
        )
      );
    }
  }
};

/**
 * Reset store
 */
export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetCommonSettings());
};

