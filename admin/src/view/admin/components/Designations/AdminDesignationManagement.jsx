import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Modal,
  Spinner,
  Badge,
  Card,
} from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { format } from "date-fns";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import AsyncCustomSelect from "@src/view/commonComponents/mainCard/AsyncCustomSelect";
import {
  getDesignationApplications,
  getDesignationRatingReviews,
  processDesignationDecision,
  setDesignationInactive,
  setDesignationAvailability,
  setDesignationDeleted,
  transitionDesignationStatus,
  assignDesignationDirectly,
} from "@src/actions/adminDesignationActions";
import { getWalletSettings } from "@src/actions/adminWalletSettingsActions";
import { hasPermission } from "@src/utils/permissions";
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
} from "@actions/locationDropdownActions";
import {
  formatMemberIdInput,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiCheck,
  FiX,
  FiSlash,
  FiPlayCircle,
  FiPauseCircle,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
  FiRefreshCcw,
} from "react-icons/fi";

/** Allowed transitions for each status */
const ALLOWED_ACTIONS = {
  PENDING: [
    {
      key: "approve",
      label: "Approve",
      variant: "success",
      needsRemarks: false,
    },
    { key: "reject", label: "Reject", variant: "danger", needsRemarks: true },
  ],
  APPROVED: [
    { key: "inactive", label: "Block", variant: "warning", needsRemarks: true },
    {
      key: "setOnline",
      label: "Set Online",
      variant: "success",
      needsRemarks: false,
    },
    {
      key: "setOffline",
      label: "Set Offline",
      variant: "secondary",
      needsRemarks: false,
    },
  ],
  REJECTED: [
    {
      key: "approve",
      label: "Approve",
      variant: "success",
      needsRemarks: false,
    },
  ],
  INACTIVE: [
    {
      key: "approve",
      label: "Unblock",
      variant: "success",
      needsRemarks: false,
    },
  ],
};

const getDefaultDesignationParams = () =>
  getInitialSortingParams({
    status: "ALL",
    designationCode: "",
    memberId: "",
    name: "",
    phone: "",
    countryId: null,
    stateId: null,
    districtId: null,
    villageId: null,
    minAvgRating: "",
    online: null,
    includeSummary: true,
    appliedFrom: "",
    appliedTo: "",
    decidedFrom: "",
    decidedTo: "",
  });

