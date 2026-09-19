import React, { useState, useEffect } from "react";
import { Container, Badge, Form, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { useNavigate, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getTeamByLevel } from "@src/actions/teamActions";

const statusLabel = (status) => {
  if (status === 1) return <Badge bg="success">Active</Badge>;
  if (status === 2) return <Badge bg="secondary">Inactive</Badge>;
  if (status === 3) return <Badge bg="danger">Blocked</Badge>;
  return <Badge bg="info">New</Badge>;
};

const defaultListParams = () =>
  getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
  });

const LevelWiseTeam = ({
  levelTeam,
  levelPagination,
  level,
  loadingLevel,
  getTeamByLevel,
  appliedParams,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(() =>
    appliedParams
      ? { ...defaultListParams(), ...appliedParams }
      : defaultListParams(),
  );

  // Sync params when coming back from filter page with applied filters
  useEffect(() => {
    if (
      !appliedParams ||
      (!appliedParams.filters?.length &&
        !(appliedParams.query && Object.keys(appliedParams.query).length))
    )
      return;
    setParams((prev) => {
      const next = {
        ...defaultListParams(),
        ...appliedParams,
        page: prev.page,
        limit: prev.limit,
      };
      const sameFilters =
        JSON.stringify(prev.filters) === JSON.stringify(next.filters);
      const sameQuery =
        JSON.stringify(prev.query) === JSON.stringify(next.query);
      if (sameFilters && sameQuery) return prev;
      return next;
    });
  }, [appliedParams]);

  useEffect(() => {
    const effectiveLevel = appliedParams?.level ?? 1;
    getTeamByLevel(effectiveLevel, {
      page: params.page,
      limit: params.limit,
      orderBy: params.orderBy,
      ascending: params.ascending,
      filters: params.filters,
      query: params.query,
    });
  }, [
    appliedParams?.level,
    params.page,
    params.limit,
    params.orderBy,
    params.ascending,
    params.filters,
    params.query,
  ]);

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      sortable: true,
      sortField: "memberId",
      width: "140px",
    },
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "250px",
    },
    {
      name: "Phone",
      selector: (row) => row.phone || "-",
      width: "120px",
    },
    {
      name: "Status",
      selector: (row) => statusLabel(row.status),
      sortable: true,
      sortField: "status",
      width: "100px",
    },
    {
      name: "Referred By",
      selector: (row) => {
        const ref = row.referredByDetails;
        if (!ref) return "-";
        return (
          <div className="d-flex flex-column small">
            <span className="fw-medium">{ref.name || "-"}</span>
            {ref.memberId && <span className="text-muted">{ref.memberId}</span>}
            {ref.phone && <span className="text-muted">{ref.phone}</span>}
          </div>
        );
      },
      width: "220px",
    },
    {
      name: "Direct",
      selector: (row) => {
        const count = row.directCount ?? 0;
        return (
          <Link
            to={`/user/team/member/${row._id}/direct-list`}
            state={{ memberId: row.memberId, name: row.name, from: "level" }}
            className="text-primary text-decoration-none fw-medium"
            style={{ cursor: "pointer" }}
          >
            {count}
          </Link>
        );
      },
      width: "120px",
    },
    {
      name: "Total",
      selector: (row) => {
        const count = row.totalDownlineCount ?? 0;
        return (
          <Link
            to={`/user/team/member/${row._id}/downline-list`}
            state={{ memberId: row.memberId, name: row.name, from: "level" }}
            className="text-primary text-decoration-none fw-medium"
            style={{ cursor: "pointer" }}
          >
            {count}
          </Link>
        );
      },
      width: "120px",
    },
    {
      name: "Joined",
      selector: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "-",
      sortable: true,
      sortField: "createdAt",
      width: "200px",
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Level-Wise Team"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Level-Wise" },
        ]}
      />

      <MainCard>
        <div className="mb-3 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 className="mb-1">Level-Wise Team</h5>
            <p className="text-muted small mb-0">
              View downline members at a specific level.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/user/team/level/filters")}
          >
            Filters
          </Button>
        </div>

        {levelPagination?.totalCount != null && (
          <p className="text-muted mb-3">
            Total: <strong>{levelPagination.totalCount}</strong> member
            {levelPagination.totalCount !== 1 ? "s" : ""}
          </p>
        )}

        <CustomDataTable
          columns={columns}
          data={levelTeam || []}
          count={levelPagination?.totalCount ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          progressPending={loadingLevel}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

LevelWiseTeam.propTypes = {
  levelTeam: PropTypes.array,
  levelPagination: PropTypes.object,
  level: PropTypes.number,
  loadingLevel: PropTypes.bool,
  getTeamByLevel: PropTypes.func.isRequired,
  appliedParams: PropTypes.object,
};

const mapStateToProps = (state) => ({
  levelTeam: state.team?.levelTeam ?? [],
  levelPagination: state.team?.levelPagination ?? {},
  level: state.team?.level,
  loadingLevel: state.team?.loadingLevel ?? false,
  appliedParams: state.team?.appliedParamsLevelTeam ?? null,
});

export default connect(mapStateToProps, { getTeamByLevel })(LevelWiseTeam);
