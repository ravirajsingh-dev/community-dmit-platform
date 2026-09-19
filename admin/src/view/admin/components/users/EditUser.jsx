import React, { useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Row, Col, Container, Tabs, Tab } from "react-bootstrap";

import { MdEdit } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";

import { validateForm } from "@src/utils/validation";
import Errors from "@src/notifications/Errors";

import {
  editUser,
  cancelSave,
  setErrors,
  removeUserErrors,
  resetComponentStore,
  getUserById,
} from "@actions/adminUserActions";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
} from "@actions/masterDataDropdownActions";
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
} from "@actions/locationDropdownActions";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import Spinner from "@src/view/spinners/Spinner";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  OccupationOptions,
  OccupationFieldConfig,
  EducationOptions,
} from "@src/constants/CustomSelectValues";
import { ROOT_MEMBER_ID } from "@src/constants";
import AsyncCustomSelect from "@src/view/commonComponents/mainCard/AsyncCustomSelect";

const EditUser = ({
  editUser,
  errorList,
  currentUser,
  setErrors,
  removeUserErrors,
  getUserById,
  loadingUser,
  masterDataDropdown,
  locationDropdown,
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
}) => {
  const navigate = useNavigate();
  const { user_id } = useParams();

  const initialFormData = {
    // User fields
    name: "",
    phone: "",
    email: "",
    password: "",
    status: "",
    isPaid: false,
    referralId: "",
    alternatePhone: "",
    // UserDetails fields
    dob: "",
    gender: "",
    fatherName: "",
    motherName: "",
    height: "",
    weight: "",
    address: "",
    countryId: null,
    stateId: null,
    districtId: null,
    villageId: null,
    community: null,
    vansh: null,
    kul: null,
    khamp: null,
    gotra: null,
    maritalStatus: "",
    education: "",
    occupation: "",
    occupationDepartment: "",
    occupationPosition: "",
    occupationLocation: "",
    occupationBusinessName: "",
    occupationBusinessType: "",
    bloodGroup: "",
    whatsappContact: "",
  };

  const [formData, setFormData] = React.useState(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const [isDisabled, setDisabled] = React.useState(true);
  const [showPasswordField, setShowPasswordField] = React.useState(false);
  const [showPasswordCopy, setShowPasswordCopy] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingSubmitData, setPendingSubmitData] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("core");

  useEffect(() => {
    if (activeTab === "community" && masterDataDropdown.communities.length === 0) {
      fetchCommunities();
    }
    if (activeTab === "location" && locationDropdown.countries.length === 0) {
      fetchCountries();
    }
  }, [
    activeTab,
    fetchCommunities,
    fetchCountries,
    masterDataDropdown.communities.length,
    locationDropdown.countries.length,
  ]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (formData.community?.value) {
      fetchVanshes(formData.community.value);
    }
  }, [activeTab, formData.community?.value, fetchVanshes]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (currentUser?.userDetails?.vansh && formData.community?.value) {
      const vanshId = (
        currentUser.userDetails.vansh._id || currentUser.userDetails.vansh
      ).toString();
      if (
        !masterDataDropdown.vanshes[formData.community.value]?.find(
          (v) => v.value === vanshId,
        )
      ) {
        fetchVanshes(formData.community.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.community?.value,
    masterDataDropdown.vanshes,
    fetchVanshes,
  ]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (formData.vansh?.value) {
      fetchKuls(formData.vansh.value);
    }
  }, [activeTab, formData.vansh?.value, fetchKuls]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (currentUser?.userDetails?.kul && formData.vansh?.value) {
      const kulId = (
        currentUser.userDetails.kul._id || currentUser.userDetails.kul
      ).toString();
      if (
        !masterDataDropdown.kuls[formData.vansh.value]?.find(
          (k) => k.value === kulId,
        )
      ) {
        fetchKuls(formData.vansh.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.vansh?.value,
    masterDataDropdown.kuls,
    fetchKuls,
  ]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (formData.kul?.value) {
      fetchKhamps(formData.kul.value);
    }
  }, [activeTab, formData.kul?.value, fetchKhamps]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (currentUser?.userDetails?.khamp && formData.kul?.value) {
      const khampId = (
        currentUser.userDetails.khamp._id || currentUser.userDetails.khamp
      ).toString();
      if (
        !masterDataDropdown.khamps[formData.kul.value]?.find(
          (k) => k.value === khampId,
        )
      ) {
        fetchKhamps(formData.kul.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.kul?.value,
    masterDataDropdown.khamps,
    fetchKhamps,
  ]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (formData.khamp?.value) {
      fetchGotras(formData.khamp.value);
    }
  }, [activeTab, formData.khamp?.value, fetchGotras]);

  useEffect(() => {
    if (activeTab !== "community") return;
    if (currentUser?.userDetails?.gotra && formData.khamp?.value) {
      const gotraId = (
        currentUser.userDetails.gotra._id || currentUser.userDetails.gotra
      ).toString();
      if (
        !masterDataDropdown.gotras[formData.khamp.value]?.find(
          (g) => g.value === gotraId,
        )
      ) {
        fetchGotras(formData.khamp.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.khamp?.value,
    masterDataDropdown.gotras,
    fetchGotras,
  ]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (formData.countryId?.value) {
      fetchStates(formData.countryId.value);
    }
  }, [activeTab, formData.countryId?.value, fetchStates]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (currentUser?.userDetails?.stateId && formData.countryId?.value) {
      const stateId = (
        currentUser.userDetails.stateId._id || currentUser.userDetails.stateId
      ).toString();
      if (
        !locationDropdown.states[formData.countryId.value]?.find(
          (s) => s.value === stateId,
        )
      ) {
        fetchStates(formData.countryId.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.countryId?.value,
    locationDropdown.states,
    fetchStates,
  ]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (formData.stateId?.value) {
      fetchDistricts(formData.stateId.value);
    }
  }, [activeTab, formData.stateId?.value, fetchDistricts]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (currentUser?.userDetails?.districtId && formData.stateId?.value) {
      const districtId = (
        currentUser.userDetails.districtId._id ||
        currentUser.userDetails.districtId
      ).toString();
      if (
        !locationDropdown.districts[formData.stateId.value]?.find(
          (d) => d.value === districtId,
        )
      ) {
        fetchDistricts(formData.stateId.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.stateId?.value,
    locationDropdown.districts,
    fetchDistricts,
  ]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (formData.districtId?.value) {
      fetchVillages(formData.districtId.value);
    }
  }, [activeTab, formData.districtId?.value, fetchVillages]);

  useEffect(() => {
    if (activeTab !== "location") return;
    if (currentUser?.userDetails?.villageId && formData.districtId?.value) {
      const villageId = (
        currentUser.userDetails.villageId._id ||
        currentUser.userDetails.villageId
      ).toString();
      if (
        !locationDropdown.villages[formData.districtId.value]?.find(
          (v) => v.value === villageId,
        )
      ) {
        fetchVillages(formData.districtId.value);
      }
    }
  }, [
    activeTab,
    currentUser,
    formData.districtId?.value,
    locationDropdown.villages,
    fetchVillages,
  ]);

  const toggleEdit = () => setDisabled(!isDisabled);

  const loadUserFormData = (user) => {
    if (!user) return;

    const userDetails = user.userDetails || {};

    const getLabelFromOptions = (id, options) => {
      if (!id || !options || !Array.isArray(options)) return null;
      const idStr = id.toString();
      const option = options.find((opt) => opt.value === idStr);
      return option ? option.label : null;
    };

    const countryIdValue = userDetails.countryId
      ? (userDetails.countryId._id || userDetails.countryId).toString()
      : null;
    const stateIdValue = userDetails.stateId
      ? (userDetails.stateId._id || userDetails.stateId).toString()
      : null;
    const districtIdValue = userDetails.districtId
      ? (userDetails.districtId._id || userDetails.districtId).toString()
      : null;
    const villageIdValue = userDetails.villageId
      ? (userDetails.villageId._id || userDetails.villageId).toString()
      : null;
    const communityValue = userDetails.community
      ? (userDetails.community._id || userDetails.community).toString()
      : null;
    const vanshValue = userDetails.vansh
      ? (userDetails.vansh._id || userDetails.vansh).toString()
      : null;
    const kulValue = userDetails.kul
      ? (userDetails.kul._id || userDetails.kul).toString()
      : null;
    const khampValue = userDetails.khamp
      ? (userDetails.khamp._id || userDetails.khamp).toString()
      : null;
    const gotraValue = userDetails.gotra
      ? (userDetails.gotra._id || userDetails.gotra).toString()
      : null;

    const data = {
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      status:
        user.status !== undefined && user.status !== null
          ? String(user.status)
          : "",
      isPaid: user.isPaid || false,
      referralId: user.referredByMemberId || "",
      alternatePhone: user.alternatePhone || "",
      dob: userDetails.dob
        ? new Date(userDetails.dob).toISOString().split("T")[0]
        : "",
      gender: userDetails.gender || "",
      fatherName: userDetails.fatherName || "",
      motherName: userDetails.motherName || "",
      height:
        userDetails.height != null && userDetails.height !== ""
          ? String(userDetails.height)
          : "",
      weight:
        userDetails.weight != null && userDetails.weight !== ""
          ? String(userDetails.weight)
          : "",
      address: userDetails.address || "",
      countryId: countryIdValue
        ? {
            value: countryIdValue,
            label:
              userDetails.countryLabel ||
              getLabelFromOptions(countryIdValue, locationDropdown.countries) ||
              "Loading...",
          }
        : null,
      stateId: stateIdValue
        ? {
            value: stateIdValue,
            label:
              userDetails.stateLabel ||
              getLabelFromOptions(
                stateIdValue,
                locationDropdown.states[countryIdValue] || [],
              ) ||
              "Loading...",
            status: userDetails.stateStatus,
          }
        : null,
      districtId: districtIdValue
        ? {
            value: districtIdValue,
            label:
              userDetails.districtLabel ||
              getLabelFromOptions(
                districtIdValue,
                locationDropdown.districts[stateIdValue] || [],
              ) ||
              "Loading...",
            status: userDetails.districtStatus,
          }
        : null,
      villageId: villageIdValue
        ? {
            value: villageIdValue,
            label:
              userDetails.villageLabel ||
              getLabelFromOptions(
                villageIdValue,
                locationDropdown.villages[districtIdValue] || [],
              ) ||
              "Loading...",
            status: userDetails.villageStatus,
          }
        : null,
      community: communityValue
        ? {
            value: communityValue,
            label:
              userDetails.communityLabel ||
              getLabelFromOptions(
                communityValue,
                masterDataDropdown.communities,
              ) ||
              "Loading...",
            status: userDetails.communityStatus,
          }
        : null,
      vansh: vanshValue
        ? {
            value: vanshValue,
            label:
              userDetails.vanshLabel ||
              getLabelFromOptions(
                vanshValue,
                masterDataDropdown.vanshes[communityValue] || [],
              ) ||
              "Loading...",
            status: userDetails.vanshStatus,
          }
        : null,
      kul: kulValue
        ? {
            value: kulValue,
            label:
              userDetails.kulLabel ||
              getLabelFromOptions(
                kulValue,
                masterDataDropdown.kuls[vanshValue] || [],
              ) ||
              "Loading...",
            status: userDetails.kulStatus,
          }
        : null,
      khamp: khampValue
        ? {
            value: khampValue,
            label:
              userDetails.khampLabel ||
              getLabelFromOptions(
                khampValue,
                masterDataDropdown.khamps[kulValue] || [],
              ) ||
              "Loading...",
            status: userDetails.khampStatus,
          }
        : null,
      gotra: gotraValue
        ? {
            value: gotraValue,
            label:
              userDetails.gotraLabel ||
              getLabelFromOptions(
                gotraValue,
                masterDataDropdown.gotras[khampValue] || [],
              ) ||
              "Loading...",
            status: userDetails.gotraStatus,
          }
        : null,
      maritalStatus: userDetails.maritalStatus || "",
      education: userDetails.education || "",
      occupation: userDetails.occupation || "",
      occupationDepartment: userDetails.occupationDetails?.department ?? "",
      occupationPosition: userDetails.occupationDetails?.position ?? "",
      occupationLocation: userDetails.occupationDetails?.location ?? "",
      occupationBusinessName: userDetails.occupationDetails?.businessName ?? "",
      occupationBusinessType: userDetails.occupationDetails?.businessType ?? "",
      bloodGroup: userDetails.bloodGroup || "",
      whatsappContact: userDetails.whatsappContact || "",
      password: "",
    };

    setFormData(data);
  };

  React.  useEffect(() => {
    if (!user_id) return;
    getUserById(user_id);
  }, [getUserById, user_id]);

  React.useEffect(() => {
    if (
      !currentUser ||
      (Array.isArray(currentUser) && currentUser.length === 0) ||
      !currentUser._id
    )
      return;
    loadUserFormData(currentUser);
  }, [currentUser]);

  const onChange = (e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: newValue };
      if (name === "occupation") {
        next.occupationDepartment = "";
        next.occupationPosition = "";
        next.occupationLocation = "";
        next.occupationBusinessName = "";
        next.occupationBusinessType = "";
      }
      return next;
    });
  };

  const handleSelectChange = useCallback((name, selectedOption) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: selectedOption };
      if (name === "countryId") {
        newData.stateId = null;
        newData.districtId = null;
        newData.villageId = null;
      } else if (name === "stateId") {
        newData.districtId = null;
        newData.villageId = null;
      } else if (name === "districtId") {
        newData.villageId = null;
      } else if (name === "community") {
        newData.vansh = null;
        newData.kul = null;
        newData.khamp = null;
        newData.gotra = null;
      } else if (name === "vansh") {
        newData.kul = null;
        newData.khamp = null;
        newData.gotra = null;
      } else if (name === "kul") {
        newData.khamp = null;
        newData.gotra = null;
      } else if (name === "khamp") {
        newData.gotra = null;
      }
      return newData;
    });
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    removeUserErrors();

    const isRootUser =
      currentUser?.memberId === ROOT_MEMBER_ID;

    let validationRules = [
      { path: "name", msg: "Name is required" },
      { path: "phone", msg: "Phone is required" },
      ...(isRootUser
        ? []
        : [
            {
              path: "referralId",
              msg: "Referral cannot be removed",
              validator: (value) => value && String(value).trim().length > 0,
            },
          ]),
    ];

    if (showPasswordField) {
      validationRules.push({
        path: "password",
        msg: "Password is required when changing password",
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    const occupationDetailKeys = [
      "occupationDepartment",
      "occupationPosition",
      "occupationLocation",
      "occupationBusinessName",
      "occupationBusinessType",
    ];
    const submitData = {};
    for (let key in formData) {
      if (key === "password" && !showPasswordField) continue;
      if (key === "status" || key === "isPaid") continue;
      if (occupationDetailKeys.includes(key)) continue;
      if (
        key === "countryId" ||
        key === "stateId" ||
        key === "districtId" ||
        key === "villageId" ||
        key === "community" ||
        key === "vansh" ||
        key === "kul" ||
        key === "khamp" ||
        key === "gotra"
      ) {
        if (formData[key] && formData[key].value) {
          submitData[key] = formData[key].value;
        }
      } else if (
        formData[key] !== "" &&
        formData[key] !== null &&
        formData[key] !== undefined
      ) {
        submitData[key] = formData[key];
      }
    }
    if (formData.occupation) {
      submitData.occupation = formData.occupation;
      const fields = OccupationFieldConfig[formData.occupation] || [];
      if (fields.length > 0) {
        const keyToForm = {
          department: "occupationDepartment",
          position: "occupationPosition",
          location: "occupationLocation",
          businessName: "occupationBusinessName",
          businessType: "occupationBusinessType",
        };
        const occupationDetails = {};
        fields.forEach((f) => {
          const v = formData[keyToForm[f.key]];
          if (v != null && String(v).trim() !== "") {
            occupationDetails[f.key] = String(v).trim();
          }
        });
        if (Object.keys(occupationDetails).length > 0) {
          submitData.occupationDetails = occupationDetails;
        }
      }
    }

    // Show confirmation modal with transaction password
    setPendingSubmitData(submitData);
    setShowConfirmModal(true);
  };

  const handleConfirmEdit = (txnPassword) => {
    if (pendingSubmitData && txnPassword) {
      setSubmitting(true);
      const submitDataWithTxn = {
        ...pendingSubmitData,
        txn_password: txnPassword,
      };
      editUser(submitDataWithTxn, navigate, user_id).then((res) => {
        setSubmitting(false);
        if (res && res.status === true) {
          toggleEdit();
          setShowPasswordField(false);
          setFormData((prev) => ({ ...prev, password: "" }));
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        } else {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }
      });
    }
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    if (currentUser && !Array.isArray(currentUser) && currentUser._id) {
      loadUserFormData(currentUser);
    }
    toggleEdit();
    setShowPasswordField(false);
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Edit User"
        crumbs={[
          { name: "Users", path: "/admin/users-list" },
          { name: "Edit User" },
        ]}
      />

      <MainCard className="card-body">
        <Form onSubmit={(e) => onSubmit(e)} autoComplete="off">
          {!loadingUser &&
          currentUser &&
          !Array.isArray(currentUser) &&
          currentUser._id ? (
            <>
              <Row className="mb-3">
                <Col xs={12} className="card-heading">
                  <Col xs={8} className="card-header-title">
                    <h5>User Information</h5>
                  </Col>
                  <Col className="text-end">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={toggleEdit}
                      className="p-0"
                    >
                      {isDisabled ? (
                        <MdEdit title="Click to Edit" size={20} />
                      ) : (
                        <FaRegEye title="View mode" size={20} />
                      )}
                    </Button>
                  </Col>
                </Col>
              </Row>

              <Tabs
                id="edit-user-sections"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || "core")}
                className="mb-3 user-edit-tabs"
              >
                <Tab eventKey="core" title="Core Information">
                  <Row className="row-gap-3 mb-4">
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Member ID</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentUser.memberId || "-"}
                      disabled={true}
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>
                      Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      className={errorList.name ? "invalid" : ""}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={onChange}
                      disabled={isDisabled}
                      required
                    />
                    <Errors current_key="name" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>
                      Phone <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      className={errorList.phone ? "invalid" : ""}
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={onChange}
                      disabled={isDisabled}
                      maxLength={10}
                      minLength={10}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) e.preventDefault();
                      }}
                      required
                    />
                    <Errors current_key="phone" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      className={errorList.email ? "invalid" : ""}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      disabled={isDisabled}
                    />
                    <Errors current_key="email" />
                  </Form.Group>
                </Col>
                  </Row>

                  <Row className="row-gap-3 mb-4">
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>
                      Referral ID
                      {currentUser?.memberId !== ROOT_MEMBER_ID && (
                        <span className="text-danger"> *</span>
                      )}
                    </Form.Label>
                    <Form.Control
                      type="text"
                      id="referralId"
                      name="referralId"
                      value={formData.referralId}
                      placeholder="G123456789"
                      maxLength={10}
                      disabled
                      readOnly
                      className={`text-muted ${errorList.referralId ? "invalid" : ""}`}
                    />
                    <Errors current_key="referralId" />
                  </Form.Group>
                </Col>
                  </Row>
                </Tab>

              {/* Password Section */}
                <Tab eventKey="security" title="Security">
                  <Row className="row-gap-3 mb-4">
                    <h6 className="text-muted">User Password (Admin Only)</h6>
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Password</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type={showPasswordCopy ? "text" : "password"}
                        value={currentUser?.passwordCopy || ""}
                        disabled={true}
                        readOnly
                        className="monospace-input"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPasswordCopy(!showPasswordCopy)}
                        title={
                          showPasswordCopy ? "Hide Password" : "Show Password"
                        }
                      >
                        {showPasswordCopy ? (
                          <FaRegEye size={18} />
                        ) : (
                          <FaRegEye size={18} />
                        )}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={async () => {
                          if (currentUser?.passwordCopy) {
                            try {
                              await navigator.clipboard.writeText(
                                currentUser.passwordCopy,
                              );
                              alert("Password copied to clipboard!");
                            } catch (err) {
                              alert("Failed to copy password");
                            }
                          }
                        }}
                        title="Copy to Clipboard"
                      >
                        <FiCopy size={18} />
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      Admin-only view of user password
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>
                      Change Password{" "}
                      {showPasswordField && (
                        <span className="text-danger">*</span>
                      )}
                    </Form.Label>
                    {showPasswordField ? (
                      <div className="d-flex gap-2">
                        <Form.Control
                          className={errorList.password ? "invalid" : ""}
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={onChange}
                          disabled={isDisabled}
                          placeholder="Enter new password"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setShowPasswordField(false);
                            setFormData((prev) => ({ ...prev, password: "" }));
                          }}
                          disabled={isDisabled}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          value="Enter new password to change"
                          disabled={true}
                          readOnly
                        />
                        <Button
                          variant="secondary"
                          onClick={() => setShowPasswordField(true)}
                          disabled={isDisabled}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                    {showPasswordField && (
                      <Form.Text className="text-warning">
                        This will change the user's login password and
                        invalidate all sessions.
                      </Form.Text>
                    )}
                    <Errors current_key="password" />
                  </Form.Group>
                </Col>
                  </Row>
                </Tab>

              {/* UserDetails Section */}
                <Tab eventKey="additional" title="Additional Details">
                  <Row className="row-gap-3 mb-4">
                    <h6 className="text-muted">Additional Details</h6>
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control
                      className={errorList.dob ? "invalid" : ""}
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={onChange}
                      disabled={isDisabled}
                    />
                    <Errors current_key="dob" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                      className={errorList.gender ? "invalid" : ""}
                      name="gender"
                      value={formData.gender}
                      onChange={onChange}
                      disabled={isDisabled}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Form.Select>
                    <Errors current_key="gender" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Father's Name</Form.Label>
                    <Form.Control
                      className={errorList.fatherName ? "invalid" : ""}
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={onChange}
                      disabled={isDisabled}
                    />
                    <Errors current_key="fatherName" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Mother's Name</Form.Label>
                    <Form.Control
                      className={errorList.motherName ? "invalid" : ""}
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={onChange}
                      disabled={isDisabled}
                      maxLength={100}
                    />
                    <Errors current_key="motherName" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Height (cm)</Form.Label>
                    <Form.Control
                      className={errorList.height ? "invalid" : ""}
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={onChange}
                      disabled={isDisabled}
                      min={0}
                      max={300}
                      step={1}
                      placeholder="e.g. 170"
                    />
                    <Errors current_key="height" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Weight (kg)</Form.Label>
                    <Form.Control
                      className={errorList.weight ? "invalid" : ""}
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={onChange}
                      disabled={isDisabled}
                      min={0}
                      max={500}
                      step={0.1}
                      placeholder="e.g. 65"
                    />
                    <Errors current_key="weight" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={12}>
                  <Form.Group>
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      className={errorList.address ? "invalid" : ""}
                      as="textarea"
                      rows={2}
                      name="address"
                      value={formData.address}
                      onChange={onChange}
                      disabled={isDisabled}
                    />
                    <Errors current_key="address" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Alternate Phone</Form.Label>
                    <Form.Control
                      className={errorList.alternatePhone ? "invalid" : ""}
                      type="tel"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={onChange}
                      disabled={isDisabled}
                      maxLength={10}
                      minLength={10}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) e.preventDefault();
                      }}
                    />
                    <Errors current_key="alternatePhone" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Marital Status</Form.Label>
                    <Form.Select
                      className={errorList.maritalStatus ? "invalid" : ""}
                      name="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={onChange}
                      disabled={isDisabled}
                    >
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="remarried">Remarried</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                      <option value="separated">Separated</option>
                    </Form.Select>
                    <Errors current_key="maritalStatus" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Education</Form.Label>
                    <Form.Select
                      className={errorList.education ? "invalid" : ""}
                      name="education"
                      value={formData.education}
                      onChange={onChange}
                      disabled={isDisabled}
                    >
                      <option value="">Select Education</option>
                      {EducationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {formData.education &&
                        !EducationOptions.some(
                          (o) => o.value === formData.education,
                        ) && (
                          <option value={formData.education}>
                            {formData.education}
                          </option>
                        )}
                    </Form.Select>
                    <Errors current_key="education" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Occupation</Form.Label>
                    <Form.Select
                      className={errorList.occupation ? "invalid" : ""}
                      name="occupation"
                      value={formData.occupation}
                      onChange={onChange}
                      disabled={isDisabled}
                    >
                      <option value="">Select Occupation</option>
                      {OccupationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {formData.occupation &&
                        !OccupationOptions.some(
                          (o) => o.value === formData.occupation,
                        ) && (
                          <option value={formData.occupation}>
                            {formData.occupation}
                          </option>
                        )}
                    </Form.Select>
                    <Errors current_key="occupation" />
                  </Form.Group>
                </Col>

                {(OccupationFieldConfig[formData.occupation] || []).map(
                  (fieldSpec) => {
                    const formKey =
                      {
                        department: "occupationDepartment",
                        position: "occupationPosition",
                        location: "occupationLocation",
                        businessName: "occupationBusinessName",
                        businessType: "occupationBusinessType",
                      }[fieldSpec.key] || fieldSpec.key;
                    return (
                      <Col xs={12} md={6} lg={4} key={fieldSpec.key}>
                        <Form.Group>
                          <Form.Label>{fieldSpec.label}</Form.Label>
                          <Form.Control
                            type="text"
                            name={formKey}
                            value={formData[formKey] || ""}
                            onChange={onChange}
                            disabled={isDisabled}
                            maxLength={200}
                          />
                        </Form.Group>
                      </Col>
                    );
                  },
                )}

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Blood Group</Form.Label>
                    <Form.Select
                      className={errorList.bloodGroup ? "invalid" : ""}
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={onChange}
                      disabled={isDisabled}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Form.Select>
                    <Errors current_key="bloodGroup" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>WhatsApp Contact</Form.Label>
                    <Form.Control
                      className={errorList.whatsappContact ? "invalid" : ""}
                      type="tel"
                      name="whatsappContact"
                      value={formData.whatsappContact}
                      onChange={onChange}
                      disabled={isDisabled}
                      maxLength={10}
                      minLength={10}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) e.preventDefault();
                      }}
                    />
                    <Errors current_key="whatsappContact" />
                  </Form.Group>
                </Col>
                  </Row>
                </Tab>

              {/* Community Details Section */}
                <Tab eventKey="community" title="Community Details">
                  <Row className="row-gap-3 mb-4">
                    <Col xs={12}>
                      <h6 className="text-muted">Community Details</h6>
                    </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Community</Form.Label>
                    <AsyncCustomSelect
                      value={formData.community}
                      onChange={(option) =>
                        handleSelectChange("community", option)
                      }
                      options={masterDataDropdown.communities}
                      isLoading={masterDataDropdown.loadingCommunities}
                      isDisabled={isDisabled}
                      isRequired={false}
                      placeholder="Select community"
                      error={errorList.community}
                    />
                    <Errors current_key="community" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Vansh</Form.Label>
                    <AsyncCustomSelect
                      value={formData.vansh}
                      onChange={(option) => handleSelectChange("vansh", option)}
                      options={
                        formData.community?.value
                          ? masterDataDropdown.vanshes[
                              formData.community.value
                            ] || []
                          : []
                      }
                      isLoading={
                        formData.community?.value
                          ? masterDataDropdown.loadingVanshes[
                              formData.community.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.community?.value}
                      isRequired={false}
                      placeholder="Select vansh"
                      error={errorList.vansh}
                    />
                    <Errors current_key="vansh" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Kul</Form.Label>
                    <AsyncCustomSelect
                      value={formData.kul}
                      onChange={(option) => handleSelectChange("kul", option)}
                      options={
                        formData.vansh?.value
                          ? masterDataDropdown.kuls[formData.vansh.value] || []
                          : []
                      }
                      isLoading={
                        formData.vansh?.value
                          ? masterDataDropdown.loadingKuls[
                              formData.vansh.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.vansh?.value}
                      isRequired={false}
                      placeholder="Select kul"
                      error={errorList.kul}
                    />
                    <Errors current_key="kul" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Khamp</Form.Label>
                    <AsyncCustomSelect
                      value={formData.khamp}
                      onChange={(option) => handleSelectChange("khamp", option)}
                      options={
                        formData.kul?.value
                          ? masterDataDropdown.khamps[formData.kul.value] || []
                          : []
                      }
                      isLoading={
                        formData.kul?.value
                          ? masterDataDropdown.loadingKhamps[
                              formData.kul.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.kul?.value}
                      isRequired={false}
                      placeholder="Select khamp"
                      error={errorList.khamp}
                    />
                    <Errors current_key="khamp" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Gotra</Form.Label>
                    <AsyncCustomSelect
                      value={formData.gotra}
                      onChange={(option) => handleSelectChange("gotra", option)}
                      options={
                        formData.khamp?.value
                          ? masterDataDropdown.gotras[formData.khamp.value] ||
                            []
                          : []
                      }
                      isLoading={
                        formData.khamp?.value
                          ? masterDataDropdown.loadingGotras[
                              formData.khamp.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.khamp?.value}
                      isRequired={false}
                      placeholder="Select gotra"
                      error={errorList.gotra}
                    />
                    <Errors current_key="gotra" />
                  </Form.Group>
                </Col>
                  </Row>
                </Tab>

              {/* Location Details Section */}
                <Tab eventKey="location" title="Location Details">
                  <Row className="row-gap-3 mb-4">
                    <Col xs={12}>
                      <h6 className="text-muted">Location Details</h6>
                    </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Country</Form.Label>
                    <AsyncCustomSelect
                      value={formData.countryId}
                      onChange={(option) =>
                        handleSelectChange("countryId", option)
                      }
                      options={locationDropdown.countries}
                      isLoading={locationDropdown.loadingCountries}
                      isDisabled={true}
                      isRequired={false}
                      placeholder="Select country"
                      error={errorList.countryId}
                    />
                    <Errors current_key="countryId" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>State</Form.Label>
                    <AsyncCustomSelect
                      value={formData.stateId}
                      onChange={(option) =>
                        handleSelectChange("stateId", option)
                      }
                      options={
                        formData.countryId?.value
                          ? locationDropdown.states[formData.countryId.value] ||
                            []
                          : []
                      }
                      isLoading={
                        formData.countryId?.value
                          ? locationDropdown.loadingStates[
                              formData.countryId.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.countryId?.value}
                      isRequired={false}
                      placeholder="Select state"
                      error={errorList.stateId}
                    />
                    <Errors current_key="stateId" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>District</Form.Label>
                    <AsyncCustomSelect
                      value={formData.districtId}
                      onChange={(option) =>
                        handleSelectChange("districtId", option)
                      }
                      options={
                        formData.stateId?.value
                          ? locationDropdown.districts[
                              formData.stateId.value
                            ] || []
                          : []
                      }
                      isLoading={
                        formData.stateId?.value
                          ? locationDropdown.loadingDistricts[
                              formData.stateId.value
                            ] || false
                          : false
                      }
                      isDisabled={isDisabled || !formData.stateId?.value}
                      isRequired={false}
                      placeholder="Select district"
                      error={errorList.districtId}
                    />
                    <Errors current_key="districtId" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label>Village</Form.Label>
                    <AsyncCustomSelect
                      value={formData.villageId}
                      onChange={(option) =>
                        handleSelectChange("villageId", option)
                      }
                      options={
                        formData.districtId?.value
                          ? locationDropdown.villages[
                              formData.districtId.value
                            ] || []
                          : []
                      }
                      isLoading={
                        formData.districtId?.value
                          ? locationDropdown.loadingVillages[
                              formData.districtId.value
                            ] || false
                          : false
                      }
                      isDisabled={
                        isDisabled ||
                        !formData.districtId?.value ||
                        !formData.stateId?.value
                      }
                      isRequired={false}
                      placeholder="Select village"
                      error={errorList.villageId}
                    />
                    <Errors current_key="villageId" />
                  </Form.Group>
                </Col>
                  </Row>
                </Tab>
              </Tabs>

              <Row>
                <Col xs={12} className="text-end">
                  <Button
                    className="m-2"
                    type="submit"
                    variant="primary"
                    disabled={submitting || isDisabled}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    className="m-2"
                    type="button"
                    variant="secondary"
                    onClick={onClickCancel}
                    disabled={submitting || isDisabled}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <Spinner />
          )}
        </Form>
      </MainCard>

      <VerificationConfirmModal
        show={showConfirmModal}
        handleClose={() => {
          setShowConfirmModal(false);
          setPendingSubmitData(null);
        }}
        handleConfirm={handleConfirmEdit}
        title="Confirm Update"
        body="Are you sure you want to update this user? Please enter your transaction password to confirm."
        submitBtnText="Update"
      />
    </Container>
  );
};

EditUser.propTypes = {
  editUser: PropTypes.func.isRequired,
  errorList: PropTypes.object.isRequired,
  cancelSave: PropTypes.func.isRequired,
  getUserById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingUser: state.adminUsers.loadingUser,
  currentUser: state.adminUsers.currentUser,
  masterDataDropdown: state.masterDataDropdown,
  locationDropdown: state.locationDropdown,
});

export default connect(mapStateToProps, {
  editUser,
  cancelSave,
  setErrors,
  removeUserErrors,
  resetComponentStore,
  getUserById,
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
})(EditUser);
