import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  walletSettingsFetched,
  walletSettingsError,
  loadingWalletSettings,
  loadingOnWalletSettingsSubmit,
  resetWalletSettings,
  walletSettingsUpdated,
} from "@reducers/adminWalletSettingsReducer";

const VERSION_CONFLICT_MSG =
  "Configuration updated by another admin. Please refresh.";

const handleResponseError = (err, dispatch, defaultMsg, getWalletSettings) => {
  if (err.response?.status === 409) {
    dispatch(setAlert(VERSION_CONFLICT_MSG, "danger"));
    dispatch(getWalletSettings());
    dispatch(walletSettingsError({ msg: VERSION_CONFLICT_MSG, status: 409 }));
    return;
  }
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(adminLogout());
  } else {
    const errors = err.response?.data?.errors;
    if (errors?.length) {
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg || error.message, error.path));
      });
    }
    dispatch(setAlert(err.response?.data?.message || defaultMsg, "danger"));
  }
  dispatch(
    walletSettingsError({
      msg: err.response?.statusText || defaultMsg,
      status: err.response?.status || 500,
    }),
  );
};

/**
 * Get wallet settings
 * Auto-creates default settings if not found
 */
export const getWalletSettings = () => async (dispatch) => {
  try {
    dispatch(loadingWalletSettings());

    const res = await api.get(`/api/admin/wallet-settings`);

    if (res.data.status === true) {
      dispatch(walletSettingsFetched(res.data.response));
    } else {
      dispatch(
        walletSettingsError({
          msg: res.data.message || "Failed to fetch wallet settings",
          status: res.status || 500,
        }),
      );
      dispatch(
        setAlert(
          res.data.message || "Failed to fetch wallet settings",
          "danger",
        ),
      );
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          walletSettingsError({
            msg: err.response.statusText || "Error fetching wallet settings",
            status: err.response?.status || 500,
          }),
        );

      dispatch(
        setAlert(
          err.response?.data?.message || "Failed to fetch wallet settings",
          "danger",
        ),
      );
    }
  }
};

/**
 * Update registration fee
 * data must include: registrationFee, configVersion, txn_password
 */
export const updateRegistrationFee = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(
      `/api/admin/wallet-settings/registration-fee`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        allowDuplicates: true,
      },
    );

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Registration fee updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update registration fee.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update registration fee",
      getWalletSettings,
    );
  }
};

/**
 * Update governance settings (maxAdminAdjustAmount, mainMinWithdrawal, mainMaxWithdrawal, maxUserTransactionsPerDay)
 * data must include: configVersion, txn_password
 */
export const updateGovernanceSettings = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(`/api/admin/wallet-settings/governance`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(
        setAlert("Governance settings updated successfully.", "success"),
      );
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update governance settings.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update governance settings",
      getWalletSettings,
    );
  }
};

/**
 * Update admin surcharge percent in wallet settings
 * data must include: adminSurchargePercent (0–99 int), configVersion, txn_password
 */
export const updateAdminSurcharge = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(
      `/api/admin/wallet-settings/admin-surcharge`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        allowDuplicates: true,
      },
    );

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Admin surcharge updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update admin surcharge.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update admin surcharge",
      getWalletSettings,
    );
  }
};

/**
 * Enable/disable registration fee editing
 * data must include: isRegistrationFeeEditable, configVersion, txn_password
 */
export const updateRegistrationFeeEditable = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(
      `/api/admin/wallet-settings/registration-fee-editable`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        allowDuplicates: true,
      },
    );

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(
        setAlert(
          res.data.message || "Registration fee edit status updated.",
          "success",
        ),
      );
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(err, dispatch, "Failed to update", getWalletSettings);
  }
};

/**
 * Add level
 * data must include: commissionPercent, configVersion, txn_password
 */
export const addLevel = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.post(`/api/admin/wallet-settings/levels`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Level added successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to add level.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to add level",
      getWalletSettings,
    );
  }
};

/**
 * Update level
 * data must include: commissionPercent, configVersion, txn_password
 */
