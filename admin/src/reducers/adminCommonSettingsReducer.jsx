import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  commonSettings: {},
  loadingCommonSettings: true,
  loadingOnSubmit: false,
  error: {},
};

const commonSettingsSlice = createSlice({
  name: "adminCommonSettings",
  initialState: initialState,
  reducers: {
    resetCommonSettings(state) {
      return {
        ...initialState,
      };
    },
    commonSettingsFetched(state, action) {
      return {
        ...state,
        commonSettings: action.payload,
        loadingCommonSettings: false,
      };
    },
    commonSettingsUpdated(state, action) {
      return {
        ...state,
        commonSettings: action.payload,
        loadingOnSubmit: false,
      };
    },
    commonSettingsError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingCommonSettings: false,
        loadingOnSubmit: false,
      };
    },
    loadingCommonSettings(state) {
      return {
        ...state,
        loadingCommonSettings: true,
      };
    },
    loadingOnCommonSettingsSubmit(state) {
      return {
        ...state,
        loadingOnSubmit: true,
      };
    },
  },
});

export const {
  resetCommonSettings,
  commonSettingsFetched,
  commonSettingsUpdated,
  commonSettingsError,
  loadingCommonSettings,
  loadingOnCommonSettingsSubmit,
} = commonSettingsSlice.actions;
export default commonSettingsSlice.reducer;

