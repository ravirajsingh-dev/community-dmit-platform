import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  countryCreated,
  resetCountry,
  countryListUpdated,
  countryUpdated,
  countryDeleted,
  countryError,
  countrySearchParameterUpdate,
  loadingOnCountrySubmit,
  loadingCountriesList,
  countryDetailsById,
  countryStatusToggled,
} from "@reducers/adminCountryReducer";

export const getCountries = (countryParams) => async (dispatch) => {
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

    const query = countryParams.query ? countryParams.query : {};
    countryParams.query = query;
    config.params = countryParams;

    dispatch(loadingCountriesList());

    const res = await api.get(`/api/admin/countries`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(countrySearchParameterUpdate(countryParams));
      dispatch(countryListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching countries";
      dispatch(countryError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching countries";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getCountryById = (id) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/countries/${id}`, config);
    if (res.data.status === true) {
      dispatch(countryDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          countryError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching country", "danger"));
    }
    return null;
  }
};

export const createCountry = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnCountrySubmit());

    const res = await api.post(`/api/admin/countries`, formData, config);
    if (res.data.status === true) {
      dispatch(countryCreated(res.data.response));
      dispatch(setAlert("Country created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/countries`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(countryError({
          msg: res.data.message || "Error creating country",
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
        countryError({
          msg: err.response?.statusText || "Error creating country",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error creating country", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const updateCountry = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...countryData } = formData;
    const requestData = { ...countryData };
    
    if (txn_password) {
      requestData.txn_password = txn_password;
    }

    dispatch(loadingOnCountrySubmit());
    
    const res = await api.put(`/api/admin/countries/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(countryUpdated(res.data.response));
      dispatch(setAlert("Country updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/countries`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(countryError({
          msg: res.data.message || "Error updating country",
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
        countryError({
          msg: err.response?.statusText || "Error updating country",
          status: err.response?.status || 500,
        })
      );

      dispatch(setAlert(err.response?.data?.message || "Error updating country", "danger"));
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};

export const deleteCountry = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/countries/${id}`, config);

    dispatch(countryDeleted(id));
    dispatch(setAlert("Country deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error deleting country", "danger"));
  }
};

export const hardDeleteCountry = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/countries/${id}/hard`, config);

    dispatch(countryDeleted(id));
    dispatch(setAlert("Country permanently deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error permanently deleting country", "danger"));
  }
};

export const restoreCountry = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/countries/${id}/restore`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(countryUpdated(res.data.response));
      dispatch(setAlert("Country restored successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error restoring country", "danger"));
  }
};

export const toggleCountryStatus = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/countries/${id}/toggle-status`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(countryStatusToggled(res.data.response));
      dispatch(setAlert("Country status updated successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error updating country status", "danger"));
  }
};

export const approveCountry = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/countries/${id}/approve`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(countryUpdated(res.data.response));
      dispatch(setAlert("Country approved successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error approving country", "danger"));
  }
};

export const rejectCountry = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.put(`/api/admin/countries/${id}/reject`, { txn_password: txn_password }, config);

    if (res.data.status === true) {
      dispatch(countryUpdated(res.data.response));
      dispatch(setAlert("Country rejected successfully", "success"));
    }
  } catch (err) {
    err.response &&
      dispatch(
        countryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.data?.message || "Error rejecting country", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetCountry());
};

export const removeCountryErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const getAllCountries = () => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/countries?limit=1000&page=1`);
    if (res.data.status && res.data.response && res.data.response[0]) {
      return res.data.response[0].data || [];
    }
    return [];
  } catch (err) {
    return [];
  }
};
