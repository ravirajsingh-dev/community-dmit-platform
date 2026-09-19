import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";

// icons
import { VscEye } from "react-icons/vsc";
import { RiDeleteBin5Line } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";
import { MdToggleOn, MdToggleOff } from "react-icons/md";

// custom imports
import SubAdminFilters from "./SubAdminFilters";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

import {
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  resetComponentStore,
} from "@actions/adminSubAdminActions";

import { handleTableChange as handleTableChangeHelper } from "@utils/helper";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import { isAdmin } from "@src/utils/helper";
import { getInitialSortingParams } from "@src/constants";

const SubAdminsList = ({
  loggedInAdmin,
  subAdminsList: { data, count },
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  loadingSubAdminsList,
  resetComponentStore,
  sortingParams,
}) => {
  const [onlyOnce, setOnce] = React.useState(true);
  const { page, limit } = sortingParams;

  const [subAdminParams, setSubAdminParams] = React.useState(() =>
    getInitialSortingParams({
      orderBy: "createdAt",
      ascending: "desc",
      filters: [],
    })
  );
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = React.useState(null);
  const navigate = useNavigate();

  const getStatusBadge = (status, isActive) => {
    if (!isActive || status === 2) {
      return <Badge bg="secondary">Inactive</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      sub_admin: "primary",
      staff: "info",
      manager: "warning",
    };
    const roleLabels = {
      sub_admin: "Sub Admin",
      staff: "Staff",
      manager: "Manager",
    };
    return (
      <Badge bg={roleColors[role] || "secondary"}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const columns = [
    {
      name: "Admin ID",
      selector: (row) => row.admin_id || "-",
      sortable: true,
      sortField: "admin_id",
      width: "130px",
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
      name: "Email",
      selector: (row) => row.email || "-",
      sortable: true,
      sortField: "email",
      width: "200px",
      wrap: true,
    },
    {
      name: "Plain Password (Admin Only)",
      selector: (row) => (
        <div className="d-flex align-items-center gap-2">
          <span className="font-monospace small">{row.passCopy || "-"}</span>
          {row.passCopy && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-primary"
              onClick={() => {
                navigator.clipboard.writeText(row.passCopy);
              }}
              title="Copy password"
            >
              📋
            </Button>
          )}
        </div>
      ),
      width: "200px",
      wrap: true,
    },
    {
      name: "Plain Txn Password (Admin Only)",
      selector: (row) => (
        <div className="d-flex align-items-center gap-2">
          <span className="font-monospace small">{row.txnPassCopy || "-"}</span>
          {row.txnPassCopy && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-primary"
              onClick={() => {
                navigator.clipboard.writeText(row.txnPassCopy);
              }}
              title="Copy transaction password"
            >
              📋
            </Button>
          )}
        </div>
      ),
      width: "200px",
      wrap: true,
    },
    {
      name: "Role",
      selector: (row) => getRoleBadge(row.role),
      sortable: true,
      sortField: "role",
      width: "120px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => getStatusBadge(row.status, row.isActive),
      sortable: true,
      sortField: "status",
      width: "120px",
      wrap: true,
    },
    {
      name: "Created By",
      selector: (row) =>
        row.createdBy?.name
          ? `${row.createdBy.name} (${row.createdBy.admin_id})`
          : "-",
      width: "200px",
      wrap: true,
    },
    {
      name: "Last Login",
      selector: (row) =>
        row.last_login
          ? format(parseISO(row.last_login), "dd/MM/yyyy, hh:mm a")
          : "Never",
      sortable: true,
      sortField: "last_login",
      width: "170px",
      wrap: true,
    },
    {
      name: "Created At",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "170px",
      wrap: true,
    },
    {
      name: "Actions",
      width: "200px",
      cell: (row) => (
        <div className="d-flex gap-2 align-items-center justify-content-center">
          <Link
            to={`/admin/sub-admins/edit/${row._id}`}
            title="View/Edit Sub-Admin"
            className="text-primary"
          >
            <VscEye size={20} />
          </Link>
          <Button
            variant="link"
            className="text-primary p-0"
            onClick={() => {
              setSelectedSubAdmin(row);
              setShowStatusModal(true);
            }}
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <MdToggleOn size={24} />
            ) : (
              <MdToggleOff size={24} />
            )}
          </Button>
          <Button
            variant="link"
            className="text-danger p-0"
            onClick={() => {
              setSelectedSubAdmin(row);
              setShowDeleteModal(true);
            }}
            title="Delete Sub-Admin"
          >
            <RiDeleteBin5Line size={20} />
          </Button>
        </div>
      ),
    },
  ];

  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInAdmin || !isAdmin(loggedInAdmin)) return;

    getSubAdminsList(subAdminParams);
  }, [getSubAdminsList, subAdminParams, resetComponentStore, loggedInAdmin]);

  const searchFields = [
    { name: "name", type: "String" },
    { name: "admin_id", type: "String" },
    { name: "email", type: "String" },
  ];

  const handleTableChange = (type, searchText) => {
    handleTableChangeHelper(
      type,
      searchText,
      sortingParams,
      setSubAdminParams,
      searchFields
    );
  };

  const onFilterChange = (newParams) => {
    setSubAdminParams((params) => ({
      ...params,
      ...newParams,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleConfirmDelete = (txnPassword) => {
    if (selectedSubAdmin && txnPassword) {
      deleteSubAdmin(selectedSubAdmin._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedSubAdmin(null);
    }
  };

  const handleConfirmStatusToggle = (txnPassword) => {
    if (selectedSubAdmin && txnPassword) {
      toggleSubAdminStatus(selectedSubAdmin._id, txnPassword);
      setShowStatusModal(false);
      setSelectedSubAdmin(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSubAdmin(null);
  };

  // Only admins can access this page
  if (!loggedInAdmin || !isAdmin(loggedInAdmin)) {
    return (
      <Container>
        <MainCard>
          <div className="text-center py-5">
            <h5>Access Denied</h5>
            <p className="text-muted">Only full admins can manage sub-admins.</p>
          </div>
        </MainCard>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Sub-Admins"
        crumbs={[{ name: "Sub-Admins" }]}
      />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="mb-3">
            <Col
              md="12"
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <h5>Sub-Admin Filters</h5>
                {count > 0 && (
                  <p className="text-muted mb-0">Total Sub-Admins: {count}</p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => navigate("/admin/sub-admins/create")}
              >
                <FiPlus className="me-2" />
                Add Sub-Admin
              </Button>
            </Col>
          </Row>
          <SubAdminFilters
            filterParams={subAdminParams}
            onFilterChange={onFilterChange}
          />
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={subAdminParams}
          setParams={setSubAdminParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingSubAdminsList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={handleCloseDeleteModal}
        handleConfirm={handleConfirmDelete}
        title="Delete Sub-Admin"
        body={`Are you sure you want to delete sub-admin "${selectedSubAdmin?.name || ""}" (${selectedSubAdmin?.admin_id || ""})? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showStatusModal}
        handleClose={() => {
          setShowStatusModal(false);
          setSelectedSubAdmin(null);
        }}
        handleConfirm={handleConfirmStatusToggle}
        title={selectedSubAdmin?.isActive ? "Deactivate Sub-Admin" : "Activate Sub-Admin"}
        body={`Are you sure you want to ${selectedSubAdmin?.isActive ? "deactivate" : "activate"} sub-admin "${selectedSubAdmin?.name || ""}" (${selectedSubAdmin?.admin_id || ""})? Please enter your transaction password to confirm.`}
        submitBtnText={selectedSubAdmin?.isActive ? "Deactivate" : "Activate"}
      />
    </Container>
  );
};

SubAdminsList.propTypes = {
  getSubAdminsList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  subAdminsList: state.adminSubAdmins.subAdminsList,
  loadingSubAdminsList: state.adminSubAdmins.loadingSubAdminsList,
  sortingParams: state.adminSubAdmins.sortingParams,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getSubAdminsList,
  deleteSubAdmin,
  toggleSubAdminStatus,
  resetComponentStore,
})(SubAdminsList);
