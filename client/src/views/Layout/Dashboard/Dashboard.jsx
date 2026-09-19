import React, { useEffect, useState, useCallback } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import {
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaUsers,
  FaWallet,
  FaRupeeSign,
  FaCalendarAlt,
  FaShareAlt,
} from "react-icons/fa";
import { TbWallet, TbFileTypePdf } from "react-icons/tb";
import { loadUser } from "@src/actions/auth";
import {
  getWalletDetails,
  getWalletTransactions,
} from "@src/actions/walletActions";
import { getTeamDashboard } from "@src/actions/teamActions";
import { getPendingCounsellingCount } from "@src/actions/counsellingActions";
import { getAssignedAppointments } from "@src/actions/appointmentActions";
import { getPendingSbiProVerification } from "@src/actions/sbiProActions";
import { fetchUserEPins } from "@src/actions/epinActions";
import { getRankInfo } from "@src/actions/rankActions";
import { getDesignationEligibility } from "@src/actions/designationActions";
import { setAlert } from "@src/actions/alert";
import { getAppointmentIcon } from "@src/constants/appointmentIcons";
import { isValidEPinFormat, formatEPinInput } from "@src/utils/epinFormatter";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import LoadingSkeleton from "@src/views/Common/Loaders/LoadingSkeleton";
import ShareReferralModal from "./ShareReferralModal";
import { getPDFs } from "@src/actions/mediaActions";
import ConfirmModal from "@src/views/Common/Modal/ConfirmModal";

const REGISTER_PATH = "/register";

