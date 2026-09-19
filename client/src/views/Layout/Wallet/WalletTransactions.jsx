import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { TbFilter, TbArrowDownRight, TbArrowUpRight } from "react-icons/tb";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getWalletTransactions } from "@src/actions/walletActions";

const defaultParams = {
  page: 1,
  limit: 20,
  walletKey: "",
  type: "",
  direction: "",
  fromDate: "",
  toDate: "",
};

const WalletTransactions = ({
  transactions,
  pagination,
  totalCr,
  totalDr,
  loadingTransactions,
  getWalletTransactions,
  appliedParams,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(() =>
    appliedParams ? { ...defaultParams, ...appliedParams } : defaultParams,
  );

  useEffect(() => {
    if (
      !appliedParams ||
      (!appliedParams.walletKey &&
        !appliedParams.type &&
        !appliedParams.direction &&
        !appliedParams.fromDate &&
        !appliedParams.toDate)
    )
      return;
    setParams((prev) => {
      const next = { ...defaultParams, ...appliedParams, page: prev.page, limit: prev.limit };
      const same =
        prev.walletKey === next.walletKey &&
        prev.type === next.type &&
        prev.direction === next.direction &&
        prev.fromDate === next.fromDate &&
        prev.toDate === next.toDate;
      if (same) return prev;
      return next;
    });
  }, [appliedParams]);

  useEffect(() => {
    getWalletTransactions(params);
  }, [
    params.page,
    params.limit,
    params.walletKey,
    params.type,
    params.direction,
    params.fromDate,
    params.toDate,
  ]);

  const columns = [
    {
      name: "Wallet",
      selector: (row) => <span>{row.walletKey}</span>,
      width: "90px",
    },
    {
      name: "Type",
      selector: (row) => row.type,
      width: "160px",
    },
    {
      name: "CR/DR",
      selector: (row) => (
        <span
          className={
            row.direction === "CREDIT"
              ? "text-success fw-semibold"
              : "text-danger fw-semibold"
          }
        >
          {row.direction}
        </span>
      ),
      width: "100px",
    },
    {
      name: "Amount",
      selector: (row) => (
        <span
          className={
            row.direction === "CREDIT" ? "text-success" : "text-danger"
          }
        >
          {row.direction === "CREDIT" ? "+" : "-"}₹{" "}
          {Number(row.amount || 0).toFixed(2)}
        </span>
      ),
      width: "130px",
    },
    {
      name: "Description",
      selector: (row) => row.description || "—",
      wrap: true,
    },
    {
      name: "Date",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "—",
      width: "170px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Wallet Transactions"
        crumbs={[
          { name: "Wallet", path: "/user/wallet" },
          { name: "Transactions" },
        ]}
      />

      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 className="mb-1">Transaction History</h5>
            <p className="text-muted small mb-0">
              View and filter your wallet transactions.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/user/wallet/transactions/filters")}
            className="d-flex align-items-center gap-2"
          >
            <TbFilter size={18} />
            Filters
          </Button>
        </div>

        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={4}>
            <Card className="wallet-summary-card wallet-summary-cr h-100 border-0 overflow-hidden">
              <Card.Body className="d-flex align-items-center gap-3 py-3">
                <div className="wallet-summary-icon rounded-circle d-flex align-items-center justify-content-center">
                  <TbArrowDownRight size={24} className="text-success" />
                </div>
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Total Credit (CR)</small>
                  <span className="fs-5 fw-bold text-success">
                    ₹ {Number(totalCr || 0).toFixed(2)}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card className="wallet-summary-card wallet-summary-dr h-100 border-0 overflow-hidden">
              <Card.Body className="d-flex align-items-center gap-3 py-3">
                <div className="wallet-summary-icon rounded-circle d-flex align-items-center justify-content-center">
                  <TbArrowUpRight size={24} className="text-danger" />
                </div>
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Total Debit (DR)</small>
                  <span className="fs-5 fw-bold text-danger">
                    ₹ {Number(totalDr || 0).toFixed(2)}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {pagination?.totalCount != null && (
          <p className="text-muted mb-3">
            Total: <strong>{pagination.totalCount}</strong> transaction
            {pagination.totalCount !== 1 ? "s" : ""}
          </p>
        )}

        <CustomDataTable
          columns={columns}
          data={transactions || []}
          count={pagination?.totalCount ?? pagination?.total ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          progressPending={loadingTransactions}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

WalletTransactions.propTypes = {
  getWalletTransactions: PropTypes.func.isRequired,
  appliedParams: PropTypes.object,
};

const mapStateToProps = (state) => ({
  transactions: state.wallet?.transactions ?? [],
  pagination: state.wallet?.pagination ?? {},
  totalCr: state.wallet?.totalCr ?? "0.00",
  totalDr: state.wallet?.totalDr ?? "0.00",
  loadingTransactions: state.wallet?.loadingTransactions ?? false,
  appliedParams: state.wallet?.appliedParamsWalletTransactions ?? null,
});

export default connect(mapStateToProps, { getWalletTransactions })(
  WalletTransactions,
);
