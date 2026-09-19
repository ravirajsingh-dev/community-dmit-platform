// axios with token
import api from "@src/utils/axiosSetup";

// Custom imports
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { normalizeErrors } from "@src/utils/helper";
import {
  saveAdminCredentials,
  removeAdminCredentials,
} from "@src/utils/credentialsHelper";
import { updateSidebarExpended } from "@src/reducers/adminAuth";
import { getFirstAllowedRoute } from "@src/utils/permissions";

// Reducers
import { removeErrors } from "@reducers/errors";

import {
  adminLoaded,
  registerSuccess,
  adminLoginSuccess,
  registerFail,
  adminAuthError,
  logoutAdminAuth,
  adminLoginFail,
  loadingOnAdminLoginSubmit,
  registerError,
  adminAuthTokenRefresh,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  loadAdminAuthPage,
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
} from "@reducers/adminAuth";

export const adminLogin = (formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnAdminLoginSubmit());
  dispatch(removeAlert());
  try {
    // Admin authentication must use admin_id only - map formData to admin_id
    const submitData = {
      admin_id: formData.admin_id,
      password: formData.password,
    };

    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.post(`/api/auth/admin`, submitData, config);

    if (res.data.status === true) {
      const { user } = res.data.response;
      // Tokens are now handled via httpOnly cookies from backend
      dispatch(adminLoginSuccess({ user }));
      dispatch(loadAdminAuthPage());

      // Redirect to first allowed route (not hardcoded dashboard)
      const firstRoute = getFirstAllowedRoute(user);
      if (firstRoute) {
        navigate(firstRoute);
      } else {
        // No permissions assigned - redirect to no-access page
        navigate("/admin/no-access");
      }
      dispatch(setAlert("Login successfully", "success"));

      //Remember me - Save admin credentials to localStorage (matching client pattern)
      if (formData.rememberPassword && submitData.admin_id) {
        saveAdminCredentials(submitData.admin_id, submitData.password);
      } else {
        removeAdminCredentials();
      }
    } else {
      const errors = normalizeErrors(res.data.errors);
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        adminLoginFail({
          msg: res.response?.data?.message || res.response?.statusText || "Login failed",
          status: res.response?.status || 400,
        })
      );
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else if (err.response?.data?.message) {
      dispatch(setAlert(err.response.data.message, "danger"));
    }

    if (err.response) {
      dispatch(
        adminLoginFail({
          msg: err.response.data?.message || err.response.statusText || "Login failed",
          status: err.response.status || 400,
        })
      );
      if (!errors || errors.length === 0) {
        dispatch(
          setAlert(err.response.data?.message || err.response.statusText || "Login failed", "danger")
        );
      }
      return err.response.data;
    }
  }
};

export const adminRegister = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());
    const config = {
      "Content-Type": "application/json",
    };

    const res = await api.post(`/api/auth/admins/register`, formData, config);

    if (res.data.status === true) {
      dispatch(registerSuccess(res.data.response));

      // Tokens are now handled via httpOnly cookies from backend
      dispatch(adminLogin(formData, navigate));
      dispatch(setAlert("Register successfully", "success"));
    } else {
      const errors = normalizeErrors(res.data.errors);

      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "Registration failed", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    
    if (err.response) {
      dispatch(
        registerFail({
          msg: err.response.data?.message || err.response.statusText || "Registration failed",
          status: err.response.status || 400,
        })
      );
      if (!errors || errors.length === 0) {
        dispatch(
          setAlert(err.response.data?.message || err.response.statusText || "Registration failed", "danger")
        );
      }
      return err.response.data;
    }
  }
};

export const loadAdmin = (navigate) => async (dispatch) => {
  try {
    const res = await api.get(`/api/auth/admin/load-admin`);

    if (res.data.status === true) {
      dispatch(adminLoaded(res.data.response));
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
      }
    }
  } catch (err) {
    const error = err?.response?.data;
    if (error) {
      dispatch(setAlert(error.msg, "danger"));
    }
  }
};

