import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import TeamFilters from "./TeamFilters";
import { setAppliedParamsLevelTeam } from "@src/reducers/teamReducer";
import { getInitialSortingParams } from "@src/constants";

const LevelWiseTeamFiltersPage = ({
  appliedParams,
  setAppliedParamsLevelTeam,
}) => {
  const navigate = useNavigate();

  const defaultParams = getInitialSortingParams({
    orderBy: "createdAt",
    ascending: "desc",
    filters: [],
    query: {},
    level: 1,
  });

  const onFilterChange = (newParams) => {
    const merged = {
      ...defaultParams,
      ...newParams,
      page: 1,
    };
    setAppliedParamsLevelTeam(merged);
    navigate("/user/team/level");
  };

  return (
    <Container>
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Level-Wise Team Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on
              Level-Wise Team page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsLevelTeam(null);
              navigate("/user/team/level");
            }}
          >
            Back to Level-Wise Team
          </Button>
        </div>

        <div className="table-filter-section">
          <TeamFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
            showLevelWiseLevelFilter
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.team?.appliedParamsLevelTeam ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsLevelTeam,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LevelWiseTeamFiltersPage);
