import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Row, Col, Container, InputGroup } from "react-bootstrap";

// Icons
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import {
  getSubAdminById,
  updateSubAdmin,
  resetComponentStore,
} from "@actions/adminSubAdminActions";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import PermissionEditor from "./PermissionEditor";
import { isAdmin } from "@src/utils/helper";

const EditSubAdmin = ({
  getSubAdminById,
  updateSubAdmin,
  currentSubAdmin,
  errorList,
  loadingSubAdmin,
  loggedInAdmin,
  resetComponentStore,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    admin_id: "",
    role: "sub_admin",
    isActive: true,
    permissions: {},
    password: "",
    txn_password: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingSubmitData, setPendingSubmitData] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showTxnPassword, setShowTxnPassword] = React.useState(false);

  useEffect(() => {
    if (id) {
      getSubAdminById(id);
    }
    return () => {
      resetComponentStore();
    };
  }, [id, getSubAdminById, resetComponentStore]);

  useEffect(() => {
    if (currentSubAdmin) {
      setFormData({
        name: currentSubAdmin.name || "",
        email: currentSubAdmin.email || "",
        admin_id: currentSubAdmin.admin_id || "",
        role: currentSubAdmin.role || "sub_admin",
        isActive: currentSubAdmin.isActive !== undefined ? currentSubAdmin.isActive : true,
        permissions: currentSubAdmin.permissions || {},
        password: "",
        txn_password: "",
      });
    }
  }, [currentSubAdmin]);

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
      { path: "admin_id", msg: "Admin ID is required" },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      return;
    }

    if (formData.password && formData.password.length < 8) {
      return;
    }

    if (formData.txn_password && formData.txn_password.length < 8) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      admin_id: formData.admin_id.trim(),
      role: formData.role,
      isActive: formData.isActive,
      permissions: formData.permissions,
    };

    if (formData.email) {
      submitData.email = formData.email.trim();
    }

    if (formData.password) {
      submitData.password = formData.password;
    }

    if (formData.txn_password) {
      submitData.txn_password = formData.txn_password;
    }

    // Show confirmation modal with transaction password
    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
  };

  const handleConfirmEdit = (txnPassword) => {
    if (pendingSubmitData && txnPassword) {
      setSubmitting(true);
      const submitDataWithTxn = { ...pendingSubmitData, txn_password: txnPassword };
      updateSubAdmin(id, submitDataWithTxn, navigate).then(() => {
        setSubmitting(false);
        setShowConfirmModal(false);
        setPendingSubmitData(null);
      });
    }
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
            <p className="text-muted">Only full admins can edit sub-admins.</p>
          </div>
        </MainCard>
      </Container>
    );
  }

  if (!currentSubAdmin) {
    return (
      <Container>
        <MainCard>
          <div className="text-center py-5">
            <p>Loading sub-admin details...</p>
          </div>
        </MainCard>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Edit Sub-Admin"
        crumbs={[
          { name: "Sub-Admins", path: "/admin/sub-admins" },
          { name: "Edit Sub-Admin" },
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
                  value={formData.admin_id}
                  onChange={onChange}
                  required
                  minLength={8}
                  maxLength={15}
                />
                <Form.Text className="text-muted">
                  Must be 8-15 alphanumeric characters
                </Form.Text>
                <Errors current_key="admin_id" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  className={errorList.email ? "invalid" : ""}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  maxLength={50}
                />
                <Errors current_key="email" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Plain Password (Admin Only) <span className="text-muted small">- Read Only</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={currentSubAdmin?.passCopy || "-"}
                    readOnly
                    className="font-monospace"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      if (currentSubAdmin?.passCopy) {
                        navigator.clipboard.writeText(currentSubAdmin.passCopy);
                      }
                    }}
                    disabled={!currentSubAdmin?.passCopy}
                    title="Copy password"
                  >
                    📋 Copy
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">
                  Current plain text password (for admin reference only). Sub-admins cannot see this.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>
                  Plain Transaction Password (Admin Only) <span className="text-muted small">- Read Only</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={currentSubAdmin?.txnPassCopy || "-"}
                    readOnly
                    className="font-monospace"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      if (currentSubAdmin?.txnPassCopy) {
                        navigator.clipboard.writeText(currentSubAdmin.txnPassCopy);
                      }
                    }}
                    disabled={!currentSubAdmin?.txnPassCopy}
                    title="Copy transaction password"
                  >
                    📋 Copy
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">
                  Current plain text transaction password (for admin reference only). Sub-admins cannot see this.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>New Password (Leave blank to keep current)</Form.Label>
                <InputGroup>
                  <Form.Control
                    className={errorList.password ? "invalid" : ""}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={onChange}
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
                  Minimum 8 characters (only if changing password)
                </Form.Text>
                <Errors current_key="password" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={4}>
              <Form.Group>
                <Form.Label>New Transaction Password (Leave blank to keep current)</Form.Label>
                <InputGroup>
                  <Form.Control
                    className={errorList.txn_password ? "invalid" : ""}
                    type={showTxnPassword ? "text" : "password"}
                    name="txn_password"
                    value={formData.txn_password}
                    onChange={onChange}
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
                  Minimum 8 characters (only if changing transaction password)
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
                {submitting || loadingSubAdmin ? "Updating..." : "Update Sub-Admin"}
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Are you sure you want to update this sub-admin? Please enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

EditSubAdmin.propTypes = {
  getSubAdminById: PropTypes.func.isRequired,
  updateSubAdmin: PropTypes.func.isRequired,
  currentSubAdmin: PropTypes.object,
  errorList: PropTypes.object,
  loadingSubAdmin: PropTypes.bool,
  loggedInAdmin: PropTypes.object,
  resetComponentStore: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentSubAdmin: state.adminSubAdmins.currentSubAdmin,
  errorList: state.errors,
  loadingSubAdmin: state.adminSubAdmins.loadingSubAdmin,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getSubAdminById,
  updateSubAdmin,
  resetComponentStore,
})(EditSubAdmin);
