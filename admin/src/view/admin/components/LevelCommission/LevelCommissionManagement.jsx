import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Form, Card } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { format, parseISO } from "date-fns";
import { TbCash } from "react-icons/tb";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiRotateCcw,
  FiUsers,
  FiTrendingUp,
} from "react-icons/fi";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import BouncingLoader from "@src/view/spinners/BouncingLoader";

import {
  getLevelCommissionStats,
  getLevelCommissionHistory,
} from "@src/actions/adminLevelCommissionActions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  formatMemberIdInput,
} from "@src/utils/memberIdFormatter";

const LevelCommissionManagement = ({
  stats,
  records,
  pagination,
  loadingStats,
  loadingHistory,
  getLevelCommissionStats,
  getLevelCommissionHistory,
  loggedInAdmin,
}) => {
  const getDefaultParams = () =>
    getInitialSortingParams({
      sponsorMemberId: "",
      newUserId: "",
      fromDate: "",
      toDate: "",
    });

  const [params, setParams] = useState(() => getDefaultParams());
  const [filterDraft, setFilterDraft] = useState(() => getDefaultParams());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeCard, setActiveCard] = useState("all");

  useEffect(() => {
    getLevelCommissionStats();
  }, [getLevelCommissionStats]);

  useEffect(() => {
    getLevelCommissionHistory(params);
  }, [
    params.page,
    params.limit,
    params.sponsorMemberId,
    params.newUserId,
    params.fromDate,
    params.toDate,
  ]);

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.newUserMemberId || "-",
      width: "150px",
    },
    {
      name: "Reg Fee",
      selector: (row) => `₹ ${Number(row.registrationFee || 0).toFixed(2)}`,
      width: "150px",
    },
    {
      name: "Distributed",
      selector: (row) => (
        <span className="text-success">
          ₹ {Number(row.totalDistributed || 0).toFixed(2)}
        </span>
      ),
      width: "150px",
    },
    {
      name: "Level Breakdown",
      selector: (row) =>
        (row.levelBreakdown || []).length > 0 ? (
          <small>
            {(row.levelBreakdown || []).map((lb) => (
              <span key={lb.levelNumber} className="me-2">
                L{lb.levelNumber}: {lb.sponsorMemberId} ₹
                {Number(lb.amount || 0).toFixed(2)}
              </span>
            ))}
          </small>
        ) : (
          "-"
        ),
      wrap: true,
    },
    {
      name: "Date & Time",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "200px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Level Commission"
        crumbs={[{ name: "Level Commission" }]}
      />

      <Row className="mb-4 g-3">
        <Col xs={6} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
              activeCard === "distributed" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveCard("distributed");
              setParams((prev) => ({ ...prev, page: 1 }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveCard("distributed");
                setParams((prev) => ({ ...prev, page: 1 }));
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiTrendingUp size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Total Distributed</div>
                <div className="admin-stat-card__value">
                  ₹ {Number(stats?.totalDistributed || 0).toFixed(2)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--warning h-100 ${
              activeCard === "burned" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveCard("burned");
              setParams((prev) => ({ ...prev, page: 1 }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveCard("burned");
                setParams((prev) => ({ ...prev, page: 1 }));
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <TbCash size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Total Burned</div>
                <div className="admin-stat-card__value">
                  ₹{" "}
                  {Number(
                    stats?.totalBurned ?? stats?.totalActivationRevenue ?? 0,
                  ).toFixed(2)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
              activeCard === "records" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveCard("records");
              setParams((prev) => ({ ...prev, page: 1 }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveCard("records");
                setParams((prev) => ({ ...prev, page: 1 }));
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiUsers size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Records</div>
                <div className="admin-stat-card__value">
                  {stats?.recordCount ?? 0}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <>
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
            </div>

            {filtersOpen && (
              <div className="users-filters-panel__body">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label htmlFor="sponsorMemberId">
                        Sponsor Member ID
                      </Form.Label>
                      <Form.Control
                        type="text"
                        id="sponsorMemberId"
                        name="sponsorMemberId"
                        value={formatMemberIdInput(filterDraft.sponsorMemberId)}
                        onChange={createMemberIdChangeHandler(
                          (e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              sponsorMemberId: e.target.value,
                              page: 1,
                            })),
                          "sponsorMemberId",
                        )}
                        onPaste={createMemberIdPasteHandler()}
                        onKeyDown={createMemberIdKeyDownHandler(
                          filterDraft.sponsorMemberId,
                          (e) =>
                            setFilterDraft((p) => ({
                              ...p,
                              sponsorMemberId: e.target.value,
                              page: 1,
                            })),
                          "sponsorMemberId",
                        )}
                        placeholder="G123456789"
                        maxLength={10}
                        className="text-muted"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>From Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filterDraft.fromDate}
                        onChange={(e) =>
                          setFilterDraft((p) => ({
                            ...p,
                            fromDate: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>To Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filterDraft.toDate}
                        onChange={(e) =>
                          setFilterDraft((p) => ({
                            ...p,
                            toDate: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setParams((prev) => ({
                        ...prev,
                        sponsorMemberId: filterDraft.sponsorMemberId,
                        fromDate: filterDraft.fromDate,
                        toDate: filterDraft.toDate,
                        page: 1,
                      }));
                      setActiveCard("all");
                    }}
                  >
                    <FiCheckCircle size={15} className="me-1" />
                    Apply
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const resetParams = getDefaultParams();
                      setFilterDraft(resetParams);
                      setParams(resetParams);
                      setActiveCard("all");
                    }}
                  >
                    <FiRotateCcw size={15} className="me-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loadingStats ? (
          <BouncingLoader minHeight="200px" />
        ) : (
          <CustomDataTable
            columns={columns}
            data={records || []}
            count={pagination?.totalCount ?? pagination?.total ?? 0}
            params={params}
            setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
            pagination
            responsive
            striped
            progressPending={loadingHistory}
            paginationServer
          />
        )}
      </>
    </Container>
  );
};

LevelCommissionManagement.propTypes = {
  stats: PropTypes.object,
  records: PropTypes.array,
  pagination: PropTypes.object,
  loadingStats: PropTypes.bool,
  loadingHistory: PropTypes.bool,
  getLevelCommissionStats: PropTypes.func.isRequired,
  getLevelCommissionHistory: PropTypes.func.isRequired,
  loggedInAdmin: PropTypes.object,
};

const mapStateToProps = (state) => ({
  stats: state.adminLevelCommission?.stats ?? {},
  records: state.adminLevelCommission?.records ?? [],
  pagination: state.adminLevelCommission?.pagination ?? {},
  loadingStats: state.adminLevelCommission?.loadingStats ?? false,
  loadingHistory: state.adminLevelCommission?.loadingHistory ?? false,
  loggedInAdmin: state.adminAuth?.admin ?? state.adminAuth?.user ?? null,
});

export default connect(mapStateToProps, {
  getLevelCommissionStats,
  getLevelCommissionHistory,
})(LevelCommissionManagement);
