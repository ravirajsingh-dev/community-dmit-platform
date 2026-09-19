import React from "react";
import DataTable from "react-data-table-component";
import BouncingLoader from "../Loaders/BouncingLoader";
import AppPagination from "../AppPagination";

const CustomPagination = ({ paginationComponentOptions }) => {
  const { count, params, setParams } = paginationComponentOptions || {};
  return <AppPagination count={count} params={params} setParams={setParams} />;
};

const CustomDataTable = ({ count, params, setParams, minHeight, ...rest }) => {
  const handleSort = (column, sortOrder) => {
    const sortField = column?.sortField || "";
    setParams({
      ...params,
      orderBy: sortField,
      ascending: sortOrder,
    });
  };

  return (
    <DataTable
      onSort={handleSort}
      sortServer
      pagination
      paginationComponent={CustomPagination}
      paginationComponentOptions={{ count, params, setParams }}
      progressComponent={<BouncingLoader minHeight={minHeight || "400px"} />}
      {...rest}
    />
  );
};

export default CustomDataTable;
