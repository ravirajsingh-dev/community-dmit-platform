import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Container, Row, Col, Card, Badge, ProgressBar } from "react-bootstrap";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaUsers,
  FaRegCircle,
} from "react-icons/fa";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import { getClubInfo } from "@src/actions/walletActions";

const ClubsIndex = ({
  getClubInfo,
  clubInfo,
  clubLoading,
  totalClubIncomeThisMonth,
  clubBenefitCalculation,
}) => {
  useEffect(() => {
    getClubInfo();
  }, [getClubInfo]);

  const isLoading = clubLoading;
  if (isLoading) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Clubs"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "Clubs" },
          ]}
        />
        <MainCard>
          <BouncingLoader minHeight="320px" message="Loading clubs..." />
        </MainCard>
      </Container>
    );
  }

  return (
    <Container className="rank-page clubs-page">
      <AppBreadCrumb
        pageTitle="Clubs"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Clubs" },
        ]}
      />
      <MainCard>
        <section className="rank-page__section">
          <h5 className="rank-page__title mb-2 d-flex align-items-center gap-2">
            <FaUsers /> Club Process
          </h5>
          <p className="rank-page__subtitle text-muted small mb-4">
            Track all club requirements, your live progress, and potential club
            benefits.
          </p>

          <p className="text-muted small mb-3">
            This month club income (total):{" "}
            <strong>{Number(totalClubIncomeThisMonth || 0).toFixed(2)}</strong>
          </p>

          {(clubInfo || []).length === 0 ? (
            <p className="text-muted small mb-0">
              No club configuration found.
            </p>
          ) : (
            <Row className="g-3">
              {clubInfo.map((club) => {
                const overallPercent = Number(club.overallPercent ?? 0);
                const remainingPercent = Math.max(0, 100 - overallPercent);

                const achieved = club.eligible === true;
                const conditions = Array.isArray(club.conditions)
                  ? club.conditions
                  : [];
                const failingPoints = conditions
                  .filter((c) => c && c.achieved === false)
                  .map((c) => c.label)
                  .filter(Boolean);

                return (
                  <Col key={club.walletKey || club.name} xs={12} md={6} xl={4}>
                    <Card className="rank-page__card clubs-page__card h-100 border-0">
                      <Card.Body className="rank-page__card-body">
                        <div className="rank-page__card-head d-flex justify-content-between align-items-start gap-3 mb-2">
                          <div className="rank-page__rank-title-wrap min-w-0">
                            <strong className="rank-page__rank-title d-block">
                              {club.name}
                            </strong>
                            <small className="rank-page__rank-meta text-muted d-block">
                              Wallet: {club.walletKey || "—"}
                            </small>
                            <div className="rank-page__rank-meta">
                              Commission: {Number(club.commissionPercent ?? 0)}%
                            </div>
                            <div className="rank-page__rank-benefit">
                              Potential Benefit: ₹{" "}
                              {Number(
                                club.potentialSingleUserAmount ?? 0,
                              ).toFixed(2)}
                            </div>
                            <div className="rank-page__rank-benefit-note">
                              Activation basis used:{" "}
                              {Number(club.qualificationActivationBasis ?? 1)}
                            </div>
                            {!achieved && (
                              <div className="rank-page__rank-waiting">
                                This benefit is waiting for you.
                              </div>
                            )}
                          </div>
                          <div className="rank-page__status-wrap text-end">
                            {achieved ? (
                              <span
                                className="rank-page__tick"
                                title="Eligible"
                              >
                                <FaCheckCircle />
                              </span>
                            ) : (
                              <span
                                className="rank-page__pending"
                                title="Pending"
                              >
                                <FaRegCircle />
                              </span>
                            )}
                            <Badge bg={achieved ? "success" : "secondary"}>
                              {achieved ? "Eligible" : "Not Eligible"}
                            </Badge>
                          </div>
                        </div>

                        <div className="rank-page__overall mb-3">
                          <div className="rank-page__overall-top mb-1">
                            <span>Club Progress</span>
                            <span>{overallPercent.toFixed(0)}%</span>
                          </div>
                          <ProgressBar
                            now={overallPercent}
                            className="rank-page__progress"
                          />
                        </div>

                        <div className="rank-page__conditions">
                          {conditions.map((cond) => (
                            <div
                              key={`${club.walletKey}-${cond.key}`}
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

                              <div className="rank-page__condition-values">
                                <span>
                                  {Number(cond.current)} /{" "}
                                  {Number(cond.required)}
                                </span>
                                <span>
                                  {cond.achieved
                                    ? "Completed"
                                    : `${Math.max(0, Number(cond.required) - Number(cond.current))} remaining`}
                                </span>
                              </div>

                              <ProgressBar
                                now={Number(cond.percent ?? 0)}
                                className="rank-page__condition-progress"
                              />
                            </div>
                          ))}

                          <div className="rank-page__condition text-muted small">
                            <strong>Capping</strong>
                            <span className="d-block mt-1">
                              {Number(club.capping ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {achieved ? (
                          <div className="mt-3 text-success small d-flex align-items-center gap-2">
                            <FaCheckCircle />
                            You are eligible for club benefits this period.
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="text-danger small d-flex align-items-center gap-2">
                              <FaTimesCircle />
                              Club not yet eligible.
                            </div>
                            {club.reason ? (
                              <div className="text-danger small mt-1">
                                Reason: {club.reason}
                              </div>
                            ) : null}
                            {failingPoints.length > 0 ? (
                              <div className="text-muted small mt-2">
                                Blocked by: {failingPoints.join(", ")}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {club.isAdminOnly ? (
                          <div className="text-muted small mt-3">
                            Note: Admin-only club. Eligibility may depend on
                            manual approval.
                          </div>
                        ) : null}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </section>
      </MainCard>
    </Container>
  );
};

ClubsIndex.propTypes = {
  getClubInfo: PropTypes.func.isRequired,
  clubInfo: PropTypes.array,
  clubLoading: PropTypes.bool,
  totalClubIncomeThisMonth: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  clubBenefitCalculation: PropTypes.object,
};

const mapStateToProps = (state) => ({
  clubInfo: state.wallet?.clubInfo ?? [],
  clubLoading: state.wallet?.loadingClubInfo ?? false,
  totalClubIncomeThisMonth: state.wallet?.totalClubIncomeThisMonth ?? "0.00",
  clubBenefitCalculation: state.wallet?.clubBenefitCalculation ?? null,
});

export default connect(mapStateToProps, { getClubInfo })(ClubsIndex);
