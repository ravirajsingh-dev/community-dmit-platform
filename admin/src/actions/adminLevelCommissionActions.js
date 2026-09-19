import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const ADMIN_LEVEL_COMMISSION_STATS_REQUEST = "ADMIN_LEVEL_COMMISSION_STATS_REQUEST";
export const ADMIN_LEVEL_COMMISSION_STATS_SUCCESS = "ADMIN_LEVEL_COMMISSION_STATS_SUCCESS";
export const ADMIN_LEVEL_COMMISSION_STATS_ERROR = "ADMIN_LEVEL_COMMISSION_STATS_ERROR";
export const ADMIN_LEVEL_COMMISSION_HISTORY_REQUEST = "ADMIN_LEVEL_COMMISSION_HISTORY_REQUEST";
export const ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS = "ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS";
export const ADMIN_LEVEL_COMMISSION_HISTORY_ERROR = "ADMIN_LEVEL_COMMISSION_HISTORY_ERROR";
export const getLevelCommissionStats = () => async (dispatch) => {
  dispatch({ type: ADMIN_LEVEL_COMMISSION_STATS_REQUEST });
  try {
    const res = await api.get("/api/admin/level-commission/stats");
    if (res.data?.status && res.data?.response) {
      dispatch({ type: ADMIN_LEVEL_COMMISSION_STATS_SUCCESS, payload: res.data.response });
    } else {
      dispatch({
        type: ADMIN_LEVEL_COMMISSION_STATS_SUCCESS,
        payload: {
          totalDistributed: "0",
          totalBurned: "0",
          recordCount: 0,
        },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_LEVEL_COMMISSION_STATS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch level commission stats", "danger"));
  }
};

export const getLevelCommissionHistory = (params = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_LEVEL_COMMISSION_HISTORY_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.newUserId && { newUserId: params.newUserId }),
      ...(params.userId && { userId: params.userId }),
      ...(params.sponsorMemberId && { sponsorMemberId: params.sponsorMemberId }),
      ...(params.fromDate && { fromDate: params.fromDate }),
      ...(params.toDate && { toDate: params.toDate }),
    };
    const res = await api.get("/api/admin/level-commission/history", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({ type: ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS, payload: res.data.response });
    } else {
      dispatch({
        type: ADMIN_LEVEL_COMMISSION_HISTORY_SUCCESS,
        payload: { records: [], pagination: {} },
      });
    }
  } catch (err) {
    dispatch({ type: ADMIN_LEVEL_COMMISSION_HISTORY_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch level commission history", "danger"));
  }
};

