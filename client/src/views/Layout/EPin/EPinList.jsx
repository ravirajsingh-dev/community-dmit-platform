import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Tab, Tabs } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { FaExchangeAlt, FaHistory } from "react-icons/fa";
import { TbCreditCard, TbStack, TbPackage, TbCircleCheck } from "react-icons/tb";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { initialSortingParams } from "@src/constants";
import NoRecordFound from "@src/views/Common/NotFound/NoRecordFound";
import { fetchUserEPins, fetchTransferReport } from "@src/actions/epinActions";
import { format, parseISO } from "date-fns";

const EPinList = ({ fetchUserEPins, fetchTransferReport }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("unused");
  const [params, setParams] = useState(initialSortingParams);
  const [transferParams, setTransferParams] = useState(initialSortingParams);
  const [data, setData] = useState({
    epins: [],
    pagination: {},
    totalCount: 0,
    unusedCount: 0,
    usedCount: 0,
  });
  const [transfers, setTransfers] = useState([]);
  const [transferPagination, setTransferPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [transferReportLoading, setTransferReportLoading] = useState(false);

  const loadEPins = async () => {
    setLoading(true);
    try {
      const result = await fetchUserEPins({
        page: params.page,
        limit: params.limit,
        status: activeTab === "all" ? undefined : activeTab,
      });
      setData(result);
    } catch (err) {
      setData({
        epins: [],
        pagination: {},
        totalCount: 0,
        unusedCount: 0,
        usedCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransferReport = async () => {
    setTransferReportLoading(true);
    try {
      const result = await fetchTransferReport(transferParams);
      setTransfers(result.transfers);
      setTransferPagination(result.pagination);
    } catch (err) {
      setTransfers([]);
    } finally {
      setTransferReportLoading(false);
    }
  };

  useEffect(() => {
    loadEPins();
  }, [params.page, params.limit, activeTab]);

  useEffect(() => {
    if (activeTab === "transfers") {
      loadTransferReport();
    }
  }, [activeTab, transferParams.page, transferParams.limit]);

  const handleTabSelect = (k) => {
    setActiveTab(k);
    setParams((p) => ({ ...p, page: 1 }));
  };

  const EpinCodeCell = ({ epinId }) => (
    <span className="epin-code">{epinId}</span>
  );

  const unusedColumns = [
    {
      name: "E-PIN",
      selector: (row) => <EpinCodeCell epinId={row.epinId} />,
      sortable: false,
      width: "250px",
    },
    {
      name: "Status",
      selector: () => (
        <span className="badge bg-success opacity-90">Unused</span>
      ),
      sortable: false,
      width: "100px",
    },
    {
      name: "Created",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: false,
      width: "200px",
    },
  ];

  const usedColumns = [
    {
      name: "E-PIN",
      selector: (row) => <EpinCodeCell epinId={row.epinId} />,
      sortable: false,
      width: "250px",
    },
    {
      name: "Status",
      selector: () => (
        <span className="badge bg-secondary opacity-90">Used</span>
      ),
      sortable: false,
      width: "100px",
    },
    {
      name: "Used By",
      selector: (row) =>
        row.usedBy
          ? `${row.usedBy.name || "N/A"} (${row.usedBy.memberId || "N/A"})`
          : "-",
      sortable: false,
      width: "200px",
    },
    {
      name: "Used At",
      selector: (row) =>
        row.usedAt ? format(parseISO(row.usedAt), "dd/MM/yyyy, hh:mm a") : "-",
      sortable: false,
      width: "200px",
    },
  ];

  const transferColumns = [
    {
      name: "From",
      selector: (row) =>
        row.fromUser
          ? `${row.fromUser.name || "N/A"} (${row.fromUser.memberId || "N/A"})`
          : "-",
      sortable: false,
      width: "200px",
      wrap: true,
    },
    {
      name: "To",
      selector: (row) =>
        row.toUser
          ? `${row.toUser.name || "N/A"} (${row.toUser.memberId || "N/A"})`
          : "-",
      sortable: false,
      width: "200px",
      wrap: true,
    },
    {
      name: "Count",
      selector: (row) => row.count ?? 1,
      sortable: false,
      width: "80px",
    },
    {
      name: "Date",
      selector: (row) =>
        row.transferredAt
          ? format(parseISO(row.transferredAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: false,
      width: "150px",
    },
  ];

  const dataTableProps = {
    pagination: true,
    responsive: true,
    striped: true,
    highlightOnHover: true,
    persistTableHead: true,
    paginationServer: true,
  };

  return (
    <Container className="py-4 epin-page">
      <AppBreadCrumb
        title="E-PIN Management"
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "E-PINs" },
        ]}
      />
      <MainCard className="mb-4">
        {/* Hero: mini cards (Total, Unused, Used) + Transfer by Count */}
        <div className="epin-hero">
          <div className="epin-hero-inner">
            <div className="epin-hero-cards">
              <div className="epin-mini-card epin-mini-card--total">
                <span className="epin-mini-card__icon">
                  <TbStack size={20} />
                </span>
                <div className="epin-mini-card__text">
                  <span className="epin-mini-card__label">Total</span>
                  <span className="epin-mini-card__value">{data.totalCount}</span>
                </div>
              </div>
              <div className="epin-mini-card epin-mini-card--unused">
                <span className="epin-mini-card__icon">
                  <TbPackage size={20} />
                </span>
                <div className="epin-mini-card__text">
                  <span className="epin-mini-card__label">Unused</span>
                  <span className="epin-mini-card__value">{data.unusedCount}</span>
                </div>
              </div>
              <div className="epin-mini-card epin-mini-card--used">
                <span className="epin-mini-card__icon">
                  <TbCircleCheck size={20} />
                </span>
                <div className="epin-mini-card__text">
                  <span className="epin-mini-card__label">Used</span>
                  <span className="epin-mini-card__value">{data.usedCount}</span>
                </div>
              </div>
            </div>
            <div className="epin-hero-actions ms-auto">
              <Button
                variant="success"
                size="sm"
                onClick={() => navigate("/user/epin/transfer")}
                disabled={!data.unusedCount || data.unusedCount < 1}
                className="epin-hero-btn d-inline-flex align-items-center gap-2"
              >
                <FaExchangeAlt /> Transfer E-Pins
              </Button>
            </div>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onSelect={handleTabSelect}
          className="epin-tabs gap-2"
        >
          <Tab eventKey="unused" title={`Unused (${data.unusedCount})`}>
            {data.epins.length === 0 && !loading ? (
              <NoRecordFound message="No unused E-PINs" />
            ) : (
              <CustomDataTable
                columns={unusedColumns}
                data={data.epins}
                count={data.pagination?.total || 0}
                params={params}
                setParams={setParams}
                progressPending={loading}
                {...dataTableProps}
              />
            )}
          </Tab>

          <Tab eventKey="used" title={`Used (${data.usedCount})`}>
            {data.epins.length === 0 && !loading ? (
              <NoRecordFound message="No used E-PINs" />
            ) : (
              <CustomDataTable
                columns={usedColumns}
                data={data.epins}
                count={data.pagination?.total || 0}
                params={params}
                setParams={setParams}
                progressPending={loading}
                {...dataTableProps}
              />
            )}
          </Tab>

          <Tab eventKey="transfers" title="Transfer History">
            <div className="epin-tab-actions d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={loadTransferReport}
                disabled={transferReportLoading}
                className="d-inline-flex align-items-center gap-2"
              >
                <FaHistory /> Refresh
              </Button>
            </div>
            {transfers.length === 0 && !transferReportLoading ? (
              <NoRecordFound message="No transfer history" />
            ) : (
              <CustomDataTable
                columns={transferColumns}
                data={transfers}
                count={transferPagination?.total || 0}
                params={transferParams}
                setParams={setTransferParams}
                progressPending={transferReportLoading}
                {...dataTableProps}
              />
            )}
          </Tab>
        </Tabs>
      </MainCard>
    </Container>
  );
};

EPinList.propTypes = {
  fetchUserEPins: PropTypes.func.isRequired,
  fetchTransferReport: PropTypes.func.isRequired,
};

export default connect(null, {
  fetchUserEPins,
  fetchTransferReport,
})(EPinList);