const AdminDesignationManagement = ({
  applications,
  pagination,
  loading,
  processing,
  summary,
  getDesignationApplications,
  processDesignationDecision,
  setDesignationInactive,
  setDesignationAvailability,
  setDesignationDeleted,
  transitionDesignationStatus,
  getDesignationRatingReviews,
  walletSettings,
  getWalletSettings,
  loggedInAdmin,
  assignDesignationDirectly,
  locationDropdown,
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
}) => {
  const [params, setParams] = useState(() => getDefaultDesignationParams());
  const [filterDraft, setFilterDraft] = useState(() =>
    getDefaultDesignationParams(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [reviewsModal, setReviewsModal] = useState({
    show: false,
    row: null,
    items: [],
    pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
    loading: false,
  });

  const [assignModalShow, setAssignModalShow] = useState(false);
  const [assignForm, setAssignForm] = useState({
    memberId: "",
    designationCode: "",
    txnPassword: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);

  const handleFilterMemberIdChange = createMemberIdChangeHandler(
    (e) =>
      setFilterDraft((prev) => ({
        ...prev,
        memberId: e.target.value,
        page: 1,
      })),
    "memberId",
  );
  const handleFilterMemberIdPaste = createMemberIdPasteHandler();
  const handleFilterMemberIdKeyDown = createMemberIdKeyDownHandler(
    filterDraft.memberId,
    (e) =>
      setFilterDraft((prev) => ({
        ...prev,
        memberId: e.target.value,
        page: 1,
      })),
    "memberId",
  );

  const handleAssignMemberIdChange = createMemberIdChangeHandler(
    (e) =>
      setAssignForm((prev) => ({
        ...prev,
        memberId: e.target.value,
      })),
    "memberId",
  );
  const handleAssignMemberIdPaste = createMemberIdPasteHandler();
  const handleAssignMemberIdKeyDown = createMemberIdKeyDownHandler(
    assignForm.memberId,
    (e) =>
      setAssignForm((prev) => ({
        ...prev,
        memberId: e.target.value,
      })),
    "memberId",
  );

  const openAssignModal = () => {
    setAssignForm({
      memberId: "",
      designationCode: "",
      txnPassword: "",
    });
    setAssignLoading(false);
    setAssignModalShow(true);
  };

  const submitDirectAssign = async () => {
    if (
      !assignForm.memberId ||
      !assignForm.designationCode ||
      !assignForm.txnPassword
    )
      return;

    setAssignLoading(true);
    try {
      await assignDesignationDirectly(
        assignForm.memberId,
        Number(assignForm.designationCode),
        assignForm.txnPassword,
        () => {
          setAssignModalShow(false);
          setAssignLoading(false);
          refresh();
        },
      );
    } catch (err) {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    getDesignationApplications(params.status, params);
  }, [
    params.status,
    params.page,
    params.limit,
    params.designationCode,
    params.memberId,
    params.name,
    params.phone,
    params.countryId,
    params.stateId,
    params.districtId,
    params.villageId,
    params.minAvgRating,
    params.online,
    params.appliedFrom,
    params.appliedTo,
    params.decidedFrom,
    params.decidedTo,
    getDesignationApplications,
  ]);

  useEffect(() => {
    if (getWalletSettings) getWalletSettings();
  }, [getWalletSettings]);

  // Location dropdowns are used by the address filters panel.
  useEffect(() => {
    if (!locationDropdown?.countries?.length) fetchCountries();
  }, [fetchCountries, locationDropdown?.countries?.length]);

  useEffect(() => {
    if (filterDraft.countryId) fetchStates(filterDraft.countryId);
  }, [filterDraft.countryId, fetchStates]);

  useEffect(() => {
    if (filterDraft.stateId) fetchDistricts(filterDraft.stateId);
  }, [filterDraft.stateId, fetchDistricts]);

  useEffect(() => {
    if (filterDraft.districtId) fetchVillages(filterDraft.districtId);
  }, [filterDraft.districtId, fetchVillages]);

  const refresh = () => getDesignationApplications(params.status, params);
  const designationConfigs = walletSettings?.designations || [];

  // Summary cards are fetched together with the table in the single listing API call.

  const actionIconByKey = useMemo(
    () => ({
      approve: FiCheck,
      reject: FiX,
      inactive: FiSlash,
      setOnline: FiPlayCircle,
      setOffline: FiPauseCircle,
      delete: FiTrash2,
    }),
    [],
  );

  const modalIconByKey = useMemo(
    () => ({
      approve: FiCheckCircle,
      reject: FiXCircle,
      inactive: FiSlash,
      setOnline: FiPlayCircle,
      setOffline: FiPauseCircle,
      delete: FiTrash2,
    }),
    [],
  );

  const hasNonStatusFilters = !!(
    params.designationCode ||
    params.memberId ||
    params.name ||
    params.phone ||
    params.countryId ||
    params.stateId ||
    params.districtId ||
    params.villageId ||
    params.minAvgRating !== "" ||
    params.online !== null ||
    params.appliedFrom ||
    params.appliedTo ||
    params.decidedFrom ||
    params.decidedTo
  );

  const clearNonStatusFilters = () => {
    setFilterDraft((prev) => ({
      ...prev,
      designationCode: "",
      memberId: "",
      name: "",
      phone: "",
      countryId: null,
      stateId: null,
      districtId: null,
      villageId: null,
      minAvgRating: "",
      online: null,
      appliedFrom: "",
      appliedTo: "",
      decidedFrom: "",
      decidedTo: "",
      page: 1,
    }));
    setParams((prev) => ({
      ...prev,
      designationCode: "",
      memberId: "",
      name: "",
      phone: "",
      countryId: null,
      stateId: null,
      districtId: null,
      villageId: null,
      minAvgRating: "",
      online: null,
      appliedFrom: "",
      appliedTo: "",
      decidedFrom: "",
      decidedTo: "",
      page: 1,
    }));
  };

  const navigateToStatus = (status) => {
    setFilterDraft((prev) => ({
      ...prev,
      status: (status || "ALL").toString().toUpperCase(),
      page: 1,
    }));
    setParams((prev) => ({
      ...prev,
      status: (status || "ALL").toString().toUpperCase(),
      page: 1,
    }));
  };

  const applyFilters = () => {
    setParams((prev) => ({
      ...prev,
      ...filterDraft,
      page: 1,
    }));
  };

  const resetAllFilters = () => {
    const resetParams = getDefaultDesignationParams();
    setFilterDraft(resetParams);
    setParams(resetParams);
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const getLabelFromOptions = (id, options = []) =>
      id ? options.find((o) => String(o.value) === String(id))?.label || id : "";

    const countryOptions = locationDropdown?.countries || [];
    const stateOptions = params.countryId
      ? locationDropdown?.states?.[params.countryId] || []
      : [];
    const districtOptions = params.stateId
      ? locationDropdown?.districts?.[params.stateId] || []
      : [];
    const villageOptions = params.districtId
      ? locationDropdown?.villages?.[params.districtId] || []
      : [];

    if (params.designationCode)
      chips.push(`Designation: ${params.designationCode}`);
    if (params.online === true) chips.push("Availability: ON");
    if (params.online === false) chips.push("Availability: OFF");
    if (params.memberId) chips.push(`Member: ${params.memberId}`);
    if (params.name) chips.push(`Name: ${params.name}`);
    if (params.phone) chips.push(`Phone: ${params.phone}`);
    if (params.countryId)
      chips.push(`Country: ${getLabelFromOptions(params.countryId, countryOptions)}`);
    if (params.stateId)
      chips.push(`State: ${getLabelFromOptions(params.stateId, stateOptions)}`);
    if (params.districtId)
      chips.push(`District: ${getLabelFromOptions(params.districtId, districtOptions)}`);
    if (params.villageId)
      chips.push(
        `Native Village: ${getLabelFromOptions(params.villageId, villageOptions)}`
      );
    if (params.minAvgRating !== "" && params.minAvgRating != null) {
      chips.push(`Min Rating: ${params.minAvgRating}`);
    }
    if (params.appliedFrom || params.appliedTo) {
      const from = params.appliedFrom ? params.appliedFrom : "";
      const to = params.appliedTo ? params.appliedTo : "";
      chips.push(`Applied: ${from}${from && to ? " - " : ""}${to}`);
    }
    if (params.decidedFrom || params.decidedTo) {
      const from = params.decidedFrom ? params.decidedFrom : "";
      const to = params.decidedTo ? params.decidedTo : "";
      chips.push(`Decided: ${from}${from && to ? " - " : ""}${to}`);
    }
    return chips.slice(0, 8);
  }, [params, locationDropdown]);

  const getSelectOption = (id, options = []) =>
    id
      ? options.find((o) => String(o.value) === String(id)) || { value: id, label: id }
      : null;

  const handleActionClick = (row, actionKey) => {
    const actions = ALLOWED_ACTIONS[row.designationStatus] || [];
    const action = actions.find((a) => a.key === actionKey);
    setActionModal({
      row,
      actionKey,
      actionLabel: action?.label || getActionLabel(actionKey),
      remarksRequired: !!action?.needsRemarks,
    });
    setRemarks("");
  };

  const executeAction = () => {
    if (!actionModal) return;
    const { row, actionKey, remarksRequired } = actionModal;
    if (remarksRequired && !remarks.trim()) return;

    const onSuccess = () => {
      setActionModal(null);
      setRemarks("");
      refresh();
    };

    const { userId, designationCode, designationEntryId } = row;

    switch (actionKey) {
      case "approve":
        if (row.designationStatus === "PENDING") {
          processDesignationDecision(
            userId,
            designationCode,
            designationEntryId || null,
            "APPROVED",
            remarks,
            onSuccess,
          );
        } else {
          transitionDesignationStatus(
            userId,
            designationCode,
            designationEntryId || null,
            "APPROVED",
            remarks,
            onSuccess,
          );
        }
        break;
      case "reject":
        processDesignationDecision(
          userId,
          designationCode,
          designationEntryId || null,
          "REJECTED",
          remarks.trim(),
          onSuccess,
        );
        break;
      case "inactive":
        setDesignationInactive(
          userId,
          designationCode,
          designationEntryId || null,
          remarks,
          onSuccess,
        );
        break;
      case "setOnline":
        setDesignationAvailability(
          userId,
          designationCode,
          designationEntryId || null,
          true,
          onSuccess,
        );
        break;
      case "setOffline":
        setDesignationAvailability(
          userId,
          designationCode,
          designationEntryId || null,
          false,
          onSuccess,
        );
        break;
      case "delete":
        setDesignationDeleted(
          userId,
          designationCode,
          designationEntryId || null,
          remarks.trim(),
          onSuccess,
        );
        break;
      default:
        setActionModal(null);
    }
  };

  const loadRatingReviews = async (row, page = 1) => {
    if (!row?.userId || row?.designationCode == null) return;
    setReviewsModal((prev) => ({ ...prev, show: true, row, loading: true }));

    const result = await getDesignationRatingReviews(
      row.userId,
      row.designationCode,
      {
        page,
        limit: reviewsModal.pagination?.limit || 10,
      },
    );

    if (!result?.success) {
      setReviewsModal((prev) => ({
        ...prev,
        loading: false,
        items: [],
        pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
      }));
      return;
    }

    setReviewsModal((prev) => ({
      ...prev,
      loading: false,
      show: true,
      row,
      items: result.data?.reviews || [],
      pagination: result.data?.pagination || {
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 1,
      },
    }));
  };

  const getActionLabel = (actionKey) => {
    const labels = {
      approve: "Approve",
      reject: "Reject",
      inactive: "Block",
      setOnline: "Set Online",
      setOffline: "Set Offline",
      delete: "Delete",
    };
    return labels[actionKey] || actionKey;
  };

  const baseColumns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      width: "150px",
    },
    {
      name: "Name",
      selector: (row) => (
        <div>
          <span
            className="text-truncate d-block"
            style={{ maxWidth: "190px" }}
            title={row.name || "-"}
          >
            {row.name || "-"}
          </span>
          <div
            className="text-muted small text-truncate"
            style={{ maxWidth: "190px" }}
            title={row.phone || "-"}
          >
            {row.phone || "-"}
          </div>
        </div>
      ),
      width: "230px",
      wrap: true,
    },
    {
      name: "Address",
      cell: (row) => {
        const maxW = "330px";
        const country = row.country || "-";
        const state = row.state || "-";
        const district = row.district || "-";
        const nativeVillage = row.nativeVillage || "-";
        const current = row.currentAddress || row.address || "-";

        return (
          <div>
            <span
              className="text-truncate d-block"
              style={{ maxWidth: maxW }}
              title={country}
            >
              {country}
            </span>
            <span
              className="text-truncate d-block text-muted"
              style={{ maxWidth: maxW }}
              title={state}
            >
              {state}
            </span>
            <span
              className="text-truncate d-block text-muted"
              style={{ maxWidth: maxW }}
              title={district}
            >
              {district}
            </span>
            <span
              className="text-truncate d-block text-muted"
              style={{ maxWidth: maxW }}
              title={nativeVillage}
            >
              {nativeVillage}
            </span>
            <span
              className="text-truncate d-block"
              style={{ maxWidth: maxW }}
              title={current}
            >
              {current}
            </span>
          </div>
        );
      },
      width: "360px",
      wrap: true,
    },
    {
      name: "Designation",
      selector: (row) => row.designationName || `Code ${row.designationCode}`,
      width: "200px",
      wrap: true,
    },
    {
      name: "Availability",
      selector: (row) =>
        row.online ? (
          <Badge bg="success">ON</Badge>
        ) : (
          <Badge bg="secondary">OFF</Badge>
        ),
      width: "180px",
    },
    {
      name: "Ratings & Reviews",
      selector: (row) => {
        const avgRating =
          typeof row.avgRating === "number" && Number.isFinite(row.avgRating)
            ? row.avgRating
            : Number(row.avgRating);
        const totalRatings =
          typeof row.totalRatings === "number" &&
          Number.isFinite(row.totalRatings)
            ? row.totalRatings
            : Number(row.totalRatings);

        if (!Number.isFinite(avgRating) || totalRatings <= 0)
          return <span>-</span>;

        return (
          <div>
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={() => loadRatingReviews(row, 1)}
            >
              {avgRating.toFixed(2)}
            </Button>
            <div className="text-muted small">{totalRatings} reviews</div>
          </div>
        );
      },
      width: "210px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => {
        const s = row.designationStatus || "-";
        const label = s === "INACTIVE" ? "BLOCKED" : s;
        const variant =
          s === "PENDING"
            ? "warning"
            : s === "APPROVED"
              ? "success"
              : s === "REJECTED"
                ? "danger"
                : s === "INACTIVE"
                  ? "secondary"
                  : "secondary";
        return (
          <div className="d-flex flex-column gap-1">
            <Badge bg={variant}>{label}</Badge>
            {row.forceAssigned && (
              <Badge bg="info" className="mt-0">
                Force Assigned by Admin
              </Badge>
            )}
          </div>
        );
      },
      width: "120px",
    },
    {
      name: "Remarks",
      selector: (row) => (
        <span
          className="d-block"
          style={{ maxWidth: "260px" }}
          title={row.remarks || "-"}
        >
          {row.remarks || "-"}
        </span>
      ),
      width: "400px",
      wrap: true,
    },
    {
      name: "Applied At",
      selector: (row) =>
        row.appliedAt
          ? format(new Date(row.appliedAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
    {
      name: "Decided At",
      selector: (row) =>
        row.approvedAt
          ? format(new Date(row.approvedAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
    {
      name: "Direct",
      selector: (row) => row.directCount ?? 0,
      width: "100px",
    },
    {
      name: "Downline",
      selector: (row) => row.totalDownlineCount ?? 0,
      width: "150px",
    },
  ];

  const actionColumn = {
    name: "Actions",
    width: "400px",
    wrap: true,
    selector: (row) => {
      const actions = ALLOWED_ACTIONS[row.designationStatus] || [];

      const isAlreadyTransition = (actionKey) => {
        if (actionKey === "setOnline") return row.online === true;
        if (actionKey === "setOffline") return row.online === false;
        return false;
      };

      // If user is already in the target state, don't show the redundant button.
      const effectiveActions = actions.filter(
        (a) => !isAlreadyTransition(a.key),
      );

      const getPermissionAction = (actionKey) => {
        if (actionKey === "approve") {
          return row.designationStatus === "PENDING" ? "approve" : "transition";
        }
        if (actionKey === "reject") return "reject";
        if (actionKey === "inactive") return "inactive";
        if (actionKey === "setOnline" || actionKey === "setOffline")
          return "transition";
        if (actionKey === "delete") return "delete";
        return null;
      };

      return (
        <span>
          {effectiveActions.map((a) => (
            <Button
              key={a.key}
              variant={a.variant}
              size="sm"
              className="me-1 mb-1"
              disabled={(() => {
                const permissionAction = getPermissionAction(a.key);
                const hasAccess =
                  !!loggedInAdmin &&
                  !!permissionAction &&
                  hasPermission(
                    loggedInAdmin,
                    "designations",
                    permissionAction,
                  );

                const already = isAlreadyTransition(a.key);

                return processing || !hasAccess || already;
              })()}
              title={(() => {
                if (processing) return "Processing...";
                if (!loggedInAdmin) return "Admin session not found";

                const permissionAction = getPermissionAction(a.key);

                if (!permissionAction) return "Action not available";
                const ok = hasPermission(
                  loggedInAdmin,
                  "designations",
                  permissionAction,
                );
                return ok ? "" : `No permission: ${permissionAction}`;
              })()}
              onClick={() => handleActionClick(row, a.key)}
            >
              <span className="d-inline-flex align-items-center">
                {(() => {
                  const Icon = actionIconByKey[a.key];
                  return Icon ? <Icon size={14} className="me-1" /> : null;
                })()}
                {a.label}
              </span>
            </Button>
          ))}
          {effectiveActions.length === 0 && (
            <span className="text-muted">-</span>
          )}
        </span>
      );
    },
  };

  const columns = [...baseColumns, actionColumn];

  const actionNeedsRemarks = !!actionModal?.remarksRequired;
  const selectedStatus = (params.status || "ALL").toString().toUpperCase();

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Designations"
        crumbs={[{ name: "Designations" }]}
      />

      <>
        <Row className="g-3 mb-3">
          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--warning h-100 ${
                selectedStatus === "PENDING" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => navigateToStatus("PENDING")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigateToStatus("PENDING");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiClock size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Pending</div>
                  <div className="admin-stat-card__value">
                    {summary?.pending ?? 0}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
                selectedStatus === "APPROVED" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => navigateToStatus("APPROVED")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigateToStatus("APPROVED");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiCheckCircle size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Active</div>
                  <div className="admin-stat-card__value">
                    {summary?.approved ?? 0}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--danger h-100 ${
                selectedStatus === "REJECTED" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => navigateToStatus("REJECTED")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigateToStatus("REJECTED");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiXCircle size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Rejected</div>
                  <div className="admin-stat-card__value">
                    {summary?.rejected ?? 0}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
                selectedStatus === "INACTIVE" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => navigateToStatus("INACTIVE")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigateToStatus("INACTIVE");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiSlash size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Blocked</div>
                  <div className="admin-stat-card__value">
                    {summary?.inactive ?? 0}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="mb-3 users-filter-wrap">
          <div className="users-filters-panel">
            <div className="users-filters-panel__header">
              <button
                type="button"
                className="users-filters-panel__toggle"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
              >
                <span>All Filters</span>
                {filtersOpen ? (
                  <FiChevronUp size={18} />
                ) : (
                  <FiChevronDown size={18} />
                )}
              </button>

              <Button
                type="button"
                variant="primary"
                className="users-filters-panel__add-btn"
                onClick={openAssignModal}
                disabled={
                  !loggedInAdmin ||
                  !hasPermission(loggedInAdmin, "designations", "transition") ||
                  assignLoading
                }
              >
                Assign Designations
              </Button>
            </div>

            {filtersOpen && (
              <div className="users-filters-panel__body">
                <Row className="g-3">
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filterDraft.status}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            status: e.target.value,
                            page: 1,
                          }))
                        }
                      >
                        <option value="ALL">All</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="INACTIVE">Blocked</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Designation</Form.Label>
                      {designationConfigs.length > 0 ? (
                        <Form.Select
                          value={filterDraft.designationCode ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilterDraft((prev) => ({
                              ...prev,
                              designationCode: val ? parseInt(val, 10) : "",
                              page: 1,
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
                          value={filterDraft.designationCode}
                          onChange={(e) =>
                            setFilterDraft((prev) => ({
                              ...prev,
                              designationCode: e.target.value
                                ? parseInt(e.target.value, 10)
                                : "",
                              page: 1,
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
                          filterDraft.online == null
                            ? "ALL"
                            : filterDraft.online === true
                              ? "ON"
                              : "OFF"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilterDraft((prev) => ({
                            ...prev,
                            online: val === "ALL" ? null : val === "ON",
                            page: 1,
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
                        value={formatMemberIdInput(filterDraft.memberId)}
                        onChange={handleFilterMemberIdChange}
                        onPaste={handleFilterMemberIdPaste}
                        onKeyDown={handleFilterMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Optional"
                        value={filterDraft.name}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            name: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="10-digit phone"
                        value={filterDraft.phone}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setFilterDraft((prev) => ({
                            ...prev,
                            phone: digits,
                            page: 1,
                          }));
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted =
                            e.clipboardData?.getData("text/plain") || "";
                          const digits = pasted.replace(/\D/g, "").slice(0, 10);
                          setFilterDraft((prev) => ({
                            ...prev,
                            phone: digits,
                            page: 1,
                          }));
                        }}
                        inputMode="numeric"
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <hr className="my-3" />
                    <h6 className="text-muted mb-2">Location Filters</h6>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Country</Form.Label>
                      <AsyncCustomSelect
                        value={getSelectOption(
                          filterDraft.countryId,
                          locationDropdown?.countries || [],
                        )}
                        onChange={(option) => {
                          setFilterDraft((prev) => ({
                            ...prev,
                            countryId: option?.value ?? null,
                            stateId: null,
                            districtId: null,
                            villageId: null,
                            page: 1,
                          }));
                        }}
                        options={locationDropdown?.countries || []}
                        isLoading={!!locationDropdown?.loadingCountries}
                        placeholder="Select Country"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>State</Form.Label>
                      <AsyncCustomSelect
                        value={getSelectOption(
                          filterDraft.stateId,
                          filterDraft.countryId
                            ? locationDropdown?.states?.[filterDraft.countryId] ||
                              []
                            : [],
                        )}
                        onChange={(option) => {
                          setFilterDraft((prev) => ({
                            ...prev,
                            stateId: option?.value ?? null,
                            districtId: null,
                            villageId: null,
                            page: 1,
                          }));
                        }}
                        options={
                          filterDraft.countryId
                            ? locationDropdown?.states?.[filterDraft.countryId] || []
                            : []
                        }
                        isLoading={!!locationDropdown?.loadingStates?.[filterDraft.countryId]}
                        isDisabled={!filterDraft.countryId}
                        placeholder="Select State"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>District</Form.Label>
                      <AsyncCustomSelect
                        value={getSelectOption(
                          filterDraft.districtId,
                          filterDraft.stateId
                            ? locationDropdown?.districts?.[filterDraft.stateId] ||
                              []
                            : [],
                        )}
                        onChange={(option) => {
                          setFilterDraft((prev) => ({
                            ...prev,
                            districtId: option?.value ?? null,
                            villageId: null,
                            page: 1,
                          }));
                        }}
                        options={
                          filterDraft.stateId
                            ? locationDropdown?.districts?.[filterDraft.stateId] || []
                            : []
                        }
                        isLoading={!!locationDropdown?.loadingDistricts?.[filterDraft.stateId]}
                        isDisabled={!filterDraft.stateId}
                        placeholder="Select District"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Native Village</Form.Label>
                      <AsyncCustomSelect
                        value={getSelectOption(
                          filterDraft.villageId,
                          filterDraft.districtId
                            ? locationDropdown?.villages?.[filterDraft.districtId] ||
                              []
                            : [],
                        )}
                        onChange={(option) => {
                          setFilterDraft((prev) => ({
                            ...prev,
                            villageId: option?.value ?? null,
                            page: 1,
                          }));
                        }}
                        options={
                          filterDraft.districtId
                            ? locationDropdown?.villages?.[filterDraft.districtId] || []
                            : []
                        }
                        isLoading={!!locationDropdown?.loadingVillages?.[filterDraft.districtId]}
                        isDisabled={!filterDraft.districtId}
                        placeholder="Select Native Village"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Applied From</Form.Label>
                      <Form.Control
                        type="date"
                        value={filterDraft.appliedFrom || ""}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            appliedFrom: e.target.value,
                            page: 1,
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
                        value={filterDraft.appliedTo || ""}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            appliedTo: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Decided From</Form.Label>
                      <Form.Control
                        type="date"
                        value={filterDraft.decidedFrom || ""}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            decidedFrom: e.target.value,
                            page: 1,
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
                        value={filterDraft.decidedTo || ""}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            decidedTo: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Min Rating</Form.Label>
                      <Form.Select
                        value={filterDraft.minAvgRating}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            minAvgRating: e.target.value,
                            page: 1,
                          }))
                        }
                      >
                        <option value="">All</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-3">
                  <Button variant="primary" onClick={applyFilters}>
                    <FiCheckCircle size={15} className="me-1" />
                    Apply
                  </Button>
                  <Button variant="secondary" onClick={resetAllFilters}>
                    <FiRotateCcw size={15} className="me-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="designation-table-wrapper">
          {loading ? (
            <BouncingLoader minHeight="260px" />
          ) : (
            <CustomDataTable
              columns={columns}
              data={applications}
              count={pagination?.totalCount ?? 0}
              params={params}
              setParams={(p) =>
                setParams((prev) => ({
                  ...prev,
                  ...p,
                }))
              }
              pagination
              responsive
              striped
              paginationServer
            />
          )}
        </div>
      </>

      {/* Assign Modal (Direct Designation Assignment with txn password verification) */}
      <Modal
        show={assignModalShow}
        onHide={() => {
          setAssignModalShow(false);
          setAssignLoading(false);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Assign Designations</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Member ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="G123456789"
                value={formatMemberIdInput(assignForm.memberId)}
                onChange={handleAssignMemberIdChange}
                onPaste={handleAssignMemberIdPaste}
                onKeyDown={handleAssignMemberIdKeyDown}
                maxLength={10}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Designation</Form.Label>
              <Form.Select
                value={assignForm.designationCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssignForm((prev) => ({
                    ...prev,
                    designationCode: val ? parseInt(val, 10) : "",
                  }));
                }}
              >
                <option value="">Select</option>
                {designationConfigs
                  .filter((d) => d?.isActive !== false)
                  .map((d) => (
                    <option key={d.designationCode} value={d.designationCode}>
                      {d.designationCode} - {d.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Transaction Password</Form.Label>
              <Form.Control
                type="password"
                value={assignForm.txnPassword}
                onChange={(e) =>
                  setAssignForm((prev) => ({
                    ...prev,
                    txnPassword: e.target.value,
                  }))
                }
                placeholder="Enter txn password"
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setAssignModalShow(false);
              setAssignLoading(false);
            }}
            disabled={assignLoading}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={submitDirectAssign}
            disabled={
              assignLoading ||
              !assignForm.memberId ||
              !assignForm.designationCode ||
              !assignForm.txnPassword
            }
          >
            {assignLoading ? (
              <Spinner size="sm" animation="border" />
            ) : (
              "Assign"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Action Modal (Approve / Reject / Inactive / Delete) */}
      <Modal
        show={!!actionModal}
        onHide={() => {
          setActionModal(null);
          setRemarks("");
        }}
      >
        <Modal.Header closeButton>
          {(() => {
            const Icon = modalIconByKey[actionModal?.actionKey];
            return (
              <Modal.Title className="designation-action-modal-title">
                <span className="designation-action-modal-icon">
                  {Icon ? <Icon size={18} /> : null}
                </span>
                {actionModal?.actionLabel ||
                  getActionLabel(actionModal?.actionKey)}{" "}
                Designation
              </Modal.Title>
            );
          })()}
        </Modal.Header>
        <Modal.Body>
          {actionModal && (
            <>
              <p>
                Are you sure you want to{" "}
                <strong>
                  {(
                    actionModal?.actionLabel ||
                    getActionLabel(actionModal?.actionKey)
                  ).toLowerCase()}
                </strong>{" "}
                this designation for <strong>{actionModal.row?.name}</strong> (
                {actionModal.row?.memberId})?
              </p>
              {actionModal.actionKey === "delete" && (
                <p className="text-warning small">
                  This will soft delete the designation. Remarks are required.
                </p>
              )}
              {(actionNeedsRemarks || remarks) && (
                <Form.Group className="mt-2">
                  <Form.Label>
                    {actionNeedsRemarks
                      ? "Remarks (required)"
                      : "Remarks (optional)"}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      actionModal.actionKey === "reject"
                        ? "Reason for rejection..."
                        : actionModal.actionKey === "inactive"
                          ? "Reason for blocking..."
                          : actionModal.actionKey === "delete"
                            ? "Reason for deletion..."
                            : "Optional notes"
                    }
                    required={actionNeedsRemarks}
                  />
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setActionModal(null);
              setRemarks("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant={
              actionModal?.actionKey === "reject"
                ? "danger"
                : actionModal?.actionKey === "inactive"
                  ? "warning"
                  : "success"
            }
            onClick={executeAction}
            disabled={processing || (actionNeedsRemarks && !remarks.trim())}
          >
            {processing ? (
              <Spinner animation="border" size="sm" />
            ) : (
              actionModal?.actionLabel || getActionLabel(actionModal?.actionKey)
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={reviewsModal.show}
        size="lg"
        onHide={() =>
          setReviewsModal((prev) => ({
            ...prev,
            show: false,
          }))
        }
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Ratings & Reviews - {reviewsModal.row?.name || "-"} (
            {reviewsModal.row?.memberId || "-"})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reviewsModal.loading ? (
            <BouncingLoader minHeight="180px" />
          ) : reviewsModal.items.length === 0 ? (
            <div className="text-muted">No ratings/reviews found.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {reviewsModal.items.map((r) => (
                <div key={r.appointmentId} className="border rounded p-2">
                  <div className="d-flex justify-content-between flex-wrap gap-2">
                    <div>
                      <strong>{r.reviewerName || "-"}</strong> (
                      {r.reviewerMemberId || "-"})
                      <div className="text-muted small">
                        {r.reviewerPhone || "-"}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">
                        Rating: {r.rating ?? "-"}
                      </div>
                      <div className="text-muted small">
                        {r.completedAt
                          ? format(
                              new Date(r.completedAt),
                              "dd/MM/yyyy, hh:mm a",
                            )
                          : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted small">Review: </span>
                    <span>{r.review || "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            Total Reviews: {reviewsModal.pagination?.totalCount ?? 0}
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={
                reviewsModal.loading ||
                (reviewsModal.pagination?.page ?? 1) <= 1
              }
              onClick={() =>
                loadRatingReviews(
                  reviewsModal.row,
                  Math.max(1, (reviewsModal.pagination?.page ?? 1) - 1),
                )
              }
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={
                reviewsModal.loading ||
                (reviewsModal.pagination?.page ?? 1) >=
                  (reviewsModal.pagination?.totalPages ?? 1)
              }
              onClick={() =>
                loadRatingReviews(
                  reviewsModal.row,
                  Math.min(
                    reviewsModal.pagination?.totalPages ?? 1,
                    (reviewsModal.pagination?.page ?? 1) + 1,
                  ),
                )
              }
            >
              Next
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminDesignationManagement.propTypes = {
  applications: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  processing: PropTypes.bool,
  summary: PropTypes.object,
  loggedInAdmin: PropTypes.object,
  walletSettings: PropTypes.object,
  locationDropdown: PropTypes.object,
  getDesignationApplications: PropTypes.func.isRequired,
  getDesignationRatingReviews: PropTypes.func.isRequired,
  getWalletSettings: PropTypes.func.isRequired,
  fetchCountries: PropTypes.func.isRequired,
  fetchStates: PropTypes.func.isRequired,
  fetchDistricts: PropTypes.func.isRequired,
  fetchVillages: PropTypes.func.isRequired,
  processDesignationDecision: PropTypes.func.isRequired,
  setDesignationInactive: PropTypes.func.isRequired,
  setDesignationAvailability: PropTypes.func.isRequired,
  setDesignationDeleted: PropTypes.func.isRequired,
  transitionDesignationStatus: PropTypes.func.isRequired,
  assignDesignationDirectly: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  applications: state.adminDesignation?.applications ?? [],
  pagination: state.adminDesignation?.pagination ?? {},
  loading: state.adminDesignation?.loading ?? false,
  processing: state.adminDesignation?.processing ?? false,
  summary: state.adminDesignation?.summary ?? null,
  loggedInAdmin: state.adminAuth?.admin ?? null,
  walletSettings: state.adminWalletSettings?.walletSettings ?? {},
  locationDropdown: state.locationDropdown ?? {},
});

export default connect(mapStateToProps, {
  getDesignationApplications,
  getDesignationRatingReviews,
  getWalletSettings,
  processDesignationDecision,
  setDesignationInactive,
  setDesignationAvailability,
  setDesignationDeleted,
  transitionDesignationStatus,
  assignDesignationDirectly,
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
})(AdminDesignationManagement);
