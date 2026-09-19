import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MyBookingsFilters from "./MyBookingsFilters";
import { setAppliedParamsMyBookings } from "@src/actions/appointmentActions";

const defaultParams = {
  page: 1,
  limit: 20,
  status: "",
  dateFrom: "",
  dateTo: "",
  forWhomSearch: "",
  holderSearch: "",
  requestedFrom: "",
  requestedTo: "",
};

const MyBookingsFiltersPage = ({
  appliedParams,
  setAppliedParamsMyBookings,
}) => {
  const navigate = useNavigate();

  const onFilterChange = (newParams) => {
    const merged = { ...defaultParams, ...newParams, page: 1 };
    setAppliedParamsMyBookings(merged);
    navigate("/user/appointments/my");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="My Bookings Filters"
        crumbs={[
          { name: "Appointments", path: "/user/appointments" },
          { name: "My Bookings", path: "/user/appointments/my" },
          { name: "Filters" },
        ]}
      />
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">My Bookings Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on the
              My Bookings page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsMyBookings(null);
              navigate("/user/appointments/my");
            }}
          >
            Back to My Bookings
          </Button>
        </div>

        <div className="table-filter-section">
          <MyBookingsFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.appointment?.appliedParamsMyBookings ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsMyBookings,
};

export default connect(mapStateToProps, mapDispatchToProps)(MyBookingsFiltersPage);
