import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import MemberFilters from "./MemberFilters";
import { setAppliedParams } from "@src/reducers/searchMemberReducer";
import { getInitialSortingParams } from "@src/constants";

const MemberFiltersPage = ({ appliedParams, setAppliedParams }) => {
  const navigate = useNavigate();

  const defaultParams = getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
  });

  const onFilterChange = (newParams) => {
    const merged = {
      ...defaultParams,
      ...newParams,
      page: 1,
    };
    setAppliedParams(merged);
    navigate("/user/search-member");
  };

  return (
    <Container>
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Member Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on
              Search Member page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParams(null);
              navigate("/user/search-member");
            }}
          >
            Back to Search Member
          </Button>
        </div>

        <div className="table-filter-section">
          <MemberFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.searchMember.appliedParams,
});

const mapDispatchToProps = {
  setAppliedParams,
};

export default connect(mapStateToProps, mapDispatchToProps)(MemberFiltersPage);
