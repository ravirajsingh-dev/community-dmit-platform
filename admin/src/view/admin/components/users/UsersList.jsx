import React from "react";
import { Button, Row, Col, Container, Badge, Card } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";

import {
  FiCheckCircle,
  FiPauseCircle,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

// custom imports
import UserFilters from "./UserFilters";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";

import {
  getUsersList,
  userStatusAction,
  resetComponentStore,
} from "@actions/adminUserActions";

import { handleTableChange as handleTableChangeHelper } from "@utils/helper";
import { UserStatuses } from "@src/constants/CustomSelectValues";
import { hasPermission } from "@src/utils/permissions";
import { getInitialSortingParams } from "@src/constants";

const UsersList = ({
  loggedInAdmin,
  usersList: { data, count, summary },
  getUsersList,
  userStatusAction,
  loadingUsersList,
  resetComponentStore,
  sortingParams,
}) => {
  const [onlyOnce, setOnce] = React.useState(true);
  const { page, limit } = sortingParams;

  const initialSortingParams = getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
  });

  const [userParams, setUserParams] = React.useState(initialSortingParams);
  const [showStatusActionModal, setShowStatusActionModal] =
    React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [selectedAction, setSelectedAction] = React.useState("");
  const navigate = useNavigate();
  const userSummary = summary || {
    active: 0,
    inactive: 0,
    newUsers: 0,
  };

  const applySummaryFilter = (type) => {
    const baseParams = {
      ...userParams,
      page: 1,
      memberId: null,
      phone: null,
      fromDate: null,
      toDate: null,
      isPaid: null,
    };

    if (type === "total") {
      setUserParams({
        ...baseParams,
        filters: [],
        query: {},
        status: null,
      });
      return;
    }

    const statusMap = {
      active: 1,
      inactive: 2,
      new: 4,
    };
    const statusValue = statusMap[type];
    if (!statusValue) return;

    setUserParams({
      ...baseParams,
      filters: ["status"],
      query: { status: { value: statusValue, type: "Number" } },
      status: String(statusValue),
    });
  };

  const selectedSummaryCard = (() => {
    const filters = Array.isArray(userParams.filters) ? userParams.filters : [];
    if (filters.length === 0) return "total";
    if (filters.length === 1 && filters[0] === "status") {
      const statusValue = userParams?.query?.status?.value;
      if (statusValue === 1) return "active";
      if (statusValue === 2) return "inactive";
      if (statusValue === 4) return "new";
    }
    return null;
  })();

  const renderSummaryValue = (value) => {
    if (loadingUsersList) {
      return <AdminLoadingSkeleton height={20} width={60} />;
    }
    return value;
  };

  const getStatusBadge = (status) => {
    const statusOption = UserStatuses.find((s) => s.value === status);
    const statusLabel = statusOption ? statusOption.label : "Unknown";
    let bgColor = "secondary";
    if (status === 1) bgColor = "success";
    else if (status === 2) bgColor = "secondary";
    else if (status === 3) bgColor = "info";
    else if (status === 4) bgColor = "danger";
    return <Badge bg={bgColor}>{statusLabel}</Badge>;
  };

  const isUserActive = (row) => row.status === 1 && row.isPaid === true;

  const getUserActions = (row) => {
    if (isUserActive(row)) {
      return ["deactivate"];
    }
    if (row.status === 2 || row.hasActivationDebit) {
      return ["force_activate"];
    }
    return ["activate", "force_activate"];
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => (row.memberId ? row.memberId : "-"),
      sortable: true,
      sortField: "memberId",
      width: "150px",
      wrap: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      sortField: "name",
      width: "180px",
      wrap: true,
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
      sortField: "phone",
      width: "130px",
      wrap: true,
    },
    {
      name: "Email",
      selector: (row) => row.email || "-",
      sortable: true,
      sortField: "email",
      width: "250px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => getStatusBadge(row.status),
      sortable: true,
      sortField: "status",
      width: "120px",
      wrap: true,
    },
    {
      name: "Paid",
      selector: (row) => (
        <Badge bg={row.isPaid ? "success" : "secondary"}>
          {row.isPaid ? "Yes" : "No"}
        </Badge>
      ),
      sortable: true,
      sortField: "isPaid",
      width: "100px",
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
    {
      name: "Actions",
      width: "330px",
      cell: (row) => (
        <div className="action-cluster">
          {hasPermission(loggedInAdmin, "users", "list") && (
            <Button
              as={Link}
              to={`/admin/users/edit/${row._id}`}
              variant="outline-secondary"
              size="sm"
              className="action-btn-sm"
              title="View/Edit User"
            >
              Edit
            </Button>
          )}
          {hasPermission(loggedInAdmin, "users", "edit") && (
            <>
              {getUserActions(row).includes("activate") && (
                <Button
                  variant="outline-success"
                  size="sm"
                  className="action-btn-sm"
                  onClick={() => {
                    setSelectedUser(row);
                    setSelectedAction("activate");
                    setShowStatusActionModal(true);
                  }}
                  title="Activate with distribution"
                >
                  Activate
                </Button>
              )}
              {getUserActions(row).includes("force_activate") && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="action-btn-sm"
                  onClick={() => {
                    setSelectedUser(row);
                    setSelectedAction("force_activate");
                    setShowStatusActionModal(true);
                  }}
                  title="Force activate without distribution"
                >
                  Force Active
                </Button>
              )}
              {getUserActions(row).includes("deactivate") && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="action-btn-sm"
                  onClick={() => {
                    setSelectedUser(row);
                    setSelectedAction("deactivate");
                    setShowStatusActionModal(true);
                  }}
                  title="Set user inactive"
                >
                  Inactive
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInAdmin) return;

    getUsersList(userParams);
  }, [getUsersList, userParams, resetComponentStore, loggedInAdmin]);

  const searchFields = [
    { name: "name", type: "String" },
    { name: "memberId", type: "String" },
    { name: "phone", type: "String" },
  ];

  const handleTableChange = (type, searchText) => {
    handleTableChangeHelper(
      type,
      searchText,
      sortingParams,
      setUserParams,
      searchFields,
    );
  };

  const onFilterChange = (newParams) => {
    setUserParams((params) => ({
      ...params,
      ...newParams,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleConfirmStatusAction = async (txnPassword) => {
    if (selectedUser && selectedAction && txnPassword) {
      const res = await userStatusAction(
        selectedUser._id,
        selectedAction,
        txnPassword,
      );
      if (res?.status) {
        getUsersList(userParams);
      }
      setShowStatusActionModal(false);
      setSelectedUser(null);
      setSelectedAction("");
    }
  };

  const handleCloseStatusActionModal = () => {
    setShowStatusActionModal(false);
    setSelectedUser(null);
    setSelectedAction("");
  };

  const getStatusActionModalText = () => {
    if (selectedAction === "activate") {
      return {
        title: "Activate User",
        body: `Activate "${selectedUser?.name || ""}" (${selectedUser?.memberId || ""}) with registration fee credit and level distribution? Please enter your transaction password to confirm.`,
        submitText: "Activate",
      };
    }
    if (selectedAction === "force_activate") {
      return {
        title: "Force Activate User",
        body: `Force activate "${selectedUser?.name || ""}" (${selectedUser?.memberId || ""}) without any credit/distribution? Please enter your transaction password to confirm.`,
        submitText: "Force Active",
      };
    }
    return {
      title: "Set User Inactive",
      body: `Set "${selectedUser?.name || ""}" (${selectedUser?.memberId || ""}) as inactive? Please enter your transaction password to confirm.`,
      submitText: "Set Inactive",
    };
  };

  const statusActionModalText = getStatusActionModalText();

  return (
    <Container>
      <AppBreadCrumb pageTitle="Users" crumbs={[{ name: "Users" }]} />

      <Row className="g-3 mb-3">
        <Col xs={6} sm={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--total ${
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
                  {renderSummaryValue(count || 0)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--success ${
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
                  {renderSummaryValue(userSummary.active)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--muted ${
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
                  {renderSummaryValue(userSummary.inactive)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--warning ${
              selectedSummaryCard === "new" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applySummaryFilter("new")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") applySummaryFilter("new");
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiUserPlus size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">New</div>
                <div className="admin-stat-card__value">
                  {renderSummaryValue(userSummary.newUsers)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <>
        <UserFilters
          filterParams={userParams}
          onFilterChange={onFilterChange}
          canCreate={hasPermission(loggedInAdmin, "users", "create")}
          onAddUser={() => navigate("/admin/users/add")}
        />

        <div className="admin-table-shell">
          <CustomDataTable
            columns={columns}
            data={data}
            count={count}
            params={userParams}
            setParams={setUserParams}
            pagination
            responsive
            striped={true}
            progressPending={loadingUsersList}
            highlightOnHover
            persistTableHead={true}
            paginationServer
          />
        </div>
      </>

      <VerificationConfirmModal
        show={showStatusActionModal}
        handleClose={handleCloseStatusActionModal}
        handleConfirm={handleConfirmStatusAction}
        title={statusActionModalText.title}
        body={statusActionModalText.body}
        submitBtnText={statusActionModalText.submitText}
      />
    </Container>
  );
};

UsersList.propTypes = {
  getUsersList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  usersList: state.adminUsers.usersList,
  loadingUsersList: state.adminUsers.loadingUsersList,
  sortingParams: state.adminUsers.sortingParams,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getUsersList,
  userStatusAction,
  resetComponentStore,
})(UsersList);
