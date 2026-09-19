import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  sliderCreated,
  resetSlider,
  sliderListUpdated,
  sliderUpdated,
  sliderDeleted,
  sliderError,
  sliderSearchParameterUpdate,
  loadingOnSliderSubmit,
  loadingSliderList,
} from "@reducers/adminSliderReducer";

export const getSliderBanners = (sliderParams) => async (dispatch) => {
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

    const query = sliderParams.query ? sliderParams.query : {};
    sliderParams.query = query;
    config.params = sliderParams;

    dispatch(loadingSliderList());

    const res = await api.get(`/api/admin/slider`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(sliderSearchParameterUpdate(sliderParams));
      dispatch(sliderListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching sliders";
      dispatch(sliderError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        sliderError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching sliders";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const createSliderBanner = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    dispatch(loadingOnSliderSubmit());

    const res = await api.post(`/api/admin/slider`, formData, config);
    if (res.data.status === true) {
      dispatch(sliderCreated(res.data.response));
      dispatch(setAlert("Slider banner created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/slider`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(sliderError());
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
      err.response &&
        dispatch(
          sliderError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error creating slider", "danger"));
    }
  }
};

export const updateSliderBanner = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };
    const res = await api.put(`/api/admin/slider/${id}`, formData, config);
    if (res.data.status === true) {
      dispatch(sliderUpdated(res.data.response));
      dispatch(setAlert("Slider banner updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/slider`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(sliderError());
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
      err.response &&
        dispatch(
          sliderError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error updating slider", "danger"));
    }
  }
};

export const deleteSliderBanner = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/slider/${id}`, config);

    dispatch(sliderDeleted(id));
    dispatch(setAlert("Slider banner deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        sliderError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.message || "Error deleting slider", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetSlider());
};

export const removeSliderErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

