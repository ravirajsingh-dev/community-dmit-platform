import React from "react";
import { PropTypes } from "prop-types";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { format, parseISO } from "date-fns";
import WalletTransactionFilters from "./WalletTransactionFilters";

const AdminTransactionList = ({
  data,
  count,
  params,
  setParams,
  onFilterChange,
  loading,
  walletTypes,
}) => {
  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      width: "150px",
      wrap: true,
    },
    {
      name: "Wallet Type",
      selector: (row) => row.walletType || "-",
      width: "150px",
    },
    {
      name: "Credit",
      selector: (row) => row.credit,
      width: "150px",
    },
    {
      name: "Debit",
      selector: (row) => row.debit,
      width: "150px",
    },
    {
      name: "Description",
      selector: (row) => row.description || "-",
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
    <>
      <WalletTransactionFilters
        filterParams={params}
        onFilterChange={onFilterChange}
        walletTypes={walletTypes}
      />

      <div className="admin-table-shell">
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
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
          striped
          highlightOnHover
          persistTableHead={true}
        />
      </div>
    </>
  );
};

AdminTransactionList.propTypes = {
  data: PropTypes.array,
  count: PropTypes.number,
  params: PropTypes.object,
  setParams: PropTypes.func,
  onFilterChange: PropTypes.func,
  loading: PropTypes.bool,
  walletTypes: PropTypes.array,
};

export default AdminTransactionList;
