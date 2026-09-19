import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

/** All appointment statuses from server model (Appointment.APPOINTMENT_STATUSES) */
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCEL_REQUESTED", label: "Cancel requested" },
  { value: "CANCELLED_BY_USER", label: "Cancelled by you" },
  { value: "CANCELLED_BY_HOLDER", label: "Cancelled by holder" },
  { value: "CANCELLED_BY_ADMIN", label: "Cancelled by admin" },
  { value: "CANCELLED_BY_SYSTEM", label: "Cancelled by system" },
];

const MyBookingsFilters = ({ filterParams = {}, onFilterChange }) => {
  const [dateFrom, setDateFrom] = useState(filterParams.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filterParams.dateTo ?? "");
  const [forWhom, setForWhom] = useState(filterParams.forWhomSearch ?? "");
  const [holder, setHolder] = useState(filterParams.holderSearch ?? "");
  const [status, setStatus] = useState(filterParams.status ?? "");
  const [requestedFrom, setRequestedFrom] = useState(filterParams.requestedFrom ?? "");
  const [requestedTo, setRequestedTo] = useState(filterParams.requestedTo ?? "");

  const handleApplyFilters = () => {
    const params = {
      page: 1,
      limit: filterParams.limit ?? 20,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      forWhomSearch: forWhom?.trim() || undefined,
      holderSearch: holder?.trim() || undefined,
      status: status?.trim() || undefined,
      requestedFrom: requestedFrom?.trim() || undefined,
      requestedTo: requestedTo?.trim() || undefined,
    };
    if (onFilterChange) onFilterChange(params);
  };

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setForWhom("");
    setHolder("");
    setStatus("");
    setRequestedFrom("");
    setRequestedTo("");
    if (onFilterChange) {
      onFilterChange({
        page: 1,
        limit: filterParams.limit ?? 20,
        dateFrom: undefined,
        dateTo: undefined,
        forWhomSearch: undefined,
        holderSearch: undefined,
        status: undefined,
        requestedFrom: undefined,
        requestedTo: undefined,
      });
    }
  };

  return (
    <div className="mb-3">
      <Row className="row-gap-2">
        <Col xs={12}>
          <h6 className="text-muted mb-2">Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Date (from)</Form.Label>
            <Form.Control
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Date (to)</Form.Label>
            <Form.Control
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>For Whom</Form.Label>
            <Form.Control
              type="text"
              placeholder="Name or phone"
              value={forWhom}
              onChange={(e) => setForWhom(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Holder</Form.Label>
            <Form.Control
              type="text"
              placeholder="Name, member ID or phone"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Requested date (from)</Form.Label>
            <Form.Control
              type="date"
              value={requestedFrom}
              onChange={(e) => setRequestedFrom(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Requested date (to)</Form.Label>
            <Form.Control
              type="date"
              value={requestedTo}
              onChange={(e) => setRequestedTo(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} className="mt-3 d-flex align-items-end gap-2">
          <Button variant="primary" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outline-secondary" onClick={handleResetFilters}>
            Reset
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default MyBookingsFilters;
