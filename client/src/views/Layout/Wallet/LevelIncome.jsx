import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getLevelIncome } from "@src/actions/walletActions";

const LevelIncome = ({
  transactions,
  pagination,
  loadingLevelIncome,
  getLevelIncome,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    getLevelIncome(params);
  }, [params.page, params.limit, params.fromDate, params.toDate]);

  const columns = [
    {
      name: "Commission",
      selector: (row) => (
        <span className="text-success fw-bold">
          +₹ {Number(row.amount || 0).toFixed(2)}
        </span>
      ),
      width: "120px",
    },
    {
      name: "Description",
      selector: (row) => row.description || "-",
      wrap: true,
    },
    {
      name: "Date",
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
        pageTitle="Level Income"
        crumbs={[
          { name: "Wallet", path: "/user/wallet" },
          { name: "Level Income" },
        ]}
      />

      <MainCard>
        <h5 className="mb-3">Level Commission Income</h5>
        <p className="text-muted small mb-3">
          Commission earned when your downline members complete registration.
        </p>
        <Row className="mb-3">
          <Col md={2}>
            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={params.fromDate}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    fromDate: e.target.value,
                    page: 1,
                  }))
                }
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={params.toDate}
                onChange={(e) =>
                  setParams((p) => ({ ...p, toDate: e.target.value, page: 1 }))
                }
              />
            </Form.Group>
          </Col>
        </Row>

        <CustomDataTable
          columns={columns}
          data={transactions || []}
          count={pagination?.totalCount ?? pagination?.total ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          progressPending={loadingLevelIncome}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

LevelIncome.propTypes = {
  getLevelIncome: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  transactions: state.wallet?.levelIncomeTransactions ?? [],
  pagination: state.wallet?.levelIncomePagination ?? {},
  loadingLevelIncome: state.wallet?.loadingLevelIncome ?? false,
});

export default connect(mapStateToProps, { getLevelIncome })(LevelIncome);
