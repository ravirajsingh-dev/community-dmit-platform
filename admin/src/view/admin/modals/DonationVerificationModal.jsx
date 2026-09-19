import React, { useEffect, useState } from "react";
import { Modal, Button, Form, InputGroup, Col, Row } from "react-bootstrap";
import PropTypes from "prop-types";
import Errors from "@src/notifications/Errors";

import { connect } from "react-redux";
import { validateForm } from "@src/utils/validation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { setErrors } from "@src/actions/adminAuth";

const DonationVerificationModal = ({
  show,
  handleClose,
  handleConfirm,
  title,
  body,
  submitBtnText,
  showReason = false,
  reasonLabel = "Reason (optional)",
  reasonRequired = false,
  reasonPlaceholder = "Enter reason",
  showPayoutReference = false,
  payoutReferenceLabel = "UTR / Transaction ID / Cheque no.",
  payoutReferencePlaceholder = "Enter reference shown to the user (optional)",
  payoutReferenceRequired = false,
  payoutReferenceInitial = "",
  isSubmitting = false,
  setErrors,
  errorList,
}) => {
  const initialFormData = {
    txn_password: "",
    reason: "",
    payoutReference: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFormData((prev) => ({
      ...prev,
      payoutReference: payoutReferenceInitial || "",
    }));
  }, [show, payoutReferenceInitial]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const onConfirm = () => {
    const validationRules = [
      { path: "txn_password", msg: "Transaction password is required." },
    ];

    if (showReason && reasonRequired) {
      validationRules.push({
        path: "reason",
        msg: "Reason is required.",
      });
    }

    if (showPayoutReference && payoutReferenceRequired) {
      validationRules.push({
        path: "payoutReference",
        msg: "Payout reference is required.",
      });
    }

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    handleConfirm(
      formData.txn_password,
      formData.reason,
      showPayoutReference ? (formData.payoutReference || "").trim() : undefined,
    );
    setFormData(initialFormData);
  };

  const onClose = () => {
    setFormData(initialFormData);
    handleClose();
  };

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col className="my-2 fw-bold primary-color"> {body}</Col>
        </Row>
        <Row className="mb-4">
          <Form className="registration-form">
            {showReason && (
              <Form.Group as={Col} md="12">
                <Form.Label htmlFor="reason" className="fw-bold">
                  {reasonLabel}
                  {reasonRequired && (
                    <span className="text-danger ms-1">*</span>
                  )}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={onChange}
                  placeholder={reasonPlaceholder}
                  className={`text-muted ${errorList.reason ? "invalid" : ""}`}
                />
                <Errors current_key="reason" />
              </Form.Group>
            )}

            {showPayoutReference && (
              <Form.Group as={Col} md="12" className="mb-3">
                <Form.Label htmlFor="payoutReference" className="fw-bold">
                  {payoutReferenceLabel}
                  {payoutReferenceRequired && (
                    <span className="text-danger ms-1">*</span>
                  )}
                </Form.Label>
                <Form.Control
                  type="text"
                  id="payoutReference"
                  name="payoutReference"
                  value={formData.payoutReference}
                  onChange={onChange}
                  placeholder={payoutReferencePlaceholder}
                  maxLength={120}
                  className={`text-muted ${errorList.payoutReference ? "invalid" : ""}`}
                />
                <Errors current_key="payoutReference" />
              </Form.Group>
            )}

            <Form.Group as={Col} md="12" className="mb-3">
              <Form.Label htmlFor="txn_password" className="fw-bold">
                Transaction Password *
              </Form.Label>
              <InputGroup>
                <Form.Control
                  required
                  type={showPassword ? "text" : "password"}
                  id="txn_password"
                  value={formData.txn_password}
                  name="txn_password"
                  className={`text-muted ${
                    errorList.txn_password ? "invalid" : ""
                  }`}
                  onChange={onChange}
                  placeholder="Enter transaction password"
                />
                <InputGroup.Text
                  className="show-password-icon text-muted"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? (
                    <AiOutlineEye size={20} />
                  ) : (
                    <AiOutlineEyeInvisible size={20} />
                  )}
                </InputGroup.Text>
              </InputGroup>
              <Errors current_key="txn_password" />
            </Form.Group>
          </Form>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-danger" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : submitBtnText || "Submit"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

DonationVerificationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  submitBtnText: PropTypes.string,
  showReason: PropTypes.bool,
  reasonLabel: PropTypes.string,
  reasonRequired: PropTypes.bool,
  reasonPlaceholder: PropTypes.string,
  showPayoutReference: PropTypes.bool,
  payoutReferenceLabel: PropTypes.string,
  payoutReferencePlaceholder: PropTypes.string,
  payoutReferenceRequired: PropTypes.bool,
  payoutReferenceInitial: PropTypes.string,
  isSubmitting: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
})(DonationVerificationModal);
