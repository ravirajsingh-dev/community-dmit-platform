import React, { useState, useEffect, useRef, useCallback } from "react";
import { Container, Row, Col, Button, Image } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaSignOutAlt, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import PortalItems from "@src/views/Routing/PortalItems";
import { BiSolidChevronDown } from "react-icons/bi";
import { getAppointmentIcon } from "@src/constants/appointmentIcons";
import Sidebar from "./Sidebar";
import { connect } from "react-redux";
import { logout } from "@src/actions/auth";
import { getCommonSettings } from "@src/actions/commonActions";
import LogoutModal from "@src/views/Common/Modal/LogoutModal";
import LogoSpinner from "@src/views/Common/Loaders/LogoSpinner";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";

const Header = ({
  logout,
  isAuthenticated,
  commonSettings,
  loadingCommonSettings,
  getCommonSettings,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const headerRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleLogoutModal = () => setShowLogoutModal(!showLogoutModal);

  // Close dropdown when route changes or click outside
  useEffect(() => setOpenDropdown(null), [location.pathname]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target))
        setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isNavItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children) {
      return item.children.some(
        (c) =>
          location.pathname === c.path ||
          location.pathname.startsWith(c.path + "/"),
      );
    }
    return false;
  };

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  const socialMedia = commonSettings?.socialMedia || {};
  const logoUrl = commonSettings?.logoUrl;
  const loadingLogo = loadingCommonSettings || !logoUrl;

  // Separate items based on authentication
  const publicItems = PortalItems.filter((item) => !item.isAuth);
  const privateItems = isAuthenticated
    ? PortalItems.filter((item) => item.isAuth)
    : [];

  React.useEffect(() => {
    const stickyEnterThreshold = 345;
    const stickyExitThreshold = 305;
    let rafId = null;
    let stickyState = false;

    const updateHeaderStickyState = () => {
      const header = headerRef.current;
      if (!header) return;

      const scroll = window.scrollY || document.documentElement.scrollTop;
      const maxScrollableDistance =
        document.documentElement.scrollHeight - window.innerHeight;
      const canReachStickyThreshold =
        maxScrollableDistance > stickyEnterThreshold;

      let shouldStick = stickyState;
      if (!canReachStickyThreshold) {
        shouldStick = false;
      } else if (!stickyState && scroll >= stickyEnterThreshold) {
        shouldStick = true;
      } else if (stickyState && scroll <= stickyExitThreshold) {
        shouldStick = false;
      }

      const wrapper = header.closest("#top-menu");
      if (wrapper) {
        wrapper.style.setProperty(
          "--layout-header-height",
          `${header.offsetHeight}px`,
        );
      }

      header.classList.toggle("layout-header-sticky", shouldStick);
      stickyState = shouldStick;
      setIsHeaderSticky((prev) => (prev === shouldStick ? prev : shouldStick));
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateHeaderStickyState();
        rafId = null;
      });
    };

    updateHeaderStickyState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateHeaderStickyState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeaderStickyState);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const hasSocialLinks =
    socialMedia?.facebook ||
    socialMedia?.instagram ||
    socialMedia?.youtube ||
    socialMedia?.zoomMeeting;

  return (
    <header
      id="top-menu"
      className={isHeaderSticky ? "layout-header-has-sticky" : ""}
    >
      {hasSocialLinks && (
        <div className="layout-header-social-bar">
          <Container fluid>
            <div className="layout-header-social-inner">
              <SocialIcons socialMedia={socialMedia} size="small" />
            </div>
          </Container>
        </div>
      )}
      <div className="main-header-area p-2" ref={headerRef}>
        <Container fluid>
          <Row className="align-items-center justify-content-between header-bottom-border">
            <Col className="col-1">
              <div className="layout-header-logo">
                <Link to="/" title="Application Logo">
                  {loadingLogo ? (
                    <LogoSpinner />
                  ) : (
                    <Image src={logoUrl} alt="Application Logo" />
                  )}
                </Link>
              </div>
            </Col>
            <Col className="col-xl-10 d-none d-xl-block">
              <div className="layout-header-main-menu text-center" ref={navRef}>
                <nav>
                  <ul>
                    {[...publicItems, ...privateItems].map((item, i) => (
                      <li
                        key={i}
                        className={
                          openDropdown === item.label
                            ? "layout-header-dropdown-open"
                            : ""
                        }
                      >
                        {item.children ? (
                          <button
                            type="button"
                            className={`layout-header-nav-trigger ${isNavItemActive(item) ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(
                                openDropdown === item.label ? null : item.label,
                              );
                            }}
                          >
                            {item.label}{" "}
                            <BiSolidChevronDown className="layout-header-chevron" />
                          </button>
                        ) : (
                          <Link
                            to={item.path || "#"}
                            className={isNavItemActive(item) ? "active" : ""}
                          >
                            {item.label}
                          </Link>
                        )}
                        {item.children && (
                          <ul className="layout-header-submenu">
                            {item.children.map((subItem, j) => (
                              <li key={j}>
                                <Link
                                  to={subItem.path}
                                  className={`layout-header-submenu-item ${subItem.iconKey || subItem.icon ? "has-icon" : ""} ${location.pathname === subItem.path ? "active" : ""}`}
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  {subItem.iconKey &&
                                    getAppointmentIcon(subItem.iconKey) && (
                                      <span className="layout-header-submenu-icon">
                                        {React.createElement(
                                          getAppointmentIcon(subItem.iconKey),
                                          { size: 18 },
                                        )}
                                      </span>
                                    )}
                                  {!subItem.iconKey && subItem.icon && (
                                    <span className="layout-header-submenu-icon">
                                      {subItem.icon}
                                    </span>
                                  )}
                                  <span className="layout-header-submenu-content">
                                    <span className="layout-header-submenu-label">
                                      {subItem.label}
                                    </span>
                                    {subItem.subtitle && (
                                      <span className="layout-header-submenu-subtitle">
                                        {subItem.subtitle}
                                      </span>
                                    )}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </Col>
            <Col className="col-1 text-right justify-content-end d-flex">
              {isAuthenticated && (
                <div className="layout-header-hamburger-menu d-block d-xl-none">
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn btn-secondary"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                  >
                    <FaBars />
                  </Button>
                </div>
              )}
              <div
                className={`layout-header-auth-buttons gap-2 ${isAuthenticated ? "d-none d-xl-flex" : "d-flex"}`}
              >
                {isAuthenticated ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn btn-secondary"
                    onClick={toggleLogoutModal}
                  >
                    <FaSignOutAlt className="me-1" />
                    Logout
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      className="btn btn-secondary"
                      onClick={() => navigate("/register")}
                      aria-label="Register"
                      title="Register"
                    >
                      <FaUserPlus className="me-0 me-md-1" />
                      <span className="d-none d-md-inline">Register</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="btn btn-secondary"
                      onClick={() => navigate("/login")}
                      aria-label="Login"
                      title="Login"
                    >
                      <FaSignInAlt className="me-0 me-md-1" />
                      <span className="d-none d-md-inline">Login</span>
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <LogoutModal
        show={showLogoutModal}
        onHide={toggleLogoutModal}
        logout={logout}
      />
    </header>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  commonSettings: state.common?.commonSettings || {},
  loadingCommonSettings: state.common?.loadingCommonSettings || false,
});

export default connect(mapStateToProps, { logout, getCommonSettings })(Header);
