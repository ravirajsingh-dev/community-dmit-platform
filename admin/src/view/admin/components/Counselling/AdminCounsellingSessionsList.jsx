/**
 * Admin Counselling Sessions - Designation_2 (COUNSELLOR)
 * List sessions, confirm-close for USER_CONFIRMATION_PENDING / ISSUE_REPORTED
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Badge,
  Spinner,
  Modal,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { format, parseISO } from "date-fns";
import {
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import { getInitialSortingParams } from "@src/constants";
import { Card } from "react-bootstrap";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

import {
  getAdminCounsellingSessions,
  adminConfirmCloseCounselling,
  adminCloseWithoutCommissionCounselling,
  adminRequestRecounsellingCounselling,
} from "@src/actions/adminCounsellingActions";

const STATUS_BADGES = {
  CREATED: "secondary",
  COUNSELLOR_COMPLETED: "info",
  USER_CONFIRMATION_PENDING: "warning",
  ISSUE_REPORTED: "danger",
  RECOUNSELLING_PENDING: "warning",
  RECOUNSELLING_IN_PROGRESS: "info",
  CLOSED: "success",
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "USER_CONFIRMATION_PENDING", label: "Pending user confirmation" },
  { value: "ISSUE_REPORTED", label: "Issue reported" },
  { value: "RECOUNSELLING_PENDING", label: "Re-counselling pending" },
  { value: "RECOUNSELLING_IN_PROGRESS", label: "Re-counselling in progress" },
  { value: "CLOSED", label: "Closed" },
  { value: "CREATED", label: "Created" },
];

const AdminCounsellingSessionsList = ({
  sessions,
  pagination,
  loading,
  processing,
  getAdminCounsellingSessions,
  adminConfirmCloseCounselling,
  adminCloseWithoutCommissionCounselling,
  adminRequestRecounsellingCounselling,
}) => {
  const [params, setParams] = useState(() =>
    getInitialSortingParams({
      status: "",
      counsellorMemberId: "",
      requesterMemberId: "",
      dateFrom: "",
      dateTo: "",
    }),
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [counsellorMemberIdFilter, setCounsellorMemberIdFilter] = useState("");
  const [requesterMemberIdFilter, setRequesterMemberIdFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    session: null,
  });
  const [closeNoCommissionModal, setCloseNoCommissionModal] = useState({
    show: false,
    session: null,
  });
  const [closeNoCommissionReason, setCloseNoCommissionReason] = useState("");
  const [recounsellingModal, setRecounsellingModal] = useState({
    show: false,
    session: null,
  });

  useEffect(() => {
    getAdminCounsellingSessions(params);
  }, [
    params.status,
    params.page,
    params.limit,
    params.counsellorMemberId,
    params.requesterMemberId,
    params.dateFrom,
    params.dateTo,
  ]);

  const refresh = () => getAdminCounsellingSessions(params);
  const applyFilters = () => {
    setParams((p) => ({
      ...p,
      status: statusFilter,
      counsellorMemberId: counsellorMemberIdFilter,
      requesterMemberId: requesterMemberIdFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      page: 1,
    }));
  };
  const resetFilters = () => {
    setStatusFilter("");
    setCounsellorMemberIdFilter("");
    setRequesterMemberIdFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setParams((p) => ({
      ...p,
      status: "",
      counsellorMemberId: "",
      requesterMemberId: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
    }));
  };
  useEffect(() => {
    setStatusFilter(params.status || "");
    setCounsellorMemberIdFilter(params.counsellorMemberId || "");
    setRequesterMemberIdFilter(params.requesterMemberId || "");
    setDateFromFilter(params.dateFrom || "");
    setDateToFilter(params.dateTo || "");
  }, [
    params.status,
    params.counsellorMemberId,
    params.requesterMemberId,
    params.dateFrom,
    params.dateTo,
  ]);

  const handleCounsellorMemberIdChange = createMemberIdChangeHandler(
    (e) => setCounsellorMemberIdFilter(e.target.value),
    "counsellorMemberId",
  );
  const handleCounsellorMemberIdPaste = createMemberIdPasteHandler(
    (formatted) => setCounsellorMemberIdFilter(formatted),
  );
  const handleCounsellorMemberIdKeyDown = createMemberIdKeyDownHandler(
    counsellorMemberIdFilter,
    (e) => setCounsellorMemberIdFilter(e.target.value),
    "counsellorMemberId",
  );
  const handleRequesterMemberIdChange = createMemberIdChangeHandler(
    (e) => setRequesterMemberIdFilter(e.target.value),
    "requesterMemberId",
  );
  const handleRequesterMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setRequesterMemberIdFilter(formatted),
  );
  const handleRequesterMemberIdKeyDown = createMemberIdKeyDownHandler(
    requesterMemberIdFilter,
    (e) => setRequesterMemberIdFilter(e.target.value),
    "requesterMemberId",
  );

  const getBookedSlotDisplay = (session) => {
    const appointment = session?.appointmentId;
    if (!appointment) return "-";
    const slotStart = appointment?.slotId?.startTime;
    const slotEnd = appointment?.slotId?.endTime;
    const slotDateKey =
      appointment?.dateKey ||
      (appointment?.sessionStartTime
        ? format(parseISO(appointment.sessionStartTime), "yyyy-MM-dd")
        : null);
    const formatSlotTime = (time) => {
      if (!time || !slotDateKey) return null;
      return format(parseISO(`${slotDateKey}T${time}:00.000Z`), "hh:mm a");
    };
    const slotStartDisplay = formatSlotTime(slotStart);
    const slotEndDisplay = formatSlotTime(slotEnd);
    if (appointment?.sessionStartTime && slotStart && slotEnd) {
      return `${format(parseISO(appointment.sessionStartTime), "dd/MM/yyyy")}, ${
        slotStartDisplay || slotStart
      } - ${slotEndDisplay || slotEnd}`;
    }
    if (slotStart && slotEnd && appointment?.dateKey) {
      return `${format(
        parseISO(`${appointment.dateKey}T00:00:00.000Z`),
        "dd/MM/yyyy",
      )}, ${slotStartDisplay || slotStart} - ${slotEndDisplay || slotEnd}`;
    }
    if (appointment?.sessionStartTime) {
      return format(
        parseISO(appointment.sessionStartTime),
        "dd/MM/yyyy, hh:mm a",
      );
    }
    if (appointment?.dateKey) {
      return format(
        parseISO(`${appointment.dateKey}T00:00:00.000Z`),
        "dd/MM/yyyy",
      );
    }
    return "-";
  };

  const handleConfirmOpen = (session) => {
    setConfirmModal({ show: true, session });
  };

  const handleConfirmClose = () => {
    if (!confirmModal.session) return;
    adminConfirmCloseCounselling(confirmModal.session._id, () => {
      setConfirmModal({ show: false, session: null });
      refresh();
    });
  };

  const handleCloseNoCommission = () => {
    if (!closeNoCommissionModal.session) return;
    if (!closeNoCommissionReason.trim()) return;
    adminCloseWithoutCommissionCounselling(
      closeNoCommissionModal.session._id,
      closeNoCommissionReason.trim(),
      () => {
        setCloseNoCommissionModal({ show: false, session: null });
        setCloseNoCommissionReason("");
        refresh();
      },
    );
  };

  const handleRequestRecounselling = () => {
    if (!recounsellingModal.session) return;
    adminRequestRecounsellingCounselling(recounsellingModal.session._id, () => {
      setRecounsellingModal({ show: false, session: null });
      refresh();
    });
  };

  const canAdminClose = (s) =>
    s.status === "USER_CONFIRMATION_PENDING" || s.status === "ISSUE_REPORTED";

  const isIssueReported = (s) => s.status === "ISSUE_REPORTED";

  const getHoursSinceIssue = (s) => {
    if (s.status !== "ISSUE_REPORTED" || !s.issueReportedAt) return null;
    const diff = Date.now() - new Date(s.issueReportedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  };

  const statusCards = [
    {
      key: "",
      label: "ALL",
      icon: FiCalendar,
      className: "admin-stat-card--total",
    },
    {
      key: "USER_CONFIRMATION_PENDING",
      label: "Pending user confirmation",
      icon: FiClock,
      className: "admin-stat-card--warning",
    },
    {
      key: "ISSUE_REPORTED",
      label: "Issue reported",
      icon: FiAlertCircle,
      className: "admin-stat-card--danger",
    },
    {
      key: "RECOUNSELLING_PENDING",
      label: "Re-counselling pending",
      icon: FiRefreshCw,
      className: "admin-stat-card--muted",
    },
  ];
  const statusCounts = (sessions || []).reduce(
    (acc, session) => {
      if (session.status === "USER_CONFIRMATION_PENDING") acc.pendingUser += 1;
      if (session.status === "ISSUE_REPORTED") acc.issueReported += 1;
      if (session.status === "RECOUNSELLING_PENDING")
        acc.recounsellingPending += 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, pendingUser: 0, issueReported: 0, recounsellingPending: 0 },
  );
  const cardValueByKey = {
    "": statusCounts.all,
    USER_CONFIRMATION_PENDING: statusCounts.pendingUser,
    ISSUE_REPORTED: statusCounts.issueReported,
    RECOUNSELLING_PENDING: statusCounts.recounsellingPending,
  };

  const columns = [
    {
      name: "Counsellor",
      selector: (row) =>
        row.counsellorId
          ? `${row.counsellorId.name || "-"} (${row.counsellorId.memberId || "-"})`
          : "-",
      width: "250px",
      wrap: true,
    },
    {
      name: "Requester",
      selector: (row) =>
        row.requesterId
          ? `${row.requesterId.name || "-"} (${row.requesterId.memberId || "-"})`
          : "-",
      width: "250px",
      wrap: true,
    },
    {
      name: "Date",
      selector: (row) => getBookedSlotDisplay(row),
      width: "220px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <div>
          <Badge bg={STATUS_BADGES[row.status] || "secondary"}>
            {row.status}
          </Badge>
          {isIssueReported(row) &&
            (() => {
              const hrs = getHoursSinceIssue(row);
              if (hrs == null) return null;
              if (hrs >= 24) {
                return (
                  <Badge bg="warning" className="ms-1" text="dark">
                    24+ hrs – please complete
                  </Badge>
                );
              }
              return (
                <span className="small text-muted ms-1">
                  ({hrs} hrs since issue)
                </span>
              );
            })()}
        </div>
      ),
      width: "150px",
    },
    {
      name: "Completed",
      selector: (row) =>
        row.completedAt
          ? format(parseISO(row.completedAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
    {
      name: "Actions",
      width: "200px",
      cell: (row) => (
        <div className="d-flex gap-1 flex-wrap">
          {canAdminClose(row) && (
            <Button
              size="sm"
              variant="primary"
              disabled={processing}
              onClick={() => handleConfirmOpen(row)}
            >
              {processing ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Confirm & Close"
              )}
            </Button>
          )}
          {isIssueReported(row) && (
            <>
              <Button
                size="sm"
                variant="outline-danger"
                disabled={processing}
                onClick={() => {
                  setCloseNoCommissionModal({ show: true, session: row });
                  setCloseNoCommissionReason("");
                }}
              >
                Close & Re-counselling Required (No Commission)
              </Button>
              <Button
                size="sm"
                variant="outline-warning"
                disabled={processing}
                onClick={() =>
                  setRecounsellingModal({ show: true, session: row })
                }
              >
                Re-counselling
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Counselling Sessions"
        crumbs={[{ name: "Appointments" }, { name: "Counselling Sessions" }]}
      />

      <>
        <Row className="g-3 mb-3">
          {statusCards.map((item) => {
            const Icon = item.icon;
            const isSelected = (params.status || "") === item.key;
            return (
              <Col xs={6} md={3} key={item.label}>
                <Card
                  className={`admin-stat-card users-summary-card ${item.className} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setParams((p) => ({
                      ...p,
                      status: item.key,
                      page: 1,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setParams((p) => ({
                        ...p,
                        status: item.key,
                        page: 1,
                      }));
                    }
                  }}
                >
                  <Card.Body className="admin-stat-card__body">
                    <div className="admin-stat-card__icon">
                      <Icon size={18} />
                    </div>
                    <div className="admin-stat-card__meta">
                      <div className="admin-stat-card__label">{item.label}</div>
                      <div className="admin-stat-card__value">
                        {cardValueByKey[item.key]}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

        <div className="mb-3 users-filter-wrap">
          <div className="users-filters-panel">
            <div className="users-filters-panel__header">
              <button
                type="button"
                className="users-filters-panel__toggle"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
              >
                <FiFilter size={16} />
                <span>All Filters</span>
                {isFiltersOpen ? (
                  <FiChevronUp size={18} />
                ) : (
                  <FiChevronDown size={18} />
                )}
              </button>
            </div>
            {isFiltersOpen && (
              <div className="users-filters-panel__body">
                <Row className="g-3">
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Counsellor Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={counsellorMemberIdFilter}
                        onChange={handleCounsellorMemberIdChange}
                        onPaste={handleCounsellorMemberIdPaste}
                        onKeyDown={handleCounsellorMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Requester Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={requesterMemberIdFilter}
                        onChange={handleRequesterMemberIdChange}
                        onPaste={handleRequesterMemberIdPaste}
                        onKeyDown={handleRequesterMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Date From</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Date To</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex gap-2 mt-3 flex-wrap">
                  <Button variant="primary" onClick={applyFilters}>
                    <FiFilter size={15} className="me-1" />
                    Apply
                  </Button>
                  <Button variant="secondary" onClick={resetFilters}>
                    <FiRotateCcw size={15} className="me-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-table-shell">
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
            noDataComponent={
              <AdminNoDataState title="No counselling sessions found" />
            }
          />
        </div>
      </>

      <Modal
        show={confirmModal.show}
        onHide={() => setConfirmModal({ show: false, session: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Admin Confirm & Close</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to confirm and close this counselling session?
          Commission will be credited to the counsellor.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmModal({ show: false, session: null })}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmClose}
            disabled={processing}
          >
            {processing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Confirm & Close"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={closeNoCommissionModal.show}
        onHide={() => setCloseNoCommissionModal({ show: false, session: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Close & Re-counselling Required (No Commission)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Move this session to re-counselling queue without crediting commission
          to the counsellor. User can choose a counsellor again.
          <Form.Control
            className="mt-3"
            as="textarea"
            rows={3}
            value={closeNoCommissionReason}
            onChange={(e) => setCloseNoCommissionReason(e.target.value)}
            placeholder="Reason is required..."
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setCloseNoCommissionModal({ show: false, session: null });
              setCloseNoCommissionReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleCloseNoCommission}
            disabled={processing || !closeNoCommissionReason.trim()}
          >
            {processing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Close & Require Re-counselling"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={recounsellingModal.show}
        onHide={() => setRecounsellingModal({ show: false, session: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Request Re-counselling</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Counsellor will get another chance to conduct the session. Status will
          reset to CREATED so counsellor can mark complete again.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              setRecounsellingModal({ show: false, session: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleRequestRecounselling}
            disabled={processing}
          >
            {processing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Request Re-counselling"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminCounsellingSessionsList.propTypes = {
  sessions: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  processing: PropTypes.bool,
  getAdminCounsellingSessions: PropTypes.func.isRequired,
  adminConfirmCloseCounselling: PropTypes.func.isRequired,
  adminCloseWithoutCommissionCounselling: PropTypes.func.isRequired,
  adminRequestRecounsellingCounselling: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  sessions: state.adminCounselling?.sessions ?? [],
  pagination: state.adminCounselling?.pagination ?? {},
  loading: state.adminCounselling?.loading ?? false,
  processing: state.adminCounselling?.processing ?? false,
});

export default connect(mapStateToProps, {
  getAdminCounsellingSessions,
  adminConfirmCloseCounselling,
  adminCloseWithoutCommissionCounselling,
  adminRequestRecounsellingCounselling,
})(AdminCounsellingSessionsList);
