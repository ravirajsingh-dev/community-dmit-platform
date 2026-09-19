import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Modal,
  Spinner,
  Badge,
  Card,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { format, parseISO } from "date-fns";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
} from "react-icons/fi";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import { getInitialSortingParams } from "@src/constants";

import {
  getAppointments,
  approveCancelRequest,
  rejectCancelRequest,
  adminCancelAppointment,
  createSbiProOverride,
} from "@src/actions/adminAppointmentActions";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCEL_REQUESTED", label: "Cancel Requests" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED_BY_USER", label: "Cancelled by User" },
  { value: "CANCELLED_BY_HOLDER", label: "Cancelled by Holder" },
  { value: "CANCELLED_BY_ADMIN", label: "Cancelled by Admin" },
  { value: "CANCELLED_BY_SYSTEM", label: "Cancelled by System" },
];

const STATUS_BADGES = {
  PENDING: "warning",
  ACCEPTED: "info",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED_BY_USER: "danger",
  CANCELLED_BY_HOLDER: "danger",
  CANCELLED_BY_ADMIN: "danger",
  CANCELLED_BY_SYSTEM: "danger",
  CANCEL_REQUESTED: "warning",
};

export const getBookedSlotDisplay = (appointment) => {
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
    return format(parseISO(appointment.sessionStartTime), "dd/MM/yyyy, hh:mm a");
  }
  if (appointment?.dateKey) {
    return format(
      parseISO(`${appointment.dateKey}T00:00:00.000Z`),
      "dd/MM/yyyy",
    );
  }
  return "-";
};

