import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import {
  TbWallet,
  TbExchange,
  TbArrowRight,
  TbArrowDownRight,
  TbReceipt,
  TbTrendingUp,
  TbBuildingBank,
} from "react-icons/tb";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import TransferModal from "./TransferModal";
import ClubTransferModal from "./ClubTransferModal";
import { getWithdrawalSettings } from "@src/actions/withdrawalActions";

import { getWalletDetails, getClubInfo } from "@src/actions/walletActions";

const WalletIndex = ({
  mainBalance,
  clubBalances,
  availableClubs,
  loadingDetails,
  loadingWithdrawalSettings,
  getWalletDetails,
  getClubInfo,
  withdrawalSettings,
}) => {
  const navigate = useNavigate();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showClubTransferModal, setShowClubTransferModal] = useState(false);

  useEffect(() => {
    getWalletDetails();
    getClubInfo();
    getWithdrawalSettings();
  }, [getWalletDetails, getClubInfo, getWithdrawalSettings]);

  if (loadingDetails) {
    return <BouncingLoader minHeight="320px" />;
  }

  const quickActions = [
    {
      id: "transfer",
      icon: TbExchange,
      title: "Transfer to Member",
      description: "Send money to another member",
      onClick: () => setShowTransferModal(true),
    },
    {
      id: "club-transfer",
      icon: TbArrowRight,
      title: "Club → Main",
      description: "Move balance from club to main",
      onClick: () => setShowClubTransferModal(true),
    },
    {
      id: "transactions",
      icon: TbReceipt,
      title: "Transactions",
      description: "View transaction history",
      onClick: () => navigate("/user/wallet/transactions"),
    },
    {
      id: "level-income",
      icon: TbTrendingUp,
      title: "Level Income",
      description: "View level income details",
      onClick: () => navigate("/user/wallet/level-income"),
    },
    {
      id: "withdrawal",
      icon: TbArrowDownRight,
      title: "Withdrawal",
      description: "Request payout from wallet",
      onClick: () => navigate("/user/wallet/withdrawal"),
      disabled:
        loadingWithdrawalSettings ||
        withdrawalSettings?.isWithdrawalEnabled === false,
    },
  ];

  return (
    <Container className="wallet-dashboard">
      <AppBreadCrumb
        pageTitle="Wallet"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Wallet" },
        ]}
      />

      <MainCard>
        {/* Hero: Main balance */}
        <div className="wallet-dashboard__hero mb-4">
          <div className="wallet-dashboard__hero-inner">
            <div className="wallet-dashboard__hero-icon">
              <TbWallet size={40} />
            </div>
            <div className="wallet-dashboard__hero-content">
              <span className="wallet-dashboard__hero-label">
                Available Balance
              </span>
              <span className="wallet-dashboard__hero-amount">
                ₹ {Number(mainBalance).toFixed(2)}
              </span>
            </div>
            <div className="wallet-dashboard__hero-shine" aria-hidden="true" />
          </div>
        </div>

        {/* Club balances */}
        <div className="wallet-dashboard__section">
          <h6 className="wallet-dashboard__section-title">
            <TbBuildingBank size={20} className="me-2" />
            Club Balances
          </h6>
          {(clubBalances || []).length === 0 ? (
            <div className="wallet-dashboard__empty-clubs">
              <span className="text-muted">No club balances yet</span>
            </div>
          ) : (
            <Row className="g-3">
              {(clubBalances || []).map((cb) => (
                <Col key={cb.clubKey} xs={12} sm={6} md={4}>
                  <div className="wallet-dashboard__hero h-100">
                    <div className="wallet-dashboard__hero-inner h-100">
                      <div className="wallet-dashboard__hero-icon">
                        <TbBuildingBank size={40} />
                      </div>
                      <div className="wallet-dashboard__hero-content">
                        <span className="wallet-dashboard__hero-label">
                          {cb.clubKey}
                        </span>
                        <span className="wallet-dashboard__hero-amount">
                          ₹ {Number(cb.balance).toFixed(2)}
                        </span>
                      </div>
                      <div
                        className="wallet-dashboard__hero-shine"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </div>

        {/* Quick actions */}
        <div className="wallet-dashboard__section wallet-dashboard__actions">
          <h6 className="wallet-dashboard__section-title mb-3">
            Quick Actions
          </h6>
          <Row className="g-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Col key={action.id} xs={12} sm={6} lg={3}>
                  <Card
                    className={`wallet-dashboard__action-card wallet-dashboard__action-card--primary h-100 border-0 ${
                      action.disabled
                        ? "wallet-dashboard__action-card--disabled"
                        : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-disabled={action.disabled ? "true" : "false"}
                    onClick={() => {
                      if (action.disabled) return;
                      action.onClick?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (action.disabled) return;
                        action.onClick?.();
                      }
                    }}
                  >
                    <Card.Body className="d-flex flex-column align-items-start gap-2 py-4">
                      <div className="wallet-dashboard__action-icon">
                        <Icon size={26} />
                      </div>
                      <h6 className="wallet-dashboard__action-title mb-0">
                        {action.title}
                      </h6>
                      <p className="wallet-dashboard__action-desc small text-muted mb-0">
                        {action.description}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </MainCard>

      <TransferModal
        show={showTransferModal}
        onHide={() => setShowTransferModal(false)}
      />
      <ClubTransferModal
        show={showClubTransferModal}
        onHide={() => setShowClubTransferModal(false)}
        availableClubs={availableClubs || []}
        clubBalances={clubBalances || []}
      />
    </Container>
  );
};

WalletIndex.propTypes = {
  getWalletDetails: PropTypes.func.isRequired,
  getClubInfo: PropTypes.func.isRequired,
  getWithdrawalSettings: PropTypes.func.isRequired,
  withdrawalSettings: PropTypes.object,
};

const mapStateToProps = (state) => ({
  mainBalance: state.wallet?.mainBalance ?? 0,
  clubBalances: state.wallet?.clubBalances ?? [],
  availableClubs: state.wallet?.availableClubs ?? [],
  loadingDetails: state.wallet?.loadingDetails ?? false,
  withdrawalSettings: state.withdrawal?.settings ?? null,
  loadingWithdrawalSettings: state.withdrawal?.loadingSettings ?? false,
});

export default connect(mapStateToProps, {
  getWalletDetails,
  getClubInfo,
  getWithdrawalSettings,
})(WalletIndex);
