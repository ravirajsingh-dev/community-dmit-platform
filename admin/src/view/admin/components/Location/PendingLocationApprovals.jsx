import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Badge, Button, Col, Container, Modal, Row } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import api from "@src/utils/axiosSetup";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import { hasPermission } from "@src/utils/permissions";

const statusBadgeBg = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "warning";
  if (s === "active") return "success";
  if (s === "rejected") return "danger";
  return "secondary";
};

const PendingLocationApprovals = ({ loggedInUser }) => {
  const loggedInAdmin = loggedInUser;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [confirmState, setConfirmState] = useState({
    show: false,
    action: null, // "country"|"state"|"district"|"village"|"row"
    payload: null, // ids + names
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/location-management/pending-approvals");
      const list = res.data?.response?.rows ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("fetch pending approvals error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const hasAnyPending = (r) =>
    [r.countryStatus, r.stateStatus, r.districtStatus, r.villageStatus].some(
      (s) => s === "pending",
    );

  const openConfirm = (action, payload) =>
    setConfirmState({
      show: true,
      action,
      payload,
    });

  const closeConfirm = () => setConfirmState({ show: false, action: null, payload: null });

  const confirmApprove = async () => {
    const { action, payload } = confirmState;
    if (!action || !payload) return;

    try {
      if (action === "country") {
        await api.put(
          `/api/admin/location-management/countries/${payload.countryId}/approve-no-txn`,
        );
      } else if (action === "state") {
        await api.put(
          `/api/admin/location-management/states/${payload.stateId}/approve-no-txn`,
        );
      } else if (action === "district") {
        await api.put(
          `/api/admin/location-management/districts/${payload.districtId}/approve-no-txn`,
        );
      } else if (action === "village") {
        await api.put(
          `/api/admin/location-management/villages/${payload.villageId}/approve-no-txn`,
        );
      } else if (action === "row") {
        await api.put("/api/admin/location-management/approve-row-no-txn", {
          countryId: payload.countryId,
          stateId: payload.stateId,
          districtId: payload.districtId,
          villageId: payload.villageId,
        });
      }

      closeConfirm();
      await fetchRows();
    } catch (err) {
      console.error("confirmApprove error:", err);
      closeConfirm();
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Country",
        width: "220px",
        wrap: true,
        cell: (r) => (
          <div className="d-flex flex-column gap-1">
            <div className="fw-semibold">{r.countryName || "-"}</div>
            <Badge bg={statusBadgeBg(r.countryStatus)}>{r.countryStatus || "-"}</Badge>
            {r.countryStatus === "pending" &&
              hasPermission(loggedInAdmin, "countries", "edit") && (
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() =>
                    openConfirm("country", { countryId: r.countryId })
                  }
                >
                  Approve
                </Button>
              )}
          </div>
        ),
      },
      {
        name: "State",
        width: "220px",
        wrap: true,
        cell: (r) => (
          <div className="d-flex flex-column gap-1">
            <div className="fw-semibold">{r.stateName || "-"}</div>
            <Badge bg={statusBadgeBg(r.stateStatus)}>{r.stateStatus || "-"}</Badge>
            {r.stateStatus === "pending" &&
              hasPermission(loggedInAdmin, "states", "edit") && (
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() => openConfirm("state", { stateId: r.stateId })}
                >
                  Approve
                </Button>
              )}
          </div>
        ),
      },
      {
        name: "District",
        width: "220px",
        wrap: true,
        cell: (r) => (
          <div className="d-flex flex-column gap-1">
            <div className="fw-semibold">{r.districtName || "-"}</div>
            <Badge bg={statusBadgeBg(r.districtStatus)}>{r.districtStatus || "-"}</Badge>
            {r.districtStatus === "pending" &&
              hasPermission(loggedInAdmin, "districts", "edit") && (
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() =>
                    openConfirm("district", { districtId: r.districtId })
                  }
                >
                  Approve
                </Button>
              )}
          </div>
        ),
      },
      {
        name: "Village",
        width: "260px",
        wrap: true,
        cell: (r) => (
          <div className="d-flex flex-column gap-1">
            <div className="fw-semibold">{r.villageName || "-"}</div>
            <Badge bg={statusBadgeBg(r.villageStatus)}>{r.villageStatus || "-"}</Badge>
            {r.villageStatus === "pending" &&
              hasPermission(loggedInAdmin, "villages", "edit") && (
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() =>
                    openConfirm("village", { villageId: r.villageId })
                  }
                >
                  Approve
                </Button>
              )}
          </div>
        ),
      },
      {
        name: "Row Actions",
        width: "220px",
        wrap: true,
        cell: (r) => (
          <div className="d-flex flex-column gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!hasAnyPending(r) || !hasPermission(loggedInAdmin, "countries", "edit")}
              onClick={() =>
                openConfirm("row", {
                  countryId: r.countryId,
                  stateId: r.stateId,
                  districtId: r.districtId,
                  villageId: r.villageId,
                })
              }
            >
              Approve Row
            </Button>
          </div>
        ),
      },
    ],
    [loggedInAdmin],
  );

  const confirmTitle = useMemo(() => {
    const action = confirmState.action;
    if (!action) return "Confirm";
    if (action === "row") return "Confirm Row Approval";
    return `Confirm Approve ${String(action).toUpperCase()}`;
  }, [confirmState.action]);

  const confirmBody = useMemo(() => {
    const { action, payload } = confirmState;
    if (!action || !payload) return "";
    if (action === "row") {
      return "Are you sure you want to approve all pending items in this Countries → States → Districts → Villages path? (confirmation only, no transaction password)";
    }
    return `Are you sure you want to approve this pending ${action}? (confirmation only, no transaction password)`;
  }, [confirmState]);

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Pending Location Approvals"
        crumbs={[{ name: "Location Management" }, { name: "Pending Approvals" }]}
      />

      <MainCard>
        <Row className="mb-3">
          <Col md="12">
            <div className="text-muted small">
              You can approve Country / State / District / Village individually, or approve the whole row (path) at once.
              Txn password is NOT required here.
            </div>
          </Col>
        </Row>

        <DataTable
          columns={columns}
          data={rows}
          responsive
          striped
          highlightOnHover
          progressPending={loading}
          noDataComponent={
            <div className="text-muted py-4">No pending location approvals found.</div>
          }
          pagination
          paginationPerPage={10}
        />
      </MainCard>

      <Modal show={confirmState.show} onHide={closeConfirm} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{confirmTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{confirmBody}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmApprove}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

PendingLocationApprovals.propTypes = {
  loggedInUser: PropTypes.object,
};

const mapStateToProps = (state) => ({
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps)(PendingLocationApprovals);

