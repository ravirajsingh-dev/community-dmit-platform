import React, { useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form } from "react-bootstrap";

/**
 * Admin End Marriage modal: choose divorced or widowed, transaction password required.
 * Reuses same backend updateMarriage logic as Client.
 */
const MarriageEndModal = ({
  show,
  onHide,
  marriage,
  membersById = new Map(),
  getMemberDisplayName,
  targetUserId,
  onConfirm,
  loading,
}) => {
  const [status, setStatus] = useState("divorced");
  const [txnPassword, setTxnPassword] = useState("");

  const handleConfirm = async () => {
    if (!marriage?._id || !targetUserId) return;
    if (!txnPassword.trim()) return;
    await onConfirm(marriage._id, { status, txn_password: txnPassword });
    setTxnPassword("");
    setStatus("divorced");
  };

  const marriageDisplayName = marriage
    ? (() => {
        const s1 = membersById.get(String(marriage.spouse1Id));
        const s2 = membersById.get(String(marriage.spouse2Id));
        return getMemberDisplayName
          ? [getMemberDisplayName(s1), getMemberDisplayName(s2)].join(" + ")
          : `${s1?.firstName || ""} ${s2?.firstName || ""}`.trim() || "Marriage";
      })()
    : "";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>End marriage</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          End this marriage? {marriageDisplayName && (
            <span className="text-muted d-block mt-1">{marriageDisplayName}</span>
          )}
        </p>
        <Form.Group className="mb-3">
          <Form.Label>Status</Form.Label>
          <Form.Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-0">
          <Form.Label>Transaction password (required)</Form.Label>
          <Form.Control
            type="password"
            value={txnPassword}
            onChange={(e) => setTxnPassword(e.target.value)}
            placeholder="Enter transaction password"
            autoComplete="off"
          />
        </Form.Group>
        <p className="mt-2 mb-0 small text-muted">
          The marriage will remain visible. Spouses can remarry.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={loading || !txnPassword.trim()}
        >
          {loading ? "Updating…" : "End marriage"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

MarriageEndModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  marriage: PropTypes.object,
  membersById: PropTypes.object,
  getMemberDisplayName: PropTypes.func.isRequired,
  targetUserId: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default MarriageEndModal;
