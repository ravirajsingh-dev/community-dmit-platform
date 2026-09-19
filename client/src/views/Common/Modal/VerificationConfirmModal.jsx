import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  Button,
  Form,
  InputGroup,
  Col,
  Spinner,
} from "react-bootstrap";
import PropTypes from "prop-types";
import Errors from "@src/notifications/Errors";

import { connect } from "react-redux";
import { validateForm } from "@src/utils/validation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { setErrors } from "@src/actions/auth";

const VerificationConfirmModal = ({
  show,
  handleClose,
  handleConfirm,
  title,
  body,
  submitBtnText,
  setErrors,
  errorList,
  isLoading,
}) => {
  const initialFormData = {
    txn_password: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

  const { txn_password } = formData;

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      setFormData(initialFormData);
    }
  }, [show]);

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

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    handleConfirm(txn_password);
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="logout-modal">
      <Modal.Header closeButton className="logout-modal-header">
        <Modal.Title className="logout-modal-title">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="logout-modal-body">
        <Alert key={"danger"} variant={"danger"}>
          {body}
        </Alert>
        <Form className="authentication-form">
          <Form.Group as={Col} md="12" className="mb-3">
            <Form.Label htmlFor="txn_password" className="fw-bold">
              Transaction Password *
            </Form.Label>
            <InputGroup>
              <Form.Control
                required
                type={showPassword ? "text" : "password"}
                id="txn_password"
                value={txn_password}
                name="txn_password"
                className={`text-muted ${
                  errorList.txn_password ? "form-input-invalid" : ""
                }`}
                onChange={onChange}
                placeholder="Enter transaction password"
                disabled={isLoading} // Disable during loading
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
      </Modal.Body>
      <Modal.Footer className="logout-modal-footer">
        <Col xs={5} className="text-center">
          <Button
            variant="outline-danger"
            className="btn-logout-cancel"
            onClick={handleClose}
            disabled={isLoading} // Disable during loading
          >
            Cancel
          </Button>
        </Col>
        <Col className="text-center">
          <Button
            variant="outline-primary"
            className="btn-logout-confirm"
            onClick={onConfirm}
            disabled={isLoading} // Disable during loading
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Processing...</span>
              </>
            ) : (
              submitBtnText || "Submit"
            )}
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

VerificationConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  submitBtnText: PropTypes.string,
  isLoading: PropTypes.bool, // Add loading prop
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
})(VerificationConfirmModal);
