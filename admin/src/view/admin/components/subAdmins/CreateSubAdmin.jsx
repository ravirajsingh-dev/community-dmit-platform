import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Form, Row, Col, Container, InputGroup } from "react-bootstrap";

// Icons
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import { createSubAdmin } from "@actions/adminSubAdminActions";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import PermissionEditor from "./PermissionEditor";
import { isAdmin } from "@src/utils/helper";

const CreateSubAdmin = ({
  createSubAdmin,
  errorList,
  loadingSubAdmin,
  loggedInAdmin,
}) => {
  const navigate = useNavigate();

  const initialFormData = {
    name: "",
    email: "",
    admin_id: "",
    password: "",
    txn_password: "",
    role: "sub_admin",
    isActive: true,
    permissions: {},
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showTxnPassword, setShowTxnPassword] = React.useState(false);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: newValue });
  };

  const handlePermissionsChange = (permissions) => {
    setFormData({ ...formData, permissions });
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const validationRules = [
      { path: "name", msg: "Name is required" },
      { path: "email", msg: "Email is required" },
      { path: "admin_id", msg: "Admin ID is required" },
      { path: "password", msg: "Password is required (min 8 characters)" },
      {
        path: "txn_password",
        msg: "Transaction password is required (min 8 characters)",
      },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      return;
    }

    if (formData.password.length < 8) {
      return;
    }

    if (formData.txn_password.length < 8) {
      return;
    }

    // Convert admin_id to uppercase before sending (backend will also do this, but good to do here)
    const submitData = {
      name: formData.name.trim(),
      admin_id: formData.admin_id.trim().toUpperCase(),
      email: formData.email.trim(),
      password: formData.password,
      txn_password: formData.txn_password,
      role: formData.role,
      isActive: formData.isActive,
      permissions: formData.permissions,
    };

    setSubmitting(true);
    createSubAdmin(submitData, navigate).finally(() => {
      setSubmitting(false);
    });
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    navigate("/admin/sub-admins");
  };

  // Only admins can access this page
  if (!loggedInAdmin || !isAdmin(loggedInAdmin)) {
    return (
      <Container>
        <MainCard>
          <div className="text-center py-5">
            <h5>Access Denied</h5>
            <p className="text-muted">
              Only full admins can create sub-admins.
            </p>
          </div>
        </MainCard>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Create Sub-Admin"
        crumbs={[
          { name: "Sub-Admins", path: "/admin/sub-admins" },
          { name: "Create Sub-Admin" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={onSubmit} autoComplete="off">
          <Row className="row-gap-3 mb-4">
            <Col xs={12}>
              <h5>Sub-Admin Information</h5>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.name ? "invalid" : ""}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  required
                  maxLength={50}
                />
                <Errors current_key="name" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Admin ID <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.admin_id ? "invalid" : ""}
                  type="text"
                  name="admin_id"
                  value={formData.admin_id.toUpperCase()}
                  onChange={onChange}
                  required
                  minLength={8}
                  maxLength={15}
                  placeholder="8-15 alphanumeric characters"
                />
                <Form.Text className="text-muted">
                  Must be 8-15 alphanumeric characters
                </Form.Text>
                <Errors current_key="admin_id" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Email <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.email ? "invalid" : ""}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  required
                  maxLength={50}
                />
                <Errors current_key="email" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Password <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    className={errorList.password ? "invalid" : ""}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    required
                    minLength={8}
                  />
                  <InputGroup.Text
                    className="show-password-icon text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: "pointer" }}
                  >
                    {showPassword ? (
                      <AiOutlineEye size={20} />
                    ) : (
                      <AiOutlineEyeInvisible size={20} />
                    )}
                  </InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">
                  Minimum 8 characters
                </Form.Text>
                <Errors current_key="password" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Transaction Password <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    className={errorList.txn_password ? "invalid" : ""}
                    type={showTxnPassword ? "text" : "password"}
                    name="txn_password"
                    value={formData.txn_password}
                    onChange={onChange}
                    required
                    minLength={8}
                  />
                  <InputGroup.Text
                    className="show-password-icon text-muted"
                    onClick={() => setShowTxnPassword(!showTxnPassword)}
                    style={{ cursor: "pointer" }}
                  >
                    {showTxnPassword ? (
                      <AiOutlineEye size={20} />
                    ) : (
                      <AiOutlineEyeInvisible size={20} />
                    )}
                  </InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">
                  Minimum 8 characters
                </Form.Text>
                <Errors current_key="txn_password" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Select
                  className={errorList.role ? "invalid" : ""}
                  name="role"
                  value={formData.role}
                  onChange={onChange}
                >
                  <option value="sub_admin">Sub Admin</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </Form.Select>
                <Errors current_key="role" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="isActive"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col xs={12}>
              <PermissionEditor
                permissions={formData.permissions}
                onChange={handlePermissionsChange}
              />
            </Col>
          </Row>

          <Row>
            <Col xs={12} className="d-flex gap-2 justify-content-end">
              <Button variant="secondary" onClick={onClickCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || loadingSubAdmin}
              >
                {submitting || loadingSubAdmin
                  ? "Creating..."
                  : "Create Sub-Admin"}
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Container>
  );
};

CreateSubAdmin.propTypes = {
  createSubAdmin: PropTypes.func.isRequired,
  errorList: PropTypes.object,
  loadingSubAdmin: PropTypes.bool,
  loggedInAdmin: PropTypes.object,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingSubAdmin: state.adminSubAdmins.loadingSubAdmin,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, { createSubAdmin })(CreateSubAdmin);
