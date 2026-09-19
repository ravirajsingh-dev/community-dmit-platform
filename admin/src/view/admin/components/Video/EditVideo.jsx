import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Row, Col, Container } from "react-bootstrap";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import {
  updateVideo,
  removeVideoErrors,
  resetComponentStore,
  getVideoById,
} from "@src/actions/adminVideoActions";
import { setErrors } from "@src/actions/adminAuth";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import Spinner from "@src/view/spinners/Spinner";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

const EditVideo = ({
  updateVideo,
  errorList,
  currentVideo,
  setErrors,
  removeVideoErrors,
  getVideoById,
  loadingVideo,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const initialFormData = {
    title: "",
    embedUrl: "",
    displayOrder: 0,
    isActive: true,
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingSubmitData, setPendingSubmitData] = React.useState(null);

  const loadVideoFormData = (video) => {
    if (!video) return;

    setFormData({
      title: video.title || "",
      embedUrl: video.embedUrl || "",
      displayOrder: video.displayOrder || 0,
      isActive: video.isActive !== undefined ? video.isActive : true,
    });
  };

  React.useEffect(() => {
    if (!id) return;
    getVideoById(id);
  }, [getVideoById, id]);

  React.useEffect(() => {
    if (!currentVideo || !currentVideo._id) return;
    loadVideoFormData(currentVideo);
  }, [currentVideo]);

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

    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
  };

  const handleConfirmEdit = (txnPassword) => {
    if (pendingSubmitData && txnPassword) {
      setSubmitting(true);
      const submitDataWithTxn = { ...pendingSubmitData, txn_password: txnPassword };
      updateVideo(submitDataWithTxn, id, navigate).then((res) => {
        setSubmitting(false);
        if (res && res.status === true) {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        } else {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }
      });
    }
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    navigate("/admin/video");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Edit Video"
        crumbs={[
          { name: "Videos", path: "/admin/video" },
          { name: "Edit Video" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          {!loadingVideo && currentVideo && currentVideo._id ? (
            <>
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
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <Spinner />
          )}
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Are you sure you want to update this video? Please enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

EditVideo.propTypes = {
  updateVideo: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  getVideoById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingVideo: state.video.loadingVideo,
  currentVideo: state.video.currentVideo,
});

export default connect(mapStateToProps, {
  updateVideo,
  setErrors,
  removeVideoErrors,
  resetComponentStore,
  getVideoById,
})(EditVideo);
