import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Container,
  Badge,
  Button,
  Form,
  Modal,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { format, parseISO } from "date-fns";
import {
  FaSync,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";

import {
  fetchMatrimonialApplications,
  fetchMatrimonialProfileById,
  updateMatrimonialProfile,
  deleteMatrimonialProfile,
} from "@src/actions/adminMatrimonialActions";

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "remarried", label: "Remarried" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const MatrimonialApplicationsList = ({
  list,
  pagination,
  statistics,
  loading,
  updating,
  deleting,
  fetchMatrimonialApplications,
  fetchMatrimonialProfileById,
  updateMatrimonialProfile,
  deleteMatrimonialProfile,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editForm, setEditForm] = useState({ isActive: true });
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    communityId: "",
    gender: "",
    search: "",
    isActive: "",
  });

  useEffect(() => {
    fetchMatrimonialApplications(params);
  }, [fetchMatrimonialApplications, params]);

  const handleFilterChange = (field, value) => {
    setParams((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleEdit = (row) => {
    setSelectedRow(row);
    setEditForm({
      isActive: row.isActive === true,
      name: row.user?.name ?? "",
      phone: row.user?.phone ?? "",
      education: row.userDetails?.education ?? "",
      occupation: row.userDetails?.occupation ?? "",
      maritalStatus: row.userDetails?.maritalStatus ?? "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRow) return;
    const payload = {
      isActive: editForm.isActive,
      name: editForm.name || undefined,
      phone: editForm.phone || undefined,
      education: editForm.education || undefined,
      occupation: editForm.occupation || undefined,
      maritalStatus: editForm.maritalStatus || undefined,
    };
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k],
    );
    await updateMatrimonialProfile(selectedRow._id, payload);
    setShowEditModal(false);
    setSelectedRow(null);
    fetchMatrimonialApplications(params);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRow) return;
    await deleteMatrimonialProfile(selectedRow._id);
    setShowDeleteModal(false);
    setSelectedRow(null);
    fetchMatrimonialApplications(params);
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.user?.name ?? "-",
      sortable: false,
      width: "140px",
      wrap: true,
    },
    {
      name: "Member ID",
      selector: (row) => row.user?.memberId ?? "-",
      sortable: false,
      width: "120px",
    },
    {
      name: "Phone",
      selector: (row) => row.user?.phone ?? "-",
      sortable: false,
      width: "110px",
    },
    {
      name: "Email",
      selector: (row) => row.user?.email ?? "-",
      sortable: false,
      width: "180px",
      wrap: true,
    },
    {
      name: "Gender",
      selector: (row) =>
        row.userDetails?.gender ? String(row.userDetails.gender) : "-",
      sortable: false,
      width: "90px",
    },
    {
      name: "Community",
      selector: (row) => row.community?.name ?? "-",
      sortable: false,
      width: "140px",
      wrap: true,
    },
    {
      name: "Visible",
      selector: (row) =>
        row.isActive ? (
          <Badge bg="success">Active</Badge>
        ) : (
          <Badge bg="secondary">Inactive</Badge>
        ),
      sortable: false,
      width: "90px",
    },
    {
      name: "Applied On",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: false,
      width: "150px",
    },
    {
      name: "Actions",
      width: "140px",
      cell: (row) => (
        <div className="d-flex gap-1 align-items-center flex-wrap">
          <Button
            variant="link"
            className="text-primary p-0"
            onClick={() => handleEdit(row)}
            title="Edit"
            disabled={updating || deleting}
          >
            <FaEdit size={18} />
          </Button>
          <Button
            variant="link"
            className="text-danger p-0"
            onClick={() => handleDelete(row)}
            title="Delete (permanent)"
            disabled={updating || deleting}
          >
            <FaTrash size={18} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Container fluid>
      <AppBreadCrumb
        pageTitle="Matrimonial Profiles"
        crumbs={[{ name: "Matrimonial" }]}
      />

      {statistics && Object.keys(statistics).length > 0 && (
        <Row className="mb-4">
          <Col md={4}>
            <MainCard>
              <div className="text-center">
                <h6 className="text-muted mb-2">Total</h6>
                <h3>{statistics.total ?? 0}</h3>
              </div>
            </MainCard>
          </Col>
          <Col md={4}>
            <MainCard>
              <div className="text-center">
                <h6 className="text-muted mb-2">Visible</h6>
                <h3 className="text-success">{statistics.active ?? 0}</h3>
              </div>
            </MainCard>
          </Col>
          <Col md={4}>
            <MainCard>
              <div className="text-center">
                <h6 className="text-muted mb-2">Hidden</h6>
                <h3 className="text-secondary">{statistics.inactive ?? 0}</h3>
              </div>
            </MainCard>
          </Col>
        </Row>
      )}

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="mb-3">
            <Col
              md={12}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <h5>Filters</h5>
                {pagination?.total != null && (
                  <p className="text-muted mb-0">Total: {pagination.total}</p>
                )}
              </div>
              <Button
                variant="outline-primary"
                onClick={() => fetchMatrimonialApplications(params)}
                disabled={loading}
              >
                <FaSync className="me-2" />
                Refresh
              </Button>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={2}>
              <Form.Group>
                <Form.Label>Gender</Form.Label>
                <Form.Select
                  value={params.gender}
                  onChange={(e) => handleFilterChange("gender", e.target.value)}
                >
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Visible</Form.Label>
                <Form.Select
                  value={params.isActive}
                  onChange={(e) =>
                    handleFilterChange("isActive", e.target.value)
                  }
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  Search (Name / Email / Phone / Member ID)
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search..."
                  value={params.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Community ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="ObjectId"
                  value={params.communityId}
                  onChange={(e) =>
                    handleFilterChange("communityId", e.target.value)
                  }
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={list || []}
          count={pagination?.total ?? 0}
          params={params}
          setParams={setParams}
          pagination
          responsive
          striped
          progressPending={loading}
          highlightOnHover
          persistTableHead
          paginationServer
        />
      </MainCard>

      <Modal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setSelectedRow(null);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Matrimonial Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="edit-isActive"
              label="Visible in listings"
              checked={editForm.isActive}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              type="text"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Marital status</Form.Label>
            <Form.Select
              value={editForm.maritalStatus}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, maritalStatus: e.target.value }))
              }
            >
              <option value="">—</option>
              {MARITAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Education</Form.Label>
            <Form.Control
              type="text"
              value={editForm.education}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, education: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Occupation</Form.Label>
            <Form.Control
              type="text"
              value={editForm.occupation}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, occupation: e.target.value }))
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditModal(false);
              setSelectedRow(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveEdit}
            disabled={updating}
          >
            {updating ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedRow(null);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Matrimonial Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Permanently delete the matrimonial profile for{" "}
            <strong>{selectedRow?.user?.name ?? "this user"}</strong>? This
            cannot be undone. The user can re-apply later.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedRow(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete permanently"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

MatrimonialApplicationsList.propTypes = {
  list: PropTypes.array,
  pagination: PropTypes.object,
  statistics: PropTypes.object,
  loading: PropTypes.bool,
  updating: PropTypes.bool,
  deleting: PropTypes.bool,
  fetchMatrimonialApplications: PropTypes.func.isRequired,
  fetchMatrimonialProfileById: PropTypes.func.isRequired,
  updateMatrimonialProfile: PropTypes.func.isRequired,
  deleteMatrimonialProfile: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  list: state.adminMatrimonial?.list ?? [],
  pagination: state.adminMatrimonial?.pagination ?? {},
  statistics: state.adminMatrimonial?.statistics ?? {},
  loading: state.adminMatrimonial?.loading ?? false,
  updating: state.adminMatrimonial?.updating ?? false,
  deleting: state.adminMatrimonial?.deleting ?? false,
});

export default connect(mapStateToProps, {
  fetchMatrimonialApplications,
  fetchMatrimonialProfileById,
  updateMatrimonialProfile,
  deleteMatrimonialProfile,
})(MatrimonialApplicationsList);
