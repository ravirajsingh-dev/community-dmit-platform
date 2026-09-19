import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Tabs,
  Tab,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

// Icons
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaIdBadge,
  FaHome,
  FaMapMarkerAlt,
  FaCity,
  FaGlobe,
  FaUsers,
  FaLock,
  FaSitemap,
  FaMapMarkedAlt,
  FaUserFriends,
  FaWhatsapp,
} from "react-icons/fa";
import { BsCalendar3, BsDroplet } from "react-icons/bs";
import {
  BiUser,
  BiMaleFemale,
  BiBriefcase,
  BiBook,
  BiHeart,
} from "react-icons/bi";
import { MdFamilyRestroom } from "react-icons/md";

// Custom Imports
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import Errors from "@src/notifications/Errors";
import CustomSelect from "@src/views/Common/CustomSelect";
import { getUserProfile, updateUserProfile } from "@src/actions/profileActions";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { setAlert } from "@src/actions/alert";
import { validateForm } from "@src/utils/validation";
import { handleNumberInput } from "@src/utils/helper";
import {
  OccupationOptions,
  OccupationFieldConfig,
} from "@src/constants/occupationConstants";
import { EducationOptions } from "@src/constants/educationConstants";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
  createCommunity,
  createVansh,
  createKul,
  createKhamp,
  createGotra,
} from "@src/actions/masterDataActions";
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
  createState,
  createDistrict,
  createVillage,
} from "@src/actions/locationActions";

