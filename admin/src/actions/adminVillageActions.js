import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  villageCreated,
  resetVillage,
  villageListUpdated,
  villageUpdated,
  villageDeleted,
  villageError,
  villageSearchParameterUpdate,
  loadingOnVillageSubmit,
  loadingVillagesList,
  villageDetailsById,
  villageStatusToggled,
} from "@reducers/adminVillageReducer";

export const getVillages = (villageParams) => async (dispatch) => {
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

    const query = villageParams.query ? villageParams.query : {};
    villageParams.query = query;
    config.params = villageParams;

    dispatch(loadingVillagesList());

    const res = await api.get(`/api/admin/villages`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(villageSearchParameterUpdate(villageParams));
      dispatch(villageListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching villages";
      dispatch(villageError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching villages";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getVillageById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/villages/${id}`, config);
    if (res.data.status === true) {
      dispatch(villageDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          villageError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching village", "danger"));
    }
    return null;
  }
};

export const createVillage = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnVillageSubmit());

    const res = await api.post(`/api/admin/villages`, formData, config);
    if (res.data.status === true) {
      dispatch(villageCreated(res.data.response));
      dispatch(setAlert("Village created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/villages`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(villageError({
          msg: res.data.message || "Error creating village",
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
        villageError({
          msg: err.response?.statusText || "Error creating village",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating village", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateVillage = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...villageData } = formData;
    const requestData = { ...villageData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnVillageSubmit());
    
    const res = await api.put(`/api/admin/villages/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(villageUpdated(res.data.response));
      dispatch(setAlert("Village updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/villages`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(villageError({
          msg: res.data.message || "Error updating village",
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
        villageError({
          msg: err.response?.statusText || "Error updating village",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating village", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteVillage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/villages/${id}`, config);

    dispatch(villageDeleted(id));
    dispatch(setAlert("Village deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting village", "danger"));
  }
};

export const hardDeleteVillage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/villages/${id}/hard`, config);

    dispatch(villageDeleted(id));
    dispatch(setAlert("Village permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting village", "danger"));
  }
};

export const restoreVillage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/villages/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(villageUpdated(res.data.response));
      dispatch(setAlert("Village restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring village", "danger"));
  }
};

export const toggleVillageStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/villages/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(villageStatusToggled(res.data.response));
      dispatch(setAlert("Village status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating village status", "danger"));
  }
};

export const approveVillage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/villages/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(villageUpdated(res.data.response));
      dispatch(setAlert("Village approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving village", "danger"));
  }
};

export const rejectVillage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/villages/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(villageUpdated(res.data.response));
      dispatch(setAlert("Village rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        villageError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting village", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetVillage());
};

export const removeVillageErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getAllVillages = () => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/villages?limit=1000&page=1`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};
