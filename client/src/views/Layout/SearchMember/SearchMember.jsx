import React, { useState, useEffect } from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMembersList } from "@src/actions/searchMemberActions";
import { resetSearchMember } from "@src/reducers/searchMemberReducer";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import MainCard from "@src/views/Common/Cards/MainCard";
import { getInitialSortingParams } from "@src/constants";

const defaultListParams = () =>
  getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
  });

const SearchMember = ({
  getMembersList,
  membersList,
  count,
  loadingMembersList,
  resetComponentStore,
  appliedParams,
}) => {
  const navigate = useNavigate();
  const [userParams, setUserParams] = useState(() =>
    appliedParams ? { ...defaultListParams(), ...appliedParams } : defaultListParams()
  );

  const [onlyOnce, setOnce] = useState(true);

  useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }
  }, [resetComponentStore, onlyOnce]);

  useEffect(() => {
    if (!onlyOnce) {
      getMembersList(userParams);
    }
  }, [getMembersList, userParams, onlyOnce]);

  const columns = [
    {
      name: "Member ID",
      selector: (row) => row.memberId || "-",
      sortable: true,
      sortField: "memberId",
      width: "150px",
    },
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "200px",
    },
    {
      name: "Father Name",
      selector: (row) => row.userDetails?.fatherName || "-",
      sortable: false,
      width: "200px",
    },
    {
      name: "Mother Name",
      selector: (row) => row.userDetails?.motherName || "-",
      sortable: false,
      width: "200px",
    },
    {
      name: "Phone",
      selector: (row) => row.phone || "-",
      sortable: true,
      sortField: "phone",
      width: "150px",
    },
    {
      name: "Email",
      selector: (row) => row.email || "-",
      sortable: true,
      sortField: "email",
      width: "250px",
    },
    {
      name: "Actions",
      width: "100px",
      cell: (row) => (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/user/member-details/${row._id}`);
          }}
          title="View Details"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Container>
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Search Member</h4>
            <p className="text-muted mb-0">
              Search and filter members by various criteria.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/user/search-member/filters")}
          >
            Filters
          </Button>
        </div>

        {count >= 0 && (
          <p className="text-muted mb-3">
            Total: <strong>{count}</strong> member{count !== 1 ? "s" : ""}
          </p>
        )}

        <CustomDataTable
          columns={columns}
          data={membersList}
          count={count}
          params={userParams}
          setParams={setUserParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingMembersList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  membersList: state.searchMember.membersList,
  count: state.searchMember.count,
  loadingMembersList: state.searchMember.loadingMembersList,
  appliedParams: state.searchMember.appliedParams,
});

const mapDispatchToProps = (dispatch) => ({
  getMembersList: (params) => dispatch(getMembersList(params)),
  resetComponentStore: () => dispatch(resetSearchMember()),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchMember);
