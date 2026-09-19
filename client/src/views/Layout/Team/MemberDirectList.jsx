import React, { useState, useEffect } from "react";
import { Container, Badge } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import { useParams, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getInitialSortingParams } from "@src/constants";
import { getMemberDirectTeam } from "@src/actions/teamActions";

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

const MemberDirectList = ({
  memberList,
  memberListPagination,
  loadingMemberList,
  getMemberDirectTeam,
}) => {
  const { userId } = useParams();
  const location = useLocation();
  const memberLabel = location.state?.memberId || location.state?.name || "Member";
  const fromLevelWise = location.state?.from === "level";

  const [params, setParams] = useState(defaultListParams());

  useEffect(() => {
    if (userId) {
      getMemberDirectTeam(userId, params);
    }
  }, [userId, params.page, params.limit, params.orderBy, params.ascending, params.filters, params.query]);

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      sortable: true,
      sortField: "memberId",
      width: "140px",
    },
    {
      name: "Phone",
      selector: (row) => row.phone || "-",
      width: "120px",
    },
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "250px",
    },
    {
      name: "Status",
      selector: (row) => statusLabel(row.status),
      sortable: true,
      sortField: "status",
      width: "100px",
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
        pageTitle={`${memberLabel} - Direct List`}
        crumbs={[
          { name: "Team", path: "/user/team" },
          { name: fromLevelWise ? "Level-Wise" : "Direct Team", path: fromLevelWise ? "/user/team/level" : "/user/team/direct" },
          { name: "Direct List" },
        ]}
      />

      <MainCard>
        <div className="mb-3">
          <h5 className="mb-1">Direct Team (Level 1)</h5>
          <p className="text-muted small mb-0">
            Direct referrals of this member.
          </p>
        </div>

        {memberListPagination?.totalCount != null && (
          <p className="text-muted mb-3">
            Total: <strong>{memberListPagination.totalCount}</strong> member
            {memberListPagination.totalCount !== 1 ? "s" : ""}
          </p>
        )}

        <CustomDataTable
          columns={columns}
          data={memberList || []}
          count={memberListPagination?.totalCount ?? 0}
          params={params}
          setParams={(p) => setParams((prev) => ({ ...prev, ...p }))}
          pagination
          responsive
          striped
          progressPending={loadingMemberList}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

MemberDirectList.propTypes = {
  memberList: PropTypes.array,
  memberListPagination: PropTypes.object,
  loadingMemberList: PropTypes.bool,
  getMemberDirectTeam: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  memberList: state.team?.memberList ?? [],
  memberListPagination: state.team?.memberListPagination ?? {},
  loadingMemberList: state.team?.loadingMemberList ?? false,
});

export default connect(mapStateToProps, { getMemberDirectTeam })(MemberDirectList);
