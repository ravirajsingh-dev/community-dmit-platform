import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createVideo,
  updateVideo,
  removeVideoErrors,
} from "@src/actions/adminVideoActions";

const VideoModal = ({
  show,
  handleClose,
  video,
  createVideo,
  updateVideo,
  removeVideoErrors,
  setErrors,
  errorList,
  loadingVideoList,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    embedUrl: "",
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || "",
        embedUrl: video.embedUrl || "",
        displayOrder: video.displayOrder || 0,
        isActive: video.isActive !== undefined ? video.isActive : true,
      });
    } else {
      setFormData({
        title: "",
        embedUrl: "",
        displayOrder: 0,
        isActive: true,
      });
    }
    removeVideoErrors();
  }, [video, show, removeVideoErrors]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removeVideoErrors();

    const validationRules = [
      { path: "title", msg: "Title is required" },
      { path: "embedUrl", msg: "Embed URL is required" },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const formDataToSend = {
      title: formData.title,
      embedUrl: formData.embedUrl,
      displayOrder: formData.displayOrder,
      isActive: formData.isActive,
    };

    if (video) {
      updateVideo(formDataToSend, video._id, handleClose);
    } else {
      createVideo(formDataToSend, handleClose);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{video ? "Edit Video" : "Add Video"}</Modal.Title>
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
                  Enter the YouTube embed URL (e.g.,
                  https://www.youtube.com/embed/VIDEO_ID)
                </Form.Text>
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
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loadingVideoList}>
            {loadingVideoList ? "Saving..." : video ? "Update" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

VideoModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  video: PropTypes.object,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingVideoList: state.video.loadingVideoList,
});

export default connect(mapStateToProps, {
  createVideo,
  updateVideo,
  removeVideoErrors,
  setErrors,
})(VideoModal);
