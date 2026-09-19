import React from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";

const MarriageDivorceModal = ({ show, onHide, marriageDisplayName, onConfirm, loading }) => (
  <Modal show={show} onHide={onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>End marriage (divorce)</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p className="mb-0">
        Are you sure you want to mark this marriage as <strong>divorced</strong>?
        {marriageDisplayName && (
          <>
            {" "}
            <br />
            <span className="text-muted">{marriageDisplayName}</span>
          </>
        )}
      </p>
      <p className="mt-2 mb-0 small text-muted">
        The marriage will remain visible in the tree. Spouses will be able to remarry.
      </p>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide} disabled={loading}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={loading}>
        {loading ? "Updating…" : "Divorce"}
      </Button>
    </Modal.Footer>
  </Modal>
);

MarriageDivorceModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  marriageDisplayName: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default MarriageDivorceModal;
