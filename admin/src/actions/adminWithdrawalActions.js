import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { adminLogout } from "./adminAuth";

import {
  loadingWithdrawalRequests,
  withdrawalRequestsUpdated,
  loadingWithdrawalAction,
  withdrawalActionSuccess,
  qrLoading,
  qrUpdated,
} from "@reducers/adminWithdrawalReducer";

const BASE = "/api/admin/wallet-management";

export const getWithdrawalRequests = (params = {}) => async (dispatch) => {
  dispatch(loadingWithdrawalRequests());
  try {
    const res = await api.get(`${BASE}/withdrawal-requests`, { params });
    if (res.data?.status && res.data?.response) {
      const { items, pagination } = res.data.response;
      dispatch(
        withdrawalRequestsUpdated({
          data: items || [],
          pagination: {
            page: pagination?.page ?? 1,
            limit: pagination?.limit ?? 20,
            total: pagination?.totalCount ?? 0,
            pages: pagination?.totalPages ?? 0,
          },
        }),
      );
      return res.data.response;
    }
    dispatch(
      withdrawalRequestsUpdated({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }),
    );
    return res.data?.response;
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    dispatch(setAlert(err.response?.data?.message || "Failed to fetch withdrawal requests", "danger"));
    dispatch(
      withdrawalRequestsUpdated({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }),
    );
    return null;
  }
};

export const approveWithdrawalRequest =
  (requestId, txn_password, remarks = "", payoutReference = "") =>
  async (dispatch) => {
    dispatch(loadingWithdrawalAction());
    try {
      const res = await api.post(
        `${BASE}/withdrawal-requests/${requestId}/approve`,
        { txn_password, remarks, payoutReference: payoutReference || "" },
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.data?.status) {
        dispatch(withdrawalActionSuccess());
        dispatch(setAlert(res.data.message || "Withdrawal approved", "success"));
        return res.data.response;
      }
      dispatch(withdrawalActionSuccess());
      dispatch(setAlert(res.data?.message || "Approval failed", "danger"));
      return null;
    } catch (err) {
      dispatch(withdrawalActionSuccess());
      if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
      }
      dispatch(setAlert(err.response?.data?.message || err.message || "Approval failed", "danger"));
      throw err;
    }
  };

export const setWithdrawalPayoutReference =
  (requestId, txn_password, payoutReference) => async (dispatch) => {
    dispatch(loadingWithdrawalAction());
    try {
      const res = await api.post(
        `${BASE}/withdrawal-requests/${requestId}/payout-reference`,
        { txn_password, payoutReference: payoutReference || "" },
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.data?.status) {
        dispatch(withdrawalActionSuccess());
        dispatch(setAlert(res.data.message || "Payout reference saved", "success"));
        return res.data.response;
      }
      dispatch(withdrawalActionSuccess());
      dispatch(setAlert(res.data?.message || "Update failed", "danger"));
      return null;
    } catch (err) {
      dispatch(withdrawalActionSuccess());
      if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
      }
      dispatch(setAlert(err.response?.data?.message || err.message || "Update failed", "danger"));
      throw err;
    }
  };

export const rejectWithdrawalRequest = (requestId, txn_password, remarks = "") => async (dispatch) => {
  dispatch(loadingWithdrawalAction());
  try {
    const res = await api.post(
      `${BASE}/withdrawal-requests/${requestId}/reject`,
      { txn_password, remarks },
      { headers: { "Content-Type": "application/json" } },
    );
    if (res.data?.status) {
      dispatch(withdrawalActionSuccess());
      dispatch(setAlert(res.data.message || "Withdrawal rejected", "success"));
      return res.data.response;
    }
    dispatch(withdrawalActionSuccess());
    dispatch(setAlert(res.data?.message || "Rejection failed", "danger"));
    return null;
  } catch (err) {
    dispatch(withdrawalActionSuccess());
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((e) => dispatch(setErrorsList(e.msg, e.path)));
    }
    dispatch(setAlert(err.response?.data?.message || err.message || "Rejection failed", "danger"));
    throw err;
  }
};

export const generateWithdrawalUpiQr = (requestId) => async (dispatch) => {
  dispatch(qrLoading());
  try {
    const res = await api.post(
      `${BASE}/withdrawal-requests/${requestId}/generate-qr`,
      {},
      { headers: { "Content-Type": "application/json" } },
    );
    if (res.data?.status && res.data?.response) {
      dispatch(qrUpdated(res.data.response));
      return res.data.response;
    }
    dispatch(qrUpdated(null));
    dispatch(setAlert(res.data?.message || "QR generation failed", "danger"));
    return null;
  } catch (err) {
    dispatch(qrUpdated(null));
    dispatch(setAlert(err.response?.data?.message || err.message || "QR generation failed", "danger"));
    throw err;
  }
};

