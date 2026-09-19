import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Container,
  Badge,
  Button,
  Card,
  Modal,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import {
  FiUsers,
  FiCheckCircle,
  FiPauseCircle,
  FiUserPlus,
} from "react-icons/fi";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import ReferralFilters from "./ReferralFilters";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";

import {
  fetchReferralSummary,
  fetchReferredUsers,
} from "@src/actions/adminReferralActions";

const ReferralSummary = ({
  referralSummary,
  pagination,
  loading,
  referralStats,
  fetchReferralSummary,
  fetchReferredUsers,
}) => {
  const [params, setParams] = useState(() =>
    getInitialSortingParams({
      orderBy: "referralCount",
      ascending: "desc",
      search: "",
      minCount: "",
      maxCount: "",
      fromDate: "",
      toDate: "",
      referralStatus: "",
    }),
  );
  const [showReferredModal, setShowReferredModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [referredUsers, setReferredUsers] = useState([]);
  const [loadingReferred, setLoadingReferred] = useState(false);
  const [referredParams, setReferredParams] = useState(() =>
    getInitialSortingParams(),
  );

  useEffect(() => {
    fetchReferralSummary(params);
  }, [fetchReferralSummary, params]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: 1,
    }));
  };

  const handleViewReferred = async (user) => {
    setSelectedUser(user);
    setShowReferredModal(true);
    setReferredParams({ page: 1, limit: 20 });
    setLoadingReferred(true);
    try {
      const result = await fetchReferredUsers(user._id);
      if (result?.response?.users) {
        setReferredUsers(result.response.users);
      }
    } catch (error) {
      console.error("Error fetching referred users:", error);
    } finally {
      setLoadingReferred(false);
    }
  };

  const referredUsersColumns = [
    {
      name: "Name",
      selector: (row) => row.name || "N/A",
      sortable: false,
      width: "180px",
      wrap: true,
    },
    {
      name: "Member ID",
      selector: (row) => row.memberId || "N/A",
      sortable: false,
      width: "150px",
      wrap: true,
    },
    {
      name: "Phone",
      selector: (row) => row.phone || "N/A",
      sortable: false,
      width: "130px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) =>
        row.status === 1 && row.isPaid ? (
          <Badge bg="success">Active</Badge>
        ) : (
          <Badge bg="secondary">Inactive</Badge>
        ),
      sortable: false,
      width: "100px",
    },
    {
      name: "Referred Date",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "N/A",
      sortable: false,
      width: "200px",
    },
  ];

  // Filter out users with zero referral count
  const filteredSummary = (referralSummary || []).filter(
    (user) => (user.referralCount || 0) > 0,
  );

  const stats = referralStats || {
    total: 0,
    active: 0,
    inactive: 0,
    newUsers: 0,
  };

  const selectedSummaryCard = (() => {
    if (!params.referralStatus) return "total";
    if (params.referralStatus === "active") return "active";
    if (params.referralStatus === "inactive") return "inactive";
    if (params.referralStatus === "new") return "new";
    return "total";
  })();

  const applySummaryFilter = (type) => {
    const next =
      type === "total"
        ? ""
        : type === "active"
          ? "active"
          : type === "inactive"
            ? "inactive"
            : "new";
    setParams((prev) => ({ ...prev, referralStatus: next, page: 1 }));
  };

  const renderSummaryValue = (value) => {
    if (loading) return <AdminLoadingSkeleton height={20} width={60} />;
    return value ?? 0;
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "N/A",
      sortable: true,
      sortField: "name",
      width: "250px",
      wrap: true,
    },
    {
      name: "Member ID",
      selector: (row) => row.memberId || "N/A",
      sortable: true,
      sortField: "memberId",
      width: "150px",
      wrap: true,
    },
    {
      name: "Phone",
      selector: (row) => row.phone || "N/A",
      sortable: true,
      sortField: "phone",
      width: "150px",
      wrap: true,
    },
    {
      name: "Count",
      selector: (row) => (
        <Button
          variant="link"
          className="p-0 text-primary"
          onClick={() => handleViewReferred(row)}
        >
          {row.referralCount || 0}
        </Button>
      ),
      sortable: true,
      sortField: "referralCount",
      width: "150px",
    },
    {
      name: "Status",
      selector: (row) => {
        if (row.status === 1 && row.isPaid) {
          return <Badge bg="success">Active</Badge>;
        }
        return <Badge bg="secondary">Inactive</Badge>;
      },
      sortable: false,
      width: "150px",
    },
    {
      name: "Created At",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "200px",
      wrap: true,
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Referral Analytics"
        crumbs={[{ name: "Referrals" }]}
      />

      <>
        <Row className="g-3 mb-3">
          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
                selectedSummaryCard === "total" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("total")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("total");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiUsers size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Total</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(stats.total)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
                selectedSummaryCard === "active" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("active")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("active");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiCheckCircle size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Active</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(stats.active)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
                selectedSummaryCard === "inactive" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("inactive")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("inactive");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiPauseCircle size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Inactive</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(stats.inactive)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--warning h-100 ${
                selectedSummaryCard === "new" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("new")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("new");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiUserPlus size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">New</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(stats.newUsers)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <ReferralFilters
          filterParams={params}
          onFilterChange={onFilterChange}
        />

        <div className="admin-table-shell">
          <CustomDataTable
            columns={columns}
            data={filteredSummary}
            count={pagination?.total || 0}
            params={params}
            setParams={setParams}
            pagination
            responsive
            striped={true}
            progressPending={loading}
            highlightOnHover
            persistTableHead={true}
            paginationServer
          />
        </div>
      </>

      <Modal
        show={showReferredModal}
        onHide={() => setShowReferredModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Referred Users - {selectedUser?.name} ({selectedUser?.memberId})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingReferred ? (
            <div className="text-center p-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : referredUsers.length === 0 ? (
            <p className="text-center text-muted">No referred users found</p>
          ) : (
            <CustomDataTable
              columns={referredUsersColumns}
              data={referredUsers}
              count={referredUsers.length}
              params={referredParams}
              setParams={setReferredParams}
              pagination={referredUsers.length > 10}
              responsive
              striped={true}
              highlightOnHover
              persistTableHead={true}
              paginationServer={false}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowReferredModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

ReferralSummary.propTypes = {
  referralSummary: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  referralStats: PropTypes.object,
  fetchReferralSummary: PropTypes.func.isRequired,
  fetchReferredUsers: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  referralSummary: state.adminReferral?.summary || [],
  pagination: state.adminReferral?.pagination || {},
  loading: state.adminReferral?.loading || false,
  referralStats: state.adminReferral?.stats || {},
});

export default connect(mapStateToProps, {
  fetchReferralSummary,
  fetchReferredUsers,
})(ReferralSummary);
