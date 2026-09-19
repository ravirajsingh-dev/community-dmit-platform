import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";
import {
  walletTypesUpdated,
  loadingWalletTypes,
  adminTransactionsUpdated,
  loadingAdminTransactions,
  walletDetailsUpdated,
  loadingWalletDetails,
  memberBalanceUpdated,
  loadingMemberBalance,
  transferReportUpdated,
  loadingTransferReport,
  loadingAdjust,
  adjustSuccess,
  loadingTransfer,
  transferSuccess,
} from "@reducers/adminWalletManagementReducer";

const BASE = "/api/admin/wallet-management";

export const getWalletTypes = () => async (dispatch) => {
  dispatch(loadingWalletTypes());
  try {
    const res = await api.get(`${BASE}/wallet-types`);
    if (res.data?.status && res.data?.response?.walletTypes) {
      const r = res.data.response;
      dispatch(
        walletTypesUpdated({
          walletTypes: r.walletTypes,
          walletTypesMainClubs: r.walletTypesMainClubs ?? r.walletTypes,
        }),
      );
      return r.walletTypes;
    }
    dispatch(walletTypesUpdated({ walletTypes: [], walletTypesMainClubs: [] }));
    return [];
  } catch (err) {
    dispatch(walletTypesUpdated({ walletTypes: [], walletTypesMainClubs: [] }));
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Error fetching wallet types", "danger"));
    return [];
  }
};

export const resolveMember = (memberId) => async (dispatch) => {
  try {
    const res = await api.get(`${BASE}/resolve-member`, { params: { memberId } });
    if (res.data?.status && res.data?.response) return res.data.response;
    return null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const getBalance = (userId, walletKey) => async (dispatch) => {
  try {
    const uid = userId?.toString?.() || userId;
    const res = await api.get(`${BASE}/balance`, { params: { userId: uid, walletKey } });
    if (res.data?.status && res.data?.response?.availableBalance != null)
      return res.data.response.availableBalance;
    return "0";
  } catch (err) {
    return "0";
  }
};

export const adminAdjust = (payload) => async (dispatch) => {
  dispatch(loadingAdjust());
  try {
    const res = await api.post(`${BASE}/adjust`, payload);
    if (res.data?.status) {
      dispatch(adjustSuccess());
      dispatch(setAlert(res.data.message || "Success", "success"));
      return res.data.response;
    }
    dispatch(adjustSuccess());
    dispatch(setAlert(res.data?.message || "Error", "danger"));
    return null;
  } catch (err) {
    dispatch(adjustSuccess());
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else
      dispatch(
        setAlert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Error", "danger")
      );
    return null;
  }
};

export const adminTransfer = (payload) => async (dispatch) => {
  dispatch(loadingTransfer());
  try {
    const res = await api.post(`${BASE}/transfer`, payload);
    if (res.data?.status) {
      dispatch(transferSuccess());
      const resp = res.data?.response || {};
      const msg = res.data?.message || (resp.activationTriggered ? "Transfer completed. User activated successfully." : "Transfer successful");
      dispatch(setAlert(msg, "success"));
      if (resp.activationTriggered) {
        dispatch(getTransferReport({}));
        dispatch(getMemberBalance({}));
      }
      return resp;
    }
    dispatch(transferSuccess());
    dispatch(setAlert(res.data?.message || "Error", "danger"));
    return null;
  } catch (err) {
    dispatch(transferSuccess());
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else
      dispatch(
        setAlert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Error", "danger")
      );
    return null;
  }
};

export const getAdminTransactions = (params) => async (dispatch) => {
  dispatch(loadingAdminTransactions());
  try {
    const res = await api.get(`${BASE}/admin-transactions`, { params });
    if (res.data?.status && res.data?.response) {
      dispatch(
        adminTransactionsUpdated({
          data: res.data.response.transactions,
          pagination: res.data.response.pagination,
          summary: res.data.response.summary ?? {
            totalCredit: "0",
            totalDebit: "0",
            totalAmount: "0",
          },
        }),
      );
    }
    return res.data?.response;
  } catch (err) {
    dispatch(
      adminTransactionsUpdated({
        data: [],
        pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
        summary: { totalCredit: "0", totalDebit: "0", totalAmount: "0" },
      }),
    );
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Error", "danger"));
    return null;
  }
};

export const getWalletDetails = (params) => async (dispatch) => {
  dispatch(loadingWalletDetails());
  try {
    const res = await api.get(`${BASE}/wallet-details`, { params });
    if (res.data?.status && res.data?.response) {
      dispatch(
        walletDetailsUpdated({
          summary: res.data.response.summary,
          data: res.data.response.transactions,
          pagination: res.data.response.pagination,
        })
      );
    }
    return res.data?.response;
  } catch (err) {
    dispatch(walletDetailsUpdated({
      summary: { totalRecords: 0, totalCredit: "0", totalDebit: "0", netBalance: "0" },
      data: [],
      pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
    }));
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Error", "danger"));
    return null;
  }
};

export const getMemberBalance = (params) => async (dispatch) => {
  dispatch(loadingMemberBalance());
  try {
    const res = await api.get(`${BASE}/member-balance`, { params });
    if (res.data?.status && res.data?.response) {
      dispatch(
        memberBalanceUpdated({
          summary: res.data.response.summary,
          data: res.data.response.memberBalances,
          pagination: res.data.response.pagination,
        })
      );
    }
    return res.data?.response;
  } catch (err) {
    dispatch(memberBalanceUpdated({
      summary: { totalRecords: 0, totalAvailableBalance: "0" },
      data: [],
      pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
    }));
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Error", "danger"));
    return null;
  }
};

export const getUserActivationStats = (userId) => async (dispatch) => {
  try {
    const res = await api.get(`${BASE}/user-activation-stats`, { params: { userId } });
    if (res.data?.status && res.data?.response) return res.data.response;
    return null;
  } catch (err) {
    return null;
  }
};

export const getTransferReport = (params) => async (dispatch) => {
  dispatch(loadingTransferReport());
  try {
    const res = await api.get(`${BASE}/transfer-report`, { params });
    if (res.data?.status && res.data?.response) {
      dispatch(
        transferReportUpdated({
          data: res.data.response.transfers,
          pagination: res.data.response.pagination,
          summary: res.data.response.summary ?? {
            totalTransfers: 0,
            totalAmount: "0",
            totalUserTransferAmount: "0",
            totalAdminTransferAmount: "0",
          },
        })
      );
    }
    return res.data?.response;
  } catch (err) {
    dispatch(
      transferReportUpdated({
        data: [],
        pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
        summary: {
          totalTransfers: 0,
          totalAmount: "0",
          totalUserTransferAmount: "0",
          totalAdminTransferAmount: "0",
        },
      })
    );
    if (err.response?.data?.tokenStatus === 0) dispatch(adminLogout());
    else dispatch(setAlert(err.response?.data?.message || "Error", "danger"));
    return null;
  }
};
