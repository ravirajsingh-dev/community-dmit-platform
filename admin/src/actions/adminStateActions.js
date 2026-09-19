import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  stateCreated,
  resetState,
  stateListUpdated,
  stateUpdated,
  stateDeleted,
  stateError,
  stateSearchParameterUpdate,
  loadingOnStateSubmit,
  loadingStatesList,
  stateDetailsById,
  stateStatusToggled,
} from "@reducers/adminStateReducer";

export const getStates = (stateParams) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              searchParams.append(key, params[key]);
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = stateParams.query ? stateParams.query : {};
    stateParams.query = query;
    config.params = stateParams;

    dispatch(loadingStatesList());

    const res = await api.get(`/api/admin/states`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(stateSearchParameterUpdate(stateParams));
      dispatch(stateListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching states";
      dispatch(stateError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching states";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getStateById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/states/${id}`, config);
    if (res.data.status === true) {
      dispatch(stateDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          stateError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching state", "danger"));
    }
    return null;
  }
};

export const createState = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnStateSubmit());

    const res = await api.post(`/api/admin/states`, formData, config);
    if (res.data.status === true) {
      dispatch(stateCreated(res.data.response));
      dispatch(setAlert("State created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/states`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(stateError({
          msg: res.data.message || "Error creating state",
          status: 400,
        }));
        dispatch(setAlert(res.data.message, "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        stateError({
          msg: err.response?.statusText || "Error creating state",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating state", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateState = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...stateData } = formData;
    const requestData = { ...stateData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnStateSubmit());
    
    const res = await api.put(`/api/admin/states/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(stateUpdated(res.data.response));
      dispatch(setAlert("State updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/states`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(stateError({
          msg: res.data.message || "Error updating state",
          status: 400,
        }));
        dispatch(setAlert(res.data.message, "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        stateError({
          msg: err.response?.statusText || "Error updating state",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating state", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteState = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/states/${id}`, config);

    dispatch(stateDeleted(id));
    dispatch(setAlert("State deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting state", "danger"));
  }
};

export const hardDeleteState = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/states/${id}/hard`, config);

    dispatch(stateDeleted(id));
    dispatch(setAlert("State permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting state", "danger"));
  }
};

export const restoreState = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/states/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(stateUpdated(res.data.response));
      dispatch(setAlert("State restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring state", "danger"));
  }
};

export const toggleStateStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/states/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(stateStatusToggled(res.data.response));
      dispatch(setAlert("State status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating state status", "danger"));
  }
};

export const approveState = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/states/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(stateUpdated(res.data.response));
      dispatch(setAlert("State approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving state", "danger"));
  }
};

export const rejectState = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/states/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(stateUpdated(res.data.response));
      dispatch(setAlert("State rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        stateError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting state", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetState());
};

export const removeStateErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getAllStates = () => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/states?limit=1000&page=1`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};
