import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

import ShowAlert from "@src/notifications/ShowAlert";

import Header from "./Components/Header";
import DefaultFooter from "./Components/DefaultFooter";
import BouncingLoader from "../Common/Loaders/BouncingLoader";
import { getCommonSettings } from "@src/actions/commonActions";

const PortalLayout = ({
  auth: { isAuthenticated, loading, user },
  alerts,
  common: { commonSettings },
  getCommonSettings,
}) => {
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsAuthChecked(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!user) return;
  }, [user]);

  useEffect(() => {
    // Fetch common settings when component mounts
    getCommonSettings();
  }, [getCommonSettings]);

  if (loading || !isAuthChecked) {
    return <BouncingLoader minHeight="500px" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <HelmetProvider>
      <ShowAlert />
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <div className="flex-grow-1">
          <Outlet />
        </div>

        <DefaultFooter />
      </div>
    </HelmetProvider>
  );
};

PortalLayout.propTypes = {
  auth: PropTypes.object.isRequired,
  alerts: PropTypes.array.isRequired,
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  alerts: state.alert || [],
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(PortalLayout);
