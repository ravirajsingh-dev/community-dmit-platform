import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  videoCreated,
  resetVideo,
  videoListUpdated,
  videoUpdated,
  videoDeleted,
  videoError,
  videoSearchParameterUpdate,
  loadingOnVideoSubmit,
  loadingVideoList,
  videoDetailsById,
  loadingVideo,
} from "@reducers/adminVideoReducer";

export const getVideos = (videoParams) => async (dispatch) => {
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

    const query = videoParams.query ? videoParams.query : {};
    videoParams.query = query;
    config.params = videoParams;

    dispatch(loadingVideoList());

    const res = await api.get(`/api/admin/video`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(videoSearchParameterUpdate(videoParams));
      dispatch(videoListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching videos";
      dispatch(videoError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        videoError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg = err.response?.data?.message || err.response?.message || "Error fetching videos";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getVideoById = (id) => async (dispatch) => {
  try {
    dispatch(loadingVideo());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/video/${id}`, config);
    if (res.data.status === true) {
      dispatch(videoDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          videoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(setAlert(err.response?.message || "Error fetching video", "danger"));
    }
    return null;
  }
};

export const createVideo = (formData, navigate) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    dispatch(loadingOnVideoSubmit());

    const res = await api.post(`/api/admin/video`, formData, config);
    if (res.data.status === true) {
      dispatch(videoCreated(res.data.response));
      dispatch(setAlert("Video created successfully.", "success"));
      if (navigate) {
        navigate(`/admin/video`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(videoError());
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
          videoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error creating video", "danger"));
    }
    return { status: false };
  }
};

export const updateVideo = (formData, id, navigate) => async (dispatch) => {
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
    const res = await api.put(`/api/admin/video/${id}`, requestData, config);
    if (res.data.status === true) {
      dispatch(videoUpdated(res.data.response));
      dispatch(setAlert("Video updated successfully.", "success"));
      if (navigate) {
        navigate(`/admin/video`);
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(videoError());
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
          videoError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );

      dispatch(setAlert(err.response?.message || "Error updating video", "danger"));
    }
    return { status: false };
  }
};

export const deleteVideo = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/video/${id}`, config);

    dispatch(videoDeleted(id));
    dispatch(setAlert("Video deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        videoError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.message || "Error deleting video", "danger"));
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetVideo());
};

export const removeVideoErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
