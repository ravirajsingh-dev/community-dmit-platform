import React, { useState, useEffect } from "react";
import { Modal, Button, Form, InputGroup } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import api from "@src/utils/axiosSetup";

import Errors from "@src/notifications/Errors";
import { walletTransfer } from "@src/actions/walletActions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";

const TransferModal = ({ show, onHide, walletTransfer, mainBalance }) => {
  const [memberId, setMemberId] = useState("");
  const [recipientName, setRecipientName] = useState(null);
  const [resolveError, setResolveError] = useState(null); // "self" | "not_found" | null
  const [amount, setAmount] = useState("");
  const [resolving, setResolving] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(null);

  useEffect(() => {
    if (show) {
      setRequestId(crypto.randomUUID());
    } else {
      setRequestId(null);
    }
  }, [show]);

  useEffect(() => {
    if (!memberId || memberId.length < 5) {
      setRecipientName(null);
      setResolveError(null);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setResolving(true);
      setResolveError(null);
      api
        .get("/api/users/resolve-member", {
          params: { memberId: memberId.trim().toUpperCase() },
        })
        .then((res) => {
          if (res.data?.status && res.data?.response?.user) {
            setRecipientName(res.data.response.user.name);
            setResolveError(null);
          } else {
            setRecipientName(null);
            setResolveError("not_found");
          }
        })
        .catch((err) => {
          setRecipientName(null);
          const isSelf =
            err?.response?.data?.errors?.some?.((e) =>
              /transfer to your own|cannot transfer to self/i.test(e?.msg || "")
            );
          setResolveError(isSelf ? "self" : "not_found");
        })
        .finally(() => setResolving(false));
    }, 400);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [memberId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = String(memberId).trim().toUpperCase();
    const amt = parseFloat(amount);
    if (!val || !amt || amt <= 0) return;
    if (!isValidMemberIdFormat(val)) return;
    if (amt > mainBalance) return;
    if (!requestId || submitting) return;
    setSubmitting(true);
    try {
      await walletTransfer(val, amt, requestId);
      onHide();
      setMemberId("");
      setAmount("");
      setRecipientName(null);
      setResolveError(null);
    } catch (err) {
      // Error handled in action; button re-enabled so user can retry with same requestId
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMemberId("");
    setAmount("");
    setRecipientName(null);
    setResolveError(null);
    onHide();
  };

  const handleMemberIdChange = createMemberIdChangeHandler(
    (e) => setMemberId(e.target.value),
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setMemberId(formatted),
  );
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    (e) => setMemberId(e.target.value),
    "memberId",
  );

  const amtNum = parseFloat(amount) || 0;
  const isValid =
    !!recipientName &&
    amtNum > 0 &&
    amtNum <= mainBalance &&
    isValidMemberIdFormat(memberId);

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Transfer to Member</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Member ID</Form.Label>
            <Form.Control
              type="text"
              value={memberId}
              onChange={handleMemberIdChange}
              onPaste={handleMemberIdPaste}
              onKeyDown={handleMemberIdKeyDown}
              placeholder="G123456789"
              maxLength={10}
              className="text-muted"
            />
            {resolving && <small className="text-muted">Looking up...</small>}
            {!resolving && recipientName && (
              <small className="text-success d-block">✓ {recipientName}</small>
            )}
            {!resolving && memberId.length >= 10 && !recipientName && (
              <small className="text-danger d-block">
                {resolveError === "self" ? "Self transfer not allowed" : "Member not found or inactive"}
              </small>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0.01"
              max={mainBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Form.Text className="text-muted">
              Available: ₹ {Number(mainBalance).toFixed(2)}
            </Form.Text>
          </Form.Group>
          <Errors current_key="toMemberId" />
          <Errors current_key="amount" />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid || submitting || !requestId}
        >
          {submitting ? "Transferring..." : "Transfer"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

TransferModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  walletTransfer: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  mainBalance: state.wallet?.mainBalance ?? 0,
});

export default connect(mapStateToProps, { walletTransfer })(TransferModal);