export const logoutAuthActions = () => async (dispatch) => {
  // Tokens are handled via cookies - backend will clear them on logout
  dispatch(logoutAdminAuth());
};

export const refreshAccessToken = (navigate) => async (dispatch) => {
  try {
    // Cookies will be sent automatically via withCredentials
    const res = await api.post(`/api/auth/admin/refresh-token`, {});

    if (res.data.status) {
      const { admin } = res.data.response;
      // Tokens are handled via cookies - just update admin state
      dispatch(adminAuthTokenRefresh({ admin }));
      dispatch(loadAdmin(navigate));
    }
  } catch (error) {
    dispatch(logoutAuthActions());
    const errors = error?.response?.data;
    if (errors) {
      dispatch(setAlert(error.msg, "danger"));
    }
  }
};

export const updateAuthTokens = (admin) => (dispatch) => {
  // Tokens are handled via cookies - just update admin state
  dispatch(adminAuthTokenRefresh({ admin }));
};

export const initializeAdminAuth = () => async (dispatch) => {
  try {
    // Make GET request to load admin - cookies will be sent automatically via withCredentials
    const res = await api.get(`/api/auth/admin/load-admin`, {
      withCredentials: true,
    });

    if (res.data.status === true && res.data.response) {
      // Response contains user/admin - extract user/admin from response
      const user = res.data.response.user || res.data.response;
      // Dispatch adminLoginSuccess with user
      dispatch(adminLoginSuccess({ user }));
    } else {
      // If no user in response, logout
      dispatch(logoutAdminAuth());
    }
  } catch (error) {
    // If request fails (401 or error), logout
    dispatch(logoutAdminAuth());
  }
};

//Logout from current device
export const adminLogout = () => async (dispatch) => {
  const config = { headers: { "Content-Type": "application/json" } };
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());

    // Cookies will be sent automatically via withCredentials
    const res = await api.put(
      `/api/auth/admin/logout`,
      {},
      config
    );

    if (res.data.status === true) {
      dispatch(logoutAuthActions());
    } else {
      const errors = normalizeErrors(res.data.errors);
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    if (err.response) {
      if (err.response.data && err.response.data.tokenStatus === 0) {
        dispatch(setAlert(err.response.data.msg, "danger"));
        dispatch(logoutAuthActions());
        dispatch(removeErrors());
      } else {
        dispatch(
          adminAuthError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
        dispatch(
          setAlert(
            err.response.data.message || err.response.statusText,
            "danger"
          )
        );
      }
    }
  }
};

// Change password
export const changePassword = (formData) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      "Content-Type": "application/json",
    };

    const res = await api.post(
      `/api/auth/admin/change-password`,
      formData,
      config
    );

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message || "Password changed successfully. Please log in again.", "success"));
      // All sessions are invalidated on backend (global logout)
      // Clear local state and redirect to login
      setTimeout(() => {
        dispatch(logoutAuthActions());
        window.location.href = "/admin/login";
      }, 2000);
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
    }
    dispatch(changePasswordError());
  }
};

// Change password and transaction password (combined)
export const changePasswordAndTxnPassword = (formData) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      "Content-Type": "application/json",
    };

    const res = await api.post(
      `/api/auth/admin/change-password-and-txn-password`,
      formData,
      config
    );

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message || "Passwords changed successfully. Please log in again.", "success"));
      // All sessions are invalidated on backend (global logout)
      // Clear local state and redirect to login
      setTimeout(() => {
        dispatch(logoutAuthActions());
        window.location.href = "/admin/login";
      }, 2000);
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
    }
    dispatch(changePasswordError());
  }
};

