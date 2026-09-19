import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Button, Badge, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { FiPlus } from "react-icons/fi";
import { FiPieChart, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { FaExchangeAlt, FaTrash } from "react-icons/fa";

import EPinFilters from "./EPinFilters";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";

import {
  fetchAdminEPins,
  deleteAdminEPin,
} from "@src/actions/adminEPinActions";
import { hasPermission } from "@src/utils/permissions";

const EPinList = ({
  loggedInAdmin,
  epins,
  pagination,
  totalCount,
  unusedCount,
  usedCount,
  loading,
  fetchAdminEPins,
  deleteAdminEPin,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    orderBy: "createdAt",
    ascending: "desc",
    memberId: "",
    status: "",
    search: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEpin, setSelectedEpin] = useState(null);

  useEffect(() => {
    fetchAdminEPins(params);
  }, [fetchAdminEPins, params]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: 1,
    }));
  };

  const selectedCardKey = useMemo(() => {
    if (!params.status) return "total";
    if (params.status === "unused") return "unused";
    if (params.status === "used") return "used";
    return "total";
  }, [params.status]);

  const applyStatusFilter = (key) => {
    const nextStatus =
      key === "total" ? "" : key === "unused" ? "unused" : "used";
    setParams((prev) => ({
      ...prev,
      status: nextStatus,
      page: 1,
    }));
  };

  const columns = [
    {
      name: "E-PIN",
      selector: (row) => <span className="epin-code-cell">{row.epinId}</span>,
      sortable: true,
      sortField: "epinId",
      width: "250px",
    },
    {
      name: "Owner",
      selector: (row) =>
        row.ownerId
          ? `${row.ownerId.name || "N/A"} (${row.ownerId.memberId || "N/A"})`
          : "N/A",
      sortable: false,
      width: "250px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge bg={row.status === "unused" ? "success" : "secondary"}>
          {row.status}
        </Badge>
      ),
      sortable: true,
      sortField: "status",
      width: "130px",
    },
    {
      name: "Used By",
      selector: (row) =>
        row.usedBy
          ? `${row.usedBy.name || "N/A"} (${row.usedBy.memberId || "N/A"})`
          : "-",
      sortable: false,
      width: "250px",
      wrap: true,
    },
    {
      name: "Created",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "190px",
      wrap: true,
    },
  ];

  const handleConfirmDelete = async (txnPassword) => {
    if (selectedEpin && txnPassword) {
      try {
        await deleteAdminEPin(selectedEpin.epinId, txnPassword);
        setShowDeleteModal(false);
        setSelectedEpin(null);
        fetchAdminEPins(params);
      } catch (err) {
        // Error handled in action
      }
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedEpin(null);
  };

  return (
    <Container className="epin-admin-page">
      <AppBreadCrumb
        pageTitle="E-PIN Management"
        crumbs={[{ name: "E-PINs" }]}
      />

      <Row className="g-2 g-md-3 mb-4 manage-wallets-summary">
        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
              selectedCardKey === "total" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("total")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("total");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiPieChart size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Total E-PINs</div>
                <div className="admin-stat-card__value">{totalCount}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
              selectedCardKey === "unused" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("unused")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("unused");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiTrendingUp size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Unused</div>
                <div className="admin-stat-card__value">{unusedCount}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
              selectedCardKey === "used" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("used")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("used");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiTrendingDown size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Used</div>
                <div className="admin-stat-card__value">{usedCount}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12} className="d-flex justify-content-center">
          <div className="manage-wallets-toolbar">
            {hasPermission(loggedInAdmin, "epins", "create") && (
              <Button
                type="button"
                variant="primary"
                className="manage-wallets-toolbar__btn"
                onClick={() => navigate("/admin/epins/add")}
              >
                <FiPlus size={16} className="me-1 flex-shrink-0" />
                <span className="d-none d-md-inline">Create E-PINs</span>
                <span className="d-inline d-md-none">Create</span>
              </Button>
            )}
            {hasPermission(loggedInAdmin, "epins", "edit") && (
              <>
                <Button
                  type="button"
                  variant="success"
                  className="manage-wallets-toolbar__btn"
                  onClick={() => navigate("/admin/epins/transfer-bulk")}
                >
                  <FaExchangeAlt size={16} className="me-1 flex-shrink-0" />
                  <span className="d-none d-md-inline">Bulk Transfer</span>
                  <span className="d-inline d-md-none">Transfer</span>
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="manage-wallets-toolbar__btn"
                  onClick={() => navigate("/admin/epins/delete-bulk")}
                >
                  <FaTrash size={16} className="me-1 flex-shrink-0" />
                  <span className="d-none d-md-inline">Bulk Delete</span>
                  <span className="d-inline d-md-none">Delete</span>
                </Button>
              </>
            )}
          </div>
        </Col>
      </Row>

      <>
        <EPinFilters
          filterParams={params}
          onFilterChange={onFilterChange}
          headerActions={
            <Button
              type="button"
              variant="outline-primary"
              className="users-filters-panel__add-btn"
              onClick={() => navigate("/admin/epins/transfers")}
            >
              Activity & transfers
            </Button>
          }
        />

        <CustomDataTable
          columns={columns}
          data={epins || []}
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
      </>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={handleCloseDeleteModal}
        handleConfirm={handleConfirmDelete}
        title="Delete E-PIN"
        body={`Are you sure you want to delete E-PIN "${selectedEpin?.epinId || ""}"? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />
    </Container>
  );
};

EPinList.propTypes = {
  fetchAdminEPins: PropTypes.func.isRequired,
  deleteAdminEPin: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  epins: state.adminEPin?.epins || [],
  pagination: state.adminEPin?.pagination || {},
  totalCount: state.adminEPin?.totalCount || 0,
  unusedCount: state.adminEPin?.unusedCount || 0,
  usedCount: state.adminEPin?.usedCount || 0,
  loading: state.adminEPin?.loading || false,
  loggedInAdmin: state.adminAuth?.admin,
});

export default connect(mapStateToProps, {
  fetchAdminEPins,
  deleteAdminEPin,
})(EPinList);
