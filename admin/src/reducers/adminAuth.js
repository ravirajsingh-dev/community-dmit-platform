import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAdminAuthenticated: null, // null = not checked yet, false = checked and not authenticated, true = authenticated
  adminLoading: true,
  showWelcomeNotificationModal: false,
  loadingRegister: true,
  loadingOnChangePassword: false,
  showChangePassModal: false,
  admin: null,
  isSidebarExpended: false,
  error: {},
  // Admin Forgot Password states
  forgotPasswordEmailVerifyAdminIdLoading: false,
  forgotPasswordEmailSendOtpLoading: false,
  forgotPasswordEmailResendOtpLoading: false,
  forgotPasswordEmailVerifyOtpLoading: false,
  forgotPasswordEmailResetLoading: false,
};

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    loadAdminAuthPage(state) {
      return {
        ...state,
        adminLoading: false,
      };
    },

    adminAuthTokenRefresh(state, action) {
      const { admin } = action.payload;
      return {
        ...state,
        isAdminAuthenticated: true,
        adminLoading: false,
        admin,
      };
    },

    adminLoaded(state, action) {
      return {
        ...state,
        isAdminAuthenticated: true,
        adminLoading: false,
        admin: action.payload,
      };
    },

    registerSuccess(state) {
      return {
        ...state,
        loadingRegister: false,
      };
    },

    adminLoginSuccess(state, action) {
      const { user } = action.payload;
      return {
        ...state,
        admin: user,
        isAdminAuthenticated: true,
        adminLoading: false,
        showWelcomeNotificationModal: true,
        loadingOnChangePassword: false,
        showChangePassModal: false,
      };
    },

    registerFail(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingRegister: false,
      };
    },

    adminAuthError(state, action) {
      return {
        ...state,
        error: action.payload,
        isAdminAuthenticated: false,
        adminLoading: false,
        admin: null,
      };
    },

    logoutAdminAuth(state) {
      return {
        ...state,
        isAdminAuthenticated: false,
        adminLoading: false,
        admin: null,
      };
    },

    adminLoginFail(state) {
      return {
        ...state,
        isAdminAuthenticated: false,
        adminLoading: false,
        showWelcomeNotificationModal: false,
        admin: null,
      };
    },

    loadingOnAdminLoginSubmit(state) {
      return {
        ...state,
        adminLoading: true,
      };
    },
    registerError(state, action) {
      return {
        ...state,
        error: action.payload,
        adminLoading: false,
        loadingRegister: false,
      };
    },

    // Change password
    setLoadingOnChangePassword(state) {
      return {
        ...state,
        loadingOnChangePassword: true,
        showChangePassModal: false,
      };
    },

    changePasswordSuccess(state, action) {
      return {
        ...state,
        loadingOnChangePassword: false,
        showChangePassModal: true,
      };
    },
    changePasswordError(state, action) {
      return {
        ...state,
        loadingOnChangePassword: false,
        showChangePassModal: false,
      };
    },
    updateSidebarExpended(state, action) {
      return {
        ...state,
        isSidebarExpended: !state.isSidebarExpended,
      };
    },
    // Admin Forgot Password reducers
    setLoadingOnForgotPasswordEmailVerifyAdminId(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyAdminIdLoading: true,
      };
    },
    forgotPasswordEmailVerifyAdminIdSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyAdminIdLoading: false,
      };
    },
    forgotPasswordEmailVerifyAdminIdError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyAdminIdLoading: false,
      };
    },
    setLoadingOnForgotPasswordEmailSendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: true,
      };
    },
    forgotPasswordEmailSendOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
      };
    },
    forgotPasswordEmailSendOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
      };
    },
    setLoadingOnForgotPasswordEmailResendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: true,
      };
    },
    forgotPasswordEmailResendOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: false,
      };
    },
    forgotPasswordEmailResendOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: false,
      };
    },
    setLoadingOnForgotPasswordEmailVerifyOtp(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: true,
      };
    },
    forgotPasswordEmailVerifyOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
      };
    },
    forgotPasswordEmailVerifyOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
      };
    },
    setLoadingOnForgotPasswordEmailReset(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: true,
      };
    },
    forgotPasswordEmailResetSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
      };
    },
    forgotPasswordEmailResetError(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
      };
    },
  },
});

export const {
  loadAdminAuthPage,
  adminAuthTokenRefresh,
  adminLoaded,
  registerSuccess,
  adminLoginSuccess,
  registerFail,
  adminAuthError,
  logoutAdminAuth,
  adminLoginFail,
  loadingOnAdminLoginSubmit,
  registerError,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  updateSidebarExpended,
  // Admin Forgot Password actions
  setLoadingOnForgotPasswordEmailVerifyAdminId,
  forgotPasswordEmailVerifyAdminIdSuccess,
  forgotPasswordEmailVerifyAdminIdError,
  setLoadingOnForgotPasswordEmailSendOtp,
  forgotPasswordEmailSendOtpSuccess,
  forgotPasswordEmailSendOtpError,
  setLoadingOnForgotPasswordEmailResendOtp,
  forgotPasswordEmailResendOtpSuccess,
  forgotPasswordEmailResendOtpError,
  setLoadingOnForgotPasswordEmailVerifyOtp,
  forgotPasswordEmailVerifyOtpSuccess,
  forgotPasswordEmailVerifyOtpError,
  setLoadingOnForgotPasswordEmailReset,
  forgotPasswordEmailResetSuccess,
  forgotPasswordEmailResetError,
} = adminAuthSlice.actions;

export default adminAuthSlice.reducer;
