import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  vanshCreated,
  resetVansh,
  vanshListUpdated,
  vanshUpdated,
  vanshDeleted,
  vanshError,
  vanshSearchParameterUpdate,
  loadingOnVanshSubmit,
  loadingVanshList,
  vanshDetailsById,
  vanshStatusToggled,
} from "@reducers/adminVanshReducer";

export const getVanshList = (vanshParams) => async (dispatch) => {
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

    const query = vanshParams.query ? vanshParams.query : {};
    vanshParams.query = query;
    config.params = vanshParams;

    dispatch(loadingVanshList());

    const res = await api.get(`/api/admin/vansh`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(vanshSearchParameterUpdate(vanshParams));
      dispatch(vanshListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching vansh list";
      dispatch(vanshError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching vansh list";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getVanshById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/vansh/${id}`, config);
    if (res.data.status === true) {
      dispatch(vanshDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          vanshError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching vansh", "danger"));
    }
    return null;
  }
};

export const createVansh = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnVanshSubmit());

    const res = await api.post(`/api/admin/vansh`, formData, config);
    if (res.data.status === true) {
      dispatch(vanshCreated(res.data.response));
      dispatch(setAlert("Vansh created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/vansh`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(vanshError({
          msg: res.data.message || "Error creating vansh",
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
        vanshError({
          msg: err.response?.statusText || "Error creating vansh",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating vansh", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateVansh = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...vanshData } = formData;
    const requestData = { ...vanshData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnVanshSubmit());
    
    const res = await api.put(`/api/admin/vansh/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(vanshUpdated(res.data.response));
      dispatch(setAlert("Vansh updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/vansh`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(vanshError({
          msg: res.data.message || "Error updating vansh",
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
        vanshError({
          msg: err.response?.statusText || "Error updating vansh",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating vansh", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteVansh = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/vansh/${id}`, config);

    dispatch(vanshDeleted(id));
    dispatch(setAlert("Vansh deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting vansh", "danger"));
  }
};

export const hardDeleteVansh = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/vansh/${id}/hard`, config);

    dispatch(vanshDeleted(id));
    dispatch(setAlert("Vansh permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting vansh", "danger"));
  }
};

export const restoreVansh = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/vansh/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(vanshUpdated(res.data.response));
      dispatch(setAlert("Vansh restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring vansh", "danger"));
  }
};

export const toggleVanshStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/vansh/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(vanshStatusToggled(res.data.response));
      dispatch(setAlert("Vansh status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating vansh status", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetVansh());
};

export const removeVanshErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getVanshByCommunity = (communityId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/vansh?limit=1000&page=1&communityId=${communityId}`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const approveVansh = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/vansh/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(vanshUpdated(res.data.response));
      dispatch(setAlert("Vansh approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving vansh", "danger"));
  }
};

export const rejectVansh = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/vansh/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(vanshUpdated(res.data.response));
      dispatch(setAlert("Vansh rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        vanshError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting vansh", "danger"));
  }
};
