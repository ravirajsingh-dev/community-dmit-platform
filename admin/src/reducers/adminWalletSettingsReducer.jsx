import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  walletSettings: {},
  loadingWalletSettings: true,
  loadingOnSubmit: false,
  error: {},
};

const walletSettingsSlice = createSlice({
  name: "adminWalletSettings",
  initialState: initialState,
  reducers: {
    resetWalletSettings(state) {
      return {
        ...initialState,
      };
    },
    walletSettingsFetched(state, action) {
      return {
        ...state,
        walletSettings: action.payload,
        loadingWalletSettings: false,
      };
    },
    walletSettingsUpdated(state, action) {
      return {
        ...state,
        walletSettings: action.payload,
        loadingOnSubmit: false,
      };
    },
    walletSettingsError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingWalletSettings: false,
        loadingOnSubmit: false,
      };
    },
    loadingWalletSettings(state) {
      return {
        ...state,
        loadingWalletSettings: true,
      };
    },
    loadingOnWalletSettingsSubmit(state) {
      return {
        ...state,
        loadingOnSubmit: true,
      };
    },
  },
});

export const {
  resetWalletSettings,
  walletSettingsFetched,
  walletSettingsUpdated,
  walletSettingsError,
  loadingWalletSettings,
  loadingOnWalletSettingsSubmit,
} = walletSettingsSlice.actions;
export default walletSettingsSlice.reducer;
