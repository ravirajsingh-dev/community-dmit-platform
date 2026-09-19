import React from "react";
import { Container, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import MainCard from "@src/views/Common/Cards/MainCard";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import BookAppointmentFilters from "./BookAppointmentFilters";
import { setAppliedParamsBookAppointment } from "@src/actions/appointmentActions";

const defaultParams = {
  page: 1,
  limit: 20,
  name: "",
  memberId: "",
  phone: "",
  rating: "",
  status: "",
  online: false,
  sameDownlineFirst: false,
  sortBy: "",
  countryId: null,
  stateId: null,
  districtId: null,
  villageId: null,
};

const BookAppointmentFiltersPage = ({
  appliedParams,
  setAppliedParamsBookAppointment,
}) => {
  const navigate = useNavigate();

  const onFilterChange = (newParams) => {
    const merged = { ...defaultParams, ...newParams, page: 1 };
    setAppliedParamsBookAppointment(merged);
    navigate("/user/appointments/book");
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Book Appointment Filters"
        crumbs={[
          { name: "Appointments", path: "/user/appointments" },
          { name: "Book Appointment", path: "/user/appointments/book" },
          { name: "Filters" },
        ]}
      />
      <MainCard>
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="mb-2">Book Appointment Filters</h4>
            <p className="text-muted mb-0">
              Set filter options and click Apply Filter. Results will show on the
              Book Appointment page.
            </p>
          </div>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setAppliedParamsBookAppointment(null);
              navigate("/user/appointments/book");
            }}
          >
            Back to Book Appointment
          </Button>
        </div>

        <div className="table-filter-section">
          <BookAppointmentFilters
            filterParams={appliedParams || defaultParams}
            onFilterChange={onFilterChange}
          />
        </div>
      </MainCard>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  appliedParams: state.appointment?.appliedParamsBookAppointment ?? null,
});

const mapDispatchToProps = {
  setAppliedParamsBookAppointment,
};

export default connect(mapStateToProps, mapDispatchToProps)(BookAppointmentFiltersPage);
