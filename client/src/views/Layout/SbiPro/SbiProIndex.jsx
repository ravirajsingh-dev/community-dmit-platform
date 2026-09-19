import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  Spinner,
  Modal,
  Nav,
  Tab,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";

import {
  getAssignedSbiProSessions,
  getPendingSbiProVerification,
  getMySbiProReports,
  getClientReports,
  verifySbiProSession,
  FINGER_TYPES,
} from "@src/actions/sbiProActions";
import { FINGER_LABELS } from "@src/constants/sbiProConstants";
import { initialSortingParams } from "@src/constants";

import {
  getBookedSlotDisplay,
  getHolderDisplay,
  getStatusDisplay,
} from "@src/utils/appointmentHelpers";
import {
  getAppointmentId as getSbiProAppointmentId,
  getForWhomDisplay as getSbiProForWhomDisplay,
  formatDate as formatSbiProDate,
} from "@src/utils/sbiProSessionHelpers";

const SbiProIndex = ({
  assignedSessions,
  assignedPagination,
  loadingAssigned,
  pendingVerificationSessions,
  loadingPendingVerification,
  verifying,
  myReports,
  loadingReports,
  clientReports,
  loadingClientReports,
  getAssignedSbiProSessions,
  getPendingSbiProVerification,
  getMySbiProReports,
  getClientReports,
  verifySbiProSession,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "";
  const [activeTab, setActiveTab] = useState(tabParam || "sessions");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedParams, setAssignedParams] = useState(initialSortingParams);
  const [viewSession, setViewSession] = useState(null);
  const [confirmVerifySession, setConfirmVerifySession] = useState(null);
  const [rejectSession, setRejectSession] = useState(null);

  // URL-tab sync: init from URL, update URL on tab change
  useEffect(() => {
    const t =
      tabParam && ["verify", "sessions", "reports"].includes(tabParam)
        ? tabParam
        : "sessions";
    setActiveTab(t);
  }, [tabParam]);

  useEffect(() => {
    getAssignedSbiProSessions({
      ...assignedParams,
      status: statusFilter || undefined,
    });
    getPendingSbiProVerification();
    getMySbiProReports();
    getClientReports();
  }, [
    statusFilter,
    assignedParams.page,
    assignedParams.limit,
    getAssignedSbiProSessions,
    getPendingSbiProVerification,
    getMySbiProReports,
    getClientReports,
  ]);

  const hasPendingVerification = pendingVerificationSessions?.length > 0;
  useEffect(() => {
    if (hasPendingVerification && activeTab !== "verify") {
      setActiveTab("verify");
      setSearchParams({ tab: "verify" });
    }
  }, [hasPendingVerification]);

  const handleTabSelect = (k) => {
    const tab = k || "sessions";
    setActiveTab(tab);
    setSearchParams(tab !== "sessions" ? { tab } : {});
  };

  const handleConfirmClick = (session) => setConfirmVerifySession(session);

  const handleConfirmVerify = () => {
    if (!confirmVerifySession) return;
    const aptId = getSbiProAppointmentId(confirmVerifySession);
    verifySbiProSession(aptId, true, () => {
      setConfirmVerifySession(null);
      getPendingSbiProVerification();
    });
  };

  const handleRejectClick = (session) => setRejectSession(session);

  const handleRejectConfirm = () => {
    if (!rejectSession) return;
    const aptId = getSbiProAppointmentId(rejectSession);
    verifySbiProSession(aptId, false, () => {
      setRejectSession(null);
      getPendingSbiProVerification();
      if (viewSession && getSbiProAppointmentId(viewSession) === aptId)
        setViewSession(null);
    });
  };

  const EmptyState = ({ icon, message, hint }) => (
    <Card>
      <Card.Body>
        <div className="sbi-pro-empty-state">
          <div className="sbi-pro-empty-icon">{icon}</div>
          <div className="sbi-pro-empty-message">{message}</div>
          {hint && <div className="sbi-pro-empty-hint">{hint}</div>}
        </div>
      </Card.Body>
    </Card>
  );

  const renderActionButtons = (s, isInModal = false) => {
    const aptId = getSbiProAppointmentId(s);
    const buttons = (
      <>
        <Button
          size="sm"
          className="btn-secondary"
          onClick={() => setViewSession(s)}
        >
          View Images
        </Button>
        <Button
          size="sm"
          className="btn-success"
          disabled={verifying}
          onClick={() => handleConfirmClick(s)}
        >
          {verifying ? <Spinner animation="border" size="sm" /> : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          className="btn-danger"
          disabled={verifying}
          onClick={() => handleRejectClick(s)}
        >
          Reject
        </Button>
      </>
    );
    return (
      <div className="d-flex flex-column flex-md-row flex-wrap gap-1 align-items-start">
        {buttons}
      </div>
    );
  };

  const pendingVerifyColumns = [
    {
      name: "Date & Time",
      selector: (s) => getBookedSlotDisplay(s.appointmentId),
      width: "250px",
    },
    {
      name: "For whom (Your analysis)",
      cell: (s) => {
        const fw = getSbiProForWhomDisplay(s);
        return (
          <div>
            <strong>{fw.primary}</strong>
            {fw.secondary && (
              <div className="small text-muted">{fw.secondary}</div>
            )}
          </div>
        );
      },
      width: "180px",
    },
    {
      name: "Trainer",
      cell: (s) => {
        const hd = getHolderDisplay(s.trainerId);
        return (
          <div>
            <strong>{hd.primary}</strong>
            {hd.secondary && (
              <div className="small text-muted">{hd.secondary}</div>
            )}
          </div>
        );
      },
      width: "250px",
    },
    {
      name: "Requested",
      selector: (s) =>
        formatSbiProDate(s.verificationRequestedAt || s.updatedAt),
      width: "250px",
    },
    { name: "Actions", cell: (s) => renderActionButtons(s), width: "200px" },
  ];

  const assignedSessionsColumns = [
    {
      name: "Date & Time",
      selector: (s) => getBookedSlotDisplay(s.appointmentId),
      width: "250px",
    },
    {
      name: "For whom (Client)",
      cell: (s) => {
        const fw = getSbiProForWhomDisplay(s);
        return (
          <div>
            <strong>{fw.primary}</strong>
            {fw.secondary && (
              <div className="small text-muted">{fw.secondary}</div>
            )}
          </div>
        );
      },
      width: "250px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (s) => {
        const status = getStatusDisplay(s.status);
        return (
          <span
            className={`apt-status-chip apt-status-${status.variant} sbi-pro-status-badge`}
          >
            {status.label}
          </span>
        );
      },
      width: "200px",
    },
    {
      name: "Progress",
      cell: (s) => {
        const count = s.uploadedCount || 0;
        const pct = (count / 10) * 100;
        return (
          <div className="d-flex align-items-center gap-2">
            <div
              className="sbi-pro-progress-bar flex-grow-1"
              style={{ minWidth: "60px" }}
            >
              <div
                className="sbi-pro-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="small text-muted">{count}/10</span>
          </div>
        );
      },
      width: "150px",
    },
    {
      name: "Created",
      selector: (s) =>
        s.createdAt
          ? format(parseISO(s.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "250px",
    },
    {
      name: "Actions",
      cell: (s) =>
        ["CREATED", "UPLOADING", "UPLOADED", "REOPENED", "CLOSED"].includes(
          s.status,
        ) ? (
          <Button
            size="sm"
            variant={
              s.status === "CLOSED" ? "outline-success" : "outline-primary"
            }
            onClick={() => {
              const aptId = s.appointmentId?._id ?? s.appointmentId;
              if (aptId) navigate(`/user/sbi-pro-sessions/${String(aptId)}`);
            }}
          >
            {s.status === "CLOSED" ? "View Report" : "Open Session"}
          </Button>
        ) : null,
      width: "250px",
    },
  ];

  const myReportsColumns = [
    {
      name: "Date & Time",
      selector: (s) => getBookedSlotDisplay(s.appointmentId),
      width: "250px",
    },
    {
      name: "For whom",
      cell: (s) => <strong>{getSbiProForWhomDisplay(s).primary}</strong>,
      width: "250px",
      wrap: true,
    },
    {
      name: "Trainer",
      cell: (s) => {
        const hd = getHolderDisplay(s.trainerId);
        return (
          <div>
            <strong>{hd.primary}</strong>
            {hd.secondary && (
              <div className="small text-muted">{hd.secondary}</div>
            )}
          </div>
        );
      },
      width: "250px",
    },
    {
      name: "Actions",
      cell: (s) => (
        <Button
          size="sm"
          variant="outline-primary"
          className="btn-common"
          onClick={() => {
            const aptId = s.appointmentId?._id ?? s.appointmentId;
            if (aptId) navigate(`/user/sbi-pro-sessions/${String(aptId)}`);
          }}
        >
          View Report
        </Button>
      ),
      width: "250px",
    },
  ];

  const clientReportsColumns = [
    {
      name: "Date & Time",
      selector: (s) => getBookedSlotDisplay(s.appointmentId),
      width: "250px",
    },
    {
      name: "For whom (Client details)",
      cell: (s) => {
        const fw = getSbiProForWhomDisplay(s);
        return (
          <div>
            <strong>{fw.primary}</strong>
            {fw.secondary && (
              <div className="small text-muted">{fw.secondary}</div>
            )}
          </div>
        );
      },
      width: "250px",
      wrap: true,
    },
    {
      name: "Actions",
      cell: (s) => (
        <Button
          size="sm"
          variant="outline-primary"
          className="btn-common"
          onClick={() => {
            const aptId = s.appointmentId?._id ?? s.appointmentId;
            if (aptId) navigate(`/user/sbi-pro-sessions/${String(aptId)}`);
          }}
        >
          View Report
        </Button>
      ),
      width: "250px",
    },
  ];

  return (
    <Container className="sbi-pro-page appointments-page">
      <AppBreadCrumb
        pageTitle="SBI PRO"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "SBI PRO" },
        ]}
      />

      <MainCard>
        <div className="apt-hero apt-hero-sbi-pro">
          <span className="apt-hero-icon" role="img" aria-label="Fingerprint">
            🖐️
          </span>
          <div className="apt-hero-content">
            <span className="apt-hero-badge apt-badge-sbi-pro">
              Client & Trainer
            </span>
            <h5 className="apt-hero-title">SBI PRO – Fingerprint Analysis</h5>
            <p className="apt-hero-desc mb-0">
              Fingerprint-based multiple intelligence test. Verify your images
              (client), conduct sessions (trainer), or view all reports.
            </p>
          </div>
        </div>

        <Tab.Container activeKey={activeTab} onSelect={handleTabSelect}>
          <Nav variant="tabs" className="sbi-pro-nav-tabs mb-4">
            <Nav.Item>
              <Nav.Link
                eventKey="verify"
                className="d-flex align-items-center gap-1"
                title="Sessions where your finger images await your confirmation before analysis"
              >
                <span className="small text-muted me-1">(Client)</span>
                Pending Verification
                {hasPendingVerification && (
                  <Badge bg="danger">
                    {pendingVerificationSessions.length}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="sessions"
                title="Upload 10 finger images as trainer, then submit for verification"
              >
                <span className="small text-muted me-1">(Trainer)</span>
                My Sessions
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="reports"
                title="All your SBI PRO reports – My Report (client) + Client Reports (as trainer)"
              >
                All Reports
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="verify">
              <p className="text-muted small mb-3">
                <strong>Your finger images</strong> – Sessions where YOUR
                fingerprints need your confirmation before analysis.
              </p>
              {loadingPendingVerification ? (
                <BouncingLoader minHeight="150px" />
              ) : !pendingVerificationSessions?.length ? (
                <EmptyState
                  icon="✓"
                  message="No pending verifications"
                  hint="Your finger images are not awaiting confirmation. Check My Sessions to upload or submit."
                />
              ) : (
                <Card className="sbi-pro-action-required">
                  <Card.Header className="bg-warning bg-opacity-25">
                    <strong>Action Required</strong> – Please verify your finger
                    images before analysis.
                  </Card.Header>
                  <Card.Body>
                    <CustomDataTable
                      columns={pendingVerifyColumns}
                      data={pendingVerificationSessions}
                      count={pendingVerificationSessions.length}
                      params={initialSortingParams}
                      setParams={() => {}}
                      pagination={false}
                      responsive
                      striped
                      noDataComponent="No pending verifications."
                    />
                  </Card.Body>
                </Card>
              )}
            </Tab.Pane>

            <Tab.Pane eventKey="sessions">
              <p className="text-muted small mb-3">
                <strong>As Trainer</strong> – Sessions assigned to YOU. Upload
                10 finger images, then submit for verification.
              </p>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="CREATED">Created</option>
                    <option value="UPLOADING">Uploading</option>
                    <option value="UPLOADED">Uploaded</option>
                    <option value="VERIFICATION_PENDING">
                      Verification Pending
                    </option>
                    <option value="REOPENED">Reopened</option>
                    <option value="ANALYSIS_PENDING">Analysis Pending</option>
                    <option value="CLOSED">Closed</option>
                  </Form.Select>
                </Col>
              </Row>
              {loadingAssigned ? (
                <BouncingLoader minHeight="150px" />
              ) : !assignedSessions?.length ? (
                <EmptyState
                  icon="📋"
                  message="No SBI PRO sessions assigned to you"
                  hint="Sessions will appear here when assigned by your trainer."
                />
              ) : (
                <Card>
                  <Card.Body>
                    <CustomDataTable
                      columns={assignedSessionsColumns}
                      data={assignedSessions || []}
                      count={
                        assignedPagination?.total ??
                        assignedSessions?.length ??
                        0
                      }
                      params={assignedParams}
                      setParams={(p) =>
                        setAssignedParams((prev) => ({ ...prev, ...p }))
                      }
                      pagination
                      paginationServer
                      responsive
                      striped
                      progressPending={loadingAssigned}
                      noDataComponent="No SBI PRO sessions assigned to you."
                    />
                  </Card.Body>
                </Card>
              )}
            </Tab.Pane>

            <Tab.Pane eventKey="reports">
              <p className="text-muted small mb-3">
                <strong>All Reports</strong> – Default view: both your personal
                report (client) and reports of clients whose sessions you
                conducted (trainer).
              </p>
              {loadingReports || loadingClientReports ? (
                <BouncingLoader minHeight="150px" />
              ) : !myReports?.length && !clientReports?.length ? (
                <EmptyState
                  icon="📄"
                  message="No completed reports yet"
                  hint="Reports will appear here after SBI PRO analysis is complete."
                />
              ) : (
                <div className="sbi-pro-reports-sections">
                  {/* Section 1: My Report – meri khud ki fingerprint report */}
                  <Card className="sbi-pro-report-section mb-4">
                    <Card.Header className="bg-primary bg-opacity-10 d-flex align-items-center gap-2">
                      <span className="sbi-pro-section-icon">👤</span>
                      <div>
                        <strong>My Report</strong>
                        <span
                          className="badge bg-primary bg-opacity-25 text-primary ms-2"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Client
                        </span>
                        <div className="small text-muted">
                          Reports where YOU were the client (your fingerprint
                          analysis)
                        </div>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {!myReports?.length ? (
                        <p className="text-muted mb-0 small">
                          No self report yet. Complete a SBI PRO session to get
                          your report.
                        </p>
                      ) : (
                        <CustomDataTable
                          columns={myReportsColumns}
                          data={myReports}
                          count={myReports.length}
                          params={initialSortingParams}
                          setParams={() => {}}
                          pagination={false}
                          responsive
                          striped
                          dense
                          noDataComponent="No self report yet."
                        />
                      )}
                    </Card.Body>
                  </Card>

                  {/* Section 2: Client Reports – jinke sessions maine as Trainer conduct kiye */}
                  <Card className="sbi-pro-report-section">
                    <Card.Header className="bg-info bg-opacity-10 d-flex align-items-center gap-2">
                      <span className="sbi-pro-section-icon">👥</span>
                      <div>
                        <strong>Client Reports</strong>
                        <span
                          className="badge bg-info bg-opacity-25 text-info ms-2"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Trainer
                        </span>
                        <div className="small text-muted">
                          Reports of users whose SBI PRO sessions YOU conducted
                          as trainer
                        </div>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {!clientReports?.length ? (
                        <p className="text-muted mb-0 small">
                          No client reports yet. Conduct SBI PRO sessions to see
                          reports here.
                        </p>
                      ) : (
                        <CustomDataTable
                          columns={clientReportsColumns}
                          data={clientReports}
                          count={clientReports.length}
                          params={initialSortingParams}
                          setParams={() => {}}
                          pagination={false}
                          responsive
                          striped
                          dense
                          noDataComponent="No client reports yet."
                        />
                      )}
                    </Card.Body>
                  </Card>
                </div>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </MainCard>

      {/* View Images Modal */}
      <Modal
        show={!!viewSession}
        onHide={() => setViewSession(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {viewSession &&
              (viewSession.beneficiaryType === "OTHER" ? (
                <>
                  Finger Images — {viewSession.beneficiaryName || "—"} •{" "}
                  {viewSession.beneficiaryPhone || "—"}
                </>
              ) : (
                "Your Finger Images"
              ))}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewSession?.images && (
            <Row>
              {FINGER_TYPES.map((fingerType) => {
                const url = viewSession.images?.[fingerType];
                return (
                  <Col key={fingerType} xs={6} md={4} className="mb-3">
                    <div className="small text-muted mb-1">
                      {FINGER_LABELS[fingerType] || fingerType}
                    </div>
                    {url ? (
                      <img
                        src={url}
                        alt={fingerType}
                        className="img-fluid rounded border"
                        style={{ maxHeight: "120px", objectFit: "contain" }}
                      />
                    ) : (
                      <div
                        className="border rounded bg-light d-flex align-items-center justify-content-center"
                        style={{ height: "80px" }}
                      >
                        <span className="text-muted small">—</span>
                      </div>
                    )}
                  </Col>
                );
              })}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewSession(null)}>
            Close
          </Button>
          {viewSession && (
            <>
              <Button
                variant="success"
                disabled={verifying}
                onClick={() => {
                  handleConfirmClick(viewSession);
                  setViewSession(null);
                }}
              >
                {verifying ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Confirm"
                )}
              </Button>
              <Button
                variant="outline-danger"
                disabled={verifying}
                onClick={() => {
                  handleRejectClick(viewSession);
                  setViewSession(null);
                }}
              >
                Reject
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Confirm Verify Modal */}
      <Modal
        show={!!confirmVerifySession}
        onHide={() => setConfirmVerifySession(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Finger Images</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>Please verify:</strong>{" "}
            {confirmVerifySession?.beneficiaryType === "OTHER"
              ? `Are these the correct finger images for ${confirmVerifySession?.beneficiaryName || "this person"}?`
              : "Are these your correct finger images?"}
          </p>
          <p className="text-muted small mb-0">
            Clicking confirm will send your finger images for SBI PRO analysis.
            This cannot be undone. If images are wrong, click Reject so the
            trainer can re-upload.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmVerifySession(null)}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            disabled={verifying}
            onClick={handleConfirmVerify}
          >
            {verifying ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Yes, These Are My Images – Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Reject Modal (replaces window.confirm) */}
      <Modal
        show={!!rejectSession}
        onHide={() => setRejectSession(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reject Finger Images?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            {rejectSession?.beneficiaryType === "OTHER"
              ? `Rejecting will reopen the session for ${rejectSession?.beneficiaryName || "this person"}. The trainer will need to re-upload the finger images.`
              : "Rejecting will reopen this session. The trainer will need to re-upload the finger images."}
          </p>
          <p className="text-muted small mb-0">
            Only reject if the images are incorrect or belong to someone else.
            Are you sure?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRejectSession(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={verifying}
            onClick={handleRejectConfirm}
          >
            {verifying ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Yes, Reject
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

SbiProIndex.propTypes = {
  assignedSessions: PropTypes.array,
  assignedPagination: PropTypes.object,
  loadingAssigned: PropTypes.bool,
  pendingVerificationSessions: PropTypes.array,
  loadingPendingVerification: PropTypes.bool,
  verifying: PropTypes.bool,
  myReports: PropTypes.array,
  loadingReports: PropTypes.bool,
  clientReports: PropTypes.array,
  loadingClientReports: PropTypes.bool,
  getAssignedSbiProSessions: PropTypes.func.isRequired,
  getPendingSbiProVerification: PropTypes.func.isRequired,
  getMySbiProReports: PropTypes.func.isRequired,
  getClientReports: PropTypes.func.isRequired,
  verifySbiProSession: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  assignedSessions: state.sbiPro?.assignedSessions ?? [],
  assignedPagination: state.sbiPro?.assignedPagination ?? {},
  loadingAssigned: state.sbiPro?.loadingAssigned ?? false,
  pendingVerificationSessions: state.sbiPro?.pendingVerificationSessions ?? [],
  loadingPendingVerification: state.sbiPro?.loadingPendingVerification ?? false,
  verifying: state.sbiPro?.verifying ?? false,
  myReports: state.sbiPro?.myReports ?? [],
  loadingReports: state.sbiPro?.loadingReports ?? false,
  clientReports: state.sbiPro?.clientReports ?? [],
  loadingClientReports: state.sbiPro?.loadingClientReports ?? false,
});

export default connect(mapStateToProps, {
  getAssignedSbiProSessions,
  getPendingSbiProVerification,
  getMySbiProReports,
  getClientReports,
  verifySbiProSession,
})(SbiProIndex);
