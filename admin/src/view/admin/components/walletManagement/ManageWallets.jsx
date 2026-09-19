import React, { useEffect, useMemo, useState } from "react";
import { Button, Container, Modal, Row, Col, Card } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { FiPlus, FiTrendingUp, FiTrendingDown, FiPieChart } from "react-icons/fi";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import AdminWalletAdjustForm from "./AdminWalletAdjustForm";
import AdminUserToUserTransferForm from "./AdminUserToUserTransferForm";
import AdminTransactionList from "./AdminTransactionList";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";
import { formatIndianNumber } from "@src/utils/helper";
import {
  getWalletTypes,
  getAdminTransactions,
  getTransferReport,
  getMemberBalance,
} from "@src/actions/adminWalletManagementActions";

const ManageWallets = ({
  getWalletTypes,
  getAdminTransactions,
  getTransferReport,
  getMemberBalance,
  adminWalletManagement,
}) => {
  const initialParams = {
    page: 1,
    limit: 20,
    memberId: "",
    walletKey: "",
    transactionType: "",
    fromDate: "",
    toDate: "",
  };

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [params, setParams] = useState(initialParams);

  const walletTypesMainClubs = adminWalletManagement?.walletTypesMainClubs || [];
  const walletTypesAll = adminWalletManagement?.walletTypes || [];
  const summary = adminWalletManagement?.adminTransactions?.summary || {
    totalCredit: "0",
    totalDebit: "0",
    totalAmount: "0",
  };
  const loadingTx = adminWalletManagement?.loadingAdminTransactions;

  const mainClubKeysStr = useMemo(
    () => walletTypesMainClubs.map((w) => w.key).join(","),
    [walletTypesMainClubs],
  );

  useEffect(() => {
    getWalletTypes();
  }, [getWalletTypes]);

  useEffect(() => {
    getAdminTransactions({
      page: params.page,
      limit: params.limit,
      memberId: params.memberId || undefined,
      walletKey: params.walletKey || undefined,
      transactionType: params.transactionType || undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    });
  }, [
    params.page,
    params.limit,
    params.memberId,
    params.walletKey,
    params.transactionType,
    params.fromDate,
    params.toDate,
  ]);

  useEffect(() => {
    if (!params.walletKey || !mainClubKeysStr) return;
    if (!walletTypesMainClubs.some((w) => w.key === params.walletKey)) {
      setParams((prev) => ({ ...prev, walletKey: "", page: 1 }));
    }
  }, [mainClubKeysStr, params.walletKey, walletTypesMainClubs]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const applySummaryFilter = (type) => {
    const nextType =
      type === "credit" ? "Credit" : type === "debit" ? "Debit" : "";
    setParams((prev) => ({
      ...prev,
      transactionType: nextType,
      page: 1,
    }));
  };

  const selectedSummaryCard = (() => {
    const t = params.transactionType;
    if (!t) return "total";
    if (t === "Credit") return "credit";
    if (t === "Debit") return "debit";
    return null;
  })();

  const formatMoney = (raw) => {
    if (raw == null || raw === "") return "0";
    const n = parseFloat(String(raw));
    if (Number.isNaN(n)) return String(raw);
    return formatIndianNumber(n);
  };

  const renderSummaryValue = (value) => {
    if (loadingTx) {
      return <AdminLoadingSkeleton height={20} width={60} />;
    }
    return `₹${formatMoney(value)}`;
  };

  return (
    <Container>
      <AppBreadCrumb pageTitle="Manage Wallets" crumbs={[{ name: "Manage Wallets" }]} />

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
                  {renderSummaryValue(summary.totalAmount)}
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
                  {renderSummaryValue(summary.totalCredit)}
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
                  {renderSummaryValue(summary.totalDebit)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12} className="d-flex justify-content-center">
          <div className="manage-wallets-toolbar">
            <Button
              type="button"
              variant="primary"
              className="manage-wallets-toolbar__btn"
              aria-label="Add Money To User Wallet"
              onClick={() => setShowAdjustModal(true)}
            >
              <FiPlus size={16} className="me-1 flex-shrink-0" aria-hidden />
              <span className="d-none d-md-inline">Add Money To User Wallet</span>
              <span className="d-inline d-md-none">Add money</span>
            </Button>
            <Button
              type="button"
              variant="outline-primary"
              className="manage-wallets-toolbar__btn"
              aria-label="Transfer User To User Wallet"
              onClick={() => setShowTransferModal(true)}
            >
              <span className="d-none d-md-inline">Transfer User To User Wallet</span>
              <span className="d-inline d-md-none">Transfer</span>
            </Button>
          </div>
        </Col>
      </Row>

      <AdminTransactionList
        data={adminWalletManagement?.adminTransactions?.data || []}
        count={adminWalletManagement?.adminTransactions?.pagination?.totalCount || 0}
        params={params}
        setParams={setParams}
        onFilterChange={onFilterChange}
        loading={adminWalletManagement?.loadingAdminTransactions}
        walletTypes={walletTypesMainClubs}
      />

      <Modal show={showAdjustModal} onHide={() => setShowAdjustModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Money To User Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AdminWalletAdjustForm
            walletTypes={walletTypesAll}
            onSuccess={() => {
              setShowAdjustModal(false);
              getAdminTransactions(params);
            }}
            onCancel={() => setShowAdjustModal(false)}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Transfer User To User Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AdminUserToUserTransferForm
            walletTypes={walletTypesAll}
            onSuccess={(result) => {
              setShowTransferModal(false);
              getAdminTransactions(params);
              if (result?.activationTriggered) {
                getTransferReport({});
                getMemberBalance({});
              }
            }}
            onCancel={() => setShowTransferModal(false)}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

ManageWallets.propTypes = {
  getWalletTypes: PropTypes.func.isRequired,
  getAdminTransactions: PropTypes.func.isRequired,
  getTransferReport: PropTypes.func.isRequired,
  getMemberBalance: PropTypes.func.isRequired,
  adminWalletManagement: PropTypes.object,
};

const mapStateToProps = (state) => ({
  adminWalletManagement: state.adminWalletManagement,
});

export default connect(mapStateToProps, {
  getWalletTypes,
  getAdminTransactions,
  getTransferReport,
  getMemberBalance,
})(ManageWallets);
