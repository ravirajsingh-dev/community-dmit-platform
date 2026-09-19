import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Badge } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import { getInitialSortingParams } from "@src/constants";
import { fetchAdminEPinTransferDetails } from "@src/actions/adminEPinActions";

const buildActivitySummary = (t) => {
  if (!t) return "";
  const type = t.activityType || "transfer";
  const when = t.transferredAt
    ? format(parseISO(t.transferredAt), "dd/MM/yyyy, hh:mm a")
    : "-";
  const admin =
    t.adminId &&
    `${t.adminId.name || "Admin"} (${t.adminId.admin_id || t.adminId.email || "—"})`;
  if (type === "admin_create") {
    const m = t.toUser;
    return `Created ${t.count} E-PIN(s) for ${m?.name || "—"} (${m?.memberId || "—"}) on ${when}${admin ? ` · By ${admin}` : ""}`;
  }
  if (type === "admin_bulk_delete" || type === "admin_delete") {
    const m = t.affectedUser;
    return `Removed ${t.count} unused E-PIN(s) from ${m?.name || "—"} (${m?.memberId || "—"}) on ${when}${admin ? ` · By ${admin}` : ""}`;
  }
  const from = t.fromUser;
  const to = t.toUser;
  return `From ${from?.name || "—"} (${from?.memberId || "—"}) → ${to?.name || "—"} (${to?.memberId || "—"}) on ${when}${
    t.transferredByAdmin && admin ? ` · By ${admin}` : ""
  }`;
};

const EPinTransferDetails = ({ fetchAdminEPinTransferDetails }) => {
  const navigate = useNavigate();
  const { transferId } = useParams();
  const [transfer, setTransfer] = useState(null);
  const [epins, setEpins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState(() => getInitialSortingParams());

  useEffect(() => {
    const load = async () => {
      if (!transferId) return;
      setLoading(true);
      try {
        const result = await fetchAdminEPinTransferDetails(transferId);
        setTransfer(result.transfer);
        setEpins(result.epins || []);
      } catch (err) {
        setTransfer(null);
        setEpins([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [transferId, fetchAdminEPinTransferDetails]);

  const columns = [
    {
      name: "E-PIN",
      selector: (row) => (
        <span className="epin-code-cell">{row.epinId || "-"}</span>
      ),
      sortable: false,
      width: "300px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => {
        const s = row.status || "-";
        const bg =
          s === "unused" ? "success" : s === "used" ? "secondary" : "warning";
        return <Badge bg={bg}>{s}</Badge>;
      },
      sortable: false,
      width: "100px",
    },
  ];

  if (!transferId) {
    navigate("/admin/epins/transfers");
    return null;
  }

  return (
    <Container className="epin-admin-page">
      <AppBreadCrumb
        pageTitle="E-PIN activity details"
        crumbs={[
          { name: "E-PINs", path: "/admin/epins" },
          { name: "Activity & transfers", path: "/admin/epins/transfers" },
          { name: "Details" },
        ]}
      />

      <>
        <div className="table-filter-section mb-3">
          <Row className="mb-3">
            <Col
              md="12"
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <h5>Activity details</h5>
                {transfer && (
                  <p className="text-muted mb-0">{buildActivitySummary(transfer)}</p>
                )}
              </div>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/admin/epins/transfers")}
              >
                Back to activity log
              </Button>
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={epins}
          count={epins.length}
          params={params}
          setParams={setParams}
          pagination={epins.length > 10}
          responsive
          striped={true}
          progressPending={loading}
          highlightOnHover
          persistTableHead={true}
          paginationServer={false}
        />
      </>
    </Container>
  );
};

EPinTransferDetails.propTypes = {
  fetchAdminEPinTransferDetails: PropTypes.func.isRequired,
};

export default connect(null, { fetchAdminEPinTransferDetails })(
  EPinTransferDetails,
);
