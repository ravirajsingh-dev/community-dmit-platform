import React, { useState, useEffect } from "react";
import { Container, Badge } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getAdminDirectTeam } from "@src/actions/adminTeamActions";

const statusLabel = (s) => (s === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>);

const AdminDirectTeam = () => {
  const { userId } = useParams();
  const [data, setData] = useState({ users: [], pagination: {} });
  const [params, setParams] = useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" })
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getAdminDirectTeam(userId, params)
      .then(setData)
      .catch(() => setData({ users: [], pagination: {} }))
      .finally(() => setLoading(false));
  }, [userId, params.page, params.limit, params.orderBy, params.ascending]);

  const columns = [
    { name: "Member ID", selector: (r) => r.memberId || "-", sortable: true, sortField: "memberId", width: "140px" },
    { name: "Name", selector: (r) => r.name || "-", sortable: true, sortField: "name", width: "180px" },
    { name: "Phone", selector: (r) => r.phone || "-", width: "120px" },
    { name: "Status", selector: (r) => statusLabel(r.status), sortable: true, sortField: "status", width: "100px" },
    { name: "Direct", selector: (r) => r.directCount ?? 0, width: "80px" },
    { name: "Total", selector: (r) => r.totalDownlineCount ?? 0, width: "80px" },
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
        pageTitle="Direct Team"
        crumbs={[{ name: "Team", path: "/admin/team" }, { name: "Direct Team" }]}
      />
      <MainCard>
        <h5 className="mb-3">Direct Team (Level 1)</h5>
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

export default AdminDirectTeam;
