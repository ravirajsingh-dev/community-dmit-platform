import React, { useState, useEffect } from "react";
import { Container, Badge, Form } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getAdminAllTeam, getAdminTeamByLevel } from "@src/actions/adminTeamActions";

const statusLabel = (s) => (s === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>);

const AdminFullTeam = () => {
  const { userId } = useParams();
  const [data, setData] = useState({ users: [], pagination: {} });
  const [params, setParams] = useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", levelFilter: "all" })
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const fetch = params.levelFilter === "all"
      ? getAdminAllTeam(userId, params)
      : getAdminTeamByLevel(userId, parseInt(params.levelFilter, 10), params);
    fetch
      .then(setData)
      .catch(() => setData({ users: [], pagination: {} }))
      .finally(() => setLoading(false));
  }, [userId, params.page, params.limit, params.orderBy, params.ascending, params.levelFilter]);

  const columns = [
    { name: "Level", selector: (r) => r.level ?? "-", sortable: true, sortField: "level", width: "80px" },
    { name: "Member ID", selector: (r) => r.memberId || "-", sortable: true, sortField: "memberId", width: "140px" },
    { name: "Name", selector: (r) => r.name || "-", sortable: true, sortField: "name", width: "180px" },
    { name: "Phone", selector: (r) => r.phone || "-", width: "120px" },
    { name: "Status", selector: (r) => statusLabel(r.status), sortable: true, sortField: "status", width: "100px" },
    {
      name: "Joined",
      selector: (r) => (r.createdAt ? format(parseISO(r.createdAt), "dd/MM/yyyy, hh:mm a") : "-"),
      sortable: true,
      sortField: "createdAt",
      width: "120px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Full Team"
        crumbs={[{ name: "Team", path: "/admin/team" }, { name: "Full Team" }]}
      />
      <MainCard>
        <h5 className="mb-3">Full Team (All Downline)</h5>
        <Form.Group className="mb-3" style={{ maxWidth: "200px" }}>
          <Form.Label>Filter by Level</Form.Label>
          <Form.Select
            value={params.levelFilter}
            onChange={(e) => setParams((p) => ({ ...p, levelFilter: e.target.value, page: 1 }))}
          >
            <option value="all">All Levels</option>
            {Array.from({ length: 20 }, (_, i) => (
              <option key={i} value={i + 1}>Level {i + 1}</option>
            ))}
          </Form.Select>
        </Form.Group>
        <CustomDataTable
          columns={columns}
          data={data.users}
          count={data.pagination?.totalCount ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          progressPending={loading}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

export default AdminFullTeam;
