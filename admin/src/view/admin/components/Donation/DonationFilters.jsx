import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Form, Button, Row, Col } from "react-bootstrap";
import { FiCheckCircle, FiRotateCcw, FiChevronDown, FiChevronUp } from "react-icons/fi";

const initialFilters = {
  status: "",
  phone: "",
  email: "",
  amount: "",
  search: "",
  fromDate: "",
  toDate: "",
};

const DonationFilters = ({ filterParams = {}, onApplyFilters, onResetFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    ...initialFilters,
    ...filterParams,
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      ...initialFilters,
      ...filterParams,
    }));
  }, [filterParams]);

  const onFieldChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters && onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    onResetFilters && onResetFilters();
  };

  return (
    <div className="users-filters-panel mb-3">
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
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Payment Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => onFieldChange("status", e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Amount</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Filter by amount"
                  value={filters.amount}
                  onChange={(e) => onFieldChange("amount", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="UTR/Transaction"
                  value={filters.search}
                  onChange={(e) => onFieldChange("search", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by phone"
                  value={filters.phone}
                  onChange={(e) => onFieldChange("phone", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Search by email"
                  value={filters.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => onFieldChange("fromDate", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => onFieldChange("toDate", e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-3">
            <Button variant="primary" onClick={handleApply}>
              <FiCheckCircle size={15} className="me-1" />
              Apply
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              <FiRotateCcw size={15} className="me-1" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

DonationFilters.propTypes = {
  filterParams: PropTypes.object,
  onApplyFilters: PropTypes.func,
  onResetFilters: PropTypes.func,
};

export default DonationFilters;
