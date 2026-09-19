import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import TeamFilters from "./TeamFilters";
import { setAppliedParamsDirect } from "@src/reducers/teamReducer";
import { getInitialSortingParams } from "@src/constants";

const DirectTeamFiltersPage = ({ appliedParams, setAppliedParamsDirect }) => {
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
    setAppliedParamsDirect(merged);
    navigate("/user/team/direct");
  };

  return (
    <Container>
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Direct Team Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on
              Direct Team page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsDirect(null);
              navigate("/user/team/direct");
            }}
          >
            Back to Direct Team
          </Button>
        </div>

        <div className="table-filter-section">
          <TeamFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.team?.appliedParamsDirect ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsDirect,
};

export default connect(mapStateToProps, mapDispatchToProps)(DirectTeamFiltersPage);
