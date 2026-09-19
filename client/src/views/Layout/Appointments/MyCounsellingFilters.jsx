import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

/** All counselling session statuses (CounsellingSession model) */
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "CREATED", label: "Created" },
  { value: "COUNSELLOR_COMPLETED", label: "Counsellor completed" },
  { value: "USER_CONFIRMATION_PENDING", label: "Pending your confirmation" },
  { value: "ISSUE_REPORTED", label: "Issue reported" },
  { value: "CLOSED", label: "Closed" },
];

const MyCounsellingFilters = ({ filterParams = {}, onFilterChange }) => {
  const [status, setStatus] = useState(filterParams.status ?? "");

  const handleApplyFilters = () => {
    const params = {
      page: 1,
      limit: filterParams.limit ?? 20,
      status: status?.trim() || undefined,
    };
    if (onFilterChange) onFilterChange(params);
  };

  const handleResetFilters = () => {
    setStatus("");
    if (onFilterChange) {
      onFilterChange({
        page: 1,
        limit: filterParams.limit ?? 20,
        status: undefined,
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

export default MyCounsellingFilters;
