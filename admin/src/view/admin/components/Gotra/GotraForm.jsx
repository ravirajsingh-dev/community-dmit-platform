import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";

import {
  createGotra,
  updateGotra,
  getGotraById,
  resetComponentStore,
} from "@src/actions/adminGotraActions";
import { getAllCommunities } from "@src/actions/adminCommunityActions";
import { getVanshByCommunity } from "@src/actions/adminVanshActions";
import { getKulByVansh } from "@src/actions/adminKulActions";
import { getKhampByKul } from "@src/actions/adminKhampActions";

const GotraForm = ({
  loggedInUser,
  currentGotra,
  loadingGotraList,
  loadingGotra,
  createGotra,
  updateGotra,
  getGotraById,
  resetComponentStore,
  getAllCommunities,
  getVanshByCommunity,
  getKulByVansh,
  getKhampByKul,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = React.useState({
    communityId: "",
    vanshId: "",
    kulId: "",
    khampId: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [communities, setCommunities] = React.useState([]);
  const [vanshList, setVanshList] = React.useState([]);
  const [kulList, setKulList] = React.useState([]);
  const [khampList, setKhampList] = React.useState([]);
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
      getGotraById(id);
    }
  }, [isEditMode, id, getGotraById, resetComponentStore, getAllCommunities]);

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
    if (formData.vanshId) {
      getKulByVansh(formData.vanshId).then((data) => {
        setKulList(data.filter((k) => !k.isDeleted && k.isActive));
      });
    } else {
      setKulList([]);
    }
  }, [formData.vanshId, getKulByVansh]);

  React.useEffect(() => {
    if (formData.kulId) {
      getKhampByKul(formData.kulId).then((data) => {
        setKhampList(data.filter((k) => !k.isDeleted && k.isActive));
      });
    } else {
      setKhampList([]);
    }
  }, [formData.kulId, getKhampByKul]);

  React.useEffect(() => {
    if (isEditMode && currentGotra) {
      setFormData({
        communityId:
          currentGotra.communityId?._id || currentGotra.communityId || "",
        vanshId: currentGotra.vanshId?._id || currentGotra.vanshId || "",
        kulId: currentGotra.kulId?._id || currentGotra.kulId || "",
        khampId: currentGotra.khampId?._id || currentGotra.khampId || "",
        name: currentGotra.name || "",
        description: currentGotra.description || "",
        isActive:
          currentGotra.isActive !== undefined ? currentGotra.isActive : true,
      });
    }
  }, [isEditMode, currentGotra]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : name === "name"
              ? value.toUpperCase()
              : value,
      };
      if (name === "communityId") {
        newData.vanshId = "";
        newData.kulId = "";
        newData.khampId = "";
      } else if (name === "vanshId") {
        newData.kulId = "";
        newData.khampId = "";
      } else if (name === "kulId") {
        newData.khampId = "";
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
      updateGotra(submitData, id, navigate);
    } else {
      createGotra(submitData, navigate);
    }
    setShowModal(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Gotra" : "Add Gotra"}
        crumbs={[
          { name: "Gotra", link: "/admin/gotra" },
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
                  Kul <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="kulId"
                  value={formData.kulId}
                  onChange={handleChange}
                  required
                  disabled={isEditMode || !formData.vanshId}
                >
                  <option value="">Select Kul</option>
                  {kulList.map((kul) => (
                    <option key={kul._id} value={kul._id}>
                      {kul.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Khamp <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="khampId"
                  value={formData.khampId}
                  onChange={handleChange}
                  required
                  disabled={isEditMode || !formData.kulId}
                >
                  <option value="">Select Khamp</option>
                  {khampList.map((khamp) => (
                    <option key={khamp._id} value={khamp._id}>
                      {khamp.name}
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
                  placeholder="Enter gotra name"
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
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || loadingGotraList}
            >
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/gotra")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this gotra? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

GotraForm.propTypes = {
  createGotra: PropTypes.func.isRequired,
  updateGotra: PropTypes.func.isRequired,
  getGotraById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentGotra: state.gotra.currentGotra,
  loadingGotraList: state.gotra.loadingGotraList,
  loadingGotra: state.gotra.loadingGotra,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createGotra,
  updateGotra,
  getGotraById,
  resetComponentStore,
  getAllCommunities,
  getVanshByCommunity,
  getKulByVansh,
  getKhampByKul,
})(GotraForm);
