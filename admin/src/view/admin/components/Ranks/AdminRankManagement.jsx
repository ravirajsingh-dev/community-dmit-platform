/**
 * Admin Rank Management - QA Q21
 * Route: /admin/ranks
 * List users by rank, admin override assign
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Modal,
  Spinner,
} from "react-bootstrap";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import api from "@src/utils/axiosSetup";
import { getInitialSortingParams } from "@src/constants";
import {
  formatMemberIdInput,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";
import { FiUsers, FiChevronDown, FiChevronUp, FiCheckCircle, FiRotateCcw } from "react-icons/fi";

const AdminRankManagement = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [ranks, setRanks] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const getDefaultRankParams = () =>
    getInitialSortingParams({
      rankCode: "all",
      memberId: "",
      phone: "",
      name: "",
    });

  const [params, setParams] = useState(() => getDefaultRankParams());
  const [filterDraft, setFilterDraft] = useState(() => getDefaultRankParams());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRankCode, setAssignRankCode] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/ranks/users", { params });
      if (res.data?.status && res.data?.response) {
        setUsers(res.data.response.users || []);
        setPagination(res.data.response.pagination || {});
        setRanks(res.data.response.ranks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/admin/ranks/summary");
      if (res.data?.status && res.data?.response?.summary) {
        setSummary(res.data.response.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [params.rankCode, params.memberId, params.phone, params.name, params.page, params.limit]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAssign = async () => {
    if (!assignUserId || !assignRankCode) return;
    setAssigning(true);
    try {
      await api.post("/api/admin/ranks/assign", {
        userId: assignUserId,
        rankCode: parseInt(assignRankCode, 10),
      });
      setAssignModal(null);
      setAssignUserId("");
      setAssignRankCode("");
      fetchUsers();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign rank");
    } finally {
      setAssigning(false);
    }
  };

  const handleFilterMemberIdChange = createMemberIdChangeHandler(
    (e) =>
      setFilterDraft((prev) => ({
        ...prev,
        memberId: e.target.value,
        page: 1,
      })),
    "memberId",
  );
  const handleFilterMemberIdPaste = createMemberIdPasteHandler();
  const handleFilterMemberIdKeyDown = createMemberIdKeyDownHandler(
    filterDraft.memberId,
    (e) =>
      setFilterDraft((prev) => ({
        ...prev,
        memberId: e.target.value,
        page: 1,
      })),
    "memberId",
  );

  const navigateToRank = (rankCodeValue) => {
    const normalized = (rankCodeValue ?? "all").toString();
    setFilterDraft((prev) => ({
      ...prev,
      rankCode: normalized,
      page: 1,
    }));
    setParams((prev) => ({
      ...prev,
      rankCode: normalized,
      page: 1,
    }));
  };

  const applyFilters = () => {
    setParams((prev) => ({
      ...prev,
      ...filterDraft,
      page: 1,
    }));
  };

  const resetAllFilters = () => {
    const reset = getDefaultRankParams();
    setFilterDraft(reset);
    setParams(reset);
  };

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      width: "150px",
    },
    { name: "Name", selector: (row) => row.name || "-", width: "250px" },
    { name: "Phone", selector: (row) => row.phone || "-", width: "150px" },
    {
      name: "Rank",
      cell: (row) => (
        <Badge bg={row.rankCode ? "primary" : "secondary"}>
          {row.rankName || "—"}
        </Badge>
      ),
      width: "200px",
    },
    { name: "Direct", selector: (row) => row.directCount ?? 0, width: "150px" },
    {
      name: "Downline",
      selector: (row) => row.totalDownlineCount ?? 0,
      width: "150px",
    },
    // {
    //   name: "Actions",
    //   width: "150px",
    //   cell: (row) => (
    //     <Button
    //       size="sm"
    //       variant="outline-primary"
    //       onClick={() => {
    //         setAssignModal(true);
    //         setAssignUserId(row._id);
    //         setAssignRankCode(row.rankCode || "");
    //       }}
    //     >
    //       Assign Rank
    //     </Button>
    //   ),
    // },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Rank Management"
        crumbs={[{ name: "Rank Management" }]}
      />
      <>
        {/* Summary */}
        {summary.length > 0 && (
          <Row className="mb-4 g-3">
            {summary.map((s) => {
              const isSelected = (params.rankCode ?? "all").toString() === (s.rankCode ?? "all").toString();
              return (
                <Col key={s.rankCode} xs={6} sm={6} md={3}>
                  <Card
                    className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
                      isSelected ? "is-selected" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateToRank(s.rankCode)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") navigateToRank(s.rankCode);
                    }}
                  >
                    <Card.Body className="admin-stat-card__body">
                      <div className="admin-stat-card__icon">
                        <FiUsers size={18} />
                      </div>
                      <div className="admin-stat-card__meta">
                        <div className="admin-stat-card__label">{s.name}</div>
                        <div className="admin-stat-card__value">{s.userCount}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Filters */}
        <div className="mb-3 users-filter-wrap">
          <div className="users-filters-panel">
            <div className="users-filters-panel__header">
              <button
                type="button"
                className="users-filters-panel__toggle"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
              >
                <span>All Filters</span>
                {filtersOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </button>
            </div>

            {filtersOpen && (
              <div className="users-filters-panel__body">
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Rank</Form.Label>
                      <Form.Select
                        value={filterDraft.rankCode}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            rankCode: e.target.value,
                            page: 1,
                          }))
                        }
                      >
                        <option value="all">All Ranks</option>
                        {ranks.map((r) => (
                          <option key={r.rankCode} value={r.rankCode}>
                            {r.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Member ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="G123456789"
                        value={formatMemberIdInput(filterDraft.memberId)}
                        onChange={handleFilterMemberIdChange}
                        onPaste={handleFilterMemberIdPaste}
                        onKeyDown={handleFilterMemberIdKeyDown}
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="10-digit phone"
                        value={filterDraft.phone}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                            page: 1,
                          }))
                        }
                        inputMode="numeric"
                        maxLength={10}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Optional"
                        value={filterDraft.name}
                        onChange={(e) =>
                          setFilterDraft((prev) => ({
                            ...prev,
                            name: e.target.value,
                            page: 1,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-3">
                  <Button variant="primary" onClick={applyFilters}>
                    <FiCheckCircle size={15} className="me-1" />
                    Apply
                  </Button>
                  <Button variant="secondary" onClick={resetAllFilters}>
                    <FiRotateCcw size={15} className="me-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <CustomDataTable
          columns={columns}
          data={users}
          count={pagination.total ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          paginationServer
          progressPending={loading}
          noDataComponent={<AdminNoDataState title="No users found" />}
        />
      </>

      <Modal show={!!assignModal} onHide={() => setAssignModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Rank</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Rank</Form.Label>
            <Form.Select
              value={assignRankCode}
              onChange={(e) => setAssignRankCode(e.target.value)}
            >
              <option value="">Select rank</option>
              {ranks.map((r) => (
                <option key={r.rankCode} value={r.rankCode}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAssignModal(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={assigning || !assignRankCode}
          >
            {assigning ? <Spinner animation="border" size="sm" /> : "Assign"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminRankManagement;
