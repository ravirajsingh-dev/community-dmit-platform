import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import {
  FiCheckCircle,
  FiRotateCcw,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

const ReferralFilters = (props) => {
  const { filterParams = {}, onFilterChange } = props;
  const [search, setSearch] = useState(filterParams.search || "");
  const [minCount, setMinCount] = useState(filterParams.minCount || "");
  const [maxCount, setMaxCount] = useState(filterParams.maxCount || "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");
  const [isOpen, setIsOpen] = useState(false);

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        search: search || null,
        minCount: minCount || null,
        maxCount: maxCount || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setMinCount("");
    setMaxCount("");
    setFromDate("");
    setToDate("");
    if (onFilterChange) {
      onFilterChange({
        search: null,
        minCount: null,
        maxCount: null,
        fromDate: null,
        toDate: null,
      });
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
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, Member ID, phone, or email"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Min Count</Form.Label>
                  <Form.Control
                    type="number"
                    value={minCount}
                    onChange={(e) => setMinCount(e.target.value)}
                    placeholder="Min referrals"
                    min="1"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Max Count</Form.Label>
                  <Form.Control
                    type="number"
                    value={maxCount}
                    onChange={(e) => setMaxCount(e.target.value)}
                    placeholder="Max referrals"
                    min="1"
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
                  />
                </Form.Group>
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

export default ReferralFilters;
