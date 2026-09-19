import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Form, Row, Col, Container, InputGroup } from "react-bootstrap";
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { FaRegUser, FaKey } from "react-icons/fa";
import { MdOutlinePhone } from "react-icons/md";
import { IoMailOpenOutline } from "react-icons/io5";
import { BiLockAlt } from "react-icons/bi";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";
import api from "@src/utils/axiosSetup";

import {
  createUser,
  setErrors,
  removeUserErrors,
} from "@actions/adminUserActions";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";
import { formatEPinInput, isValidEPinFormat } from "@src/utils/epinFormatter";

const AddUser = ({
  createUser,
  errorList,
  setErrors,
  removeUserErrors,
  loadingUser,
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralId: "",
    epinId: "",
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [referralValidation, setReferralValidation] = React.useState({
    isValid: null,
    referrerName: null,
    isLoading: false,
    error: null,
  });
  const referralValidationTimer = React.useRef(null);

  const validateReferralId = React.useCallback(async (referralIdValue) => {
    if (referralValidationTimer.current) {
      clearTimeout(referralValidationTimer.current);
    }
    if (!referralIdValue || referralIdValue.trim().length === 0) {
      setReferralValidation({
        isValid: null,
        referrerName: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!isValidMemberIdFormat(referralIdValue)) {
      setReferralValidation({
        isValid: false,
        referrerName: null,
        isLoading: false,
        error: "Invalid Referral ID format",
      });
      return;
    }

    setReferralValidation((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

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
    }, 400);
  }, []);

  React.useEffect(() => {
    return () => {
      if (referralValidationTimer.current) {
        clearTimeout(referralValidationTimer.current);
      }
    };
  }, []);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "phone") {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "epinId") {
      nextValue = formatEPinInput(value);
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleReferralIdChange = createMemberIdChangeHandler(onChange, "referralId");
  const handleReferralIdPaste = createMemberIdPasteHandler((formatted) => {
    setFormData((prev) => ({ ...prev, referralId: formatted }));
    validateReferralId(formatted);
  });
  const handleReferralIdKeyDown = createMemberIdKeyDownHandler(
    formData.referralId,
    onChange,
    "referralId",
  );
  const handleReferralIdChangeWithValidation = (e) => {
    handleReferralIdChange(e);
    validateReferralId(e.target.value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removeUserErrors();

    const epinValue = String(formData.epinId || "").trim();

    const validationRules = [
      {
        path: "referralId",
        msg: referralValidation.error || "Please provide a valid Referral ID",
        validator: (value) =>
          value &&
          isValidMemberIdFormat(String(value).trim().toUpperCase()) &&
          referralValidation.isValid === true,
      },
      {
        path: "name",
        msg: "Please provide a valid name",
        validator: (value) => value && String(value).trim().length >= 3,
      },
      {
        path: "phone",
        msg: "Phone number must be exactly 10 digits",
        validator: (value) =>
          value && /^\d{10}$/.test(String(value).trim()),
      },
      {
        path: "email",
        msg: "Please provide a valid email address",
        validator: (value) =>
          value && /\S+@\S+\.\S+/.test(String(value).trim()),
      },
      {
        path: "password",
        msg: "Password must be at least 6 characters",
        validator: (value) => value && String(value).length >= 6,
      },
      {
        path: "confirmPassword",
        msg: "Password and Confirm Password must match",
        validator: (value) => value && value === formData.password,
      },
    ];

    if (epinValue) {
      validationRules.splice(1, 0, {
        path: "epinId",
        msg: "Please provide a valid E-PIN",
        validator: (value) =>
          value && isValidEPinFormat(String(value).trim().toUpperCase()),
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const submitData = {};
    ["referralId", "epinId", "name", "phone", "email", "password"].forEach((key) => {
      if (formData[key] !== "" && formData[key] !== null && formData[key] !== undefined) {
        submitData[key] = String(formData[key]).trim();
      }
    });
    if (submitData.referralId) {
      submitData.referralId = submitData.referralId.toUpperCase();
    }
    if (submitData.epinId) {
      submitData.epinId = submitData.epinId.toUpperCase();
    }

    setSubmitting(true);
    createUser(submitData, navigate).then(() => {
      setSubmitting(false);
    });
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    navigate("/admin/users-list");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Add User"
        crumbs={[
          { name: "Users", path: "/admin/users-list" },
          { name: "Add User" },
        ]}
      />

      <MainCard className="card-body users-create-card">
        <div className="users-create-title">Create User (Admin)</div>
        <div className="users-create-subtitle">
          Same client registration flow. Admin can bypass E-PIN.
        </div>
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          <Row className="row-gap-3 mb-2">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="referralId" className="users-form-label">
                  <FaRegUser className="users-form-label-icon" />
                  Referral ID
                </Form.Label>
                <Form.Control
                  type="text"
                  id="referralId"
                  name="referralId"
                  value={formData.referralId}
                  onChange={handleReferralIdChangeWithValidation}
                  onPaste={handleReferralIdPaste}
                  onKeyDown={handleReferralIdKeyDown}
                  placeholder="G123456789"
                  maxLength={10}
                  className={`text-muted ${
                    errorList.referralId || referralValidation.isValid === false
                      ? "invalid"
                      : ""
                  }`}
                  isInvalid={!!errorList.referralId || referralValidation.isValid === false}
                />
                {referralValidation.isLoading && (
                  <Form.Text className="text-info">Validating...</Form.Text>
                )}
                {referralValidation.isValid === true && referralValidation.referrerName && (
                  <Form.Text className="text-success">
                    Referral belongs to: {referralValidation.referrerName}
                  </Form.Text>
                )}
                {referralValidation.isValid === false && referralValidation.error && (
                  <Form.Text className="text-danger">{referralValidation.error}</Form.Text>
                )}
                <Errors current_key="referralId" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="epinId" className="users-form-label">
                  <FaKey className="users-form-label-icon" />
                  E-PIN
                </Form.Label>
                <Form.Control
                  type="text"
                  id="epinId"
                  name="epinId"
                  value={formData.epinId}
                  onChange={onChange}
                  placeholder="G8F7K29J3L9X2Q1R5T6"
                  maxLength={20}
                  className={`text-muted ${errorList.epinId ? "invalid" : ""}`}
                />
                <Form.Text className="text-muted">
                  Optional for admin: leave blank to bypass E-PIN.
                </Form.Text>
                <Errors current_key="epinId" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="name" className="users-form-label">
                  <FaRegUser className="users-form-label-icon" />
                  Name
                </Form.Label>
                <Form.Control
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  placeholder="Enter user full name"
                  className={`text-muted ${errorList.name ? "invalid" : ""}`}
                />
                <Errors current_key="name" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="phone" className="users-form-label">
                  <MdOutlinePhone className="users-form-label-icon" />
                  Phone Number
                </Form.Label>
                <Form.Control
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  maxLength={10}
                  placeholder="Enter 10-digit phone number"
                  className={`text-muted ${errorList.phone ? "invalid" : ""}`}
                />
                <Errors current_key="phone" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="email" className="users-form-label">
                  <IoMailOpenOutline className="users-form-label-icon" />
                  Email
                </Form.Label>
                <Form.Control
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  placeholder="Enter email address"
                  className={`text-muted ${errorList.email ? "invalid" : ""}`}
                />
                <Errors current_key="email" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
              <Form.Label htmlFor="password" className="users-form-label">
                <BiLockAlt className="users-form-label-icon" />
                Password
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  placeholder="Enter password"
                  className={`text-muted ${errorList.password ? "invalid" : ""}`}
                />
                <InputGroup.Text
                  className="show-password-icon text-muted"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
                </InputGroup.Text>
              </InputGroup>
              <Form.Text
                className={formData.password && formData.password.length >= 6 ? "text-success" : "text-muted"}
              >
                Password must be minimum 6 characters
              </Form.Text>
              <Errors current_key="password" />
            </Form.Group>
          </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label htmlFor="confirmPassword" className="users-form-label">
                  <BiLockAlt className="users-form-label-icon" />
                  Confirm Password
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    placeholder="Confirm password"
                    className={`text-muted ${errorList.confirmPassword ? "invalid" : ""}`}
                  />
                  <InputGroup.Text
                    className="show-password-icon text-muted"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <AiOutlineEye size={18} />
                    ) : (
                      <AiOutlineEyeInvisible size={18} />
                    )}
                  </InputGroup.Text>
                </InputGroup>
                {formData.confirmPassword ? (
                  <Form.Text
                    className={
                      formData.password === formData.confirmPassword
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {formData.password === formData.confirmPassword
                      ? "Password matched"
                      : "Password does not match"}
                  </Form.Text>
                ) : null}
                <Errors current_key="confirmPassword" />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col xs={12} className="text-end">
              <Button
                className="m-2"
                type="submit"
                variant="primary"
                disabled={submitting || loadingUser}
              >
                {submitting || loadingUser ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
              <Button
                className="m-2"
                type="button"
                variant="secondary"
                onClick={onClickCancel}
                disabled={submitting || loadingUser}
              >
                Cancel
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Container>
  );
};

AddUser.propTypes = {
  createUser: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeUserErrors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingUser: state.adminUsers.loadingUser,
});

export default connect(mapStateToProps, {
  createUser,
  setErrors,
  removeUserErrors,
})(AddUser);
