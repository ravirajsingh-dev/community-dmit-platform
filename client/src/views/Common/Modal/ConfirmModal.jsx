import React from "react";
import PropTypes from "prop-types";
import { Modal, Button, Col, Spinner } from "react-bootstrap";

const ConfirmModal = ({
  show,
  onHide,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
  onConfirm,
  icon: Icon,
  danger = false,
}) => {
  const confirmVariant = danger ? "danger" : variant;

  return (
    <Modal show={show} onHide={onHide} centered className="logout-modal">
      <Modal.Header closeButton className="logout-modal-header">
        <Modal.Title className="logout-modal-title d-flex align-items-center gap-2">
          {Icon && <Icon size={18} />}
          <span>{title}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="logout-modal-body">
        <p className="mb-0">{body}</p>
      </Modal.Body>
      <Modal.Footer className="logout-modal-footer">
        <Col xs={5} className="text-center">
          <Button
            variant="outline-secondary"
            className="btn-logout-cancel"
            onClick={onHide}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
        </Col>
        <Col className="text-center">
          <Button
            variant={confirmVariant}
            className="btn-logout-confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Processing...</span>
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </Col>
      </Modal.Footer>
    </Modal>
  );
};

ConfirmModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  variant: PropTypes.string,
  isLoading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  icon: PropTypes.elementType,
  danger: PropTypes.bool,
};

export default ConfirmModal;
