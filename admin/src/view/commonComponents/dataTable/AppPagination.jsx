import React from "react";
import { Dropdown, Row, Col } from "react-bootstrap";

import * as Constants from "@src/constants/index";
import { PaginationControl } from "react-bootstrap-pagination-control";

const AppPagination = ({
  params,
  setParams,
  count,
  rowsPerPage,
  rowCount,
  currentPage,
  onChangeRowsPerPage,
  onChangePage,
}) => {
  const limit = Number(params?.limit ?? rowsPerPage ?? Constants.PAGE_SIZE_OPTIONS[0]?.page ?? 10);
  const page = Number(params?.page ?? currentPage ?? 1);
  const totalCount = Number(count ?? rowCount ?? 0);
  const hasServerPagination = Boolean(params && setParams);

  const onSizePerPageChange = (pageSize) => {
    if (hasServerPagination) {
      setParams({
        ...params,
        page: 1,
        limit: pageSize,
      });
      return;
    }

    if (onChangeRowsPerPage) {
      onChangeRowsPerPage(pageSize, 1);
    }
  };

  const setPage = (nextPage) => {
    if (hasServerPagination) {
      setParams({
        ...params,
        page: nextPage,
      });
      return;
    }

    if (onChangePage) {
      onChangePage(nextPage, totalCount);
    }
  };

  return (
    <div className="admin-pi-table-pagination-wrap">
      <Row className="admin-pi-table-pagination">
        <Col xs={12} md={5} className="admin-pi-table-pagination-meta">
          <Dropdown>
            <span className="admin-pi-pagination-label">Records per page</span>
            <Dropdown.Toggle variant="outline-primary" size="sm" id="records-per-page">
              {limit}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {Constants.PAGE_SIZE_OPTIONS.map((option, k) => (
                <React.Fragment key={k}>
                  <Dropdown.Item
                    key={option.text}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSizePerPageChange(option.page);
                    }}
                  >
                    {option.text}
                  </Dropdown.Item>
                </React.Fragment>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs={12} md={7} className="admin-pi-table-pagination-controller">
          <PaginationControl
            page={page}
            between={1}
            total={totalCount}
            limit={limit}
            changePage={setPage}
            ellipsis={1}
            next
            last
          />
        </Col>
      </Row>
    </div>
  );
};

export default AppPagination;
