import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Badge } from "react-bootstrap";
import { FiCheckCircle, FiRotateCcw, FiChevronDown, FiChevronUp, FiPlus } from "react-icons/fi";
import { UserStatuses } from "@src/constants/CustomSelectValues";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const UserFilters = (props) => {
  const PHONE_REGEX = /^\d{10}$/;
  const { filterParams = {}, onFilterChange, canCreate = false, onAddUser } = props;
  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [phone, setPhone] = useState(filterParams.phone || "");
  const [status, setStatus] = useState(filterParams.status || "");
  const [isPaid, setIsPaid] = useState(filterParams.isPaid || "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");
  const [filterToday, setFilterToday] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (filterToday) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    }
  }, [filterToday]);

  useEffect(() => {
    setMemberId(filterParams.memberId || "");
    setPhone(filterParams.phone || "");
    setStatus(filterParams.status || "");
    setIsPaid(filterParams.isPaid || "");
    setFromDate(filterParams.fromDate || "");
    setToDate(filterParams.toDate || "");
  }, [
    filterParams.memberId,
    filterParams.phone,
    filterParams.status,
    filterParams.isPaid,
    filterParams.fromDate,
    filterParams.toDate,
  ]);

  const handleApplyFilters = () => {
    const nextErrors = {};
    if (phone && !PHONE_REGEX.test(phone)) {
      nextErrors.phone = "Phone number must be exactly 10 digits";
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const filters = [];
    const query = {};

    // Member ID filter
    if (memberId) {
      filters.push("memberId");
      query.memberId = { value: memberId.trim(), type: "String" };
    }

    // Phone filter
    if (phone) {
      filters.push("phone");
      query.phone = { value: phone.trim(), type: "String" };
    }

    // Status filter
    if (status) {
      filters.push("status");
      query.status = { value: parseInt(status), type: "Number" };
    }

    // IsPaid filter
    if (isPaid !== "") {
      filters.push("isPaid");
      query.isPaid = { value: isPaid === "true" ? "1" : "0", type: "Boolean" };
    }

    // Date range filter
    if (fromDate || toDate) {
      filters.push("createdAt");
      const startDate = fromDate || new Date(0).toISOString().split("T")[0];
      const endDate = toDate || new Date().toISOString().split("T")[0];
      query.createdAt = { value: `${startDate}|${endDate}`, type: "Date" };
    }

    if (onFilterChange) {
      onFilterChange({
        filters,
        query,
        memberId: memberId || null,
        phone: phone || null,
        status: status || null,
        isPaid: isPaid || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
    }
  };

  const handleResetFilters = () => {
    setMemberId("");
    setPhone("");
    setStatus("");
    setIsPaid("");
    setFromDate("");
    setToDate("");
    setFilterToday(false);
    setValidationErrors({});
    if (onFilterChange) {
      onFilterChange({
        filters: [],
        query: {},
        memberId: null,
        phone: null,
        status: null,
        isPaid: null,
        fromDate: null,
        toDate: null,
      });
    }
  };

  const handleTodayFilter = (e) => {
    const checked = e.target.checked;
    setFilterToday(checked);
    if (!checked) {
      setFromDate("");
      setToDate("");
    }
  };

  const handleMemberIdChange = createMemberIdChangeHandler(
    (e) => setMemberId(e.target.value),
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler();
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    (e) => setMemberId(e.target.value),
    "memberId",
  );

  return (
    <div className="mb-3 users-filter-wrap">
      <div className="users-filters-panel">
        <div className="users-filters-panel__header">
          <button
            type="button"
            className="users-filters-panel__toggle"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span>All Filters</span>
            {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </button>
          {canCreate && (
            <Button
              type="button"
              variant="primary"
              className="users-filters-panel__add-btn"
              onClick={() => onAddUser && onAddUser()}
            >
              <FiPlus size={16} className="me-1" />
              Add User
            </Button>
          )}
        </div>

        {isOpen && (
          <div className="users-filters-panel__body">
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label htmlFor="memberId">Member ID</Form.Label>
                  <Form.Control
                    type="text"
                    id="memberId"
                    name="memberId"
                    value={memberId}
                    onChange={handleMemberIdChange}
                    onPaste={handleMemberIdPaste}
                    onKeyDown={handleMemberIdKeyDown}
                    placeholder="G123456789"
                    maxLength={10}
                    className="text-muted"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(next);
                      if (validationErrors.phone) {
                        setValidationErrors((prev) => ({ ...prev, phone: null }));
                      }
                    }}
                    placeholder="10-digit phone"
                    maxLength={10}
                    isInvalid={!!validationErrors.phone}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.phone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    {UserStatuses.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Paid</Form.Label>
                  <Form.Select value={isPaid} onChange={(e) => setIsPaid(e.target.value)}>
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>From Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={filterToday}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>To Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={filterToday}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Check
                  type="checkbox"
                  label="Today"
                  checked={filterToday}
                  onChange={handleTodayFilter}
                />
              </Col>
            </Row>
            <div className="d-flex gap-2 mt-3">
              <Button variant="primary" onClick={handleApplyFilters}>
                <FiCheckCircle size={15} className="me-1" />
                Apply
              </Button>
              <Button variant="secondary" onClick={handleResetFilters}>
                <FiRotateCcw size={15} className="me-1" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFilters;
