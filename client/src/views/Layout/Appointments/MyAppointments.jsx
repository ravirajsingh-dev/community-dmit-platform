import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
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
import {
  getBookedSlotDisplay,
  getStatusDisplay,
  getHolderDisplay,
} from "@src/utils/appointmentHelpers";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { initialSortingParams } from "@src/constants";

import {
  getMyAppointments,
  cancelAppointment,
  rateAppointment,
} from "@src/actions/appointmentActions";

const defaultParams = {
  page: 1,
  limit: 20,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  forWhomSearch: undefined,
  holderSearch: undefined,
  requestedFrom: undefined,
  requestedTo: undefined,
};

const MyAppointments = ({
  myAppointments,
  myPagination,
  loadingMy,
  cancelling,
  rating,
  appliedParams,
  getMyAppointments,
  cancelAppointment,
  rateAppointment,
}) => {
  const navigate = useNavigate();
  const effectiveParams = appliedParams
    ? { ...defaultParams, ...appliedParams }
    : defaultParams;
  const [params, setParams] = useState(initialSortingParams);
  const [rateModal, setRateModal] = useState({ show: false, apt: null });
  const [cancelModal, setCancelModal] = useState({ show: false, apt: null });
  const [rateForm, setRateForm] = useState({ rating: 5, review: "" });

  useEffect(() => {
    getMyAppointments({
      status: effectiveParams.status,
      dateFrom: effectiveParams.dateFrom,
      dateTo: effectiveParams.dateTo,
      forWhomSearch: effectiveParams.forWhomSearch,
      holderSearch: effectiveParams.holderSearch,
      requestedFrom: effectiveParams.requestedFrom,
      requestedTo: effectiveParams.requestedTo,
      page: params.page,
      limit: params.limit,
    });
  }, [
    effectiveParams.status,
    effectiveParams.dateFrom,
    effectiveParams.dateTo,
    effectiveParams.forWhomSearch,
    effectiveParams.holderSearch,
    effectiveParams.requestedFrom,
    effectiveParams.requestedTo,
    params.page,
    params.limit,
    getMyAppointments,
  ]);

  const handleCancelOpen = (apt) => {
    setCancelModal({ show: true, apt });
  };

  const handleCancelConfirm = () => {
    if (!cancelModal.apt) return;
    cancelAppointment(cancelModal.apt._id, () => {
      setCancelModal({ show: false, apt: null });
      getMyAppointments({
        status: effectiveParams.status,
        dateFrom: effectiveParams.dateFrom,
        dateTo: effectiveParams.dateTo,
        forWhomSearch: effectiveParams.forWhomSearch,
        holderSearch: effectiveParams.holderSearch,
        requestedFrom: effectiveParams.requestedFrom,
        requestedTo: effectiveParams.requestedTo,
        page: params.page,
        limit: params.limit,
      });
    });
  };

  const handleRateOpen = (apt) => {
    setRateModal({ show: true, apt });
    setRateForm({ rating: apt.rating || 5, review: apt.review || "" });
  };

  const handleRateSubmit = () => {
    if (!rateModal.apt) return;
    rateAppointment(rateModal.apt._id, rateForm.rating, rateForm.review, () => {
      setRateModal({ show: false, apt: null });
      getMyAppointments({
        status: effectiveParams.status,
        dateFrom: effectiveParams.dateFrom,
        dateTo: effectiveParams.dateTo,
        forWhomSearch: effectiveParams.forWhomSearch,
        holderSearch: effectiveParams.holderSearch,
        requestedFrom: effectiveParams.requestedFrom,
        requestedTo: effectiveParams.requestedTo,
        page: params.page,
        limit: params.limit,
      });
    });
  };

  const columns = [
    {
      name: "Date & Time",
      selector: (a) => getBookedSlotDisplay(a),
      width: "250px",
    },
    {
      name: "Designation",
      selector: (a) => a.designationName,
      width: "180px",
      wrap: true,
    },
    {
      name: "Assigned To",
      cell: (a) => {
        const hd = getHolderDisplay(a);
        return (
          <div>
            <strong>{hd.primary}</strong>
            {hd.secondary && (
              <div className="small text-muted">{hd.secondary}</div>
            )}
          </div>
        );
      },
      width: "180px",
      wrap: true,
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
      selector: (a) =>
        a.requestedAt
          ? format(parseISO(a.requestedAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "180px",
    },
    {
      name: "Actions",
      cell: (a) => (
        <>
          {a.status === "PENDING" && (
            <Button
              size="sm"
              variant="outline-danger"
              className="btn-danger"
              disabled={cancelling}
              onClick={() => handleCancelOpen(a)}
            >
              Cancel
            </Button>
          )}
          {a.status === "COMPLETED" && (
            <Button
              size="sm"
              variant="outline-primary"
              className="btn-common"
              disabled={rating}
              onClick={() => handleRateOpen(a)}
            >
              {a.rating != null ? "Edit rating" : "Rate"}
            </Button>
          )}
        </>
      ),
      width: "200px",
    },
  ];

  return (
    <Container className="appointments-page book-appointment-page">
      <AppBreadCrumb
        pageTitle="My Bookings"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "My Bookings" },
        ]}
      />

      <MainCard className="book-apt-card">
        <div className="apt-hero apt-hero-client book-apt-hero">
          <div className="book-apt-hero-inner">
            <span
              className="apt-hero-icon book-apt-hero-icon"
              role="img"
              aria-label="List"
            >
              📋
            </span>
            <div className="apt-hero-content flex-grow-1">
              <span className="apt-hero-badge apt-badge-client book-apt-badge">
                I'm the Client
              </span>
              <h5 className="apt-hero-title book-apt-title mb-2">
                My Bookings
              </h5>
              <p className="apt-hero-desc mb-0 text-muted">
                Appointments you requested. View status, cancel pending, or rate
                completed.
              </p>
            </div>
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 book-apt-filter-btn"
              onClick={() => navigate("/user/appointments/my/filters")}
            >
              <TbFilter size={18} />
              Filters
            </Button>
          </div>
        </div>

        {appliedParams && (
          <div className="apt-filter-bar d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted">
              Filters applied: Date, For Whom, Holder, Status, Requested date
            </span>
          </div>
        )}

        <Card className="apt-table-card">
          <Card.Body>
            {!myAppointments?.length && !loadingMy ? (
              <div className="apt-empty-state">
                <div className="apt-empty-icon">📋</div>
                <div className="apt-empty-title">No appointments found</div>
                <div className="apt-empty-hint">
                  Try changing the status filter or book a new appointment.
                </div>
              </div>
            ) : (
              <CustomDataTable
                columns={columns}
                data={myAppointments || []}
                count={myPagination?.totalCount ?? 0}
                params={params}
                setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
                pagination
                responsive
                striped
                paginationServer
                progressPending={loadingMy}
                noDataComponent="No appointments found."
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
          <Modal.Title>Cancel Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelModal.apt && (
            <p>
              Are you sure you want to cancel this appointment on{" "}
              <strong>{getBookedSlotDisplay(cancelModal.apt)}</strong> with{" "}
              {cancelModal.apt.assignedTo
                ? `${cancelModal.apt.assignedTo.name}`
                : "-"}
              ?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setCancelModal({ show: false, apt: null })}
          >
            Keep
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelConfirm}
            disabled={cancelling}
          >
            {cancelling ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Cancel Appointment"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={rateModal.show}
        onHide={() => setRateModal({ show: false, apt: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Rate Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Rating (1-5)</Form.Label>
            <Form.Select
              value={rateForm.rating}
              onChange={(e) =>
                setRateForm((f) => ({
                  ...f,
                  rating: parseFloat(e.target.value),
                }))
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Review (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={rateForm.review}
              onChange={(e) =>
                setRateForm((f) => ({ ...f, review: e.target.value }))
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setRateModal({ show: false, apt: null })}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleRateSubmit}
            disabled={rating}
          >
            {rating ? <Spinner animation="border" size="sm" /> : "Submit"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

MyAppointments.propTypes = {
  myAppointments: PropTypes.array,
  myPagination: PropTypes.object,
  loadingMy: PropTypes.bool,
  cancelling: PropTypes.bool,
  rating: PropTypes.bool,
  appliedParams: PropTypes.object,
  getMyAppointments: PropTypes.func.isRequired,
  cancelAppointment: PropTypes.func.isRequired,
  rateAppointment: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  myAppointments: state.appointment?.myAppointments ?? [],
  myPagination: state.appointment?.myPagination ?? {},
  loadingMy: state.appointment?.loadingMy ?? false,
  cancelling: state.appointment?.cancelling ?? false,
  rating: state.appointment?.rating ?? false,
  appliedParams: state.appointment?.appliedParamsMyBookings ?? null,
});

export default connect(mapStateToProps, {
  getMyAppointments,
  cancelAppointment,
  rateAppointment,
})(MyAppointments);
