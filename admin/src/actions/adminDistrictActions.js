import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  districtCreated,
  resetDistrict,
  districtListUpdated,
  districtUpdated,
  districtDeleted,
  districtError,
  districtSearchParameterUpdate,
  loadingOnDistrictSubmit,
  loadingDistrictsList,
  districtDetailsById,
  districtStatusToggled,
} from "@reducers/adminDistrictReducer";

export const getDistricts = (districtParams) => async (dispatch) => {
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

    const query = districtParams.query ? districtParams.query : {};
    districtParams.query = query;
    config.params = districtParams;

    dispatch(loadingDistrictsList());

    const res = await api.get(`/api/admin/districts`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(districtSearchParameterUpdate(districtParams));
      dispatch(districtListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching districts";
      dispatch(districtError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching districts";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getDistrictById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/districts/${id}`, config);
    if (res.data.status === true) {
      dispatch(districtDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          districtError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching district", "danger"));
    }
    return null;
  }
};

export const createDistrict = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnDistrictSubmit());

    const res = await api.post(`/api/admin/districts`, formData, config);
    if (res.data.status === true) {
      dispatch(districtCreated(res.data.response));
      dispatch(setAlert("District created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/districts`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(districtError({
          msg: res.data.message || "Error creating district",
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
        districtError({
          msg: err.response?.statusText || "Error creating district",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating district", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateDistrict = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...districtData } = formData;
    const requestData = { ...districtData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnDistrictSubmit());
    
    const res = await api.put(`/api/admin/districts/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(districtUpdated(res.data.response));
      dispatch(setAlert("District updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/districts`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(districtError({
          msg: res.data.message || "Error updating district",
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
        districtError({
          msg: err.response?.statusText || "Error updating district",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating district", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteDistrict = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/districts/${id}`, config);

    dispatch(districtDeleted(id));
    dispatch(setAlert("District deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting district", "danger"));
  }
};

export const hardDeleteDistrict = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/districts/${id}/hard`, config);

    dispatch(districtDeleted(id));
    dispatch(setAlert("District permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting district", "danger"));
  }
};

export const restoreDistrict = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/districts/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(districtUpdated(res.data.response));
      dispatch(setAlert("District restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring district", "danger"));
  }
};

export const toggleDistrictStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/districts/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(districtStatusToggled(res.data.response));
      dispatch(setAlert("District status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating district status", "danger"));
  }
};

export const approveDistrict = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/districts/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(districtUpdated(res.data.response));
      dispatch(setAlert("District approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving district", "danger"));
  }
};

export const rejectDistrict = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/districts/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(districtUpdated(res.data.response));
      dispatch(setAlert("District rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        districtError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting district", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetDistrict());
};

export const removeDistrictErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getAllDistricts = () => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/districts?limit=1000&page=1`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};
