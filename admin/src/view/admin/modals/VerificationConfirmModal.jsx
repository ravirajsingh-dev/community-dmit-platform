import React, { useState } from "react";
import { Modal, Button, Form, InputGroup, Col, Row } from "react-bootstrap";
import PropTypes from "prop-types";
import Errors from "@src/notifications/Errors";

import { connect } from "react-redux";
import { validateForm } from "@src/utils/validation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { setErrors } from "@src/actions/adminAuth";

const VerificationConfirmModal = ({
  show,
  handleClose,
  handleConfirm,
  title,
  body,
  submitBtnText,
  setErrors,
  errorList,
}) => {
  const initialFormData = {
    txn_password: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

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

    handleConfirm(formData.txn_password);
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
            <Form.Group as={Col} md="12">
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
        <Button variant="outline-danger" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {submitBtnText || "Submit"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

VerificationConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  submitBtnText: PropTypes.string,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  setErrors,
})(VerificationConfirmModal);
