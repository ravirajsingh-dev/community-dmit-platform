import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

const roleOptions = [
  { value: "sub_admin", label: "Sub Admin" },
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
];

const statusOptions = [
  { value: "1", label: "Active" },
  { value: "2", label: "Inactive" },
];

const SubAdminFilters = (props) => {
  const { filterParams = {}, onFilterChange } = props;
  const [name, setName] = useState(filterParams.name || "");
  const [adminId, setAdminId] = useState(filterParams.adminId || "");
  const [email, setEmail] = useState(filterParams.email || "");
  const [role, setRole] = useState(filterParams.role || "");
  const [status, setStatus] = useState(filterParams.status || "");
  const [isActive, setIsActive] = useState(filterParams.isActive || "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");
  const [filterToday, setFilterToday] = useState(false);

  useEffect(() => {
    if (filterToday) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    }
  }, [filterToday]);

  const handleApplyFilters = () => {
    const filters = [];
    const query = {};

    // Name filter (search)
    if (name) {
      filters.push("search");
      if (!query.search) query.search = {};
      query.search.name = { value: name.trim(), type: "String" };
    }

    // Admin ID filter (search)
    if (adminId) {
      filters.push("search");
      if (!query.search) query.search = {};
      query.search.admin_id = { value: adminId.trim(), type: "String" };
    }

    // Email filter (search)
    if (email) {
      filters.push("search");
      if (!query.search) query.search = {};
      query.search.email = { value: email.trim(), type: "String" };
    }

    // Role filter
    if (role) {
      filters.push("role");
      query.role = { value: role, type: "String" };
    }

    // Status filter
    if (status) {
      filters.push("status");
      query.status = { value: parseInt(status), type: "Number" };
    }

    // IsActive filter
    if (isActive !== "") {
      filters.push("isActive");
      query.isActive = {
        value: isActive === "true" ? "1" : "0",
        type: "Boolean",
      };
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
        name: name || null,
        adminId: adminId || null,
        email: email || null,
        role: role || null,
        status: status || null,
        isActive: isActive || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
    }
  };

  const handleResetFilters = () => {
    setName("");
    setAdminId("");
    setEmail("");
    setRole("");
    setStatus("");
    setIsActive("");
    setFromDate("");
    setToDate("");
    setFilterToday(false);
    if (onFilterChange) {
      onFilterChange({
        filters: [],
        query: {},
        name: null,
        adminId: null,
        email: null,
        role: null,
        status: null,
        isActive: null,
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

  return (
    <div className="mb-3">
      <Row className="row-gap-2">
        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Search name"
            />
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Admin ID</Form.Label>
            <Form.Control
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Search admin ID"
            />
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Search email"
            />
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Role</Form.Label>
            <Form.Control
              as="select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Control
              as="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group>
            <Form.Label>Active</Form.Label>
            <Form.Control
              as="select"
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Form.Control>
          </Form.Group>
        </Col>

        <Col xs={12} sm={6} md={3} lg={2}>
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

        <Col xs={12} sm={6} md={3} lg={2}>
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

        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Group className="d-flex align-items-end h-100">
            <Form.Check
              type="checkbox"
              label="Today"
              checked={filterToday}
              onChange={handleTodayFilter}
              className="pt-3"
            />
          </Form.Group>
        </Col>

        <Col
          xs={12}
          sm={6}
          md={3}
          lg={2}
          className="d-flex align-items-end gap-2"
        >
          <Button variant="primary" onClick={handleApplyFilters}>
            Filter
          </Button>
          <Button variant="outline-secondary" onClick={handleResetFilters}>
            Reset
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default SubAdminFilters;
