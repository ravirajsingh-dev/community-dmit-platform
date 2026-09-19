import React, { useEffect, useState } from "react";
import { Col, Form, InputGroup, Row, Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";

// custom Imports
import { removeAllErrors, setErrors, setTxnPassword } from "@src/actions/auth";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import SpinnerButton from "@src/views/Common/Loaders/SpinnerButton";
import ChangePasswordLogoutModal from "@src/views/Common/Modal/ChangePasswordLogoutModal";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";

const SetTransactionPassword = ({
  errorList,
  setErrors,
  removeAllErrors,
  setTxnPassword,
  auth: { loadingOnChangePassword, showChangePassModal },
}) => {
  const initialFormData = {
    txn_password: "",
    confirmTxnPassword: "",
  };
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [validated, setValidated] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { txn_password, confirmTxnPassword } = formData;

  useEffect(() => {
    removeAllErrors();
  }, []);

  const onChange = (e) => {
    if (!e.target) {
      return;
    }
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (name === "txn_password" || name === "confirmTxnPassword") {
      setPasswordMatch(
        newFormData.txn_password === newFormData.confirmTxnPassword
      );
    }
  };

  const toggleShowLoginPassword = () =>
    setShowLoginPassword(!showLoginPassword);
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

    let validationRules = [
      {
        path: "txn_password",
        msg: "Please provide a valid TXN Password.",
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (formData.txn_password !== formData.confirmTxnPassword) {
      return;
    }

    const submitData = {};

    for (let i in formData) {
      if (
        formData[i] === "" ||
        formData[i] === null ||
        formData[i] === undefined
      )
        continue;
      submitData[i] = formData[i];
    }

    // do validation here
    setTxnPassword(submitData, navigate);
  };
  return (
    <>
      <Container className="">
        <AppBreadCrumb
          title="Set Transaction Password"
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Set Transaction Password" },
          ]}
        />
        <Form
          noValidate
          validated={validated}
          onSubmit={onSubmit}
          className="p-2  authentication-form "
        >
          <Row>
            <Col xs={12} sm={8} md={5}>
              <MainCard>
                <Row>
                  <Col className="section-heading-styled">
                    Set Transaction Password
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Form.Group as={Col} md="12">
                    <Form.Label htmlFor="txn_password">
                      New Transaction Password
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
                        onChange={(e) => {
                          onChange(e);
                        }}
                        placeholder="New Transaction Password"
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
                      Confirm Transaction password
                    </Form.Label>
                    <InputGroup className="input-group-password">
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
                        onChange={(e) => onChange(e)}
                        placeholder="Confirm Transaction password"
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

                <Row className="">
                  <Col className="d-flex justify-content-center mt-3">
                    <Button type="submit" className="btn-common">
                      {loadingOnChangePassword ? (
                        <>
                          <SpinnerButton /> Loading...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </Col>
                </Row>
              </MainCard>
            </Col>
          </Row>
        </Form>
      </Container>
      {/* <ChangePasswordLogoutModal show={showChangePassModal} /> */}
    </>
  );
};

SetTransactionPassword.propTypes = {
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
})(SetTransactionPassword);
