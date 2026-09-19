import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Container, Row, Col, Card, Badge, ProgressBar } from "react-bootstrap";
import {
  FaCheckCircle,
  FaChartLine,
  FaRegCircle,
  FaStar,
} from "react-icons/fa";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import { getRankInfo } from "@src/actions/rankActions";

const RanksIndex = ({ getRankInfo, rankInfo, rankLoading }) => {
  useEffect(() => {
    getRankInfo();
  }, [getRankInfo]);

  const currentRank = rankInfo?.currentRank ?? null;
  const ranks = Array.isArray(rankInfo?.ranks) ? rankInfo.ranks : [];
  const calc = rankInfo?.rankBenefitCalculation || null;
  const isLoading = rankLoading || ranks.length === 0;

  if (isLoading) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Rank"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "Rank" },
          ]}
        />
        <MainCard>
          <BouncingLoader
            minHeight="320px"
            message="Loading rank progress..."
          />
        </MainCard>
      </Container>
    );
  }

  return (
    <Container className="rank-page">
      <AppBreadCrumb
        pageTitle="Rank"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Rank" },
        ]}
      />
      <MainCard>
        <section className="rank-page__section">
          <h5 className="rank-page__title mb-2 d-flex align-items-center gap-2">
            <FaChartLine /> Rank Process
          </h5>
          <p className="rank-page__subtitle text-muted small mb-4">
            View all configured ranks, your current position, and the exact
            requirements to unlock each next rank.
          </p>

          <div className="rank-page__current mb-4">
            <div className="rank-page__current-label">Current Rank</div>
            <div className="rank-page__current-value">
              <FaStar className="rank-page__current-star" />
              <span>{currentRank?.name || "Not Ranked Yet"}</span>
            </div>
          </div>

          <Row className="g-3">
            {ranks.map((rank) => (
              <Col key={rank.rankCode} xs={12} md={6} xl={4}>
                <Card
                  className={`rank-page__card h-100 border-0 ${rank.isCurrent ? "rank-page__card--current" : ""}`}
                >
                  <Card.Body className="rank-page__card-body">
                    <div className="rank-page__card-head">
                      <div className="rank-page__rank-title-wrap">
                        <div className="rank-page__rank-title">
                          Rank {rank.rankCode} - {rank.name}
                        </div>
                        <div className="rank-page__rank-meta">
                          Commission: {Number(rank.commissionPercent ?? 0)}%
                        </div>
                        <div className="rank-page__rank-benefit">
                          Potential Benefit: ₹{" "}
                          {Number(rank.assumedSingleUserAmount ?? 0).toFixed(2)}
                        </div>
                        <div className="rank-page__rank-benefit-note">
                          Activation basis used:{" "}
                          {Number(rank.qualificationActivationBasis ?? 1)}
                        </div>
                        {!rank.achieved && (
                          <div className="rank-page__rank-waiting">
                            This benefit is waiting for you.
                          </div>
                        )}
                        {rank.eligibleForCurrentConditions === false && (
                          <div className="rank-page__rank-benefit-note">
                            Benefit locked:{" "}
                            {rank.blockedReason || "Conditions not met"}
                          </div>
                        )}
                      </div>

                      <div className="rank-page__status-wrap">
                        {rank.achieved ? (
                          <span className="rank-page__tick" title="Achieved">
                            <FaCheckCircle />
                          </span>
                        ) : (
                          <span className="rank-page__pending" title="Pending">
                            <FaRegCircle />
                          </span>
                        )}
                        {rank.isCurrent && <Badge bg="warning">Current</Badge>}
                      </div>
                    </div>

                    <div className="rank-page__overall">
                      <div className="rank-page__overall-top">
                        <span>Overall Progress</span>
                        <span>
                          {Number(rank.overallPercent ?? 0).toFixed(0)}%
                        </span>
                      </div>
                      <ProgressBar
                        now={Number(rank.overallPercent ?? 0)}
                        className="rank-page__progress"
                      />
                    </div>

                    <div className="rank-page__conditions">
                      {(rank.conditions || []).length === 0 ? (
                        <div className="rank-page__condition-empty text-muted small">
                          No additional conditions required.
                        </div>
                      ) : (
                        (rank.conditions || []).map((cond) => (
                          <div
                            key={`${rank.rankCode}-${cond.key}`}
                            className="rank-page__condition"
                          >
                            {cond.key === "capping" ? (
                              <>
                                <div className="rank-page__condition-head">
                                  <span className="rank-page__condition-label">
                                    {cond.label}
                                  </span>
                                </div>
                                <div className="rank-page__condition-note text-muted small">
                                  {cond.note || "Capping configured"}
                                </div>
                              </>
                            ) : (
                              <>
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

                                {cond.current != null &&
                                cond.required != null ? (
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
                                ) : (
                                  <div className="rank-page__condition-note text-muted small">
                                    {cond.note ||
                                      "Additional validation required"}
                                  </div>
                                )}

                                <ProgressBar
                                  now={Number(cond.percent ?? 0)}
                                  className="rank-page__condition-progress"
                                />
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      </MainCard>
    </Container>
  );
};

RanksIndex.propTypes = {
  getRankInfo: PropTypes.func.isRequired,
  rankInfo: PropTypes.object,
  rankLoading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  rankInfo: state.rank ?? {},
  rankLoading: state.rank?.loading ?? false,
});

export default connect(mapStateToProps, { getRankInfo })(RanksIndex);
