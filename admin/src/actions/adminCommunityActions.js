import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  communityCreated,
  resetCommunity,
  communityListUpdated,
  communityUpdated,
  communityDeleted,
  communityError,
  communitySearchParameterUpdate,
  loadingOnCommunitySubmit,
  loadingCommunitiesList,
  communityDetailsById,
  communityStatusToggled,
} from "@reducers/adminCommunityReducer";

export const getCommunities = (communityParams) => async (dispatch) => {
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

    const query = communityParams.query ? communityParams.query : {};
    communityParams.query = query;
    config.params = communityParams;

    dispatch(loadingCommunitiesList());

    const res = await api.get(`/api/admin/communities`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(communitySearchParameterUpdate(communityParams));
      dispatch(communityListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching communities";
      dispatch(communityError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching communities";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getCommunityById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/communities/${id}`, config);
    if (res.data.status === true) {
      dispatch(communityDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          communityError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching community", "danger"));
    }
    return null;
  }
};

export const createCommunity = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnCommunitySubmit());

    const res = await api.post(`/api/admin/communities`, formData, config);
    if (res.data.status === true) {
      dispatch(communityCreated(res.data.response));
      dispatch(setAlert("Community created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/communities`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(communityError({
          msg: res.data.message || "Error creating community",
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
        communityError({
          msg: err.response?.statusText || "Error creating community",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating community", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateCommunity = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...communityData } = formData;
    const requestData = { ...communityData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnCommunitySubmit());
    
    const res = await api.put(`/api/admin/communities/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(communityUpdated(res.data.response));
      dispatch(setAlert("Community updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/communities`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(communityError({
          msg: res.data.message || "Error updating community",
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
        communityError({
          msg: err.response?.statusText || "Error updating community",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating community", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteCommunity = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/communities/${id}`, config);

    dispatch(communityDeleted(id));
    dispatch(setAlert("Community deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting community", "danger"));
  }
};

export const hardDeleteCommunity = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/communities/${id}/hard`, config);

    dispatch(communityDeleted(id));
    dispatch(setAlert("Community permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting community", "danger"));
  }
};

export const restoreCommunity = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/communities/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(communityUpdated(res.data.response));
      dispatch(setAlert("Community restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring community", "danger"));
  }
};

export const toggleCommunityStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/communities/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(communityStatusToggled(res.data.response));
      dispatch(setAlert("Community status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating community status", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetCommunity());
};

export const removeCommunityErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getAllCommunities = () => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/communities?limit=1000&page=1`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const approveCommunity = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/communities/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(communityUpdated(res.data.response));
      dispatch(setAlert("Community approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving community", "danger"));
  }
};

export const rejectCommunity = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/communities/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(communityUpdated(res.data.response));
      dispatch(setAlert("Community rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        communityError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting community", "danger"));
  }
};
