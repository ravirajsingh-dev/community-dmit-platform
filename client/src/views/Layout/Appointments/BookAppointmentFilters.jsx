import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { useDispatch, connect } from "react-redux";
import CustomSelect from "@src/views/Common/CustomSelect";
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
} from "@src/actions/locationActions";
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

/**
 * Book Appointment holder filters: Name, Member ID, Phone, Rating, Status,
 * plus Available only (online), Same downline first, Sort by.
 * Member ID and Phone validation same as Direct Team Filters.
 */
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
];

const RATING_OPTIONS = [
  { value: "", label: "All" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "rating", label: "Rating (high first)" },
];

const BookAppointmentFilters = ({
  filterParams = {},
  onFilterChange,
  errorList = {},
}) => {
  const dispatch = useDispatch();
  const [name, setName] = useState(filterParams.name ?? "");
  const [memberId, setMemberId] = useState(filterParams.memberId ?? "");
  const [phone, setPhone] = useState(filterParams.phone ?? "");
  const [rating, setRating] = useState(filterParams.rating ?? "");
  const [status, setStatus] = useState(filterParams.status ?? "");
  const [online, setOnline] = useState(!!filterParams.online);
  const [sameDownlineFirst, setSameDownlineFirst] = useState(!!filterParams.sameDownlineFirst);
  const [sortBy, setSortBy] = useState(filterParams.sortBy ?? "");

  // Location dropdowns (native village = villageId)
  const [countryId, setCountryId] = useState(filterParams.countryId ?? null);
  const [stateId, setStateId] = useState(filterParams.stateId ?? null);
  const [districtId, setDistrictId] = useState(filterParams.districtId ?? null);
  const [villageId, setVillageId] = useState(filterParams.villageId ?? null);

  // Reset dependent location filters when parent is cleared
  useEffect(() => {
    if (!countryId) {
      setStateId(null);
      setDistrictId(null);
      setVillageId(null);
    }
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setDistrictId(null);
      setVillageId(null);
    }
  }, [stateId]);

  useEffect(() => {
    if (!districtId) {
      setVillageId(null);
    }
  }, [districtId]);

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

    const params = {
      page: 1,
      limit: filterParams.limit ?? 20,
      name: name?.trim() || undefined,
      memberId: memberId?.trim() || undefined,
      phone: phone?.trim() || undefined,
      rating: rating?.trim() || undefined,
      status: status?.trim() || undefined,
      online,
      sameDownlineFirst,
      sortBy: sortBy?.trim() || undefined,
      countryId: countryId?.value || countryId || undefined,
      stateId: stateId?.value || stateId || undefined,
      districtId: districtId?.value || districtId || undefined,
      villageId: villageId?.value || villageId || undefined,
    };
    if (onFilterChange) onFilterChange(params);
  };

  const handleResetFilters = () => {
    dispatch(removeErrors());
    setName("");
    setMemberId("");
    setPhone("");
    setRating("");
    setStatus("");
    setOnline(false);
    setSameDownlineFirst(false);
    setSortBy("");
    setCountryId(null);
    setStateId(null);
    setDistrictId(null);
    setVillageId(null);
    if (onFilterChange) {
      onFilterChange({
        page: 1,
        limit: filterParams.limit ?? 20,
        name: undefined,
        memberId: undefined,
        phone: undefined,
        rating: undefined,
        status: undefined,
        online: false,
        sameDownlineFirst: false,
        sortBy: undefined,
        countryId: undefined,
        stateId: undefined,
        districtId: undefined,
        villageId: undefined,
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
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search by name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
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
              placeholder="Enter Phone (10 digits)"
              maxLength="10"
              inputMode="numeric"
              className={errorList?.phone ? "form-input-invalid" : ""}
            />
            <Errors current_key="phone" />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Min Rating</Form.Label>
            <Form.Select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              {RATING_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12}>
          <hr className="my-3" />
          <h6 className="text-muted mb-2">Quick options</h6>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Check
            type="switch"
            id="filter-online"
            label="Available only (online)"
            checked={online}
            onChange={(e) => setOnline(e.target.checked)}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Check
            type="switch"
            id="filter-downline"
            label="Same downline first"
            checked={sameDownlineFirst}
            onChange={(e) => setSameDownlineFirst(e.target.checked)}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Sort by</Form.Label>
            <Form.Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value || "default"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col xs={12}>
          <hr className="my-3" />
          <h6 className="text-muted mb-2">Location Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Country</Form.Label>
            <CustomSelect
              value={countryId}
              onChange={setCountryId}
              loadOptions={() => dispatch(fetchCountries())}
              placeholder="Select Country"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>State</Form.Label>
            <CustomSelect
              value={stateId}
              onChange={setStateId}
              loadOptions={() =>
                countryId
                  ? dispatch(fetchStates(countryId.value || countryId))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!countryId}
              placeholder="Select State"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>District</Form.Label>
            <CustomSelect
              value={districtId}
              onChange={setDistrictId}
              loadOptions={() =>
                stateId
                  ? dispatch(fetchDistricts(stateId.value || stateId))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!stateId}
              placeholder="Select District"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Native Village</Form.Label>
            <CustomSelect
              value={villageId}
              onChange={setVillageId}
              loadOptions={() =>
                districtId
                  ? dispatch(fetchVillages(districtId.value || districtId))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!districtId}
              placeholder="Select Native Village"
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
  errorList: state.errors || {},
});

export default connect(mapStateToProps)(BookAppointmentFilters);
