import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";

/**
 * Get commission payout preview (who gets credited - dry run)
 */
export const getCommissionPreview = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/commission-payout/preview", { params });
    if (res.data?.status && res.data?.response) {
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Preview failed", "danger"));
  }
  return null;
};

/**
 * Get ranks overview - capping, work done, user counts
 */
export const getRanksOverview = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/commission-payout/ranks-overview", {
      params,
    });
    if (res.data?.status && res.data?.response) {
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Failed to load", "danger"));
  }
  return null;
};

/**
 * Get payout history
 */
export const getPayoutHistory = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/commission-payout/history", { params });
    if (res.data?.status && res.data?.response) {
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Failed to load history", "danger"));
  }
  return null;
};

/**
 * Get detailed payout for a period
 */
export const getPayoutHistoryDetail =
  (periodKey, payoutType = "rank") => async (dispatch) => {
  try {
    const res = await api.get(
      `/api/admin/commission-payout/history/${encodeURIComponent(periodKey)}/detail`,
      { params: { payoutType } },
    );
    if (res.data?.status && res.data?.response) {
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Failed to load details", "danger"));
  }
  return null;
};

/**
 * Run commission payout - requires txn_password in data
 */
export const runCommissionPayout = (data) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/commission-payout/run", data, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.data?.status) {
      dispatch(setAlert(res.data.response?.message || "Payout completed", "success"));
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Payout failed", "danger"));
  }
  return null;
};

/**
 * Update commission payout settings (schedule)
 */
export const updateCommissionPayoutSettings = (data) => async (dispatch) => {
  try {
    const res = await api.put("/api/admin/wallet-settings/commission-payout-settings", data, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.data?.status) {
      dispatch(setAlert("Payout schedule updated", "success"));
      return res.data.response;
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Update failed", "danger"));
  }
  return null;
};
