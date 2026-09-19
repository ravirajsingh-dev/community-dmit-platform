import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { useDispatch, connect } from "react-redux";
import {
  isValidMemberIdFormat,
  formatMemberIdInput,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";
import { validateForm } from "@src/utils/validation";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import Errors from "@src/notifications/Errors";
import { handleNumberInput } from "@src/utils/helper";

/** Paste handler for 10-digit phone: only digits, max 10; always prevent default paste */
const createPhonePasteHandler = (setter) => (e) => {
  e.preventDefault();
  const pasted = e.clipboardData?.getData?.("text/plain") || "";
  const digits = pasted.replace(/\D/g, "").slice(0, 10);
  setter(digits);
};

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
  { value: 3, label: "Blocked" },
  { value: 4, label: "New" },
];

/**
 * Shared team filters: Member ID, Name, Phone, Status, from-to Date, referredBy (memberId, phone).
 * Used by Direct Team, My Team, Level-Wise Team filter pages.
 */
const TeamFilters = ({
  filterParams = {},
  onFilterChange,
  errorList = {},
  showMyTeamLevelFilter = false,
  showLevelWiseLevelFilter = false,
}) => {
  const dispatch = useDispatch();

  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [name, setName] = useState(filterParams.name || "");
  const [phone, setPhone] = useState(filterParams.phone || "");
  const [status, setStatus] = useState(filterParams.status ?? null);
  const [dateFrom, setDateFrom] = useState(filterParams.dateFrom || "");
  const [dateTo, setDateTo] = useState(filterParams.dateTo || "");
  const [referredByMemberId, setReferredByMemberId] = useState(
    filterParams.referredByMemberId || "",
  );
  const [levelFilter, setLevelFilter] = useState(
    filterParams.levelFilter || "all",
  );
  const [level, setLevel] = useState(filterParams.level || 1);

  const handleApplyFilters = () => {
    dispatch(removeErrors());

    const formData = {
      memberId: memberId?.trim() || "",
      phone: phone?.trim() || "",
    };
    const validationRules = [];

    if (memberId?.trim()) {
      validationRules.push({
        path: "memberId",
        msg: "Invalid Member ID format. Expected format: G + 9 digits (e.g., G123456789)",
        validator: (value) => !value || isValidMemberIdFormat(value),
      });
    }
    if (phone?.trim()) {
      validationRules.push({
        path: "phone",
        msg: "Phone number must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true;
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      });
    }
    const errors = validateForm(formData, validationRules);
    if (errors.length > 0) {
      errors.forEach((error) => dispatch(setErrorsList(error.msg, error.path)));
      return;
    }

    const filters = [];
    const query = {};
    const searchFields = {};

    if (memberId?.trim()) {
      filters.push("search");
      searchFields.memberId = { value: memberId.trim(), type: "String" };
    }
    if (name?.trim()) {
      filters.push("search");
      searchFields.name = { value: name.trim(), type: "String" };
    }
    if (phone?.trim()) {
      filters.push("search");
      searchFields.phone = { value: phone.trim(), type: "String" };
    }
    if (Object.keys(searchFields).length > 0) query.search = searchFields;

    if (status != null && status !== "") {
      filters.push("status");
      query.status = { value: Number(status), type: "Number" };
    }

    if (dateFrom?.trim() && dateTo?.trim()) {
      filters.push("createdAt");
      query.createdAt = {
        value: `${dateFrom.trim()}|${dateTo.trim()}`,
        type: "Date",
      };
    }

    if (referredByMemberId?.trim()) {
      filters.push("referredBy.memberId");
      query["referredBy.memberId"] = {
        value: referredByMemberId.trim(),
        type: "String",
      };
    }

    if (onFilterChange) {
      onFilterChange({
        filters: [...new Set(filters)],
        query,
        memberId: memberId || null,
        name: name || null,
        phone: phone || null,
        status: status ?? null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        referredByMemberId: referredByMemberId || null,
        levelFilter: showMyTeamLevelFilter ? levelFilter : filterParams.levelFilter,
        level: showLevelWiseLevelFilter ? level : filterParams.level,
      });
    }
  };

  const handleResetFilters = () => {
    dispatch(removeErrors());
    setMemberId("");
    setName("");
    setPhone("");
    setStatus(null);
    setDateFrom("");
    setDateTo("");
    setReferredByMemberId("");
    setLevelFilter("all");
    setLevel(1);
    if (onFilterChange) {
      onFilterChange({
        filters: [],
        query: {},
        memberId: null,
        name: null,
        phone: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        referredByMemberId: null,
        levelFilter: showMyTeamLevelFilter ? "all" : filterParams.levelFilter,
        level: showLevelWiseLevelFilter ? 1 : filterParams.level,
      });
    }
  };

  return (
    <div className="mb-3">
      <Row className="row-gap-2">
        <Col xs={12}>
          <h6 className="text-muted mb-2">Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Member ID</Form.Label>
            <Form.Control
              type="text"
              value={formatMemberIdInput(memberId)}
              onChange={createMemberIdChangeHandler((e) => {
                setMemberId(e.target.value);
                if (errorList?.memberId) dispatch(removeErrors());
              }, "memberId")}
              onPaste={createMemberIdPasteHandler((formatted) => {
                setMemberId(formatted);
                if (errorList?.memberId) dispatch(removeErrors());
              })}
              onKeyDown={createMemberIdKeyDownHandler(
                memberId,
                (e) => {
                  setMemberId(e.target.value);
                  if (errorList?.memberId) dispatch(removeErrors());
                },
                "memberId",
              )}
              placeholder="Enter Member ID (G123456789)"
              className={errorList?.memberId ? "form-input-invalid" : ""}
              maxLength={10}
            />
            <Errors current_key="memberId" />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Name"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Phone</Form.Label>
            <Form.Control
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errorList?.phone) dispatch(removeErrors());
              }}
              onPaste={createPhonePasteHandler((v) => {
                setPhone(v);
                if (errorList?.phone) dispatch(removeErrors());
              })}
              onKeyDown={handleNumberInput}
              placeholder="Enter Phone"
              maxLength="10"
              inputMode="numeric"
              className={errorList?.phone ? "form-input-invalid" : ""}
            />
            <Errors current_key="phone" />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={status ?? ""}
              onChange={(e) =>
                setStatus(e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        {showMyTeamLevelFilter && (
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Filter by Level</Form.Label>
              <Form.Select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                }}
              >
                <option value="all">All Levels</option>
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    Level {i + 1}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        )}
        {showLevelWiseLevelFilter && (
          <Col xs={12} sm={6} md={4} lg={3}>
            <Form.Group>
              <Form.Label>Level</Form.Label>
              <Form.Select
                value={level}
                onChange={(e) => {
                  setLevel(parseInt(e.target.value, 10) || 1);
                }}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Level {i + 1}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        )}
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Date From</Form.Label>
            <Form.Control
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Date To</Form.Label>
            <Form.Control
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} className="mt-2">
          <h6 className="text-muted mb-2">Referred By</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Referred By Member ID</Form.Label>
            <Form.Control
              type="text"
              value={formatMemberIdInput(referredByMemberId)}
              onChange={createMemberIdChangeHandler(
                (e) => setReferredByMemberId(e.target.value),
                "referredByMemberId",
              )}
              onPaste={createMemberIdPasteHandler((formatted) =>
                setReferredByMemberId(formatted),
              )}
              onKeyDown={createMemberIdKeyDownHandler(
                referredByMemberId,
                (e) => setReferredByMemberId(e.target.value),
                "referredByMemberId",
              )}
              placeholder="Member ID (G123456789)"
              maxLength={10}
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

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps)(TeamFilters);
