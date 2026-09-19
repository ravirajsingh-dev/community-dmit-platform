import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  withdrawalRequests: {
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  loadingWithdrawalRequests: false,
  loadingAction: false,
  qr: null,
  loadingQr: false,
};

const adminWithdrawalSlice = createSlice({
  name: "adminWithdrawal",
  initialState,
  reducers: {
    loadingWithdrawalRequests(state) {
      state.loadingWithdrawalRequests = true;
    },
    withdrawalRequestsUpdated(state, action) {
      state.withdrawalRequests = action.payload;
      state.loadingWithdrawalRequests = false;
    },
    loadingWithdrawalAction(state) {
      state.loadingAction = true;
    },
    withdrawalActionSuccess(state) {
      state.loadingAction = false;
    },
    qrLoading(state) {
      state.loadingQr = true;
      state.qr = null;
    },
    qrUpdated(state, action) {
      state.loadingQr = false;
      state.qr = action.payload;
    },
  },
});

export const {
  loadingWithdrawalRequests,
  withdrawalRequestsUpdated,
  loadingWithdrawalAction,
  withdrawalActionSuccess,
  qrLoading,
  qrUpdated,
} = adminWithdrawalSlice.actions;

export default adminWithdrawalSlice.reducer;

