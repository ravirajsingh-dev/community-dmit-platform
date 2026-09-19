import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  createCommunity,
  updateCommunity,
  getCommunityById,
  resetComponentStore,
} from "@src/actions/adminCommunityActions";

const CommunityForm = ({
  loggedInUser,
  currentCommunity,
  loadingCommunitiesList,
  loadingCommunity,
  createCommunity,
  updateCommunity,
  getCommunityById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    isActive: true,
  });

  const [showModal, setShowModal] = React.useState(false);
  const [onlyOnce, setOnce] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (isEditMode && id) {
      getCommunityById(id);
    }
  }, [isEditMode, id, getCommunityById, resetComponentStore]);

  React.useEffect(() => {
    if (isEditMode && currentCommunity) {
      setFormData({
        name: currentCommunity.name || "",
        description: currentCommunity.description || "",
        isActive: currentCommunity.isActive !== undefined ? currentCommunity.isActive : true,
      });
    }
  }, [isEditMode, currentCommunity]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "name" ? value.toUpperCase() : value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleConfirm = async (txnPassword) => {
    const submitData = {
      ...formData,
      txn_password: txnPassword,
    };

    setIsSubmitting(true);
    setShowModal(false);

    if (isEditMode) {
      await updateCommunity(submitData, id, navigate);
    } else {
      await createCommunity(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Community" : "Add Community"}
        crumbs={[
          { name: "Communities", link: "/admin/communities" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter community name"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingCommunitiesList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/communities")}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        handleConfirm={handleConfirm}
        title={isEditMode ? "Confirm Update" : "Confirm Create"}
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this community? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

CommunityForm.propTypes = {
  createCommunity: PropTypes.func.isRequired,
  updateCommunity: PropTypes.func.isRequired,
  getCommunityById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentCommunity: state.community.currentCommunity,
  loadingCommunitiesList: state.community.loadingCommunitiesList,
  loadingCommunity: state.community.loadingCommunity,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createCommunity,
  updateCommunity,
  getCommunityById,
  resetComponentStore,
})(CommunityForm);
