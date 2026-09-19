import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  donationButtonsUpdated,
  loadingDonationButtons,
  donationRequestsUpdated,
  loadingDonationRequests,
  donationRequestUpdated,
  loadingOnDonationButtonSubmit,
  donationButtonSubmitSuccess,
  loadingOnDonationRequestAction,
  donationRequestActionSuccess,
} from "@reducers/adminDonationReducer";

/**
 * Get all donation buttons
 */
export const getDonationButtons =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingDonationButtons());
      const config = { headers: { "Content-Type": "application/json" } };

      const res = await api.get(`/api/admin/donation/buttons`, config);

      if (res.data && res.data.status === true) {
        dispatch(donationButtonsUpdated(res.data.response));
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching donation buttons",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

/**
 * Create donation button
 */
export const createDonationButton = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnDonationButtonSubmit());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.post(`/api/admin/donation/buttons`, formData, config);

    if (res.data && res.data.status === true) {
      dispatch(donationButtonSubmitSuccess());
      dispatch(setAlert("Donation button created successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(donationButtonSubmitSuccess());
      if (res.data.errors) {
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(res.data.message || "Error creating donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    dispatch(donationButtonSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response?.data?.message || "Error creating donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Update donation button
 */
export const updateDonationButton = (id, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnDonationButtonSubmit());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    // Extract txn_password from formData if present
    const { txn_password, ...buttonData } = formData;
    const requestData = { ...buttonData };
    if (txn_password) {
      requestData.txn_password = txn_password;
    }
    const res = await api.put(
      `/api/admin/donation/buttons/${id}`,
      requestData,
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(donationButtonSubmitSuccess());
      dispatch(setAlert("Donation button updated successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(donationButtonSubmitSuccess());
      if (res.data.errors) {
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(res.data.message || "Error updating donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    dispatch(donationButtonSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Delete donation button
 */
export const deleteDonationButton = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      data: {
        txn_password: txn_password,
      },
    };
    const res = await api.delete(`/api/admin/donation/buttons/${id}`, config);

    if (res.data && res.data.status === true) {
      dispatch(setAlert("Donation button deleted successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(
        setAlert(res.data.message || "Error deleting donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error deleting donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Get all donation requests with filters
 */
export const getDonationRequests =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingDonationRequests());
      const config = {
        headers: { "Content-Type": "application/json" },
        params: params,
      };

      const res = await api.get(`/api/admin/donation/requests`, config);

      if (res.data && res.data.status === true) {
        dispatch(donationRequestsUpdated(res.data.response));
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching donation requests",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

/**
 * Get single donation request
 */
export const getDonationRequest = (id) => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/admin/donation/requests/${id}`, config);

    if (res.data && res.data.status === true) {
      dispatch(donationRequestUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error fetching donation request",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Approve bank transfer donation request (legacy DonationRequest)
 */
export const approveDonationRequest =
  (id, txn_password) => async (dispatch) => {
    dispatch(loadingOnDonationRequestAction());
    try {
      const config = { headers: { "Content-Type": "application/json" } };
      const res = await api.put(
        `/api/admin/donation/requests/${id}/approve`,
        { txn_password },
        config
      );

      dispatch(donationRequestActionSuccess());

      if (res.data && res.data.status === true) {
        dispatch(setAlert("Donation request approved successfully", "success"));
        return res.data;
      } else {
        dispatch(
          setAlert(
            res.data?.message || "Error approving donation request",
            "danger"
          )
        );
        return { status: false };
      }
    } catch (err) {
      dispatch(donationRequestActionSuccess());
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        if (err.response?.data?.errors) {
          err.response.data.errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        dispatch(
          setAlert(
            err.response?.data?.message || "Error approving donation request",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

/**
 * Reject bank transfer donation request with reason (legacy DonationRequest)
 */
export const rejectDonationRequest =
  (id, txn_password, reason) => async (dispatch) => {
    dispatch(loadingOnDonationRequestAction());
    try {
      const config = { headers: { "Content-Type": "application/json" } };
      const res = await api.put(
        `/api/admin/donation/requests/${id}/reject`,
        { txn_password, reason },
        config
      );

      dispatch(donationRequestActionSuccess());

      if (res.data && res.data.status === true) {
        dispatch(setAlert("Donation request rejected successfully", "success"));
        return res.data;
      } else {
        dispatch(
          setAlert(
            res.data?.message || "Error rejecting donation request",
            "danger"
          )
        );
        return { status: false };
      }
    } catch (err) {
      dispatch(donationRequestActionSuccess());
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        if (err.response?.data?.errors) {
          err.response.data.errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        dispatch(
          setAlert(
            err.response?.data?.message || "Error rejecting donation request",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

