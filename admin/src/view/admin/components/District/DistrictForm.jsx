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
  createDistrict,
  updateDistrict,
  getDistrictById,
  resetComponentStore,
} from "@src/actions/adminDistrictActions";

const DistrictForm = ({
  loggedInUser,
  currentDistrict,
  loadingDistrictsList,
  createDistrict,
  updateDistrict,
  getDistrictById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    name: "",
    stateId: null,
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
      getDistrictById(id);
    }
  }, [isEditMode, id, getDistrictById, resetComponentStore]);

  React.useEffect(() => {
    if (isEditMode && currentDistrict) {
      setFormData({
        name: currentDistrict.name || "",
        stateId: currentDistrict.stateId ? {
          value: currentDistrict.stateId._id || currentDistrict.stateId,
          label: currentDistrict.stateId.name || currentDistrict.stateId,
        } : null,
        isActive: currentDistrict.isActive !== undefined ? currentDistrict.isActive : true,
      });
    }
  }, [isEditMode, currentDistrict]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "name" ? value.toUpperCase() : value),
    }));
  };

  const handleStateChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      stateId: selectedOption,
    }));
  };

  const loadStates = async (inputValue) => {
    try {
      const res = await api.get(`/api/admin/states?limit=1000&page=1&search=${inputValue || ""}`);
      if (res.data.status && res.data.response && res.data.response[0]) {
        return res.data.response[0].data.map((state) => ({
          value: state._id,
          label: state.name,
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.stateId && !isEditMode) {
      alert("Please select a state");
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async (txnPassword) => {
    const submitData = {
      name: formData.name,
      stateId: formData.stateId?.value || formData.stateId,
      isActive: formData.isActive,
      txn_password: txnPassword,
    };

    setIsSubmitting(true);
    setShowModal(false);

    if (isEditMode) {
      await updateDistrict(submitData, id, navigate);
    } else {
      await createDistrict(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit District" : "Add District"}
        crumbs={[
          { name: "Districts", link: "/admin/districts" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  State <span className="text-danger">*</span>
                </Form.Label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadStates}
                  value={formData.stateId}
                  onChange={handleStateChange}
                  isDisabled={isEditMode}
                  placeholder="Select state"
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
                  placeholder="Enter district name"
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingDistrictsList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/districts")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this district? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

DistrictForm.propTypes = {
  createDistrict: PropTypes.func.isRequired,
  updateDistrict: PropTypes.func.isRequired,
  getDistrictById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentDistrict: state.district.currentDistrict,
  loadingDistrictsList: state.district.loadingDistrictsList,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createDistrict,
  updateDistrict,
  getDistrictById,
  resetComponentStore,
})(DistrictForm);
