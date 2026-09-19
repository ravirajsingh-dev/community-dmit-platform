import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

import {
  RANK_INFO_REQUEST,
  RANK_INFO_SUCCESS,
  RANK_INFO_ERROR,
} from "@src/constants/rankActionTypes";

/**
 * GET /api/users/rank - current rank, next rank progress, commission earned this month
 */
export const getRankInfo = () => async (dispatch) => {
  dispatch({ type: RANK_INFO_REQUEST });
  try {
    const res = await api.get("/api/users/rank");
    const response = res.data?.response;

    if (res.data?.status && response) {
      dispatch({ type: RANK_INFO_SUCCESS, payload: response });
    } else {
      dispatch({
        type: RANK_INFO_SUCCESS,
        payload: {
          currentRank: null,
          nextRank: null,
          commissionEarnedThisMonth: "0.00",
        },
      });
    }
  } catch (err) {
    dispatch({ type: RANK_INFO_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch rank info",
        "danger"
      )
    );
  }
};

