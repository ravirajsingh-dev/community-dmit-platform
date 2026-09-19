import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: null,
  loading: true,
  showWelcomeNotificationModal: false,
  loadingRegister: false,
  loadingOnChangePassword: false,
  showChangePassModal: false,
  user: null,
  sponsorUser: {},
  isUserSidebarExpended: false,
  forgotPasswordStep1Loading: false,
  forgotPasswordStep2Loading: false,
  forgotPasswordStep1Success: false,
  forgotPasswordStep2Success: false,
  forgotPasswordEmailVerifyMemberIdLoading: false,
  forgotPasswordEmailSendOtpLoading: false,
  forgotPasswordEmailResendOtpLoading: false,
  forgotPasswordEmailVerifyOtpLoading: false,
  forgotPasswordEmailResetLoading: false,
  forgotPasswordEmailVerifyMemberIdSuccess: false,
  forgotPasswordEmailSendOtpSuccess: false,
  forgotPasswordEmailVerifyOtpSuccess: false,
  forgotPasswordEmailResetSuccess: false,
  error: {},
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loadAuthPage(state) {
      return {
        ...state,
        loading: false,
      };
    },

    authTokenRefresh(state, action) {
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
      };
    },

    userLoaded(state, action) {
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
      };
    },

    sponsorUserLoaded(state, action) {
      return {
        ...state,
        sponsorUser: action.payload,
      };
    },

    registerSuccess(state, action) {
      return {
        ...state,
        user: action.payload,
        loadingRegister: false,
      };
    },

    loginSuccess(state, action) {
      const { user } = action.payload;
      return {
        ...state,
        user,
        isAuthenticated: true,
        loading: false,
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

    authError(state, action) {
      return {
        ...state,
        error: action.payload,
        isAuthenticated: false,
        loading: false,
        user: null,
      };
    },

    logoutAuth(state) {
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
      };
    },

    loginFail(state) {
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        showWelcomeNotificationModal: false,
        user: null,
      };
    },

    loadingOnLoginSubmit(state) {
      return {
        ...state,
        loading: true,
      };
    },
    loadingOnRegisterSubmit(state) {
      return {
        ...state,
        loadingRegister: true,
      };
    },
    registerError(state, action) {
      return {
        ...state,
        error: action.payload,
        loading: false,
        loadingRegister: false,
      };
    },

    setWelcomeNotificationModalShown(state) {
      return {
        ...state,
        showWelcomeNotificationModal: false,
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
    updateUserSidebarExpended(state, action) {
      return {
        ...state,
        isUserSidebarExpended: !state.isUserSidebarExpended,
      };
    },

    setLoadingOnForgotPasswordStep1(state) {
      return {
        ...state,
        forgotPasswordStep1Loading: true,
        forgotPasswordStep1Success: false,
      };
    },

    forgotPasswordStep1Success(state, action) {
      return {
        ...state,
        forgotPasswordStep1Loading: false,
        forgotPasswordStep1Success: true,
      };
    },

    forgotPasswordStep1Error(state) {
      return {
        ...state,
        forgotPasswordStep1Loading: false,
        forgotPasswordStep1Success: false,
      };
    },

    setLoadingOnForgotPasswordStep2(state) {
      return {
        ...state,
        forgotPasswordStep2Loading: true,
        forgotPasswordStep2Success: false,
      };
    },

    forgotPasswordStep2Success(state, action) {
      return {
        ...state,
        forgotPasswordStep2Loading: false,
        forgotPasswordStep2Success: true,
      };
    },

    forgotPasswordStep2Error(state) {
      return {
        ...state,
        forgotPasswordStep2Loading: false,
        forgotPasswordStep2Success: false,
      };
    },

    setLoadingOnForgotPasswordEmailSendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: true,
        forgotPasswordEmailSendOtpSuccess: false,
      };
    },

    forgotPasswordEmailSendOtpSuccess(state, action) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
        forgotPasswordEmailSendOtpSuccess: true,
      };
    },

    forgotPasswordEmailSendOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
        forgotPasswordEmailSendOtpSuccess: false,
      };
    },

    setLoadingOnForgotPasswordEmailVerifyOtp(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: true,
        forgotPasswordEmailVerifyOtpSuccess: false,
      };
    },

    forgotPasswordEmailVerifyOtpSuccess(state, action) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
        forgotPasswordEmailVerifyOtpSuccess: true,
      };
    },

    forgotPasswordEmailVerifyOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
        forgotPasswordEmailVerifyOtpSuccess: false,
      };
    },

    setLoadingOnForgotPasswordEmailReset(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: true,
        forgotPasswordEmailResetSuccess: false,
      };
    },

    forgotPasswordEmailResetSuccess(state, action) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
        forgotPasswordEmailResetSuccess: true,
      };
    },

    forgotPasswordEmailResetError(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
        forgotPasswordEmailResetSuccess: false,
      };
    },

    setLoadingOnForgotPasswordEmailVerifyMemberId(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: true,
        forgotPasswordEmailVerifyMemberIdSuccess: false,
      };
    },

    forgotPasswordEmailVerifyMemberIdSuccess(state, action) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: false,
        forgotPasswordEmailVerifyMemberIdSuccess: true,
      };
    },

    forgotPasswordEmailVerifyMemberIdError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: false,
        forgotPasswordEmailVerifyMemberIdSuccess: false,
      };
    },

    setLoadingOnForgotPasswordEmailResendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: true,
      };
    },

    forgotPasswordEmailResendOtpSuccess(state, action) {
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
  },
});

export const {
  loadAuthPage,
  authTokenRefresh,
  userLoaded,
  sponsorUserLoaded,
  registerSuccess,
  loginSuccess,
  loadingOnRegisterSubmit,
  registerFail,
  authError,
  logoutAuth,
  loginFail,
  loadingOnLoginSubmit,
  registerError,
  setWelcomeNotificationModalShown,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  updateUserSidebarExpended,
  setLoadingOnForgotPasswordStep1,
  forgotPasswordStep1Success,
  forgotPasswordStep1Error,
  setLoadingOnForgotPasswordStep2,
  forgotPasswordStep2Success,
  forgotPasswordStep2Error,
  setLoadingOnForgotPasswordEmailSendOtp,
  forgotPasswordEmailSendOtpSuccess,
  forgotPasswordEmailSendOtpError,
  setLoadingOnForgotPasswordEmailVerifyOtp,
  forgotPasswordEmailVerifyOtpSuccess,
  forgotPasswordEmailVerifyOtpError,
  setLoadingOnForgotPasswordEmailReset,
  forgotPasswordEmailResetSuccess,
  forgotPasswordEmailResetError,
  setLoadingOnForgotPasswordEmailVerifyMemberId,
  forgotPasswordEmailVerifyMemberIdSuccess,
  forgotPasswordEmailVerifyMemberIdError,
  setLoadingOnForgotPasswordEmailResendOtp,
  forgotPasswordEmailResendOtpSuccess,
  forgotPasswordEmailResendOtpError,
} = authSlice.actions;

export default authSlice.reducer;
