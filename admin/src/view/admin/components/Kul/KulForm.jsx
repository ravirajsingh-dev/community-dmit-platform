import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";

import {
  createKul,
  updateKul,
  getKulById,
  resetComponentStore,
} from "@src/actions/adminKulActions";
import { getAllCommunities } from "@src/actions/adminCommunityActions";
import { getVanshByCommunity } from "@src/actions/adminVanshActions";

const KulForm = ({
  loggedInUser,
  currentKul,
  loadingKulList,
  loadingKul,
  createKul,
  updateKul,
  getKulById,
  resetComponentStore,
  getAllCommunities,
  getVanshByCommunity,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = React.useState({
    communityId: "",
    vanshId: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [communities, setCommunities] = React.useState([]);
  const [vanshList, setVanshList] = React.useState([]);
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
      getKulById(id);
    }
  }, [isEditMode, id, getKulById, resetComponentStore, getAllCommunities]);

  React.useEffect(() => {
    if (formData.communityId) {
      getVanshByCommunity(formData.communityId).then((data) => {
        setVanshList(data.filter((v) => !v.isDeleted && v.isActive));
      });
    } else {
      setVanshList([]);
    }
  }, [formData.communityId, getVanshByCommunity]);

  React.useEffect(() => {
    if (isEditMode && currentKul) {
      setFormData({
        communityId: currentKul.communityId?._id || currentKul.communityId || "",
        vanshId: currentKul.vanshId?._id || currentKul.vanshId || "",
        name: currentKul.name || "",
        description: currentKul.description || "",
        isActive: currentKul.isActive !== undefined ? currentKul.isActive : true,
      });
    }
  }, [isEditMode, currentKul]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : (name === "name" ? value.toUpperCase() : value),
      };
      if (name === "communityId") {
        newData.vanshId = "";
      }
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleConfirm = (txnPassword) => {
    const submitData = {
      ...formData,
      txn_password: txnPassword,
    };

    if (isEditMode) {
      updateKul(submitData, id, navigate);
    } else {
      createKul(submitData, navigate);
    }
    setShowModal(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Kul" : "Add Kul"}
        crumbs={[
          { name: "Kul", link: "/admin/kul" },
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
                  Vansh <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="vanshId"
                  value={formData.vanshId}
                  onChange={handleChange}
                  required
                  disabled={isEditMode || !formData.communityId}
                >
                  <option value="">Select Vansh</option>
                  {vanshList.map((vansh) => (
                    <option key={vansh._id} value={vansh._id}>
                      {vansh.name}
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
                  placeholder="Enter kul name"
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingKulList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/kul")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this kul? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

KulForm.propTypes = {
  createKul: PropTypes.func.isRequired,
  updateKul: PropTypes.func.isRequired,
  getKulById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentKul: state.kul.currentKul,
  loadingKulList: state.kul.loadingKulList,
  loadingKul: state.kul.loadingKul,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createKul,
  updateKul,
  getKulById,
  resetComponentStore,
  getAllCommunities,
  getVanshByCommunity,
})(KulForm);

