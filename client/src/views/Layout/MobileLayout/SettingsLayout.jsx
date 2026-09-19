import React from "react";
import { Card, Row, Col, Container } from "react-bootstrap";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FaUser,
  FaShieldAlt,
  FaKey,
  FaMoneyCheckAlt,
  FaUserLock,
  FaQrcode,
  FaLandmark,
  FaWallet,
  FaUniversity,
} from "react-icons/fa";

const SettingsLayout = () => {
  const location = useLocation();
  const settingsLinks = [
    {
      path: "/user/profile",
      label: "Profile",
      icon: FaUser,
      description: "Manage your personal information and contact details",
    },
    {
      path: "/user/change-login-password",
      label: "Login Password",
      icon: FaKey,
      description:
        "Update your account login password and two-factor authentication",
    },
  ];

  return (
    <Container className="card-settings-layout">
      <div className="card-heading-styled">
        <div className="heading-underline-decoration">Account Settings !</div>
      </div>
      <Row className="g-4 mb-5">
        {settingsLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;

          return (
            <Col key={link.path} xs={12} md={6} lg={4}>
              <NavLink
                to={link.path}
                className={`card-settings-link ${isActive ? "active" : ""}`}
              >
                <Card className="h-100 card-settings">
                  <Card.Body className="d-flex align-items-center">
                    <div className="card-settings-icon">
                      <Icon size={24} />
                    </div>
                    <div className="ms-3">
                      <Card.Title className="mb-1 text-muted-desc">
                        {link.label}
                      </Card.Title>
                      <Card.Text className="text-muted-desc small">
                        {link.description}
                      </Card.Text>
                    </div>
                  </Card.Body>
                </Card>
              </NavLink>
            </Col>
          );
        })}
      </Row>

      <div className="card-settings-content">
        <Outlet />
      </div>
    </Container>
  );
};

export default SettingsLayout;
