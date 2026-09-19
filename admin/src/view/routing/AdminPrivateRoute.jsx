import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Spinner from "@src/view/spinners/Spinner";
import { isAdminOrSubAdmin } from "@src/utils/helper";

const AdminPrivateRoute = ({
  component,
  adminAuth: { isAdminAuthenticated, adminLoading, admin },
  ...rest
}) => {
  // If isAdminAuthenticated is null, show loading spinner
  if (isAdminAuthenticated === null || adminLoading) {
    return (
      <div className="center-loader">
        <Spinner minHeight="100vh" />
      </div>
    );
  }

  // If false, redirect to login
  if (!isAdminAuthenticated || !admin) {
    return <Navigate to="/" />;
  }

  // If true, allow access
  return <Outlet />;
};

AdminPrivateRoute.propTypes = {
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {})(AdminPrivateRoute);
