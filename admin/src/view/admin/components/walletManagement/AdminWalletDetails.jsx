import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Container, Card } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { format, parseISO } from "date-fns";
import {
  getWalletTypes,
  getWalletDetails,
} from "@src/actions/adminWalletManagementActions";
import WalletTransactionFilters from "./WalletTransactionFilters";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";
import { FiPieChart, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { formatIndianNumber } from "@src/utils/helper";

const AdminWalletDetails = ({
  adminWalletManagement,
  getWalletTypes,
  getWalletDetails,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    memberId: "",
    walletKey: "",
    transactionType: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    getWalletTypes();
  }, [getWalletTypes]);

  useEffect(() => {
    getWalletDetails(params);
  }, [
    params.page,
    params.limit,
    params.memberId,
    params.walletKey,
    params.transactionType,
    params.fromDate,
    params.toDate,
  ]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const applySummaryFilter = (type) => {
    const nextTransactionType =
      type === "total"
        ? ""
        : type === "credit"
          ? "Credit"
          : type === "debit"
            ? "Debit"
            : "";
    setParams((prev) => ({
      ...prev,
      transactionType: nextTransactionType,
      page: 1,
    }));
  };

  const selectedSummaryCard = (() => {
    if (!params.transactionType) return "total";
    if (params.transactionType === "Credit") return "credit";
    if (params.transactionType === "Debit") return "debit";
    return null;
  })();

  const { summary, data, pagination } =
    adminWalletManagement?.walletDetails || {};
  const walletTypesMainClubs =
    adminWalletManagement?.walletTypesMainClubs ||
    adminWalletManagement?.walletTypes ||
    [];
  const loadingWalletDetails = adminWalletManagement?.loadingWalletDetails;

  const formatMoney = (raw) => {
    if (raw == null || raw === "") return "0";
    const n = parseFloat(String(raw));
    if (Number.isNaN(n)) return String(raw);
    return formatIndianNumber(n);
  };

  const renderSummaryValue = (value) => {
    if (loadingWalletDetails) {
      return <AdminLoadingSkeleton height={20} width={60} />;
    }
    return `₹${formatMoney(value)}`;
  };

  const totalAmount = useMemo(
    () => summary?.netBalance ?? "0",
    [summary?.netBalance],
  );

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      width: "150px",
    },
    { name: "Type", selector: (row) => row.walletType || "-", width: "150px" },
    {
      name: "Credit",
      selector: (row) => row.creditAmount ?? "-",
      width: "150px",
    },
    {
      name: "Debit",
      selector: (row) => row.debitAmount ?? "-",
      width: "150px",
    },
    { name: "Balance", selector: (row) => row.balance ?? "-", width: "150px" },
    {
      name: "Description",
      selector: (row) => row.description || "-",
      width: "350px",
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
        pageTitle="Wallet Details"
        crumbs={[{ name: "Wallet Details" }]}
      />

      <>
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
                  <div className="admin-stat-card__label">Total amount</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(totalAmount)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={4} md={4}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
                selectedSummaryCard === "credit" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("credit")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  applySummaryFilter("credit");
                }
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiTrendingUp size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Total CR</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(summary?.totalCredit ?? "0")}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={4} md={4}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--muted h-100 ${
                selectedSummaryCard === "debit" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("debit")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  applySummaryFilter("debit");
                }
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiTrendingDown size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Total DR</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(summary?.totalDebit ?? "0")}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <WalletTransactionFilters
          filterParams={{
            memberId: params.memberId,
            walletKey: params.walletKey,
            transactionType: params.transactionType,
            fromDate: params.fromDate,
            toDate: params.toDate,
          }}
          onFilterChange={onFilterChange}
          walletTypes={walletTypesMainClubs}
        />

        <CustomDataTable
          columns={columns}
          data={data || []}
          count={pagination?.totalCount || 0}
          params={{
            ...params,
            limit: params.limit || 20,
            page: params.page || 1,
            orderBy: "createdAt",
            ascending: params.ascending !== false,
          }}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          paginationServer
          progressPending={adminWalletManagement?.loadingWalletDetails}
          responsive
          striped={true}
          highlightOnHover
          persistTableHead={true}
        />
      </>
    </Container>
  );
};

AdminWalletDetails.propTypes = {
  adminWalletManagement: PropTypes.object,
  getWalletTypes: PropTypes.func.isRequired,
  getWalletDetails: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminWalletManagement: state.adminWalletManagement,
});

export default connect(mapStateToProps, {
  getWalletTypes,
  getWalletDetails,
})(AdminWalletDetails);
