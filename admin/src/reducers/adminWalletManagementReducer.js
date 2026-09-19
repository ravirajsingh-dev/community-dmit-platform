import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  walletTypes: [],
  walletTypesMainClubs: [],
  adminTransactions: {
    data: [],
    pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
    summary: { totalCredit: "0", totalDebit: "0", totalAmount: "0" },
  },
  walletDetails: {
    summary: { totalRecords: 0, totalCredit: "0", totalDebit: "0", netBalance: "0" },
    data: [],
    pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
  },
  memberBalance: {
    summary: { totalRecords: 0, totalAvailableBalance: "0" },
    data: [],
    pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
  },
  transferReport: {
    data: [],
    summary: {
      totalTransfers: 0,
      totalAmount: "0",
      totalUserTransferAmount: "0",
      totalAdminTransferAmount: "0",
    },
    pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
  },
  loadingWalletTypes: false,
  loadingAdminTransactions: false,
  loadingWalletDetails: false,
  loadingMemberBalance: false,
  loadingTransferReport: false,
  loadingAdjust: false,
  loadingTransfer: false,
};

const adminWalletManagementSlice = createSlice({
  name: "adminWalletManagement",
  initialState,
  reducers: {
    walletTypesUpdated(state, action) {
      const p = action.payload;
      if (Array.isArray(p)) {
        state.walletTypes = p;
        state.walletTypesMainClubs = p;
      } else if (p && typeof p === "object") {
        state.walletTypes = p.walletTypes ?? [];
        state.walletTypesMainClubs = p.walletTypesMainClubs ?? p.walletTypes ?? [];
      } else {
        state.walletTypes = [];
        state.walletTypesMainClubs = [];
      }
      state.loadingWalletTypes = false;
    },
    loadingWalletTypes(state) {
      state.loadingWalletTypes = true;
    },
    adminTransactionsUpdated(state, action) {
      const p = action.payload || {};
      state.adminTransactions = {
        data: p.data ?? [],
        pagination:
          p.pagination ?? {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
          },
        summary: p.summary ?? {
          totalCredit: "0",
          totalDebit: "0",
          totalAmount: "0",
        },
      };
      state.loadingAdminTransactions = false;
    },
    loadingAdminTransactions(state) {
      state.loadingAdminTransactions = true;
    },
    walletDetailsUpdated(state, action) {
      state.walletDetails = action.payload;
      state.loadingWalletDetails = false;
    },
    loadingWalletDetails(state) {
      state.loadingWalletDetails = true;
    },
    memberBalanceUpdated(state, action) {
      state.memberBalance = action.payload;
      state.loadingMemberBalance = false;
    },
    loadingMemberBalance(state) {
      state.loadingMemberBalance = true;
    },
    transferReportUpdated(state, action) {
      const p = action.payload || {};
      state.transferReport = {
        data: p.data ?? [],
        summary: p.summary ?? {
          totalTransfers: 0,
          totalAmount: "0",
          totalUserTransferAmount: "0",
          totalAdminTransferAmount: "0",
        },
        pagination:
          p.pagination ?? {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
          },
      };
      state.loadingTransferReport = false;
    },
    loadingTransferReport(state) {
      state.loadingTransferReport = true;
    },
    loadingAdjust(state) {
      state.loadingAdjust = true;
    },
    adjustSuccess(state) {
      state.loadingAdjust = false;
    },
    loadingTransfer(state) {
      state.loadingTransfer = true;
    },
    transferSuccess(state) {
      state.loadingTransfer = false;
    },
  },
});

export const {
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
} = adminWalletManagementSlice.actions;

export default adminWalletManagementSlice.reducer;
