import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaWallet, FaCog, FaSearch, FaCalendarAlt } from "react-icons/fa";
import { RiTeamFill } from "react-icons/ri";

const MobileBottomNav = ({ isAuthenticated }) => {
  const location = useLocation();

  const navItems = [
    { path: "/user/dashboard", label: "Home", icon: FaHome },
    { path: "/user/appointments", label: "Appointments", icon: FaCalendarAlt },
    { path: "/user/families-layout", label: "Families", icon: FaWallet },
    {
      path: "/user/search-member-layout",
      label: "Search Member",
      icon: FaSearch,
    },
    {
      path: "/user/matrimonial-layout",
      label: "Matrimonial",
      icon: RiTeamFill,
    },
    { path: "/user/settings-layout", label: "Settings", icon: FaCog },
  ];

  return (
    <>
      {isAuthenticated && (
        <nav className="mobile-navigation-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`navigation-item ${isActive ? "active" : ""}`}
              >
                <Icon className="navigation-icon" />
                <span className="navigation-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
};

export default MobileBottomNav;
