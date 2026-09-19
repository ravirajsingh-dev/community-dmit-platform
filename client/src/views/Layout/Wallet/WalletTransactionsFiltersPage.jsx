import React, { useEffect } from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import WalletTransactionFilters from "./WalletTransactionFilters";
import { setAppliedParamsWalletTransactions } from "@src/actions/walletActions";
import { getWalletDetails } from "@src/actions/walletActions";

const WalletTransactionsFiltersPage = ({
  appliedParams,
  setAppliedParamsWalletTransactions,
  availableClubs,
  getWalletDetails,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    getWalletDetails();
  }, [getWalletDetails]);

  const defaultParams = {
    page: 1,
    limit: 20,
    walletKey: "",
    type: "",
    direction: "",
    fromDate: "",
    toDate: "",
  };

  const onFilterChange = (newParams) => {
    const merged = { ...defaultParams, ...newParams, page: 1 };
    setAppliedParamsWalletTransactions(merged);
    navigate("/user/wallet/transactions");
  };

  const walletOptions = [
    { clubKey: "MAIN", name: "Main" },
    ...(availableClubs || []).map((c) => ({
      clubKey: (c.clubKey || c.walletKey || "").trim().toUpperCase(),
      name: c.name || c.clubKey || c.walletKey || "",
    })),
  ].filter((c) => c.clubKey);

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Wallet Transaction Filters"
        crumbs={[
          { name: "Wallet", path: "/user/wallet" },
          { name: "Transactions", path: "/user/wallet/transactions" },
          { name: "Filters" },
        ]}
      />
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Wallet Transaction Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on the
              Wallet Transactions page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsWalletTransactions(null);
              navigate("/user/wallet/transactions");
            }}
          >
            Back to Transactions
          </Button>
        </div>

        <div className="table-filter-section">
          <WalletTransactionFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
            walletOptions={walletOptions}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.wallet?.appliedParamsWalletTransactions ?? null,
  availableClubs: state.wallet?.availableClubs ?? [],
});

const mapDispatchToProps = {
  setAppliedParamsWalletTransactions,
  getWalletDetails,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletTransactionsFiltersPage);
