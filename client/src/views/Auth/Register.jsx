import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { connect } from "react-redux";

// Icons
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { BiLockAlt } from "react-icons/bi";
import { FaRegUser, FaHome, FaKey } from "react-icons/fa";
import { MdOutlinePhone } from "react-icons/md";
import { IoMailOpenOutline } from "react-icons/io5";

// Custom Imports
import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import {
  register,
  setErrors,
  removeRegistrationErrors,
} from "@src/actions/auth";
import { setAlert } from "@src/actions/alert";
import { handleNumberInput } from "@src/utils/helper";
import WelcomeModal from "@src/views/Common/Modal/WelcomeModal";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";
import { isValidEPinFormat, formatEPinInput } from "@src/utils/epinFormatter";
import api from "@src/utils/axiosSetup";

const Register = ({
  errorList,
  setErrors,
  removeRegistrationErrors,
  register,
  loadingRegister,
  setAlert,
  common: { commonSettings, loadingCommonSettings },
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialFormData = {
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralId: "",
    epinId: "",
    terms_accepted: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    memberId: "",
    name: "",
    password: "",
  });
  const [referralValidation, setReferralValidation] = useState({
    isValid: null,
    referrerName: null,
    isLoading: false,
    error: null,
  });

  const hasReferralParamsFromUrl = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return !!(q.get("referralId") || q.get("epinId") || q.get("epin"));
  }, [location.search]);

  const {
    name,
    phone,
    email,
    password,
    confirmPassword,
    referralId,
    epinId,
    terms_accepted,
  } = formData;

  // Validate referral ID
  const validateReferralId = async (referralIdValue) => {
    // Clear existing timer
    if (referralValidationTimer.current) {
      clearTimeout(referralValidationTimer.current);
    }

    // Reset validation state if empty
    if (!referralIdValue || referralIdValue.trim().length === 0) {
      setReferralValidation({
        isValid: null,
        referrerName: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check format first
    if (!isValidMemberIdFormat(referralIdValue)) {
      setReferralValidation({
        isValid: false,
        referrerName: null,
        isLoading: false,
        error: "Invalid Referral ID format",
      });
      return;
    }

    // Set loading state
    setReferralValidation((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    // Debounce API call
    referralValidationTimer.current = setTimeout(async () => {
      try {
        const response = await api.get("/api/auth/users/validate-referral", {
          params: { referralId: referralIdValue.trim().toUpperCase() },
        });

        if (response.data.status === true && response.data.response.valid) {
          setReferralValidation({
            isValid: true,
            referrerName: response.data.response.referrerName,
            isLoading: false,
            error: null,
          });
        } else {
          setReferralValidation({
            isValid: false,
            referrerName: null,
            isLoading: false,
            error: response.data.message || "Invalid Referral ID",
          });
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Error validating Referral ID";
        setReferralValidation({
          isValid: false,
          referrerName: null,
          isLoading: false,
          error: errorMessage,
        });
      }
    }, 500); // 500ms debounce
  };

  useEffect(() => {
    // Get referralId and epinId from URL query params
    const queryParams = new URLSearchParams(location.search);
    const urlReferralId = queryParams.get("referralId");
    const urlEpinId =
      queryParams.get("epinId") || queryParams.get("epin") || "";
    setFormData((prevData) => ({
      ...prevData,
      ...(urlReferralId && { referralId: urlReferralId }),
      ...(urlEpinId && { epinId: urlEpinId }),
    }));
    if (urlReferralId) {
      validateReferralId(urlReferralId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Debounce timer for referral validation
  const referralValidationTimer = React.useRef(null);

  // Handle referral ID change
  const handleReferralIdChangeWithValidation = (e) => {
    handleReferralIdChange(e);
    const value = e.target.value;
    validateReferralId(value);
  };

  useEffect(() => {
    // Component cleanup on unmount
    return () => {
      removeRegistrationErrors();
    };
  }, [removeRegistrationErrors]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === "epinId" && typeof newValue === "string") {
      newValue = formatEPinInput(newValue);
    }
    setFormData({ ...formData, [name]: newValue });
  };

  // Special handler for referralId input
  const handleReferralIdChange = createMemberIdChangeHandler(
    onChange,
    "referralId",
  );
  const handleReferralIdPaste = createMemberIdPasteHandler((formatted) => {
    setFormData((prev) => ({ ...prev, referralId: formatted }));
    validateReferralId(formatted);
  });
  const handleReferralIdKeyDown = createMemberIdKeyDownHandler(
    referralId,
    onChange,
    "referralId",
  );

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const handlePaymentInit = async (e) => {
    try {
      e.preventDefault();
      removeRegistrationErrors();
      setIsLoading(true);

      const form = e.currentTarget;
      if (form.checkValidity() === false) {
        e.stopPropagation();
        setIsLoading(false);
        setValidated(true);
        return;
      }

      setValidated(true);

      if (!formData.referralId || !formData.referralId.trim()) {
        setErrors([
          {
            path: "referralId",
            msg: "Referral ID is required",
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (!formData.epinId || !formData.epinId.trim()) {
        setErrors([
          {
            path: "epinId",
            msg: "E-PIN is required",
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (!isValidEPinFormat(formData.epinId)) {
        setErrors([
          {
            path: "epinId",
            msg: "Invalid E-PIN format. Expected: G followed by 19 characters (e.g. G8F7K29J3L9X2Q1R5T6)",
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (referralValidation.isValid !== true || referralValidation.isLoading) {
        setErrors([
          {
            path: "referralId",
            msg:
              referralValidation.error ||
              (referralValidation.isLoading
                ? "Please wait while we validate your Referral ID"
                : "Please provide a valid Referral ID"),
          },
        ]);
        setIsLoading(false);
        return;
      }

      const validationRules = [
        {
          path: "name",
          msg: "Please provide a valid name.",
        },
        {
          path: "phone",
          msg: "Please provide a valid phone number.",
          validator: (value) => value.length === 10,
        },
        {
          path: "email",
          msg: "Please provide a valid email address.",
          validator: (value) => value && /\S+@\S+\.\S+/.test(value),
        },
        {
          path: "password",
          msg: "Password must be at least 6 characters.",
          validator: (value) => value.length >= 6,
        },
        {
          path: "confirmPassword",
          msg: "Passwords do not match.",
          validator: (value) => value === formData.password,
        },
        {
          path: "terms_accepted",
          msg: "You must accept the terms and conditions.",
          validator: (value) => value === true,
        },
        {
          path: "referralId",
          msg:
            referralValidation.error || "Please provide a valid Referral ID.",
          validator: (value) => {
            if (!value || !value.trim()) return false;
            if (!isValidMemberIdFormat(value)) return false;
            if (referralValidation.isValid !== true) return false;
            return true;
          },
        },
        {
          path: "epinId",
          msg: "Please provide a valid E-PIN.",
          validator: (value) => value && isValidEPinFormat(value),
        },
      ];

      const errors = validateForm(formData, validationRules);
      if (errors.length) {
        setErrors(errors);
        setIsLoading(false);
        return;
      }

      const submitData = {
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        referralId: formData.referralId.trim().toUpperCase(),
        epinId: formData.epinId.trim().toUpperCase(),
      };

      if (formData.email) {
        submitData.email = formData.email;
      }

      const tempRes = await register(submitData);

      if (tempRes?.status && tempRes?.response?.user) {
        setRegistrationData({
          memberId: tempRes.response.user.memberId,
          name: formData.name,
          password: formData.password,
        });
        setShowWelcomeModal(true);
        setIsLoading(false);
      } else if (!tempRes?.response?.orderToken) {
        const errMsg =
          tempRes?.message ||
          tempRes?.errors?.[0]?.msg ||
          "Registration failed";
        throw new Error(errMsg);
      }
    } catch (error) {
      console.error("Payment init error:", error);
      setIsPaymentProcessing(false);
      setIsLoading(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "An error occurred during payment initialization. Please try again.";
      setAlert(errorMessage, "error");
    }

    // register(submitData)
    //   .then((response) => {
    //     if (response?.memberId) {
    //       // Registration successful, show welcome modal
    //       setRegistrationData({
    //         memberId: response.memberId,
    //         name: formData.name,
    //         password: formData.password,
    //       });
    //       setShowWelcomeModal(true);
    //     }
    //   })
    //   .catch((error) => {
    //     console.error("Registration failed:", error);
    //     setIsLoading(false);
    //   })
    //   .finally(() => {
    //     setIsLoading(false);
    //   });
  };

  return (
    <>
      {/* Payment Processing Overlay */}
      {isPaymentProcessing && (
        <div className="register-payment-overlay">
          <Spinner
            animation="border"
            variant="light"
            size="lg"
            className="register-payment-overlay-spinner"
          />
          <div className="register-payment-overlay-title">
            Processing payment...
          </div>
          <div className="register-payment-overlay-subtitle">
            Please wait while we redirect you to the payment gateway
          </div>
        </div>
      )}

      <Container className="authentication-container" fluid>
        <Row className="authentication-form-wrapper">
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
              // onSubmit={onSubmit}
              className="p-2 my-2 authentication-form"
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
                <Col xs={12} className="authentication-heading">
                  <span className="secondary-color-border">
                    {loadingCommonSettings
                      ? "Loading..."
                      : commonSettings?.abbreviation
                        ? `Begin Your ${commonSettings.abbreviation} Journey`
                        : "Begin Your Journey"}
                  </span>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label
                      htmlFor="referralId"
                      className="form-label-primary"
                    >
                      <FaRegUser
                        size={20}
                        className="form-label-primary-icon"
                      />
                      Referral ID *
                    </Form.Label>
                    <Form.Control
                      required
                      type="text"
                      id="referralId"
                      name="referralId"
                      value={referralId}
                      readOnly={hasReferralParamsFromUrl}
                      onChange={
                        hasReferralParamsFromUrl
                          ? undefined
                          : handleReferralIdChangeWithValidation
                      }
                      onPaste={
                        hasReferralParamsFromUrl
                          ? undefined
                          : handleReferralIdPaste
                      }
                      onKeyDown={
                        hasReferralParamsFromUrl
                          ? undefined
                          : handleReferralIdKeyDown
                      }
                      placeholder="G123456789"
                      minLength={10}
                      maxLength={10}
                      isInvalid={
                        !!errorList.referralId ||
                        referralValidation.isValid === false
                      }
                      className={`text-muted ${
                        errorList.referralId ||
                        referralValidation.isValid === false
                          ? "form-input-invalid"
                          : referralValidation.isValid === true
                            ? "form-input-valid"
                            : ""
                      }`}
                    />
                    {referralValidation.isLoading && (
                      <Form.Text className="text-info">Validating...</Form.Text>
                    )}
                    {referralValidation.isValid === true &&
                      referralValidation.referrerName && (
                        <Form.Text className="text-success">
                          Referred by: {referralValidation.referrerName}
                        </Form.Text>
                      )}
                    {referralValidation.isValid === false &&
                      referralValidation.error && (
                        <Form.Text className="text-danger">
                          {referralValidation.error}
                        </Form.Text>
                      )}
                    <Form.Control.Feedback type="invalid">
                      {errorList.referralId ||
                        (referralValidation.isValid === false
                          ? referralValidation.error
                          : "Referral ID is required")}
                    </Form.Control.Feedback>
                    <Errors current_key="referralId" key="referralId" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label htmlFor="epinId" className="form-label-primary">
                      <FaKey size={20} className="form-label-primary-icon" />
                      E-PIN *
                    </Form.Label>
                    <Form.Control
                      required
                      type="text"
                      id="epinId"
                      name="epinId"
                      value={epinId}
                      readOnly={hasReferralParamsFromUrl}
                      onChange={hasReferralParamsFromUrl ? undefined : onChange}
                      placeholder="G8F7K29J3L9X2Q1R5T6"
                      minLength={20}
                      maxLength={20}
                      className={`text-muted ${
                        errorList.epinId ? "form-input-invalid" : ""
                      }`}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errorList.epinId || "E-PIN is required"}
                    </Form.Control.Feedback>
                    <Errors current_key="epinId" key="epinId" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label htmlFor="name" className="form-label-primary">
                      <FaRegUser
                        size={20}
                        className="form-label-primary-icon"
                      />
                      Name *
                    </Form.Label>
                    <Form.Control
                      required
                      type="text"
                      id="name"
                      name="name"
                      value={name}
                      onChange={onChange}
                      placeholder="Enter your full name"
                      className={`text-muted ${
                        errorList.name ? "form-input-invalid" : ""
                      }`}
                    />
                    <Errors current_key="name" key="name" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label htmlFor="phone" className="form-label-primary">
                      <MdOutlinePhone
                        size={24}
                        className="form-label-primary-icon"
                      />
                      Phone Number *
                    </Form.Label>
                    <Form.Control
                      required
                      type="tel"
                      id="phone"
                      name="phone"
                      value={phone}
                      onChange={onChange}
                      maxLength="10"
                      minLength="10"
                      placeholder="Enter your phone number"
                      className={`text-muted ${
                        errorList.phone ? "form-input-invalid" : ""
                      }`}
                      onKeyDown={handleNumberInput}
                    />
                    <Errors current_key="phone" key="phone" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label htmlFor="email" className="form-label-primary">
                      <IoMailOpenOutline
                        size={22}
                        className="form-label-primary-icon"
                      />
                      Email *
                    </Form.Label>
                    <Form.Control
                      required
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={onChange}
                      placeholder="Enter your email address"
                      className={`text-muted ${
                        errorList.email ? "form-input-invalid" : ""
                      }`}
                    />
                    <Errors current_key="email" key="email" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label
                      htmlFor="password"
                      className="form-label-primary"
                    >
                      <BiLockAlt
                        size={23}
                        className="form-label-primary-icon"
                      />
                      Password *
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        placeholder="Enter password (min 6 characters)"
                        className={`text-muted ${
                          errorList.password ? "form-input-invalid" : ""
                        }`}
                        minLength={6}
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
                    <Errors current_key="password" key="password" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label
                      htmlFor="confirmPassword"
                      className="form-label-primary"
                    >
                      <BiLockAlt
                        size={23}
                        className="form-label-primary-icon"
                      />
                      Confirm Password *
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={onChange}
                        placeholder="Confirm your password"
                        className={`text-muted ${
                          errorList.confirmPassword ? "form-input-invalid" : ""
                        }`}
                        minLength={6}
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
                    </InputGroup>
                    <Errors
                      current_key="confirmPassword"
                      key="confirmPassword"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <Form.Group htmlFor="terms_accepted" className="remember-me">
                    <Form.Check
                      type="checkbox"
                      id="terms_accepted"
                      name="terms_accepted"
                      checked={terms_accepted}
                      onChange={onChange}
                      label="I accept the terms and conditions *"
                      className={
                        errorList.terms_accepted ? "form-input-invalid" : ""
                      }
                    />
                    <Errors current_key="terms_accepted" key="terms_accepted" />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="form-button">
                <Col xs={12} className="text-center py-3">
                  <Button
                    type="submit"
                    className="btn-common w-100"
                    disabled={isLoading || loadingRegister}
                    onClick={handlePaymentInit}
                  >
                    {isLoading || loadingRegister
                      ? "Registering..."
                      : "Register"}
                  </Button>
                </Col>
              </Row>

              <Row className="form-button">
                <Col xs={12} className="text-center">
                  <span>
                    Already have an account?{" "}
                    <Link to="/login" className="link-registration-action">
                      Login
                    </Link>
                  </span>
                </Col>
              </Row>
            </Form>
          </Col>
        </Row>
      </Container>

      {/* Welcome Modal */}
      <WelcomeModal
        show={showWelcomeModal}
        onHide={() => {
          setShowWelcomeModal(false);
          navigate("/login");
        }}
        name={registrationData.name}
        memberId={registrationData.memberId}
        password={registrationData.password}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingRegister: state.auth.loadingRegister,
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  removeRegistrationErrors,
  register,
  setAlert,
})(Register);
