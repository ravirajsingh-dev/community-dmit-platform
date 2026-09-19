import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MyCounsellingFilters from "./MyCounsellingFilters";
import { setAppliedParamsMyCounselling } from "@src/actions/counsellingActions";

const defaultParams = {
  page: 1,
  limit: 20,
  status: "",
};

const MyCounsellingFiltersPage = ({
  appliedParams,
  setAppliedParamsMyCounselling,
}) => {
  const navigate = useNavigate();

  const onFilterChange = (newParams) => {
    const merged = { ...defaultParams, ...newParams, page: 1 };
    setAppliedParamsMyCounselling(merged);
    navigate("/user/appointments/counselling");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="My Counselling Filters"
        crumbs={[
          { name: "Appointments", path: "/user/appointments" },
          { name: "My Counselling", path: "/user/appointments/counselling" },
          { name: "Filters" },
        ]}
      />
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">My Counselling Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on the
              My Counselling page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsMyCounselling(null);
              navigate("/user/appointments/counselling");
            }}
          >
            Back to My Counselling
          </Button>
        </div>

        <div className="table-filter-section">
          <MyCounsellingFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.counselling?.appliedParamsMyCounselling ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsMyCounselling,
};

export default connect(mapStateToProps, mapDispatchToProps)(MyCounsellingFiltersPage);
