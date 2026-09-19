import React from "react";
import DataTable from "react-data-table-component";

import AppPagination from "./AppPagination";
import BouncingLoader from "@src/view/spinners/BouncingLoader";

/**
 * CustomDataTable - A reusable data table component with pagination, sorting, and loading states
 * 
 * Props:
 * @param {number} count - Total number of records for pagination
 * @param {object} params - Object containing pagination and sorting params (page, limit, orderBy, ascending)
 * @param {function} setParams - Function to update params state
 * @param {string} minHeight - Minimum height for the loading spinner (default: "400px")
 * @param {...any} props - All other props are passed through to the underlying DataTable component
 * 
 * Features:
 * - Server-side sorting via sortServer and onSort
 * - Custom pagination component (AppPagination)
 * - Custom loading spinner (BouncingLoader)
 * - Styled via SCSS classes
 */
function CustomDataTable(props) {
  const { count, params, setParams, minHeight } = props;

  /**
   * Handles column sorting
   * Updates params with the sort field and order
   */
  const handleSort = (column, sortOrder) => {
    const sortField = column && column.sortField ? column.sortField : "";

    setParams({
      ...params,
      orderBy: sortField,
      ascending: sortOrder,
    });
  };

  return (
    <DataTable
      pagination
      paginationComponent={(paginationProps) => (
        <AppPagination
          count={count}
          params={params}
          setParams={setParams}
          {...paginationProps}
        />
      )}
      onSort={handleSort}
      sortServer
      progressComponent={
        <BouncingLoader minHeight={`${minHeight ? minHeight : "400px"}`} />
      }
      {...props}
    />
  );
}

export default CustomDataTable;
