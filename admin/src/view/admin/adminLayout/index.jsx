import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

// custom imports
import AdminRoutes from "@src/view/routing/AdminRoutes";
import { isAdminOrSubAdmin, isAdmin } from "@src/utils/helper";
import { canAccessRoute, getFirstAllowedRoute } from "@src/utils/permissions";
import AdminHeader from "../components/adminHeaderAndSidebar/AdminHeader";
import ShowAlert from "@src/notifications/ShowAlert";

const AdminLayout = ({ adminAuth: { admin, isSidebarExpended } }) => {
  const navigate = useNavigate();
  const location = useLocation();

      // Redirect /admin root path to first allowed route
      useEffect(() => {
        if (location.pathname === "/admin" || location.pathname === "/admin/") {
          if (admin) {
            const firstRoute = getFirstAllowedRoute(admin, AdminRoutes);
            if (firstRoute) {
              navigate(firstRoute, { replace: true });
            } else {
              // No permissions assigned
              navigate("/admin/no-access", { replace: true });
            }
          }
        }
      }, [location.pathname, admin, navigate]);

  return (
    <div
      id="Admin"
      className={`layout-dashboard-container ${isSidebarExpended ? "show" : "hide"}`}
    >
      <AdminHeader />
      <ShowAlert />
      <div className="layout-scrollable-content py-3">
        <Routes>
          {AdminRoutes.map((route, i) => {
            // No Access route is always accessible
            if (route.path === "no-access") {
              return <Route path={route.path} element={route.element} key={i} />;
            }

            // Change Password route is accessible to all admins and sub-admins
            if (route.path === "change-password") {
              if (isAdminOrSubAdmin(admin)) {
                return <Route path={route.path} element={route.element} key={i} />;
              } else {
                return null;
              }
            }

            // Sub-admin management routes are admin-only
            if (route.path.startsWith("sub-admins")) {
              if (isAdmin(admin)) {
                return <Route path={route.path} element={route.element} key={i} />;
              } else {
                return null; // Don't render route for sub-admins
              }
            }
            // Check if user is admin or sub-admin and has permission for this route
            // Pass full path with /admin prefix for permission check
            const fullPath = `/admin/${route.path}`;
            if (isAdminOrSubAdmin(admin) && canAccessRoute(fullPath, admin)) {
              return <Route path={route.path} element={route.element} key={i} />;
            } else {
              return null; // Don't render route if no permission
            }
          })}
          {/* Catch-all route: redirect to first allowed route if no route matches */}
          {admin && isAdminOrSubAdmin(admin) && (
            <Route
              path="*"
              element={
                <Navigate
                  to={getFirstAllowedRoute(admin, AdminRoutes) || "/admin/no-access"}
                  replace
                />
              }
            />
          )}
        </Routes>
      </div>
    </div>
  );
};

AdminLayout.propTypes = {
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
});
export default connect(mapStateToProps, {})(AdminLayout);
