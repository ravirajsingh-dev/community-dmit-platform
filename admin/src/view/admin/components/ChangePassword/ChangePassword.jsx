import React, { useEffect, useState } from "react";
import { Col, Form, InputGroup, Row, Button, Container, Tabs, Tab } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";

// custom Imports
import { changePassword, changeTxnPassword, removeAllErrors, setErrors } from "@src/actions/adminAuth";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";

const ChangePassword = ({
  errorList,
  setErrors,
  changePassword,
  changeTxnPassword,
  removeAllErrors,
  adminAuth: { loadingOnChangePassword },
}) => {
  const [activeTab, setActiveTab] = useState("password");

  // Password form data
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Transaction password form data
  const [txnPasswordFormData, setTxnPasswordFormData] = useState({
    currentTxnPassword: "",
    newTxnPassword: "",
    confirmTxnPassword: "",
  });

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [txnPasswordMatch, setTxnPasswordMatch] = useState(true);
  const [validated, setValidated] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Transaction password visibility states
  const [showCurrentTxnPassword, setShowCurrentTxnPassword] = useState(false);
  const [showNewTxnPassword, setShowNewTxnPassword] = useState(false);
  const [showConfirmTxnPassword, setShowConfirmTxnPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    removeAllErrors();
  }, []);

  const onPasswordChange = (e) => {
    if (!e.target) {
      return;
    }
    const { name, value } = e.target;
    const newFormData = { ...passwordFormData, [name]: value };
    setPasswordFormData(newFormData);

    if (name === "newPassword" || name === "confirmPassword") {
      setPasswordMatch(newFormData.newPassword === newFormData.confirmPassword);
    }
  };

  const onTxnPasswordChange = (e) => {
    if (!e.target) {
      return;
    }
    const { name, value } = e.target;
    const newFormData = { ...txnPasswordFormData, [name]: value };
    setTxnPasswordFormData(newFormData);

    if (name === "newTxnPassword" || name === "confirmTxnPassword") {
      setTxnPasswordMatch(
        newFormData.newTxnPassword === newFormData.confirmTxnPassword
      );
    }
  };

  const toggleShowCurrentPassword = () =>
    setShowCurrentPassword(!showCurrentPassword);
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);
  const toggleShowCurrentTxnPassword = () =>
    setShowCurrentTxnPassword(!showCurrentTxnPassword);
  const toggleShowNewTxnPassword = () => setShowNewTxnPassword(!showNewTxnPassword);
  const toggleShowConfirmTxnPassword = () =>
    setShowConfirmTxnPassword(!showConfirmTxnPassword);

  const onSubmitPassword = (e) => {
    e.preventDefault();
    removeAllErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    let validationRules = [
      {
        path: "currentPassword",
        msg: "Please provide your current password.",
      },
      {
        path: "newPassword",
        msg: "Please provide a valid new password.",
      },
      {
        path: "confirmPassword",
        msg: "Please confirm your new password.",
      },
    ];

    const errors = validateForm(passwordFormData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setErrors([
        {
          path: "confirmPassword",
          msg: "Passwords do not match.",
        },
      ]);
      return;
    }

    // Prepare submit data
    const submitData = {
      currentPassword: passwordFormData.currentPassword,
      newPassword: passwordFormData.newPassword,
      confirmPassword: passwordFormData.confirmPassword,
    };

    changePassword(submitData);
  };

  const onSubmitTxnPassword = (e) => {
    e.preventDefault();
    removeAllErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    let validationRules = [
      {
        path: "currentTxnPassword",
        msg: "Please provide your current transaction password.",
      },
      {
        path: "newTxnPassword",
        msg: "Please provide a valid new transaction password.",
      },
      {
        path: "confirmTxnPassword",
        msg: "Please confirm your new transaction password.",
      },
    ];

    const errors = validateForm(txnPasswordFormData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (txnPasswordFormData.newTxnPassword !== txnPasswordFormData.confirmTxnPassword) {
      setErrors([
        {
          path: "confirmTxnPassword",
          msg: "Transaction passwords do not match.",
        },
      ]);
      return;
    }

    // Prepare submit data
    const submitData = {
      currentTxnPassword: txnPasswordFormData.currentTxnPassword,
      newTxnPassword: txnPasswordFormData.newTxnPassword,
      confirmTxnPassword: txnPasswordFormData.confirmTxnPassword,
    };

    changeTxnPassword(submitData);
  };

  return (
    <>
      <Container className="">
        <AppBreadCrumb
          pageTitle="Change Password"
          crumbs={[
            { name: "Dashboard", path: "/admin/dashboard" },
            { name: "Change Password" },
          ]}
        />
        <Row>
          <Col xs={12} sm={8} md={6}>
            <MainCard>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => {
                  setActiveTab(k);
                  removeAllErrors();
                }}
                className="mb-3"
              >
                {/* Change Password Tab */}
                <Tab eventKey="password" title="Change Password">
                  <Form
                    noValidate
                    validated={validated}
                    onSubmit={onSubmitPassword}
                    className="p-2 authentication-form"
                  >
                    <Row className="mb-4 mt-3">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="currentPassword"
                          className="form-sub-label"
                        >
                          Current Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            required
                            type={showCurrentPassword ? "text" : "password"}
                            id="currentPassword"
                            value={passwordFormData.currentPassword}
                            name="currentPassword"
                            className={`text-muted ${
                              errorList.currentPassword ? "form-input-invalid" : ""
                            }`}
                            onChange={onPasswordChange}
                            placeholder="Enter current password"
                          />
                          <InputGroup.Text
                            className="show-password-icon text-muted"
                            onClick={toggleShowCurrentPassword}
                          >
                            {showCurrentPassword ? (
                              <AiOutlineEye size={20} />
                            ) : (
                              <AiOutlineEyeInvisible size={20} />
                            )}
                          </InputGroup.Text>
                          <Errors current_key="currentPassword" key="currentPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row className="mb-4">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="newPassword"
                          className="form-sub-label"
                        >
                          New Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            required
                            type={showNewPassword ? "text" : "password"}
                            id="newPassword"
                            value={passwordFormData.newPassword}
                            name="newPassword"
                            className={`text-muted ${
                              errorList.newPassword ? "form-input-invalid" : ""
                            }`}
                            onChange={onPasswordChange}
                            placeholder="Enter new password"
                          />
                          <InputGroup.Text
                            className="show-password-icon text-muted"
                            onClick={toggleShowNewPassword}
                          >
                            {showNewPassword ? (
                              <AiOutlineEye size={20} />
                            ) : (
                              <AiOutlineEyeInvisible size={20} />
                            )}
                          </InputGroup.Text>
                          <Errors current_key="newPassword" key="newPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row className="mb-4">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="confirmPassword"
                          className="form-sub-label"
                        >
                          Confirm Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup className="input-group-password">
                          <Form.Control
                            required
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPassword"
                            value={passwordFormData.confirmPassword}
                            name="confirmPassword"
                            className={`text-muted ${
                              errorList.confirmPassword || !passwordMatch
                                ? "form-input-invalid"
                                : ""
                            }`}
                            onChange={onPasswordChange}
                            placeholder="Confirm new password"
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
                          <Errors current_key="confirmPassword" key="confirmPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row>
                      <Col className="d-flex justify-content-center mt-3">
                        <Button
                          type="submit"
                          className="btn-common float-end"
                          disabled={loadingOnChangePassword}
                        >
                          {loadingOnChangePassword ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"
                              ></span>
                              Saving...
                            </>
                          ) : (
                            "Change Password"
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Tab>

                {/* Change Transaction Password Tab */}
                <Tab eventKey="txnPassword" title="Change Txn Password">
                  <Form
                    noValidate
                    validated={validated}
                    onSubmit={onSubmitTxnPassword}
                    className="p-2 authentication-form"
                  >
                    <Row className="mb-4 mt-3">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="currentTxnPassword"
                          className="form-sub-label"
                        >
                          Current Transaction Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            required
                            type={showCurrentTxnPassword ? "text" : "password"}
                            id="currentTxnPassword"
                            value={txnPasswordFormData.currentTxnPassword}
                            name="currentTxnPassword"
                            className={`text-muted ${
                              errorList.currentTxnPassword ? "form-input-invalid" : ""
                            }`}
                            onChange={onTxnPasswordChange}
                            placeholder="Enter current transaction password"
                          />
                          <InputGroup.Text
                            className="show-password-icon text-muted"
                            onClick={toggleShowCurrentTxnPassword}
                          >
                            {showCurrentTxnPassword ? (
                              <AiOutlineEye size={20} />
                            ) : (
                              <AiOutlineEyeInvisible size={20} />
                            )}
                          </InputGroup.Text>
                          <Errors current_key="currentTxnPassword" key="currentTxnPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row className="mb-4">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="newTxnPassword"
                          className="form-sub-label"
                        >
                          New Transaction Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            required
                            type={showNewTxnPassword ? "text" : "password"}
                            id="newTxnPassword"
                            value={txnPasswordFormData.newTxnPassword}
                            name="newTxnPassword"
                            className={`text-muted ${
                              errorList.newTxnPassword ? "form-input-invalid" : ""
                            }`}
                            onChange={onTxnPasswordChange}
                            placeholder="Enter new transaction password"
                          />
                          <InputGroup.Text
                            className="show-password-icon text-muted"
                            onClick={toggleShowNewTxnPassword}
                          >
                            {showNewTxnPassword ? (
                              <AiOutlineEye size={20} />
                            ) : (
                              <AiOutlineEyeInvisible size={20} />
                            )}
                          </InputGroup.Text>
                          <Errors current_key="newTxnPassword" key="newTxnPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row className="mb-4">
                      <Form.Group as={Col} md="12">
                        <Form.Label
                          htmlFor="confirmTxnPassword"
                          className="form-sub-label"
                        >
                          Confirm Transaction Password <span className="text-danger">*</span>
                        </Form.Label>
                        <InputGroup className="input-group-password">
                          <Form.Control
                            required
                            type={showConfirmTxnPassword ? "text" : "password"}
                            id="confirmTxnPassword"
                            value={txnPasswordFormData.confirmTxnPassword}
                            name="confirmTxnPassword"
                            className={`text-muted ${
                              errorList.confirmTxnPassword || !txnPasswordMatch
                                ? "form-input-invalid"
                                : ""
                            }`}
                            onChange={onTxnPasswordChange}
                            placeholder="Confirm new transaction password"
                            isInvalid={!txnPasswordMatch}
                          />
                          <InputGroup.Text
                            className="show-password-icon text-muted"
                            onClick={toggleShowConfirmTxnPassword}
                          >
                            {showConfirmTxnPassword ? (
                              <AiOutlineEye size={20} />
                            ) : (
                              <AiOutlineEyeInvisible size={20} />
                            )}
                          </InputGroup.Text>
                          <Form.Control.Feedback type="invalid">
                            {txnPasswordMatch
                              ? "Please provide a valid transaction password."
                              : "Transaction passwords do not match."}
                          </Form.Control.Feedback>
                          <Errors current_key="confirmTxnPassword" key="confirmTxnPassword" />
                        </InputGroup>
                      </Form.Group>
                    </Row>
                    <Row>
                      <Col className="d-flex justify-content-center mt-3">
                        <Button
                          type="submit"
                          className="btn-common float-end"
                          disabled={loadingOnChangePassword}
                        >
                          {loadingOnChangePassword ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"
                              ></span>
                              Saving...
                            </>
                          ) : (
                            "Change Transaction Password"
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Tab>
              </Tabs>
            </MainCard>
          </Col>
        </Row>
      </Container>
    </>
  );
};

ChangePassword.propTypes = {
  changePassword: PropTypes.func.isRequired,
  changeTxnPassword: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {
  setErrors,
  changePassword,
  changeTxnPassword,
  removeAllErrors,
})(ChangePassword);
