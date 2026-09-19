import React from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form } from "react-bootstrap";
import { FaLink } from "react-icons/fa";
import { isValidEPinFormat, formatEPinInput } from "@src/utils/epinFormatter";

const ShareReferralModal = ({
  show,
  onHide,
  loggedInUser,
  loadingEpins,
  unusedEpins,
  selectedEpinId,
  setSelectedEpinId,
  copyReferralLink,
}) => (
  <Modal show={show} onHide={onHide} className="dash__share-modal" centered>
    <Modal.Header closeButton className="dash__share-modal-header">
      <Modal.Title className="dash__share-modal-title">
        <FaLink /> Share Referral Link
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="dash__share-modal-body">
      <p className="dash__share-modal-desc">
        Share your referral link. Add an optional E-PIN to pre-fill for the new
        user.
      </p>
      <div className="dash__share-epin-field">
        <Form.Label>Referral ID</Form.Label>
        <Form.Control
          type="text"
          value={loggedInUser?.memberId || ""}
          readOnly
          className="dash__share-epin-input"
        />
      </div>
      <div className="dash__share-epin-field">
        <Form.Label>E-PIN (optional)</Form.Label>
        {loadingEpins ? (
          <span className="dash__share-epin-loading">Loading E-PINs…</span>
        ) : unusedEpins.length > 0 ? (
          <Form.Select
            value={selectedEpinId}
            onChange={(e) => setSelectedEpinId(e.target.value)}
            className="dash__share-epin-select"
          >
            <option value="">— Select E-PIN —</option>
            {unusedEpins.map((ep) => (
              <option key={ep._id} value={ep.epinId}>
                {ep.epinId}
              </option>
            ))}
          </Form.Select>
        ) : (
          <>
            <Form.Control
              type="text"
              placeholder="G8F7K29J3L9X2Q1R5T6"
              value={selectedEpinId}
              onChange={(e) =>
                setSelectedEpinId(formatEPinInput(e.target.value))
              }
              minLength={20}
              maxLength={20}
              isInvalid={
                !!(selectedEpinId && !isValidEPinFormat(selectedEpinId))
              }
              className="dash__share-epin-input"
            />
            {selectedEpinId && !isValidEPinFormat(selectedEpinId) && (
              <Form.Control.Feedback type="invalid">
                Invalid E-PIN format. Expected: G followed by 19 characters
                (e.g. G8F7K29J3L9X2Q1R5T6)
              </Form.Control.Feedback>
            )}
          </>
        )}
      </div>
    </Modal.Body>
    <Modal.Footer className="dash__share-modal-footer">
      <Button variant="outline-secondary" onClick={onHide}>
        Cancel
      </Button>
      <Button
        variant="primary"
        className="dash__share-copy-btn"
        onClick={copyReferralLink}
      >
        Copy Link
      </Button>
    </Modal.Footer>
  </Modal>
);

ShareReferralModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  loggedInUser: PropTypes.object,
  loadingEpins: PropTypes.bool,
  unusedEpins: PropTypes.arrayOf(PropTypes.object),
  selectedEpinId: PropTypes.string.isRequired,
  setSelectedEpinId: PropTypes.func.isRequired,
  copyReferralLink: PropTypes.func.isRequired,
};

ShareReferralModal.defaultProps = {
  loggedInUser: null,
  loadingEpins: false,
  unusedEpins: [],
};

export default ShareReferralModal;
