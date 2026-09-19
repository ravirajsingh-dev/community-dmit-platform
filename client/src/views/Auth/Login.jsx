import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Image,
  InputGroup,
} from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { connect } from "react-redux";

// Custom Imports
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  login,
  setErrors,
  removeRegistrationErrors,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
} from "@src/actions/auth";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { FaRegUser, FaHome } from "react-icons/fa";
import { getUserCredentials } from "@src/utils/credentialsHelper";
import ForgotPasswordModal from "../Common/Modal/ForgotPasswordModal";
import ForgotPasswordEmailOtpModal from "../Common/Modal/ForgotPasswordEmailOtpModal";

const Login = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  login,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
  auth,
  common: { commonSettings, loadingCommonSettings },
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    memberId: "",
    password: "",
    rememberPassword: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showForgotPasswordEmailOtpModal, setShowForgotPasswordEmailOtpModal] =
    useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  const { memberId, password, rememberPassword } = formData;

  // Get loading states from Redux
  const isVerifying = auth.forgotPasswordStep1Loading;
  const isResetting = auth.forgotPasswordStep2Loading;
  const isVerifyingMemberId = auth.forgotPasswordEmailVerifyMemberIdLoading;
  const isSendingOtp = auth.forgotPasswordEmailSendOtpLoading;
  const isResendingOtp = auth.forgotPasswordEmailResendOtpLoading;
  const isVerifyingOtp = auth.forgotPasswordEmailVerifyOtpLoading;
  const isResettingPassword = auth.forgotPasswordEmailResetLoading;

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: newValue });
  };

  // Special handler for memberId input
  const handleMemberIdChange = createMemberIdChangeHandler(
    onChange,
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setFormData((prev) => ({ ...prev, memberId: formatted })),
  );
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    onChange,
    "memberId",
  );

  const toggleShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    const storedCredentials = getUserCredentials();
    if (
      storedCredentials?.rememberPassword &&
      storedCredentials?.memberId &&
      storedCredentials?.password
    ) {
      setFormData({
        ...formData,
        memberId: storedCredentials.memberId,
        password: storedCredentials.password,
        rememberPassword: true,
      });
    }
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    removeRegistrationErrors();

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
    }

    setValidated(true);

    const validationRules = [
      {
        path: "memberId",
        msg: "Please provide a valid Member ID (G followed by 9 digits).",
        validator: (value) => isValidMemberIdFormat(value),
      },
      { path: "password", msg: "Please provide a valid password." },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const submitData = Object.fromEntries(
      Object.entries(formData).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );

    login(submitData, navigate);
  };

  const handleVerifyPhone = async (phone) => {
    setForgotPasswordError("");
    try {
      const response = await forgotPasswordStep1(phone);
      return response; // Contains maskedPhone
    } catch (err) {
      setForgotPasswordError(err.message);
      throw err;
    }
  };

  const handleResetPassword = async ({ phone }) => {
    setForgotPasswordError("");
    try {
      await forgotPasswordStep2(phone);
      setForgotPasswordSuccess(
        "Your password reset request has been submitted successfully. You'll receive your new password shortly.",
      );
    } catch (err) {
      setForgotPasswordError(err.message);
      throw err;
    }
  };

  const handleCloseModal = () => {
    setShowForgotPasswordModal(false);
    setTimeout(() => {
      setForgotPasswordSuccess("");
      setForgotPasswordError("");
    }, 300);
  };

  const handleVerifyMemberId = async (memberId) => {
    try {
      const response = await verifyForgotPasswordEmailMemberId(memberId);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleSendEmailOtp = async (memberId, email) => {
    try {
      const response = await sendForgotPasswordEmailOtp(memberId, email);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleResendEmailOtp = async (memberId) => {
    try {
      const response = await resendForgotPasswordEmailOtp(memberId);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleVerifyEmailOtp = async (memberId, otp) => {
    try {
      const response = await verifyForgotPasswordEmailOtp(memberId, otp);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const handleResetPasswordWithEmailOtp = async (
    memberId,
    otp,
    password,
    confirmPassword,
  ) => {
    try {
      await resetPasswordWithEmailOtp(memberId, otp, password, confirmPassword);
      setForgotPasswordSuccess(
        "Password reset successfully! You can now login with your new password.",
      );
    } catch (err) {
      throw err;
    }
  };

  const handleCloseEmailOtpModal = () => {
    setShowForgotPasswordEmailOtpModal(false);
    setTimeout(() => {
      setForgotPasswordSuccess("");
      setForgotPasswordError("");
    }, 300);
  };

  return (
    <>
      <Container className="authentication-container" fluid>
        <Row className="authentication-form-wrapper ">
          <Col
            xs={11}
            sm={11}
            md={6}
            lg={4}
            className="authentication-card mt-0"
          >
            <Form
              noValidate
              validated={validated}
              onSubmit={onSubmit}
              className="p-2 my-2 authentication-form "
            >
              <Row className="mb-3">
                <Col
                  xs={12}
                  className="d-flex justify-content-center align-items-center mb-2"
                >
                  <Link
                    to="/"
                    className="d-flex align-items-center gap-2 text-decoration-none"
                  >
                    <FaHome size={20} /> Back to Home
                  </Link>
                </Col>
                <Col xs={12} className="authentication-heading  ">
                  <span className="secondary-color-border">
                    {loadingCommonSettings
                      ? "Loading..."
                      : commonSettings?.abbreviation
                        ? `Welcome to ${commonSettings.abbreviation}`
                        : "Welcome"}
                  </span>
                </Col>
                <Form.Group as={Col} md="12">
                  <Form.Label
                    htmlFor="memberId"
                    className="mb-2 form-label-primary"
                  >
                    <FaRegUser size={20} className="form-label-primary-icon" />
                    Member ID *
                  </Form.Label>
                  <Row>
                    <Col xs={12}>
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
                        className="text-muted"
                      />
                      <Form.Text className="text-muted">
                        Enter Member ID (G followed by 9 digits)
                      </Form.Text>
                      <Errors current_key="memberId" key="memberId" />
                    </Col>
                  </Row>
                </Form.Group>
              </Row>

              <Row className="mb-3">
                <Form.Group as={Col} md="12">
                  <Form.Label htmlFor="password" className="form-label-primary">
                    <BiLockAlt size={23} className="form-label-primary-icon" />
                    Password
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
                      placeholder="Password"
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

              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Group htmlFor="rememberPassword" className="remember-me">
                  <Form.Check
                    label="Remember password"
                    id="rememberPassword"
                    name="rememberPassword"
                    checked={rememberPassword}
                    onChange={(e) => onChange(e)}
                  />
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button
                    variant="link"
                    className="forgot-password-link"
                    onClick={() => setShowForgotPasswordEmailOtpModal(true)}
                  >
                    Forgot Password?
                  </Button>
                </div>
              </div>

              <Row className="form-button">
                <Col xs={12} className="text-center py-3">
                  <Button type="submit" className="btn-common w-100">
                    Submit
                  </Button>
                </Col>
              </Row>

              <Row className="form-button">
                <Col xs={12} className="text-center">
                  <span className="">
                    Don't have an account?{" "}
                    <Link to="/register" className="link-registration-action">
                      Register
                    </Link>
                  </span>
                </Col>
              </Row>
            </Form>
          </Col>
        </Row>
      </Container>

      {/* Enhanced Forgot Password Modal */}
      <ForgotPasswordModal
        show={showForgotPasswordModal}
        onHide={handleCloseModal}
        onVerifyPhone={handleVerifyPhone}
        onResetPassword={handleResetPassword}
        isVerifying={isVerifying}
        isResetting={isResetting}
        successMessage={forgotPasswordSuccess}
      />

      {/* Forgot Password via Email OTP Modal */}
      <ForgotPasswordEmailOtpModal
        show={showForgotPasswordEmailOtpModal}
        onHide={handleCloseEmailOtpModal}
        onVerifyMemberId={handleVerifyMemberId}
        onSendOtp={handleSendEmailOtp}
        onResendOtp={handleResendEmailOtp}
        onVerifyOtp={handleVerifyEmailOtp}
        onResetPassword={handleResetPasswordWithEmailOtp}
        isVerifyingMemberId={isVerifyingMemberId}
        isSendingOtp={isSendingOtp}
        isResendingOtp={isResendingOtp}
        isVerifyingOtp={isVerifyingOtp}
        isResetting={isResettingPassword}
        successMessage={forgotPasswordSuccess}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  auth: state.auth,
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  login,
  forgotPasswordStep1,
  forgotPasswordStep2,
  verifyForgotPasswordEmailMemberId,
  sendForgotPasswordEmailOtp,
  resendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  resetPasswordWithEmailOtp,
})(Login);
