import { setErrors } from "@src/actions/adminAuth";
import Errors from "@src/notifications/Errors";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert, InputGroup } from "react-bootstrap";
import { connect } from "react-redux";
import { FaKey, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { validateForm } from "@src/utils/validation";

const AdminForgotPasswordEmailOtpModal = ({
  show,
  onHide,
  onVerifyAdminId,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
  onResetPassword,
  isVerifyingAdminId,
  isSendingOtp,
  isResendingOtp,
  isVerifyingOtp,
  isResetting,
  successMessage,
  errorList,
}) => {
  const [step, setStep] = useState(1);
  const [adminId, setAdminId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [adminIdVerified, setAdminIdVerified] = useState(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);

  useEffect(() => {
    if (!show) {
      setStep(1);
      setAdminId("");
      setMaskedEmail("");
      setEmail("");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError("");
      setResendTimer(0);
      setPasswordMatch(true);
      setAdminIdVerified(false);
      setOtpSentSuccess(false);
    }
  }, [show]);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  useEffect(() => {
    if (confirmPassword) {
      setPasswordMatch(password === confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [password, confirmPassword]);

  const handleVerifyAdminId = async (e) => {
    e.preventDefault();
    setError("");

    const validationRules = [
      {
        path: "adminId",
        msg: "Please provide a valid Admin ID (8-15 characters).",
        validator: (value) => value && value.length >= 8 && value.length <= 15,
      },
    ];

    const errors = validateForm({ adminId }, validationRules);
    if (errors.length) {
      setError("Please provide a valid Admin ID (8-15 characters).");
      return;
    }

    try {
      const response = await onVerifyAdminId(adminId);
      if (response && response.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setAdminIdVerified(true);
      }
    } catch (err) {
      const errorMessage = err.message || "Invalid Admin ID";
      setError(errorMessage);
    }
  };

  const handleGoToEmailStep = () => {
    setStep(2);
    setError("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setOtpSentSuccess(false);

    if (!email || !email.trim()) {
      setError("Email is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }

    try {
      const response = await onSendOtp(adminId, email.trim());
      if (response && response.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setOtpSentSuccess(true);
        setResendTimer(60);
        setTimeout(() => {
          setStep(3);
          setOtpSentSuccess(false);
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");

    try {
      const response = await onResendOtp(adminId);
      if (response && response.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setResendTimer(60);
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to resend OTP. Please try again.";
      setError(errorMessage);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const validationRules = [
      {
        path: "otp",
        msg: "OTP must be exactly 6 digits.",
        validator: (value) => /^\d{6}$/.test(value),
      },
    ];

    const errors = validateForm({ otp }, validationRules);
    if (errors.length) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    try {
      await onVerifyOtp(adminId, otp);
      setStep(4);
    } catch (err) {
      const errorMessage = err.message || "Invalid or expired OTP";
      setError(errorMessage);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8 || password.length > 22) {
      setError("Password must be 8 to 22 characters long.");
      return;
    }

    const passwordRegex = /^[a-zA-Z0-9@#$%^&+=!*-_.]{8,22}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be 8 to 22 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await onResetPassword(adminId, otp, password, confirmPassword);
    } catch (err) {
      const errorMessage = err.message || "Password reset failed. Please try again.";
      setError(errorMessage);
    }
  };

  const getStepTitle = () => {
    if (step === 1 && adminIdVerified) {
      return (
        <>
          <FaEnvelope className="logout-icon me-2" /> Verify Email
        </>
      );
    }
    switch (step) {
      case 1:
        return (
          <>
            <FaKey className="logout-icon me-2" /> Verify Admin ID
          </>
        );
      case 2:
        return (
          <>
            <FaEnvelope className="logout-icon me-2" /> Verify Email
          </>
        );
      case 3:
        return (
          <>
            <FaKey className="logout-icon me-2" /> Verify OTP
          </>
        );
      case 4:
        return (
          <>
            <FaLock className="logout-icon me-2" /> Reset Password
          </>
        );
      default:
        return "Reset Password";
    }
  };

  const isFormValid = () => {
    if (step === 4) {
      return (
        password.length >= 8 &&
        password.length <= 22 &&
        confirmPassword.length >= 8 &&
        confirmPassword.length <= 22 &&
        password === confirmPassword &&
        /^[a-zA-Z0-9@#$%^&+=!*-_.]{8,22}$/.test(password)
      );
    }
    return true;
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="sm"
      className="logout-modal"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton className="logout-modal-header">
        <Modal.Title className="logout-modal-title">
          {getStepTitle()}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="logout-modal-body">
        {error && <Alert variant="danger">{error}</Alert>}
        {otpSentSuccess && (
          <Alert variant="success">
            OTP sent to {maskedEmail}
          </Alert>
        )}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        {!successMessage ? (
          <Form
            onSubmit={
              step === 1 && !adminIdVerified
                ? handleVerifyAdminId
                : step === 2
                ? handleSendOtp
                : step === 3
                ? handleVerifyOtp
                : handleResetPassword
            }
          >
            {step === 1 && !adminIdVerified && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="adminId" className="form-label-primary">
                    Admin ID *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="adminId"
                    name="adminId"
                    placeholder="Enter Admin ID (8-15 characters)"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    required
                    className={`text-muted ${
                      errorList.adminId ? "form-input-invalid" : ""
                    }`}
                    disabled={isVerifyingAdminId}
                    maxLength={15}
                    minLength={8}
                  />
                  <Errors current_key="adminId" key="adminId" />
                </Form.Group>
              </>
            )}

            {step === 1 && adminIdVerified && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-primary">
                    Registered Email
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={maskedEmail}
                    readOnly
                    className="text-muted bg-light"
                  />
                </Form.Group>
              </>
            )}

            {step === 2 && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="email" className="form-label-primary">
                    Email *
                  </Form.Label>
                  <Form.Control
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`text-muted ${
                      errorList.email ? "form-input-invalid" : ""
                    }`}
                    disabled={isSendingOtp}
                  />
                  <Errors current_key="email" key="email" />
                </Form.Group>
              </>
            )}

            {step === 3 && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="otp" className="form-label-primary">
                    Enter OTP
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="otp"
                    name="otp"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setOtp(value);
                    }}
                    required
                    className={`text-muted ${
                      errorList.otp ? "form-input-invalid" : ""
                    }`}
                    disabled={isVerifyingOtp}
                    maxLength={6}
                  />
                  <Errors current_key="otp" key="otp" />
                  <Form.Text className="text-muted">
                    OTP sent to {maskedEmail}
                  </Form.Text>
                </Form.Group>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isResendingOtp}
                    className="p-0"
                  >
                    {isResendingOtp ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Resending...
                      </>
                    ) : resendTimer > 0 ? (
                      `Resend OTP (${resendTimer}s)`
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="password" className="form-label-primary">
                    New Password *
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter new password (8-22 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`text-muted ${
                        errorList.password ? "form-input-invalid" : ""
                      }`}
                      disabled={isResetting}
                      minLength={8}
                      maxLength={22}
                    />
                    <InputGroup.Text
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </InputGroup.Text>
                  </InputGroup>
                  <Errors current_key="password" key="password" />
                  {password && (
                    <Form.Text
                      className={
                        password.length >= 8 && password.length <= 22
                          ? passwordMatch
                            ? "text-success"
                            : "text-danger"
                          : "text-danger"
                      }
                    >
                      {password.length < 8
                        ? "Password must be at least 8 characters"
                        : password.length > 22
                        ? "Password must be at most 22 characters"
                        : passwordMatch
                        ? "Password is valid"
                        : "Passwords do not match"}
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label
                    htmlFor="confirmPassword"
                    className="form-label-primary"
                  >
                    Confirm Password *
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={`text-muted ${
                        errorList.confirmPassword ? "form-input-invalid" : ""
                      }`}
                      disabled={isResetting}
                      minLength={8}
                      maxLength={22}
                    />
                    <InputGroup.Text
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </InputGroup.Text>
                  </InputGroup>
                  <Errors current_key="confirmPassword" key="confirmPassword" />
                  {confirmPassword && (
                    <Form.Text
                      className={passwordMatch ? "text-success" : "text-danger"}
                    >
                      {passwordMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </Form.Text>
                  )}
                </Form.Group>
              </>
            )}

            <div className="d-flex justify-content-between">
              {((step === 1 && adminIdVerified) || (step > 1 && step < 4)) && (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    if (step === 1 && adminIdVerified) {
                      setAdminIdVerified(false);
                      setEmail("");
                    } else {
                      setStep(step - 1);
                    }
                    setError("");
                  }}
                  disabled={
                    isVerifyingAdminId ||
                    isSendingOtp ||
                    isResendingOtp ||
                    isVerifyingOtp ||
                    isResetting
                  }
                >
                  Back
                </Button>
              )}
              {step === 1 && adminIdVerified ? (
                <Button
                  type="button"
                  className="btn-logout-cancel"
                  onClick={handleGoToEmailStep}
                  disabled={
                    isVerifyingAdminId ||
                    isSendingOtp ||
                    isResendingOtp ||
                    isVerifyingOtp ||
                    isResetting
                  }
                  style={{ marginLeft: "auto" }}
                >
                  Verify Email
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="btn-logout-cancel"
                  disabled={
                    isVerifyingAdminId ||
                    isSendingOtp ||
                    isResendingOtp ||
                    isVerifyingOtp ||
                    isResetting ||
                    (step === 4 && !isFormValid())
                  }
                  style={{ marginLeft: step === 1 && !adminIdVerified ? "auto" : "0" }}
                >
                  {isVerifyingAdminId ||
                  isSendingOtp ||
                  isResendingOtp ||
                  isVerifyingOtp ||
                  isResetting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      {step === 1 && !adminIdVerified
                        ? "Verifying..."
                        : step === 2
                        ? "Sending..."
                        : step === 3
                        ? "Verifying..."
                        : "Resetting..."}
                    </>
                  ) : step === 1 && !adminIdVerified ? (
                    "Verify"
                  ) : step === 2 ? (
                    "Verify Email"
                  ) : step === 3 ? (
                    "Verify OTP"
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              )}
            </div>
          </Form>
        ) : (
          <div className="text-center">
            <Alert variant="success" className="mb-3">
              <strong>Success!</strong> {successMessage}
            </Alert>
            <Button className="mt-3" variant="success" onClick={onHide}>
              Close
            </Button>
          </div>
        )}
      </Modal.Body>

      {!successMessage && (
        <Modal.Footer className="logout-modal-footer">
          <div className="text-center w-100">
            <Button
              type="button"
              className="btn-logout-cancel"
              onClick={onHide}
              disabled={
                isVerifyingAdminId ||
                isSendingOtp ||
                isResendingOtp ||
                isVerifyingOtp ||
                isResetting
              }
            >
              Close
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loading: state.adminAuth.adminLoading,
});

export default connect(mapStateToProps, {
  setErrors,
})(AdminForgotPasswordEmailOtpModal);
