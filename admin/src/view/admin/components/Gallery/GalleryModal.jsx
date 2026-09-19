import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createGalleryImage,
  updateGalleryImage,
  removeGalleryErrors,
} from "@src/actions/adminGalleryActions";

const GalleryModal = ({
  show,
  handleClose,
  image,
  categories = [],
  createGalleryImage,
  updateGalleryImage,
  removeGalleryErrors,
  setErrors,
  errorList,
  loadingGalleryList,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    isActive: true,
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (image) {
      setFormData({
        title: image.title || "",
        category: image.category || "",
        isActive: image.isActive !== undefined ? image.isActive : true,
        image: null,
      });
      setImagePreview(image.imageUrl || null);
    } else {
      setFormData({
        title: "",
        category: "",
        isActive: true,
        image: null,
      });
      setImagePreview(null);
    }
    removeGalleryErrors();
  }, [image, show, removeGalleryErrors]);

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
    removeGalleryErrors();

    const validationRules = [];
    if (!image) {
      validationRules.push({ path: "image", msg: "Image is required" });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (image) {
      // Update - send JSON
      const formDataToSend = {
        title: formData.title,
        category: formData.category,
        isActive: formData.isActive,
      };
      updateGalleryImage(formDataToSend, image._id, handleClose);
    } else {
      // Create - send FormData with image
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("isActive", formData.isActive);
      formDataToSend.append("image", formData.image);
      createGalleryImage(formDataToSend, handleClose);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{image ? "Edit Gallery Image" : "Add Gallery Image"}</Modal.Title>
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
                <Form.Label>Category</Form.Label>
                <Form.Control
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={onChange}
                  placeholder="Enter category (optional)"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </Form.Group>
            </Col>

            <Col md="12" className="mb-3">
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

            {!image && (
              <Col md="12" className="mb-3">
                <Form.Group>
                  <Form.Label>Image *</Form.Label>
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
            )}

            {image && imagePreview && (
              <Col md="12" className="mb-3">
                <Form.Label>Current Image</Form.Label>
                <div>
                  <img
                    src={imagePreview}
                    alt="Current"
                    className="image-preview"
                  />
                </div>
                <small className="text-muted">Note: Image cannot be changed after creation</small>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loadingGalleryList}>
            {loadingGalleryList ? "Saving..." : image ? "Update" : "Upload"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

GalleryModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  image: PropTypes.object,
  categories: PropTypes.array,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingGalleryList: state.gallery.loadingGalleryList,
});

export default connect(mapStateToProps, {
  createGalleryImage,
  updateGalleryImage,
  removeGalleryErrors,
  setErrors,
})(GalleryModal);

