import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Collapse,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import {
  getSbiProSession,
  uploadSbiProFinger,
  submitSbiProSession,
  FINGER_TYPES,
} from "@src/actions/sbiProActions";
import { FINGER_LABELS } from "@src/constants/sbiProConstants";

const LEFT_HAND = [
  "LEFT_THUMB",
  "LEFT_INDEX",
  "LEFT_MIDDLE",
  "LEFT_RING",
  "LEFT_LITTLE",
];
const RIGHT_HAND = [
  "RIGHT_THUMB",
  "RIGHT_INDEX",
  "RIGHT_MIDDLE",
  "RIGHT_RING",
  "RIGHT_LITTLE",
];

const SbiProSessionDetail = ({
  currentSession,
  loadingSession,
  uploading,
  uploadingFinger,
  submitting,
  getSbiProSession,
  uploadSbiProFinger,
  submitSbiProSession,
}) => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const fileInputRefs = useRef({});
  const [showFingerGuide, setShowFingerGuide] = React.useState(true);

  useEffect(() => {
    if (appointmentId) {
      getSbiProSession(appointmentId);
    }
  }, [appointmentId, getSbiProSession]);

  const handleUploadClick = (fingerType) => {
    const input = fileInputRefs.current[fingerType];
    if (input) input.click();
  };

  const handleFileChange = (e, fingerType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }
    uploadSbiProFinger(appointmentId, fingerType, file, (session) => {
      if (session) {
        fileInputRefs.current[fingerType].value = "";
      }
    });
  };

  const handleSubmit = () => {
    submitSbiProSession(appointmentId, () => {
      getSbiProSession(appointmentId);
    });
  };

  const canUpload =
    currentSession &&
    ["CREATED", "UPLOADING", "REOPENED"].includes(currentSession.status);

  const canSubmit =
    currentSession &&
    currentSession.status === "UPLOADED" &&
    (currentSession.uploadedCount || 0) === 10;

  const hasReport = !!currentSession?.reportUrl;

  const isSlotDone = (fingerType) => {
    const url = currentSession?.images?.[fingerType];
    return !!url && url.trim() !== "";
  };

  const renderFingerGroup = (handFingers, handTitle) => (
    <div className="sbi-pro-hand-group mb-4">
      <h6 className="sbi-pro-hand-title">{handTitle}</h6>
      <Row>
        {handFingers.map((fingerType) => {
          const done = isSlotDone(fingerType);
          const isUploading = uploadingFinger === fingerType;
          const url = currentSession?.images?.[fingerType];

          return (
            <Col key={fingerType} xs={12} sm={6} md={4} lg={3} className="mb-3">
              <Card
                className={`h-100 sbi-pro-finger-card ${done ? "sbi-pro-finger-done" : "sbi-pro-finger-pending"}`}
              >
                <Card.Body className="py-3">
                  <div className="small text-muted mb-1">
                    {FINGER_LABELS[fingerType] || fingerType}
                  </div>
                  <Badge bg={done ? "success" : "secondary"} className="mb-2">
                    {done ? "DONE" : "NOT UPLOADED"}
                  </Badge>
                  {done && url && (
                    <div className="mb-2">
                      <img
                        src={url}
                        alt={fingerType}
                        className="img-fluid rounded border"
                        style={{
                          maxHeight: "80px",
                          objectFit: "contain",
                          width: "100%",
                        }}
                      />
                    </div>
                  )}
                  <input
                    ref={(el) => (fileInputRefs.current[fingerType] = el)}
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(e) => handleFileChange(e, fingerType)}
                  />
                  <Button
                    size="sm"
                    variant={done ? "outline-secondary" : "outline-primary"}
                    disabled={!canUpload || done || isUploading}
                    onClick={() => handleUploadClick(fingerType)}
                  >
                    {isUploading ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-1"
                        />
                        Uploading
                      </>
                    ) : done ? (
                      "Done"
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );

  if (loadingSession && !currentSession) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="SBI PRO Session"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "My SBI PRO Sessions", link: "/user/sbi-pro-sessions" },
            { name: "Session" },
          ]}
        />
        <BouncingLoader minHeight="300px" />
      </Container>
    );
  }

  if (!currentSession) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="SBI PRO Session"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "My SBI PRO Sessions", link: "/user/sbi-pro-sessions" },
            { name: "Session" },
          ]}
        />
        <MainCard>
          <p className="text-muted">Session not found or access denied.</p>
          <Button
            variant="outline-secondary"
            onClick={() => navigate("/user/sbi-pro-sessions")}
          >
            Back to My SBI PRO Sessions
          </Button>
        </MainCard>
      </Container>
    );
  }

  const uploadedCount = currentSession.uploadedCount || 0;
  const progressPct = (uploadedCount / 10) * 100;

  const isSelf =
    currentSession.beneficiaryType === "SELF" ||
    !currentSession.beneficiaryType;
  const forWhomName = isSelf
    ? currentSession.userId?.name || "-"
    : currentSession.beneficiaryName || "-";
  const forWhomPhone = isSelf
    ? currentSession.userId?.phone || "-"
    : currentSession.beneficiaryPhone || "-";
  const forWhomMemberId = isSelf ? currentSession.userId?.memberId : null;
  const bookedBy =
    !isSelf && currentSession.requesterId
      ? currentSession.requesterId.name
      : null;

  return (
    <Container className="sbi-pro-page">
      <AppBreadCrumb
        pageTitle="SBI PRO Session"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Sessions", link: "/user/sbi-pro-sessions" },
          {
            name: `${currentSession.userId?.memberId}`,
          },
        ]}
      />

      <MainCard>
        {/* For whom – clear identity, no confusion */}
        <Card className="mb-4 border-info">
          <Card.Header className="bg-info bg-opacity-10 py-2">
            <strong>Session for</strong>
          </Card.Header>
          <Card.Body className="py-2">
            <Row className="g-2">
              <Col xs={12} md={6}>
                <span className="text-muted small">Name:</span>{" "}
                <strong>{forWhomName}</strong>
                {forWhomMemberId && (
                  <span className="ms-1 text-muted">({forWhomMemberId})</span>
                )}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted small">Phone:</span>{" "}
                <strong>{forWhomPhone}</strong>
              </Col>
              {bookedBy && (
                <Col xs={12}>
                  <span className="text-muted small">Booked by:</span>{" "}
                  {bookedBy}
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h5 className="mb-1">SBI PRO Upload</h5>
            <p className="text-muted small mb-2">
              Status: <Badge bg="info">{currentSession.status}</Badge>
            </p>
            <div className="d-flex align-items-center gap-2">
              <div className="sbi-pro-progress-bar" style={{ width: "120px" }}>
                <div
                  className="sbi-pro-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="small">{uploadedCount} / 10 images</span>
            </div>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/user/sbi-pro-sessions")}
          >
            Back to List
          </Button>
        </div>

        {/* Finger position guide */}
        <Card className="mb-4">
          <Card.Header
            className="py-2 d-flex justify-content-between align-items-center"
            style={{ cursor: "pointer" }}
            onClick={() => setShowFingerGuide(!showFingerGuide)}
          >
            <span className="small fw-semibold">How to capture fingers</span>
            <span>{showFingerGuide ? "▼" : "▶"}</span>
          </Card.Header>
          <Collapse in={showFingerGuide}>
            <Card.Body className="small text-muted py-2">
              <p className="mb-1">
                <strong>Left hand:</strong> Thumb → Index → Middle → Ring →
                Little (L-R order)
              </p>
              <p className="mb-0">
                <strong>Right hand:</strong> Thumb → Index → Middle → Ring →
                Little (L-R order)
              </p>
              <p className="mt-2 mb-0">
                Capture each finger clearly. Avoid blur. Ensure good lighting.
              </p>
            </Card.Body>
          </Collapse>
        </Card>

        {renderFingerGroup(LEFT_HAND, "Left Hand")}
        {renderFingerGroup(RIGHT_HAND, "Right Hand")}

        {hasReport && (
          <>
            <hr className="my-4" />
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="text-muted small">
                Your SBI PRO report is ready.
              </div>
              <Button
                variant="primary"
                href={currentSession.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View / Download Report
              </Button>
            </div>
          </>
        )}

        {canSubmit && !hasReport && (
          <div className="sbi-pro-sticky-submit mt-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted small">
                Submit only when all 10 images are uploaded.
              </div>
              <Button
                variant="primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Submitting
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </div>
        )}

        {!canSubmit && !hasReport && (
          <>
            <hr className="my-4" />
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Submit only when all 10 images are uploaded.
              </div>
              <Button variant="primary" disabled>
                Submit for Verification (complete 10/10 first)
              </Button>
            </div>
          </>
        )}
      </MainCard>
    </Container>
  );
};

SbiProSessionDetail.propTypes = {
  currentSession: PropTypes.object,
  loadingSession: PropTypes.bool,
  uploading: PropTypes.bool,
  uploadingFinger: PropTypes.string,
  submitting: PropTypes.bool,
  getSbiProSession: PropTypes.func.isRequired,
  uploadSbiProFinger: PropTypes.func.isRequired,
  submitSbiProSession: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentSession: state.sbiPro?.currentSession ?? null,
  loadingSession: state.sbiPro?.loadingSession ?? false,
  uploading: state.sbiPro?.uploading ?? false,
  uploadingFinger: state.sbiPro?.uploadingFinger ?? null,
  submitting: state.sbiPro?.submitting ?? false,
});

export default connect(mapStateToProps, {
  getSbiProSession,
  uploadSbiProFinger,
  submitSbiProSession,
})(SbiProSessionDetail);
