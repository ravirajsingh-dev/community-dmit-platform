import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
} from "@src/actions/adminSliderActions";

const SliderModal = ({
  show,
  handleClose,
  slider,
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
  setErrors,
  errorList,
  loadingSliderList,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    order: 0,
    isActive: true,
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (slider) {
      setFormData({
        title: slider.title || "",
        link: slider.link || "",
        order: slider.order || 0,
        isActive: slider.isActive !== undefined ? slider.isActive : true,
        image: null,
      });
      setImagePreview(slider.imageUrl || null);
    } else {
      setFormData({
        title: "",
        link: "",
        order: 0,
        isActive: true,
        image: null,
      });
      setImagePreview(null);
    }
    removeSliderErrors();
  }, [slider, show, removeSliderErrors]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors([{ path: "image", msg: "Image size must be less than 2MB" }]);
        return;
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setErrors([{ path: "image", msg: "Only jpg, jpeg, png, and webp images are allowed" }]);
        return;
      }

      setFormData({ ...formData, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removeSliderErrors();

    const validationRules = [];
    if (!slider) {
      validationRules.push({ path: "image", msg: "Image is required" });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("link", formData.link);
    formDataToSend.append("order", formData.order);
    formDataToSend.append("isActive", formData.isActive);
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }

    if (slider) {
      updateSliderBanner(formDataToSend, slider._id, handleClose);
    } else {
      createSliderBanner(formDataToSend, handleClose);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{slider ? "Edit Slider Banner" : "Add Slider Banner"}</Modal.Title>
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
                />
              </Form.Group>
            </Col>

            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>Link (Optional)</Form.Label>
                <Form.Control
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={onChange}
                  placeholder="https://example.com"
                />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group>
                <Form.Label>Order</Form.Label>
                <Form.Control
                  type="number"
                  name="order"
                  value={formData.order}
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

            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>
                  Image {slider ? "(Optional - leave empty to keep current)" : "*"}
                </Form.Label>
                <Form.Control
                  type="file"
                  name="image"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onFileChange}
                  className={errorList.image ? "invalid" : ""}
                />
                <Errors current_key="image" />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loadingSliderList}>
            {loadingSliderList ? "Saving..." : slider ? "Update" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

SliderModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  slider: PropTypes.object,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingSliderList: state.slider.loadingSliderList,
});

export default connect(mapStateToProps, {
  createSliderBanner,
  updateSliderBanner,
  removeSliderErrors,
  setErrors,
})(SliderModal);

