import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const TRAINING_VIDEOS_REQUEST = "TRAINING_VIDEOS_REQUEST";
export const TRAINING_VIDEOS_SUCCESS = "TRAINING_VIDEOS_SUCCESS";
export const TRAINING_VIDEOS_ERROR = "TRAINING_VIDEOS_ERROR";

export const getTrainingVideos = () => async (dispatch) => {
  dispatch({ type: TRAINING_VIDEOS_REQUEST });
  try {
    const res = await api.get("/api/common/training-videos", {
      headers: { "Content-Type": "application/json" },
    });

    const raw = res?.data?.status === true ? res.data.response : [];
    dispatch({ type: TRAINING_VIDEOS_SUCCESS, payload: raw });
    return raw;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.message ||
      "Failed to fetch training videos";
    dispatch({ type: TRAINING_VIDEOS_ERROR, payload: { message } });
    dispatch(
      setAlert(message, "danger"),
    );
    return [];
  }
};

