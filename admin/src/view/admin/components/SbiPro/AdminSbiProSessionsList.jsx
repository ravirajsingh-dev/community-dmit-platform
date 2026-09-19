import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Badge,
  Spinner,
  Modal,
  Dropdown,
  Card,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { format, parseISO } from "date-fns";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
} from "react-icons/fi";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import { getInitialSortingParams } from "@src/constants";

import api from "@src/utils/axiosSetup";
import {
  getAdminSbiProSessions,
  completeSbiProAnalysis,
  getSbiProFingerAnalysis,
  saveSbiProFingerAnalysis,
  deleteSbiProFingerImage,
  deleteSbiProAllFingerImages,
  uploadSbiProReport,
  replaceSbiProReport,
} from "@src/actions/adminSbiProActions";
import {
  FINGER_TYPES,
  FINGER_LABELS,
  STATUS_BADGES,
  STATUS_OPTIONS,
  SBI_PRO_CODES,
} from "@src/constants/sbiProConstants";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const AdminSbiProSessionsList = ({
  sessions,
  pagination,
  loading,
  completing,
  getAdminSbiProSessions,
  completeSbiProAnalysis,
  getSbiProFingerAnalysis,
  saveSbiProFingerAnalysis,
  deleteSbiProFingerImage,
  deleteSbiProAllFingerImages,
  uploadSbiProReport,
  replaceSbiProReport,
}) => {
  const [params, setParams] = useState(() =>
    getInitialSortingParams({
      status: "",
      trainerId: "",
      userMemberId: "",
      dateFrom: "",
      dateTo: "",
    }),
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [trainerIdFilter, setTrainerIdFilter] = useState("");
  const [userMemberIdFilter, setUserMemberIdFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [hoveredImage, setHoveredImage] = useState(null);
  const [zoomModal, setZoomModal] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomImgRef = useRef(null);
  const zoomContainerRef = useRef(null);
  const [zoomImageSrc, setZoomImageSrc] = useState(null);
  const [zoomImageLoading, setZoomImageLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisSession, setAnalysisSession] = useState(null);
  const [analysisData, setAnalysisData] = useState({ fingers: {} });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSaving, setAnalysisSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const [deletingAllImages, setDeletingAllImages] = useState(false);
  const [analysisEditing, setAnalysisEditing] = useState(false);
  const [uploadingReportForApt, setUploadingReportForApt] = useState(null);
  const [replaceReportForApt, setReplaceReportForApt] = useState(null);
  const reportFileInputRef = useRef(null);
  const replaceReportFileInputRef = useRef(null);
  const [showMarkDoneConfirm, setShowMarkDoneConfirm] = useState(false);
  const [markDoneSession, setMarkDoneSession] = useState(null);
  const [deleteImageConfirm, setDeleteImageConfirm] = useState({
    show: false,
    fingerType: null,
  });
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const downloadImage = useCallback(async (url, filename) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const ext = (blob.type || "").split("/")[1] || "jpg";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const downloadViaProxy = useCallback(
    async (appointmentId, fingerType, filename) => {
      const res = await api.get("/api/admin/sbi-pro-sessions/image", {
        params: { appointmentId, fingerType },
        responseType: "blob",
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const downloadAllImages = useCallback(async () => {
    if (!selectedSession?.images) return;
    const aptId = getAppointmentId(selectedSession);
    if (!aptId) return;
    const memberId = selectedSession.userId?.memberId || "user";
    for (let i = 0; i < FINGER_TYPES.length; i++) {
      const fingerType = FINGER_TYPES[i];
      const url = selectedSession.images[fingerType];
      if (url) {
        const label = (FINGER_LABELS[fingerType] || fingerType).replace(
          /\s+/g,
          "_",
        );
        await downloadViaProxy(aptId, fingerType, `${memberId}_${label}`);
        if (i < FINGER_TYPES.length - 1)
          await new Promise((r) => setTimeout(r, 400));
      }
    }
  }, [selectedSession, downloadViaProxy]);

  useEffect(() => {
    getAdminSbiProSessions({ ...params });
  }, [
    params.status,
    params.page,
    params.limit,
    params.trainerId,
    params.userMemberId,
    params.dateFrom,
    params.dateTo,
  ]);

  const refresh = () => getAdminSbiProSessions(params);
  const applyFilters = () => {
    setParams((p) => ({
      ...p,
      status: statusFilter,
      trainerId: trainerIdFilter,
      userMemberId: userMemberIdFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      page: 1,
    }));
  };

  const resetFilters = () => {
    setStatusFilter("");
    setTrainerIdFilter("");
    setUserMemberIdFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setParams((p) => ({
      ...p,
      status: "",
      trainerId: "",
      userMemberId: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
    }));
  };

  useEffect(() => {
    setStatusFilter(params.status || "");
    setTrainerIdFilter(params.trainerId || "");
    setUserMemberIdFilter(params.userMemberId || "");
    setDateFromFilter(params.dateFrom || "");
    setDateToFilter(params.dateTo || "");
  }, [
    params.status,
    params.trainerId,
    params.userMemberId,
    params.dateFrom,
    params.dateTo,
  ]);

  const handleTrainerMemberIdChange = createMemberIdChangeHandler(
    (e) => setTrainerIdFilter(e.target.value),
    "trainerMemberId",
  );
  const handleTrainerMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setTrainerIdFilter(formatted),
  );
  const handleTrainerMemberIdKeyDown = createMemberIdKeyDownHandler(
    trainerIdFilter,
    (e) => setTrainerIdFilter(e.target.value),
    "trainerMemberId",
  );
  const handleUserMemberIdChange = createMemberIdChangeHandler(
    (e) => setUserMemberIdFilter(e.target.value),
    "userMemberId",
  );
  const handleUserMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setUserMemberIdFilter(formatted),
  );
  const handleUserMemberIdKeyDown = createMemberIdKeyDownHandler(
    userMemberIdFilter,
    (e) => setUserMemberIdFilter(e.target.value),
    "userMemberId",
  );

  const getBookedSlotDisplay = (session) => {
    const appointment = session?.appointmentId;
    if (!appointment || typeof appointment !== "object")
      return getAppointmentId(session) || "-";

    const slotStart = appointment?.slotId?.startTime;
    const slotEnd = appointment?.slotId?.endTime;
    const slotDateKey =
      appointment?.dateKey ||
      (appointment?.sessionStartTime
        ? format(parseISO(appointment.sessionStartTime), "yyyy-MM-dd")
        : null);

    const formatSlotTime = (time) => {
      if (!time || !slotDateKey) return null;
      return format(parseISO(`${slotDateKey}T${time}:00.000Z`), "hh:mm a");
    };

    const slotStartDisplay = formatSlotTime(slotStart);
    const slotEndDisplay = formatSlotTime(slotEnd);

    if (appointment?.sessionStartTime && slotStart && slotEnd) {
      return `${format(parseISO(appointment.sessionStartTime), "dd/MM/yyyy")}, ${
        slotStartDisplay || slotStart
      } - ${slotEndDisplay || slotEnd}`;
    }
    if (slotStart && slotEnd && appointment?.dateKey) {
      return `${format(
        parseISO(`${appointment.dateKey}T00:00:00.000Z`),
        "dd/MM/yyyy",
      )}, ${slotStartDisplay || slotStart} - ${slotEndDisplay || slotEnd}`;
    }
    if (appointment?.sessionStartTime) {
      return format(
        parseISO(appointment.sessionStartTime),
        "dd/MM/yyyy, hh:mm a",
      );
    }
    if (appointment?.dateKey) {
      return format(
        parseISO(`${appointment.dateKey}T00:00:00.000Z`),
        "dd/MM/yyyy",
      );
    }
    return "-";
  };

  const statusCards = [
    {
      key: "",
      label: "ALL",
      icon: FiCalendar,
      className: "admin-stat-card--total",
    },
    {
      key: "CREATED",
      label: "CREATED",
      icon: FiClock,
      className: "admin-stat-card--muted",
    },
    {
      key: "ANALYSIS_PENDING",
      label: "ANALYSIS_PENDING",
      icon: FiCheckCircle,
      className: "admin-stat-card--success",
    },
    {
      key: "VERIFICATION_PENDING",
      label: "VERIFICATION_PENDING",
      icon: FiClock,
      className: "admin-stat-card--warning",
    },
  ];
  const statusCounts = (sessions || []).reduce(
    (acc, session) => {
      if (session.status === "ANALYSIS_PENDING") acc.analysisPending += 1;
      if (session.status === "VERIFICATION_PENDING")
        acc.verificationPending += 1;
      if (session.status === "CREATED") acc.created += 1;
      acc.all += 1;
      return acc;
    },
    { analysisPending: 0, verificationPending: 0, created: 0, all: 0 },
  );
  const cardValueByKey = {
    ANALYSIS_PENDING: statusCounts.analysisPending,
    VERIFICATION_PENDING: statusCounts.verificationPending,
    CREATED: statusCounts.created,
    "": statusCounts.all,
  };

  const handleOpenAnalysis = async (session) => {
    setAnalysisSession(session);
    setShowAnalysisModal(true);
    setAnalysisEditing(false);
    setAnalysisLoading(true);
    try {
      const aptId = getAppointmentId(session);
      const data = await getSbiProFingerAnalysis(aptId);
      const fingers = data?.fingers || {};
      FINGER_TYPES.forEach((ft) => {
        if (!fingers[ft]) fingers[ft] = { code: null, count: null };
      });
      setAnalysisData({ ...data, fingers });
    } catch {
      setAnalysisData({ fingers: {} });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAnalysisChange = (fingerType, field, value) => {
    setAnalysisData((prev) => ({
      ...prev,
      fingers: {
        ...prev.fingers,
        [fingerType]: {
          ...(prev.fingers[fingerType] || {}),
          [field]: field === "count" ? (value === "" ? null : value) : value,
        },
      },
    }));
  };

  const handleSaveAnalysis = () => {
    setShowSaveConfirm(true);
  };

  const handleConfirmSaveAnalysis = async () => {
    if (!analysisSession) return;
    setAnalysisSaving(true);
    const aptId = getAppointmentId(analysisSession);
    const fingers = { ...analysisData.fingers };
    FINGER_TYPES.forEach((ft) => {
      const entry = fingers[ft] || {};
      if (
        entry.count !== null &&
        entry.count !== undefined &&
        entry.count !== ""
      ) {
        const n = Math.min(99, Math.max(0, parseInt(entry.count, 10) || 0));
        fingers[ft] = { ...entry, count: n };
      }
    });
    try {
      await saveSbiProFingerAnalysis(aptId, fingers, () => {
        setShowSaveConfirm(false);
        setShowAnalysisModal(false);
        setAnalysisSession(null);
        refresh();
      });
    } finally {
      setAnalysisSaving(false);
    }
  };

  const handleUploadReportClick = (session) => {
    reportFileInputRef.current?.setAttribute?.(
      "data-apt-id",
      getAppointmentId(session),
    );
    reportFileInputRef.current?.click?.();
  };

  const handleReportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    const aptId = reportFileInputRef.current?.getAttribute?.("data-apt-id");
    if (!aptId) return;
    e.target.value = "";
    setUploadingReportForApt(aptId);
    uploadSbiProReport(aptId, file, (updatedSession) => {
      setUploadingReportForApt(null);
      reportFileInputRef.current?.removeAttribute?.("data-apt-id");
      refresh();
      if (
        selectedSession &&
        getAppointmentId(selectedSession) === aptId &&
        updatedSession
      ) {
        setSelectedSession((prev) =>
          prev ? { ...prev, ...updatedSession } : prev,
        );
      }
    });
  };

  const handleDeleteImageClick = (fingerType) => {
    setDeleteImageConfirm({ show: true, fingerType });
  };

  const handleDeleteImage = async (fingerType) => {
    if (!selectedSession) return;
    const aptId = getAppointmentId(selectedSession);
    if (!aptId) return;
    setDeletingImage(fingerType);
    setDeleteImageConfirm({ show: false, fingerType: null });
    try {
      const updatedSession = await deleteSbiProFingerImage(aptId, fingerType);
      if (updatedSession) {
        setSelectedSession((prev) =>
          prev
            ? {
                ...prev,
                images: { ...prev.images, [fingerType]: null },
                uploadedCount: (prev.uploadedCount || 0) - 1,
              }
            : prev,
        );
        refresh();
      }
    } catch {
      // Error handled by action/alert
    } finally {
      setDeletingImage(null);
    }
  };

  const handleDeleteAllImagesClick = () => setDeleteAllConfirm(true);

  const handleDeleteAllImages = async () => {
    if (!selectedSession) return;
    const aptId = getAppointmentId(selectedSession);
    if (!aptId) return;
    setDeleteAllConfirm(false);
    setDeletingAllImages(true);
    try {
      const updatedSession = await deleteSbiProAllFingerImages(aptId, () => {});
      if (updatedSession) {
        setSelectedSession((prev) =>
          prev ? { ...prev, images: {}, uploadedCount: 0 } : prev,
        );
        refresh();
      }
    } catch {
      // Error handled by action/alert
    } finally {
      setDeletingAllImages(false);
    }
  };

  const handleMarkCompleteClick = (session) => {
    setMarkDoneSession(session);
    setShowMarkDoneConfirm(true);
  };

  const handleConfirmMarkDone = () => {
    if (!markDoneSession) return;
    const aptId = getAppointmentId(markDoneSession);
    completeSbiProAnalysis(aptId, () => {
      setShowMarkDoneConfirm(false);
      setMarkDoneSession(null);
      refresh();
    });
  };

  const handleReplaceReportClick = (session) => {
    setReplaceReportForApt(getAppointmentId(session));
    replaceReportFileInputRef.current?.click?.();
  };

  const handleReplaceReportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    const aptId = replaceReportForApt;
    if (!aptId) return;
    e.target.value = "";
    setReplaceReportForApt(null);
    setUploadingReportForApt(aptId);
    replaceSbiProReport(aptId, file, (updatedSession) => {
      setUploadingReportForApt(null);
      refresh();
      if (
        selectedSession &&
        getAppointmentId(selectedSession) === aptId &&
        updatedSession
      ) {
        setSelectedSession((prev) =>
          prev ? { ...prev, ...updatedSession } : prev,
        );
      }
    });
  };

  const getAppointmentId = (s) => {
    const apt = s.appointmentId;
    return typeof apt === "object" ? apt?._id : apt;
  };

  const columns = [
    {
      name: "Appointment",
      selector: (row) => getBookedSlotDisplay(row),
      width: "240px",
      wrap: true,
    },
    {
      name: "User",
      selector: (row) =>
        row.userId
          ? `${row.userId.name || "-"} (${row.userId.memberId || "-"})`
          : "-",
      width: "250px",
      wrap: true,
    },
    {
      name: "Trainer",
      selector: (row) =>
        row.trainerId
          ? `${row.trainerId.name || "-"} (${row.trainerId.memberId || "-"})`
          : "-",
      width: "250px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <Badge bg={STATUS_BADGES[row.status] || "secondary"}>
          {row.status}
        </Badge>
      ),
      width: "150px",
    },
    {
      name: "Progress",
      selector: (row) => `${row.uploadedCount || 0} / 10`,
      width: "150px",
    },
    {
      name: "Created",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
    {
      name: "Actions",
      width: "350px",
      cell: (row) => (
        <div className="d-flex flex-wrap gap-1 align-items-center">
          <Button
            size="sm"
            variant="outline-primary"
            disabled={(row.uploadedCount || 0) === 0}
            onClick={() => {
              setSelectedSession(row);
              setShowImagesModal(true);
            }}
            title={
              (row.uploadedCount || 0) === 0
                ? "Trainer must upload finger images first"
                : "View finger images"
            }
          >
            View Images
          </Button>
          <Button
            size="sm"
            variant="outline-info"
            onClick={() => handleOpenAnalysis(row)}
            title="Enter finger analysis"
          >
            Analysis
          </Button>
          <Dropdown>
            <Dropdown.Toggle size="sm" variant="outline-secondary">
              ⋮ Actions
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item
                disabled={
                  row.status !== "ANALYSIS_PENDING" || !!uploadingReportForApt
                }
                onClick={() =>
                  !uploadingReportForApt && handleUploadReportClick(row)
                }
              >
                {uploadingReportForApt === getAppointmentId(row) ? (
                  <Spinner animation="border" size="sm" className="me-1" />
                ) : null}
                Upload Report
              </Dropdown.Item>
              <Dropdown.Item
                disabled={row.status !== "ANALYSIS_PENDING" || completing}
                onClick={() => !completing && handleMarkCompleteClick(row)}
              >
                Mark Done (no PDF)
              </Dropdown.Item>
              {row.status === "CLOSED" && row.reportUrl && (
                <Dropdown.Item
                  disabled={!!uploadingReportForApt}
                  onClick={() =>
                    !uploadingReportForApt && handleReplaceReportClick(row)
                  }
                >
                  {uploadingReportForApt === getAppointmentId(row) ? (
                    <Spinner animation="border" size="sm" className="me-1" />
                  ) : null}
                  Replace Report
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="SBI PRO Sessions"
        crumbs={[{ name: "Dashboard" }, { name: "SBI PRO Sessions" }]}
      />

      <>
        <Row className="g-3 mb-3">
          {statusCards.map((item) => {
            const Icon = item.icon;
            const isSelected = (params.status || "") === item.key;
            return (
              <Col xs={6} md={3} key={item.label}>
                <Card
                  className={`admin-stat-card users-summary-card ${item.className} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setParams((p) => ({
                      ...p,
                      status: item.key,
                      page: 1,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setParams((p) => ({
                        ...p,
                        status: item.key,
                        page: 1,
                      }));
                    }
                  }}
                >
                  <Card.Body className="admin-stat-card__body">
                    <div className="admin-stat-card__icon">
                      <Icon size={18} />
                    </div>
                    <div className="admin-stat-card__meta">
                      <div className="admin-stat-card__label">{item.label}</div>
                      <div className="admin-stat-card__value">
                        {cardValueByKey[item.key]}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

        <div className="mb-3 users-filter-wrap">
          <div className="users-filters-panel">
            <div className="users-filters-panel__header">
              <button
                type="button"
                className="users-filters-panel__toggle"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
              >
                <FiFilter size={16} />
                <span>All Filters</span>
                {isFiltersOpen ? (
                  <FiChevronUp size={18} />
                ) : (
                  <FiChevronDown size={18} />
                )}
              </button>
            </div>
            {isFiltersOpen && (
              <div className="users-filters-panel__body">
                <Row className="g-3">
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value || "all"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Trainer Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={trainerIdFilter}
                        onChange={handleTrainerMemberIdChange}
                        onPaste={handleTrainerMemberIdPaste}
                        onKeyDown={handleTrainerMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>User Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={userMemberIdFilter}
                        onChange={handleUserMemberIdChange}
                        onPaste={handleUserMemberIdPaste}
                        onKeyDown={handleUserMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Date From</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label>Date To</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex gap-2 mt-3 flex-wrap">
                  <Button variant="primary" onClick={applyFilters}>
                    <FiFilter size={15} className="me-1" />
                    Apply
                  </Button>
                  <Button variant="secondary" onClick={resetFilters}>
                    <FiRotateCcw size={15} className="me-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-table-shell">
          <CustomDataTable
            columns={columns}
            data={sessions || []}
            count={pagination?.total ?? 0}
            params={params}
            setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
            pagination
            responsive
            striped
            paginationServer
            progressPending={loading}
            noDataComponent={
              <AdminNoDataState title="No SBI PRO sessions found" />
            }
          />
        </div>
      </>

      <Modal
        show={showImagesModal}
        onHide={() => {
          setShowImagesModal(false);
          setSelectedSession(null);
          setHoveredImage(null);
          setZoomModal(null);
        }}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Finger Images – {selectedSession?.userId?.name || "User"} (
            {selectedSession?.userId?.memberId || "-"})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSession?.images && (
            <>
              <div className="d-flex justify-content-end mb-3 gap-2">
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={downloadAllImages}
                >
                  Download All Images
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  disabled={!selectedSession?.reportUrl || deletingAllImages}
                  onClick={handleDeleteAllImagesClick}
                  title={
                    selectedSession?.reportUrl
                      ? "Permanently delete all 10 finger images from storage"
                      : "Upload report first to enable image deletion"
                  }
                >
                  {deletingAllImages ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "Delete All Images"
                  )}
                </Button>
              </div>
              <Row>
                {FINGER_TYPES.map((fingerType) => {
                  const url = selectedSession.images[fingerType];
                  const label = FINGER_LABELS[fingerType] || fingerType;
                  const isHovered = hoveredImage === fingerType;
                  return (
                    <Col
                      key={fingerType}
                      xs={12}
                      sm={6}
                      md={4}
                      lg={3}
                      className="mb-3"
                    >
                      <div
                        className="border rounded p-2 text-center position-relative"
                        style={{ minHeight: "140px" }}
                      >
                        <div className="small fw-semibold mb-1 text-muted">
                          {label}
                        </div>
                        {url ? (
                          <>
                            <div
                              className="position-relative d-inline-block"
                              onMouseEnter={() => setHoveredImage(fingerType)}
                              onMouseLeave={() => setHoveredImage(null)}
                              style={{ cursor: "zoom-in" }}
                              onClick={async () => {
                                setZoomModal({
                                  url,
                                  label,
                                  appointmentId:
                                    getAppointmentId(selectedSession),
                                  fingerType,
                                });
                                setZoomLevel(1);
                                setRotateDeg(0);
                                setSelection(null);
                                setPan({ x: 0, y: 0 });
                                const aptId = getAppointmentId(selectedSession);
                                let displaySrc = url;
                                if (aptId) {
                                  setZoomImageLoading(true);
                                  try {
                                    const res = await api.get(
                                      "/api/admin/sbi-pro-sessions/image",
                                      {
                                        params: {
                                          appointmentId: aptId,
                                          fingerType,
                                          download: "false",
                                        },
                                        responseType: "blob",
                                      },
                                    );
                                    displaySrc = URL.createObjectURL(res.data);
                                  } catch {
                                    displaySrc = url;
                                  }
                                  setZoomImageLoading(false);
                                }
                                setZoomImageSrc(displaySrc);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                              }}
                            >
                              <img
                                src={url}
                                alt={label}
                                className="img-fluid rounded"
                                style={{
                                  maxHeight: "120px",
                                  objectFit: "contain",
                                  transition: "transform 0.2s",
                                  transform: isHovered
                                    ? "scale(1.5)"
                                    : "scale(1)",
                                  zIndex: isHovered ? 10 : 1,
                                }}
                              />
                              {isHovered && (
                                <div
                                  className="position-fixed rounded shadow-lg border bg-white p-2"
                                  style={{
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 1050,
                                    maxWidth: "90vw",
                                    maxHeight: "85vh",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <img
                                    src={url}
                                    alt={label}
                                    className="img-fluid"
                                    style={{
                                      maxHeight: "70vh",
                                      objectFit: "contain",
                                    }}
                                  />
                                  <div className="small text-muted mt-1">
                                    Click for full zoom
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="d-flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                className="flex-grow-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const aptId =
                                    getAppointmentId(selectedSession);
                                  const fn = `${selectedSession.userId?.memberId || "user"}_${label.replace(/\s+/g, "_")}`;
                                  if (aptId) {
                                    downloadViaProxy(aptId, fingerType, fn);
                                  } else {
                                    downloadImage(url, fn);
                                  }
                                }}
                              >
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                disabled={
                                  deletingImage === fingerType ||
                                  !selectedSession?.reportUrl
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImageClick(fingerType);
                                }}
                                title={
                                  selectedSession?.reportUrl
                                    ? "Permanently delete from storage"
                                    : "Upload report first to enable image deletion"
                                }
                              >
                                {deletingImage === fingerType ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  "Delete"
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-muted small py-3">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowImagesModal(false);
              setSelectedSession(null);
              setHoveredImage(null);
              setZoomModal(null);
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!zoomModal}
        onHide={() => {
          if (zoomImageSrc && zoomImageSrc.startsWith("blob:"))
            URL.revokeObjectURL(zoomImageSrc);
          setZoomImageSrc(null);
          setZoomImageLoading(false);
          setZoomModal(null);
          setZoomLevel(1);
          setRotateDeg(0);
          setSelection(null);
          setPan({ x: 0, y: 0 });
        }}
        centered
        size="xl"
        className="sbi-pro-zoom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {zoomModal?.label} – Zoom {Math.round(zoomLevel * 100)}%
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="text-center overflow-auto"
          style={{ maxHeight: "80vh" }}
        >
          {zoomModal &&
            (zoomImageLoading ? (
              <div className="py-5">
                <Spinner animation="border" />
                <div className="mt-2 small text-muted">Loading image...</div>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center gap-2">
                <div
                  ref={zoomContainerRef}
                  className="position-relative d-inline-block border rounded overflow-hidden"
                  style={{
                    maxWidth: "100%",
                    cursor: selection ? "default" : "crosshair",
                  }}
                  onMouseDown={(e) => {
                    if (rotateDeg !== 0) return;
                    setIsSelecting(true);
                    setDragStart({
                      x: e.clientX - e.target.getBoundingClientRect().left,
                      y: e.clientY - e.target.getBoundingClientRect().top,
                    });
                    setSelection(null);
                  }}
                  onMouseMove={(e) => {
                    if (!isSelecting || !dragStart) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const left = Math.min(dragStart.x, x);
                    const top = Math.min(dragStart.y, y);
                    const width = Math.abs(x - dragStart.x);
                    const height = Math.abs(y - dragStart.y);
                    if (width > 5 && height > 5) {
                      setSelection({ left, top, width, height });
                    }
                  }}
                  onMouseUp={() => {
                    setIsSelecting(false);
                    setDragStart(null);
                  }}
                  onMouseLeave={() => {
                    if (isSelecting) setIsSelecting(false);
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotateDeg}deg) translate(${pan.x}px, ${pan.y}px)`,
                      transformOrigin: "center center",
                      minWidth: "200px",
                    }}
                    onWheel={(e) => {
                      e.preventDefault();
                      setZoomLevel((z) =>
                        Math.max(
                          0.5,
                          Math.min(4, z + (e.deltaY > 0 ? -0.25 : 0.25)),
                        ),
                      );
                    }}
                  >
                    <img
                      ref={zoomImgRef}
                      src={zoomImageSrc || zoomModal?.url}
                      alt={zoomModal.label}
                      className="img-fluid"
                      style={{ maxWidth: "100%", pointerEvents: "none" }}
                      draggable={false}
                    />
                  </div>
                  {selection && (
                    <div
                      className="position-absolute border border-primary border-2 bg-primary bg-opacity-10"
                      style={{
                        left: selection.left,
                        top: selection.top,
                        width: selection.width,
                        height: selection.height,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
                  >
                    Zoom Out
                  </Button>
                  <span className="small text-muted">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                  >
                    Zoom In
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setRotateDeg((d) => (d - 90 + 360) % 360)}
                    title="Rotate Left"
                  >
                    ↶ Rotate L
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setRotateDeg((d) => (d + 90) % 360)}
                    title="Rotate Right"
                  >
                    ↷ Rotate R
                  </Button>
                  {selection && rotateDeg === 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (!zoomImgRef.current || !zoomContainerRef.current)
                          return;
                        const img = zoomImgRef.current;
                        const imgRect = img.getBoundingClientRect();
                        const containerRect =
                          zoomContainerRef.current.getBoundingClientRect();
                        const imgLeft = imgRect.left - containerRect.left;
                        const imgTop = imgRect.top - containerRect.top;
                        const selImgX = Math.max(0, selection.left - imgLeft);
                        const selImgY = Math.max(0, selection.top - imgTop);
                        const selImgW = Math.min(
                          selection.width,
                          imgRect.width - selImgX,
                        );
                        const selImgH = Math.min(
                          selection.height,
                          imgRect.height - selImgY,
                        );
                        if (selImgW < 1 || selImgH < 1) return;
                        const scaleX = img.naturalWidth / imgRect.width;
                        const scaleY = img.naturalHeight / imgRect.height;
                        const sx = selImgX * scaleX;
                        const sy = selImgY * scaleY;
                        const sw = selImgW * scaleX;
                        const sh = selImgH * scaleY;
                        const canvas = document.createElement("canvas");
                        const maxDim = 800;
                        const ratio = Math.min(maxDim / sw, maxDim / sh, 4);
                        canvas.width = Math.round(
                          Math.min(sw * ratio, img.naturalWidth),
                        );
                        canvas.height = Math.round(
                          Math.min(sh * ratio, img.naturalHeight),
                        );
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(
                          img,
                          sx,
                          sy,
                          sw,
                          sh,
                          0,
                          0,
                          canvas.width,
                          canvas.height,
                        );
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
                        const a = document.createElement("a");
                        a.href = dataUrl;
                        a.download = `${zoomModal.label.replace(/\s+/g, "_")}_zoomed.jpg`;
                        a.click();
                      }}
                    >
                      Download Selected Area
                    </Button>
                  )}
                  {selection && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setSelection(null)}
                    >
                      Clear Selection
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      if (!zoomModal) return;
                      const fn = `${zoomModal.label.replace(/\s+/g, "_")}_full`;
                      if (zoomModal.appointmentId) {
                        downloadViaProxy(
                          zoomModal.appointmentId,
                          zoomModal.fingerType,
                          fn,
                        );
                      } else {
                        downloadImage(zoomModal.url, fn);
                      }
                    }}
                  >
                    Download Full
                  </Button>
                </div>
                <div className="small text-muted">
                  {rotateDeg === 0
                    ? "Drag on image to select area, then click Download Selected Area"
                    : "Reset rotation to use selection"}
                </div>
              </div>
            ))}
        </Modal.Body>
      </Modal>

      <Modal
        show={showAnalysisModal}
        onHide={() => {
          setShowAnalysisModal(false);
          setAnalysisSession(null);
          setAnalysisEditing(false);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Finger Analysis – {analysisSession?.userId?.name || "User"} (
            {analysisSession?.userId?.memberId || "-"})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {analysisLoading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" />
              <div className="mt-2 small text-muted">Loading analysis...</div>
            </div>
          ) : (
            <>
              <p className="text-muted small mb-3">
                Select code and enter count (0-99) for each finger. Steady: L,R
                | Arch: X1,X2 | Dominant: W1,W2,W4–W9 | Compliant: W3
              </p>
              {!analysisEditing && (
                <div className="mb-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setAnalysisEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
              <div className="mb-3">
                <h6 className="small fw-semibold text-muted mb-2">Left Hand</h6>
                <Row>
                  {[
                    "LEFT_THUMB",
                    "LEFT_INDEX",
                    "LEFT_MIDDLE",
                    "LEFT_RING",
                    "LEFT_LITTLE",
                  ].map((fingerType) => {
                    const entry = analysisData.fingers?.[fingerType] || {};
                    const label = FINGER_LABELS[fingerType] || fingerType;
                    return (
                      <Col key={fingerType} xs={12} sm={6} className="mb-3">
                        <div className="border rounded p-2">
                          <div className="small fw-semibold mb-2">{label}</div>
                          <div className="d-flex gap-2 align-items-center">
                            <Form.Select
                              size="sm"
                              value={entry.code ?? ""}
                              onChange={(e) =>
                                handleAnalysisChange(
                                  fingerType,
                                  "code",
                                  e.target.value || null,
                                )
                              }
                              disabled={!analysisEditing}
                            >
                              <option value="">Select code</option>
                              {SBI_PRO_CODES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control
                              type="number"
                              size="sm"
                              placeholder="Count"
                              min={0}
                              max={99}
                              value={entry.count ?? ""}
                              onChange={(e) => {
                                const v = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 2);
                                handleAnalysisChange(
                                  fingerType,
                                  "count",
                                  v === "" ? null : v,
                                );
                              }}
                              style={{ width: "80px" }}
                              disabled={!analysisEditing}
                            />
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
              <div>
                <h6 className="small fw-semibold text-muted mb-2">
                  Right Hand
                </h6>
                <Row>
                  {[
                    "RIGHT_THUMB",
                    "RIGHT_INDEX",
                    "RIGHT_MIDDLE",
                    "RIGHT_RING",
                    "RIGHT_LITTLE",
                  ].map((fingerType) => {
                    const entry = analysisData.fingers?.[fingerType] || {};
                    const label = FINGER_LABELS[fingerType] || fingerType;
                    return (
                      <Col key={fingerType} xs={12} sm={6} className="mb-3">
                        <div className="border rounded p-2">
                          <div className="small fw-semibold mb-2">{label}</div>
                          <div className="d-flex gap-2 align-items-center">
                            <Form.Select
                              size="sm"
                              value={entry.code ?? ""}
                              onChange={(e) =>
                                handleAnalysisChange(
                                  fingerType,
                                  "code",
                                  e.target.value || null,
                                )
                              }
                              disabled={!analysisEditing}
                            >
                              <option value="">Select code</option>
                              {SBI_PRO_CODES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control
                              type="number"
                              size="sm"
                              placeholder="Count"
                              min={0}
                              max={99}
                              value={entry.count ?? ""}
                              onChange={(e) => {
                                const v = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 2);
                                handleAnalysisChange(
                                  fingerType,
                                  "count",
                                  v === "" ? null : v,
                                );
                              }}
                              style={{ width: "80px" }}
                              disabled={!analysisEditing}
                            />
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAnalysisModal(false);
              setAnalysisSession(null);
              setShowSaveConfirm(false);
              setAnalysisEditing(false);
            }}
          >
            Cancel
          </Button>
          {analysisSession?.status === "ANALYSIS_PENDING" && (
            <Button
              variant="success"
              disabled={!!uploadingReportForApt}
              onClick={() => {
                handleUploadReportClick(analysisSession);
              }}
            >
              {uploadingReportForApt === getAppointmentId(analysisSession) ? (
                <Spinner animation="border" size="sm" className="me-1" />
              ) : null}
              Upload Report
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSaveAnalysis}
            disabled={!analysisEditing || analysisLoading || analysisSaving}
          >
            Save Analysis
          </Button>
        </Modal.Footer>
      </Modal>

      <input
        ref={reportFileInputRef}
        type="file"
        accept="application/pdf"
        className="d-none"
        onChange={handleReportFileChange}
      />
      <input
        ref={replaceReportFileInputRef}
        type="file"
        accept="application/pdf"
        className="d-none"
        onChange={handleReplaceReportFileChange}
      />

      <Modal
        show={showMarkDoneConfirm}
        onHide={() => {
          setShowMarkDoneConfirm(false);
          setMarkDoneSession(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Mark Done (No PDF)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>Use only when:</strong> PDF report is not available (e.g.
            report given offline, or analysis done manually).
          </p>
          <p className="text-muted small mb-0">
            This will close the session without uploading a PDF. User will not
            see any report. Are you sure?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowMarkDoneConfirm(false);
              setMarkDoneSession(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmMarkDone}
            disabled={completing}
          >
            {completing ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Yes, Mark Done
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSaveConfirm}
        onHide={() => setShowSaveConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Verify & Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Finger analysis is not directly editable after save. Please verify
            all codes and counts before confirming.
          </p>
          <p className="text-muted small mb-0">
            Are you sure you want to save this analysis? Incorrect data may
            require reopening the session.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSaveAnalysis}
            disabled={analysisSaving}
          >
            {analysisSaving ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            I have verified – Confirm & Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={deleteImageConfirm.show}
        onHide={() => setDeleteImageConfirm({ show: false, fingerType: null })}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Finger Image</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Permanently delete{" "}
            {FINGER_LABELS[deleteImageConfirm.fingerType] ||
              deleteImageConfirm.fingerType}{" "}
            image? This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              setDeleteImageConfirm({ show: false, fingerType: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deletingImage === deleteImageConfirm.fingerType}
            onClick={() =>
              deleteImageConfirm.fingerType &&
              handleDeleteImage(deleteImageConfirm.fingerType)
            }
          >
            {deletingImage === deleteImageConfirm.fingerType ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={deleteAllConfirm}
        onHide={() => setDeleteAllConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete All Finger Images</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Permanently delete all 10 finger images? This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setDeleteAllConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deletingAllImages}
            onClick={handleDeleteAllImages}
          >
            {deletingAllImages ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Delete All
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminSbiProSessionsList.propTypes = {
  sessions: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  completing: PropTypes.bool,
  getAdminSbiProSessions: PropTypes.func.isRequired,
  completeSbiProAnalysis: PropTypes.func.isRequired,
  getSbiProFingerAnalysis: PropTypes.func.isRequired,
  saveSbiProFingerAnalysis: PropTypes.func.isRequired,
  deleteSbiProFingerImage: PropTypes.func.isRequired,
  deleteSbiProAllFingerImages: PropTypes.func.isRequired,
  uploadSbiProReport: PropTypes.func.isRequired,
  replaceSbiProReport: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  sessions: state.adminSbiPro?.sessions ?? [],
  pagination: state.adminSbiPro?.pagination ?? {},
  loading: state.adminSbiPro?.loading ?? false,
  completing: state.adminSbiPro?.completing ?? false,
});

export default connect(mapStateToProps, {
  getAdminSbiProSessions,
  completeSbiProAnalysis,
  getSbiProFingerAnalysis,
  saveSbiProFingerAnalysis,
  deleteSbiProFingerImage,
  deleteSbiProAllFingerImages,
  uploadSbiProReport,
  replaceSbiProReport,
})(AdminSbiProSessionsList);
