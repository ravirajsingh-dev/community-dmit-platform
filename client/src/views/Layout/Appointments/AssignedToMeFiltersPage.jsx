import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import AssignedToMeFilters from "./AssignedToMeFilters";
import { setAppliedParamsAssignedToMe } from "@src/actions/appointmentActions";

const defaultParams = {
  page: 1,
  limit: 20,
  status: "",
  dateFrom: "",
  dateTo: "",
  designationCode: "",
  forWhomSearch: "",
  requestedFrom: "",
  requestedTo: "",
};

const AssignedToMeFiltersPage = ({
  appliedParams,
  setAppliedParamsAssignedToMe,
}) => {
  const navigate = useNavigate();

  const onFilterChange = (newParams) => {
    const merged = { ...defaultParams, ...newParams, page: 1 };
    setAppliedParamsAssignedToMe(merged);
    navigate("/user/appointments/assigned");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Assigned to Me Filters"
        crumbs={[
          { name: "Appointments", path: "/user/appointments" },
          { name: "Assigned to Me", path: "/user/appointments/assigned" },
          { name: "Filters" },
        ]}
      />
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Assigned to Me Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on the
              Assigned to Me page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsAssignedToMe(null);
              navigate("/user/appointments/assigned");
            }}
          >
            Back to Assigned to Me
          </Button>
        </div>

        <div className="table-filter-section">
          <AssignedToMeFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.appointment?.appliedParamsAssignedToMe ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsAssignedToMe,
};

export default connect(mapStateToProps, mapDispatchToProps)(AssignedToMeFiltersPage);