export const setTxnPassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      "Content-Type": "application/json",
    };
    const res = await api.post(
      `/api/auth/admin/set-txn-password`,
      formData,
      config
    );

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message, "success"));
      navigate("/admin/credentials/create");
    } else {
      dispatch(changePasswordError());
      const errors = normalizeErrors(res.data.errors);
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

export const changeTxnPassword = (formData) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      "Content-Type": "application/json",
    };

    const res = await api.post(
      `/api/auth/admin/change-txn-password`,
      formData,
      config
    );

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message || "Transaction password changed successfully. Please log in again.", "success"));
      // All sessions are invalidated on backend (global logout)
      // Clear local state and redirect to login
      setTimeout(() => {
        dispatch(logoutAuthActions());
        window.location.href = "/admin/login";
      }, 2000);
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else {
      dispatch(setAlert(err.response?.data?.message || "An error occurred", "danger"));
    }
    dispatch(changePasswordError());
  }
};

// sidebar update
export const updateSidebarExpendedAction = () => async (dispatch) => {
  dispatch(await updateSidebarExpended());
};

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const setErrors = (errors) => async (dispatch) => {
  if (errors) {
    dispatch(registerError());
    dispatch(setAlert("Please correct the following errors", "danger"));

    const normalizedErrors = normalizeErrors(errors);
    normalizedErrors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

export const removeAdminLoginErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

// Admin Forgot Password Actions
export const verifyForgotPasswordEmailAdminId = (adminId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailVerifyAdminId());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/admin/forgot-password/verify-admin-id`,
      { adminId },
      config
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailVerifyAdminIdSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailVerifyAdminIdError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage = errors[0].msg || res.data.message || "Invalid Admin ID";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(errors && errors.length > 0 ? errors[0].msg : res.data.message || "Invalid Admin ID");
    }
  } catch (err) {
    dispatch(forgotPasswordEmailVerifyAdminIdError());
    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors && errors.length > 0) {
      const userMessage = errors[0].msg || err.response?.data?.message || "Invalid Admin ID";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage = err.response?.data?.message || err.message || "Invalid Admin ID";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const sendForgotPasswordEmailOtp = (adminId, email) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailSendOtp());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/admin/forgot-password/send-otp`,
      { adminId, email },
      config
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailSendOtpSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailSendOtpError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage = errors[0].msg || res.data.message || "Failed to send OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(errors && errors.length > 0 ? errors[0].msg : res.data.message || "Failed to send OTP");
    }
  } catch (err) {
    dispatch(forgotPasswordEmailSendOtpError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage = errors[0].msg || err.response?.data?.message || "Failed to send OTP";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage = err.response?.data?.message || err.message || "Failed to send OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const resendForgotPasswordEmailOtp = (adminId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailResendOtp());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/admin/forgot-password/resend-otp`,
      { adminId },
      config
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailResendOtpSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailResendOtpError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage = errors[0].msg || res.data.message || "Failed to resend OTP. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(errors && errors.length > 0 ? errors[0].msg : res.data.message || "Failed to resend OTP. Please try again.");
    }
  } catch (err) {
    dispatch(forgotPasswordEmailResendOtpError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage = errors[0].msg || err.response?.data?.message || "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage = err.response?.data?.message || err.message || "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const verifyForgotPasswordEmailOtp = (adminId, otp) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailVerifyOtp());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/admin/forgot-password/verify-otp`,
      { adminId, otp },
      config
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailVerifyOtpSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailVerifyOtpError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage = errors[0].msg || res.data.message || "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(errors && errors.length > 0 ? errors[0].msg : res.data.message || "Invalid or expired OTP");
    }
  } catch (err) {
    dispatch(forgotPasswordEmailVerifyOtpError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage = errors[0].msg || err.response?.data?.message || "Invalid or expired OTP";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage = err.response?.data?.message || err.message || "Invalid or expired OTP";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const resetPasswordWithEmailOtp = (adminId, otp, password, confirmPassword) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailReset());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/admin/forgot-password/reset`,
      { adminId, otp, password, confirmPassword },
      config
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailResetSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailResetError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage = errors[0].msg || res.data.message || "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(errors && errors.length > 0 ? errors[0].msg : res.data.message || "Password reset failed. Please try again.");
    }
  } catch (err) {
    dispatch(forgotPasswordEmailResetError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage = errors[0].msg || err.response?.data?.message || "Password reset failed. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage = err.response?.data?.message || err.message || "Password reset failed. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};
