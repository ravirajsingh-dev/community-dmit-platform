import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import { VscEye } from "react-icons/vsc";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";

import { fetchAdminEPinTransfers } from "@src/actions/adminEPinActions";

const EPinTransfersList = ({
  transfers,
  transferPagination,
  loadingTransfers,
  fetchAdminEPinTransfers,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    activityType: "",
    memberId: "",
  });

  const activityTypeLabel = (row) => {
    const t = row.activityType || "transfer";
    if (t === "admin_create") return "Admin create";
    if (t === "admin_bulk_delete") return "Admin bulk delete";
    if (t === "admin_delete") return "Admin delete";
    if (row.transferredByAdmin) return "Admin transfer";
    return "Member transfer";
  };

  useEffect(() => {
    fetchAdminEPinTransfers(params);
  }, [fetchAdminEPinTransfers, params]);

  const columns = [
    {
      name: "Type",
      selector: (row) => activityTypeLabel(row),
      sortable: false,
      width: "150px",
      wrap: true,
    },
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
      name: "To / Member",
      selector: (row) => {
        if (row.toUser) {
          return `${row.toUser.name || "N/A"} (${row.toUser.memberId || "N/A"})`;
        }
        if (row.affectedUser) {
          return `${row.affectedUser.name || "N/A"} (${row.affectedUser.memberId || "N/A"})`;
        }
        return "-";
      },
      sortable: false,
      width: "200px",
      wrap: true,
    },
    {
      name: "Admin",
      selector: (row) =>
        row.adminId
          ? `${row.adminId.name || "N/A"} (${row.adminId.admin_id || row.adminId.email || "N/A"})`
          : "-",
      sortable: false,
      width: "180px",
      wrap: true,
    },
    {
      name: "Count",
      selector: (row) => row.count ?? 1,
      sortable: false,
      width: "100px",
    },
    {
      name: "Date",
      selector: (row) =>
        row.transferredAt
          ? format(parseISO(row.transferredAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: false,
      width: "200px",
    },
    {
      name: "Actions",
      width: "120px",
      cell: (row) => (
        <Button
          as={Link}
          to={`/admin/epins/transfers/${row._id}`}
          variant="primary"
          className="d-inline-flex align-items-center gap-1 justify-content-center"
          title="View E-PINs"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="E-PIN Activity & Transfer Audit"
        crumbs={[
          { name: "E-PINs", path: "/admin/epins" },
          { name: "Activity & transfers" },
        ]}
      />

      <>
        <div className="table-filter-section mb-3">
          <Row className="mb-3 g-2 align-items-end">
            <Col xs="12" md="3">
              <Form.Label className="small text-muted mb-1">Activity type</Form.Label>
              <Form.Select
                value={params.activityType || ""}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    page: 1,
                    activityType: e.target.value,
                  }))
                }
              >
                <option value="">All</option>
                <option value="transfer">Transfers only</option>
                <option value="admin_create">Admin create E-PIN</option>
                <option value="admin_bulk_delete">Admin bulk delete</option>
                <option value="admin_delete">Admin single delete</option>
              </Form.Select>
            </Col>
            <Col xs="12" md="3">
              <Form.Label className="small text-muted mb-1">Member ID (filter)</Form.Label>
              <Form.Control
                placeholder="Member ID"
                value={params.memberId || ""}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    page: 1,
                    memberId: e.target.value,
                  }))
                }
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col
              md="12"
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <h5>Activity & transfer log</h5>
                {transferPagination?.total > 0 && (
                  <p className="text-muted mb-0">
                    Total records: {transferPagination.total}
                  </p>
                )}
              </div>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/admin/epins")}
              >
                Back to E-PINs
              </Button>
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={transfers || []}
          count={transferPagination?.total || 0}
          params={params}
          setParams={setParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingTransfers}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </>
    </Container>
  );
};

EPinTransfersList.propTypes = {
  fetchAdminEPinTransfers: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  transfers: state.adminEPin?.transfers || [],
  transferPagination: state.adminEPin?.transferPagination || {},
  loadingTransfers: state.adminEPin?.loadingTransfers || false,
});

export default connect(mapStateToProps, {
  fetchAdminEPinTransfers,
})(EPinTransfersList);
