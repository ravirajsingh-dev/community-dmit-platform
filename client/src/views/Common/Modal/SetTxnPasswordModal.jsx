import React, { useState } from "react";
import {
  Modal,
  Button,
  InputGroup,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
} from "react-bootstrap";

import { connect } from "react-redux";
import PropTypes from "prop-types";
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import { useNavigate } from "react-router-dom";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";

// custom Imports
import { removeAllErrors, setErrors, setTxnPassword } from "@src/actions/auth";

const SetTxnPasswordModal = ({
  errorList,
  setErrors,
  removeAllErrors,
  setTxnPassword,
  auth: { loadingOnChangePassword },
  show,
  handleClose,
}) => {
  const initialFormData = {
    txn_password: "",
    confirmTxnPassword: "",
  };

  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { txn_password, confirmTxnPassword } = formData;

  const onChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (name === "txn_password" || name === "confirmTxnPassword") {
      setPasswordMatch(
        newFormData.txn_password === newFormData.confirmTxnPassword
      );
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const onSubmit = (e) => {
    e.preventDefault();
    removeAllErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    // Validate passwords
    let validationRules = [
      {
        path: "txn_password",
        msg: "Please provide a valid transaction password.",
      },
      {
        path: "confirmTxnPassword",
        msg: "Please confirm your transaction password.",
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (txn_password.length < 4) {
      errors.push({
        path: "txn_password",
        msg: "Password must be at least 4 characters long, including 1 digit and 1 letter.",
      });
    }

    if (errors.length || !passwordMatch) {
      setErrors(errors);
      return;
    }

    // Prepare data for submission
    const submitData = {
      txn_password: formData.txn_password,
    };

    setTxnPassword(submitData, navigate).finally(() => {
      handleClose();
    });
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Set Transaction Password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          noValidate
          validated={validated}
          onSubmit={onSubmit}
          className="p-2 authentication-form"
        >
          <Row>
            <Col xs={12}>
              <Alert variant="danger">
                Transaction password is compulsory before adding credentials.
              </Alert>
            </Col>

            <Col xs={12}>
              <Row className="mb-4">
                <Form.Group as={Col} md="12">
                  <Form.Label htmlFor="txn_password">
                    Transaction Password
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
                      placeholder="Transaction Password"
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
                    <Errors current_key="txn_password" key="txn_password" />
                  </InputGroup>
                </Form.Group>
              </Row>

              <Row className="mb-4">
                <Form.Group as={Col} md="12">
                  <Form.Label htmlFor="confirmTxnPassword">
                    Confirm Transaction Password
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmTxnPassword"
                      value={confirmTxnPassword}
                      name="confirmTxnPassword"
                      className={`text-muted ${
                        errorList.confirmTxnPassword || !passwordMatch
                          ? "form-input-invalid"
                          : ""
                      }`}
                      onChange={onChange}
                      placeholder="Confirm Transaction Password"
                      isInvalid={!passwordMatch}
                    />
                    <InputGroup.Text
                      className="show-password-icon text-muted"
                      onClick={toggleShowConfirmPassword}
                    >
                      {showConfirmPassword ? (
                        <AiOutlineEye size={20} />
                      ) : (
                        <AiOutlineEyeInvisible size={20} />
                      )}
                    </InputGroup.Text>
                    <Form.Control.Feedback type="invalid">
                      {passwordMatch
                        ? "Please provide a valid password."
                        : "Passwords do not match."}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Row>
            </Col>
          </Row>
          <Modal.Footer>
            <Button type="submit" variant="primary">
              {loadingOnChangePassword ? (
                <>
                  <Spinner size="sm" animation="border" /> Loading...
                </>
              ) : (
                "Save Txn Password"
              )}
            </Button>

            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

SetTxnPasswordModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
});

export default connect(mapStateToProps, {
  setTxnPassword,
  setErrors,
  removeAllErrors,
})(SetTxnPasswordModal);
