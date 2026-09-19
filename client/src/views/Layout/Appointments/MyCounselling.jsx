/**
 * My Counselling - User's counselling sessions (as requester)
 * Step-by-step confirm flow: Counselling huyi? → Rating → Koi issue? → Confirm & Close
 */

import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Badge,
  Button,
  Form,
  Spinner,
  Modal,
} from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { TbFilter } from "react-icons/tb";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { initialSortingParams } from "@src/constants";

import {
  getBookedSlotDisplay,
  getHolderDisplay,
  getStatusDisplay,
} from "@src/utils/appointmentHelpers";

import {
  getMyCounsellingSessions,
  confirmCloseCounselling,
} from "@src/actions/counsellingActions";

const defaultParams = { page: 1, limit: 20, status: undefined };

const MyCounselling = ({
  sessions,
  pagination,
  loading,
  confirming,
  appliedParams,
  getMyCounsellingSessions,
  confirmCloseCounselling,
}) => {
  const navigate = useNavigate();
  const effectiveParams = appliedParams
    ? { ...defaultParams, ...appliedParams }
    : defaultParams;
  const [params, setParams] = useState(initialSortingParams);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    session: null,
  });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    counsellingDone: null,
    rating: null,
    hasIssue: false,
    issueDescription: "",
  });

  useEffect(() => {
    getMyCounsellingSessions({
      status: effectiveParams.status,
      page: params.page,
      limit: params.limit,
    });
  }, [
    effectiveParams.status,
    params.page,
    params.limit,
    getMyCounsellingSessions,
  ]);

  const refetch = () =>
    getMyCounsellingSessions({
      status: effectiveParams.status,
      page: params.page,
      limit: params.limit,
    });

  const handleConfirmOpen = (session) => {
    setConfirmModal({ show: true, session });
    setStep(1);
    setForm({
      counsellingDone: null,
      rating: null,
      hasIssue: false,
      issueDescription: "",
    });
  };

  const handleConfirmSubmit = () => {
    if (!confirmModal.session) return;
    const { counsellingDone, rating, hasIssue, issueDescription } = form;
    if (step === 1 && counsellingDone === null) return;
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    confirmCloseCounselling(
      confirmModal.session._id,
      {
        counsellingDone: counsellingDone === true,
        rating: rating != null ? parseFloat(rating) : null,
        hasIssue: hasIssue === true,
        issueDescription: issueDescription || null,
      },
      (res) => {
        setConfirmModal({ show: false, session: null });
        refetch();
      },
    );
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" })
      : "-";

  const pendingSessions = sessions.filter(
    (s) => s.status === "USER_CONFIRMATION_PENDING",
  );

  const columns = [
    {
      name: "Counsellor",
      cell: (s) => {
        const hd = getHolderDisplay(s.counsellorId);
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
      wrap: true,
    },
    {
      name: "Date & Time",
      selector: (s) => getBookedSlotDisplay(s.appointmentId),
      width: "250px",
    },
    {
      name: "Status",
      cell: (s) => {
        const status = getStatusDisplay(s.status);

        return (
          <span className={`apt-status-chip apt-status-${status.variant}`}>
            {status.label}
          </span>
        );
      },
      width: "250px",
    },
    {
      name: "Actions",
      cell: (s) =>
        s.status === "USER_CONFIRMATION_PENDING" ? (
          <Button
            size="sm"
            variant="primary"
            disabled={confirming}
            onClick={() => handleConfirmOpen(s)}
          >
            Confirm & Close
          </Button>
        ) : s.status === "ISSUE_REPORTED" ? (
          <span className="small text-muted">
            Issue reported. Counsellor will resolve. You&apos;ll be asked to
            confirm again.
          </span>
        ) : s.status === "RECOUNSELLING_PENDING" ? (
          <span className="small text-muted">
            Re-counselling approved by admin. Please book counselling again with your preferred counsellor.
          </span>
        ) : s.status === "RECOUNSELLING_IN_PROGRESS" ? (
          <span className="small text-muted">
            Re-counselling booking is in progress. Complete the new session to finish this flow.
          </span>
        ) : null,
      width: "240px",
    },
  ];

  return (
    <Container className="appointments-page book-appointment-page">
      <AppBreadCrumb
        pageTitle="My Counselling"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "My Counselling" },
        ]}
      />

      <MainCard className="book-apt-card">
        <div className="apt-hero apt-hero-client book-apt-hero">
          <div className="book-apt-hero-inner">
            <span
              className="apt-hero-icon book-apt-hero-icon"
              role="img"
              aria-label="Counselling"
            >
              💬
            </span>
            <div className="apt-hero-content flex-grow-1">
              <span className="apt-hero-badge apt-badge-client book-apt-badge">
                I'm the Client
              </span>
              <h5 className="apt-hero-title book-apt-title mb-2">
                My Counselling Sessions
              </h5>
              <p className="apt-hero-desc mb-0 text-muted">
                Sessions where your counsellor marked complete. Confirm and close
                to complete the flow.
              </p>
            </div>
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 book-apt-filter-btn"
              onClick={() => navigate("/user/appointments/counselling/filters")}
            >
              <TbFilter size={18} />
              Filters
            </Button>
          </div>
        </div>

        {appliedParams && (
          <div className="apt-filter-bar d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted">
              Filter: {effectiveParams.status || "All statuses"}
            </span>
          </div>
        )}

        <Card className="apt-table-card">
          <Card.Body>
            {!sessions?.length && !loading ? (
              <div className="apt-empty-state">
                <div className="apt-empty-icon">💬</div>
                <div className="apt-empty-title">No counselling sessions</div>
                <div className="apt-empty-hint">
                  Book a counselling appointment to get started.
                </div>
              </div>
            ) : (
              <CustomDataTable
                columns={columns}
                data={sessions || []}
                count={pagination?.totalCount ?? 0}
                params={params}
                setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
                pagination
                responsive
                striped
                paginationServer
                progressPending={loading}
                noDataComponent="No counselling sessions."
              />
            )}
          </Card.Body>
        </Card>
      </MainCard>

      <Modal
        show={confirmModal.show}
        onHide={() => setConfirmModal({ show: false, session: null })}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm & Close Counselling</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {step === 1 && (
            <>
              <p className="mb-3">Did the counselling session take place?</p>
              <div className="d-flex gap-2">
                <Button
                  variant={
                    form.counsellingDone === true
                      ? "success"
                      : "outline-success"
                  }
                  onClick={() =>
                    setForm((f) => ({ ...f, counsellingDone: true }))
                  }
                >
                  Yes
                </Button>
                <Button
                  variant={
                    form.counsellingDone === false ? "danger" : "outline-danger"
                  }
                  onClick={() =>
                    setForm((f) => ({ ...f, counsellingDone: false }))
                  }
                >
                  No
                </Button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="mb-3">Rating (optional, 1-5)</p>
              <Form.Select
                value={form.rating ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rating: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              >
                <option value="">Skip</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </Form.Select>
            </>
          )}
          {step === 3 && (
            <>
              <p className="mb-3">Any issue to report?</p>
              <div className="d-flex gap-2 mb-2">
                <Button
                  variant={
                    form.hasIssue === false ? "success" : "outline-success"
                  }
                  onClick={() => setForm((f) => ({ ...f, hasIssue: false }))}
                >
                  No, all good
                </Button>
                <Button
                  variant={
                    form.hasIssue === true ? "warning" : "outline-warning"
                  }
                  onClick={() => setForm((f) => ({ ...f, hasIssue: true }))}
                >
                  Yes, issue
                </Button>
              </div>
              {form.hasIssue && (
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Describe the issue..."
                  value={form.issueDescription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issueDescription: e.target.value }))
                  }
                />
              )}
            </>
          )}
          {step === 4 && (
            <p className="mb-0">
              {form.counsellingDone && !form.hasIssue
                ? "Click Confirm to close this session. Counsellor will receive commission."
                : form.hasIssue
                  ? "Issue will be reported. Counsellor and admin will be notified."
                  : "Counselling did not happen. Issue will be reported."}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              step > 1
                ? setStep(step - 1)
                : setConfirmModal({ show: false, session: null })
            }
          >
            {step > 1 ? "Back" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSubmit}
            disabled={
              confirming || (step === 1 && form.counsellingDone === null)
            }
          >
            {confirming ? (
              <Spinner animation="border" size="sm" />
            ) : step < 4 ? (
              "Next"
            ) : (
              "Confirm & Close"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

MyCounselling.propTypes = {
  sessions: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  confirming: PropTypes.bool,
  appliedParams: PropTypes.object,
  getMyCounsellingSessions: PropTypes.func.isRequired,
  confirmCloseCounselling: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  sessions: state.counselling?.sessions ?? [],
  pagination: state.counselling?.pagination ?? {},
  loading: state.counselling?.loading ?? false,
  confirming: state.counselling?.confirming ?? false,
  appliedParams: state.counselling?.appliedParamsMyCounselling ?? null,
});

export default connect(mapStateToProps, {
  getMyCounsellingSessions,
  confirmCloseCounselling,
})(MyCounselling);
