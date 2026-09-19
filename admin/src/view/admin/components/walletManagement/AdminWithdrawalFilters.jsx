import React, { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
} from "react-icons/fi";
import {
  createMemberIdChangeHandler,
  createMemberIdKeyDownHandler,
  createMemberIdPasteHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";

const AdminWithdrawalFilters = ({ filterParams = {}, onFilterChange }) => {
  const [status, setStatus] = useState(filterParams.status || "");
  const [paymentMethod, setPaymentMethod] = useState(
    filterParams.paymentMethod || "",
  );
  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");
  const [filterToday, setFilterToday] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [memberIdError, setMemberIdError] = useState("");

  useEffect(() => {
    setStatus(filterParams.status || "");
    setPaymentMethod(filterParams.paymentMethod || "");
    setMemberId(filterParams.memberId || "");
    setFromDate(filterParams.fromDate || "");
    setToDate(filterParams.toDate || "");
  }, [
    filterParams.status,
    filterParams.paymentMethod,
    filterParams.memberId,
    filterParams.fromDate,
    filterParams.toDate,
  ]);

  useEffect(() => {
    if (!filterToday) return;
    const todayStr = new Date().toISOString().split("T")[0];
    setFromDate(todayStr);
    setToDate(todayStr);
  }, [filterToday]);

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

  const handleApplyFilters = () => {
    const mid = memberId.trim();
    if (mid && !isValidMemberIdFormat(mid)) {
      setMemberIdError(
        "Enter a valid member ID (10 digits, hyphen, then 01–99).",
      );
      return;
    }
    setMemberIdError("");
    if (!onFilterChange) return;
    onFilterChange({
      status: status || "",
      paymentMethod: paymentMethod || "",
      memberId: mid,
      fromDate: fromDate || "",
      toDate: toDate || "",
    });
  };

  const handleResetFilters = () => {
    setStatus("");
    setPaymentMethod("");
    setMemberId("");
    setFromDate("");
    setToDate("");
    setFilterToday(false);
    setMemberIdError("");
    if (!onFilterChange) return;
    onFilterChange({
      status: "",
      paymentMethod: "",
      memberId: "",
      fromDate: "",
      toDate: "",
    });
  };

  const handleTodayFilter = (e) => {
    const checked = e.target.checked;
    setFilterToday(checked);
    if (!checked) {
      setFromDate("");
      setToDate("");
    }
  };

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
        </div>

        {isOpen && (
          <div className="users-filters-panel__body">
            {memberIdError ? (
              <Alert variant="danger" className="py-2 mb-3">
                {memberIdError}
              </Alert>
            ) : null}
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">BANK</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label htmlFor="withdrawal-filter-memberId">
                    Member ID
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="withdrawal-filter-memberId"
                    name="memberId"
                    value={memberId}
                    onChange={(e) => {
                      handleMemberIdChange(e);
                      if (memberIdError) setMemberIdError("");
                    }}
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

export default AdminWithdrawalFilters;
