import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Container, Card } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { format, parseISO } from "date-fns";
import { getWalletTypes, getTransferReport } from "@src/actions/adminWalletManagementActions";
import WalletTransferReportFilters from "./WalletTransferReportFilters";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";
import { FiPieChart, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { formatIndianNumber } from "@src/utils/helper";

const AdminTransferReport = ({
  adminWalletManagement,
  getWalletTypes,
  getTransferReport,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    fromMemberId: "",
    toMemberId: "",
    walletKey: "",
    transferType: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    getWalletTypes();
  }, [getWalletTypes]);

  useEffect(() => {
    getTransferReport(params);
  }, [
    params.page,
    params.limit,
    params.fromMemberId,
    params.toMemberId,
    params.walletKey,
    params.transferType,
    params.fromDate,
    params.toDate,
  ]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const { data, pagination } = adminWalletManagement?.transferReport || {};
  const summary = adminWalletManagement?.transferReport?.summary || {
    totalTransfers: 0,
    totalAmount: "0",
    totalUserTransferAmount: "0",
    totalAdminTransferAmount: "0",
  };
  const walletTypesMainClubs =
    adminWalletManagement?.walletTypesMainClubs ||
    adminWalletManagement?.walletTypes ||
    [];
  const loading = adminWalletManagement?.loadingTransferReport;

  const formatMoney = (raw) => {
    if (raw == null || raw === "") return "0";
    const n = parseFloat(String(raw));
    if (Number.isNaN(n)) return String(raw);
    return formatIndianNumber(n);
  };

  const renderSummaryValue = (value) => {
    if (loading) return <AdminLoadingSkeleton height={20} width={60} />;
    return `₹${formatMoney(value)}`;
  };

  const selectedSummaryCard = (() => {
    if (!params.transferType) return "total";
    if (params.transferType === "User Transfer") return "user";
    if (params.transferType === "Admin Transfer") return "admin";
    return null;
  })();

  const applySummaryFilter = (type) => {
    const nextType =
      type === "total"
        ? ""
        : type === "user"
          ? "User Transfer"
          : type === "admin"
            ? "Admin Transfer"
            : "";
    setParams((prev) => ({ ...prev, transferType: nextType, page: 1 }));
  };

  const columns = [
    {
      name: "From User",
      selector: (row) => row.fromUser || "-",
      width: "250px",
      wrap: true,
    },
    {
      name: "To User",
      selector: (row) => row.toUser || "-",
      width: "250px",
      wrap: true,
    },
    { name: "Type", selector: (row) => row.walletType || "-", width: "150px" },
    { name: "Amount", selector: (row) => `₹${row.amount || "0"}`, width: "150px" },
    { name: "T-Type", selector: (row) => row.transferType || "-", width: "150px" },
    {
      name: "Activated",
      selector: (row) => (row.activationTriggered ? "Yes" : "No"),
      width: "150px",
    },
    {
      name: "Date & Time",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      width: "250px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb pageTitle="Transfer Report" crumbs={[{ name: "Transfer Report" }]} />

      <Row className="g-2 g-md-3 mb-3 manage-wallets-summary">
        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
              selectedSummaryCard === "total" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applySummaryFilter("total")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applySummaryFilter("total");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiPieChart size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Total Transfer Amount</div>
                <div className="admin-stat-card__value">
                  {renderSummaryValue(summary?.totalAmount ?? "0")}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
              selectedSummaryCard === "user" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applySummaryFilter("user")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applySummaryFilter("user");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiTrendingUp size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">User Transfer Amount</div>
                <div className="admin-stat-card__value">
                  {renderSummaryValue(summary?.totalUserTransferAmount ?? "0")}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={4} md={4}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
              selectedSummaryCard === "admin" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applySummaryFilter("admin")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applySummaryFilter("admin");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiTrendingDown size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Admin Transfer Amount</div>
                <div className="admin-stat-card__value">
                  {renderSummaryValue(summary?.totalAdminTransferAmount ?? "0")}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <WalletTransferReportFilters
        filterParams={{
          fromMemberId: params.fromMemberId,
          toMemberId: params.toMemberId,
          walletKey: params.walletKey,
          transferType: params.transferType,
          fromDate: params.fromDate,
          toDate: params.toDate,
        }}
        onFilterChange={onFilterChange}
        walletTypes={walletTypesMainClubs}
      />

      <div className="admin-table-shell">
        <CustomDataTable
          columns={columns}
          data={data || []}
          count={pagination?.totalCount || 0}
          params={{
            ...params,
            limit: params.limit || 20,
            page: params.page || 1,
            orderBy: params.orderBy || "createdAt",
            ascending: params.ascending !== false,
          }}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          paginationServer
          progressPending={loading}
          responsive
          striped={true}
          highlightOnHover
          persistTableHead={true}
        />
      </div>
    </Container>
  );
};

AdminTransferReport.propTypes = {
  adminWalletManagement: PropTypes.object,
  getWalletTypes: PropTypes.func.isRequired,
  getTransferReport: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminWalletManagement: state.adminWalletManagement,
});

export default connect(mapStateToProps, {
  getWalletTypes,
  getTransferReport,
})(AdminTransferReport);
