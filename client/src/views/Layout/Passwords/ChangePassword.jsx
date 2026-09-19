import React, { useEffect, useState } from "react";
import { Col, Form, InputGroup, Row, Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";

// custom Imports
import { changePassword, removeAllErrors, setErrors } from "@src/actions/auth";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import SpinnerButton from "@src/views/Common/Loaders/SpinnerButton";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import ChangePasswordLogoutModal from "@src/views/Common/Modal/ChangePasswordLogoutModal";

const ChangePassword = ({
  errorList,
  setErrors,
  changePassword,
  removeAllErrors,
  auth: { loadingOnChangePassword, showChangePassModal },
}) => {
  const initialFormData = {
    oldPassword: "",
    password: "",
    confirmPassword: "",
  };

  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [validated, setValidated] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { oldPassword, password, confirmPassword } = formData;

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

    if (name === "password" || name === "confirmPassword") {
      setPasswordMatch(newFormData.password === newFormData.confirmPassword);
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
        path: "oldPassword",
        msg: "Please provide a valid login password.",
      },
      {
        path: "password",
        msg: "Please provide a valid password.",
      },
    ];

    const errors = validateForm(formData, validationRules);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
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
    changePassword(submitData, navigate);
  };
  return (
    <>
      <Container className="">
        <AppBreadCrumb
          title="Login Password"
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Login Password" },
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
                  <Col className="custom-heading-theam">
                    Change Login Password
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Form.Group as={Col} md="12">
                    <Form.Label
                      htmlFor="oldPassword"
                      className="form-sub-label"
                    >
                      Login password
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type={showLoginPassword ? "text" : "password"}
                        id="oldPassword"
                        value={oldPassword}
                        name="oldPassword"
                        className={`text-muted ${
                          errorList.oldPassword ? "form-input-invalid" : ""
                        }`}
                        onChange={(e) => {
                          onChange(e);
                        }}
                        placeholder="Enter login password"
                      />
                      <InputGroup.Text
                        className="show-password-icon text-muted"
                        onClick={toggleShowLoginPassword}
                      >
                        {showLoginPassword ? (
                          <AiOutlineEye size={20} />
                        ) : (
                          <AiOutlineEyeInvisible size={20} />
                        )}
                      </InputGroup.Text>
                      <Errors current_key="oldPassword" key="oldPassword" />
                    </InputGroup>
                  </Form.Group>
                </Row>
                <Row className="mb-4">
                  <Form.Group as={Col} md="12">
                    <Form.Label
                      htmlFor="password"
                      className="form-sub-label"
                    >
                      New password
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        name="password"
                        className={`text-muted ${
                          errorList.password ? "form-input-invalid" : ""
                        }`}
                        onChange={(e) => {
                          onChange(e);
                        }}
                        placeholder="New password"
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
                      <Errors current_key="password" key="password" />
                    </InputGroup>
                  </Form.Group>
                </Row>
                <Row className="mb-4">
                  <Form.Group as={Col} md="12">
                    <Form.Label
                      htmlFor="confirmPassword"
                      className="form-sub-label"
                    >
                      Confirm password
                    </Form.Label>
                    <InputGroup className="input-group-password">
                      <Form.Control
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        name="confirmPassword"
                        className={`text-muted ${
                          errorList.confirmPassword || !passwordMatch
                            ? "form-input-invalid"
                            : ""
                        }`}
                        onChange={(e) => onChange(e)}
                        placeholder="Confirm password"
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

                <Row>
                  <Col className="d-flex justify-content-center mt-3">
                    <Button type="submit" className="btn-common float-end">
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
      <ChangePasswordLogoutModal show={showChangePassModal} />
    </>
  );
};

ChangePassword.propTypes = {
  changePassword: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
});

export default connect(mapStateToProps, {
  setErrors,
  changePassword,
  removeAllErrors,
})(ChangePassword);
