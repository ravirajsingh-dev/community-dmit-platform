import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import { getRankInfo } from "@src/actions/rankActions";

import { FaCrown } from "react-icons/fa";

const LevelsIndex = ({ getRankInfo, rankInfo, rankLoading }) => {
  useEffect(() => {
    getRankInfo();
  }, [getRankInfo]);

  const levels = rankInfo?.levels ?? [];

  if (rankLoading) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Levels"
          crumbs={[
            { name: "Dashboard", path: "/user/dashboard" },
            { name: "Levels" },
          ]}
        />
        <MainCard>
          <BouncingLoader minHeight="320px" message="Loading levels..." />
        </MainCard>
      </Container>
    );
  }

  return (
    <Container className="levels-page">
      <AppBreadCrumb
        pageTitle="Levels"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Levels" },
        ]}
      />
      <MainCard>
        <section className="levels-page__section">
          <h5 className="levels-page__title mb-3 d-flex align-items-center gap-2">
            <FaCrown /> Level Benefits
          </h5>
          <p className="levels-page__subtitle text-muted small mb-4">
            Each level earns a commission in your wallet when your downline
            completes registration/activation.
          </p>

          {levels.length === 0 ? (
            <p className="text-muted small mb-0">No levels configured.</p>
          ) : (
            <Row className="g-3 levels-page__grid">
              {levels.map((lvl) => (
                <Col
                  key={lvl.levelNumber ?? lvl.walletKey}
                  xs={6}
                  md={6}
                  lg={4}
                >
                  <Card className="levels-page__card h-100 border-0">
                    <Card.Body className="levels-page__card-body">
                      <div className="levels-page__card-top d-flex justify-content-between align-items-center mb-2">
                        <strong className="levels-page__level-label">
                          Level {lvl.levelNumber}
                        </strong>
                        <Badge
                          bg="success"
                          className="levels-page__percent-badge"
                        >
                          {Number(lvl.commissionPercent ?? 0)}%
                        </Badge>
                      </div>
                      <small className="levels-page__wallet text-muted d-block mb-2">
                        Wallet: {lvl.walletKey || "—"}
                      </small>
                      <div className="levels-page__amount-wrap">
                        <span className="levels-page__amount-label d-block">
                          Commission Amount
                        </span>
                        <span className="levels-page__amount-value">
                          ₹ {Number(lvl.commissionAmount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </section>
      </MainCard>
    </Container>
  );
};

LevelsIndex.propTypes = {
  getRankInfo: PropTypes.func.isRequired,
  rankInfo: PropTypes.object,
  rankLoading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  rankInfo: state.rank ?? {},
  rankLoading: state.rank?.loading ?? false,
});

export default connect(mapStateToProps, { getRankInfo })(LevelsIndex);
