import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";

export const DESIGNATION_ELIGIBILITY_REQUEST = "DESIGNATION_ELIGIBILITY_REQUEST";
export const DESIGNATION_ELIGIBILITY_SUCCESS = "DESIGNATION_ELIGIBILITY_SUCCESS";
export const DESIGNATION_ELIGIBILITY_ERROR = "DESIGNATION_ELIGIBILITY_ERROR";
export const DESIGNATION_APPLY_REQUEST = "DESIGNATION_APPLY_REQUEST";
export const DESIGNATION_APPLY_SUCCESS = "DESIGNATION_APPLY_SUCCESS";
export const DESIGNATION_APPLY_ERROR = "DESIGNATION_APPLY_ERROR";
export const SET_DESIGNATION_ONLINE = "SET_DESIGNATION_ONLINE";

export const setDesignationOnline = (designationCode, online) => ({
  type: SET_DESIGNATION_ONLINE,
  payload: { designationCode, online },
});
export const getDesignationEligibility = () => async (dispatch) => {
  dispatch({ type: DESIGNATION_ELIGIBILITY_REQUEST });
  try {
    const res = await api.get("/api/users/designations/eligibility");
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: DESIGNATION_ELIGIBILITY_SUCCESS,
        payload: res.data.response,
      });
    } else {
      dispatch({
        type: DESIGNATION_ELIGIBILITY_SUCCESS,
        payload: {
          designations: [],
          directCount: 0,
          totalDownlineCount: 0,
          monthlyDirectCount: 0,
        },
      });
    }
  } catch (err) {
    dispatch({ type: DESIGNATION_ELIGIBILITY_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch designation eligibility",
        "danger"
      )
    );
  }
};

export const applyForDesignation = (designationCode) => async (dispatch) => {
  dispatch({ type: DESIGNATION_APPLY_REQUEST });
  try {
    const res = await api.post("/api/users/designations/apply", {
      designationCode,
    });
    if (res.data?.status) {
      dispatch({ type: DESIGNATION_APPLY_SUCCESS });
      dispatch(setAlert("Application submitted successfully", "success"));
      dispatch(getDesignationEligibility());
    } else {
      dispatch({ type: DESIGNATION_APPLY_ERROR });
      dispatch(
        setAlert(
          res.data?.message || "Failed to apply for designation",
          "danger"
        )
      );
    }
  } catch (err) {
    dispatch({ type: DESIGNATION_APPLY_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to apply for designation",
        "danger"
      )
    );
  }
};
