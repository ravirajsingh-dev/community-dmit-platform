import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { loadUser } from "./auth";

export const WALLET_DETAILS_REQUEST = "WALLET_DETAILS_REQUEST";
export const WALLET_DETAILS_SUCCESS = "WALLET_DETAILS_SUCCESS";
export const WALLET_DETAILS_ERROR = "WALLET_DETAILS_ERROR";
export const WALLET_TRANSFER_REQUEST = "WALLET_TRANSFER_REQUEST";
export const WALLET_TRANSFER_SUCCESS = "WALLET_TRANSFER_SUCCESS";
export const WALLET_TRANSFER_ERROR = "WALLET_TRANSFER_ERROR";
export const WALLET_CLUB_TRANSFER_REQUEST = "WALLET_CLUB_TRANSFER_REQUEST";
export const WALLET_CLUB_TRANSFER_SUCCESS = "WALLET_CLUB_TRANSFER_SUCCESS";
export const WALLET_CLUB_TRANSFER_ERROR = "WALLET_CLUB_TRANSFER_ERROR";
export const WALLET_TRANSACTIONS_REQUEST = "WALLET_TRANSACTIONS_REQUEST";
export const WALLET_TRANSACTIONS_SUCCESS = "WALLET_TRANSACTIONS_SUCCESS";
export const WALLET_TRANSACTIONS_ERROR = "WALLET_TRANSACTIONS_ERROR";
export const WALLET_LEVEL_INCOME_REQUEST = "WALLET_LEVEL_INCOME_REQUEST";
export const WALLET_LEVEL_INCOME_SUCCESS = "WALLET_LEVEL_INCOME_SUCCESS";
export const WALLET_LEVEL_INCOME_ERROR = "WALLET_LEVEL_INCOME_ERROR";
export const SET_APPLIED_PARAMS_WALLET_TRANSACTIONS = "SET_APPLIED_PARAMS_WALLET_TRANSACTIONS";
export const WALLET_CLUB_INFO_REQUEST = "WALLET_CLUB_INFO_REQUEST";
export const WALLET_CLUB_INFO_SUCCESS = "WALLET_CLUB_INFO_SUCCESS";
export const WALLET_CLUB_INFO_ERROR = "WALLET_CLUB_INFO_ERROR";

export const getWalletDetails = () => async (dispatch) => {
  dispatch({ type: WALLET_DETAILS_REQUEST });
  try {
    const res = await api.get("/api/users/wallet");
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_DETAILS_SUCCESS, payload: res.data.response });
    } else {
      dispatch({ type: WALLET_DETAILS_SUCCESS, payload: { mainBalance: 0, clubBalances: [] } });
    }
  } catch (err) {
    dispatch({ type: WALLET_DETAILS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch wallet", "danger"));
  }
};

export const getWalletTransactions = (params = {}) => async (dispatch) => {
  dispatch({ type: WALLET_TRANSACTIONS_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.walletKey && { walletKey: params.walletKey }),
      ...(params.walletType && { walletType: params.walletType }),
      ...(params.type && { type: params.type }),
      ...(params.direction && { direction: params.direction }),
      ...(params.fromDate && { fromDate: params.fromDate }),
      ...(params.toDate && { toDate: params.toDate }),
    };
    const res = await api.get("/api/users/wallet/transactions", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_TRANSACTIONS_SUCCESS, payload: res.data.response });
    } else {
      dispatch({ type: WALLET_TRANSACTIONS_SUCCESS, payload: { transactions: [], pagination: {} } });
    }
  } catch (err) {
    dispatch({ type: WALLET_TRANSACTIONS_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch transactions", "danger"));
  }
};

export const getLevelIncome = (params = {}) => async (dispatch) => {
  dispatch({ type: WALLET_LEVEL_INCOME_REQUEST });
  try {
    const query = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.fromDate && { fromDate: params.fromDate }),
      ...(params.toDate && { toDate: params.toDate }),
    };
    const res = await api.get("/api/users/wallet/level-income", { params: query });
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_LEVEL_INCOME_SUCCESS, payload: res.data.response });
    } else {
      dispatch({ type: WALLET_LEVEL_INCOME_SUCCESS, payload: { transactions: [], pagination: {} } });
    }
  } catch (err) {
    dispatch({ type: WALLET_LEVEL_INCOME_ERROR });
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch level income", "danger"));
  }
};

export const setAppliedParamsWalletTransactions = (payload) => ({
  type: SET_APPLIED_PARAMS_WALLET_TRANSACTIONS,
  payload,
});

export const walletTransfer = (toMemberId, amount, requestId) => async (dispatch) => {
  if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
    const err = new Error("requestId (UUID) is required");
    dispatch({ type: WALLET_TRANSFER_ERROR });
    dispatch(setAlert("requestId (UUID) is required", "danger"));
    throw err;
  }
  dispatch({ type: WALLET_TRANSFER_REQUEST });
  try {
    const payload = {
      toMemberId: String(toMemberId).trim().toUpperCase(),
      amount: parseFloat(amount),
      requestId: requestId.trim(),
    };
    const res = await api.post("/api/users/wallet/transfer", payload, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_TRANSFER_SUCCESS });
      const resp = res.data.response;
      const msg = resp.activationTriggered ? "User Activated Successfully" : "Transfer completed successfully";
      dispatch(setAlert(msg, "success"));
      dispatch(getWalletDetails());
      if (resp.activationTriggered) {
        dispatch(loadUser());
      }
      return resp;
    }
    throw new Error(res.data?.message || "Transfer failed");
  } catch (err) {
    dispatch({ type: WALLET_TRANSFER_ERROR });
    const msg = err.response?.data?.message || err.message || "Transfer failed";
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
    }
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

export const walletClubTransfer = (clubKey, amount, requestId) => async (dispatch) => {
  if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
    const err = new Error("requestId (UUID) is required");
    dispatch({ type: WALLET_CLUB_TRANSFER_ERROR });
    dispatch(setAlert("requestId (UUID) is required", "danger"));
    throw err;
  }
  dispatch({ type: WALLET_CLUB_TRANSFER_REQUEST });
  try {
    const payload = {
      clubKey: String(clubKey).trim().toUpperCase(),
      amount: parseFloat(amount),
      requestId: requestId.trim(),
    };
    const res = await api.post("/api/users/wallet/club-transfer", payload, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_CLUB_TRANSFER_SUCCESS });
      dispatch(setAlert("Club transfer completed successfully", "success"));
      dispatch(getWalletDetails());
      return res.data.response;
    }
    throw new Error(res.data?.message || "Club transfer failed");
  } catch (err) {
    dispatch({ type: WALLET_CLUB_TRANSFER_ERROR });
    const msg = err.response?.data?.message || err.message || "Club transfer failed";
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
    }
    dispatch(setAlert(msg, "danger"));
    throw err;
  }
};

export const getClubInfo = () => async (dispatch) => {
  dispatch({ type: WALLET_CLUB_INFO_REQUEST });
  try {
    const res = await api.get("/api/users/club");
    if (res.data?.status && res.data?.response) {
      dispatch({ type: WALLET_CLUB_INFO_SUCCESS, payload: res.data.response });
    } else {
      dispatch({
        type: WALLET_CLUB_INFO_SUCCESS,
        payload: { clubs: [], totalClubIncomeThisMonth: "0.00" },
      });
    }
  } catch (err) {
    dispatch({ type: WALLET_CLUB_INFO_ERROR });
    dispatch(
      setAlert(err.response?.data?.message || "Failed to fetch club info", "danger"),
    );
  }
};