export const updateLevel = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(`/api/admin/wallet-settings/levels/${id}`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Level updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update level.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update level",
      getWalletSettings,
    );
  }
};

/**
 * Delete level
 * data must include: configVersion, txn_password
 */
export const deleteLevel = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.delete(`/api/admin/wallet-settings/levels/${id}`, {
      headers: { "Content-Type": "application/json" },
      data,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Level deleted successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      dispatch(
        setAlert(res.data.message || "Failed to delete level", "danger"),
      );
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to delete level",
      getWalletSettings,
    );
  }
};

/**
 * Add club
 * data must include: name, commissionPercent, configVersion, txn_password (+ optional fields)
 */
export const addClub = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.post(`/api/admin/wallet-settings/clubs`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Club added successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to add club.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(err, dispatch, "Failed to add club", getWalletSettings);
  }
};

/**
 * Update club
 * data must include: configVersion, txn_password (+ fields to update)
 */
export const updateClub = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(`/api/admin/wallet-settings/clubs/${id}`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Club updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update club.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update club",
      getWalletSettings,
    );
  }
};

/**
 * Delete club
 * data must include: configVersion, txn_password
 */
export const deleteClub = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.delete(`/api/admin/wallet-settings/clubs/${id}`, {
      headers: { "Content-Type": "application/json" },
      data,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Club deleted successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      dispatch(setAlert(res.data.message || "Failed to delete club", "danger"));
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to delete club",
      getWalletSettings,
    );
  }
};

/**
 * Add rank
 * data must include: name, commissionPercent, configVersion, txn_password (+ optional requiredRank)
 */
export const addRank = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.post(`/api/admin/wallet-settings/ranks`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Rank added successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to add rank.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(err, dispatch, "Failed to add rank", getWalletSettings);
  }
};

/**
 * Update rank
 * data must include: configVersion, txn_password (+ fields to update)
 */
export const updateRank = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(`/api/admin/wallet-settings/ranks/${id}`, data, {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Rank updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update rank.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update rank",
      getWalletSettings,
    );
  }
};

/**
 * Delete rank
 * data must include: configVersion, txn_password
 */
export const deleteRank = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.delete(`/api/admin/wallet-settings/ranks/${id}`, {
      headers: { "Content-Type": "application/json" },
      data,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Rank deleted successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      dispatch(setAlert(res.data.message || "Failed to delete rank", "danger"));
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to delete rank",
      getWalletSettings,
    );
  }
};

/**
 * Add designation
 * data must include: name, commissionPercent, configVersion, txn_password (+ optional fields)
 */
export const addDesignation = (data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.post(
      `/api/admin/wallet-settings/designations`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        allowDuplicates: true,
      },
    );
    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Designation added successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to add designation.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to add designation",
      getWalletSettings,
    );
  }
};

/**
 * Update designation
 */
export const updateDesignation = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.put(
      `/api/admin/wallet-settings/designations/${id}`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        allowDuplicates: true,
      },
    );
    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Designation updated successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      const errors = res.data.errors;
      if (errors?.length) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg || error.message, error.path));
        });
      } else {
        dispatch(setAlert("Failed to update designation.", "danger"));
      }
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to update designation",
      getWalletSettings,
    );
  }
};

/**
 * Delete designation
 */
export const deleteDesignation = (id, data) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnWalletSettingsSubmit());
  dispatch(removeAlert());
  try {
    const res = await api.delete(
      `/api/admin/wallet-settings/designations/${id}`,
      {
        headers: { "Content-Type": "application/json" },
        data,
        allowDuplicates: true,
      },
    );
    if (res.data.status === true) {
      dispatch(walletSettingsUpdated(res.data.response));
      dispatch(setAlert("Designation deleted successfully.", "success"));
    } else {
      dispatch(walletSettingsError({}));
      dispatch(
        setAlert(res.data.message || "Failed to delete designation", "danger"),
      );
    }
  } catch (err) {
    handleResponseError(
      err,
      dispatch,
      "Failed to delete designation",
      getWalletSettings,
    );
  }
};

/**
 * Reset store
 */
export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetWalletSettings());
};
