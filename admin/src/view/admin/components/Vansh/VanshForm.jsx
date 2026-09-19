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
  createVansh,
  updateVansh,
  getVanshById,
  resetComponentStore,
} from "@src/actions/adminVanshActions";
import { getAllCommunities } from "@src/actions/adminCommunityActions";

const VanshForm = ({
  loggedInUser,
  currentVansh,
  loadingVanshList,
  loadingVansh,
  createVansh,
  updateVansh,
  getVanshById,
  resetComponentStore,
  getAllCommunities,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    communityId: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [communities, setCommunities] = React.useState([]);
  const [showModal, setShowModal] = React.useState(false);
  const [onlyOnce, setOnce] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      getAllCommunities().then((data) => {
        setCommunities(data.filter((c) => !c.isDeleted && c.isActive));
      });
      setOnce(false);
    }

    if (isEditMode && id) {
      getVanshById(id);
    }
  }, [isEditMode, id, getVanshById, resetComponentStore, getAllCommunities]);

  React.useEffect(() => {
    if (isEditMode && currentVansh) {
      setFormData({
        communityId: currentVansh.communityId?._id || currentVansh.communityId || "",
        name: currentVansh.name || "",
        description: currentVansh.description || "",
        isActive: currentVansh.isActive !== undefined ? currentVansh.isActive : true,
      });
    }
  }, [isEditMode, currentVansh]);

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
      await updateVansh(submitData, id, navigate);
    } else {
      await createVansh(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Vansh" : "Add Vansh"}
        crumbs={[
          { name: "Vansh", link: "/admin/vansh" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Community <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="communityId"
                  value={formData.communityId}
                  onChange={handleChange}
                  required
                  disabled={isEditMode}
                >
                  <option value="">Select Community</option>
                  {communities.map((community) => (
                    <option key={community._id} value={community._id}>
                      {community.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

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
                  placeholder="Enter vansh name"
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingVanshList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/vansh")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this vansh? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

VanshForm.propTypes = {
  createVansh: PropTypes.func.isRequired,
  updateVansh: PropTypes.func.isRequired,
  getVanshById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentVansh: state.vansh.currentVansh,
  loadingVanshList: state.vansh.loadingVanshList,
  loadingVansh: state.vansh.loadingVansh,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createVansh,
  updateVansh,
  getVanshById,
  resetComponentStore,
  getAllCommunities,
})(VanshForm);
