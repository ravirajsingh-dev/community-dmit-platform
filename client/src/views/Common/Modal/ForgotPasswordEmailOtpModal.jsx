import { setErrors } from "@src/actions/auth";
import Errors from "@src/notifications/Errors";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Spinner,
  Alert,
  InputGroup,
} from "react-bootstrap";
import { connect } from "react-redux";
import { FaKey, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { validateForm } from "@src/utils/validation";
import {
  isValidMemberIdFormat,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const ForgotPasswordEmailOtpModal = ({
  show,
  onHide,
  onVerifyMemberId,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
  onResetPassword,
  isVerifyingMemberId,
  isSendingOtp,
  isResendingOtp,
  isVerifyingOtp,
  isResetting,
  successMessage,
  errorList,
}) => {
  const [step, setStep] = useState(1);
  const [memberId, setMemberId] = useState("");
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
  const [memberIdVerified, setMemberIdVerified] = useState(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);

  useEffect(() => {
    if (!show) {
      setStep(1);
      setMemberId("");
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
      setMemberIdVerified(false);
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

  const handleMemberIdChange = createMemberIdChangeHandler((e) => {
    const { value } = e.target;
    setMemberId(value);
  }, "memberId");
  const handleMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setMemberId(formatted),
  );
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    (e) => {
      const { value } = e.target;
      setMemberId(value);
    },
    "memberId",
  );

  const handleVerifyMemberId = async (e) => {
    e.preventDefault();
    setError("");

    const validationRules = [
      {
        path: "memberId",
        msg: "Please provide a valid Member ID (G followed by 9 digits).",
        validator: (value) => isValidMemberIdFormat(value),
      },
    ];

    const errors = validateForm({ memberId }, validationRules);
    if (errors.length) {
      setError(
        "Please provide a valid Member ID (G followed by 9 digits).",
      );
      return;
    }

    try {
      const response = await onVerifyMemberId(memberId);
      if (response && response.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setMemberIdVerified(true);
      }
    } catch (err) {
      const errorMessage = err.message || "Invalid Member ID";
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
      const response = await onSendOtp(memberId, email.trim());
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
      const errorMessage =
        err.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");

    try {
      const response = await onResendOtp(memberId);
      if (response && response.maskedEmail) {
        setMaskedEmail(response.maskedEmail);
        setResendTimer(60);
      }
    } catch (err) {
      const errorMessage =
        err.message || "Failed to resend OTP. Please try again.";
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
      await onVerifyOtp(memberId, otp);
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

    if (password.length < 4 || password.length > 22) {
      setError("Password must be 4 to 22 characters long.");
      return;
    }

    const passwordRegex = /^[a-zA-Z0-9@#$%^&+=!*-_.]{4,22}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be 4 to 22 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await onResetPassword(memberId, otp, password, confirmPassword);
    } catch (err) {
      const errorMessage =
        err.message || "Password reset failed. Please try again.";
      setError(errorMessage);
    }
  };

  const getStepTitle = () => {
    if (step === 1 && memberIdVerified) {
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
            <FaKey className="logout-icon me-2" /> Verify Member ID
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
        password.length >= 4 &&
        password.length <= 22 &&
        confirmPassword.length >= 4 &&
        confirmPassword.length <= 22 &&
        password === confirmPassword &&
        /^[a-zA-Z0-9@#$%^&+=!*-_.]{4,22}$/.test(password)
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
          <Alert variant="success">OTP sent to {maskedEmail}</Alert>
        )}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        {!successMessage ? (
          <Form
            onSubmit={
              step === 1 && !memberIdVerified
                ? handleVerifyMemberId
                : step === 2
                  ? handleSendOtp
                  : step === 3
                    ? handleVerifyOtp
                    : handleResetPassword
            }
          >
            {step === 1 && !memberIdVerified && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="memberId" className="form-label-primary">
                    Member ID *
                  </Form.Label>
                  <Form.Control
                    required
                    type="text"
                    id="memberId"
                    name="memberId"
                    value={memberId}
                    onChange={handleMemberIdChange}
                    onPaste={handleMemberIdPaste}
                    onKeyDown={handleMemberIdKeyDown}
                    placeholder="G123456789"
                    maxLength={10}
                    className={`text-muted ${
                      errorList.memberId ? "form-input-invalid" : ""
                    }`}
                    disabled={isVerifyingMemberId}
                  />
                  <Errors current_key="memberId" key="memberId" />
                </Form.Group>
              </>
            )}

            {step === 1 && memberIdVerified && (
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
                      placeholder="Enter new password (4-22 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`text-muted ${
                        errorList.password ? "form-input-invalid" : ""
                      }`}
                      disabled={isResetting}
                      minLength={4}
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
                        password.length >= 4 && password.length <= 22
                          ? passwordMatch
                            ? "text-success"
                            : "text-danger"
                          : "text-danger"
                      }
                    >
                      {password.length < 4
                        ? "Password must be at least 4 characters"
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
                      minLength={4}
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
              {((step === 1 && memberIdVerified) || (step > 1 && step < 4)) && (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    if (step === 1 && memberIdVerified) {
                      setMemberIdVerified(false);
                      setEmail("");
                    } else {
                      setStep(step - 1);
                    }
                    setError("");
                  }}
                  disabled={
                    isVerifyingMemberId ||
                    isSendingOtp ||
                    isResendingOtp ||
                    isVerifyingOtp ||
                    isResetting
                  }
                >
                  Back
                </Button>
              )}
              {step === 1 && memberIdVerified ? (
                <Button
                  type="button"
                  className="btn-logout-cancel"
                  onClick={handleGoToEmailStep}
                  disabled={
                    isVerifyingMemberId ||
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
                    isVerifyingMemberId ||
                    isSendingOtp ||
                    isResendingOtp ||
                    isVerifyingOtp ||
                    isResetting ||
                    (step === 4 && !isFormValid())
                  }
                  style={{
                    marginLeft: step === 1 && !memberIdVerified ? "auto" : "0",
                  }}
                >
                  {isVerifyingMemberId ||
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
                      {step === 1 && !memberIdVerified
                        ? "Verifying..."
                        : step === 2
                          ? "Sending..."
                          : step === 3
                            ? "Verifying..."
                            : "Resetting..."}
                    </>
                  ) : step === 1 && !memberIdVerified ? (
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
                isVerifyingMemberId ||
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
  loading: state.auth.loading,
});

export default connect(mapStateToProps, {
  setErrors,
})(ForgotPasswordEmailOtpModal);
