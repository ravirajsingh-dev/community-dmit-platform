import React, { useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import {
  getDesignationEligibility,
  applyForDesignation,
} from "@src/actions/designationActions";
import { toggleHolderOnline } from "@src/actions/appointmentActions";

import {
  FaCheckCircle,
  FaChartLine,
  FaRegCircle,
  FaStar,
} from "react-icons/fa";

const DesignationsIndex = ({
  designations,
  directCount,
  totalDownlineCount,
  monthlyDirectCount,
  hasCompleteAddress,
  loadingEligibility,
  applying,
  togglingOnline,
  getDesignationEligibility,
  applyForDesignation,
  toggleHolderOnline,
}) => {
  const navigate = useNavigate();
  useEffect(() => {
    getDesignationEligibility();
  }, [getDesignationEligibility]);

  const sortedDesignations = useMemo(() => {
    const list = Array.isArray(designations) ? [...designations] : [];
    return list.sort(
      (a, b) => Number(a?.designationCode ?? 0) - Number(b?.designationCode ?? 0),
    );
  }, [designations]);

  const achievedDesignations = useMemo(
    () =>
      sortedDesignations.filter((d) => d?.currentStatus === "APPROVED"),
    [sortedDesignations],
  );

  const handleToggleOnline = (designationCode) => {
    toggleHolderOnline(designationCode, getDesignationEligibility);
  };

  const isLoading = loadingEligibility || sortedDesignations.length === 0;

  const makeCondition = ({
    key,
    label,
    current,
    required,
    note,
  }) => {
    const req = Number(required ?? 0);
    if (req <= 0) {
      return {
        key,
        label,
        achieved: true,
        percent: 100,
        current: null,
        required: null,
        note: note || "Not required",
      };
    }

    const cur = Number(current ?? 0);
    const ratio = cur / req;
    const pct = Math.max(0, Math.min(100, ratio * 100));
    const achieved = cur >= req;
    return {
      key,
      label,
      achieved,
      percent: pct,
      current: cur,
      required: req,
    };
  };

  const getOverallPercent = (d) => {
    const selfReq = Number(d?.selfSaleRequired ?? 0);
    const teamReq = Number(d?.teamSizeRequired ?? 0);
    const monthlyReq = Number(d?.monthlyTarget ?? 0);
    const holdersReq = Number(d?.requiredDesignationCount ?? 0);

    const selfRatio =
      selfReq > 0 ? Math.max(0, Math.min(1, directCount / selfReq)) : 1;
    const teamRatio =
      teamReq > 0 ? Math.max(0, Math.min(1, totalDownlineCount / teamReq)) : 1;
    const monthlyRatio =
      monthlyReq > 0
        ? Math.max(0, Math.min(1, monthlyDirectCount / monthlyReq))
        : 1;
    const holdersRatio =
      d?.requiredDesignationCode != null && holdersReq > 0
        ? Math.max(
            0,
            Math.min(
              1,
              (Number(d?.currentRequiredDesignationCount ?? 0) / holdersReq),
            ),
          )
        : 1;

    const ratios = [selfRatio, teamRatio, monthlyRatio];
    if (d?.requiredDesignationCode != null && holdersReq > 0) {
      ratios.push(holdersRatio);
    }

    if (ratios.length === 0) return 100;
    const avgRatio =
      ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    return Math.round(Math.max(0, Math.min(1, avgRatio)) * 100);
  };

  const getConditions = (d) => {
    const requiredHolderConfigured =
      d?.requiredDesignationCode != null &&
      Number(d?.requiredDesignationCount ?? 0) > 0;

    const conditions = [
      makeCondition({
        key: "self_sale",
        label: "Self Sale Required",
        current: directCount,
        required: d?.selfSaleRequired,
      }),
      makeCondition({
        key: "team_size",
        label: "Team Size Required",
        current: totalDownlineCount,
        required: d?.teamSizeRequired,
      }),
      makeCondition({
        key: "monthly_target",
        label: "Monthly Target",
        current: monthlyDirectCount,
        required: d?.monthlyTarget,
      }),
    ];

    if (requiredHolderConfigured) {
      conditions.push(
        makeCondition({
          key: "required_holders",
          label: `Required Designation Holders (Code ${d.requiredDesignationCode})`,
          current: d?.currentRequiredDesignationCount ?? 0,
          required: d?.requiredDesignationCount,
        }),
      );
    } else {
      conditions.push(
        makeCondition({
          key: "required_holders",
          label: "Required Designation Holders",
          current: null,
          required: 0,
          note: "Not configured for this designation",
        }),
      );
    }

    return conditions;
  };

  const getStatusNote = (d) => {
    if (d?.currentStatus === "INACTIVE") {
      return {
        type: "blocked",
        title: "Note: Designation Blocked by Admin",
        message: d?.remarks
          ? d.remarks
          : "Your designation is currently blocked. Please contact admin support for reactivation.",
      };
    }

    if (d?.currentStatus === "REJECTED") {
      return {
        type: "rejected",
        title: "Note: Application Rejected",
        message: d?.remarks || d?.reason || "Please review requirements and apply again.",
      };
    }

    if (d?.currentStatus === "PENDING") {
      return {
        type: "pending",
        title: "Note: Application Under Review",
        message:
          "Your application has been submitted. Admin will review and contact you shortly.",
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Designations"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "Designations" },
          ]}
        />
        <MainCard>
          <BouncingLoader
            minHeight="320px"
            message="Loading designation progress..."
          />
        </MainCard>
      </Container>
    );
  }

  return (
    <Container className="rank-page designation-page">
      <AppBreadCrumb
        pageTitle="Designations"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Designations" },
        ]}
      />

      <MainCard>
        {!hasCompleteAddress && (
          <button
            type="button"
            className="alert alert-warning mb-3 text-start w-100"
            onClick={() => navigate("/user/profile#address-details")}
          >
            <strong>Complete Address Details required.</strong> Please fill your full
            Address Details (country, state, district, village and current address) in
            your Profile before applying for any designation.
          </button>
        )}

        <section className="rank-page__section">
          <h5 className="rank-page__title mb-2 d-flex align-items-center gap-2">
            <FaChartLine /> Designation Process
          </h5>
          <p className="rank-page__subtitle text-muted small mb-4">
            View all configured designations, your current position, and the
            exact requirements to unlock each next designation.
          </p>

          <Row className="g-3 mb-4">
            <Col xs={12} md={4}>
              <div className="designation-page__metric">
                <span className="designation-page__metric-label">Direct Count</span>
                <span className="designation-page__metric-value">{directCount}</span>
              </div>
            </Col>
            <Col xs={12} md={4}>
              <div className="designation-page__metric">
                <span className="designation-page__metric-label">Downline Count</span>
                <span className="designation-page__metric-value">
                  {totalDownlineCount}
                </span>
              </div>
            </Col>
            <Col xs={12} md={4}>
              <div className="designation-page__metric">
                <span className="designation-page__metric-label">Monthly Direct</span>
                <span className="designation-page__metric-value">
                  {monthlyDirectCount}
                </span>
              </div>
            </Col>
          </Row>

          <div className="rank-page__current mb-4">
            <div className="rank-page__current-label">Achieved Designations</div>
            <div className="rank-page__current-value">
              <FaStar className="rank-page__current-star" />
              <span>
                {achievedDesignations.length > 0
                  ? achievedDesignations.map((d) => d.name).join(" | ")
                  : "No Designation Achieved Yet"}
              </span>
            </div>
          </div>

          {achievedDesignations.length > 0 && (
            <Card className="mb-4 availability-card">
              <Card.Header className="availability-card-header">
                <span className="availability-card-icon" aria-hidden="true">
                  📡
                </span>
                <div>
                  <Card.Title className="availability-card-title">
                    Your availability
                  </Card.Title>
                  <p className="availability-card-subtitle mb-0">
                    When you&apos;re <strong>available</strong>, clients can find
                    and book sessions with you—and you earn. When you&apos;re{" "}
                    <strong>offline</strong>, you won&apos;t appear in search
                    results.
                  </p>
                </div>
              </Card.Header>
              <Card.Body className="availability-card-body">
                <Row className="g-3">
                  {achievedDesignations.map((d) => {
                    const isOnline = !!d.online;
                    return (
                      <Col key={d.designationCode} xs={12} md={6}>
                        <div
                          className={`availability-item ${isOnline ? "availability-item-online" : "availability-item-offline"}`}
                        >
                          <div className="availability-item-main">
                            <div className="availability-item-status">
                              <span
                                className={`availability-dot ${isOnline ? "availability-dot-online" : "availability-dot-offline"}`}
                              />
                              <span className="availability-label">
                                {isOnline
                                  ? "Available for bookings"
                                  : "Not available"}
                              </span>
                            </div>
                            <span className="availability-role">{d.name}</span>
                          </div>
                          <div className="availability-item-action">
                            <Form.Check
                              type="switch"
                              id={`availability-${d.designationCode}`}
                              label={isOnline ? "On" : "Off"}
                              checked={isOnline}
                              disabled={togglingOnline}
                              onChange={() =>
                                handleToggleOnline(d.designationCode)
                              }
                              className="availability-switch"
                            />
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>
          )}

          <Row className="g-3">
            {sortedDesignations.map((d) => {
              const achieved = d?.currentStatus === "APPROVED";
              const isForceAssigned = !!d.forceAssigned;
              const overallPercent = achieved ? 100 : getOverallPercent(d);
              const conditions = getConditions(d);
              const potentialProfit =
                (Number(d?.registerFee ?? 0) * Number(d?.commissionPercent ?? 0)) /
                100;
              const statusNote = getStatusNote(d);

              return (
                <Col key={d.designationCode} xs={12} md={6} xl={4}>
                  <Card
                    className={`rank-page__card h-100 border-0 ${
                      achieved ? "rank-page__card--current" : ""
                    }`}
                  >
                    <Card.Body className="rank-page__card-body">
                      <div className="rank-page__card-head">
                        <div className="rank-page__rank-title-wrap">
                          <div className="rank-page__rank-title">
                            Designation {d.designationCode} - {d.name}
                          </div>
                          {d.forceAssigned && achieved && (
                            <div className="mt-1">
                              <Badge bg="info" className="me-1">
                                Assigned by Admin
                              </Badge>
                              <span className="text-muted small">
                                This designation was granted directly by admin.
                              </span>
                            </div>
                          )}
                          <div className="rank-page__rank-benefit">
                            Potential Benefit: ₹{" "}
                            {Number(potentialProfit || 0).toFixed(2)}
                          </div>

                          {!achieved && (
                            <div className="rank-page__rank-waiting">
                              This designation is waiting for you.
                            </div>
                          )}

                          {!d.eligible && !achieved && (
                            <div className="rank-page__rank-benefit-note">
                              Benefit locked: {d.reason || "Conditions not met"}
                            </div>
                          )}

                          {statusNote && (
                            <div
                              className={`designation-page__status-note designation-page__status-note--${statusNote.type}`}
                            >
                              <span className="designation-page__status-note-title">
                                {statusNote.title}
                              </span>
                              <span className="designation-page__status-note-message">
                                {statusNote.message}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="rank-page__status-wrap">
                          {achieved ? (
                            <span className="rank-page__tick" title="Achieved">
                              <FaCheckCircle />
                            </span>
                          ) : (
                            <span className="rank-page__pending" title="Pending">
                              <FaRegCircle />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rank-page__overall">
                        <div className="rank-page__overall-top">
                          <span>Overall Progress</span>
                          <span>{overallPercent}%</span>
                        </div>
                        <ProgressBar
                          now={overallPercent}
                          className="rank-page__progress"
                        />
                      </div>

                      <div className="rank-page__conditions">
                        {isForceAssigned ? (
                          <div className="rank-page__condition-note text-muted small">
                            This designation was assigned directly by admin; requirement
                            counts are not enforced for you.
                          </div>
                        ) : conditions.length === 0 ? (
                          <div className="rank-page__condition-empty text-muted small">
                            No additional conditions required.
                          </div>
                        ) : (
                          conditions.map((cond) => (
                            <div
                              key={`designation-${d.designationCode}-${cond.key}`}
                              className="rank-page__condition"
                            >
                              <div className="rank-page__condition-head">
                                <span className="rank-page__condition-label">
                                  {cond.label}
                                </span>
                                <span className="rank-page__condition-status">
                                  {cond.achieved ? (
                                    <span className="rank-page__cond-tick">
                                      <FaCheckCircle /> Done
                                    </span>
                                  ) : (
                                    <span className="rank-page__cond-pending">
                                      {Number(cond.percent ?? 0).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              </div>

                              {cond.current != null && cond.required != null ? (
                                <div className="rank-page__condition-values">
                                  <span>
                                    {Number(cond.current)} / {Number(cond.required)}
                                  </span>
                                  <span>
                                    {cond.achieved
                                      ? "Completed"
                                      : `${Math.max(
                                          0,
                                          Number(cond.required) - Number(cond.current),
                                        )} remaining`}
                                  </span>
                                </div>
                              ) : (
                                <div className="rank-page__condition-note text-muted small">
                                  {cond.note || "Additional validation required"}
                                </div>
                              )}

                              {cond.current != null && cond.required != null && (
                                <ProgressBar
                                  now={Number(cond.percent ?? 0)}
                                  className="rank-page__condition-progress"
                                />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {d.eligible && !d.alreadyApplied && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-3 w-100"
                          disabled={applying || !hasCompleteAddress}
                          onClick={() =>
                            applyForDesignation(d.designationCode)
                          }
                        >
                          {applying ? <Spinner animation="border" size="sm" /> : `Apply for ${d.name}`}
                        </Button>
                      )}
                      {d.eligible && !d.alreadyApplied && !hasCompleteAddress && (
                        <div className="text-danger small mt-2">
                          Address Details incomplete. Update your Profile to proceed.
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </section>
      </MainCard>
    </Container>
  );
};

DesignationsIndex.propTypes = {
  designations: PropTypes.array,
  directCount: PropTypes.number,
  totalDownlineCount: PropTypes.number,
  monthlyDirectCount: PropTypes.number,
  hasCompleteAddress: PropTypes.bool,
  loadingEligibility: PropTypes.bool,
  applying: PropTypes.bool,
  togglingOnline: PropTypes.bool,
  getDesignationEligibility: PropTypes.func.isRequired,
  applyForDesignation: PropTypes.func.isRequired,
  toggleHolderOnline: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  designations: state.designation?.designations ?? [],
  directCount: state.designation?.directCount ?? 0,
  totalDownlineCount: state.designation?.totalDownlineCount ?? 0,
  monthlyDirectCount: state.designation?.monthlyDirectCount ?? 0,
  hasCompleteAddress: state.designation?.hasCompleteAddress ?? false,
  loadingEligibility: state.designation?.loadingEligibility ?? false,
  applying: state.designation?.applying ?? false,
  togglingOnline: state.appointment?.togglingOnline ?? false,
});

export default connect(mapStateToProps, {
  getDesignationEligibility,
  applyForDesignation,
  toggleHolderOnline,
})(DesignationsIndex);
