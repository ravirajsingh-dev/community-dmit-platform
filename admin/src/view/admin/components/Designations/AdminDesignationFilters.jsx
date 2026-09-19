import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Accordion, Badge } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import { FiSliders, FiCheckCircle, FiRotateCcw, FiArrowLeft } from "react-icons/fi";
import {
  isValidMemberIdFormat,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

import { getWalletSettings } from "@src/actions/adminWalletSettingsActions";

const parseQueryString = (search) => {
  const sp = new URLSearchParams(search);
  const rawDesignationCode = sp.get("designationCode");
  const parsedDesignationCode = rawDesignationCode
    ? parseInt(rawDesignationCode, 10)
    : NaN;
  const rawOnline = sp.get("online");
  const parsedOnline =
    rawOnline === "true" ? true : rawOnline === "false" ? false : null;
  return {
    status: (sp.get("status") || "ALL").toString().toUpperCase(),
    designationCode: Number.isNaN(parsedDesignationCode) ? "" : parsedDesignationCode,
    memberId: sp.get("memberId") || "",
    name: sp.get("name") || "",
    phone: sp.get("phone") || "",
    email: sp.get("email") || "",
    hasRemarks: sp.get("hasRemarks") === "true" || sp.get("hasRemarks") === "1",
    online: parsedOnline,
    appliedFrom: sp.get("appliedFrom") || "",
    appliedTo: sp.get("appliedTo") || "",
    decidedFrom: sp.get("decidedFrom") || "",
    decidedTo: sp.get("decidedTo") || "",
  };
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INACTIVE", label: "Blocked" },
  { value: "ALL", label: "All" },
];
const PHONE_REGEX = /^\d{10}$/;

const AdminDesignationFilters = ({ walletSettings, getWalletSettings }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialFilters = useMemo(
    () => parseQueryString(location.search),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFilters] = useState(initialFilters);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (getWalletSettings) getWalletSettings();
  }, [getWalletSettings]);

  useEffect(() => {
    setFilters(parseQueryString(location.search));
    setValidationErrors({});
  }, [location.search]);

  const designationConfigs = walletSettings?.designations || [];

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const s = (filters.status || "ALL").toString().toUpperCase();
    if (s && s !== "ALL") chips.push(`Status: ${s}`);
    if (filters.designationCode) chips.push(`Designation: ${filters.designationCode}`);
    if (filters.online === true) chips.push("Availability: ON");
    if (filters.online === false) chips.push("Availability: OFF");
    if (filters.memberId) chips.push(`Member: ${filters.memberId}`);
    if (filters.name) chips.push(`Name: ${filters.name}`);
    if (filters.phone) chips.push(`Phone: ${filters.phone}`);
    if (filters.email) chips.push(`Email: ${filters.email}`);
    if (filters.hasRemarks) chips.push("Has Remarks");
    if (filters.appliedFrom || filters.appliedTo) {
      const from = filters.appliedFrom ? filters.appliedFrom : "";
      const to = filters.appliedTo ? filters.appliedTo : "";
      chips.push(`Applied: ${from}${from && to ? " - " : ""}${to}`);
    }
    if (filters.decidedFrom || filters.decidedTo) {
      const from = filters.decidedFrom ? filters.decidedFrom : "";
      const to = filters.decidedTo ? filters.decidedTo : "";
      chips.push(`Decided: ${from}${from && to ? " - " : ""}${to}`);
    }
    return chips.slice(0, 6);
  }, [filters]);

  const handleMemberIdChange = createMemberIdChangeHandler(
    (e) =>
      setFilters((p) => ({
        ...p,
        memberId: e.target.value,
      })),
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler();
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    filters.memberId,
    (e) =>
      setFilters((p) => ({
        ...p,
        memberId: e.target.value,
      })),
    "memberId",
  );

  const handleApply = () => {
    const nextErrors = {};
    const memberId = (filters.memberId || "").trim();
    const phone = (filters.phone || "").trim();

    if (memberId && !isValidMemberIdFormat(memberId)) {
      nextErrors.memberId =
        "Invalid Member ID format. Expected format: G123456789";
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      nextErrors.phone = "Phone number must be exactly 10 digits";
    }

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const query = new URLSearchParams();
    query.set("status", filters.status || "ALL");

    if (filters.designationCode !== "" && filters.designationCode != null) {
      query.set("designationCode", String(filters.designationCode));
    }
    if (filters.online != null) {
      query.set("online", filters.online ? "true" : "false");
    }
    if (memberId) query.set("memberId", memberId);
    if (filters.name) query.set("name", filters.name);
    if (phone) query.set("phone", phone);
    if (filters.email) query.set("email", filters.email);
    if (filters.hasRemarks) query.set("hasRemarks", "true");

    if (filters.appliedFrom) query.set("appliedFrom", filters.appliedFrom);
    if (filters.appliedTo) query.set("appliedTo", filters.appliedTo);
    if (filters.decidedFrom) query.set("decidedFrom", filters.decidedFrom);
    if (filters.decidedTo) query.set("decidedTo", filters.decidedTo);

    navigate(`/admin/designations?${query.toString()}`);
  };

  const handleReset = () => {
    setValidationErrors({});
    navigate(`/admin/designations?status=ALL`);
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Designation Filters"
        crumbs={[
          { name: "Designations" },
          { name: "Filters" },
        ]}
      />

      <MainCard>
        <div className="designation-mgmt-header">
          <div className="designation-mgmt-title">
            <span className="designation-mgmt-title-icon">
              <FiSliders size={20} />
            </span>
            Manage Designation Filters
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="designation-filter-chips">
            {activeFilterChips.map((c, idx) => (
              <Badge key={`${c}-${idx}`} bg="info" className="designation-filter-chip">
                {c}
              </Badge>
            ))}
          </div>
        )}

        <Accordion defaultActiveKey="basic" className="mb-3 designation-filters-accordion">
          <Accordion.Item eventKey="basic">
            <Accordion.Header>Basic Filters</Accordion.Header>
            <Accordion.Body>
              <div className="designation-filter-panel">
                <Row className="g-3">
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, status: e.target.value }))
                        }
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Designation</Form.Label>
                      {designationConfigs.length > 0 ? (
                        <Form.Select
                          value={filters.designationCode ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilters((p) => ({
                              ...p,
                              designationCode: val ? parseInt(val, 10) : "",
                            }));
                          }}
                        >
                          <option value="">All</option>
                          {designationConfigs.map((d) => (
                            <option
                              key={d.designationCode}
                              value={d.designationCode}
                            >
                              {d.designationCode} - {d.name}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="number"
                          placeholder="Optional"
                          value={filters.designationCode}
                          onChange={(e) =>
                            setFilters((p) => ({
                              ...p,
                              designationCode: e.target.value
                                ? parseInt(e.target.value, 10)
                                : "",
                            }))
                          }
                        />
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Availability</Form.Label>
                      <Form.Select
                        value={
                          filters.online == null
                            ? "ALL"
                            : filters.online === true
                              ? "ON"
                              : "OFF"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((p) => ({
                            ...p,
                            online: val === "ALL" ? null : val === "ON",
                          }));
                        }}
                      >
                        <option value="ALL">All</option>
                        <option value="ON">ON</option>
                        <option value="OFF">OFF</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={filters.memberId}
                        onChange={(e) => {
                          handleMemberIdChange(e);
                          if (validationErrors.memberId) {
                            setValidationErrors((prev) => ({ ...prev, memberId: null }));
                          }
                        }}
                        onPaste={handleMemberIdPaste}
                        onKeyDown={handleMemberIdKeyDown}
                        maxLength={10}
                        isInvalid={!!validationErrors.memberId}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.memberId}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Optional"
                        value={filters.name}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, name: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="advanced">
            <Accordion.Header>Advanced Filters</Accordion.Header>
            <Accordion.Body>
              <div className="designation-filter-panel">
                <Row className="g-3">
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="10-digit phone"
                        value={filters.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setFilters((p) => ({ ...p, phone: digits }));
                          if (validationErrors.phone) {
                            setValidationErrors((prev) => ({ ...prev, phone: null }));
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData?.getData("text/plain") || "";
                          const digits = pasted.replace(/\D/g, "").slice(0, 10);
                          setFilters((p) => ({ ...p, phone: digits }));
                          if (validationErrors.phone) {
                            setValidationErrors((prev) => ({ ...prev, phone: null }));
                          }
                        }}
                        inputMode="numeric"
                        maxLength={10}
                        isInvalid={!!validationErrors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Optional"
                        value={filters.email}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, email: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mt-1 mb-0">
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Applied From</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.appliedFrom || ""}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            appliedFrom: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Applied To</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.appliedTo || ""}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, appliedTo: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Decided From</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.decidedFrom || ""}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            decidedFrom: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Decided To</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.decidedTo || ""}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, decidedTo: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4} className="d-flex align-items-end">
                    <Form.Group>
                      <Form.Check
                        type="checkbox"
                        id="hasRemarks"
                        label="Has Remarks"
                        checked={!!filters.hasRemarks}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            hasRemarks: e.target.checked,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        <div className="d-flex gap-2">
          <Button variant="primary" onClick={handleApply}>
            <FiCheckCircle size={15} className="me-1" />
            Apply
          </Button>
          <Button variant="secondary" onClick={handleReset}>
            <FiRotateCcw size={15} className="me-1" />
            Reset
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => navigate(`/admin/designations${location.search}`)}
          >
            <FiArrowLeft size={15} className="me-1" />
            Back to List
          </Button>
        </div>
      </MainCard>
    </Container>
  );
};

AdminDesignationFilters.propTypes = {
  walletSettings: PropTypes.object,
  getWalletSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  walletSettings: state.adminWalletSettings?.walletSettings ?? {},
});

export default connect(mapStateToProps, { getWalletSettings })(
  AdminDesignationFilters,
);

