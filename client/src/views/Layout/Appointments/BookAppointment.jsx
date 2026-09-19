import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  Spinner,
  Placeholder,
} from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { TbFilter } from "react-icons/tb";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getAppointmentIcon } from "@src/constants/appointmentIcons";
import { initialSortingParams } from "@src/constants";

import { getDesignationEligibility } from "@src/actions/designationActions";
import {
  getAppointmentHolders,
  bookAppointment,
  getSlotsAvailability,
  getMyAppointments,
} from "@src/actions/appointmentActions";
import { getMyCounsellingSessions } from "@src/actions/counsellingActions";

const HolderListSkeleton = () => (
  <Card className="mb-3">
    <Card.Header>
      <Placeholder animation="glow">
        <Placeholder xs={4} />
      </Placeholder>
    </Card.Header>
    <Card.Body>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="d-flex justify-content-between align-items-center py-2 border-bottom"
        >
          <Placeholder animation="glow" style={{ width: "60%" }}>
            <Placeholder xs={6} />
          </Placeholder>
          <Placeholder animation="glow">
            <Placeholder xs={3} />
          </Placeholder>
        </div>
      ))}
    </Card.Body>
  </Card>
);

const DESIGNATION_SBI_PRO = 1;

const BookAppointment = ({
  currentUserId,
  designations,
  hasCompleteAddress,
  holders,
  holdersPagination,
  loadingHolders,
  booking,
  myAppointments,
  counsellingSessions,
  isSbiProLocked,
  freeSessionInfo,
  appliedParams,
  getDesignationEligibility,
  getAppointmentHolders,
  bookAppointment,
  getSlotsAvailability,
  getMyAppointments,
  getMyCounsellingSessions,
}) => {
  const navigate = useNavigate();
  const [designationCode, setDesignationCode] = useState(null);
  const [holderId, setHolderId] = useState("");
  const [selectedHolderDetails, setSelectedHolderDetails] = useState(null);
  const [dateKey, setDateKey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotsWithAvailability, setSlotsWithAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [params, setParams] = useState(initialSortingParams);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    getDesignationEligibility();
  }, [getDesignationEligibility]);

  useEffect(() => {
    getMyAppointments({ page: 1, limit: 100 });
  }, [getMyAppointments]);

  useEffect(() => {
    // Prevent extra API call: only needed when current booking is for Counsellor.
    if (Number(designationCode) === 2) {
      getMyCounsellingSessions({ page: 1, limit: 100 });
    }
  }, [designationCode, getMyCounsellingSessions]);

  useEffect(() => {
    if (designationCode) {
      const merged = {
        page: params.page || 1,
        limit: params.limit || 20,
        online: true,
        ...(appliedParams || {}),
      };
      merged.online = true;
      getAppointmentHolders(designationCode, merged);
    }
  }, [
    designationCode,
    appliedParams,
    params.page,
    params.limit,
    getAppointmentHolders,
  ]);

  useEffect(() => {
    if (holderId && designationCode && dateKey) {
      setLoadingSlots(true);
      setSelectedSlotId("");
      Promise.resolve(
        getSlotsAvailability(holderId, designationCode, dateKey),
      ).then((slots) => {
        setSlotsWithAvailability(Array.isArray(slots) ? slots : []);
        setLoadingSlots(false);
      });
    } else {
      setSlotsWithAvailability([]);
      setSelectedSlotId("");
    }
  }, [holderId, designationCode, dateKey, getSlotsAvailability]);

  // Q3.4 A: Hide designations until required designation (Trainer) flow complete
  const activeDesignations = (designations || []).filter(
    (d) => d.isActive !== false && d.showForBooking !== false,
  );

  const isDesignationDisabled = (d) =>
    d.designationCode === DESIGNATION_SBI_PRO && isSbiProLocked;

  // Only one designation selectable at a time: Trainer first, then Counsellor. Dropdown redundant.
  const selectableDesignations = activeDesignations.filter(
    (d) => !isDesignationDisabled(d),
  );
  const autoDesignation = selectableDesignations[0] ?? null;
  const designationDisplayName = autoDesignation?.name || "Designation Holder";
  const isFingerprintTrainer =
    String(autoDesignation?.name || "")
      .trim()
      .toUpperCase() === "FINGERPRINT TRAINER";
  const hasAnyFingerprintTrainerBooking = (myAppointments || []).some((a) => {
    const designationName = String(a?.designationName || "")
      .trim()
      .toUpperCase();
    return designationName === "FINGERPRINT TRAINER";
  });
  const latestFingerprintTrainerAppointment = (myAppointments || []).find(
    (a) => {
      const designationName = String(a?.designationName || "")
        .trim()
        .toUpperCase();
      return designationName === "FINGERPRINT TRAINER";
    },
  );
  const selectedFingerprintTrainer =
    latestFingerprintTrainerAppointment?.assignedTo || null;
  const isFingerprintTrainerBlocked =
    isFingerprintTrainer && hasAnyFingerprintTrainerBooking;
  const isCounsellor =
    String(autoDesignation?.name || "")
      .trim()
      .toUpperCase() === "COUNSELLOR" || Number(designationCode) === 2;
  const activeCounsellingSession = (counsellingSessions || []).find(
    (s) => String(s?.status || "").toUpperCase() !== "CLOSED",
  );
  const activeCounsellingCounsellor = activeCounsellingSession?.counsellorId || null;
  const isCounsellorBlockedByActiveSession =
    isCounsellor && !!activeCounsellingSession;
  const pendingCounsellorAppointments = (myAppointments || []).filter(
    (a) => Number(a?.designationCode) === 2 && a?.status === "PENDING",
  );
  const isCounsellorBlockedByPending =
    isCounsellor && pendingCounsellorAppointments.length > 0;
  const samplePendingCounsellor = pendingCounsellorAppointments[0]?.assignedTo || null;

  // Auto-set designation - user has no choice
  useEffect(() => {
    if (
      autoDesignation &&
      designationCode !== autoDesignation.designationCode
    ) {
      setDesignationCode(autoDesignation.designationCode);
      setHolderId("");
      setSelectedHolderDetails(null);
      setDateKey("");
      setSelectedSlotId("");
      setCurrentStep(1);
    } else if (!autoDesignation && designationCode) {
      setDesignationCode(null);
      setHolderId("");
      setSelectedHolderDetails(null);
      setDateKey("");
      setSelectedSlotId("");
      setCurrentStep(1);
    }
  }, [autoDesignation?.designationCode, designationCode]);

  // isSbiProLocked case: autoDesignation already excludes SBI PRO, so we switch to Counsellor

  const handleBook = async (e) => {
    e.preventDefault();
    if (!holderId || !designationCode || !dateKey || !selectedSlotId) return;

    // Q2.1 A: Always SELF - 1 ID = 1 user
    const result = await bookAppointment(
      holderId,
      designationCode,
      dateKey,
      selectedSlotId,
      {
        type: "SELF",
      },
    );

    // Always refresh pending list so UI reflects latest server state immediately.
    await getMyAppointments({ page: 1, limit: 100 });

    if (!result?.success) return;

    setHolderId("");
    setSelectedHolderDetails(null);
    setDateKey("");
    setSelectedSlotId("");
    setCurrentStep(1);
  };

  const today = new Date().toISOString().slice(0, 10);
  const isSelf = (h) =>
    currentUserId && h._id && String(h._id) === String(currentUserId);
  const hasAchievedDesignation1 = (designations || []).some(
    (d) =>
      Number(d?.designationCode) === 1 &&
      d?.alreadyApplied === true &&
      d?.currentStatus === "APPROVED",
  );
  const canBookSelfAsFingerprintTrainer =
    Number(designationCode) === 1 && hasAchievedDesignation1;
  const hasAnyPendingCounsellorAppointment = () =>
    Number(designationCode) === 2 && pendingCounsellorAppointments.length > 0;
  const canSelectHolder = (h) =>
    h.online &&
    (!isSelf(h) || canBookSelfAsFingerprintTrainer) &&
    !hasAnyPendingCounsellorAppointment();
  const availableHolders = (holders || []).filter((h) => h.online);
  const selectedSlot = (slotsWithAvailability || []).find(
    (slot) => String(slot?._id) === String(selectedSlotId),
  );

  const columns = [
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
            className="text-muted"
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
    { name: "Member ID", selector: (h) => h.memberId || "-", width: "140px" },
    {
      name: "Address",
      cell: (h) => {
        const maxW = "330px";
        const country = h.country || "-";
        const state = h.state || "-";
        const district = h.district || "-";
        const nativeVillage = h.nativeVillage || "-";
        const current = h.currentAddress || h.address || "-";
        return (
          <div>
            <span className="text-truncate d-block" style={{ maxWidth: maxW }} title={country}>
              {country}
            </span>
            <span className="text-truncate d-block text-muted" style={{ maxWidth: maxW }} title={state}>
              {state}
            </span>
            <span className="text-truncate d-block text-muted" style={{ maxWidth: maxW }} title={district}>
              {district}
            </span>
            <span className="text-truncate d-block text-muted" style={{ maxWidth: maxW }} title={nativeVillage}>
              {nativeVillage}
            </span>
            <span className="text-truncate d-block" style={{ maxWidth: maxW }} title={current}>
              {current}
            </span>
          </div>
        );
      },
      width: "360px",
      wrap: true,
    },
    {
      name: "Rating",
      selector: (h) => (h.avgRating > 0 ? `⭐ ${h.avgRating.toFixed(1)}` : "-"),
      width: "90px",
    },
    { name: "Sessions", selector: (h) => h.totalSessions ?? 0, width: "90px" },
    {
      name: "Status",
      cell: (h) =>
        h.online ? (
          <Badge bg="success">Available</Badge>
        ) : (
          <Badge bg="secondary">Unavailable</Badge>
        ),
      width: "110px",
    },
    {
      name: "Action",
      cell: (h) => (
        <Button
          size="sm"
          variant="primary"
          className="fw-semibold px-3"
          disabled={!canSelectHolder(h) || booking}
          title={
            isSelf(h)
              ? canBookSelfAsFingerprintTrainer
                ? `Choose yourself as ${designationDisplayName}`
                : "You cannot book yourself"
              : !h.online
                ? `${designationDisplayName} is unavailable`
                : hasAnyPendingCounsellorAppointment()
                  ? "You already have a pending COUNSELLOR appointment"
                : `Choose this ${designationDisplayName}`
          }
          onClick={() => {
            setHolderId(h._id);
            setSelectedHolderDetails({
              name: h.name || "-",
              memberId: h.memberId || "-",
              phone: h.phone || "-",
              country: h.country || "-",
              state: h.state || "-",
              district: h.district || "-",
              nativeVillage: h.nativeVillage || "-",
              currentAddress: h.currentAddress || h.address || "-",
            });
            setDateKey("");
            setSelectedSlotId("");
            setCurrentStep(2);
          }}
        >
          Choose {designationDisplayName}
        </Button>
      ),
      width: "250px",
    },
  ];

  return (
    <Container className="appointments-page book-appointment-page">
      <AppBreadCrumb
        pageTitle="Book Appointment"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Book Appointment" },
        ]}
      />

      <MainCard className="book-apt-card">
        {!hasCompleteAddress && (
          <button
            type="button"
            className="alert alert-warning mb-3 text-start w-100"
            onClick={() => navigate("/user/profile#address-details")}
          >
            <strong>Complete Address Details required.</strong> Please fill your full
            Address Details (country, state, district, native village and current
            address) in your Profile before booking any appointment.
          </button>
        )}
        <div className="apt-hero apt-hero-client book-apt-hero">
          <div className="book-apt-hero-inner">
            <span
              className="apt-hero-icon book-apt-hero-icon"
              aria-label="Calendar"
            >
              {getAppointmentIcon("calendar") &&
                React.createElement(getAppointmentIcon("calendar"), {
                  size: 32,
                })}
            </span>
            <div className="apt-hero-content flex-grow-1">
              <span className="apt-hero-badge apt-badge-client book-apt-badge">
                I'm the Client
              </span>
              <h4 className="apt-hero-title book-apt-title mb-2">
                Book Appointment
              </h4>
              <p className="apt-hero-desc mb-0 text-muted">
                Book a session with a {designationDisplayName}. Choose a{" "}
                {designationDisplayName} → pick date → select time slot.
              </p>
              {freeSessionInfo?.remaining != null &&
                freeSessionInfo.remaining > 0 && (
                  <p className="apt-hero-free mb-0 mt-2 small text-success fw-medium">
                    You have <strong>{freeSessionInfo.remaining}</strong> free
                    session(s) remaining, use by{" "}
                    <strong>{freeSessionInfo.expiryDate || "—"}</strong>
                  </p>
                )}
            </div>
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 book-apt-filter-btn"
              onClick={() => navigate("/user/appointments/book/filters")}
            >
              <TbFilter size={18} />
              Filters
            </Button>
          </div>
        </div>

        <Form onSubmit={handleBook}>
          {!autoDesignation ? (
            <p className="text-muted mb-3">
              No sessions available for you to book right now. (Complete Trainer
              first, then Counsellor.)
            </p>
          ) : isFingerprintTrainerBlocked ? (
            <Card className="mb-3 border-warning">
              <Card.Body>
                <p className="mb-2 fw-semibold text-warning">
                  You have already booked your one-time FINGERPRINT TRAINER
                  appointment.
                </p>
                <p className="mb-2">
                  <strong>Name:</strong>{" "}
                  {selectedFingerprintTrainer?.name || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Member ID:</strong>{" "}
                  {selectedFingerprintTrainer?.memberId || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Phone:</strong>{" "}
                  {selectedFingerprintTrainer?.phone || "-"}
                </p>
                <p className="mb-0 text-muted">
                  <strong>Country:</strong>{" "}
                  {selectedFingerprintTrainer?.country || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>State:</strong>{" "}
                  {selectedFingerprintTrainer?.state || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>District:</strong>{" "}
                  {selectedFingerprintTrainer?.district || "-"}
                  <br />
                  <strong>Native Village:</strong>{" "}
                  {selectedFingerprintTrainer?.nativeVillage || "-"}
                  <br />
                  <strong>Current Address:</strong>{" "}
                  {selectedFingerprintTrainer?.currentAddress ||
                    selectedFingerprintTrainer?.address ||
                    "-"}
                </p>
                <p className="mb-0 text-muted">
                  Booking for Designation 1 (FINGERPRINT TRAINER) is allowed
                  only once. Your latest booking status has been auto-updated.
                </p>
              </Card.Body>
            </Card>
          ) : isCounsellorBlockedByActiveSession ? (
            <Card className="mb-3 border-warning">
              <Card.Body>
                <p className="mb-2 fw-semibold text-warning">
                  You already have an active counselling flow.
                </p>
                <p className="mb-2">
                  <strong>Name:</strong> {activeCounsellingCounsellor?.name || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Member ID:</strong>{" "}
                  {activeCounsellingCounsellor?.memberId || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Phone:</strong> {activeCounsellingCounsellor?.phone || "-"}
                </p>
                <p className="mb-0 text-muted">
                  <strong>Country:</strong>{" "}
                  {activeCounsellingCounsellor?.country || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>State:</strong>{" "}
                  {activeCounsellingCounsellor?.state || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>District:</strong>{" "}
                  {activeCounsellingCounsellor?.district || "-"}
                  <br />
                  <strong>Native Village:</strong>{" "}
                  {activeCounsellingCounsellor?.nativeVillage || "-"}
                  <br />
                  <strong>Current Address:</strong>{" "}
                  {activeCounsellingCounsellor?.currentAddress ||
                    activeCounsellingCounsellor?.address ||
                    "-"}
                </p>
                <p className="mb-0 text-muted">
                  You cannot book the next COUNSELLOR appointment until your
                  counselling status becomes CLOSED.
                </p>
              </Card.Body>
            </Card>
          ) : isCounsellorBlockedByPending ? (
            <Card className="mb-3 border-warning">
              <Card.Body>
                <p className="mb-2 fw-semibold text-warning">
                  You already have a pending appointment with a COUNSELLOR.
                </p>
                <p className="mb-2">
                  <strong>Name:</strong> {samplePendingCounsellor?.name || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Member ID:</strong>{" "}
                  {samplePendingCounsellor?.memberId || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>Phone:</strong> {samplePendingCounsellor?.phone || "-"}
                </p>
                <p className="mb-0 text-muted">
                  <strong>Country:</strong>{" "}
                  {samplePendingCounsellor?.country || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>State:</strong>{" "}
                  {samplePendingCounsellor?.state || "-"}{" "}
                  <span className="mx-2">|</span>
                  <strong>District:</strong>{" "}
                  {samplePendingCounsellor?.district || "-"}
                  <br />
                  <strong>Native Village:</strong>{" "}
                  {samplePendingCounsellor?.nativeVillage || "-"}
                  <br />
                  <strong>Current Address:</strong>{" "}
                  {samplePendingCounsellor?.currentAddress ||
                    samplePendingCounsellor?.address ||
                    "-"}
                </p>
                <p className="mb-0 text-muted">
                  You cannot book another COUNSELLOR appointment with any
                  counsellor while your current appointment is pending.
                </p>
              </Card.Body>
            </Card>
          ) : (
            <p className="mb-3 fw-medium">
              Booking for: <Badge bg="primary">{autoDesignation.name}</Badge>
            </p>
          )}

          {designationCode &&
            !isFingerprintTrainerBlocked &&
            !isCounsellorBlockedByActiveSession &&
            !isCounsellorBlockedByPending &&
            hasCompleteAddress && (
            <div className="mb-3 d-flex flex-wrap gap-2 book-apt-stepper">
              {[1, 2, 3, 4].map((step) => {
                const stepLabel =
                  step === 1
                    ? `Choose a ${designationDisplayName}`
                    : step === 2
                      ? "Pick date"
                      : step === 3
                        ? "Select slot"
                        : "Submit";
                return (
                  <Badge
                    key={step}
                    bg={currentStep === step ? "primary" : "light"}
                    text={currentStep === step ? "light" : "dark"}
                    className="px-3 py-2 book-apt-step-chip"
                    style={{
                      cursor:
                        step < currentStep ||
                        (step === 2 && holderId) ||
                        (step === 3 && holderId && dateKey) ||
                        (step === 4 && selectedSlotId)
                          ? "pointer"
                          : "default",
                    }}
                    onClick={() => {
                      if (step < currentStep) {
                        setCurrentStep(step);
                        return;
                      }
                      if (step === 2 && holderId) {
                        setCurrentStep(2);
                        return;
                      }
                      if (step === 3 && holderId && dateKey) {
                        setCurrentStep(3);
                        return;
                      }
                      if (step === 4 && selectedSlotId) {
                        setCurrentStep(4);
                      }
                    }}
                  >
                    {step}. {stepLabel}
                  </Badge>
                );
              })}
            </div>
          )}

          {designationCode &&
            !isFingerprintTrainerBlocked &&
            !isCounsellorBlockedByActiveSession &&
            !isCounsellorBlockedByPending &&
            hasCompleteAddress && (
            <>
              {currentStep === 1 && loadingHolders ? (
                <HolderListSkeleton />
              ) : currentStep === 1 ? (
                <Card className="mb-3 apt-table-card book-apt-holders-card">
                  <Card.Header className="book-apt-card-header">
                    <span className="book-apt-step">1</span> Select a{" "}
                    {designationDisplayName}
                  </Card.Header>
                  <Card.Body>
                    {!availableHolders || availableHolders.length === 0 ? (
                      <p className="text-muted mb-0">
                        No available holders found for this designation.
                      </p>
                    ) : (
                      <CustomDataTable
                        columns={columns}
                        data={availableHolders}
                        count={holdersPagination?.totalCount ?? 0}
                        params={params}
                        setParams={(p) =>
                          setParams((prev) => ({ ...prev, ...p }))
                        }
                        pagination
                        responsive
                        striped
                        paginationServer
                        dense
                        noDataComponent="No available holders found."
                      />
                    )}
                  </Card.Body>
                </Card>
              ) : null}

              {currentStep === 1 && (
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    variant="primary"
                    disabled={!holderId}
                    onClick={() => setCurrentStep(2)}
                  >
                    Next
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <>
                  <Card className="mb-3 book-apt-summary-card">
                    <Card.Header className="fw-semibold">
                      Selected {designationDisplayName}
                    </Card.Header>
                    <Card.Body>
                      <div className="small">
                        <strong>Name:</strong>{" "}
                        {selectedHolderDetails?.name || "-"}
                      </div>
                      <div className="small">
                        <strong>Member ID:</strong>{" "}
                        {selectedHolderDetails?.memberId || "-"}
                      </div>
                      <div className="small">
                        <strong>Phone:</strong>{" "}
                        {selectedHolderDetails?.phone || "-"}
                      </div>
                    <div className="small">
                      <strong>Country:</strong>{" "}
                      {selectedHolderDetails?.country || "-"}
                    </div>
                    <div className="small">
                      <strong>State:</strong>{" "}
                      {selectedHolderDetails?.state || "-"}
                    </div>
                    <div className="small">
                      <strong>District:</strong>{" "}
                      {selectedHolderDetails?.district || "-"}
                    </div>
                    <div className="small">
                      <strong>Native Village:</strong>{" "}
                      {selectedHolderDetails?.nativeVillage || "-"}
                    </div>
                    <div className="small">
                      <strong>Current Address:</strong>{" "}
                      {selectedHolderDetails?.currentAddress ||
                        selectedHolderDetails?.address ||
                        "-"}
                    </div>
                    </Card.Body>
                  </Card>

                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Label className="fw-medium">
                        <span className="book-apt-step-inline">2</span> Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={dateKey}
                        min={today}
                        onChange={(e) => {
                          setDateKey(e.target.value);
                          setSelectedSlotId("");
                          if (e.target.value) {
                            setCurrentStep(3);
                          }
                        }}
                      />
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between mb-3 book-apt-nav-row">
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back to Trainer
                      </Button>
                    </div>
                    <Button
                      variant="primary"
                      disabled={!dateKey}
                      onClick={() => setCurrentStep(3)}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <Card className="mb-3 book-apt-summary-card">
                    <Card.Header className="fw-semibold">
                      Booking Summary
                    </Card.Header>
                    <Card.Body>
                      <div className="small">
                        <strong>Name:</strong>{" "}
                        {selectedHolderDetails?.name || "-"}
                      </div>
                      <div className="small">
                        <strong>Member ID:</strong>{" "}
                        {selectedHolderDetails?.memberId || "-"}
                      </div>
                      <div className="small">
                        <strong>Phone:</strong>{" "}
                        {selectedHolderDetails?.phone || "-"}
                      </div>
                    <div className="small">
                      <strong>Country:</strong>{" "}
                      {selectedHolderDetails?.country || "-"}
                    </div>
                    <div className="small">
                      <strong>State:</strong>{" "}
                      {selectedHolderDetails?.state || "-"}
                    </div>
                    <div className="small">
                      <strong>District:</strong>{" "}
                      {selectedHolderDetails?.district || "-"}
                    </div>
                    <div className="small">
                      <strong>Native Village:</strong>{" "}
                      {selectedHolderDetails?.nativeVillage || "-"}
                    </div>
                    <div className="small">
                      <strong>Current Address:</strong>{" "}
                      {selectedHolderDetails?.currentAddress ||
                        selectedHolderDetails?.address ||
                        "-"}
                    </div>
                      <div className="small">
                        <strong>Date:</strong> {dateKey || "-"}
                      </div>
                    </Card.Body>
                  </Card>

                  <Card className="mb-3 book-apt-holders-card">
                    <Card.Header className="book-apt-card-header">
                      <span className="book-apt-step">3</span> Time Slots
                    </Card.Header>
                    <Card.Body>
                      {loadingSlots ? (
                        <Spinner animation="border" size="sm" />
                      ) : !slotsWithAvailability?.length ? (
                        <p className="text-muted mb-0">
                          No slots configured for this designation. Contact
                          admin.
                        </p>
                      ) : (
                        <div className="d-flex flex-wrap gap-2 book-apt-slot-grid">
                          {slotsWithAvailability.map((slot) => (
                            <Button
                              key={slot._id}
                              className="book-apt-slot-btn"
                              variant={
                                selectedSlotId === slot._id
                                  ? "primary"
                                  : slot.available
                                    ? "outline-primary"
                                    : "outline-secondary"
                              }
                              disabled={!slot.available || booking}
                              onClick={() => {
                                if (!slot.available) return;
                                setSelectedSlotId(slot._id);
                                setCurrentStep(4);
                              }}
                            >
                              {slot.startTime} - {slot.endTime} ({slot.label})(
                              {slot.booked}/{slot.capacity} booked)
                            </Button>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  <div className="d-flex justify-content-between mb-3 book-apt-nav-row">
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back to Trainer
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => setCurrentStep(2)}
                      >
                        Back to Date
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <Card className="mb-3 book-apt-summary-card">
                    <Card.Header className="fw-semibold">
                      Final Booking Summary
                    </Card.Header>
                    <Card.Body>
                      <div className="small">
                        <strong>Name:</strong>{" "}
                        {selectedHolderDetails?.name || "-"}
                      </div>
                      <div className="small">
                        <strong>Member ID:</strong>{" "}
                        {selectedHolderDetails?.memberId || "-"}
                      </div>
                      <div className="small">
                        <strong>Phone:</strong>{" "}
                        {selectedHolderDetails?.phone || "-"}
                      </div>
                    <div className="small">
                      <strong>Country:</strong>{" "}
                      {selectedHolderDetails?.country || "-"}
                    </div>
                    <div className="small">
                      <strong>State:</strong>{" "}
                      {selectedHolderDetails?.state || "-"}
                    </div>
                    <div className="small">
                      <strong>District:</strong>{" "}
                      {selectedHolderDetails?.district || "-"}
                    </div>
                    <div className="small">
                      <strong>Native Village:</strong>{" "}
                      {selectedHolderDetails?.nativeVillage || "-"}
                    </div>
                    <div className="small">
                      <strong>Current Address:</strong>{" "}
                      {selectedHolderDetails?.currentAddress ||
                        selectedHolderDetails?.address ||
                        "-"}
                    </div>
                      <div className="small">
                        <strong>Date:</strong> {dateKey || "-"}
                      </div>
                      <div className="small">
                        <strong>Time Slot:</strong>{" "}
                        {selectedSlot
                          ? `${selectedSlot.startTime} - ${selectedSlot.endTime} (${selectedSlot.label})`
                          : "-"}
                      </div>
                    </Card.Body>
                  </Card>
                  <Row className="mb-3 book-apt-nav-row">
                    <Col md={12} className="d-flex justify-content-between">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          onClick={() => setCurrentStep(1)}
                        >
                          Back to Trainer
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => setCurrentStep(2)}
                        >
                          Back to Date
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => setCurrentStep(3)}
                        >
                          Back to Slot
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="book-apt-submit-btn"
                        disabled={booking || !selectedSlotId}
                      >
                        {booking ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          "Request Appointment"
                        )}
                      </Button>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
        </Form>
      </MainCard>
    </Container>
  );
};

BookAppointment.propTypes = {
  currentUserId: PropTypes.string,
  designations: PropTypes.array,
  hasCompleteAddress: PropTypes.bool,
  holders: PropTypes.array,
  holdersPagination: PropTypes.object,
  loadingHolders: PropTypes.bool,
  booking: PropTypes.bool,
  myAppointments: PropTypes.array,
  counsellingSessions: PropTypes.array,
  isSbiProLocked: PropTypes.bool,
  freeSessionInfo: PropTypes.object,
  getDesignationEligibility: PropTypes.func.isRequired,
  getAppointmentHolders: PropTypes.func.isRequired,
  bookAppointment: PropTypes.func.isRequired,
  getSlotsAvailability: PropTypes.func.isRequired,
  getMyAppointments: PropTypes.func.isRequired,
  getMyCounsellingSessions: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  currentUserId: state.auth?.user?._id || state.auth?.user?.id,
  designations: state.designation?.designations ?? [],
  hasCompleteAddress: state.designation?.hasCompleteAddress ?? false,
  holders: state.appointment?.holders ?? [],
  holdersPagination: state.appointment?.holdersPagination ?? {},
  loadingHolders: state.appointment?.loadingHolders ?? false,
  booking: state.appointment?.booking ?? false,
  myAppointments: state.appointment?.myAppointments ?? [],
  counsellingSessions: state.counselling?.sessions ?? [],
  isSbiProLocked: state.designation?.isSbiProLocked ?? false,
  freeSessionInfo: state.designation?.freeSessionInfo ?? {},
  appliedParams: state.appointment?.appliedParamsBookAppointment ?? null,
});

export default connect(mapStateToProps, {
  getDesignationEligibility,
  getAppointmentHolders,
  bookAppointment,
  getSlotsAvailability,
  getMyAppointments,
  getMyCounsellingSessions,
})(BookAppointment);
