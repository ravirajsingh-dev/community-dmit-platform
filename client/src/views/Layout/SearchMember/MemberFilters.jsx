import React, { useState, useEffect } from "react";
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
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
} from "@src/actions/masterDataActions";
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
import { EducationOptions } from "@src/constants/educationConstants";

const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "remarried", label: "Remarried" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const MemberFilters = ({
  filterParams = {},
  onFilterChange,
  errorList = {},
}) => {
  const dispatch = useDispatch();

  // Text search fields
  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [name, setName] = useState(filterParams.name || "");
  const [fatherName, setFatherName] = useState(filterParams.fatherName || "");
  const [motherName, setMotherName] = useState(filterParams.motherName || "");
  const [phone, setPhone] = useState(filterParams.phone || "");
  const [email, setEmail] = useState(filterParams.email || "");

  // Location dropdowns
  const [countryId, setCountryId] = useState(filterParams.countryId || null);
  const [stateId, setStateId] = useState(filterParams.stateId || null);
  const [districtId, setDistrictId] = useState(filterParams.districtId || null);
  const [villageId, setVillageId] = useState(filterParams.villageId || null);

  // Master data dropdowns
  const [community, setCommunity] = useState(filterParams.community || null);
  const [vansh, setVansh] = useState(filterParams.vansh || null);
  const [kul, setKul] = useState(filterParams.kul || null);
  const [khamp, setKhamp] = useState(filterParams.khamp || null);
  const [gotra, setGotra] = useState(filterParams.gotra || null);

  // Other filters
  const [maritalStatus, setMaritalStatus] = useState(
    filterParams.maritalStatus || null,
  );
  const [education, setEducation] = useState(filterParams.education || null);
  const [bloodGroup, setBloodGroup] = useState(filterParams.bloodGroup || null);

  // Load dependent dropdowns when parent changes and reset children
  useEffect(() => {
    if (countryId) {
      dispatch(fetchStates(countryId));
    } else {
      // Reset dependent fields when country is cleared
      setStateId(null);
      setDistrictId(null);
      setVillageId(null);
    }
  }, [countryId, dispatch]);

  useEffect(() => {
    if (stateId) {
      dispatch(fetchDistricts(stateId));
    } else {
      // Reset dependent fields when state is cleared
      setDistrictId(null);
      setVillageId(null);
    }
  }, [stateId, dispatch]);

  useEffect(() => {
    if (districtId) {
      dispatch(fetchVillages(districtId));
    } else {
      // Reset dependent field when district is cleared
      setVillageId(null);
    }
  }, [districtId, dispatch]);

  useEffect(() => {
    if (community) {
      dispatch(fetchVanshes(community.value || community));
    } else {
      // Reset dependent fields when community is cleared
      setVansh(null);
      setKul(null);
      setKhamp(null);
      setGotra(null);
    }
  }, [community, dispatch]);

  useEffect(() => {
    if (vansh) {
      dispatch(fetchKuls(vansh.value || vansh));
    } else {
      // Reset dependent fields when vansh is cleared
      setKul(null);
      setKhamp(null);
      setGotra(null);
    }
  }, [vansh, dispatch]);

  useEffect(() => {
    if (kul) {
      dispatch(fetchKhamps(kul.value || kul));
    } else {
      // Reset dependent fields when kul is cleared
      setKhamp(null);
      setGotra(null);
    }
  }, [kul, dispatch]);

  useEffect(() => {
    if (khamp) {
      dispatch(fetchGotras(khamp.value || khamp));
    } else {
      setGotra(null);
    }
  }, [khamp, dispatch]);

  const handleApplyFilters = () => {
    // Clear previous errors
    dispatch(removeErrors());

    // Validate inputs if they have values
    const formData = {
      memberId: memberId?.trim() || "",
      phone: phone?.trim() || "",
    };
    const validationRules = [];

    // Validate Member ID if provided
    if (memberId?.trim()) {
      validationRules.push({
        path: "memberId",
        msg: "Invalid Member ID format. Expected format: G + 9 digits (e.g., G123456789)",
        validator: (value) => {
          if (!value) return true; // Optional field
          return isValidMemberIdFormat(value);
        },
      });
    }

    // Validate phone if provided
    if (phone?.trim()) {
      validationRules.push({
        path: "phone",
        msg: "Phone number must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true; // Optional field
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      });
    }

    // Run validation
    const errors = validateForm(formData, validationRules);
    if (errors.length > 0) {
      // Dispatch validation errors
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      // Don't proceed with API call if validation fails
      return;
    }

    const filters = [];
    const query = {};

    // Text search - combine into search group (only User collection fields)
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
    if (email?.trim()) {
      filters.push("search");
      searchFields.email = { value: email.trim(), type: "String" };
    }

    if (Object.keys(searchFields).length > 0) {
      query.search = searchFields;
    }

    // Father Name is in UserDetails, so handle separately
    if (fatherName?.trim()) {
      filters.push("userDetails.fatherName");
      query["userDetails.fatherName"] = {
        value: fatherName.trim(),
        type: "String",
      };
    }

    if (motherName?.trim()) {
      filters.push("userDetails.motherName");
      query["userDetails.motherName"] = {
        value: motherName.trim(),
        type: "String",
      };
    }

    // Location filters
    if (countryId) {
      filters.push("userDetails.countryId");
      query["userDetails.countryId"] = {
        value: countryId.value || countryId,
        type: "id",
      };
    }

    if (stateId) {
      filters.push("userDetails.stateId");
      query["userDetails.stateId"] = {
        value: stateId.value || stateId,
        type: "id",
      };
    }

    if (districtId) {
      filters.push("userDetails.districtId");
      query["userDetails.districtId"] = {
        value: districtId.value || districtId,
        type: "id",
      };
    }

    if (villageId) {
      filters.push("userDetails.villageId");
      query["userDetails.villageId"] = {
        value: villageId.value || villageId,
        type: "id",
      };
    }

    // Master data filters
    if (community) {
      filters.push("userDetails.community");
      query["userDetails.community"] = {
        value: community.value || community,
        type: "id",
      };
    }

    if (vansh) {
      filters.push("userDetails.vansh");
      query["userDetails.vansh"] = {
        value: vansh.value || vansh,
        type: "id",
      };
    }

    if (kul) {
      filters.push("userDetails.kul");
      query["userDetails.kul"] = {
        value: kul.value || kul,
        type: "id",
      };
    }

    if (khamp) {
      filters.push("userDetails.khamp");
      query["userDetails.khamp"] = {
        value: khamp.value || khamp,
        type: "id",
      };
    }

    if (gotra) {
      filters.push("userDetails.gotra");
      query["userDetails.gotra"] = {
        value: gotra.value || gotra,
        type: "id",
      };
    }

    // Other filters
    if (maritalStatus) {
      filters.push("userDetails.maritalStatus");
      query["userDetails.maritalStatus"] = {
        value: maritalStatus.value || maritalStatus,
        type: "String",
      };
    }

    if (education) {
      filters.push("userDetails.education");
      query["userDetails.education"] = {
        value: education.value || education,
        type: "String",
      };
    }

    if (bloodGroup) {
      filters.push("userDetails.bloodGroup");
      query["userDetails.bloodGroup"] = {
        value: bloodGroup.value || bloodGroup,
        type: "String",
      };
    }

    if (onFilterChange) {
      onFilterChange({
        filters: [...new Set(filters)], // Remove duplicates
        query,
        memberId: memberId || null,
        name: name || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        email: email || null,
        countryId: countryId || null,
        stateId: stateId || null,
        districtId: districtId || null,
        villageId: villageId || null,
        community: community || null,
        vansh: vansh || null,
        kul: kul || null,
        khamp: khamp || null,
        gotra: gotra || null,
        maritalStatus: maritalStatus || null,
        education: education || null,
        bloodGroup: bloodGroup || null,
      });
    }
  };

  const handleResetFilters = () => {
    // Clear errors when resetting
    dispatch(removeErrors());

    setMemberId("");
    setName("");
    setFatherName("");
    setMotherName("");
    setPhone("");
    setEmail("");
    setCountryId(null);
    setStateId(null);
    setDistrictId(null);
    setVillageId(null);
    setCommunity(null);
    setVansh(null);
    setKul(null);
    setKhamp(null);
    setGotra(null);
    setMaritalStatus(null);
    setEducation(null);
    setBloodGroup(null);

    if (onFilterChange) {
      onFilterChange({
        filters: [],
        query: {},
        memberId: null,
        name: null,
        fatherName: null,
        motherName: null,
        phone: null,
        email: null,
        countryId: null,
        stateId: null,
        districtId: null,
        villageId: null,
        community: null,
        vansh: null,
        kul: null,
        khamp: null,
        gotra: null,
        maritalStatus: null,
        education: null,
        bloodGroup: null,
      });
    }
  };

  return (
    <div className="mb-3">
      <Row className="row-gap-2">
        {/* Text Search Fields */}
        <Col xs={12}>
          <h6 className="text-muted mb-2">Text Search</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Member ID</Form.Label>
            <Form.Control
              type="text"
              value={formatMemberIdInput(memberId)}
              onChange={createMemberIdChangeHandler((e) => {
                setMemberId(e.target.value);
                // Clear error when user starts typing
                if (errorList?.memberId) {
                  dispatch(removeErrors());
                }
              }, "memberId")}
              onPaste={createMemberIdPasteHandler((formatted) => {
                setMemberId(formatted);
                if (errorList?.memberId) dispatch(removeErrors());
              })}
              onKeyDown={createMemberIdKeyDownHandler(
                memberId,
                (e) => {
                  setMemberId(e.target.value);
                  // Clear error when user starts typing
                  if (errorList?.memberId) {
                    dispatch(removeErrors());
                  }
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
            <Form.Label>Father Name</Form.Label>
            <Form.Control
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="Enter Father Name"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Mother Name</Form.Label>
            <Form.Control
              type="text"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="Enter Mother Name"
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
                // Clear error when user starts typing
                if (errorList?.phone) {
                  dispatch(removeErrors());
                }
              }}
              onKeyDown={handleNumberInput}
              placeholder="Enter Phone"
              maxLength="10"
              minLength="10"
              inputMode="numeric"
              pattern="[0-9]*"
              className={errorList?.phone ? "form-input-invalid" : ""}
            />
            <Errors current_key="phone" />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
            />
          </Form.Group>
        </Col>

        {/* Location Filters */}
        <Col xs={12} className="mt-3">
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
            <Form.Label>Village</Form.Label>
            <CustomSelect
              value={villageId}
              onChange={setVillageId}
              loadOptions={() =>
                districtId
                  ? dispatch(fetchVillages(districtId.value || districtId))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!districtId}
              placeholder="Select Village"
            />
          </Form.Group>
        </Col>

        {/* Master Data Filters */}
        <Col xs={12} className="mt-3">
          <h6 className="text-muted mb-2">Master Data Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Community</Form.Label>
            <CustomSelect
              value={community}
              onChange={setCommunity}
              loadOptions={() => dispatch(fetchCommunities())}
              placeholder="Select Community"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Vansh</Form.Label>
            <CustomSelect
              value={vansh}
              onChange={setVansh}
              loadOptions={() =>
                community
                  ? dispatch(fetchVanshes(community.value || community))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!community}
              placeholder="Select Vansh"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Kul</Form.Label>
            <CustomSelect
              value={kul}
              onChange={setKul}
              loadOptions={() =>
                vansh
                  ? dispatch(fetchKuls(vansh.value || vansh))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!vansh}
              placeholder="Select Kul"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Khamp</Form.Label>
            <CustomSelect
              value={khamp}
              onChange={setKhamp}
              loadOptions={() =>
                kul
                  ? dispatch(fetchKhamps(kul.value || kul))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!kul}
              placeholder="Select Khamp"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Gotra</Form.Label>
            <CustomSelect
              value={gotra}
              onChange={setGotra}
              loadOptions={() =>
                khamp
                  ? dispatch(fetchGotras(khamp.value || khamp))
                  : Promise.resolve({ data: [] })
              }
              isDisabled={!khamp}
              placeholder="Select Gotra"
            />
          </Form.Group>
        </Col>

        {/* Other Filters */}
        <Col xs={12} className="mt-3">
          <h6 className="text-muted mb-2">Other Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Marital Status</Form.Label>
            <CustomSelect
              value={maritalStatus}
              onChange={setMaritalStatus}
              loadOptions={() =>
                Promise.resolve({ data: MARITAL_STATUS_OPTIONS })
              }
              placeholder="Select Marital Status"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Education</Form.Label>
            <CustomSelect
              value={education}
              onChange={setEducation}
              loadOptions={() => Promise.resolve({ data: EducationOptions })}
              placeholder="Select Education"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Blood Group</Form.Label>
            <CustomSelect
              value={bloodGroup}
              onChange={setBloodGroup}
              loadOptions={() => Promise.resolve({ data: BLOOD_GROUP_OPTIONS })}
              placeholder="Select Blood Group"
            />
          </Form.Group>
        </Col>

        {/* Action Buttons */}
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

const ConnectedMemberFilters = connect(mapStateToProps)(MemberFilters);
export default ConnectedMemberFilters;
