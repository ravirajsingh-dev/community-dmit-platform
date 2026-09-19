import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Alert, Form } from "react-bootstrap";
import { adminFamilyService } from "@src/services/familyService";

/**
 * Admin Delete Member modal: deletion preview (strict vs subtree), transaction password required.
 * Reuses same backend APIs as Client; explains impact clearly.
 */
const FamilyMemberDeleteModal = ({
  show,
  onHide,
  member,
  targetUserId,
  onConfirm,
  loading,
}) => {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [strictMode, setStrictMode] = useState(false);
  const [txnPassword, setTxnPassword] = useState("");

  useEffect(() => {
    if (show && member?._id && targetUserId) {
      loadPreview();
    } else {
      setPreview(null);
      setError(null);
      setStrictMode(false);
      setTxnPassword("");
    }
  }, [show, member?._id, targetUserId]);

  const loadPreview = async () => {
    if (!member?._id || !targetUserId) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await adminFamilyService.getDeletionPreview(targetUserId, member._id);
      if (res?.status === true) {
        setPreview(res.response);
      } else {
        setError(res?.message || "Failed to load deletion preview");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load deletion preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!member?._id || !targetUserId) return;
    if (!txnPassword.trim()) {
      setError("Transaction password is required.");
      return;
    }
    await onConfirm(member._id, strictMode ? "strict" : undefined, txnPassword);
    setTxnPassword("");
  };

  const memberName = member
    ? `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unnamed"
    : "this member";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Member</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loadingPreview ? (
          <div className="text-center py-3">Loading deletion preview...</div>
        ) : preview ? (
          <>
            <p className="mb-3">
              Are you sure you want to delete <strong>"{preview.memberName || memberName}"</strong>?
            </p>
            <Alert variant="warning" className="mb-3">
              {strictMode ? (
                <>
                  <strong>Strict delete:</strong> Only deletes this person if they have no children.
                  <br />
                  <small className="text-danger">If the member has children, the delete will fail.</small>
                </>
              ) : (
                <>
                  <strong>Subtree delete:</strong> This will delete this person and all their descendants.
                  <br />
                  <small>Spouses and parents will NOT be deleted.</small>
                </>
              )}
            </Alert>
            {!strictMode && (
              <div className="mb-3">
                <p className="mb-1">
                  <strong>{preview.membersCount || 0}</strong> member{preview.membersCount !== 1 ? "s" : ""} will be deleted
                </p>
                {preview.marriagesCount > 0 && (
                  <p className="mb-1 text-muted">
                    <strong>{preview.marriagesCount}</strong> marriage{preview.marriagesCount !== 1 ? "s" : ""} will be deleted
                  </p>
                )}
                {preview.willDeleteFamily && (
                  <p className="mb-0 text-danger">
                    <strong>The entire family tree will be deleted</strong>
                  </p>
                )}
              </div>
            )}
            <Form.Check
              id="admin-delete-strict-mode"
              type="checkbox"
              label="Delete only if no children (strict)"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
              className="mb-3"
            />
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
          </>
        ) : (
          <>
            <p className="mb-3">
              Are you sure you want to delete <strong>"{memberName}"</strong>?
            </p>
            <Alert variant="warning" className="mb-2">
              {strictMode ? (
                <>
                  <strong>Strict:</strong> Delete only if this member has no children. Fails if they have children.
                </>
              ) : (
                <>
                  <strong>Subtree:</strong> Deletes this person and all their descendants.
                </>
              )}
            </Alert>
            <Form.Check
              id="admin-delete-strict-fallback"
              type="checkbox"
              label="Delete only if no children (strict)"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
              className="mb-3"
            />
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
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={loading || loadingPreview || !txnPassword.trim()}
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

FamilyMemberDeleteModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  member: PropTypes.object,
  targetUserId: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default FamilyMemberDeleteModal;