const AdminAppointmentManagement = ({
  appointments,
  pagination,
  designations,
  loading,
  processing,
  getAppointments,
  approveCancelRequest,
  rejectCancelRequest,
  adminCancelAppointment,
  createSbiProOverride,
}) => {
  const [params, setParams] = useState(() =>
    getInitialSortingParams({
      status: "",
      designationCode: "",
      dateFrom: "",
      dateTo: "",
    }),
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [approveCancelModal, setApproveCancelModal] = useState({
    show: false,
    apt: null,
  });
  const [approveCancelReason, setApproveCancelReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sbiProOverrideModal, setSbiProOverrideModal] = useState(false);
  const [sbiProOverrideForm, setSbiProOverrideForm] = useState({
    requesterId: "",
    holderId: "",
    dateKey: "",
    slotId: "",
  });

  useEffect(() => {
    getAppointments(params);
  }, [
    params.status,
    params.page,
    params.limit,
    params.designationCode,
    params.dateFrom,
    params.dateTo,
  ]);

  useEffect(() => {
    setStatusFilter(params.status || "");
    setDesignationFilter(params.designationCode || "");
    setDateFromFilter(params.dateFrom || "");
    setDateToFilter(params.dateTo || "");
  }, [params.status, params.designationCode, params.dateFrom, params.dateTo]);

  const refresh = () => getAppointments(params);
  const applyFilters = () => {
    setParams((p) => ({
      ...p,
      status: statusFilter,
      designationCode: designationFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      page: 1,
    }));
  };

  const resetFilters = () => {
    setStatusFilter("");
    setDesignationFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setParams((p) => ({
      ...p,
      status: "",
      designationCode: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
    }));
  };

  const statusCards = [
    {
      key: "PENDING",
      label: "Pending",
      icon: FiClock,
      className: "admin-stat-card--warning",
    },
    {
      key: "ACCEPTED",
      label: "Accepted",
      icon: FiCheckCircle,
      className: "admin-stat-card--total",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      icon: FiCheckCircle,
      className: "admin-stat-card--success",
    },
    {
      key: "REJECTED",
      label: "Rejected",
      icon: FiXCircle,
      className: "admin-stat-card--danger",
    },
  ];
  const statusCounts = (appointments || []).reduce(
    (acc, apt) => {
      if (acc[apt.status] != null) acc[apt.status] += 1;
      return acc;
    },
    { PENDING: 0, ACCEPTED: 0, COMPLETED: 0, REJECTED: 0 },
  );

  const handleApproveCancelOpen = (apt) => {
    setApproveCancelModal({ show: true, apt });
    setApproveCancelReason("");
  };

  const handleApproveCancelConfirm = () => {
    if (!approveCancelModal?.apt) return;
    approveCancelRequest(approveCancelModal.apt._id, () => {
      setApproveCancelModal({ show: false, apt: null });
      setApproveCancelReason("");
      refresh();
    });
  };

  const handleRejectCancel = (apt) => {
    rejectCancelRequest(apt._id, refresh);
  };

  const handleAdminCancel = (apt) => {
    setActionModal({ apt, type: "cancel" });
    setCancelReason("");
  };

  const executeAdminCancel = () => {
    if (!actionModal?.apt) return;
    adminCancelAppointment(actionModal.apt._id, cancelReason, () => {
      setActionModal(null);
      setCancelReason("");
      refresh();
    });
  };

  const requesterName = (a) => {
    const r = a.requesterId;
    return r ? `${r.name} (${r.memberId})` : "-";
  };

  const holderName = (a) => {
    const h = a.assignedTo;
    return h ? `${h.name} (${h.memberId})` : "-";
  };

  const personAddressLines = (p) => {
    if (!p) return "-";
    return (
      <div className="small text-muted">
        <div>
          <strong>Country:</strong> {p.country || "-"}
        </div>
        <div>
          <strong>State:</strong> {p.state || "-"}
        </div>
        <div>
          <strong>District:</strong> {p.district || "-"}
        </div>
        <div>
          <strong>Native Village:</strong> {p.nativeVillage || "-"}
        </div>
        <div>
          <strong>Current Address:</strong>{" "}
          {p.currentAddress || p.address || "-"}
        </div>
      </div>
    );
  };

  const showActionsColumn =
    params.status === "CANCEL_REQUESTED" ||
    (params.status &&
      ![
        "COMPLETED",
        "REJECTED",
        "CANCELLED_BY_USER",
        "CANCELLED_BY_HOLDER",
        "CANCELLED_BY_ADMIN",
        "CANCELLED_BY_SYSTEM",
      ].includes(params.status));

  const baseColumns = [
    {
      name: "Requester",
      cell: (row) => (
        <div>
          <div>{requesterName(row)}</div>
          {personAddressLines(row?.requesterId)}
        </div>
      ),
      width: "320px",
      wrap: true,
    },
    {
      name: "Holder",
      cell: (row) => (
        <div>
          <div>{holderName(row)}</div>
          {personAddressLines(row?.assignedTo)}
        </div>
      ),
      width: "320px",
      wrap: true,
    },
    {
      name: "Designation",
      selector: (row) => row.designationName || `Code ${row.designationCode}`,
      width: "200px",
      wrap: true,
    },
    {
      name: "Date & Time",
      selector: (row) => getBookedSlotDisplay(row),
      width: "280px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <Badge bg={STATUS_BADGES[row.status] || "secondary"}>
          {row.status}
        </Badge>
      ),
      width: "250px",
    },
    {
      name: "Created At",
      selector: (row) =>
        row.requestedAt
          ? format(parseISO(row.requestedAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
  ];

  const actionColumn = {
    name: "Actions",
    width: "210px",
    cell: (row) => (
      <div className="appointment-actions-cell">
        {row.status === "CANCEL_REQUESTED" && (
          <>
            <Button
              size="sm"
              variant="outline-success"
              disabled={processing}
              onClick={() => handleApproveCancelOpen(row)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              disabled={processing}
              onClick={() => handleRejectCancel(row)}
            >
              Reject
            </Button>
          </>
        )}
        {row.status !== "CANCEL_REQUESTED" &&
          ![
            "COMPLETED",
            "REJECTED",
            "CANCELLED_BY_USER",
            "CANCELLED_BY_HOLDER",
            "CANCELLED_BY_ADMIN",
            "CANCELLED_BY_SYSTEM",
          ].includes(row.status) && (
            <Button
              size="sm"
              variant="outline-danger"
              disabled={processing}
              onClick={() => handleAdminCancel(row)}
            >
              Cancel
            </Button>
          )}
      </div>
    ),
  };

  const columns = showActionsColumn
    ? [...baseColumns, actionColumn]
    : baseColumns;

  const handleSbiProOverrideSubmit = () => {
    const { requesterId, holderId, dateKey, slotId } = sbiProOverrideForm;
    if (!requesterId || !holderId || !dateKey || !slotId) {
      return;
    }
    createSbiProOverride({ requesterId, holderId, dateKey, slotId }, () => {
      setSbiProOverrideModal(false);
      setSbiProOverrideForm({
        requesterId: "",
        holderId: "",
        dateKey: "",
        slotId: "",
      });
      refresh();
    });
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Appointments"
        crumbs={[{ name: "Appointments" }]}
      />

      <>
        <Row className="g-3 mb-3">
          {statusCards.map((item) => {
            const Icon = item.icon;
            const isSelected = params.status === item.key;
            return (
              <Col xs={6} md={3} key={item.key}>
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
                        {statusCounts[item.key] || 0}
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
              <Button
                variant="outline-warning"
                size="sm"
                className="users-filters-panel__add-btn"
                onClick={() => setSbiProOverrideModal(true)}
                title="Create SBI PRO appointment bypassing fingerprint lock"
              >
                Create SBI PRO (Override Lock)
              </Button>
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
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value || "all"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Designation</Form.Label>
                      <Form.Select
                        value={designationFilter}
                        onChange={(e) => setDesignationFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {(designations || []).map((d) => (
                          <option
                            key={d.designationCode}
                            value={d.designationCode}
                          >
                            {d.name}
                          </option>
                        ))}
                      </Form.Select>
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
            data={appointments || []}
            count={pagination?.totalCount ?? 0}
            params={params}
            setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
            pagination
            responsive
            striped
            paginationServer
            progressPending={loading}
            noDataComponent={
              <AdminNoDataState
                title="No appointments found"
                description="Update filters or set status to All and check again."
              />
            }
          />
        </div>
      </>

      <Modal
        show={!!approveCancelModal.show && !!approveCancelModal.apt}
        onHide={() => setApproveCancelModal({ show: false, apt: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Approve Cancel Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {approveCancelModal?.apt && (
            <>
              <p>
                Approve cancellation for: {approveCancelModal.apt.dateKey} -{" "}
                {approveCancelModal.apt.designationName} -{" "}
                {requesterName(approveCancelModal.apt)} →{" "}
                {holderName(approveCancelModal.apt)}
              </p>
              <Form.Group>
                <Form.Label>Reason (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={approveCancelReason}
                  onChange={(e) => setApproveCancelReason(e.target.value)}
                  placeholder="Admin approval reason..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setApproveCancelModal({ show: false, apt: null })}
          >
            Close
          </Button>
          <Button
            variant="success"
            onClick={handleApproveCancelConfirm}
            disabled={processing}
          >
            {processing ? <Spinner animation="border" size="sm" /> : "Approve"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!actionModal && actionModal.type === "cancel"}
        onHide={() => setActionModal(null)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Admin Cancel Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionModal?.apt && (
            <>
              <p>
                Are you sure you want to cancel this appointment? This action
                cannot be undone.
              </p>
              <p>
                {actionModal.apt.dateKey} - {actionModal.apt.designationName} -{" "}
                {requesterName(actionModal.apt)} → {holderName(actionModal.apt)}
              </p>
              <Form.Group>
                <Form.Label>Reason (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setActionModal(null)}>
            Close
          </Button>
          <Button
            variant="danger"
            onClick={executeAdminCancel}
            disabled={processing}
          >
            {processing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Cancel Appointment"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={sbiProOverrideModal}
        onHide={() => setSbiProOverrideModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Create SBI PRO (Override Lock)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            User called &quot;meri finger analysis vapas kro&quot; – create
            appointment bypassing fingerprint lock.
          </p>
          <Form.Group className="mb-2">
            <Form.Label>Requester ID (User ObjectId)</Form.Label>
            <Form.Control
              value={sbiProOverrideForm.requesterId}
              onChange={(e) =>
                setSbiProOverrideForm((f) => ({
                  ...f,
                  requesterId: e.target.value,
                }))
              }
              placeholder="e.g. 507f1f77bcf86cd799439011"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Holder ID (Trainer ObjectId)</Form.Label>
            <Form.Control
              value={sbiProOverrideForm.holderId}
              onChange={(e) =>
                setSbiProOverrideForm((f) => ({
                  ...f,
                  holderId: e.target.value,
                }))
              }
              placeholder="Trainer user ID"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Date (YYYY-MM-DD)</Form.Label>
            <Form.Control
              type="date"
              value={sbiProOverrideForm.dateKey}
              onChange={(e) =>
                setSbiProOverrideForm((f) => ({
                  ...f,
                  dateKey: e.target.value,
                }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Slot ID</Form.Label>
            <Form.Control
              value={sbiProOverrideForm.slotId}
              onChange={(e) =>
                setSbiProOverrideForm((f) => ({ ...f, slotId: e.target.value }))
              }
              placeholder="Slot ObjectId"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setSbiProOverrideModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleSbiProOverrideSubmit}
            disabled={
              !sbiProOverrideForm.requesterId ||
              !sbiProOverrideForm.holderId ||
              !sbiProOverrideForm.dateKey ||
              !sbiProOverrideForm.slotId
            }
          >
            Create SBI PRO Appointment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminAppointmentManagement.propTypes = {
  appointments: PropTypes.array,
  pagination: PropTypes.object,
  designations: PropTypes.array,
  loading: PropTypes.bool,
  processing: PropTypes.bool,
  getAppointments: PropTypes.func.isRequired,
  approveCancelRequest: PropTypes.func.isRequired,
  rejectCancelRequest: PropTypes.func.isRequired,
  adminCancelAppointment: PropTypes.func.isRequired,
  createSbiProOverride: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  appointments: state.adminAppointment?.appointments ?? [],
  pagination: state.adminAppointment?.pagination ?? {},
  designations: state.adminAppointment?.designations ?? [],
  loading: state.adminAppointment?.loading ?? false,
  processing: state.adminAppointment?.processing ?? false,
});

export default connect(mapStateToProps, {
  getAppointments,
  approveCancelRequest,
  rejectCancelRequest,
  adminCancelAppointment,
  createSbiProOverride,
})(AdminAppointmentManagement);
