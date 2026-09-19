import React, { useState, useEffect } from "react";
import {
  Button,
  Row,
  Col,
  Container,
  Badge,
  Modal,
  Form,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { VscEdit } from "react-icons/vsc";
import { RiDeleteBin5Line } from "react-icons/ri";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import Errors from "@src/notifications/Errors";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import SetTxnPasswordModal from "@src/view/admin/modals/SetTxnPasswordModal";

import {
  getDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
} from "@src/actions/adminDonationActions";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { validateForm } from "@src/utils/validation";
import { hasPermission } from "@src/utils/permissions";
import { initialSortingParams } from "@src/constants";

const DonationButtonsList = ({
  loggedInAdmin,
  donationButtons,
  getDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
  loadingDonationButtons,
  loadingOnDonationButtonSubmit,
  setErrorsList,
  errorList,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showTxnPasswordModal, setShowTxnPasswordModal] = useState(false);
  const [selectedButton, setSelectedButton] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const initialFormData = {
    amount: "",
    type: "FIXED",
    buttonText: "",
    isActive: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    getDonationButtons();
  }, [getDonationButtons]);

  const columns = [
    {
      name: "Amount",
      selector: (row) => (row.type === "ANY" ? "Any Amount" : `₹${row.amount}`),
      sortable: true,
      width: "120px",
      wrap: true,
    },
    {
      name: "Button Text",
      selector: (row) => row.buttonText || "-",
      sortable: true,
      width: "200px",
      wrap: true,
    },
    {
      name: "Type",
      selector: (row) => (
        <Badge bg={row.type === "FIXED" ? "primary" : "info"}>{row.type}</Badge>
      ),
      sortable: true,
      width: "100px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge bg={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      sortable: true,
      width: "120px",
      wrap: true,
    },
    {
      name: "Actions",
      width: "120px",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "donation", "buttons") && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleEditClick(row)}
              title="Edit"
            >
              <VscEdit size={16} />
            </Button>
          )}
          {hasPermission(loggedInAdmin, "donation", "buttons") && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleDeleteClick(row)}
              title="Delete"
            >
              <RiDeleteBin5Line size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreateClick = () => {
    setFormData(initialFormData);
    setIsEditMode(false);
    setSelectedButton(null);
    // Clear errors
    setErrorsList("", "amount");
    setErrorsList("", "type");
    setErrorsList("", "buttonText");
    setShowModal(true);
  };

  const handleEditClick = (button) => {
    setFormData({
      amount: button.amount || 0,
      type: button.type,
      buttonText: button.buttonText || "",
      isActive: button.isActive,
    });
    setSelectedButton(button);
    setIsEditMode(true);
    // Clear errors
    setErrorsList("", "amount");
    setErrorsList("", "type");
    setErrorsList("", "buttonText");
    setShowModal(true);
  };

  const handleDeleteClick = (button) => {
    setSelectedButton(button);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setSelectedButton(null);
    setIsEditMode(false);
    // Clear errors
    setErrorsList("", "amount");
    setErrorsList("", "type");
    setErrorsList("", "buttonText");
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear errors when type changes
    if (name === "type") {
      setErrorsList("", "amount");
      setErrorsList("", "type");
      setErrorsList("", "buttonText");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clear previous errors
    setErrorsList("", "amount");
    setErrorsList("", "type");
    setErrorsList("", "buttonText");

    const validationRules = [{ path: "type", msg: "Type is required." }];

    // Only validate amount for FIXED type
    if (formData.type === "FIXED") {
      validationRules.push({
        path: "amount",
        msg: "Amount is required.",
        type: "number",
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      errors.forEach((error) => {
        setErrorsList(error.msg, error.path);
      });
      return;
    }

    const submitData = {
      type: formData.type,
      isActive: formData.isActive,
    };

    if (formData.type === "FIXED") {
      const amount = parseFloat(formData.amount);

      if (isNaN(amount) || amount <= 0) {
        setErrorsList("Amount must be greater than 0", "amount");
        return;
      }

      submitData.amount = amount;
      // Include buttonText if provided for FIXED type
      if (formData.buttonText && formData.buttonText.trim()) {
        submitData.buttonText = formData.buttonText.trim();
      }
    } else {
      // For ANY type, include buttonText
      if (!formData.buttonText || !formData.buttonText.trim()) {
        setErrorsList("Button text is required for ANY type", "buttonText");
        return;
      }
      submitData.buttonText = formData.buttonText.trim();
    }

    if (isEditMode) {
      // Show confirmation modal with transaction password for edit
      setPendingSubmitData(submitData);
      setShowEditConfirmModal(true);
      setShowModal(false);
    } else {
      await createDonationButton(submitData);
      handleCloseModal();
    }
  };

  const handleConfirmEdit = (txnPassword) => {
    if (pendingSubmitData && selectedButton && txnPassword) {
      const submitDataWithTxn = {
        ...pendingSubmitData,
        txn_password: txnPassword,
      };
      updateDonationButton(selectedButton._id, submitDataWithTxn);
      setShowEditConfirmModal(false);
      setPendingSubmitData(null);
      setSelectedButton(null);
      setIsEditMode(false);
      setFormData(initialFormData);
    }
  };

  const handleConfirmDelete = (txnPassword) => {
    if (selectedButton && txnPassword) {
      deleteDonationButton(selectedButton._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedButton(null);
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Donation Buttons"
        crumbs={[{ name: "Donations" }]}
      />

      <>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "donation", "buttons") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateClick}
                >
                  Create Donation Button
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={donationButtons || []}
          count={donationButtons?.length || 0}
          params={initialSortingParams}
          setParams={() => {}}
          pagination={false}
          responsive
          striped={true}
          progressPending={loadingDonationButtons}
          highlightOnHover
          persistTableHead={true}
        />
      </>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditMode ? "Edit Donation Button" : "Create Donation Button"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                Type <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                name="type"
                value={formData.type}
                onChange={onChange}
                required
                className={errorList.type ? "invalid" : ""}
              >
                <option value="FIXED">FIXED</option>
                <option value="ANY">ANY</option>
              </Form.Select>
              <Errors current_key="type" />
              {formData.type === "ANY" && (
                <Form.Text className="text-muted">
                  Note: Only one "ANY" type button is allowed. Users can enter
                  any amount.
                </Form.Text>
              )}
            </Form.Group>

            {formData.type === "ANY" && (
              <Form.Group className="mb-3">
                <Form.Label>
                  Button Text <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="buttonText"
                  value={formData.buttonText}
                  onChange={onChange}
                  placeholder="Enter button text"
                  maxLength={100}
                  required
                  className={errorList.buttonText ? "invalid" : ""}
                />
                <Errors current_key="buttonText" />
                <Form.Text className="text-muted">
                  Text to display on the donation button
                </Form.Text>
              </Form.Group>
            )}

            {formData.type === "FIXED" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Amount <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={onChange}
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                    required
                    className={errorList.amount ? "invalid" : ""}
                  />
                  <Errors current_key="amount" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Button Text <span className="text-muted">(Optional)</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="buttonText"
                    value={formData.buttonText}
                    onChange={onChange}
                    placeholder="Enter button text (e.g., Support Community)"
                    maxLength={100}
                    className={errorList.buttonText ? "invalid" : ""}
                  />
                  <Form.Text className="text-muted">
                    Text to display below the amount on the donation button
                  </Form.Text>
                  <Errors current_key="buttonText" />
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                name="isActive"
                label="Active"
                checked={formData.isActive}
                onChange={onChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loadingOnDonationButtonSubmit}
            >
              {loadingOnDonationButtonSubmit
                ? "Saving..."
                : isEditMode
                  ? "Update"
                  : "Create"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedButton(null);
        }}
        handleConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        body={`Are you sure you want to delete the donation button of ₹${selectedButton?.amount}? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      {/* Edit Confirmation Modal */}
      <VerificationConfirmModal
        show={showEditConfirmModal}
        handleClose={() => {
          setShowEditConfirmModal(false);
          setPendingSubmitData(null);
          setShowModal(true);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Are you sure you want to update this donation button? Please enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

DonationButtonsList.propTypes = {
  getDonationButtons: PropTypes.func.isRequired,
  createDonationButton: PropTypes.func.isRequired,
  updateDonationButton: PropTypes.func.isRequired,
  deleteDonationButton: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  donationButtons: state.adminDonation.donationButtons,
  loadingDonationButtons: state.adminDonation.loadingDonationButtons,
  loadingOnDonationButtonSubmit:
    state.adminDonation.loadingOnDonationButtonSubmit,
  loggedInAdmin: state.adminAuth.admin,
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  getDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
  setErrorsList,
})(DonationButtonsList);
