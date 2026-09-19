import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";

export const fetchReferralSummary = (params) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
              searchParams.append(key, params[key]);
            }
          });
          return searchParams.toString();
        },
      },
    };

    config.params = params;

    dispatch({ type: "FETCH_REFERRAL_SUMMARY_LOADING" });

    const res = await api.get(`/api/admin/referrals/summary`, config);

    if (res.data && res.data.status && res.data.response) {
      dispatch({
        type: "FETCH_REFERRAL_SUMMARY_SUCCESS",
        payload: {
          summary: res.data.response.summary || [],
          pagination: res.data.response.pagination || {},
          stats: res.data.response.stats || {
            total: 0,
            active: 0,
            inactive: 0,
            newUsers: 0,
          },
        },
      });
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching referral summary";
      dispatch({ type: "FETCH_REFERRAL_SUMMARY_ERROR", payload: errorMsg });
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errorMsg = err.response?.data?.message || "Error fetching referral summary";
      dispatch({ type: "FETCH_REFERRAL_SUMMARY_ERROR", payload: errorMsg });
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const fetchReferredUsers = (userId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/referrals/${userId}/referred-users`);

    if (res.data && res.data.status) {
      return res.data;
    } else {
      const errorMsg = res.data.message || "Error fetching referred users";
      dispatch(setAlert(errorMsg, "danger"));
      throw new Error(errorMsg);
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errorMsg = err.response?.data?.message || err.message || "Error fetching referred users";
      dispatch(setAlert(errorMsg, "danger"));
      throw new Error(errorMsg);
    }
  }
};
