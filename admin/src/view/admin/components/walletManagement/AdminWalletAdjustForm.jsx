import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import {
  resolveMember,
  getBalance,
  adminAdjust,
} from "@src/actions/adminWalletManagementActions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const AdminWalletAdjustForm = ({
  walletTypes,
  onSuccess,
  onCancel,
  adminAdjust,
  loadingAdjust,
  resolveMember,
  getBalance,
}) => {
  const [transactionType, setTransactionType] = useState("Credit");
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [walletKey, setWalletKey] = useState("");
  const [availableBalance, setAvailableBalance] = useState("");
  const [amount, setAmount] = useState("");
  const [txnPassword, setTxnPassword] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (walletTypes?.length && !walletKey) {
      setWalletKey(walletTypes[0]?.key || "MAIN");
    }
    if (!walletTypes?.length) {
      setWalletKey("MAIN");
    }
  }, [walletTypes, walletKey]);

  const handleMemberIdChange = createMemberIdChangeHandler(
    (e) => setMemberId(e.target.value),
    "memberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler();
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    memberId,
    (e) => setMemberId(e.target.value),
    "memberId",
  );

  const handleMemberIdBlur = async () => {
    if (!memberId?.trim()) {
      setName("");
      setUserId(null);
      setAvailableBalance("");
      return;
    }
    try {
      const res = await resolveMember(memberId.trim());
      if (res) {
        setName(res.name || "");
        setUserId(res.userId);
        if (walletKey) {
          const bal = await getBalance(res.userId, walletKey);
          setAvailableBalance(bal || "0");
        }
      } else {
        setName("");
        setUserId(null);
        setAvailableBalance("");
      }
    } catch {
      setName("");
      setUserId(null);
      setAvailableBalance("");
    }
  };

  useEffect(() => {
    if (userId && walletKey) {
      getBalance(userId, walletKey).then(setAvailableBalance);
    } else {
      setAvailableBalance("");
    }
  }, [walletKey, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId?.trim() || !walletKey || !amount || parseFloat(amount) < 0.01 || !txnPassword) {
      return;
    }
    const idempotencyKey = crypto.randomUUID?.() || `adj-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await adminAdjust({
      transactionType,
      memberId: memberId.trim(),
      walletKey,
      amount: parseFloat(amount),
      txn_password: txnPassword,
      idempotencyKey,
    });
    if (result) {
      setMemberId("");
      setName("");
      setAvailableBalance("");
      setAmount("");
      setTxnPassword("");
      setUserId(null);
      onSuccess?.();
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Transaction Type *</Form.Label>
            <Form.Select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              required
            >
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="memberId">Member ID *</Form.Label>
            <Form.Control
              required
              type="text"
              id="memberId"
              name="memberId"
              value={memberId}
              onChange={handleMemberIdChange}
              onPaste={handleMemberIdPaste}
              onKeyDown={handleMemberIdKeyDown}
              onBlur={handleMemberIdBlur}
              placeholder="G123456789"
              maxLength={10}
              className="text-muted"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              readOnly
              placeholder="Auto fetched"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Wallet Type *</Form.Label>
            <Form.Select
              value={walletKey || "MAIN"}
              onChange={(e) => setWalletKey(e.target.value)}
              required
            >
              <option value="MAIN">MAIN</option>
              {walletTypes?.filter((wt) => wt.key !== "MAIN").map((wt) => (
                <option key={wt.key} value={wt.key}>
                  {wt.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>User&apos;s Available Balance</Form.Label>
            <Form.Control
              type="text"
              value={availableBalance}
              readOnly
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Amount *</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Transaction Password *</Form.Label>
        <Form.Control
          type="password"
          value={txnPassword}
          onChange={(e) => setTxnPassword(e.target.value)}
          required
        />
      </Form.Group>
      <div className="d-flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={loadingAdjust || !memberId || !amount || parseFloat(amount) < 0.01 || !txnPassword}
        >
          {transactionType}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

AdminWalletAdjustForm.propTypes = {
  walletTypes: PropTypes.array,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  adminAdjust: PropTypes.func.isRequired,
  loadingAdjust: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  loadingAdjust: state.adminWalletManagement?.loadingAdjust,
});

export default connect(mapStateToProps, {
  adminAdjust,
  resolveMember,
  getBalance,
})(AdminWalletAdjustForm);
