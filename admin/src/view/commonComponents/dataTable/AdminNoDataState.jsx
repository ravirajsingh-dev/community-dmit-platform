import React from "react";
import PropTypes from "prop-types";
import { FiCalendar } from "react-icons/fi";

const AdminNoDataState = ({ title = "No records found", description = "" }) => {
  return (
    <div className="appointment-empty-state">
      <div className="appointment-empty-state__icon">
        <FiCalendar size={18} />
      </div>
      <div className="appointment-empty-state__title">{title}</div>
      {description ? (
        <div className="appointment-empty-state__text">{description}</div>
      ) : null}
    </div>
  );
};

AdminNoDataState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
};

export default AdminNoDataState;
