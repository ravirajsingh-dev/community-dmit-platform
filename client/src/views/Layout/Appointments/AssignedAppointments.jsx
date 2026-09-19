import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Button,
  Form,
  Spinner,
  Modal,
} from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { TbFilter } from "react-icons/tb";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { initialSortingParams } from "@src/constants";

import { getBookedSlotDisplay, getStatusDisplay } from "@src/utils/appointmentHelpers";

import {
  getAssignedAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  requestCancelAppointment,
} from "@src/actions/appointmentActions";
import { markResolvedCounselling } from "@src/actions/counsellingActions";

const defaultParams = {
  page: 1,
  limit: 20,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  designationCode: undefined,
  forWhomSearch: undefined,
  requestedFrom: undefined,
  requestedTo: undefined,
};

const AssignedAppointments = ({
  assignedAppointments,
  assignedPagination,
  loadingAssigned,
  accepting,
  rejecting,
  completing,
  requestingCancel,
  appliedParams,
  getAssignedAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  requestCancelAppointment,
  markResolvedCounselling,
}) => {
  const navigate = useNavigate();
  const effectiveParams = appliedParams
    ? { ...defaultParams, ...appliedParams }
    : defaultParams;
  const [params, setParams] = useState(initialSortingParams);
  const [cancelModal, setCancelModal] = useState({ show: false, apt: null });
  const [cancelReason, setCancelReason] = useState("");
  const [completeModal, setCompleteModal] = useState({
    show: false,
    apt: null,
  });
  const [completeForm, setCompleteForm] = useState({
    notes: "",
    durationMinutes: "",
    mode: "",
  });

  useEffect(() => {
    getAssignedAppointments({
      status: effectiveParams.status,
      dateFrom: effectiveParams.dateFrom,
      dateTo: effectiveParams.dateTo,
      designationCode: effectiveParams.designationCode,
      forWhomSearch: effectiveParams.forWhomSearch,
      requestedFrom: effectiveParams.requestedFrom,
      requestedTo: effectiveParams.requestedTo,
      page: params.page,
      limit: params.limit,
    });
  }, [
    effectiveParams.status,
    effectiveParams.dateFrom,
    effectiveParams.dateTo,
    effectiveParams.designationCode,
    effectiveParams.forWhomSearch,
    effectiveParams.requestedFrom,
    effectiveParams.requestedTo,
    params.page,
    params.limit,
    getAssignedAppointments,
  ]);

  const refetch = () =>
    getAssignedAppointments({
      status: effectiveParams.status,
      dateFrom: effectiveParams.dateFrom,
      dateTo: effectiveParams.dateTo,
      designationCode: effectiveParams.designationCode,
      forWhomSearch: effectiveParams.forWhomSearch,
      requestedFrom: effectiveParams.requestedFrom,
      requestedTo: effectiveParams.requestedTo,
      page: params.page,
      limit: params.limit,
    });

  const handleAccept = (id) => {
    acceptAppointment(id, refetch);
  };

  const handleReject = (id) => {
    if (window.confirm("Reject this appointment?")) {
      rejectAppointment(id, refetch);
    }
  };

  const handleRequestCancelOpen = (apt) => {
    setCancelModal({ show: true, apt });
    setCancelReason("");
  };

  const handleRequestCancelSubmit = () => {
    if (!cancelModal.apt) return;
    requestCancelAppointment(cancelModal.apt._id, cancelReason, () => {
      setCancelModal({ show: false, apt: null });
      refetch();
    });
  };

  const handleCompleteSubmit = () => {
    if (!completeModal.apt) return;
    const opts = {
      notes: completeForm.notes || undefined,
      durationMinutes: completeForm.durationMinutes
        ? parseInt(completeForm.durationMinutes, 10)
        : undefined,
      mode:
        completeForm.mode && ["ONLINE", "OFFLINE"].includes(completeForm.mode)
          ? completeForm.mode
          : undefined,
    };
    completeAppointment(completeModal.apt._id, opts, () => {
      setCompleteModal({ show: false, apt: null });
      setCompleteForm({ notes: "", durationMinutes: "", mode: "" });
      refetch();
    });
  };

  const handleMarkResolved = (counsellingSessionId) => {
    if (
      window.confirm(
        "Have you resolved the issue with the user? They will be asked to confirm again.",
      )
    ) {
      markResolvedCounselling(counsellingSessionId, refetch);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" })
      : "-";

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "-";

  const getForWhomDisplay = (a) => {
    if (!a) return { primary: "-", secondary: null, contact: null };
    const isSelf = a.beneficiaryType === "SELF" || !a.beneficiaryType;
    if (isSelf) {
      const r = a.requesterId;
      const contact =
        r && (r.phone || r.email)
          ? `Contact: ${r.phone || "-"} ${r.email ? `• ${r.email}` : ""}`
          : null;
      return {
        primary: r ? `${r.name || "-"} • ${r.phone || "-"}` : "-",
        secondary: r?.memberId ? `(${r.memberId})` : null,
        contact,
      };
    }
    return {
      primary: `${a.beneficiaryName || "-"} • ${a.beneficiaryPhone || "-"}`,
      secondary: a.requesterId ? `Booked by: ${a.requesterId.name}` : null,
      contact: a.beneficiaryPhone ? `Contact: ${a.beneficiaryPhone}` : null,
    };
  };

  const columns = [
    {
      name: "Date & Time",
      selector: (a) => getBookedSlotDisplay(a),
      width: "250px",
      wrap: true,
    },
    { name: "Designation", selector: (a) => a.designationName, width: "180px", wrap: true },
    {
      name: "For whom (Client)",
      cell: (a) => {
        const fw = getForWhomDisplay(a);
        return (
          <div>
            <strong>{fw.primary}</strong>
            {fw.secondary && (
              <div className="small text-muted">{fw.secondary}</div>
            )}
            {a.counsellingSessionStatus === "ISSUE_REPORTED" && fw.contact && (
              <div className="small mt-1 text-info fw-bold">
                📞 {fw.contact}
              </div>
            )}
          </div>
        );
      },
      width: "180px",
    },
    {
      name: "Status",
      cell: (a) => {
        const status = getStatusDisplay(a.status);
        return (
          <span className={`apt-status-chip apt-status-${status.variant}`}>
            {status.label}
          </span>
        );
      },
      width: "250px",
    },
    {
      name: "Requested",
      selector: (a) => a.requestedAt ? format(parseISO(a.requestedAt), "dd/MM/yyyy, hh:mm a") : "-",
      width: "200px",
    },
    {
      name: "Actions",
      width: "300px",
      cell: (a) => (
        <>
          {a.status === "PENDING" && (
            <>
              <Button
                size="sm"
                variant="outline-success"
                className="me-1"
                disabled={accepting}
                onClick={() => handleAccept(a._id)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                disabled={rejecting}
                onClick={() => handleReject(a._id)}
              >
                Reject
              </Button>
            </>
          )}
          {a.status === "ACCEPTED" && (
            <>
              {a.designationCode === 2 && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    className="me-1"
                    disabled={
                      completing ||
                      [
                        "USER_CONFIRMATION_PENDING",
                        "ISSUE_REPORTED",
                        "CLOSED",
                      ].includes(a.counsellingSessionStatus)
                    }
                    onClick={() => {
                      setCompleteModal({ show: true, apt: a });
                      setCompleteForm({
                        notes: "",
                        durationMinutes: "",
                        mode: "",
                      });
                    }}
                  >
                    {completing ? (
                      <Spinner animation="border" size="sm" />
                    ) : [
                        "USER_CONFIRMATION_PENDING",
                        "ISSUE_REPORTED",
                        "CLOSED",
                      ].includes(a.counsellingSessionStatus) ? (
                      "Awaiting user"
                    ) : (
                      "Mark Complete"
                    )}
                  </Button>
                  {a.counsellingSessionStatus ===
                    "USER_CONFIRMATION_PENDING" && (
                    <span className="small text-muted ms-1">
                      (User to confirm)
                    </span>
                  )}
                  {a.counsellingSessionStatus === "ISSUE_REPORTED" &&
                    a.counsellingSessionId && (
                      <Button
                        size="sm"
                        variant="warning"
                        className="ms-1"
                        disabled={completing}
                        onClick={() =>
                          handleMarkResolved(a.counsellingSessionId)
                        }
                      >
                        I&apos;ve Resolved
                      </Button>
                    )}
                </>
              )}
              <Button
                size="sm"
                variant="outline-warning"
                disabled={
                  requestingCancel ||
                  (a.designationCode === 2 &&
                    [
                      "USER_CONFIRMATION_PENDING",
                      "ISSUE_REPORTED",
                      "CLOSED",
                    ].includes(a.counsellingSessionStatus))
                }
                onClick={() => handleRequestCancelOpen(a)}
              >
                Request Cancel
              </Button>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <Container className="appointments-page book-appointment-page">
      <AppBreadCrumb
        pageTitle="Assigned to Me"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Assigned to Me" },
        ]}
      />

      <MainCard className="book-apt-card">
        <div className="apt-hero apt-hero-trainer book-apt-hero">
          <div className="book-apt-hero-inner">
            <span
              className="apt-hero-icon book-apt-hero-icon"
              role="img"
              aria-label="Trainer"
            >
              👤
            </span>
            <div className="apt-hero-content flex-grow-1">
              <span className="apt-hero-badge apt-badge-trainer book-apt-badge">
                I'm the Trainer
              </span>
              <h5 className="apt-hero-title book-apt-title mb-2">
                Assigned to Me
              </h5>
              <p className="apt-hero-desc mb-0 text-muted">
                Appointments where clients booked with you. Accept or request
                cancellation.
              </p>
            </div>
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 book-apt-filter-btn"
              onClick={() => navigate("/user/appointments/assigned/filters")}
            >
              <TbFilter size={18} />
              Filters
            </Button>
          </div>
        </div>

        {appliedParams && (
          <div className="apt-filter-bar d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted">
              Filters applied: Date, Designation, For Whom, Status, Requested
            </span>
          </div>
        )}

        <Card className="apt-table-card">
          <Card.Body>
            {!assignedAppointments?.length && !loadingAssigned ? (
              <div className="apt-empty-state">
                <div className="apt-empty-icon">👤</div>
                <div className="apt-empty-title">No assigned appointments</div>
                <div className="apt-empty-hint">
                  Sessions will appear here when clients book with you.
                </div>
              </div>
            ) : (
              <CustomDataTable
                columns={columns}
                data={assignedAppointments || []}
                count={assignedPagination?.totalCount ?? 0}
                params={params}
                setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
                pagination
                responsive
                striped
                paginationServer
                progressPending={loadingAssigned}
                noDataComponent="No assigned appointments."
              />
            )}
          </Card.Body>
        </Card>
      </MainCard>

      <Modal
        show={cancelModal.show}
        onHide={() => setCancelModal({ show: false, apt: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Request Cancellation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setCancelModal({ show: false, apt: null })}
          >
            Close
          </Button>
          <Button
            variant="warning"
            onClick={handleRequestCancelSubmit}
            disabled={requestingCancel}
          >
            {requestingCancel ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Submit Request"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={completeModal.show}
        onHide={() => setCompleteModal({ show: false, apt: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Mark Counselling Complete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Confirm that you have completed the counselling session. User will
            be notified to confirm & close.
          </p>
          <Form.Group className="mb-2">
            <Form.Label>Notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Brief summary of the session..."
              value={completeForm.notes}
              onChange={(e) =>
                setCompleteForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Duration (minutes, optional)</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={180}
              placeholder="e.g. 30"
              value={completeForm.durationMinutes}
              onChange={(e) =>
                setCompleteForm((f) => ({
                  ...f,
                  durationMinutes: e.target.value,
                }))
              }
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Mode (optional)</Form.Label>
            <Form.Select
              value={completeForm.mode}
              onChange={(e) =>
                setCompleteForm((f) => ({ ...f, mode: e.target.value }))
              }
            >
              <option value="">Select...</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setCompleteModal({ show: false, apt: null })}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCompleteSubmit}
            disabled={completing}
          >
            {completing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Mark Complete"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AssignedAppointments.propTypes = {
  assignedAppointments: PropTypes.array,
  assignedPagination: PropTypes.object,
  loadingAssigned: PropTypes.bool,
  accepting: PropTypes.bool,
  rejecting: PropTypes.bool,
  completing: PropTypes.bool,
  requestingCancel: PropTypes.bool,
  appliedParams: PropTypes.object,
  getAssignedAppointments: PropTypes.func.isRequired,
  acceptAppointment: PropTypes.func.isRequired,
  rejectAppointment: PropTypes.func.isRequired,
  completeAppointment: PropTypes.func.isRequired,
  requestCancelAppointment: PropTypes.func.isRequired,
  markResolvedCounselling: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  assignedAppointments: state.appointment?.assignedAppointments ?? [],
  assignedPagination: state.appointment?.assignedPagination ?? {},
  loadingAssigned: state.appointment?.loadingAssigned ?? false,
  accepting: state.appointment?.accepting ?? false,
  rejecting: state.appointment?.rejecting ?? false,
  completing: state.appointment?.completing ?? false,
  requestingCancel: state.appointment?.requestingCancel ?? false,
  appliedParams: state.appointment?.appliedParamsAssignedToMe ?? null,
});

export default connect(mapStateToProps, {
  getAssignedAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  requestCancelAppointment,
  markResolvedCounselling,
})(AssignedAppointments);
