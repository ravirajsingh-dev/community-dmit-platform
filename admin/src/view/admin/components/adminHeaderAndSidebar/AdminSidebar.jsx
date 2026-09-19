import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Offcanvas, Accordion } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { FiChevronDown } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";

import AdminSidebarItems from "./Index";
import AdminLogoutModal from "../../modals/AdminLogoutModal";
import { filterMenuByPermissions } from "@src/utils/permissions";
import { updateSidebarExpendedAction } from "@src/actions/adminAuth";

const AdminSidebar = ({
  setHeading,
  adminAuth: { isSidebarExpended, admin },
  updateSidebarExpendedAction,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeItem, setActiveItem] = useState(null);
  const [openItems, setOpenItems] = useState([]);
  const [modalShow, setModalShow] = useState(false);

  const filteredItems = filterMenuByPermissions(AdminSidebarItems, admin);

  const findActiveInTree = (items, pathname, parentKeys = []) => {
    for (const item of items) {
      if (item.path === pathname) {
        return { key: item.key, heading: item.heading, parentKeys };
      }
      if (item.children) {
        const found = findActiveInTree(item.children, pathname, [...parentKeys, item.key]);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    for (const item of filteredItems) {
      const found = findActiveInTree(item.children || [item], location.pathname, item.children ? [item.key] : []);
      if (found) {
        setActiveItem(found.key);
        setOpenItems(found.parentKeys);
        setHeading(found.heading);
        return;
      }
      if (!item.children && item.path === location.pathname) {
        setActiveItem(item.key);
        setHeading(item.heading);
        return;
      }
    }
  }, [location.pathname, filteredItems, setHeading]);

  const handleNavigate = (item) => {
    setActiveItem(item.key);
    setHeading(item.heading);
    navigate(item.path);
    updateSidebarExpendedAction(); // mobile auto close
  };

  const toggleAccordion = (key) => {
    setOpenItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <>
      <Offcanvas
        show={isSidebarExpended}
        backdrop={false}
        enforceFocus={false}
        keyboard={false}
        scroll
        placement="start"
        className="admin-sidebar"
      >
        <Offcanvas.Header className="admin-sidebar__header">
          <Offcanvas.Title className="admin-sidebar__title">
            Admin Panel
          </Offcanvas.Title>

          <IoMdClose
            className="sidebar-close"
            size={22}
            onClick={updateSidebarExpendedAction}
          />
        </Offcanvas.Header>

        <Offcanvas.Body className="admin-sidebar__body">
          {filteredItems.map((item) =>
            item.children ? (
              <Accordion
                key={item.key}
                activeKey={openItems.includes(item.key) ? item.key : null}
                className="sidebar-accordion"
              >
                <Accordion.Item eventKey={item.key}>
                  <div
                    className="sidebar-item sidebar-item--parent"
                    onClick={() => toggleAccordion(item.key)}
                  >
                    <span className="sidebar-item__text">{item.label}</span>
                    <FiChevronDown
                      className={`sidebar-item__arrow ${
                        openItems.includes(item.key) ? "rotate" : ""
                      }`}
                    />
                  </div>

                  <Accordion.Body>
                    {item.children.map((child) =>
                      child.children ? (
                        <Accordion
                          key={child.key}
                          activeKey={
                            openItems.includes(child.key) ? child.key : null
                          }
                          className="sidebar-accordion sidebar-accordion--nested"
                        >
                          <Accordion.Item eventKey={child.key}>
                            <div
                              className="sidebar-item sidebar-item--parent sidebar-item--nested"
                              onClick={() => toggleAccordion(child.key)}
                            >
                              <span className="sidebar-item__text">
                                {child.label}
                              </span>
                              <FiChevronDown
                                className={`sidebar-item__arrow ${
                                  openItems.includes(child.key)
                                    ? "rotate"
                                    : ""
                                }`}
                              />
                            </div>
                            <Accordion.Body>
                              {child.children.map((grandchild) => (
                                <div
                                  key={grandchild.key}
                                  className={`sidebar-item sidebar-item--child ${
                                    activeItem === grandchild.key
                                      ? "sidebar-item--active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleNavigate(grandchild)
                                  }
                                >
                                  <span className="sidebar-item__text">
                                    {grandchild.label}
                                  </span>
                                </div>
                              ))}
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      ) : (
                        <div
                          key={child.key}
                          className={`sidebar-item sidebar-item--child ${
                            activeItem === child.key
                              ? "sidebar-item--active"
                              : ""
                          }`}
                          onClick={() => handleNavigate(child)}
                        >
                          <span className="sidebar-item__text">
                            {child.label}
                          </span>
                        </div>
                      )
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            ) : (
              <div
                key={item.key}
                className={`sidebar-item ${
                  activeItem === item.key ? "sidebar-item--active" : ""
                }`}
                onClick={() => handleNavigate(item)}
              >
                <span className="sidebar-item__text">{item.label}</span>
              </div>
            )
          )}

          <div
            className="sidebar-item sidebar-item--danger"
            onClick={() => setModalShow(true)}
          >
            <span className="sidebar-item__text">Logout</span>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <AdminLogoutModal show={modalShow} onHide={() => setModalShow(false)} />
    </>
  );
};

AdminSidebar.propTypes = {
  setHeading: PropTypes.func.isRequired,
  adminAuth: PropTypes.object.isRequired,
  updateSidebarExpendedAction: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminAuth: state.adminAuth,
});

export default connect(mapStateToProps, {
  updateSidebarExpendedAction,
})(AdminSidebar);
