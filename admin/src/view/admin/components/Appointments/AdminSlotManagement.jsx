import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Modal,
  Spinner,
  Badge,
} from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import { getInitialSortingParams } from "@src/constants";
import {
  getAdminSlots,
  createSlot,
  updateSlot,
  toggleSlot,
} from "@src/actions/adminSlotActions";

const AdminSlotManagement = ({
  slots,
  pagination,
  designations,
  loading,
  processing,
  getAdminSlots,
  createSlot,
  updateSlot,
  toggleSlot,
}) => {
  const [params, setParams] = useState(() =>
    getInitialSortingParams({ designationCode: "" })
  );
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({
    designationCode: "",
    label: "",
    startTime: "09:00",
    endTime: "12:00",
    capacity: "3",
  });

  useEffect(() => {
    getAdminSlots(params);
  }, [params.page, params.limit, params.designationCode]);

  const refresh = () => getAdminSlots(params);

  const handleCreateOpen = () => {
    setForm({
      designationCode: designations?.[0]?.designationCode?.toString() || "",
      label: "",
      startTime: "09:00",
      endTime: "12:00",
      capacity: "3",
    });
    setCreateModal(true);
  };

  const handleCreateSubmit = () => {
    const code = parseInt(form.designationCode, 10);
    if (Number.isNaN(code) || !form.label?.trim()) return;
    createSlot(
      {
        designationCode: code,
        label: form.label.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: parseInt(form.capacity, 10) || 1,
      },
      () => {
        setCreateModal(false);
        refresh();
      }
    );
  };

  const handleEditOpen = (slot) => {
    setEditModal(slot);
    setForm({
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: String(slot.capacity),
    });
  };

  const handleEditSubmit = () => {
    if (!editModal) return;
    updateSlot(
      editModal._id,
      {
        label: form.label?.trim() || editModal.label,
        startTime: form.startTime || editModal.startTime,
        endTime: form.endTime || editModal.endTime,
        capacity: parseInt(form.capacity, 10) || editModal.capacity,
      },
      () => {
        setEditModal(null);
        refresh();
      }
    );
  };

  const handleToggle = (slot) => {
    toggleSlot(slot._id, refresh);
  };

  const designationName = (code) => {
    const d = (designations || []).find((x) => x.designationCode === code);
    return d?.name || `Code ${code}`;
  };

  const columns = [
    {
      name: "Designation",
      selector: (row) => designationName(row.designationCode),
      width: "180px",
    },
    { name: "Label", selector: (row) => row.label || "-", width: "200px" },
    {
      name: "Time",
      selector: (row) => `${row.startTime || ""} - ${row.endTime || ""}`,
      width: "150px",
    },
    { name: "Capacity", selector: (row) => row.capacity ?? "-", width: "150px" },
    {
      name: "Status",
      cell: (row) => (
        <Badge bg={row.active ? "success" : "secondary"}>
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
      width: "120px",
    },
    {
      name: "Actions",
      width: "200px",
      cell: (row) => (
        <>
          <Button
            size="sm"
            variant="outline-primary"
            className="me-1"
            disabled={processing}
            onClick={() => handleEditOpen(row)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={row.active ? "outline-warning" : "outline-success"}
            disabled={processing}
            onClick={() => handleToggle(row)}
          >
            {row.active ? "Deactivate" : "Activate"}
          </Button>
        </>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Slot Management"
        crumbs={[{ name: "Appointments" }, { name: "Slot Management" }]}
      />

      <MainCard>
        <h5 className="mb-4">Appointment Slot Management</h5>
        <p className="text-muted small mb-4">
          Define time slots for each designation. Each slot has a capacity limit.
        </p>

        <Row className="mb-3 g-2">
          <Col md={2}>
            <Form.Group>
              <Form.Label className="small">Designation</Form.Label>
              <Form.Select
                value={params.designationCode}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    designationCode: e.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">All</option>
                {(designations || []).map((d) => (
                  <option key={d.designationCode} value={d.designationCode}>
                    {d.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Button variant="primary" size="sm" onClick={handleCreateOpen}>
              Add Slot
            </Button>
          </Col>
        </Row>

        <CustomDataTable
          columns={columns}
          data={slots || []}
          count={pagination?.totalCount ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          paginationServer
          progressPending={loading}
          noDataComponent={
            <AdminNoDataState
              title="No slots found"
              description="Add slots for designations."
            />
          }
        />
      </MainCard>

      <Modal show={createModal} onHide={() => setCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Designation</Form.Label>
            <Form.Select
              value={form.designationCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, designationCode: e.target.value }))
              }
            >
              {(designations || []).map((d) => (
                <option key={d.designationCode} value={d.designationCode}>
                  {d.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Label</Form.Label>
            <Form.Control
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Morning Slot"
            />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-2">
                <Form.Label>Start (HH:mm)</Form.Label>
                <Form.Control
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  placeholder="09:00"
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-2">
                <Form.Label>End (HH:mm)</Form.Label>
                <Form.Control
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                  placeholder="12:00"
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group>
            <Form.Label>Capacity</Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateSubmit}
            disabled={processing || !form.label?.trim()}
          >
            {processing ? <Spinner animation="border" size="sm" /> : "Create"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!editModal} onHide={() => setEditModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editModal && (
            <>
              <Form.Group className="mb-2">
                <Form.Label>Label</Form.Label>
                <Form.Control
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                />
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-2">
                    <Form.Label>Start (HH:mm)</Form.Label>
                    <Form.Control
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startTime: e.target.value }))
                      }
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-2">
                    <Form.Label>End (HH:mm)</Form.Label>
                    <Form.Control
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endTime: e.target.value }))
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group>
                <Form.Label>Capacity</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, capacity: e.target.value }))
                  }
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditModal(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditSubmit}
            disabled={processing}
          >
            {processing ? <Spinner animation="border" size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminSlotManagement.propTypes = {
  slots: PropTypes.array,
  pagination: PropTypes.object,
  designations: PropTypes.array,
  loading: PropTypes.bool,
  processing: PropTypes.bool,
  getAdminSlots: PropTypes.func.isRequired,
  createSlot: PropTypes.func.isRequired,
  updateSlot: PropTypes.func.isRequired,
  toggleSlot: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  slots: state.adminSlot?.slots ?? [],
  pagination: state.adminSlot?.pagination ?? {},
  designations: state.adminSlot?.designations ?? [],
  loading: state.adminSlot?.loading ?? false,
  processing: state.adminSlot?.processing ?? false,
});

export default connect(mapStateToProps, {
  getAdminSlots,
  createSlot,
  updateSlot,
  toggleSlot,
})(AdminSlotManagement);
