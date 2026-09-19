// axios with token
import api from "@src/utils/axiosSetup";
import { sanitizeGenericError } from "@src/utils/sanitizeError";

// Custom imports
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import {
  saveUserCredentials,
  removeUserCredentials,
} from "@src/utils/credentialsHelper";

// Reducers
import { removeErrors } from "@reducers/errors";
import {
  userLoaded,
  registerSuccess,
  loginSuccess,
  registerFail,
  authError,
  logoutAuth,
  loginFail,
  loadingOnLoginSubmit,
  registerError,
  authTokenRefresh,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  updateUserSidebarExpended,
  sponsorUserLoaded,
  setLoadingOnForgotPasswordStep1,
  forgotPasswordStep1Success,
  forgotPasswordStep1Error,
  setLoadingOnForgotPasswordStep2,
  forgotPasswordStep2Success,
  forgotPasswordStep2Error,
  setLoadingOnForgotPasswordEmailVerifyMemberId,
  forgotPasswordEmailVerifyMemberIdSuccess,
  forgotPasswordEmailVerifyMemberIdError,
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
  loadingOnRegisterSubmit,
} from "@reducers/auth";

export const login = (formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnLoginSubmit());
  dispatch(removeAlert());
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(`/api/auth`, formData, config);

    if (res.data.status === true) {
      const { user } = res.data.response;
      dispatch(loginSuccess({ user }));

      navigate("/user/dashboard");

      dispatch(setAlert("Login successfully", "success"));

      //Remember me - Save credentials to localStorage
      if (formData.rememberPassword) {
        saveUserCredentials(formData.memberId, formData.password);
      } else {
        removeUserCredentials();
      }
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        loginFail({
          msg: res.response.data.message || res.response.statusText,
          status: res.response.status,
        }),
      );
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }

    if (err.response) {
      dispatch(
        loginFail({
          msg: err.response.data.message || err.response.statusText,
          status: err.response.status,
        }),
      );
      dispatch(
        setAlert(
          err.response.data.message || err.response.statusText,
          "danger",
        ),
      );
      return err.response.data;
    }
  }
};

export const register = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());
    dispatch(loadingOnRegisterSubmit());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(`/api/auth/users/register`, formData, config);

    if (res.data.status === true) {
      dispatch(registerSuccess(res.data.response?.user));
      dispatch(setAlert("Registration successful", "success"));
      return res.data;
    } else {
      dispatch(registerFail({ msg: res.data.message }));
      dispatch(setAlert(res.data.message || "Something went wrong", "danger"));
      res.data.errors?.forEach((error) =>
        dispatch(setErrorsList(error.msg, error.path)),
      );
      return res.data ? res?.data?.response?.user : { status: false };
    }
  } catch (errors) {
    if (errors.response) {
      const data = errors.response.data;
      let errorMessage = data.message || errors.response.statusText;

      // Use actual error message from API for user feedback
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstMsg = data.errors[0].msg;
        errorMessage = firstMsg || errorMessage;
      }

      dispatch(
        registerFail({
          msg: errorMessage,
          status: errors.response.status,
        }),
      );
      dispatch(setAlert(errorMessage, "danger"));
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path ?? ""));
        });
      }
      return data;
    }
  }
};


export const loadUser = (navigate) => async (dispatch) => {
  try {
    const res = await api.get(`/api/auth/load-user`);

    if (res.data.status === true) {
      dispatch(userLoaded(res.data.response));
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
      }
    }
  } catch (err) {
    const error = err?.response?.data;
    // Always ensure auth state is resolved so UI doesn't stay stuck on loading.
    // If backend explicitly marks token/session as expired, or any other error occurs,
    // treat user as logged out and let routing send them to /login.
    if (error && error.msg) {
      dispatch(setAlert(error.msg, "danger"));
    }
    dispatch(logoutAuth());
  }
};

export const logoutAuthActions = () => async (dispatch) => {
  dispatch(logoutAuth());
};

export const refreshAccessToken = (navigate) => async (dispatch) => {
  dispatch(loadUser(navigate));
};

export const updateAuthTokens =
  (accessToken, refreshToken, sessionID) => (dispatch) => {
    // Tokens are now in cookies, just update auth state
    dispatch(authTokenRefresh({}));
  };

export const initializeAuth = (navigate) => async (dispatch) => {
  dispatch(loadUser(navigate));
};

//Logout from current device
export const logout = () => async (dispatch) => {
  const config = { headers: { "Content-Type": "application/json" } };
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());

    // Cookies will be sent automatically via withCredentials
    const res = await api.put(`/api/auth/logout`, {}, config);

    if (res.data.status === true) {
      dispatch(logoutAuthActions());
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      // Always logout even if API returns error status
      dispatch(logoutAuthActions());
    }
  } catch (err) {
    if (err.response) {
      if (err.response.data && err.response.data.tokenStatus === 0) {
        dispatch(setAlert(err.response.data.msg, "danger"));
        dispatch(logoutAuthActions());
        dispatch(removeErrors());
      } else {
        dispatch(
          authError({
            msg: err.response.statusText,
            status: err.response.status,
          }),
        );
        dispatch(
          setAlert(
            err.response.data.message || err.response.statusText,
            "danger",
          ),
        );
        // Ensure logout state is set even on error
        dispatch(logoutAuthActions());
      }
    } else {
      // Network error or no response - still logout locally
      dispatch(logoutAuthActions());
    }
  }
};

