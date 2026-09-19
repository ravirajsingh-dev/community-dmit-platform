import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import {
  FiCheckCircle,
  FiRotateCcw,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

const EPinFilters = (props) => {
  const { filterParams = {}, onFilterChange, headerActions = null } = props;
  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [status, setStatus] = useState(filterParams.status || "");
  const [search, setSearch] = useState(filterParams.search || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMemberId(filterParams.memberId || "");
    setStatus(filterParams.status || "");
    setSearch(filterParams.search || "");
  }, [filterParams.memberId, filterParams.status, filterParams.search]);

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        memberId: memberId || null,
        status: status || null,
        search: search || null,
      });
    }
  };

  const handleResetFilters = () => {
    setMemberId("");
    setStatus("");
    setSearch("");
    if (onFilterChange) {
      onFilterChange({
        memberId: null,
        status: null,
        search: null,
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

          {headerActions ? (
            <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
              {headerActions}
            </div>
          ) : null}
        </div>

        {isOpen && (
          <div className="users-filters-panel__body">
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Member ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="e.g. G123456789"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="unused">Unused</option>
                    <option value="used">Used</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by E-PIN or owner"
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

export default EPinFilters;
