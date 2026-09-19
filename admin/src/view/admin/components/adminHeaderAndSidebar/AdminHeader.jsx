import React, { useState, useEffect } from "react";
import { Container, Dropdown, Nav, Navbar, Row, Col } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

// icons
import { RiMenu2Line } from "react-icons/ri";
import { FaUser } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { MdPowerSettingsNew } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";

// custom imports
import AdminSidebar from "./AdminSidebar";
import AdminLogoutModal from "../../modals/AdminLogoutModal";
import { updateSidebarExpendedAction } from "@src/actions/adminAuth";
import AdminSidebarItems from "./Index";
import { capitalizeAll } from "@src/utils/helper";

const AdminHeader = ({ adminAuth: { admin }, updateSidebarExpendedAction }) => {
  const [modalShow, setModalShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Initialize with generic heading - will be updated by AdminSidebar based on current route
  const [heading, setHeading] = useState("Admin Panel");

  useEffect(() => {
    // Handle special routes first
    if (location.pathname === "/admin/no-access") {
      setHeading("No Access");
      return;
    }

    // Find the exact item whose path matches (prefer child over parent so we show "Application Settings" not "Settings")
    const findHeadingByPath = (items, pathname) => {
      for (const item of items) {
        if (item.path === pathname) return item.heading;
        if (item.children) {
          const childHeading = findHeadingByPath(item.children, pathname);
          if (childHeading) return childHeading;
        }
      }
      return null;
    };

    const resolvedHeading = findHeadingByPath(AdminSidebarItems, location.pathname);
    if (resolvedHeading) {
      setHeading(resolvedHeading);
    }
    // Note: AdminSidebar will also update heading when user clicks a menu item
  }, [location.pathname]);

  const handleShow = () => {
    updateSidebarExpendedAction();
  };

  const handleLogout = async () => {
    setModalShow(true);
  };

  return (
    <Navbar className="layout-header-navbar">
      <Container fluid>
        <Navbar.Brand>
          <RiMenu2Line
            onClick={handleShow}
            size={25}
            className="pointer-icon"
          />
          {heading}
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav
            className="me-auto my-2 my-lg-0 layout-header-nav"
            navbarScroll
          ></Nav>

          <Dropdown align="end">
            <Dropdown.Toggle variant="link" bsPrefix="p-0">
              <FaUser className="text-black me-3" size={20} />
            </Dropdown.Toggle>
            <Dropdown.Menu className="layout-header-profile-menu">
              <Container>
                <Row className="gap-2 mb-2 pb-2 layout-header-profile-icon">
                  <Col xs={12} className="text-center">
                    <FaRegCircleUser size={40} />
                  </Col>
                  <Col xs={12} className="text-center">
                    {admin && admin.name ? capitalizeAll(admin?.name) : "user"}
                  </Col>
                </Row>
              </Container>
              <Dropdown.Item onClick={() => navigate("/admin/change-password")}>
                <IoSettingsOutline size={18} /> Change Password
              </Dropdown.Item>
              <Dropdown.Item className="text-danger" onClick={handleLogout}>
                <MdPowerSettingsNew size={18} /> Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Navbar.Collapse>
      </Container>
      <AdminSidebar setHeading={setHeading} />

      <AdminLogoutModal show={modalShow} onHide={() => setModalShow(false)} />
    </Navbar>
  );
};

AdminHeader.propTypes = {
  adminAuth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {
  updateSidebarExpendedAction,
})(AdminHeader);
