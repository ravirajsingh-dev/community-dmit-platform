import React, { useState, useEffect, useRef } from "react";
import { Button } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import PortalItems from "@src/views/Routing/PortalItems";
import { getAppointmentIcon } from "@src/constants/appointmentIcons";
import { connect } from "react-redux";
import { logout } from "@src/actions/auth";
import LogoutModal from "@src/views/Common/Modal/LogoutModal";

const Sidebar = ({ logout, isOpen, onClose, isAuthenticated }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef(null);

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const toggleLogoutModal = () => {
    setShowLogoutModal(!showLogoutModal);
  };

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isOpen || !sidebarRef.current) return;
      if (!sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter menu items based on authentication
  const filteredItems = PortalItems.filter(
    (item) => !item.isAuth || isAuthenticated
  );

  return (
    <>
      <div
        ref={sidebarRef}
        className={`sidebar-drawer ${isOpen ? "sidebar-drawer-open" : ""}`}
      >
        <div className="mobile-menu-close">
          <Link to="#" onClick={onClose}>
            <FaTimes />
          </Link>
        </div>

        <nav className="mobile-menu-nav">
          <ul id="mobile-menu-active" className="mobile-menu-list">
            {filteredItems.map((item, index) => {
              const isParentActive = item.children?.some(
                (c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/")
              );
              const isSingleItemActive =
                !item.children &&
                item.path &&
                (location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/"));
              return (
              <li
                key={index}
                className={`mobile-menu-has-dropdown ${
                  item.children ? "mobile-menu-with-children" : ""
                } ${openDropdown === item.label ? "mobile-menu-open" : ""} ${
                  isParentActive ? "mobile-menu-parent-active" : ""
                } ${isSingleItemActive ? "mobile-menu-item-active" : ""}`}
              >
                <Link
                  to={item.children ? "#" : item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleDropdown(item.label);
                    } else {
                      onClose();
                    }
                  }}
                >
                  {item.label}
                </Link>

                {item.children && (
                  <ul className="mobile-menu-sub-menu">
                    {item.children.map((child, childIndex) => {
                      const showIcon = item.label !== "Appointments" && (child.iconKey || child.icon);
                      return (
                      <li
                        key={childIndex}
                        className={
                          location.pathname === child.path ? "mobile-menu-item-active" : ""
                        }
                      >
                        <Link to={child.path} onClick={onClose} className={`mobile-menu-sub-item ${showIcon ? "has-icon" : ""}`}>
                          {showIcon && child.iconKey && getAppointmentIcon(child.iconKey) && (
                            <span className="mobile-menu-sub-icon">{React.createElement(getAppointmentIcon(child.iconKey), { size: 18 })}</span>
                          )}
                          {showIcon && !child.iconKey && child.icon && <span className="mobile-menu-sub-icon">{child.icon}</span>}
                          <span className="mobile-menu-sub-content">
                            <span className="mobile-menu-sub-label">{child.label}</span>
                            {child.subtitle && (
                              <span className="mobile-menu-sub-subtitle">{child.subtitle}</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                    })}
                  </ul>
                )}
              </li>
            );
            })}
          </ul>
        </nav>

        <div className="sidebar-auth-section">
          {isAuthenticated ? (
            <Button type="button" variant="secondary" className="btn btn-secondary" onClick={toggleLogoutModal}>
              Logout
            </Button>
          ) : (
            <Button variant="secondary" className="btn btn-secondary" href="/login">
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        show={showLogoutModal}
        onHide={toggleLogoutModal}
        logout={logout}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { logout })(Sidebar);
