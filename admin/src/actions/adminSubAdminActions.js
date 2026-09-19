import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { normalizeErrors } from "@src/utils/helper";
import {
  subAdminCreated,
  resetSubAdmin,
  loadSubAdminPage,
  subAdminUpdated,
  subAdminError,
  subAdminDeleted,
  subAdminDetailsById,
  subAdminListUpdated,
  subAdminSearchParameterUpdate,
  loadingOnSubAdminSubmit,
  loadingSubAdminsList,
  subAdminStatusToggled,
} from "@reducers/adminSubAdminsReducer";

export const getSubAdminsList = (subAdminParams) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              if (key === "query" && typeof params[key] === "object") {
                searchParams.append(key, JSON.stringify(params[key]));
              } else if (key === "filters" && Array.isArray(params[key])) {
                searchParams.append(key, params[key].join(","));
              } else {
                searchParams.append(key, params[key]);
              }
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = subAdminParams.query ? subAdminParams.query : {};
    subAdminParams.query = query;
    config.params = subAdminParams;

    dispatch(loadingSubAdminsList());

    const res = await api.get(`/api/admin/sub-admins/list`, config);

    if (res.data && res.data.status && res.data.response) {
      dispatch(subAdminListUpdated(res.data.response));
      dispatch(removeErrors());
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Failed to fetch sub-admins";
      dispatch(subAdminError(errorMsg));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response?.data?.message || "Failed to fetch sub-admins";
      dispatch(subAdminError(errorMsg));
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getSubAdminById = (id) => async (dispatch) => {
  try {
    dispatch(loadingOnSubAdminSubmit());
    const res = await api.get(`/api/admin/sub-admins/${id}`);

    if (res.data && res.data.status && res.data.response) {
      dispatch(subAdminDetailsById(res.data.response));
      dispatch(removeErrors());
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Failed to fetch sub-admin";
      dispatch(subAdminError(errorMsg));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response?.data?.message || "Failed to fetch sub-admin";
      dispatch(subAdminError(errorMsg));
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const createSubAdmin = (formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingOnSubAdminSubmit());

  try {
    const res = await api.post(`/api/admin/sub-admins`, formData);

    if (res.data.status) {
      dispatch(subAdminCreated());
      dispatch(setAlert("Sub-admin created successfully", "success"));
      navigate("/admin/sub-admins");
      return { status: true };
    } else {
      let errors = res.data.errors;
      const normalizedErrors = normalizeErrors(errors);
      if (normalizedErrors && normalizedErrors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        normalizedErrors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message || "Unknown error", error.path || error.param));
        });
      }
      dispatch(subAdminError(res.data.message || "Failed to create sub-admin"));
      return { status: false };
    }
  } catch (err) {
    // Ensure loading state is reset on error
    const normalizedErrors = normalizeErrors(err.response?.data?.errors);
    if (normalizedErrors && normalizedErrors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "Failed to create sub-admin", "danger"));
      normalizedErrors.forEach((error) => {
        dispatch(setErrorsList(error.msg || error.message || "Unknown error", error.path || error.param));
      });
    } else {
      dispatch(setAlert(err.response?.data?.message || "Failed to create sub-admin", "danger"));
    }
    // This will reset loadingSubAdmin to false
    dispatch(subAdminError(err.response?.data?.message || "Failed to create sub-admin"));
    return { status: false };
  }
};

export const updateSubAdmin = (id, formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingOnSubAdminSubmit());

  try {
    const res = await api.put(`/api/admin/sub-admins/${id}`, formData);

    if (res.data.status) {
      dispatch(subAdminUpdated());
      dispatch(setAlert("Sub-admin updated successfully", "success"));
      navigate("/admin/sub-admins");
    } else {
      const normalizedErrors = normalizeErrors(res.data.errors);
      if (normalizedErrors && normalizedErrors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        normalizedErrors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path || error.param));
        });
      }
      dispatch(subAdminError(res.data.message || "Failed to update sub-admin"));
    }
  } catch (err) {
    const normalizedErrors = normalizeErrors(err.response?.data?.errors);
    if (normalizedErrors && normalizedErrors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "Failed to update sub-admin", "danger"));
      normalizedErrors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path || error.param));
      });
    } else {
      dispatch(setAlert(err.response?.data?.message || "Failed to update sub-admin", "danger"));
    }
    dispatch(subAdminError(err.response?.data?.message || "Failed to update sub-admin"));
  }
};

export const deleteSubAdmin = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    const res = await api.delete(`/api/admin/sub-admins/${id}`, config);

    if (res.data.status) {
      dispatch(subAdminDeleted(id));
      dispatch(setAlert("Sub-admin deleted successfully", "success"));
    } else {
      dispatch(setAlert(res.data.message || "Failed to delete sub-admin", "danger"));
      dispatch(subAdminError(res.data.message || "Failed to delete sub-admin"));
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Failed to delete sub-admin";
    dispatch(setAlert(errorMsg, "danger"));
    dispatch(subAdminError(errorMsg));
  }
};

export const toggleSubAdminStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/sub-admins/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status && res.data.response) {
      const { isActive, status } = res.data.response;
      dispatch(subAdminStatusToggled({ id, isActive, status }));
      dispatch(
        setAlert(
          `Sub-admin ${isActive ? "activated" : "deactivated"} successfully`,
          "success"
        )
      );
    } else {
      dispatch(setAlert(res.data.message || "Failed to toggle status", "danger"));
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Failed to toggle status";
    dispatch(setAlert(errorMsg, "danger"));
  }
};

export const resetComponentStore = () => (dispatch) => {
  dispatch(resetSubAdmin());
};
