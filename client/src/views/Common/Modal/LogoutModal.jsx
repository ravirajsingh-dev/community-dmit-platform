import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Col, Modal, Button } from "react-bootstrap";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "@src/actions/auth";
import { FaExclamationTriangle } from "react-icons/fa"; // FA warning icon

const LogoutModal = ({ show, onHide, logout, isAuthenticated }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasInitiatedLogoutRef = useRef(false);
  const hasClosedRef = useRef(false);
  const navigate = useNavigate();
  const logoutTimeoutRef = useRef(null);

  // Close modal when authentication state changes to false (logout successful)
  // This handles cases where logout completes but onHide wasn't called yet
  useEffect(() => {
    if (!isAuthenticated && show && hasInitiatedLogoutRef.current && !hasClosedRef.current) {
      hasClosedRef.current = true;
      setIsLoggingOut(false);
      onHide();
      // Force navigation to login if still on protected route
      if (window.location.pathname.startsWith('/user/')) {
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, show, onHide, navigate]);

  // Reset state when modal is closed or opened
  useEffect(() => {
    if (!show) {
      setIsLoggingOut(false);
      hasInitiatedLogoutRef.current = false;
      hasClosedRef.current = false;
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }
    }
  }, [show]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut || hasInitiatedLogoutRef.current) {
      return;
    }

    try {
      setIsLoggingOut(true);
      hasInitiatedLogoutRef.current = true;
      hasClosedRef.current = false;
      
      // Call logout action
      await logout();
      
      // Close modal after logout completes
      // Only close if not already closed by the useEffect watching isAuthenticated
      if (!hasClosedRef.current) {
        hasClosedRef.current = true;
        setIsLoggingOut(false);
        onHide();
      }

      // Fallback: Force redirect after a delay if still on protected route
      // This ensures logout works even if Redux state update is delayed
      // Only redirect if we're on a protected route
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/user/')) {
        logoutTimeoutRef.current = setTimeout(() => {
          // Double-check we're still on protected route before redirecting
          if (window.location.pathname.startsWith('/user/')) {
            window.location.href = '/login';
          }
        }, 800);
      }
    } catch (error) {
      // Ensure modal closes even if logout fails
      // Only close if not already closed
      if (!hasClosedRef.current) {
        hasClosedRef.current = true;
        setIsLoggingOut(false);
        hasInitiatedLogoutRef.current = false;
        onHide();
      }
      // Force logout on error - redirect to login if on protected route
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/user/')) {
        logoutTimeoutRef.current = setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    }
  };

  return (
    <Modal
      show={show}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      className="logout-modal"
    >
      <Modal.Header className="logout-modal-header">
        <Modal.Title className="logout-modal-title">
          <FaExclamationTriangle className="logout-icon" />
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="logout-modal-body">
        Do you want to log out?
      </Modal.Body>
      <Modal.Footer className="logout-modal-footer">
        <Col xs={5} className="text-center">
          <Button type="button" className="btn-logout-cancel" onClick={onHide}>
            Close
          </Button>
        </Col>
        <Col className="text-center">
          <Button
            type="button"
            className="btn-logout-confirm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Confirm"}
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

LogoutModal.propTypes = {
  logout: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { logout })(LogoutModal);
