import React from "react";
import PropTypes from "prop-types";
import { Col, Modal, Button, Image } from "react-bootstrap";
import { connect } from "react-redux";

// icons
import { TiWarning } from "react-icons/ti";

import { logoutAuthActions } from "@src/actions/auth";

const ChangePasswordLogoutModal = ({ show, onHide, logoutAuthActions }) => {
  const handleLogout = async () => {
    await logoutAuthActions();
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
          <TiWarning className="logout-icon" size={32} />
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="logout-modal-body">
        Your password has been changed successfully. Please log out and log back
        in to apply the changes.
      </Modal.Body>
      <Modal.Footer className="logout-modal-footer">
        <Col className="text-center">
          <Button
            type="submit"
            className="btn-logout-confirm p-2"
            onClick={handleLogout}
          >
            Confirm
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

ChangePasswordLogoutModal.propTypes = {
  logoutAuthActions: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, { logoutAuthActions })(
  ChangePasswordLogoutModal,
);
