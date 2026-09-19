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
  createState,
  updateState,
  getStateById,
  resetComponentStore,
} from "@src/actions/adminStateActions";

const StateForm = ({
  loggedInUser,
  currentState,
  loadingStatesList,
  createState,
  updateState,
  getStateById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    name: "",
    countryId: null,
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
      getStateById(id);
    }
  }, [isEditMode, id, getStateById, resetComponentStore]);

  React.useEffect(() => {
    if (isEditMode && currentState) {
      setFormData({
        name: currentState.name || "",
        countryId: currentState.countryId ? {
          value: currentState.countryId._id || currentState.countryId,
          label: currentState.countryId.name || currentState.countryId,
        } : null,
        isActive: currentState.isActive !== undefined ? currentState.isActive : true,
      });
    }
  }, [isEditMode, currentState]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "name" ? value.toUpperCase() : value),
    }));
  };

  const handleCountryChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      countryId: selectedOption,
    }));
  };

  const loadCountries = async (inputValue) => {
    try {
      const res = await api.get(`/api/admin/countries?limit=1000&page=1&search=${inputValue || ""}`);
      if (res.data.status && res.data.response && res.data.response[0]) {
        return res.data.response[0].data.map((country) => ({
          value: country._id,
          label: country.name,
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.countryId && !isEditMode) {
      alert("Please select a country");
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async (txnPassword) => {
    const submitData = {
      name: formData.name,
      countryId: formData.countryId?.value || formData.countryId,
      isActive: formData.isActive,
      txn_password: txnPassword,
    };

    setIsSubmitting(true);
    setShowModal(false);

    if (isEditMode) {
      await updateState(submitData, id, navigate);
    } else {
      await createState(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit State" : "Add State"}
        crumbs={[
          { name: "States", link: "/admin/states" },
          { name: isEditMode ? "Edit" : "Add" },
        ]}
      />

      <MainCard>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Country <span className="text-danger">*</span>
                </Form.Label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCountries}
                  value={formData.countryId}
                  onChange={handleCountryChange}
                  isDisabled={isEditMode}
                  placeholder="Select country"
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
                  placeholder="Enter state name"
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingStatesList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/states")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this state? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

StateForm.propTypes = {
  createState: PropTypes.func.isRequired,
  updateState: PropTypes.func.isRequired,
  getStateById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentState: state.state.currentState,
  loadingStatesList: state.state.loadingStatesList,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createState,
  updateState,
  getStateById,
  resetComponentStore,
})(StateForm);
