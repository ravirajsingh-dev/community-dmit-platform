import api from "@src/utils/axiosSetup";

import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";

import {
  userCreated,
  resetUser,
  loadUserPage,
  userUpdated,
  userDeleted,
  userError,
  userDetailsById,
  userListUpdated,
  userSearchParameterUpdate,
  loadingOnUserSubmit,
  loadingUsersList,
} from "@reducers/adminUsersReducer";

export const getUsersList = (userParams) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              if (key === "query" && typeof params[key] === "object") {
                // Stringify nested query object
                searchParams.append(key, JSON.stringify(params[key]));
              } else if (key === "filters" && Array.isArray(params[key])) {
                // Join array filters with comma
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

    const query = userParams.query ? userParams.query : {};
    userParams.query = query;
    config.params = userParams;

    dispatch(loadingUsersList());

    const res = await api.get(`/api/admin/users/list`, config);
    
    if (res.data && res.data.status && res.data.response && Array.isArray(res.data.response) && res.data.response.length > 0) {
      dispatch(userSearchParameterUpdate(userParams));
      dispatch(userListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching users";
      dispatch(userError({ msg: errorMsg }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        userError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMessage =
        err.response?.data?.message || err.response?.message || "Error fetching users";
      dispatch(setAlert(errorMessage, "danger"));
    }
  }
};

// get User by id
export const getUserById = (user_id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnUserSubmit());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/users/${user_id}`, config);

    dispatch(userDetailsById(res.data.response));
    return res.data ? res.data.response : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          userError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      const errorMessage =
        err.response?.data?.message || err.response?.message || "Error fetching user";
      dispatch(setAlert(errorMessage, "danger"));
      
      // Handle validation errors
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
    }
  }
};

export const createUser = (formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnUserSubmit());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(`/api/admin/users`, formData, config);
    if (res.data.status === true) {
      dispatch(userCreated(res.data.response));
      dispatch(setAlert("User created successfully", "success"));
      if (navigate) {
        navigate(`/admin/users-list`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(userError());
        dispatch(setAlert(res.data.message || "Validation error", "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          userError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      const errorMessage =
        err.response?.data?.message || err.response?.message || "Error creating user";
      dispatch(setAlert(errorMessage, "danger"));

      // Handle validation errors
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
    }
    return { status: false };
  }
};

// Alias for backward compatibility
export const create = createUser;

// Edit User
export const editUser = (formData, navigate, user_id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnUserSubmit());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    // Extract txn_password from formData if present
    const { txn_password, ...userData } = formData;
    const requestData = { ...userData };
    if (txn_password) {
      requestData.txn_password = txn_password;
    }
    const res = await api.put(`/api/admin/users/${user_id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(userUpdated(res.data.response));
      dispatch(setAlert("User updated successfully", "success"));
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(userError());
        dispatch(setAlert(res.data.message || "Validation error", "danger"));

        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          userError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      const errorMessage =
        err.response?.data?.message || err.response?.message || "Error updating user";
      dispatch(setAlert(errorMessage, "danger"));

      // Handle validation errors
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const userStatusAction =
  (user_id, action, txn_password) => async (dispatch) => {
    dispatch(removeErrors());
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      const res = await api.post(
        `/api/admin/users/${user_id}/status-action`,
        { action, txn_password },
        config,
      );

      if (res.data.status === true) {
        dispatch(
          setAlert(res.data.message || "User status updated successfully", "success"),
        );
        return res.data;
      }

      const errors = res.data.errors;
      if (errors) {
        dispatch(userError());
        dispatch(setAlert(res.data.message || "Validation error", "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        err.response &&
          dispatch(
            userError({
              msg: err.response.statusText,
              status: err.response.status,
            }),
          );

        const errorMessage =
          err.response?.data?.message ||
          err.response?.message ||
          "Error updating user status";
        dispatch(setAlert(errorMessage, "danger"));

        if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
          err.response.data.errors.forEach((error) => {
            dispatch(setErrorsList(error.msg || error.message, error.path));
          });
        }
      }
      return { status: false };
    }
  };

// Delete User
export const deleteUser = (user_id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    const res = await api.delete(`/api/admin/users/${user_id}`, config);

    if (res.data.status === true) {
      dispatch(userDeleted(user_id));
      dispatch(setAlert("User deleted successfully", "success"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          userError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      const errorMessage =
        err.response?.data?.message || err.response?.message || "Error deleting user";
      dispatch(setAlert(errorMessage, "danger"));
    }
  }
};

export const cancelSave = (navigate) => async (dispatch) => {
  dispatch(removeErrors());
  if (navigate) {
    navigate("/admin/users-list");
  }
};

// reset errors
export const removeUserErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

// Dispatch Reset store
export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetUser());
};

export const setErrors = (errors) => async (dispatch) => {
  if (errors) {
    dispatch(userError());
    dispatch(setAlert("Please correct the following errors", "danger"));
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

