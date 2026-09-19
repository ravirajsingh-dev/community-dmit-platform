import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, InputGroup } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createTrainingVideo,
  updateTrainingVideo,
  removeTrainingVideoErrors,
} from "@src/actions/adminTrainingVideoActions";
import { getWalletSettings } from "@src/actions/adminWalletSettingsActions";

const TrainingModal = ({
  show,
  handleClose,
  trainingVideo,
  createTrainingVideo,
  updateTrainingVideo,
  removeTrainingVideoErrors,
  setErrors,
  errorList,
  loadingTrainingVideoList,
  walletSettings,
  getWalletSettings,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    embedUrl: "",
    // Backend stores `designations` as a single Number (designationCode).
    // Keep it as a single numeric value in the admin UI as well.
    designations: "",
    displayOrder: 0,
    isActive: true,
    txn_password: "",
  });
  const [showTxnPassword, setShowTxnPassword] = useState(false);

  useEffect(() => {
    if (!walletSettings || !walletSettings._id) {
      getWalletSettings();
    }
  }, [walletSettings, getWalletSettings]);

  useEffect(() => {
    if (trainingVideo) {
      setFormData({
        title: trainingVideo.title || "",
        embedUrl: trainingVideo.embedUrl || "",
        designations:
          trainingVideo.designations != null && trainingVideo.designations !== ""
            ? Number(trainingVideo.designations)
            : "",
        displayOrder: trainingVideo.displayOrder || 0,
        isActive:
          trainingVideo.isActive !== undefined ? trainingVideo.isActive : true,
        txn_password: "",
      });
    } else {
      setFormData({
        title: "",
        embedUrl: "",
        designations: "",
        displayOrder: 0,
        isActive: true,
        txn_password: "",
      });
    }
    removeTrainingVideoErrors();
  }, [trainingVideo, show, removeTrainingVideoErrors]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "designations") {
      const parsed = parseInt(value, 10);
      setFormData({
        ...formData,
        designations: Number.isFinite(parsed) && parsed > 0 ? parsed : "",
      });
      return;
    }
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    removeTrainingVideoErrors();

    const validationRules = [
      { path: "title", msg: "Title is required" },
      { path: "embedUrl", msg: "Embed URL is required" },
      {
        path: "designations",
        msg: "At least one designation is required",
        validator: (v) => {
          const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
          return Number.isFinite(n) && n > 0;
        },
      },
    ];
    if (trainingVideo) {
      validationRules.push({
        path: "txn_password",
        msg: "Transaction password is required.",
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const formDataToSend = {
      title: formData.title,
      embedUrl: formData.embedUrl,
      designations: formData.designations,
      displayOrder: formData.displayOrder,
      isActive: formData.isActive,
    };
    if (trainingVideo && formData.txn_password) {
      formDataToSend.txn_password = formData.txn_password;
    }

    let res;
    if (trainingVideo) {
      res = await updateTrainingVideo(formDataToSend, trainingVideo._id);
    } else {
      res = await createTrainingVideo(formDataToSend);
    }

    if (res && res.status) {
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const designationOptions =
    walletSettings && Array.isArray(walletSettings.designations)
      ? walletSettings.designations.filter((d) => d.isActive !== false)
      : [];

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {trainingVideo ? "Edit Training Content" : "Add Training Content"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          <Row>
            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  placeholder="Enter title"
                  className={errorList.title ? "invalid" : ""}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>Embed URL</Form.Label>
                <Form.Control
                  type="url"
                  name="embedUrl"
                  value={formData.embedUrl}
                  onChange={onChange}
                  placeholder="https://www.youtube.com/embed/..."
                  className={errorList.embedUrl ? "invalid" : ""}
                />
                <Errors current_key="embedUrl" />
                <Form.Text className="text-muted">
                  Enter the embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID)
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>Designation</Form.Label>
                <Form.Select
                  name="designations"
                  value={formData.designations || ""}
                  onChange={onChange}
                  className={errorList.designations ? "invalid" : ""}
                >
                  <option value="">Select designation</option>
                  {designationOptions.map((des) => (
                    <option
                      key={des.designationCode}
                      value={des.designationCode}
                    >
                      {des.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select the designation this training content applies to.
                </Form.Text>
                <Errors current_key="designations" />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group>
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={onChange}
                  min="0"
                />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
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

            {trainingVideo && (
              <Col md="12" className="mb-3">
                <Form.Group>
                  <Form.Label htmlFor="txn_password" className="fw-bold">
                    Transaction Password *
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      required
                      type={showTxnPassword ? "text" : "password"}
                      id="txn_password"
                      value={formData.txn_password}
                      name="txn_password"
                      className={`text-muted ${
                        errorList.txn_password ? "invalid" : ""
                      }`}
                      onChange={onChange}
                      placeholder="Enter transaction password"
                    />
                    <InputGroup.Text
                      className="show-password-icon text-muted"
                      onClick={() => setShowTxnPassword(!showTxnPassword)}
                    >
                      {showTxnPassword ? (
                        <AiOutlineEye size={20} />
                      ) : (
                        <AiOutlineEyeInvisible size={20} />
                      )}
                    </InputGroup.Text>
                  </InputGroup>
                  <Errors current_key="txn_password" />
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loadingTrainingVideoList}
          >
            {loadingTrainingVideoList
              ? "Saving..."
              : trainingVideo
              ? "Update"
              : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

TrainingModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  trainingVideo: PropTypes.object,
  onSuccess: PropTypes.func,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingTrainingVideoList: state.training.loadingTrainingVideoList,
  walletSettings: state.adminWalletSettings.walletSettings,
});

export default connect(mapStateToProps, {
  createTrainingVideo,
  updateTrainingVideo,
  removeTrainingVideoErrors,
  setErrors,
  getWalletSettings,
})(TrainingModal);

