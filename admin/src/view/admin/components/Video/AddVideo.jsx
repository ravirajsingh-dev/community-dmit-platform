import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Form, Row, Col, Container } from "react-bootstrap";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import { createVideo, removeVideoErrors } from "@src/actions/adminVideoActions";
import { setErrors } from "@src/actions/adminAuth";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";

const AddVideo = ({ createVideo, errorList, setErrors, removeVideoErrors, loadingVideoList }) => {
  const navigate = useNavigate();

  const initialFormData = {
    title: "",
    embedUrl: "",
    displayOrder: 0,
    isActive: true,
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);

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

    const submitData = {
      title: formData.title,
      embedUrl: formData.embedUrl,
      displayOrder: formData.displayOrder,
      isActive: formData.isActive,
    };

    setSubmitting(true);
    createVideo(submitData, navigate).then((res) => {
      setSubmitting(false);
    });
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    navigate("/admin/video");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Add Video"
        crumbs={[
          { name: "Videos", path: "/admin/video" },
          { name: "Add Video" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          <Row className="row-gap-3 mb-4">
            <Col xs={12}>
              <h5>Video Information</h5>
            </Col>

            <Col xs={12} md={6}>
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

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>
                  Embed URL <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className={errorList.embedUrl ? "invalid" : ""}
                  type="url"
                  name="embedUrl"
                  value={formData.embedUrl}
                  onChange={onChange}
                  placeholder="https://www.youtube.com/embed/..."
                  required
                />
                <Errors current_key="embedUrl" />
                <Form.Text className="text-muted">
                  Enter the YouTube embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID)
                </Form.Text>
              </Form.Group>
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
                disabled={submitting || loadingVideoList}
              >
                {submitting || loadingVideoList ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : (
                  "Create Video"
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Container>
  );
};

AddVideo.propTypes = {
  createVideo: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  setErrors: PropTypes.func.isRequired,
  removeVideoErrors: PropTypes.func.isRequired,
  loadingVideoList: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingVideoList: state.video.loadingVideoList,
});

export default connect(mapStateToProps, {
  createVideo,
  setErrors,
  removeVideoErrors,
})(AddVideo);
