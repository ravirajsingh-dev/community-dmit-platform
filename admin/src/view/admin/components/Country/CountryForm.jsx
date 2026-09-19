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
  createCountry,
  updateCountry,
  getCountryById,
  resetComponentStore,
} from "@src/actions/adminCountryActions";

const CountryForm = ({
  loggedInUser,
  currentCountry,
  loadingCountriesList,
  loadingCountry,
  createCountry,
  updateCountry,
  getCountryById,
  resetComponentStore,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const loggedInAdmin = loggedInUser;

  const [formData, setFormData] = React.useState({
    name: "",
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
      getCountryById(id);
    }
  }, [isEditMode, id, getCountryById, resetComponentStore]);

  React.useEffect(() => {
    if (isEditMode && currentCountry) {
      setFormData({
        name: currentCountry.name || "",
        isActive: currentCountry.isActive !== undefined ? currentCountry.isActive : true,
      });
    }
  }, [isEditMode, currentCountry]);

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
      await updateCountry(submitData, id, navigate);
    } else {
      await createCountry(submitData, navigate);
    }

    setIsSubmitting(false);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle={isEditMode ? "Edit Country" : "Add Country"}
        crumbs={[
          { name: "Countries", link: "/admin/countries" },
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
                  placeholder="Enter country name"
                  disabled={isEditMode}
                />
                {isEditMode && (
                  <Form.Text className="text-muted">
                    Country name cannot be changed after creation
                  </Form.Text>
                )}
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
            <Button type="submit" variant="primary" disabled={isSubmitting || loadingCountriesList}>
              {isEditMode ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/countries")}
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
        body={`Are you sure you want to ${isEditMode ? "update" : "create"} this country? Please enter your transaction password to confirm.`}
        submitBtnText={isEditMode ? "Update" : "Create"}
      />
    </Container>
  );
};

CountryForm.propTypes = {
  createCountry: PropTypes.func.isRequired,
  updateCountry: PropTypes.func.isRequired,
  getCountryById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentCountry: state.country.currentCountry,
  loadingCountriesList: state.country.loadingCountriesList,
  loadingCountry: state.country.loadingCountry,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  createCountry,
  updateCountry,
  getCountryById,
  resetComponentStore,
})(CountryForm);
