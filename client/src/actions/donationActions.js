import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import {
  donationButtonsUpdated,
  loadingDonationButtons,
  donationSettingsUpdated,
  loadingDonationSettings,
  loadingQRCode,
  qrCodeUpdated,
  clearQRCode,
  loadingSubmitDonation,
  submitDonationSuccess,
  topDonationsUpdated,
  loadingTopDonations,
} from "@src/reducers/donationReducer";

/**
 * Get active donation buttons
 */
export const getActiveDonationButtons = () => async (dispatch) => {
  try {
    dispatch(loadingDonationButtons());
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/donation/buttons`, config);

    if (res.data && res.data.status === true) {
      dispatch(donationButtonsUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    console.error("Error fetching donation buttons:", err);
    dispatch(donationButtonsUpdated([]));
    return { status: false };
  }
};

/**
 * Get donation settings
 */
export const getDonationSettings = () => async (dispatch) => {
  try {
    dispatch(loadingDonationSettings());
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/donation/settings`, config);

    if (res.data && res.data.status === true) {
      dispatch(donationSettingsUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    console.error("Error fetching donation settings:", err);
    dispatch(
      donationSettingsUpdated({
        donationEnabled: false,
        donationMessage: "",
        upi: { upiId: "", upiHolderName: "" },
        bank: {
          bankName: "",
          accountNo: "",
          accountHolderName: "",
          ifscCode: "",
        },
      })
    );
    return { status: false };
  }
};

/**
 * Get top donations (ONLY SUCCESS donations from PaymentHistory)
 */
export const getTopDonations = (limit = 20) => async (dispatch) => {
  try {
    dispatch(loadingTopDonations());
    const config = {
      headers: { "Content-Type": "application/json" },
      params: { limit },
    };

    const res = await api.get(`/api/common/donation/top`, config);

    if (res.data && res.data.status === true) {
      // Backend should already return ONLY approved/success donations.
      // Support both shapes:
      // 1) { response: { donations: [...] } }
      // 2) { response: [...] }
      const rawResponse = res.data.response;
      const successDonations = Array.isArray(rawResponse?.donations)
        ? rawResponse.donations
        : Array.isArray(rawResponse)
        ? rawResponse
        : [];

      dispatch(topDonationsUpdated(successDonations));
      return res.data;
    }
    // No success donations found in PaymentHistory
    dispatch(topDonationsUpdated([]));
    return { status: false };
  } catch (err) {
    console.error("Error fetching top donations:", err);
    // On error, set empty array (no success donations to show)
    dispatch(topDonationsUpdated([]));
    return { status: false };
  }
};

/**
 * Generate QR code for given amount (uses common API - Application Settings UPI)
 * Reusable for donation or any feature needing UPI QR.
 */
export const generateQRCode = (amount) => async (dispatch) => {
  try {
    dispatch(loadingQRCode());
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.post(`/api/common/qr/generate`, { amount }, config);
    if (res.data && res.data.status === true && res.data.response) {
      const { qrCodeData, amount: resolvedAmount } = res.data.response;
      dispatch(qrCodeUpdated({ qrCodeData, amount: resolvedAmount }));
      return { status: true, response: res.data.response };
    }
    dispatch(qrCodeUpdated({ qrCodeData: "", amount: null }));
    return { status: false };
  } catch (err) {
    console.error("Error generating QR code:", err);
    dispatch(qrCodeUpdated({ qrCodeData: "", amount: null }));
    // For auto-generated QR (no explicit button), avoid noisy alerts.
    return {
      status: false,
      message: err.response?.data?.message || "Failed to generate QR code",
    };
  }
};

/**
 * Clear QR code state (e.g. when closing donation modal)
 */
export const clearQRCodeState = () => (dispatch) => {
  dispatch(clearQRCode());
};

/**
 * Submit donation request (bank transfer or UPI after scan - with UTR)
 */
export const submitDonationRequest = (formData) => async (dispatch) => {
  try {
    dispatch(loadingSubmitDonation());
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.post(
      `/api/common/donation/request`,
      formData,
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(submitDonationSuccess());
      dispatch(
        setAlert(
          res.data.message ||
            "Your donation request has been submitted for admin approval",
          "success"
        )
      );
      return res.data;
    } else {
      dispatch(submitDonationSuccess());
      if (res.data.errors) {
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          res.data.message || "Error submitting donation request",
          "danger"
        )
      );
      return { status: false };
    }
  } catch (err) {
    console.error("Error submitting donation request:", err);
    dispatch(submitDonationSuccess());
    if (err.response && err.response.data) {
      if (err.response.data.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response.data.message || "Error submitting donation request",
          "danger"
        )
      );
    } else {
      dispatch(setAlert("Error submitting donation request", "danger"));
    }
    return { status: false };
  }
};
