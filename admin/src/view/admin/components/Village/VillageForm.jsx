import React from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import AsyncSelect from "react-select/async";
import api from "@src/utils/axiosSetup";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";

import {
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
} from "@src/actions/adminVillageActions";

const VillageForm = ({
  loggedInUser,
  currentVillage,
  loadingVillagesList,
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    name: "",
    districtId: null,
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
      getVillageById(id);
    }
  }, [isEditMode, id, getVillageById, resetComponentStore]);

  React.useEffect(() => {
    if (isEditMode && currentVillage) {
      setFormData({
        name: currentVillage.name || "",
        districtId: currentVillage.districtId ? {
          value: currentVillage.districtId._id || currentVillage.districtId,
          label: currentVillage.districtId.name || currentVillage.districtId,
        } : null,
        isActive: currentVillage.isActive !== undefined ? currentVillage.isActive : true,
      });
    }
  }, [isEditMode, currentVillage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "name" ? value.toUpperCase() : value),
    }));
  };

  const handleDistrictChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      districtId: selectedOption,
    }));
  };

  const loadDistricts = async (inputValue) => {
    try {
      const res = await api.get(`/api/admin/districts?limit=1000&page=1&search=${inputValue || ""}`);
      if (res.data.status && res.data.response && res.data.response[0]) {
        return res.data.response[0].data.map((district) => ({
          value: district._id,
          label: district.name,
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.districtId && !isEditMode) {
      alert("Please select a district");
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async (txnPassword) => {
    const submitData = {
      name: formData.name,
      districtId: formData.districtId?.value || formData.districtId,
      isActive: formData.isActive,
      txn_password: txnPassword,
    };

    setIsSubmitting(true);
    setShowModal(false);

    if (isEditMode) {
      await updateVillage(submitData, id, navigate);
    } else {
      await createVillage(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Village" : "Add Village"}
        crumbs={[
          { name: "Villages", link: "/admin/villages" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  District <span className="text-danger">*</span>
                </Form.Label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadDistricts}
                  value={formData.districtId}
                  onChange={handleDistrictChange}
                  isDisabled={isEditMode}
                  placeholder="Select district"
                  isClearable={false}
                />
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
                  placeholder="Enter village name"
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingVillagesList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/villages")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this village? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

VillageForm.propTypes = {
  createVillage: PropTypes.func.isRequired,
  updateVillage: PropTypes.func.isRequired,
  getVillageById: PropTypes.func.isRequired,
};

const mapVillageToProps = (village) => ({
  currentVillage: village.village.currentVillage,
  loadingVillagesList: village.village.loadingVillagesList,
  loggedInUser: village.adminAuth.admin,
});

export default connect(mapVillageToProps, {
  createVillage,
  updateVillage,
  getVillageById,
  resetComponentStore,
})(VillageForm);
