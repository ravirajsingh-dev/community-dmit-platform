import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Form, Row, Col, Container } from "react-bootstrap";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import { createNews, removeNewsErrors } from "@src/actions/adminNewsActions";
import { setErrors } from "@src/actions/adminAuth";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";

const AddNews = ({ createNews, errorList, setErrors, removeNewsErrors, loadingNewsList }) => {
  const navigate = useNavigate();

  const initialFormData = {
    title: "",
    description: "",
    displayOrder: 0,
    isActive: true,
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [image, setImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

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

      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removeNewsErrors();

    const validationRules = [
      { path: "title", msg: "Title is required" },
      { path: "description", msg: "Description is required" },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("displayOrder", formData.displayOrder);
    formDataToSend.append("isActive", formData.isActive);
    if (image) {
      formDataToSend.append("image", image);
    }

    setSubmitting(true);
    createNews(formDataToSend, navigate).then((res) => {
      setSubmitting(false);
    });
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    navigate("/admin/news");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Add News"
        crumbs={[
          { name: "News", path: "/admin/news" },
          { name: "Add News" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          <Row className="row-gap-3 mb-4">
            <Col xs={12}>
              <h5>News Information</h5>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label>
                  Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.title ? "invalid" : ""}
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  required
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label>
                  Description / Content <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.description ? "invalid" : ""}
                  as="textarea"
                  rows={5}
                  name="description"
                  value={formData.description}
                  onChange={onChange}
                  required
                />
                <Errors current_key="description" />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Image (Optional)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onFileChange}
                  className={errorList.image ? "invalid" : ""}
                />
                <Errors current_key="image" />
                <Form.Text className="text-muted">
                  Only jpg, jpeg, png, and webp images are allowed. Max size: 2MB
                </Form.Text>
              </Form.Group>
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "cover", borderRadius: "4px" }}
                  />
                  <Button
                    variant="link"
                    className="text-danger p-0 ms-2"
                    onClick={removeImage}
                    type="button"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </Col>

            <Col xs={12} md={6}>
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

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Active</Form.Label>
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

          <Row>
            <Col xs={12} className="text-end">
              <Button
                className="m-2"
                type="button"
                variant="secondary"
                onClick={onClickCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="m-2"
                type="submit"
                variant="primary"
                disabled={submitting || loadingNewsList}
              >
                {submitting || loadingNewsList ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : (
                  "Create News"
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Container>
  );
};

AddNews.propTypes = {
  createNews: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeNewsErrors: PropTypes.func.isRequired,
  loadingNewsList: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingNewsList: state.news.loadingNewsList,
});

export default connect(mapStateToProps, {
  createNews,
  setErrors,
  removeNewsErrors,
})(AddNews);