const Dashboard = ({
  loggedInUser,
  loadUser,
  isAuthenticated,
  mainBalance,
  totalCr,
  walletLoading,
  teamLoadingDashboard,
  getWalletDetails,
  getWalletTransactions,
  dashboardCounts,
  getTeamDashboard,
  rankInfo,
  rankLoading,
  getRankInfo,
  pendingCounsellingCount,
  getPendingCounsellingCount,
  assignedPagination,
  appointmentLoadingAssigned,
  getAssignedAppointments,
  pendingVerificationSessions,
  getPendingSbiProVerification,
  designations,
  getDesignationEligibility,
  hasCompleteAddress,
  loadingDesignationEligibility,
  fetchUserEPins,
  setAlert: dispatchAlert,
}) => {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEpinId, setSelectedEpinId] = useState("");
  const [unusedEpins, setUnusedEpins] = useState([]);
  const [loadingEpins, setLoadingEpins] = useState(false);
  const [planPdf, setPlanPdf] = useState(null);
  const [loadingPlanPdf, setLoadingPlanPdf] = useState(false);
  const [showPlanPdfConfirm, setShowPlanPdfConfirm] = useState(false);

  useEffect(() => {
    if (!loggedInUser) loadUser();
  }, [loggedInUser, loadUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Other sections should render even if `loggedInUser` is still loading.
    getWalletDetails();
    getWalletTransactions({ page: 1, limit: 1 });
    getTeamDashboard();
    getRankInfo();
    getPendingCounsellingCount();
    getAssignedAppointments({ status: "PENDING", page: 1, limit: 1 });
    getPendingSbiProVerification();
    getDesignationEligibility();
  }, [
    isAuthenticated,
    getWalletDetails,
    getWalletTransactions,
    getTeamDashboard,
    getRankInfo,
    getPendingCounsellingCount,
    getAssignedAppointments,
    getPendingSbiProVerification,
    getDesignationEligibility,
  ]);

  useEffect(() => {
    if (!loggedInUser) return;
    let cancelled = false;

    setLoadingPlanPdf(true);
    (async () => {
      try {
        // Prefer explicit plan type so admin can edit title freely.
        const planTypedList = await getPDFs("plan");
        if (cancelled) return;
        const typedCandidates = Array.isArray(planTypedList)
          ? planTypedList
          : [];
        let plan = typedCandidates.find((p) => p?.fileUrl);

        // Backward compatibility for older records before `plan` type support.
        if (!plan) {
          const list = await getPDFs();
          if (cancelled || !Array.isArray(list)) return;
          plan = list.find(
            (p) => (p.title || "").trim().toLowerCase() === "plan pdf",
          );
        }

        if (plan?.fileUrl) setPlanPdf(plan);
        else setPlanPdf(null);
      } catch {
        if (!cancelled) setPlanPdf(null);
      } finally {
        if (!cancelled) setLoadingPlanPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loggedInUser]);

  const loadUnusedEpins = useCallback(async () => {
    if (!loggedInUser) return;
    setLoadingEpins(true);
    try {
      const result = await fetchUserEPins({
        status: "unused",
        page: 1,
        limit: 50,
      });
      const list = result?.epins || [];
      setUnusedEpins(list);
      setSelectedEpinId((prev) => (prev ? prev : list[0]?.epinId || ""));
    } catch {
      setUnusedEpins([]);
    } finally {
      setLoadingEpins(false);
    }
  }, [loggedInUser, fetchUserEPins]);

  const openShareModal = () => {
    setShowShareModal(true);
    setSelectedEpinId("");
    setUnusedEpins([]);
    loadUnusedEpins();
  };

  const buildReferralUrl = () => {
    const base = `${window.location.origin}${REGISTER_PATH}`;
    const params = new URLSearchParams();
    const refId = (loggedInUser?.memberId || "").trim().toUpperCase();
    if (refId) params.set("referralId", refId);
    const epinVal = (selectedEpinId || "").trim().toUpperCase();
    if (epinVal && isValidEPinFormat(epinVal)) params.set("epinId", epinVal);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const copyReferralLink = () => {
    const url = buildReferralUrl();
    navigator.clipboard.writeText(url).then(
      () => dispatchAlert("Referral link copied to clipboard", "success"),
      () => dispatchAlert("Failed to copy link", "danger"),
    );
    setShowShareModal(false);
  };

  const isActive = loggedInUser?.status === 1 && loggedInUser?.isPaid;
  const directCount = dashboardCounts?.directCount ?? 0;
  const totalTeamCount = dashboardCounts?.totalDownlineCount ?? 0;
  const todayJoinedCount = dashboardCounts?.todayJoinedCount ?? 0;
  const inactiveCount = dashboardCounts?.inactiveCount ?? 0;
  const assignedCount = assignedPagination?.totalCount ?? 0;
  const sbiProPendingCount =
    (pendingVerificationSessions && pendingVerificationSessions.length) || 0;
  const initial = (loggedInUser?.name || "G").charAt(0).toUpperCase();
  const currentRank = rankInfo?.currentRank;
  const nextRank = rankInfo?.nextRank;
  const progressItems = nextRank?.progress || [];
  const requiredProgressItems = progressItems.filter(
    (p) => (p?.required ?? 0) > 0,
  );
  const preferredProgressLabels = ["Team Size", "Monthly New Active"];
  const preferredProgressItems = preferredProgressLabels
    .map((label) => progressItems.find((p) => p?.label === label))
    .filter(Boolean);
  const criteriaProgressItems =
    preferredProgressItems.length > 0
      ? preferredProgressItems
      : requiredProgressItems.slice(0, 2);
  const overallProgressPercent =
    requiredProgressItems.length > 0
      ? Math.min(
          ...requiredProgressItems.map(
            (p) =>
              Math.max(0, Math.min(1, (p?.current ?? 0) / p.required)) * 100,
          ),
        )
      : null;
  const highlightedDesignationCodes = [1, 2];

  const formatNames = (names) => {
    const list = (names || []).filter(Boolean);
    if (list.length <= 1) return list[0] || "";
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  };

  // If a designation is turned OFF (online=false), its benefits are not available.
  const offDesignations = (designations || []).filter((d) => {
    const code = Number(d?.designationCode);
    const isAchieved = Boolean(d?.alreadyApplied) && d?.currentStatus === "APPROVED";
    return highlightedDesignationCodes.includes(code) && isAchieved && !d?.online;
  });

  const offDesignationNames = offDesignations.map((d) =>
    d?.name ? d.name : `Designation ${d?.designationCode ?? ""}`.trim(),
  );

  const showDesignationOffNotice = offDesignationNames.length > 0;
  const offDesignationNamesFormatted = formatNames(offDesignationNames);

  const designationOffNoticeText = showDesignationOffNotice
    ? offDesignationNames.length === 1
      ? `Activate your designations to unlock full benefits. ${offDesignationNamesFormatted} is currently OFF—turn it ON to start earning its advantages.`
      : `Activate your designations to unlock full benefits. ${offDesignationNamesFormatted} are currently OFF—turn them ON to start earning their advantages.`
    : "";

  const applyNowDesignations = (designations || []).filter((d) => {
    return (
      highlightedDesignationCodes.includes(Number(d?.designationCode)) &&
      Boolean(d?.eligible) &&
      !Boolean(d?.alreadyApplied)
    );
  });
  const showDesignationPrompt = applyNowDesignations.length > 0;
  const designationPromptText = applyNowDesignations
    .map((d) => d?.name)
    .filter(Boolean)
    .join(" or ");

  const teamItems = [
    { label: "Total Team", value: totalTeamCount, path: "/user/team/all" },
    { label: "Direct Team", value: directCount, path: "/user/team/direct" },
    {
      label: "Today Joined",
      value: todayJoinedCount,
      path: "/user/team/direct",
    },
    { label: "Inactive", value: inactiveCount, path: "/user/team/all" },
  ];

  const appointmentItems = [
    {
      label: "Book Appointment",
      path: "/user/appointments/book",
      iconKey: "calendar",
      badge: null,
    },
    {
      label: "My Counselling",
      path: "/user/appointments/counselling",
      iconKey: "counselling",
      badge: pendingCounsellingCount,
    },
    {
      label: "Assigned to Me",
      path: "/user/appointments/assigned",
      iconKey: "personCheck",
      badge: assignedCount,
    },
    {
      label: "SBI PRO",
      path: "/user/sbi-pro",
      iconKey: "fingerprint",
      badge: sbiProPendingCount,
    },
  ];

  return (
    <Container className="dash">
      <MainCard>
        {/* Hero Welcome */}
        <div className="dash__hero">
          <div className="dash__hero-bg" aria-hidden="true" />
          <div className="dash__hero-shine" aria-hidden="true" />
          <div className="dash__hero-content">
            <div className="dash__hero-avatar">{initial}</div>
            <div className="dash__hero-text">
              <h1 className="dash__hero-title">
                Welcome back, {loggedInUser?.name || "Member"}
              </h1>
            </div>
          </div>
          <div className="dash__hero-actions">
            <button
              type="button"
              className="dash__hero-action-btn"
              onClick={openShareModal}
            >
              <FaShareAlt size={14} />
              <span>Share</span>
            </button>

            {loadingPlanPdf ? (
              <button
                type="button"
                className="dash__hero-action-btn"
                disabled
                aria-disabled="true"
              >
                <LoadingSkeleton
                  className="dash__planpdf-skeleton-icon"
                  enableAnimation={false}
                />
                <span>Loading...</span>
              </button>
            ) : (
              planPdf && (
                <button
                  type="button"
                  className="dash__hero-action-btn"
                  onClick={() => setShowPlanPdfConfirm(true)}
                >
                  <TbFileTypePdf size={16} />
                  <span>{planPdf?.title || "SBI PDF"}</span>
                </button>
              )
            )}
          </div>
        </div>

        {!loadingDesignationEligibility && !hasCompleteAddress && (
          <section className="dash__block">
            <button
              type="button"
              className="alert alert-info mb-3 text-start w-100"
              onClick={() => navigate("/user/profile#address-details")}
            >
              <strong>Profile completion required.</strong> Please complete your full
              profile, including Address Details, before using bookings, designations,
              or other advanced features.
            </button>
          </section>
        )}

        {showDesignationOffNotice && (
          <section className="dash__block dash__designation-prompt-block">
            <button
              type="button"
              className="dash__designation-prompt dash__designation-off-prompt"
              onClick={() => navigate("/user/appointments/assigned")}
            >
              <span className="dash__designation-prompt-title">
                Action Required: Turn Designations ON
              </span>
              <span className="dash__designation-prompt-note">
                {designationOffNoticeText}
              </span>
            </button>
          </section>
        )}

        {showDesignationPrompt && (
          <section className="dash__block dash__designation-prompt-block">
            <button
              type="button"
              className="dash__designation-prompt"
              onClick={() => navigate("/user/designations")}
            >
              <span className="dash__designation-prompt-title">
                Action Required: Designation Application Open
              </span>
              <span className="dash__designation-prompt-note">
                You are currently eligible to apply for {designationPromptText}.
                Please complete your application to proceed with the next
                professional growth step.
              </span>
            </button>
          </section>
        )}

        {/* User Info — individual cards */}
        <section className="dash__block">
          <h2 className="dash__block-title">
            <FaUser /> User Info
          </h2>
          {loggedInUser ? (
            <div className="dash__info-cards">
              <div className="dash__info-card">
                <span className="dash__info-card-label">Name</span>
                <span className="dash__info-card-value">
                  {loggedInUser.name || "N/A"}
                </span>
              </div>
              <div className="dash__info-card">
                <span className="dash__info-card-label">Member ID</span>
                <span className="dash__info-card-value dash__info-card-value--mono">
                  {loggedInUser.memberId || "N/A"}
                </span>
              </div>
              <div className="dash__info-card">
                <span className="dash__info-card-label">Sponsor ID</span>
                <span className="dash__info-card-value dash__info-card-value--mono">
                  {loggedInUser.referredByMemberId || "—"}
                </span>
              </div>
              <div
                className={`dash__info-card dash__info-card--status dash__info-card--${isActive ? "active" : "inactive"}`}
              >
                <span className="dash__info-card-label">Status</span>
                <span className="dash__info-card-value">
                  {isActive ? "ACTIVE" : "Inactive"}
                </span>
              </div>
            </div>
          ) : (
            <div className="dash__info-loading">
              <BouncingLoader
                minHeight="150px"
                message="Loading user info..."
              />
            </div>
          )}
        </section>

        {/* Rank Progress (separate from User Info) */}
        {rankLoading || currentRank?.name ? (
          <section className="dash__block dash__rank-block">
            <h2 className="dash__block-title">
              <FaCheckCircle /> {currentRank?.name || "Rank Progress"}
            </h2>

            {rankLoading && !currentRank?.name ? (
              <div className="dash__info-loading">
                <BouncingLoader minHeight="150px" message="Loading rank..." />
              </div>
            ) : (
              <div className="dash__rank-hero">
                <div className="dash__rank-hero-bg" aria-hidden="true" />
                <div className="dash__rank-hero-inner">
                  <div className="dash__rank-hero-head">
                    <div className="dash__rank-hero-top">
                      <div className="dash__rank-topcell">
                        <span className="dash__rank-topcell-label">
                          Achieved
                        </span>
                        <span className="dash__rank-topcell-value dash__rank-value--mono">
                          {currentRank?.name}
                        </span>
                      </div>

                      <span className="dash__rank-top-sep" aria-hidden="true">
                        |
                      </span>

                      <div className="dash__rank-topcell">
                        <span className="dash__rank-topcell-label">
                          Up next
                        </span>
                        <span className="dash__rank-topcell-value dash__rank-value--mono">
                          {nextRank?.name ? nextRank.name : "Highest rank"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {nextRank?.name && overallProgressPercent != null && (
                    <div className="dash__rank-progress-compact">
                      <div className="dash__rank-progress-meta">
                        <span className="dash__rank-progress-label">
                          Progress
                        </span>
                        <span className="dash__rank-progress-percent">
                          {Number(overallProgressPercent).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className="dash__rank-progress-bar dash__rank-progress-bar--compact"
                        aria-hidden="true"
                      >
                        <div
                          className="dash__rank-progress-bar-fill"
                          style={{ width: `${overallProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {nextRank?.name && criteriaProgressItems.length > 0 && (
                    <div className="dash__rank-criteria-grid">
                      {criteriaProgressItems.map((item) => {
                        const ratio =
                          (item?.required ?? 0) > 0
                            ? Math.max(
                                0,
                                Math.min(
                                  1,
                                  (item.current ?? 0) / item.required,
                                ),
                              )
                            : 0;
                        const pct = ratio * 100;
                        const achieved = ratio >= 1;
                        return (
                          <div
                            key={item.label}
                            className="dash__rank-criterion"
                          >
                            <span className="dash__rank-criterion-label">
                              {item.label}
                            </span>
                            <div className="dash__rank-criterion-metrics">
                              <span className="dash__rank-criterion-value dash__rank-value--mono">
                                {item.current}/{item.required}
                              </span>
                              {achieved ? (
                                <span
                                  className="dash__rank-criterion-tick"
                                  aria-label="Achieved"
                                >
                                  <FaCheckCircle size={18} />
                                </span>
                              ) : (
                                <span className="dash__rank-criterion-pct">
                                  {Number(pct).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* Team — no icons, number + label only */}
        <section className="dash__block">
          <h2 className="dash__block-title">
            <FaUsers /> Team
          </h2>
          {teamLoadingDashboard ? (
            <div className="dash__info-loading">
              <BouncingLoader minHeight="150px" message="Loading team..." />
            </div>
          ) : (
            <div className="dash__team-card">
              {teamItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="dash__team-cell"
                  onClick={() => navigate(item.path)}
                >
                  <span className="dash__team-cell-num">{item.value}</span>
                  <span className="dash__team-cell-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Wallet */}
        <section className="dash__block">
          <h2 className="dash__block-title">
            <FaWallet /> Wallet
          </h2>
          {walletLoading ? (
            <div className="dash__info-loading">
              <BouncingLoader minHeight="150px" message="Loading wallet..." />
            </div>
          ) : (
            <div className="dash__wallet-hero">
              <div className="dash__wallet-hero-bg" aria-hidden="true" />
              <div className="dash__wallet-hero-inner">
                <div className="dash__wallet-main">
                  <span className="dash__wallet-main-label">
                    Available Balance
                  </span>
                  <span className="dash__wallet-main-amount">
                    ₹ {Number(mainBalance || 0).toFixed(2)}
                  </span>
                  <span className="dash__wallet-sub">
                    Total Earnings · ₹{" "}
                    {totalCr != null && totalCr !== ""
                      ? Number(totalCr).toFixed(2)
                      : "—"}
                  </span>
                </div>
                <div className="dash__wallet-btns">
                  <button
                    type="button"
                    className="dash__wallet-btn"
                    onClick={() => navigate("/user/wallet")}
                  >
                    <TbWallet size={22} /> Wallet
                  </button>
                  <button
                    type="button"
                    className="dash__wallet-btn dash__wallet-btn"
                    onClick={() => navigate("/user/wallet/transactions")}
                  >
                    <FaRupeeSign size={18} /> Transactions
                  </button>
                  <button
                    type="button"
                    className="dash__wallet-btn dash__wallet-btn"
                    onClick={() => navigate("/user/wallet/level-income")}
                  >
                    Level
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Appointments */}
        <section className="dash__block">
          <h2 className="dash__block-title">
            <FaCalendarAlt /> Appointments
          </h2>
          {appointmentLoadingAssigned ? (
            <div className="dash__info-loading">
              <BouncingLoader
                minHeight="150px"
                message="Loading appointments..."
              />
            </div>
          ) : (
            <Row className="g-3">
              {appointmentItems.map((item) => {
                const Icon = getAppointmentIcon(item.iconKey);
                const hasPending = item.badge != null && item.badge > 0;
                return (
                  <Col key={item.path} xs={12} sm={6} lg={3}>
                    <button
                      type="button"
                      className="dash__apt"
                      onClick={() => navigate(item.path)}
                    >
                      <span className="dash__apt-icon">
                        {Icon && <Icon size={24} />}
                      </span>
                      <span className="dash__apt-label">{item.label}</span>
                      {hasPending && (
                        <span className="dash__apt-pill">{item.badge} new</span>
                      )}
                    </button>
                  </Col>
                );
              })}
            </Row>
          )}
        </section>

        <ShareReferralModal
          show={showShareModal}
          onHide={() => setShowShareModal(false)}
          loggedInUser={loggedInUser}
          loadingEpins={loadingEpins}
          unusedEpins={unusedEpins}
          selectedEpinId={selectedEpinId}
          setSelectedEpinId={setSelectedEpinId}
          copyReferralLink={copyReferralLink}
        />

        <ConfirmModal
          show={showPlanPdfConfirm}
          onHide={() => setShowPlanPdfConfirm(false)}
          title={`Download ${planPdf?.title || "Plan PDF"}`}
          body={`Do you want to download ${planPdf?.title || "this PDF"}? It will open in a new tab where you can view or save it.`}
          confirmLabel="Download"
          cancelLabel="Cancel"
          icon={TbFileTypePdf}
          onConfirm={() => {
            if (planPdf?.fileUrl) {
              window.open(planPdf.fileUrl, "_blank", "noopener,noreferrer");
            }
            setShowPlanPdfConfirm(false);
          }}
        />
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loggedInUser: state.auth.user,
  isAuthenticated: state.auth?.isAuthenticated,
  mainBalance: state.wallet?.mainBalance ?? 0,
  totalCr: state.wallet?.totalCr ?? "0.00",
  walletLoading: state.wallet?.loadingDetails ?? false,
  teamLoadingDashboard: state.team?.loadingDashboard ?? false,
  dashboardCounts: state.team?.dashboardCounts,
  rankInfo: state.rank ?? {},
  rankLoading: state.rank?.loading ?? false,
  pendingCounsellingCount: state.counselling?.pendingCount ?? 0,
  assignedPagination: state.appointment?.assignedPagination ?? {},
  appointmentLoadingAssigned: state.appointment?.loadingAssigned ?? false,
  pendingVerificationSessions: state.sbiPro?.pendingVerificationSessions ?? [],
  designations: state.designation?.designations ?? [],
  hasCompleteAddress: state.designation?.hasCompleteAddress ?? false,
  loadingDesignationEligibility: state.designation?.loadingEligibility ?? false,
});

export default connect(mapStateToProps, {
  loadUser,
  getWalletDetails,
  getWalletTransactions,
  getTeamDashboard,
  getRankInfo,
  getPendingCounsellingCount,
  getAssignedAppointments,
  getPendingSbiProVerification,
  getDesignationEligibility,
  fetchUserEPins,
  setAlert,
})(Dashboard);