const BLOOD_GROUPS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const Profile = ({
  errorList,
  profile,
  masterDataDropdown,
  locationDropdown,
  getUserProfile,
  updateUserProfile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileTab, setProfileTab] = useState("basic");
  const [validated, setValidated] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const populatedProfileIdRef = useRef(null);
  const [communityDetailsLocked, setCommunityDetailsLocked] = useState(false);
  const [locationDetailsLocked, setLocationDetailsLocked] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    memberId: "",
    phone: "",
    alternatePhone: "",
    email: "",
    // UserDetails
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
  });

  // Load profile data on mount
  useEffect(() => {
    if (!profile.profile && !profile.loading) {
      getUserProfile();
    } else if (profile.profile && !profileData) {
      // If profile exists but profileData is not set, populate it
      setProfileData(profile.profile);
      populateFormData(profile.profile);
      populatedProfileIdRef.current = profile.profile._id?.toString();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync profile data from reducer when it changes
  useEffect(() => {
    if (profile.profile && profile.success && !profile.loading) {
      const newProfileId = profile.profile._id?.toString();
      const lastPopulatedId = populatedProfileIdRef.current;

      // Only update if profile actually changed
      if (newProfileId && newProfileId !== lastPopulatedId) {
        populatedProfileIdRef.current = newProfileId;
        setProfileData(profile.profile);
        populateFormData(profile.profile);
        if (isEditMode) {
          setIsEditMode(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.profile?._id, profile.success]);

  const populateFormData = (data) => {
    if (data) {
      const ud = data.userDetails || {};
      const hasCommunityDetails = !!(
        ud.community &&
        ud.vansh &&
        ud.kul &&
        ud.khamp &&
        ud.gotra
      );
      const hasLocationDetails = !!(
        ud.countryId &&
        ud.stateId &&
        ud.districtId &&
        ud.villageId
      );
      setCommunityDetailsLocked(hasCommunityDetails);
      setLocationDetailsLocked(hasLocationDetails);
      setFormData({
        name: data.name || "",
        memberId: data.memberId || "",
        phone: data.phone || "",
        alternatePhone: data.alternatePhone || "",
        email: data.email || "",
        dob: ud.dob ? new Date(ud.dob).toISOString().split("T")[0] : "",
        gender: ud.gender || "",
        fatherName: ud.fatherName || "",
        motherName: ud.motherName || "",
        height: ud.height != null && ud.height !== "" ? String(ud.height) : "",
        weight: ud.weight != null && ud.weight !== "" ? String(ud.weight) : "",
        address: ud.address ? String(ud.address).toUpperCase() : "",
        countryId: ud.countryId
          ? {
              value: (ud.countryId._id || ud.countryId).toString(),
              label: ud.countryLabel || ud.countryId.name || "",
            }
          : null,
        stateId: ud.stateId
          ? {
              value: ud.stateId.toString(),
              label: ud.stateLabel || "",
              status: ud.stateStatus,
            }
          : null,
        districtId: ud.districtId
          ? {
              value: ud.districtId.toString(),
              label: ud.districtLabel || "",
              status: ud.districtStatus,
            }
          : null,
        villageId: ud.villageId
          ? {
              value: ud.villageId.toString(),
              label: ud.villageLabel || "",
              status: ud.villageStatus,
            }
          : null,
        community: ud.community
          ? {
              value: ud.community.toString(),
              label: ud.communityLabel || "",
              status: ud.communityStatus,
            }
          : null,
        vansh: ud.vansh
          ? {
              value: ud.vansh.toString(),
              label: ud.vanshLabel || "",
              status: ud.vanshStatus,
            }
          : null,
        kul: ud.kul
          ? {
              value: ud.kul.toString(),
              label: ud.kulLabel || "",
              status: ud.kulStatus,
            }
          : null,
        khamp: ud.khamp
          ? {
              value: ud.khamp.toString(),
              label: ud.khampLabel || "",
              status: ud.khampStatus,
            }
          : null,
        gotra: ud.gotra
          ? {
              value: ud.gotra.toString(),
              label: ud.gotraLabel || "",
              status: ud.gotraStatus,
            }
          : null,
        maritalStatus: ud.maritalStatus || "",
        education: ud.education || "",
        occupation: ud.occupation || "",
        occupationDepartment: ud.occupationDetails?.department ?? "",
        occupationPosition: ud.occupationDetails?.position ?? "",
        occupationLocation: ud.occupationDetails?.location ?? "",
        occupationBusinessName: ud.occupationDetails?.businessName ?? "",
        occupationBusinessType: ud.occupationDetails?.businessType ?? "",
        bloodGroup: ud.bloodGroup || "",
        whatsappContact: ud.whatsappContact || "",
      });
    }
  };

  const loadProfile = async () => {
    await getUserProfile();
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "dob") {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setFullYear(today.getFullYear() - 3);

      if (selectedDate > today) {
        return;
      }

      if (selectedDate > minDate) {
        return;
      }
    }
    setFormData((prev) => {
      const nextValue = name === "address" ? value.toUpperCase() : value;
      const next = { ...prev, [name]: nextValue };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);

    // Client-side validation matching schema requirements
    const validationRules = [
      {
        path: "name",
        msg: "Name is required",
        validator: (value) => value && value.trim().length >= 3,
      },
      {
        path: "email",
        msg: "Email is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "email",
        msg: "Invalid email format",
        validator: (value) => !value || /\S+@\S+\.\S+/.test(value),
      },
      {
        path: "phone",
        msg: "Phone number is required",
        validator: (value) => value && String(value).trim().length > 0,
      },
      {
        path: "phone",
        msg: "Phone must be exactly 10 digits",
        validator: (value) => {
          if (!value || !String(value).trim()) return false;
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      },
      // dob: required in schema
      {
        path: "dob",
        msg: "Date of birth is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "dob",
        msg: "Date of birth cannot be in the future",
        validator: (value) => {
          if (!value) return false;
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate <= today;
        },
      },
      {
        path: "dob",
        msg: "Minimum age must be 3 years",
        validator: (value) => {
          if (!value) return false;
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const minDate = new Date(today);
          minDate.setFullYear(today.getFullYear() - 3);
          return selectedDate <= minDate;
        },
      },
      // gender: required in schema, enum: ["male", "female", "other"]
      {
        path: "gender",
        msg: "Gender is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "gender",
        msg: "Gender must be one of: male, female, other",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return ["male", "female", "other"].includes(value);
        },
      },
      // fatherName: required in schema, minlength: 3, maxlength: 100
      {
        path: "fatherName",
        msg: "Father's name is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "fatherName",
        msg: "Father's name must be at least 3 characters",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return value.trim().length >= 3;
        },
      },
      {
        path: "fatherName",
        msg: "Father's name must be at most 100 characters",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return value.trim().length <= 100;
        },
      },
      // motherName: optional; when provided, min 3, max 100
      {
        path: "motherName",
        msg: "Mother's name must be at least 3 characters",
        validator: (value) => {
          if (!value || !value.trim()) return true;
          return value.trim().length >= 3;
        },
      },
      {
        path: "motherName",
        msg: "Mother's name must be at most 100 characters",
        validator: (value) => {
          if (!value || !value.trim()) return true;
          return value.trim().length <= 100;
        },
      },
      // height: optional; when provided, 0–300
      {
        path: "height",
        msg: "Height must be between 0 and 300",
        validator: (value) => {
          if (value === "" || value == null) return true;
          const n = Number(value);
          return !Number.isNaN(n) && n >= 0 && n <= 300;
        },
      },
      // weight: optional; when provided, 0–500
      {
        path: "weight",
        msg: "Weight must be between 0 and 500",
        validator: (value) => {
          if (value === "" || value == null) return true;
          const n = Number(value);
          return !Number.isNaN(n) && n >= 0 && n <= 500;
        },
      },
      // address: required in schema, minlength: 5, maxlength: 300
      {
        path: "address",
        msg: "Address is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "address",
        msg: "Address must be at least 5 characters",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return value.trim().length >= 5;
        },
      },
      {
        path: "address",
        msg: "Address must be at most 300 characters",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return value.trim().length <= 300;
        },
      },
      // maritalStatus: required in schema, enum: ["single", "married", "remarried", "divorced", "widowed", "separated"]
      {
        path: "maritalStatus",
        msg: "Marital status is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "maritalStatus",
        msg: "Marital status must be one of: single, married, remarried, divorced, widowed, separated",
        validator: (value) => {
          if (!value) return true; // Required check is separate
          return [
            "single",
            "married",
            "remarried",
            "divorced",
            "widowed",
            "separated",
          ].includes(value);
        },
      },
      // whatsappContact: optional in schema, but if provided: minlength: 10, maxlength: 10
      {
        path: "whatsappContact",
        msg: "WhatsApp contact must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true; // Optional field
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      },
      // education: optional, must be one of EducationOptions values
      {
        path: "education",
        msg: "Education must be one of the allowed options",
        validator: (value) => {
          if (!value) return true; // Optional field
          return EducationOptions.some((o) => o.value === String(value).trim());
        },
      },
      // occupation: optional, one of Student | Government Job | Private Job | Business
      {
        path: "occupation",
        msg: "Occupation must be one of: Student, Government Job, Private Job, Business",
        validator: (value) => {
          if (!value) return true;
          return [
            "Student",
            "Government Job",
            "Private Job",
            "Business",
          ].includes(value.trim());
        },
      },
      // bloodGroup: optional in schema, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
      {
        path: "bloodGroup",
        msg: "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
        validator: (value) => {
          if (!value) return true; // Optional field
          return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(
            value,
          );
        },
      },
      // alternatePhone: optional, but if provided must be 10 digits and different from main phone
      {
        path: "alternatePhone",
        msg: "Alternate phone must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true; // Optional
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      },
      {
        path: "alternatePhone",
        msg: "Alternate phone must be different from main phone",
        validator: (value) => {
          if (!value) return true; // Optional
          return value !== formData.phone;
        },
      },
    ];

    const errors = validateForm(formData, validationRules);
    if (errors.length > 0) {
      // Clear previous errors
      dispatch(removeErrors());

      // Dispatch all validation errors
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });

      // Show alert message
      dispatch(setAlert("Please correct the errors below", "danger"));
      setProfileTab(profileTabForFieldPath(errors[0].path));

      // Scroll to first error field after a short delay to ensure DOM is updated
      setTimeout(() => {
        const firstErrorPath = errors[0].path;
        const firstErrorField =
          document.getElementById(`field-${firstErrorPath}`) ||
          document.querySelector(`[name="${firstErrorPath}"]`) ||
          document.querySelector(`[data-field="${firstErrorPath}"]`);

        if (firstErrorField) {
          firstErrorField.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          const input = firstErrorField.querySelector(
            'input, select, textarea, [role="combobox"]',
          );
          if (input) {
            setTimeout(() => input.focus(), 300);
          }
        }
      }, 100);

      return;
    }

    // Clear any previous errors before submission
    dispatch(removeErrors());

    // Prepare update data (exclude memberId; locked fields omitted below)
    const keyToForm = {
      department: "occupationDepartment",
      position: "occupationPosition",
      location: "occupationLocation",
      businessName: "occupationBusinessName",
      businessType: "occupationBusinessType",
    };
    const occupationDetailsForSubmit = (() => {
      if (!formData.occupation) return {};
      const details = {};
      (OccupationFieldConfig[formData.occupation] || []).forEach((f) => {
        const v = formData[keyToForm[f.key]];
        if (v != null && String(v).trim() !== "") {
          details[f.key] = String(v).trim();
        }
      });
      return Object.keys(details).length > 0
        ? { occupationDetails: details }
        : {};
    })();

    const updateData = {
      name: formData.name.trim(),
      email: formData.email ? formData.email.trim() : "",
      phone: formData.phone ? String(formData.phone).trim() : "",
      alternatePhone: formData.alternatePhone
        ? formData.alternatePhone.trim()
        : "",
      dob: formData.dob || undefined,
      gender: formData.gender || undefined,
      fatherName: formData.fatherName ? formData.fatherName.trim() : undefined,
      motherName: formData.motherName ? formData.motherName.trim() : undefined,
      height:
        formData.height !== "" && formData.height != null
          ? Number(formData.height)
          : undefined,
      weight:
        formData.weight !== "" && formData.weight != null
          ? Number(formData.weight)
          : undefined,
      address: formData.address ? formData.address.trim() : undefined,
      // Only include location fields if not locked
      ...(locationDetailsLocked
        ? {}
        : {
            countryId: formData.countryId?.value || undefined,
            stateId: formData.stateId?.value || undefined,
            districtId: formData.districtId?.value || undefined,
            villageId: formData.villageId?.value || undefined,
          }),
      // Only include community fields if not locked
      ...(communityDetailsLocked
        ? {}
        : {
            community: formData.community?.value || undefined,
            vansh: formData.vansh?.value || undefined,
            kul: formData.kul?.value || undefined,
            khamp: formData.khamp?.value || undefined,
            gotra: formData.gotra?.value || undefined,
          }),
      maritalStatus: formData.maritalStatus || undefined,
      education: formData.education ? formData.education.trim() : undefined,
      occupation: formData.occupation ? formData.occupation.trim() : undefined,
      ...occupationDetailsForSubmit,
      bloodGroup: formData.bloodGroup ? formData.bloodGroup.trim() : undefined,
      whatsappContact: formData.whatsappContact
        ? formData.whatsappContact.trim()
        : undefined,
    };

    // Remove empty strings and undefined values
    Object.keys(updateData).forEach((key) => {
      if (
        updateData[key] === "" ||
        updateData[key] === null ||
        updateData[key] === undefined
      ) {
        delete updateData[key];
      }
    });

    const result = await updateUserProfile(updateData);
    if (result) {
      // Profile updated successfully, form will auto-update via useEffect
      // Community details locking will be handled by populateFormData in useEffect
      setIsEditMode(false);
      setValidated(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original profile data
    if (profileData) {
      populateFormData(profileData);
    }
    setIsEditMode(false);
    setValidated(false);
    // Clear any errors
    dispatch(removeErrors());
  };

  // Memoized loadOptions functions using Redux actions
  const loadCountries = useCallback(async () => {
    return dispatch(fetchCountries());
  }, [dispatch]);

  const loadStates = useCallback(async () => {
    if (!formData.countryId?.value) return { data: [] };
    return dispatch(fetchStates(formData.countryId.value));
  }, [dispatch, formData.countryId?.value]);

  const loadDistricts = useCallback(async () => {
    if (!formData.stateId?.value) return { data: [] };
    return dispatch(fetchDistricts(formData.stateId.value));
  }, [dispatch, formData.stateId?.value]);

  const loadVillages = useCallback(async () => {
    if (!formData.districtId?.value) return { data: [] };
    return dispatch(fetchVillages(formData.districtId.value));
  }, [dispatch, formData.districtId?.value]);

  const loadCommunities = useCallback(
    () => dispatch(fetchCommunities()),
    [dispatch],
  );

  const loadVanshesOptions = useCallback(async () => {
    if (!formData.community?.value) return { data: [] };
    return dispatch(fetchVanshes(formData.community.value));
  }, [dispatch, formData.community?.value]);

  const loadKulsOptions = useCallback(async () => {
    if (!formData.vansh?.value) return { data: [] };
    return dispatch(fetchKuls(formData.vansh.value));
  }, [dispatch, formData.vansh?.value]);

  const loadKhampsOptions = useCallback(async () => {
    if (!formData.kul?.value) return { data: [] };
    return dispatch(fetchKhamps(formData.kul.value));
  }, [dispatch, formData.kul?.value]);

  const loadGotrasOptions = useCallback(async () => {
    if (!formData.khamp?.value) return { data: [] };
    return dispatch(fetchGotras(formData.khamp.value));
  }, [dispatch, formData.khamp?.value]);

  const loadBloodGroupOptions = useCallback(
    async () => ({ data: BLOOD_GROUPS }),
    [],
  );

  const profileTabForFieldPath = (path) => {
    if (["community", "vansh", "kul", "khamp", "gotra"].includes(path)) {
      return "community";
    }
    if (
      ["countryId", "stateId", "districtId", "villageId", "address"].includes(
        path,
      )
    ) {
      return "address";
    }
    if (
      [
        "dob",
        "gender",
        "fatherName",
        "motherName",
        "height",
        "weight",
        "maritalStatus",
        "education",
        "occupation",
        "occupationDepartment",
        "occupationPosition",
        "occupationLocation",
        "occupationBusinessName",
        "occupationBusinessType",
        "bloodGroup",
      ].includes(path)
    ) {
      return "other";
    }
    return "basic";
  };

  useEffect(() => {
    const h = (location.hash || "").replace(/^#/, "");
    if (h === "address-details") {
      setProfileTab("address");
    }
  }, [location.hash]);

  useEffect(() => {
    if (profileTab !== "address" || location.hash !== "#address-details") {
      return undefined;
    }
    const t = window.setTimeout(() => {
      document
        .getElementById("address-details")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [profileTab, location.hash]);

  const currentUser = profile.profile;

  useEffect(() => {
    if (profileTab !== "community") return;
    dispatch(fetchCommunities());
  }, [profileTab, dispatch]);

  useEffect(() => {
    if (profileTab !== "address") return;
    dispatch(fetchCountries());
  }, [profileTab, dispatch]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (formData.community?.value) {
      dispatch(fetchVanshes(formData.community.value));
    }
  }, [profileTab, formData.community?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (currentUser?.userDetails?.vansh && formData.community?.value) {
      const vanshId = (
        currentUser.userDetails.vansh._id || currentUser.userDetails.vansh
      ).toString();
      if (
        !masterDataDropdown.vanshes[formData.community.value]?.find(
          (v) => v.value === vanshId,
        )
      ) {
        dispatch(fetchVanshes(formData.community.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.community?.value,
    masterDataDropdown.vanshes,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (formData.vansh?.value) {
      dispatch(fetchKuls(formData.vansh.value));
    }
  }, [profileTab, formData.vansh?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (currentUser?.userDetails?.kul && formData.vansh?.value) {
      const kulId = (
        currentUser.userDetails.kul._id || currentUser.userDetails.kul
      ).toString();
      if (
        !masterDataDropdown.kuls[formData.vansh.value]?.find(
          (k) => k.value === kulId,
        )
      ) {
        dispatch(fetchKuls(formData.vansh.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.vansh?.value,
    masterDataDropdown.kuls,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (formData.kul?.value) {
      dispatch(fetchKhamps(formData.kul.value));
    }
  }, [profileTab, formData.kul?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (currentUser?.userDetails?.khamp && formData.kul?.value) {
      const khampId = (
        currentUser.userDetails.khamp._id || currentUser.userDetails.khamp
      ).toString();
      if (
        !masterDataDropdown.khamps[formData.kul.value]?.find(
          (k) => k.value === khampId,
        )
      ) {
        dispatch(fetchKhamps(formData.kul.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.kul?.value,
    masterDataDropdown.khamps,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (formData.khamp?.value) {
      dispatch(fetchGotras(formData.khamp.value));
    }
  }, [profileTab, formData.khamp?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "community") return;
    if (currentUser?.userDetails?.gotra && formData.khamp?.value) {
      const gotraId = (
        currentUser.userDetails.gotra._id || currentUser.userDetails.gotra
      ).toString();
      if (
        !masterDataDropdown.gotras[formData.khamp.value]?.find(
          (g) => g.value === gotraId,
        )
      ) {
        dispatch(fetchGotras(formData.khamp.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.khamp?.value,
    masterDataDropdown.gotras,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "address") return;
    if (formData.countryId?.value) {
      dispatch(fetchStates(formData.countryId.value));
    }
  }, [profileTab, formData.countryId?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "address") return;
    if (currentUser?.userDetails?.stateId && formData.countryId?.value) {
      const stateId = (
        currentUser.userDetails.stateId._id || currentUser.userDetails.stateId
      ).toString();
      if (
        !locationDropdown.states[formData.countryId.value]?.find(
          (s) => s.value === stateId,
        )
      ) {
        dispatch(fetchStates(formData.countryId.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.countryId?.value,
    locationDropdown.states,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "address") return;
    if (formData.stateId?.value) {
      dispatch(fetchDistricts(formData.stateId.value));
    }
  }, [profileTab, formData.stateId?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "address") return;
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
        dispatch(fetchDistricts(formData.stateId.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.stateId?.value,
    locationDropdown.districts,
    dispatch,
  ]);

  useEffect(() => {
    if (profileTab !== "address") return;
    if (formData.districtId?.value) {
      dispatch(fetchVillages(formData.districtId.value));
    }
  }, [profileTab, formData.districtId?.value, dispatch]);

  useEffect(() => {
    if (profileTab !== "address") return;
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
        dispatch(fetchVillages(formData.districtId.value));
      }
    }
  }, [
    profileTab,
    currentUser,
    formData.districtId?.value,
    locationDropdown.villages,
    dispatch,
  ]);

  if (profile.loading && !profileData) {
    return (
      <Container className="profile-container">
        <AppBreadCrumb
          title="Profile"
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Profile" },
          ]}
        />
        <div className="profile-loading">
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="profile-container">
      <AppBreadCrumb
        title="Profile"
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "Profile" },
        ]}
      />

      <Form
        noValidate
        validated={validated}
        onSubmit={handleSubmit}
        className="authentication-form"
      >
        <MainCard>
          {/* Header with Edit Button */}
          <div className="profile-header">
            <h3 className="profile-title custom-heading-theam">User Profile</h3>
            {!isEditMode && (
              <Button
                type="button"
                className="btn-theme"
                onClick={() => setIsEditMode(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>

          {/* Error Summary */}
          {isEditMode && Object.keys(errorList).length > 0 && (
            <div className="alert alert-danger mb-3" role="alert">
              <strong>Please fix the following errors:</strong>
              <ul className="mb-0 mt-2">
                {Object.entries(errorList).map(([key, message]) => (
                  <li key={key}>
                    <a
                      href={`#field-${key}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const field = document.getElementById(`field-${key}`);
                        if (field) {
                          field.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          const input = field.querySelector(
                            'input, select, textarea, [role="combobox"]',
                          );
                          if (input) {
                            setTimeout(() => input.focus(), 300);
                          }
                        }
                      }}
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs
            id="profile-form-tabs"
            activeKey={profileTab}
            onSelect={(k) => setProfileTab(k || "basic")}
            className="mb-3 profile-tabs"
            mountOnEnter
            unmountOnExit
          >
            <Tab eventKey="basic" title="Basic Information">
              <Card className="profile-card">
                <Card.Header className="profile-card-header">
                  <h5 className="profile-card-title">Basic Information</h5>
                </Card.Header>
                <Card.Body className="profile-card-body">
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group id="field-name">
                        <Form.Label className="profile-form-label">
                          <FaUser
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter your name"
                          className={`profile-form-control ${
                            errorList.name ? "profile-form-control-invalid" : ""
                          }`}
                          required={isEditMode}
                        />
                        <Errors current_key="name" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="profile-form-label">
                          <FaIdBadge
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Member ID
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="memberId"
                          value={formData.memberId}
                          disabled
                          readOnly
                          className="profile-form-control profile-form-control-disabled"
                        />
                        <Form.Text className="profile-help-text">
                          Member ID cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-phone">
                        <Form.Label className="profile-form-label">
                          <FaPhoneAlt
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Phone Number <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter phone (10 digits)"
                          maxLength="10"
                          onKeyDown={handleNumberInput}
                          className={`profile-form-control ${
                            errorList.phone
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                          required={isEditMode}
                        />
                        <Errors current_key="phone" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-alternatePhone">
                        <Form.Label className="profile-form-label">
                          <FaPhoneAlt
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Alternate Phone
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          name="alternatePhone"
                          value={formData.alternatePhone}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter alternate phone (10 digits)"
                          maxLength="10"
                          onKeyDown={handleNumberInput}
                          className={`profile-form-control ${
                            errorList.alternatePhone
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        />
                        <Errors current_key="alternatePhone" />
                        <Form.Text className="profile-help-text">
                          Optional - Must be different from main phone
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-email">
                        <Form.Label className="profile-form-label">
                          <FaEnvelope
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Email <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter your email"
                          className={`profile-form-control ${
                            errorList.email
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                          required={isEditMode}
                        />
                        <Errors current_key="email" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-whatsappContact">
                        <Form.Label className="profile-form-label">
                          <FaWhatsapp
                            size={18}
                            className="profile-form-label-icon"
                          />
                          WhatsApp Contact
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          name="whatsappContact"
                          value={formData.whatsappContact}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter WhatsApp contact (10 digits)"
                          maxLength="10"
                          onKeyDown={handleNumberInput}
                          className={`profile-form-control ${
                            errorList.whatsappContact
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        />
                        <Errors current_key="whatsappContact" />
                        <Form.Text className="profile-help-text">
                          Optional - Must be exactly 10 digits if provided
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="community" title="Community Details">
              <Card className="profile-card">
                <Card.Header className="profile-card-header">
                  <h5 className="profile-card-title">Community Details</h5>
                </Card.Header>
                <Card.Body className="profile-card-body">
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group id="field-community">
                        <Form.Label className="profile-form-label">
                          <FaUsers
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Community
                          {communityDetailsLocked && (
                            <FaLock
                              size={14}
                              className="ms-2 text-muted"
                              title="This field is locked after first save"
                            />
                          )}
                        </Form.Label>
                        <CustomSelect
                          value={formData.community}
                          onChange={(option) =>
                            handleSelectChange("community", option)
                          }
                          loadOptions={loadCommunities}
                          isCreatable={isEditMode && !communityDetailsLocked}
                          isDisabled={!isEditMode || communityDetailsLocked}
                          placeholder="Select community"
                          onInputChange={async (inputValue, actionMeta) => {
                            if (
                              actionMeta?.action === "create-option" &&
                              inputValue &&
                              isEditMode
                            ) {
                              const result = await dispatch(
                                createCommunity(inputValue.toUpperCase()),
                              );
                              if (result?.status === true && result.response) {
                                handleSelectChange("community", {
                                  value: result.response.value,
                                  label: result.response.label,
                                });
                              }
                            }
                          }}
                        />
                        <Errors current_key="community" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-vansh">
                        <Form.Label className="profile-form-label">
                          <MdFamilyRestroom
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Vansh
                          {communityDetailsLocked && (
                            <FaLock
                              size={14}
                              className="ms-2 text-muted"
                              title="This field is locked after first save"
                            />
                          )}
                        </Form.Label>
                        <CustomSelect
                          key={`vansh-${formData.community?.value || "none"}`}
                          value={formData.vansh}
                          onChange={(option) =>
                            handleSelectChange("vansh", option)
                          }
                          loadOptions={loadVanshesOptions}
                          isCreatable={
                            isEditMode &&
                            formData.community?.value &&
                            !communityDetailsLocked
                          }
                          isDisabled={
                            !isEditMode ||
                            !formData.community?.value ||
                            communityDetailsLocked
                          }
                          placeholder="Select vansh"
                          onInputChange={async (inputValue, actionMeta) => {
                            if (
                              actionMeta?.action === "create-option" &&
                              inputValue &&
                              isEditMode &&
                              formData.community?.value
                            ) {
                              const result = await dispatch(
                                createVansh(
                                  formData.community.value,
                                  inputValue.toUpperCase(),
                                ),
                              );
                              if (result?.status === true && result.response) {
                                handleSelectChange("vansh", {
                                  value: result.response.value,
                                  label: result.response.label,
                                });
                              }
                            }
                          }}
                        />
                        <Errors current_key="vansh" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-kul">
                        <Form.Label className="profile-form-label">
                          <BiUser
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Kul
                          {communityDetailsLocked && (
                            <FaLock
                              size={14}
                              className="ms-2 text-muted"
                              title="This field is locked after first save"
                            />
                          )}
                        </Form.Label>
                        <CustomSelect
                          key={`kul-${formData.vansh?.value || "none"}`}
                          value={formData.kul}
                          onChange={(option) =>
                            handleSelectChange("kul", option)
                          }
                          loadOptions={loadKulsOptions}
                          isCreatable={
                            isEditMode &&
                            formData.vansh?.value &&
                            !communityDetailsLocked
                          }
                          isDisabled={
                            !isEditMode ||
                            !formData.vansh?.value ||
                            communityDetailsLocked
                          }
                          placeholder="Select kul"
                          onInputChange={async (inputValue, actionMeta) => {
                            if (
                              actionMeta?.action === "create-option" &&
                              inputValue &&
                              isEditMode &&
                              formData.vansh?.value
                            ) {
                              const result = await dispatch(
                                createKul(
                                  formData.vansh.value,
                                  inputValue.toUpperCase(),
                                ),
                              );
                              if (result?.status === true && result.response) {
                                handleSelectChange("kul", {
                                  value: result.response.value,
                                  label: result.response.label,
                                });
                              }
                            }
                          }}
                        />
                        <Errors current_key="kul" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-khamp">
                        <Form.Label className="profile-form-label">
                          <FaSitemap
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Khamp
                          {communityDetailsLocked && (
                            <FaLock
                              size={14}
                              className="ms-2 text-muted"
                              title="This field is locked after first save"
                            />
                          )}
                        </Form.Label>
                        <CustomSelect
                          key={`khamp-${formData.kul?.value || "none"}`}
                          value={formData.khamp}
                          onChange={(option) =>
                            handleSelectChange("khamp", option)
                          }
                          loadOptions={loadKhampsOptions}
                          isCreatable={
                            isEditMode &&
                            formData.kul?.value &&
                            !communityDetailsLocked
                          }
                          isDisabled={
                            !isEditMode ||
                            !formData.kul?.value ||
                            communityDetailsLocked
                          }
                          placeholder="Select khamp"
                          onInputChange={async (inputValue, actionMeta) => {
                            if (
                              actionMeta?.action === "create-option" &&
                              inputValue &&
                              isEditMode &&
                              formData.kul?.value
                            ) {
                              const result = await dispatch(
                                createKhamp(
                                  formData.kul.value,
                                  inputValue.toUpperCase(),
                                ),
                              );
                              if (result?.status === true && result.response) {
                                handleSelectChange("khamp", {
                                  value: result.response.value,
                                  label: result.response.label,
                                });
                              }
                            }
                          }}
                        />
                        <Errors current_key="khamp" />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group id="field-gotra">
                        <Form.Label className="profile-form-label">
                          <FaSitemap
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Gotra
                          {communityDetailsLocked && (
                            <FaLock
                              size={14}
                              className="ms-2 text-muted"
                              title="This field is locked after first save"
                            />
                          )}
                        </Form.Label>
                        <CustomSelect
                          key={`gotra-${formData.khamp?.value || "none"}`}
                          value={formData.gotra}
                          onChange={(option) =>
                            handleSelectChange("gotra", option)
                          }
                          loadOptions={loadGotrasOptions}
                          isCreatable={
                            isEditMode &&
                            formData.khamp?.value &&
                            !communityDetailsLocked
                          }
                          isDisabled={
                            !isEditMode ||
                            !formData.khamp?.value ||
                            communityDetailsLocked
                          }
                          placeholder="Select gotra"
                          onInputChange={async (inputValue, actionMeta) => {
                            if (
                              actionMeta?.action === "create-option" &&
                              inputValue &&
                              isEditMode &&
                              formData.khamp?.value
                            ) {
                              const result = await dispatch(
                                createGotra(
                                  formData.khamp.value,
                                  inputValue.toUpperCase(),
                                ),
                              );
                              if (result?.status === true && result.response) {
                                handleSelectChange("gotra", {
                                  value: result.response.value,
                                  label: result.response.label,
                                });
                              }
                            }
                          }}
                        />
                        <Errors current_key="gotra" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="address" title="Address Details">
              <div id="address-details">
                <Card className="profile-card">
                  <Card.Header className="profile-card-header">
                    <h5 className="profile-card-title">Address Details</h5>
                  </Card.Header>
                  <Card.Body className="profile-card-body">
                    <Row className="g-3">
                      <Col xs={12} md={6}>
                        <Form.Group id="field-countryId">
                          <Form.Label className="profile-form-label">
                            <FaGlobe
                              size={18}
                              className="profile-form-label-icon"
                            />
                            Country <span className="text-danger">*</span>
                            {locationDetailsLocked && (
                              <FaLock
                                size={14}
                                className="ms-2 text-muted"
                                title="This field is locked after first save"
                              />
                            )}
                          </Form.Label>
                          <CustomSelect
                            value={formData.countryId}
                            onChange={(option) =>
                              handleSelectChange("countryId", option)
                            }
                            loadOptions={loadCountries}
                            isDisabled={!isEditMode || locationDetailsLocked}
                            placeholder="Select country"
                            inputUppercase
                          />
                          <Errors current_key="countryId" />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={6}>
                        <Form.Group id="field-stateId">
                          <Form.Label className="profile-form-label">
                            <FaMapMarkerAlt
                              size={18}
                              className="profile-form-label-icon"
                            />
                            State <span className="text-danger">*</span>
                            {locationDetailsLocked && (
                              <FaLock
                                size={14}
                                className="ms-2 text-muted"
                                title="This field is locked after first save"
                              />
                            )}
                          </Form.Label>
                          <CustomSelect
                            key={`state-${formData.countryId?.value || "none"}`}
                            value={formData.stateId}
                            onChange={(option) =>
                              handleSelectChange("stateId", option)
                            }
                            loadOptions={loadStates}
                            isCreatable={isEditMode && !locationDetailsLocked}
                            isDisabled={
                              !isEditMode ||
                              !formData.countryId?.value ||
                              locationDetailsLocked
                            }
                            placeholder="Select state"
                            inputUppercase
                            onInputChange={async (inputValue, actionMeta) => {
                              if (
                                actionMeta?.action === "create-option" &&
                                inputValue &&
                                isEditMode &&
                                formData.countryId?.value
                              ) {
                                const result = await dispatch(
                                  createState(
                                    formData.countryId.value,
                                    inputValue.toUpperCase(),
                                  ),
                                );
                                if (
                                  result?.status === true &&
                                  result.response
                                ) {
                                  handleSelectChange("stateId", {
                                    value: result.response.value,
                                    label: result.response.label,
                                  });
                                }
                              }
                            }}
                          />
                          <Errors current_key="stateId" />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={6}>
                        <Form.Group id="field-districtId">
                          <Form.Label className="profile-form-label">
                            <FaCity
                              size={18}
                              className="profile-form-label-icon"
                            />
                            District <span className="text-danger">*</span>
                            {locationDetailsLocked && (
                              <FaLock
                                size={14}
                                className="ms-2 text-muted"
                                title="This field is locked after first save"
                              />
                            )}
                          </Form.Label>
                          <CustomSelect
                            key={`district-${formData.stateId?.value || "none"}`}
                            value={formData.districtId}
                            onChange={(option) =>
                              handleSelectChange("districtId", option)
                            }
                            loadOptions={loadDistricts}
                            isCreatable={
                              isEditMode &&
                              formData.countryId?.value &&
                              formData.stateId?.value &&
                              !locationDetailsLocked
                            }
                            isDisabled={
                              !isEditMode ||
                              !formData.countryId?.value ||
                              !formData.stateId?.value ||
                              locationDetailsLocked
                            }
                            placeholder="Select district"
                            inputUppercase
                            onInputChange={async (inputValue, actionMeta) => {
                              if (
                                actionMeta?.action === "create-option" &&
                                inputValue &&
                                isEditMode &&
                                formData.stateId?.value
                              ) {
                                const result = await dispatch(
                                  createDistrict(
                                    formData.stateId.value,
                                    inputValue.toUpperCase(),
                                  ),
                                );
                                if (
                                  result?.status === true &&
                                  result.response
                                ) {
                                  handleSelectChange("districtId", {
                                    value: result.response.value,
                                    label: result.response.label,
                                  });
                                }
                              }
                            }}
                          />
                          <Errors current_key="districtId" />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={6}>
                        <Form.Group id="field-villageId">
                          <Form.Label className="profile-form-label">
                            <FaHome
                              size={18}
                              className="profile-form-label-icon"
                            />
                            Native Village{" "}
                            <span className="text-danger">*</span>
                            {locationDetailsLocked && (
                              <FaLock
                                size={14}
                                className="ms-2 text-muted"
                                title="This field is locked after first save"
                              />
                            )}
                          </Form.Label>
                          <CustomSelect
                            key={`village-${formData.districtId?.value || "none"}`}
                            value={formData.villageId}
                            onChange={(option) =>
                              handleSelectChange("villageId", option)
                            }
                            loadOptions={loadVillages}
                            isCreatable={
                              isEditMode &&
                              formData.districtId?.value &&
                              !locationDetailsLocked
                            }
                            isDisabled={
                              !isEditMode ||
                              !formData.districtId?.value ||
                              locationDetailsLocked
                            }
                            placeholder="Select native village"
                            inputUppercase
                            onInputChange={async (inputValue, actionMeta) => {
                              if (
                                actionMeta?.action === "create-option" &&
                                inputValue &&
                                isEditMode &&
                                formData.districtId?.value
                              ) {
                                const result = await dispatch(
                                  createVillage(
                                    formData.districtId.value,
                                    inputValue.toUpperCase(),
                                  ),
                                );
                                if (
                                  result?.status === true &&
                                  result.response
                                ) {
                                  handleSelectChange("villageId", {
                                    value: result.response.value,
                                    label: result.response.label,
                                  });
                                }
                              }
                            }}
                          />
                          <Errors current_key="villageId" />
                        </Form.Group>
                      </Col>

                      <Col xs={12}>
                        <Form.Group id="field-address">
                          <Form.Label className="profile-form-label">
                            <FaMapMarkedAlt
                              size={18}
                              className="profile-form-label-icon"
                            />
                            Current Address{" "}
                            <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            name="address"
                            value={formData.address}
                            onChange={onChange}
                            disabled={!isEditMode}
                            placeholder="Enter your address"
                            maxLength="300"
                            style={{ textTransform: "uppercase" }}
                            className={`profile-form-control ${
                              errorList.address
                                ? "profile-form-control-invalid"
                                : ""
                            }`}
                            required={isEditMode}
                          />
                          <Errors current_key="address" />
                          <Form.Text className="profile-help-text">
                            Minimum 5 characters, maximum 300 characters
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </div>
            </Tab>

            <Tab eventKey="other" title="Other Details">
              <Card className="profile-card">
                <Card.Header className="profile-card-header">
                  <h5 className="profile-card-title">Other Details</h5>
                </Card.Header>
                <Card.Body className="profile-card-body">
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group id="field-dob">
                        <Form.Label className="profile-form-label">
                          <BsCalendar3
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Date of Birth <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={onChange}
                          disabled={!isEditMode}
                          max={(() => {
                            const today = new Date();
                            const minDate = new Date(today);
                            minDate.setFullYear(today.getFullYear() - 3);
                            return minDate.toISOString().split("T")[0];
                          })()}
                          className={`profile-form-control ${
                            errorList.dob ? "profile-form-control-invalid" : ""
                          }`}
                          required={isEditMode}
                        />
                        <Errors current_key="dob" />
                        <Form.Text className="profile-help-text">
                          Minimum age must be 3 years. Future dates are not
                          allowed.
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-gender">
                        <Form.Label className="profile-form-label">
                          <BiMaleFemale
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Gender <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="gender"
                          value={formData.gender}
                          onChange={onChange}
                          disabled={!isEditMode}
                          className={`profile-form-control ${
                            errorList.gender
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                          required={isEditMode}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Form.Select>
                        <Errors current_key="gender" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-fatherName">
                        <Form.Label className="profile-form-label">
                          <FaUserFriends
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Father's Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="fatherName"
                          value={formData.fatherName}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter father's name"
                          maxLength="100"
                          className={`profile-form-control ${
                            errorList.fatherName
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                          required={isEditMode}
                        />
                        <Errors current_key="fatherName" />
                        <Form.Text className="profile-help-text">
                          Minimum 3 characters, maximum 100 characters
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-motherName">
                        <Form.Label className="profile-form-label">
                          <FaUserFriends
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Mother's Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="motherName"
                          value={formData.motherName}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="Enter mother's name"
                          maxLength="100"
                          className={`profile-form-control ${
                            errorList.motherName
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        />
                        <Errors current_key="motherName" />
                        <Form.Text className="profile-help-text">
                          Optional. Min 3, max 100 characters
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-height">
                        <Form.Label className="profile-form-label">
                          Height (cm)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="e.g. 170"
                          min={0}
                          max={300}
                          step={1}
                          className={`profile-form-control ${
                            errorList.height
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        />
                        <Errors current_key="height" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-weight">
                        <Form.Label className="profile-form-label">
                          Weight (kg)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="weight"
                          value={formData.weight}
                          onChange={onChange}
                          disabled={!isEditMode}
                          placeholder="e.g. 65"
                          min={0}
                          max={500}
                          step={0.1}
                          className={`profile-form-control ${
                            errorList.weight
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        />
                        <Errors current_key="weight" />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group id="field-maritalStatus">
                        <Form.Label className="profile-form-label">
                          <BiHeart
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Marital Status <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="maritalStatus"
                          value={formData.maritalStatus}
                          onChange={onChange}
                          disabled={!isEditMode}
                          className={`profile-form-control ${
                            errorList.maritalStatus
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                          required={isEditMode}
                        >
                          <option value="">Select marital status</option>
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

                    <Col xs={12} md={6}>
                      <Form.Group id="field-education">
                        <Form.Label className="profile-form-label">
                          <BiBook
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Education
                        </Form.Label>
                        <Form.Select
                          name="education"
                          value={formData.education}
                          onChange={onChange}
                          disabled={!isEditMode}
                          className={`profile-form-control ${
                            errorList.education
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        >
                          <option value="">Select education</option>
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

                    <Col xs={12} md={6}>
                      <Form.Group id="field-occupation">
                        <Form.Label className="profile-form-label">
                          <BiBriefcase
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Occupation
                        </Form.Label>
                        <Form.Select
                          name="occupation"
                          value={formData.occupation}
                          onChange={onChange}
                          disabled={!isEditMode}
                          className={`profile-form-control ${
                            errorList.occupation
                              ? "profile-form-control-invalid"
                              : ""
                          }`}
                        >
                          <option value="">Select occupation</option>
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
                          <Col xs={12} md={6} key={fieldSpec.key}>
                            <Form.Group>
                              <Form.Label className="profile-form-label">
                                {fieldSpec.label}
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name={formKey}
                                value={formData[formKey] || ""}
                                onChange={onChange}
                                disabled={!isEditMode}
                                maxLength={200}
                                className="profile-form-control"
                              />
                            </Form.Group>
                          </Col>
                        );
                      },
                    )}

                    <Col xs={12} md={6}>
                      <Form.Group id="field-bloodGroup">
                        <Form.Label className="profile-form-label">
                          <BsDroplet
                            size={18}
                            className="profile-form-label-icon"
                          />
                          Blood Group
                        </Form.Label>
                        <CustomSelect
                          value={
                            formData.bloodGroup
                              ? {
                                  value: formData.bloodGroup,
                                  label: formData.bloodGroup,
                                }
                              : null
                          }
                          onChange={(option) => {
                            setFormData((prev) => ({
                              ...prev,
                              bloodGroup: option ? option.value : "",
                            }));
                          }}
                          loadOptions={loadBloodGroupOptions}
                          isDisabled={!isEditMode}
                          placeholder="Select blood group"
                        />
                        <Errors current_key="bloodGroup" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>

          {/* Action Buttons */}
          {isEditMode && (
            <div className="profile-actions">
              <Button
                type="button"
                variant="secondary"
                className="btn-common"
                onClick={handleCancel}
                disabled={profile.loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn-theme"
                disabled={profile.loading}
              >
                {profile.loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </MainCard>
      </Form>
    </Container>
  );
};

Profile.propTypes = {
  errorList: PropTypes.object,
  profile: PropTypes.object,
  masterDataDropdown: PropTypes.object,
  locationDropdown: PropTypes.object,
  getUserProfile: PropTypes.func.isRequired,
  updateUserProfile: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  profile: state.profile,
  masterDataDropdown: state.masterDataDropdown,
  locationDropdown: state.locationDropdown,
});

export default connect(mapStateToProps, {
  getUserProfile,
  updateUserProfile,
})(Profile);
