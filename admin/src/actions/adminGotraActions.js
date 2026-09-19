import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  gotraCreated,
  resetGotra,
  gotraListUpdated,
  gotraUpdated,
  gotraDeleted,
  gotraError,
  gotraSearchParameterUpdate,
  loadingOnGotraSubmit,
  loadingGotraList,
  gotraDetailsById,
  gotraStatusToggled,
} from "@reducers/adminGotraReducer";

export const getGotraList = (gotraParams) => async (dispatch) => {
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

    const query = gotraParams.query ? gotraParams.query : {};
    gotraParams.query = query;
    config.params = gotraParams;

    dispatch(loadingGotraList());

    const res = await api.get(`/api/admin/gotra`, config);

    if (
      res.data &&
      res.data.status &&
      res.data.response &&
      res.data.response[0]
    ) {
      dispatch(gotraSearchParameterUpdate(gotraParams));
      dispatch(gotraListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching gotra list";
      dispatch(gotraError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
      const errorMsg =
        err.response?.data?.message ||
        err.response?.message ||
        "Error fetching gotra list";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getGotraById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/gotra/${id}`, config);
    if (res.data.status === true) {
      dispatch(gotraDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          gotraError({
            msg: err.response.statusText,
            status: err.response.status,
          }),
        );
      dispatch(
        setAlert(err.response?.message || "Error fetching gotra", "danger"),
      );
    }
    return null;
  }
};

export const createGotra = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnGotraSubmit());

    const res = await api.post(`/api/admin/gotra`, formData, config);
    if (res.data.status === true) {
      dispatch(gotraCreated(res.data.response));
      dispatch(setAlert("Gotra created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/gotra`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(
          gotraError({
            msg: res.data.message || "Error creating gotra",
            status: 400,
          }),
        );
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
        gotraError({
          msg: err.response?.statusText || "Error creating gotra",
          status: err.response?.status || 500,
        }),
      );

      dispatch(
        setAlert(
          err.response?.data?.message || "Error creating gotra",
          "danger",
        ),
      );
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateGotra = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...gotraData } = formData;
    const requestData = { ...gotraData };

    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnGotraSubmit());

    const res = await api.put(`/api/admin/gotra/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(gotraUpdated(res.data.response));
      dispatch(setAlert("Gotra updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/gotra`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(
          gotraError({
            msg: res.data.message || "Error updating gotra",
            status: 400,
          }),
        );
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
        gotraError({
          msg: err.response?.statusText || "Error updating gotra",
          status: err.response?.status || 500,
        }),
      );

      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating gotra",
          "danger",
        ),
      );
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteGotra = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/gotra/${id}`, config);

    dispatch(gotraDeleted(id));
    dispatch(setAlert("Gotra deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(err.response?.data?.message || "Error deleting gotra", "danger"),
    );
  }
};

export const hardDeleteGotra = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/gotra/${id}/hard`, config);

    dispatch(gotraDeleted(id));
    dispatch(setAlert("Gotra permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(
        err.response?.data?.message || "Error permanently deleting gotra",
        "danger",
      ),
    );
  }
};

export const restoreGotra = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(
      `/api/admin/gotra/${id}/restore`,
      { txn_password: txn_password },
      config,
    );

    if (res.data.status === true) {
      dispatch(gotraUpdated(res.data.response));
      dispatch(setAlert("Gotra restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(
        err.response?.data?.message || "Error restoring gotra",
        "danger",
      ),
    );
  }
};

export const toggleGotraStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(
      `/api/admin/gotra/${id}/toggle-status`,
      { txn_password: txn_password },
      config,
    );

    if (res.data.status === true) {
      dispatch(gotraStatusToggled(res.data.response));
      dispatch(setAlert("Gotra status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(
        err.response?.data?.message || "Error updating gotra status",
        "danger",
      ),
    );
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetGotra());
};

export const removeGotraErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getGotraByKhamp = (khampId) => async (dispatch) => {
  try {
    const res = await api.get(
      `/api/admin/gotra?limit=1000&page=1&khampId=${khampId}`,
    );
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const approveGotra = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(
      `/api/admin/gotra/${id}/approve`,
      { txn_password: txn_password },
      config,
    );

    if (res.data.status === true) {
      dispatch(gotraUpdated(res.data.response));
      dispatch(setAlert("Gotra approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(
        err.response?.data?.message || "Error approving gotra",
        "danger",
      ),
    );
  }
};

export const rejectGotra = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(
      `/api/admin/gotra/${id}/reject`,
      { txn_password: txn_password },
      config,
    );

    if (res.data.status === true) {
      dispatch(gotraUpdated(res.data.response));
      dispatch(setAlert("Gotra rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        gotraError({
          msg: err.response.statusText,
          status: err.response.status,
        }),
      );
    dispatch(
      setAlert(
        err.response?.data?.message || "Error rejecting gotra",
        "danger",
      ),
    );
  }
};
