import { setErrors } from "@src/actions/auth";
import Errors from "@src/notifications/Errors";
import { handleNumberInput } from "@src/utils/helper";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Col, Alert } from "react-bootstrap";
import { connect } from "react-redux";
import { FaKey, FaPhone } from "react-icons/fa";

const ForgotPasswordModal = ({
  show,
  onHide,
  onVerifyPhone,
  onResetPassword,
  isVerifying,
  isResetting,
  successMessage,
  errorList,
}) => {
  const [phone, setPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [error, setError] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      setPhone("");
      setMaskedPhone("");
      setError("");
    }
  }, [show]);

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await onVerifyPhone(phone);

      if (response && response.maskedPhone) {
        setMaskedPhone(response.maskedPhone);
      }
    } catch (err) {
      setError("An error occurred during phone verification");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await onResetPassword({ phone });
    } catch (err) {
      setError("Failed to reset password. Please try again.");
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="sm"
      className="logout-modal"
    >
      <Modal.Header closeButton className="logout-modal-header">
        <Modal.Title className="logout-modal-title">
          {maskedPhone ? (
            <>
              <FaPhone className="logout-icon me-2" /> Verify Identity
            </>
          ) : (
            <>
              <FaKey className="logout-icon me-2" /> Reset Password
            </>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="logout-modal-body">
        {error && <Alert variant="danger">{error}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        {!successMessage ? (
          <Form onSubmit={maskedPhone ? handleResetPassword : handleVerifyPhone}>
            {!maskedPhone ? (
              <Form.Group className="mb-3">
                <Form.Label htmlFor="phone" className="form-label-primary">
                  Phone Number
                </Form.Label>
                <Form.Control
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={`text-muted ${errorList.phone ? "form-input-invalid" : ""}`}
                  disabled={isVerifying}
                  onKeyDown={handleNumberInput}
                />
                <Errors current_key="phone" key="phone" />
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label htmlFor="phoneInput" className="form-label-primary">
                  Confirm your registered phone number
                  {maskedPhone && ` ending with ****${maskedPhone}`}
                </Form.Label>

                <Form.Control
                  type="tel"
                  id="phoneInput"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Re-enter phone number"
                  className={`text-muted ${errorList.phone ? "form-input-invalid" : ""}`}
                  onKeyDown={handleNumberInput}
                  disabled={isResetting}
                  required
                />

                <Errors current_key="phone" key="phone" />
              </Form.Group>
            )}

            <div className="d-flex justify-content-between">
              {maskedPhone && (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setMaskedPhone("");
                    setPhone("");
                  }}
                  disabled={isVerifying || isResetting}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="btn-logout-cancel"
                disabled={isVerifying || isResetting}
              >
                {isVerifying || isResetting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    {maskedPhone ? "Resetting..." : "Verifying..."}
                  </>
                ) : maskedPhone ? (
                  "Reset Password"
                ) : (
                  "Verify Phone"
                )}
              </Button>
            </div>
          </Form>
        ) : (
          <div className="text-center">
            <Button className="mt-3" variant="success" onClick={onHide}>
              Close
            </Button>
          </div>
        )}
      </Modal.Body>

      {!successMessage && (
        <Modal.Footer className="logout-modal-footer">
          <Col className="text-center">
            <Button
              type="button"
              className="btn-logout-cancel"
              onClick={onHide}
              disabled={isVerifying || isResetting}
            >
              Close
            </Button>
          </Col>
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
})(ForgotPasswordModal);
