import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  khampCreated,
  resetKhamp,
  khampListUpdated,
  khampUpdated,
  khampDeleted,
  khampError,
  khampSearchParameterUpdate,
  loadingOnKhampSubmit,
  loadingKhampList,
  khampDetailsById,
  khampStatusToggled,
} from "@reducers/adminKhampReducer";

export const getKhampList = (khampParams) => async (dispatch) => {
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

    const query = khampParams.query ? khampParams.query : {};
    khampParams.query = query;
    config.params = khampParams;

    dispatch(loadingKhampList());

    const res = await api.get(`/api/admin/khamp`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(khampSearchParameterUpdate(khampParams));
      dispatch(khampListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching khamp list";
      dispatch(khampError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching khamp list";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getKhampById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/khamp/${id}`, config);
    if (res.data.status === true) {
      dispatch(khampDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          khampError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching khamp", "danger"));
    }
    return null;
  }
};

export const createKhamp = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnKhampSubmit());

    const res = await api.post(`/api/admin/khamp`, formData, config);
    if (res.data.status === true) {
      dispatch(khampCreated(res.data.response));
      dispatch(setAlert("Khamp created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/khamp`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(khampError({
          msg: res.data.message || "Error creating khamp",
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
        khampError({
          msg: err.response?.statusText || "Error creating khamp",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating khamp", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateKhamp = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...khampData } = formData;
    const requestData = { ...khampData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnKhampSubmit());
    
    const res = await api.put(`/api/admin/khamp/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(khampUpdated(res.data.response));
      dispatch(setAlert("Khamp updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/khamp`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(khampError({
          msg: res.data.message || "Error updating khamp",
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
        khampError({
          msg: err.response?.statusText || "Error updating khamp",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating khamp", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteKhamp = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/khamp/${id}`, config);

    dispatch(khampDeleted(id));
    dispatch(setAlert("Khamp deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting khamp", "danger"));
  }
};

export const hardDeleteKhamp = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/khamp/${id}/hard`, config);

    dispatch(khampDeleted(id));
    dispatch(setAlert("Khamp permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting khamp", "danger"));
  }
};

export const restoreKhamp = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/khamp/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(khampUpdated(res.data.response));
      dispatch(setAlert("Khamp restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring khamp", "danger"));
  }
};

export const toggleKhampStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/khamp/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(khampStatusToggled(res.data.response));
      dispatch(setAlert("Khamp status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating khamp status", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetKhamp());
};

export const removeKhampErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getKhampByKul = (kulId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/khamp?limit=1000&page=1&kulId=${kulId}`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const approveKhamp = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/khamp/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(khampUpdated(res.data.response));
      dispatch(setAlert("Khamp approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving khamp", "danger"));
  }
};

export const rejectKhamp = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/khamp/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(khampUpdated(res.data.response));
      dispatch(setAlert("Khamp rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        khampError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting khamp", "danger"));
  }
};