//Logout from all devices
export const logoutAll = () => async (dispatch) => {
  const config = { headers: { "Content-Type": "application/json" } };
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());

    const res = await api.put(`/api/auth/logout-all`, {}, config);

    if (res.data.status === true) {
      dispatch(logoutAuthActions());
      dispatch(
        setAlert("Logged out from all devices successfully.", "success"),
      );
    } else {
      const errors = res.data.errors;
      if (errors) {
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
          authError({
            msg: err.response.statusText,
            status: err.response.status,
          }),
        );
        dispatch(
          setAlert(
            err.response.data.message || err.response.statusText,
            "danger",
          ),
        );
      }
    }
  }
};

// Change password
export const changePassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(`/api/auth/change-password`, formData, config);

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors.length > 0) {
        dispatch(setAlert(err.response.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

// Forgot Password Step 1: Verify Phone
export const forgotPasswordStep1 = (phone) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordStep1());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(
      `/api/auth/forgot-password/verify`,
      { phone },
      config,
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordStep1Success(res.data.response));
      return res.data.response; // Return data for component usage
    } else {
      dispatch(forgotPasswordStep1Error());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(res.data.message || "Verification failed");
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      dispatch(
        setAlert(
          err.response?.data?.message || "Verification failed",
          "danger",
        ),
      );
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else {
      dispatch(
        setAlert(
          sanitizeGenericError(err.response?.data?.message || err.message),
          "danger",
        ),
      );
    }
    dispatch(forgotPasswordStep1Error());
    throw err; // Re-throw for component handling
  }
};

// Forgot Password Step 2: Reset Password
export const forgotPasswordStep2 = (phone) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordStep2());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(
      `/api/auth/forgot-password/reset`,
      { phone },
      config,
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordStep2Success(res.data));
      return res.data; // Return data for component usage
    } else {
      dispatch(forgotPasswordStep2Error());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(res.data.message || "Password reset failed");
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      dispatch(
        setAlert(
          err.response?.data?.message || "Password reset failed",
          "danger",
        ),
      );
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    } else {
      dispatch(
        setAlert(
          sanitizeGenericError(err.response?.data?.message || err.message),
          "danger",
        ),
      );
    }
    dispatch(forgotPasswordStep2Error());
    throw err; // Re-throw for component handling
  }
};

export const setTxnPassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.post(`/api/auth/set-txn-password`, formData, config);

    if (res.data.status === true) {
      dispatch(loadUser());
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message, "success"));
      navigate("/user/dashboard");
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors.length > 0) {
        dispatch(setAlert(err.response.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

export const changeTxnPassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(
      `/api/auth/change-txn-password`,
      formData,
      config,
    );

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message, "success"));
      navigate("/user/dashboard");
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors.length > 0) {
        dispatch(setAlert(err.response.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

export const verifyForgotPasswordEmailMemberId =
  (memberId) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailVerifyMemberId());
      dispatch(removeAlert());

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        allowDuplicates: true,
      };

      const res = await api.post(
        `/api/auth/forgot-password-email/verify-member-id`,
        { memberId },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyMemberIdSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailVerifyMemberIdError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Invalid Member ID";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Invalid Member ID",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyMemberIdError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg || err.response?.data?.message || "Invalid Member ID";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message || err.message || "Invalid Member ID";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const sendForgotPasswordEmailOtp =
  (memberId, email) => async (dispatch) => {
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
        `/api/auth/forgot-password-email/send-otp`,
        { memberId, email },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailSendOtpSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailSendOtpError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Failed to send OTP";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Failed to send OTP",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailSendOtpError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg || err.response?.data?.message || "Failed to send OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to send OTP. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const resendForgotPasswordEmailOtp = (memberId) => async (dispatch) => {
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
      `/api/auth/forgot-password-email/resend-otp`,
      { memberId },
      config,
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailResendOtpSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailResendOtpError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          res.data.message ||
          "Failed to resend OTP. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(
        errors && errors.length > 0
          ? errors[0].msg
          : res.data.message || "Failed to resend OTP. Please try again.",
      );
    }
  } catch (err) {
    dispatch(forgotPasswordEmailResendOtpError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage =
        errors[0].msg ||
        err.response?.data?.message ||
        "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const verifyForgotPasswordEmailOtp =
  (memberId, otp) => async (dispatch) => {
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
        `/api/auth/forgot-password-email/verify-otp`,
        { memberId, otp },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyOtpSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailVerifyOtpError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Invalid or expired OTP";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Invalid or expired OTP",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyOtpError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const resetPasswordWithEmailOtp =
  (memberId, otp, password, confirmPassword) => async (dispatch) => {
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
        `/api/auth/forgot-password-email/reset`,
        { memberId, otp, password, confirmPassword },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailResetSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailResetError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg ||
            res.data.message ||
            "Password reset failed. Please try again.";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Password reset failed. Please try again.",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailResetError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const setErrors = (errors) => async (dispatch) => {
  if (errors) {
    dispatch(registerError());
    dispatch(setAlert("Please correct the following errors", "danger"));

    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

export const removeRegistrationErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
