import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";

export const WITHDRAWAL_SETTINGS_REQUEST = "WITHDRAWAL_SETTINGS_REQUEST";
export const WITHDRAWAL_SETTINGS_SUCCESS = "WITHDRAWAL_SETTINGS_SUCCESS";
export const WITHDRAWAL_SETTINGS_ERROR = "WITHDRAWAL_SETTINGS_ERROR";

export const WITHDRAWAL_REQUESTS_REQUEST = "WITHDRAWAL_REQUESTS_REQUEST";
export const WITHDRAWAL_REQUESTS_SUCCESS = "WITHDRAWAL_REQUESTS_SUCCESS";
export const WITHDRAWAL_REQUESTS_ERROR = "WITHDRAWAL_REQUESTS_ERROR";

export const WITHDRAWAL_HISTORY_REQUEST = "WITHDRAWAL_HISTORY_REQUEST";
export const WITHDRAWAL_HISTORY_SUCCESS = "WITHDRAWAL_HISTORY_SUCCESS";
export const WITHDRAWAL_HISTORY_ERROR = "WITHDRAWAL_HISTORY_ERROR";

export const WITHDRAWAL_CREATE_REQUEST = "WITHDRAWAL_CREATE_REQUEST";
export const WITHDRAWAL_CREATE_SUCCESS = "WITHDRAWAL_CREATE_SUCCESS";
export const WITHDRAWAL_CREATE_ERROR = "WITHDRAWAL_CREATE_ERROR";

export const WITHDRAWAL_CANCEL_REQUEST = "WITHDRAWAL_CANCEL_REQUEST";
export const WITHDRAWAL_CANCEL_SUCCESS = "WITHDRAWAL_CANCEL_SUCCESS";
export const WITHDRAWAL_CANCEL_ERROR = "WITHDRAWAL_CANCEL_ERROR";

const BASE = "/api/users/wallet";

export const getWithdrawalSettings = () => async (dispatch) => {
  dispatch({ type: WITHDRAWAL_SETTINGS_REQUEST });
  try {
    const res = await api.get(`${BASE}/withdrawal-settings`);
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: WITHDRAWAL_SETTINGS_SUCCESS,
        payload: res.data.response,
      });
      return res.data.response;
    }
    dispatch({ type: WITHDRAWAL_SETTINGS_SUCCESS, payload: {} });
    return {};
  } catch (err) {
    dispatch({ type: WITHDRAWAL_SETTINGS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch withdrawal settings", "danger"));
    return {};
  }
};

export const getWithdrawalRequests = (params = {}) => async (dispatch) => {
  dispatch({ type: WITHDRAWAL_REQUESTS_REQUEST });
  try {
    const query = {
      ...(params.status && { status: params.status }),
      ...(params.page && { page: params.page }),
      ...(params.limit && { limit: params.limit }),
      ...(params.excludePending && { excludePending: true }),
    };
    const res = await api.get(`${BASE}/withdrawals`, { params: query });
    if (res.data?.status && res.data?.response) {
      const pendingRequest =
        (res.data.response?.items || []).find((r) => r.status === "PENDING") || null;
      dispatch({
        type: WITHDRAWAL_REQUESTS_SUCCESS,
        payload: { ...res.data.response, pendingRequest },
      });
      return res.data.response;
    }
    dispatch({
      type: WITHDRAWAL_REQUESTS_SUCCESS,
      payload: { items: [], pagination: null, pendingRequest: null },
    });
    return { items: [], pagination: null };
  } catch (err) {
    dispatch({ type: WITHDRAWAL_REQUESTS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch withdrawal requests", "danger"));
    return { items: [], pagination: null };
  }
};

export const fetchWithdrawalHistory = (params = {}) => async (dispatch) => {
  dispatch({ type: WITHDRAWAL_HISTORY_REQUEST });
  const page = params.page || 1;
  const limit = params.limit || 10;
  try {
    const res = await api.get(`${BASE}/withdrawals`, {
      params: { page, limit, excludePending: true },
    });
    if (res.data?.status && res.data?.response) {
      dispatch({
        type: WITHDRAWAL_HISTORY_SUCCESS,
        payload: res.data.response,
      });
      return res.data.response;
    }
    dispatch({
      type: WITHDRAWAL_HISTORY_SUCCESS,
      payload: { items: [], pagination: null },
    });
    return { items: [], pagination: null };
  } catch (err) {
    dispatch({ type: WITHDRAWAL_HISTORY_ERROR });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch withdrawal history",
        "danger",
      ),
    );
    return { items: [], pagination: null };
  }
};

export const createWithdrawalRequest = ({
  requestId,
  amount,
  paymentMethod,
  paymentDetails,
}) => async (dispatch) => {
  dispatch({ type: WITHDRAWAL_CREATE_REQUEST });
  try {
    const payload = {
      requestId,
      amount: parseFloat(amount),
      paymentMethod,
      ...(paymentMethod === "UPI" && { upiId: paymentDetails?.upiId }),
      ...(paymentMethod === "BANK" && {
        bankName: paymentDetails?.bankName,
        accountHolderName: paymentDetails?.accountHolderName,
        accountNumber: paymentDetails?.accountNumber,
        ifsc: paymentDetails?.ifsc,
      }),
      ...(paymentMethod === "CHEQUE" && {
        chequeNumber: paymentDetails?.chequeNumber,
        chequeBankName: paymentDetails?.chequeBankName,
      }),
    };

    const res = await api.post(`${BASE}/withdraw`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.data?.status && res.data?.response) {
      dispatch({ type: WITHDRAWAL_CREATE_SUCCESS });
      dispatch(setAlert(res.data.message || "Withdrawal request submitted", "success"));
      return res.data.response;
    }
    throw new Error(res.data?.message || "Withdrawal request failed");
  } catch (err) {
    dispatch({ type: WITHDRAWAL_CREATE_ERROR });
    const msg = err.response?.data?.message || err.message || "Withdrawal failed";
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
    }
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

export const fetchWithdrawalSettings = getWithdrawalSettings;
export const fetchWithdrawalRequests = getWithdrawalRequests;

export const cancelWithdrawalRequest = (withdrawalRequestId) => async (dispatch) => {
  dispatch({ type: WITHDRAWAL_CANCEL_REQUEST });
  try {
    const res = await api.post(
      `${BASE}/withdraw/cancel`,
      { withdrawalRequestId },
      { headers: { "Content-Type": "application/json" } },
    );
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WITHDRAWAL_CANCEL_SUCCESS });
      dispatch(setAlert(res.data.message || "Withdrawal request cancelled", "success"));
      return res.data.response;
    }
    throw new Error(res.data?.message || "Cancel failed");
  } catch (err) {
    dispatch({ type: WITHDRAWAL_CANCEL_ERROR });
    const msg = err.response?.data?.message || err.message || "Cancel failed";
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

