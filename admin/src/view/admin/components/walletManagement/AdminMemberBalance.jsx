import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Container, Card } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import {
  getWalletTypes,
  getMemberBalance,
} from "@src/actions/adminWalletManagementActions";
import WalletMemberBalanceFilters from "./WalletMemberBalanceFilters";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";
import { FiPieChart, FiUsers } from "react-icons/fi";

const AdminMemberBalance = ({
  adminWalletManagement,
  getWalletTypes,
  getMemberBalance,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    memberId: "",
    fromDate: "",
    toDate: "",
    walletKey: "MAIN",
  });

  useEffect(() => {
    getWalletTypes();
  }, [getWalletTypes]);

  useEffect(() => {
    getMemberBalance(params);
  }, [
    params.page,
    params.limit,
    params.memberId,
    params.fromDate,
    params.toDate,
    params.walletKey,
  ]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const summary = adminWalletManagement?.memberBalance?.summary;
  const data = adminWalletManagement?.memberBalance?.data || [];
  const pagination = adminWalletManagement?.memberBalance?.pagination;
  const loading = adminWalletManagement?.loadingMemberBalance;
  const walletTypesMainClubs =
    adminWalletManagement?.walletTypesMainClubs ||
    adminWalletManagement?.walletTypes ||
    [];

  const firstClubKey = useMemo(() => {
    const club = (walletTypesMainClubs || []).find(
      (w) => w.key && w.key !== "MAIN",
    );
    return club?.key || "MAIN";
  }, [walletTypesMainClubs]);

  const isMainSelected = params.walletKey === "MAIN";

  const renderCardNumber = (value) => {
    if (loading) return <AdminLoadingSkeleton height={20} width={60} />;
    return value;
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      width: "150px",
    },
    { name: "Name", selector: (row) => row.userName || "-", width: "180px" },
    { name: "Type", selector: (row) => row.walletName || "-", width: "120px" },
    {
      name: "Balance",
      selector: (row) => "Rs. " + (row.availableBalance || "0"),
      width: "140px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Member Balance"
        crumbs={[{ name: "Member Balance" }]}
      />

      <>
        <Row className="g-2 g-md-3 mb-3 manage-wallets-summary">
          <Col xs={6} md={6}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
                isMainSelected ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => onFilterChange({ walletKey: "MAIN" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFilterChange({ walletKey: "MAIN" });
                }
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiUsers size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Total Records</div>
                  <div className="admin-stat-card__value">
                    {renderCardNumber(summary?.totalRecords ?? 0)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} md={6}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
                !isMainSelected ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => onFilterChange({ walletKey: firstClubKey })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFilterChange({ walletKey: firstClubKey });
                }
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiPieChart size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">
                    Total Available Balance
                  </div>
                  <div className="admin-stat-card__value">
                    {loading ? (
                      <AdminLoadingSkeleton height={20} width={60} />
                    ) : (
                      `₹${summary?.totalAvailableBalance ?? "0"}`
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <WalletMemberBalanceFilters
          filterParams={params}
          onFilterChange={onFilterChange}
          walletTypes={walletTypesMainClubs}
        />

        <div className="admin-table-shell">
          <CustomDataTable
            columns={columns}
            data={data}
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
      </>
    </Container>
  );
};

AdminMemberBalance.propTypes = {
  adminWalletManagement: PropTypes.object,
  getWalletTypes: PropTypes.func.isRequired,
  getMemberBalance: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminWalletManagement: state.adminWalletManagement,
});

export default connect(mapStateToProps, {
  getWalletTypes,
  getMemberBalance,
})(AdminMemberBalance);
