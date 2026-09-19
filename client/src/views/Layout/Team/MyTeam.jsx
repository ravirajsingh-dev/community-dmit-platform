import React, { useState, useEffect } from "react";
import { Container, Badge, Form, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getAllTeam, getTeamByLevel } from "@src/actions/teamActions";

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
    levelFilter: "all",
    filters: [],
    query: {},
  });

const MyTeam = ({
  allTeam,
  allPagination,
  levelTeam,
  levelPagination,
  loadingAll,
  loadingLevel,
  getAllTeam,
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
    const requestParams = {
      page: params.page,
      limit: params.limit,
      orderBy: params.orderBy,
      ascending: params.ascending,
      filters: params.filters,
      query: params.query,
    };
    if (params.levelFilter === "all") {
      getAllTeam(requestParams);
    } else {
      getTeamByLevel(parseInt(params.levelFilter, 10), requestParams);
    }
  }, [
    params.page,
    params.limit,
    params.orderBy,
    params.ascending,
    params.levelFilter,
    params.filters,
    params.query,
  ]);

  const levelOptions = [
    { value: "all", label: "All Levels" },
    ...Array.from({ length: 20 }, (_, i) => ({
      value: String(i + 1),
      label: `Level ${i + 1}`,
    })),
  ];

  const isLevelFilter = params.levelFilter !== "all";
  const users = isLevelFilter ? levelTeam : allTeam;
  const pagination = isLevelFilter ? levelPagination : allPagination;
  const loading = isLevelFilter ? loadingLevel : loadingAll;

  const columns = [
    {
      name: "Level",
      selector: (row) => row.level ?? "-",
      sortable: true,
      sortField: "level",
      width: "120px",
    },
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
        pageTitle="My Team"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "My Team" },
        ]}
      />

      <MainCard>
        <div className="mb-3 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 className="mb-1">My Team (Full Downline)</h5>
            <p className="text-muted small mb-0">
              All users in your downline. Filter by level below.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/user/team/all/filters")}
          >
            Filters
          </Button>
        </div>

        {pagination?.totalCount != null && (
          <p className="text-muted mb-3">
            Total: <strong>{pagination.totalCount}</strong> member
            {pagination.totalCount !== 1 ? "s" : ""}
          </p>
        )}

        <CustomDataTable
          columns={columns}
          data={users}
          count={pagination?.totalCount ?? 0}
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

MyTeam.propTypes = {
  allTeam: PropTypes.array,
  allPagination: PropTypes.object,
  levelTeam: PropTypes.array,
  levelPagination: PropTypes.object,
  loadingAll: PropTypes.bool,
  loadingLevel: PropTypes.bool,
  getAllTeam: PropTypes.func.isRequired,
  getTeamByLevel: PropTypes.func.isRequired,
  appliedParams: PropTypes.object,
};

const mapStateToProps = (state) => ({
  allTeam: state.team?.allTeam ?? [],
  allPagination: state.team?.allPagination ?? {},
  levelTeam: state.team?.levelTeam ?? [],
  levelPagination: state.team?.levelPagination ?? {},
  loadingAll: state.team?.loadingAll ?? false,
  loadingLevel: state.team?.loadingLevel ?? false,
  appliedParams: state.team?.appliedParamsMyTeam ?? null,
});

export default connect(mapStateToProps, { getAllTeam, getTeamByLevel })(MyTeam);
