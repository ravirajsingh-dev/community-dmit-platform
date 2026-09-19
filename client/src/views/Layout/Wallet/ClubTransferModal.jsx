import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";

import Errors from "@src/notifications/Errors";
import { walletClubTransfer } from "@src/actions/walletActions";

const ClubTransferModal = ({
  show,
  onHide,
  availableClubs,
  clubBalances,
  walletClubTransfer,
}) => {
  const [clubKey, setClubKey] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(null);

  useEffect(() => {
    if (show) {
      setRequestId(crypto.randomUUID());
    } else {
      setRequestId(null);
    }
  }, [show]);

  const selectedClub = availableClubs.find((c) => c.clubKey === clubKey);
  const clubBalance = (clubBalances || []).find((cb) => cb.clubKey === clubKey)?.balance ?? 0;
  const minTransfer = selectedClub?.minTransfer ?? 0;
  const maxTransfer = selectedClub?.maxTransfer ?? 0;

  const amtNum = parseFloat(amount) || 0;
  const isValid =
    clubKey &&
    amtNum > 0 &&
    amtNum <= clubBalance &&
    (minTransfer <= 0 || amtNum >= minTransfer) &&
    (maxTransfer <= 0 || amtNum <= maxTransfer);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !requestId || submitting) return;
    setSubmitting(true);
    try {
      await walletClubTransfer(clubKey, amtNum, requestId);
      onHide();
      setClubKey("");
      setAmount("");
    } catch (err) {
      // Error handled in action; button re-enabled so user can retry with same requestId
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setClubKey("");
    setAmount("");
    onHide();
  };

  const clubsWithBalance = (availableClubs || []).filter((c) =>
    (clubBalances || []).some((cb) => cb.clubKey === c.clubKey && Number(cb.balance) > 0)
  );

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Club → Main Transfer</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Club</Form.Label>
            <Form.Select
              value={clubKey}
              onChange={(e) => {
                setClubKey(e.target.value);
                setAmount("");
              }}
              required
            >
              <option value="">Select Club</option>
                {clubsWithBalance.map((c) => (
                <option key={c.clubKey} value={c.clubKey}>
                  {c.name} ({c.clubKey}) - ₹{" "}
                  {Number((clubBalances || []).find((cb) => cb.clubKey === c.clubKey)?.balance ?? 0).toFixed(2)}
                </option>
              ))}
            </Form.Select>
            {clubsWithBalance.length === 0 && (
              <Form.Text className="text-muted">No club balance to transfer</Form.Text>
            )}
          </Form.Group>
          {clubKey && (
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min={minTransfer || "0.01"}
                max={maxTransfer || clubBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <Form.Text className="text-muted">
                Available: ₹ {Number(clubBalance).toFixed(2)}
                {minTransfer > 0 && ` | Min: ₹ ${minTransfer}`}
                {maxTransfer > 0 && ` | Max: ₹ ${maxTransfer}`}
              </Form.Text>
            </Form.Group>
          )}
          <Errors current_key="clubKey" />
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

ClubTransferModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  availableClubs: PropTypes.array,
  clubBalances: PropTypes.array,
  walletClubTransfer: PropTypes.func.isRequired,
};

export default connect(null, { walletClubTransfer })(ClubTransferModal);
