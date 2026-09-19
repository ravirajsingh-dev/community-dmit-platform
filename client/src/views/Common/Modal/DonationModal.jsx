import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Col, Spinner } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { setAlert } from "@src/actions/alert";
import { validateForm } from "@src/utils/validation";
import { setErrorsList } from "@src/actions/errors";
import Errors from "@src/notifications/Errors";
import {
  submitDonationRequest,
  generateQRCode,
} from "@src/actions/donationActions";

const DonationModal = ({
  show,
  handleClose,
  paymentMode,
  initialAmount,
  isFixedAmount,
  donationSettings,
  submitDonationRequest,
  generateQRCode,
  setErrorsList,
  setAlert,
  errorList,
  loggedInUser,
  loadingSubmitDonation,
  qrCodeData,
  generatedAmount,
  loadingQRCode,
}) => {
  const initialFormData = {
    donorName: "",
    phone: "",
    email: "",
    address: "",
    amount: initialAmount || "",
    utrNumber: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [customAmount, setCustomAmount] = useState(initialAmount || "");
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [preparingQR, setPreparingQR] = useState(false);

  // Reset form data and clear errors when modal opens/closes
  useEffect(() => {
    if (show) {
      setFormData({
        ...initialFormData,
        amount: initialAmount || "",
        donorName: loggedInUser?.name || "",
        phone: loggedInUser?.phone || "",
        email: loggedInUser?.email || "",
      });
      setCustomAmount(initialAmount || "");
      setErrorsList("", "donorName");
      setErrorsList("", "phone");
      setErrorsList("", "email");
      setErrorsList("", "amount");
      setErrorsList("", "utrNumber");
    } else {
      setFormData(initialFormData);
      setCustomAmount("");
      setIsPaymentProcessing(false);
      setPreparingQR(false);
      setErrorsList("", "donorName");
      setErrorsList("", "phone");
      setErrorsList("", "email");
      setErrorsList("", "amount");
      setErrorsList("", "utrNumber");
    }
  }, [show, initialAmount, loggedInUser]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === "phone") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === "utrNumber") {
      const alphanumeric = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
      setFormData({ ...formData, [name]: alphanumeric });
      setErrorsList("", "utrNumber");
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow digits 0-9, no dots, symbols, or decimals
    const numericValue = value.replace(/[^0-9]/g, "");
    setCustomAmount(numericValue);
    setFormData({ ...formData, amount: numericValue });
    // Clear amount error when user types
    setErrorsList("", "amount");
  };

  // Sync customAmount to formData.amount when customAmount changes
  useEffect(() => {
    if (!isFixedAmount) {
      setFormData((prev) => ({ ...prev, amount: customAmount }));
    }
  }, [customAmount, isFixedAmount]);

  // Auto-generate QR 2s after amount is entered/changed (UPI only)
  useEffect(() => {
    if (!show || paymentMode !== "UPI") return;

    const rawAmount = isFixedAmount
      ? initialAmount
      : (customAmount && parseFloat(customAmount));

    if (!rawAmount || isNaN(rawAmount) || rawAmount < 1) {
      setPreparingQR(false);
      return;
    }

    setPreparingQR(true);
    const timeoutId = setTimeout(() => {
      generateQRCode(rawAmount);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      setPreparingQR(false);
    };
  }, [show, paymentMode, isFixedAmount, initialAmount, customAmount, generateQRCode]);

  // Clear preparing state when QR is ready
  useEffect(() => {
    if (qrCodeData) setPreparingQR(false);
  }, [qrCodeData]);

  // When UPI QR is generated, set form amount to generated amount for submit
  useEffect(() => {
    if (paymentMode === "UPI" && generatedAmount != null) {
      setFormData((prev) => ({ ...prev, amount: String(generatedAmount) }));
    }
  }, [paymentMode, generatedAmount]);

  const onSubmit = async (e) => {
    e.preventDefault();

    setErrorsList("", "donorName");
    setErrorsList("", "phone");
    setErrorsList("", "email");
    setErrorsList("", "amount");
    setErrorsList("", "utrNumber");

    const validationRules = [
      { path: "donorName", msg: "Donor name is required." },
      { path: "phone", msg: "Phone number is required." },
      { path: "email", msg: "Email is required." },
      { path: "amount", msg: "Amount is required.", type: "number" },
      { path: "utrNumber", msg: "UTR number is required." },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      errors.forEach((error) => {
        setErrorsList(error.msg, error.path);
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorsList("Amount must be greater than 0", "amount");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorsList("Invalid email format", "email");
      return;
    }

    const submitData = {
      ...formData,
      amount,
      paymentMode,
    };

    setIsPaymentProcessing(true);
    const result = await submitDonationRequest(submitData);
    setIsPaymentProcessing(false);

    if (result && result.status) {
      handleClose();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      className="donation-form-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Donate via {paymentMode === "UPI" ? "UPI" : "Bank Transfer"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {paymentMode === "UPI" && (
          <div className="mb-4">
            {donationSettings.upi && (donationSettings.upi.upiId || donationSettings.upi.upiHolderName) && (
              <div className="bg-light p-3 rounded mb-3 small">
                <strong>UPI ID:</strong> {donationSettings.upi.upiId || "—"}
                <br />
                <strong>Name:</strong> {donationSettings.upi.upiHolderName || "—"}
              </div>
            )}

            {!qrCodeData && (
              <p className="text-muted small mb-3">
                To generate the QR code, please enter the donation amount below. We will automatically create the QR code in a few seconds.
              </p>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Enter Amount (₹)</Form.Label>
              <Form.Control
                type="text"
                value={
                  isFixedAmount && initialAmount
                    ? String(initialAmount)
                    : customAmount
                }
                onChange={isFixedAmount ? undefined : handleAmountChange}
                placeholder="e.g. 101"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={isFixedAmount}
                className={errorList.amount ? "form-input-invalid" : ""}
              />
              <Form.Text className="text-muted">
                Minimum donation amount is ₹1
              </Form.Text>
              <Errors current_key="amount" />
            </Form.Group>

            {(!qrCodeData && (preparingQR || loadingQRCode)) && (
              <div className="text-center py-4 px-3 rounded bg-light border">
                <Spinner animation="border" role="status" className="mb-2" />
                <p className="mb-0 text-muted small">
                  {loadingQRCode
                    ? "Generating QR code... Please wait."
                    : "Preparing QR code... Please wait."}
                </p>
              </div>
            )}

            {qrCodeData && (
              <>
                <div className="text-center mb-3">
                  <p className="fs-4 text-primary mb-2">Scan to pay ₹{generatedAmount}</p>
                  <img
                    src={qrCodeData}
                    alt="UPI QR Code"
                    style={{ maxWidth: 260, height: "auto" }}
                  />
                </div>
                <p className="text-muted small mb-3">
                  After payment, enter your details and UTR / transaction reference below to submit your donation request for verification.
                </p>
              </>
            )}
          </div>
        )}

        {paymentMode === "BANK" && donationSettings.bank && (
          <div className="mb-4">
            <h5 className="mb-3">Bank Details</h5>
            <div className="bg-light p-3 rounded">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <small className="d-block">Bank Name</small>
                  <strong className="text-warning">
                    {donationSettings.bank.bankName || "N/A"}
                  </strong>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <small className="d-block">Account Holder Name</small>
                  <strong className="text-warning">
                    {donationSettings.bank.accountHolderName || "N/A"}
                  </strong>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <small className="d-block">Account Number</small>
                  <strong className="text-warning">
                    {donationSettings.bank.accountNo || "N/A"}
                  </strong>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="d-block">IFSC Code</small>
                  <strong className="text-warning">
                    {donationSettings.bank.ifscCode || "N/A"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        <Form onSubmit={onSubmit}>
          {(paymentMode === "UPI" || paymentMode === "BANK") && (
            <>
              <Form.Group as={Col} className="mb-3">
                <Form.Label>
                  Donor Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="donorName"
                  value={formData.donorName}
                  onChange={onChange}
                  placeholder="Enter your name"
                  required
                  disabled={false}
                  className=""
                />
                <Errors current_key="donorName" />
              </Form.Group>

              <Form.Group as={Col} className="mb-3">
                <Form.Label>
                  Phone Number <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  placeholder="Enter your phone number"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="10"
                  minLength="10"
                  className={errorList.phone ? "form-input-invalid" : ""}
                />
                <Errors current_key="phone" />
              </Form.Group>

              <Form.Group as={Col} className="mb-3">
                <Form.Label>
                  Email <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  placeholder="Enter your email"
                  required
                  disabled={false}
                  className=""
                />
                <Errors current_key="email" />
              </Form.Group>
            </>
          )}

          <Form.Group as={Col} className="mb-3">
            <Form.Label>Address (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="address"
              value={formData.address}
              onChange={onChange}
              placeholder="Enter your address (optional)"
            />
            <Errors current_key="address" />
          </Form.Group>

          {paymentMode === "BANK" && (
            <>
              <Form.Group as={Col} className="mb-3">
                <Form.Label>
                  Amount <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={onChange}
                  placeholder="Enter amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                />
                <Errors current_key="amount" />
              </Form.Group>

              <Form.Group as={Col} className="mb-3">
                <Form.Label>
                  UTR / Transaction Reference <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="utrNumber"
                  value={formData.utrNumber}
                  onChange={onChange}
                  placeholder="e.g. 12345678901234567890"
                  maxLength={20}
                  required
                  className={errorList.utrNumber ? "form-input-invalid" : ""}
                />
                <Form.Text className="text-muted">
                  Only letters and numbers (A–Z, a–z, 0–9). Length: 10–20 characters. No spaces or special characters. Copy from your bank/UPI app after payment.
                </Form.Text>
                <Errors current_key="utrNumber" />
              </Form.Group>
            </>
          )}

          {paymentMode === "UPI" && qrCodeData && (
            <Form.Group as={Col} className="mb-3">
              <Form.Label>
                UTR / Transaction Reference <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="utrNumber"
                value={formData.utrNumber}
                onChange={onChange}
                placeholder="e.g. 12345678901234567890"
                maxLength={20}
                required
                className={errorList.utrNumber ? "form-input-invalid" : ""}
              />
              <Form.Text className="text-muted">
                Only letters and numbers (A–Z, a–z, 0–9). Length: 10–20 characters. No spaces or special characters. Copy from your bank/UPI app after payment.
              </Form.Text>
              <Errors current_key="utrNumber" />
            </Form.Group>
          )}

          {((paymentMode === "BANK") || (paymentMode === "UPI" && qrCodeData)) && (
          <Button
            variant="primary"
            type="submit"
            className="w-100"
            disabled={loadingSubmitDonation || isPaymentProcessing}
          >
            {loadingSubmitDonation || isPaymentProcessing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              "Submit Donation Request"
            )}
          </Button>
          )}
        </Form>
      </Modal.Body>
    </Modal>
  );
};

DonationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  paymentMode: PropTypes.oneOf(["UPI", "BANK"]).isRequired,
  initialAmount: PropTypes.number,
  isFixedAmount: PropTypes.bool,
  donationSettings: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  loggedInUser: state.auth.user,
  loadingSubmitDonation: state.donation.loadingSubmitDonation,
  loadingQRCode: state.donation.loadingQRCode,
  qrCodeData: state.donation.qrCodeData,
  generatedAmount: state.donation.generatedAmount,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  submitDonationRequest,
  generateQRCode,
  setErrorsList,
  setAlert,
})(DonationModal);
