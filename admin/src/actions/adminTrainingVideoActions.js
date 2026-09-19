import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  trainingVideoCreated,
  resetTrainingVideo,
  trainingVideoListUpdated,
  trainingVideoUpdated,
  trainingVideoDeleted,
  trainingVideoError,
  trainingVideoSearchParameterUpdate,
  loadingOnTrainingVideoSubmit,
  loadingTrainingVideoList,
  trainingVideoDetailsById,
  loadingTrainingVideo,
} from "@reducers/adminTrainingVideoReducer";

export const getTrainingVideos = (params) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (p) => {
          const searchParams = new URLSearchParams();
          Object.keys(p).forEach((key) => {
            if (p[key] !== null && p[key] !== undefined) {
              searchParams.append(key, p[key]);
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = params.query ? params.query : {};
    params.query = query;
    config.params = params;

    dispatch(loadingTrainingVideoList());

    const res = await api.get(`/api/admin/training-videos`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(trainingVideoSearchParameterUpdate(params));
      dispatch(trainingVideoListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching training videos";
      dispatch(trainingVideoError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        trainingVideoError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg =
        err.response?.data?.message ||
        err.response?.message ||
        "Error fetching training videos";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getTrainingVideoById = (id) => async (dispatch) => {
  try {
    dispatch(loadingTrainingVideo());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/training-videos/${id}`, config);
    if (res.data.status === true) {
      dispatch(trainingVideoDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          trainingVideoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching training video", "danger"));
    }
    return null;
  }
};

export const createTrainingVideo = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnTrainingVideoSubmit());

    const res = await api.post(`/api/admin/training-videos`, formData, config);
    if (res.data.status === true) {
      dispatch(trainingVideoCreated(res.data.response));
      dispatch(setAlert("Training content created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/training-videos`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(trainingVideoError());
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
          trainingVideoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(
        setAlert(
          err.response?.message || "Error creating training content",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

export const updateTrainingVideo = (formData, id, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { txn_password, ...videoData } = formData;
    const requestData = { ...videoData };
    if (txn_password) {
      requestData.txn_password = txn_password;
    }
    const res = await api.put(
      `/api/admin/training-videos/${id}`,
      requestData,
      config
    );
    if (res.data.status === true) {
      dispatch(trainingVideoUpdated(res.data.response));
      dispatch(setAlert("Training content updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/training-videos`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(trainingVideoError());
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
          trainingVideoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(
        setAlert(
          err.response?.message || "Error updating training content",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

export const deleteTrainingVideo = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password,
      },
    };
    await api.delete(`/api/admin/training-videos/${id}`, config);

    dispatch(trainingVideoDeleted(id));
    dispatch(setAlert("Training content deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        trainingVideoError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(
      setAlert(
        err.response?.message || "Error deleting training content",
        "danger"
      )
    );
  }
};

export const resetTrainingVideoStore = () => async (dispatch) => {
  await dispatch(resetTrainingVideo());
};

export const removeTrainingVideoErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

