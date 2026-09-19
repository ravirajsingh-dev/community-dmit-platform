import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import TeamFilters from "./TeamFilters";
import { setAppliedParamsMyTeam } from "@src/reducers/teamReducer";
import { getInitialSortingParams } from "@src/constants";

const MyTeamFiltersPage = ({ appliedParams, setAppliedParamsMyTeam }) => {
  const navigate = useNavigate();

  const defaultParams = getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
    levelFilter: "all",
  });

  const onFilterChange = (newParams) => {
    const merged = {
      ...defaultParams,
      ...newParams,
      page: 1,
    };
    setAppliedParamsMyTeam(merged);
    navigate("/user/team/all");
  };

  return (
    <Container>
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">My Team Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on
              My Team page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsMyTeam(null);
              navigate("/user/team/all");
            }}
          >
            Back to My Team
          </Button>
        </div>

        <div className="table-filter-section">
          <TeamFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
            showMyTeamLevelFilter
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.team?.appliedParamsMyTeam ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsMyTeam,
};

export default connect(mapStateToProps, mapDispatchToProps)(MyTeamFiltersPage);
