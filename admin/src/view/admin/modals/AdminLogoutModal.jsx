import React from "react";
import { PropTypes } from "prop-types";
import { Col, Modal, Button, Image } from "react-bootstrap";
import { connect } from "react-redux";

// icons
import { adminLogout } from "@src/actions/adminAuth";
import { FcHighPriority } from "react-icons/fc";

const AdminLogoutModal = ({ show, onHide, adminLogout }) => {
  const handleLogout = async () => {
    await adminLogout();
  };
  return (
    <Modal
      show={show}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header className="modal-logout-header">
        <Modal.Title>
          <FcHighPriority size={80} />
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-logout-body">
        Do you want to log out?
      </Modal.Body>
      <Modal.Footer>
        <Col xs={5} className="text-center">
          <Button
            type="submit"
            className="btn-logout-modal-cancel"
            onClick={onHide}
          >
            Close
          </Button>
        </Col>
        <Col className="text-center">
          <Button
            type="submit"
            className="btn-logout-modal p-2"
            onClick={handleLogout}
          >
            Confirm
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

AdminLogoutModal.propTypes = {
  adminLogout: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, { adminLogout })(AdminLogoutModal);
