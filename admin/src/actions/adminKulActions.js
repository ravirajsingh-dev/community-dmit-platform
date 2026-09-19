import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  kulCreated,
  resetKul,
  kulListUpdated,
  kulUpdated,
  kulDeleted,
  kulError,
  kulSearchParameterUpdate,
  loadingOnKulSubmit,
  loadingKulList,
  kulDetailsById,
  kulStatusToggled,
} from "@reducers/adminKulReducer";

export const getKulList = (kulParams) => async (dispatch) => {
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

    const query = kulParams.query ? kulParams.query : {};
    kulParams.query = query;
    config.params = kulParams;

    dispatch(loadingKulList());

    const res = await api.get(`/api/admin/kul`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(kulSearchParameterUpdate(kulParams));
      dispatch(kulListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching kul list";
      dispatch(kulError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching kul list";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getKulById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/kul/${id}`, config);
    if (res.data.status === true) {
      dispatch(kulDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          kulError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching kul", "danger"));
    }
    return null;
  }
};

export const createKul = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnKulSubmit());

    const res = await api.post(`/api/admin/kul`, formData, config);
    if (res.data.status === true) {
      dispatch(kulCreated(res.data.response));
      dispatch(setAlert("Kul created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/kul`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(kulError({
          msg: res.data.message || "Error creating kul",
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
        kulError({
          msg: err.response?.statusText || "Error creating kul",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating kul", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateKul = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...kulData } = formData;
    const requestData = { ...kulData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnKulSubmit());
    
    const res = await api.put(`/api/admin/kul/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(kulUpdated(res.data.response));
      dispatch(setAlert("Kul updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/kul`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(kulError({
          msg: res.data.message || "Error updating kul",
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
        kulError({
          msg: err.response?.statusText || "Error updating kul",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating kul", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteKul = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/kul/${id}`, config);

    dispatch(kulDeleted(id));
    dispatch(setAlert("Kul deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting kul", "danger"));
  }
};

export const hardDeleteKul = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/kul/${id}/hard`, config);

    dispatch(kulDeleted(id));
    dispatch(setAlert("Kul permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting kul", "danger"));
  }
};

export const restoreKul = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/kul/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(kulUpdated(res.data.response));
      dispatch(setAlert("Kul restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring kul", "danger"));
  }
};

export const toggleKulStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/kul/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(kulStatusToggled(res.data.response));
      dispatch(setAlert("Kul status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating kul status", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetKul());
};

export const removeKulErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getKulByVansh = (vanshId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/kul?limit=1000&page=1&vanshId=${vanshId}`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const approveKul = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/kul/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(kulUpdated(res.data.response));
      dispatch(setAlert("Kul approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving kul", "danger"));
  }
};

export const rejectKul = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/kul/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(kulUpdated(res.data.response));
      dispatch(setAlert("Kul rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        kulError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting kul", "danger"));
  }
};
