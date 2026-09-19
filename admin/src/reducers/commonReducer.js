import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  servicesList: [],
  productsList: [],
  productServicesList: [],
  productServiceCategoriesList: [],
  adminPrimeCredentialsList: [],
  adminDetails: {},
  dashboardDetails: {},
  dashboardDetailsLoading: true,
  adminDetailsLoading: true,
  adminPrimeCredentialsLoading: true,
  loadingGenerateQRCode: false,
  amountQRCode: "",
  EP_User: {},
};

const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    servicesListUpdated(state, action) {
      return {
        ...state,
        servicesList: action.payload,
      };
    },

    productsListUpdated(state, action) {
      return {
        ...state,
        productsList: action.payload,
      };
    },

    productServicesListUpdated(state, action) {
      return {
        ...state,
        productServicesList: action.payload,
      };
    },

    productServiceCategoriesListUpdated(state, action) {
      return {
        ...state,
        productServiceCategoriesList: action.payload,
      };
    },

    loadingOnGenerateQRCode(state) {
      return {
        ...state,
        loadingGenerateQRCode: true,
      };
    },

    generateQRCodeUpdated(state, action) {
      return {
        ...state,
        amountQRCode: action.payload,
        loadingGenerateQRCode: false,
      };
    },

    adminPrimeCredentialListUpdated(state, action) {
      return {
        ...state,
        adminPrimeCredentialsList: action.payload,
        adminPrimeCredentialsLoading: false,
      };
    },
    adminDetailsUpdated(state, action) {
      return {
        ...state,
        adminDetails: action.payload,
        adminDetailsLoading: false,
      };
    },
    userDashboardDetailsUpdated(state, action) {
      return {
        ...state,
        dashboardDetails: action.payload,
        dashboardDetailsLoading: false,
      };
    },

    EPUserLoaded(state, action) {
      return {
        ...state,
        EP_User: action.payload,
      };
    },
  },
});

export const {
  userDashboardDetailsUpdated,
  servicesListUpdated,
  productsListUpdated,
  productServicesListUpdated,
  productServiceCategoriesListUpdated,
  loadingOnGenerateQRCode,
  generateQRCodeUpdated,
  adminPrimeCredentialListUpdated,
  adminDetailsUpdated,
  EPUserLoaded,
} = commonSlice.actions;
export default commonSlice.reducer;
