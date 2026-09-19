import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import {
  resolveMember,
  getBalance,
  adminTransfer,
} from "@src/actions/adminWalletManagementActions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const AdminUserToUserTransferForm = ({
  walletTypes,
  onSuccess,
  onCancel,
  adminTransfer,
  loadingTransfer,
  resolveMember,
  getBalance,
}) => {
  const [fromMemberId, setFromMemberId] = useState("");
  const [fromName, setFromName] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [toName, setToName] = useState("");
  const [walletKey, setWalletKey] = useState("");
  const [availableBalance, setAvailableBalance] = useState("");
  const [amount, setAmount] = useState("");
  const [txnPassword, setTxnPassword] = useState("");
  const [fromUserId, setFromUserId] = useState(null);

  useEffect(() => {
    if (walletTypes?.length && !walletKey) {
      setWalletKey(walletTypes[0]?.key || "MAIN");
    }
    if (!walletTypes?.length) {
      setWalletKey("MAIN");
    }
  }, [walletTypes, walletKey]);

  const handleFromMemberIdChange = createMemberIdChangeHandler(
    (e) => setFromMemberId(e.target.value),
    "fromMemberId",
  );
  const handleFromMemberIdPaste = createMemberIdPasteHandler();
  const handleFromMemberIdKeyDown = createMemberIdKeyDownHandler(
    fromMemberId,
    (e) => setFromMemberId(e.target.value),
    "fromMemberId",
  );

  const handleToMemberIdChange = createMemberIdChangeHandler(
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );
  const handleToMemberIdPaste = createMemberIdPasteHandler();
  const handleToMemberIdKeyDown = createMemberIdKeyDownHandler(
    toMemberId,
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );

  const handleFromMemberIdBlur = async () => {
    if (!fromMemberId?.trim()) {
      setFromName("");
      setFromUserId(null);
      setAvailableBalance("");
      return;
    }
    try {
      const res = await resolveMember(fromMemberId.trim());
      if (res) {
        setFromName(res.name || "");
        setFromUserId(res.userId);
        if (walletKey) {
          const bal = await getBalance(res.userId, walletKey);
          setAvailableBalance(bal || "0");
        }
      } else {
        setFromName("");
        setFromUserId(null);
        setAvailableBalance("");
      }
    } catch {
      setFromName("");
      setFromUserId(null);
      setAvailableBalance("");
    }
  };

  const handleToMemberIdBlur = async () => {
    if (!toMemberId?.trim()) {
      setToName("");
      return;
    }
    try {
      const res = await resolveMember(toMemberId.trim());
      if (res) {
        setToName(res.name || "");
      } else {
        setToName("");
      }
    } catch {
      setToName("");
    }
  };

  useEffect(() => {
    if (fromUserId && walletKey) {
      getBalance(fromUserId, walletKey).then(setAvailableBalance);
    } else {
      setAvailableBalance("");
    }
  }, [walletKey, fromUserId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !fromMemberId?.trim() ||
      !toMemberId?.trim() ||
      !walletKey ||
      !amount ||
      parseFloat(amount) < 0.01 ||
      !txnPassword
    ) {
      return;
    }
    if (fromMemberId.trim() === toMemberId.trim()) {
      return;
    }
    const idempotencyKey = crypto.randomUUID?.() || `trf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await adminTransfer({
      fromMemberId: fromMemberId.trim(),
      toMemberId: toMemberId.trim(),
      walletKey,
      amount: parseFloat(amount),
      txn_password: txnPassword,
      idempotencyKey,
    });
    if (result) {
      setFromMemberId("");
      setFromName("");
      setToMemberId("");
      setToName("");
      setAvailableBalance("");
      setAmount("");
      setTxnPassword("");
      setFromUserId(null);
      onSuccess?.(result);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="fromMemberId">From Member ID *</Form.Label>
            <Form.Control
              required
              type="text"
              id="fromMemberId"
              name="fromMemberId"
              value={fromMemberId}
              onChange={handleFromMemberIdChange}
              onPaste={handleFromMemberIdPaste}
              onKeyDown={handleFromMemberIdKeyDown}
              onBlur={handleFromMemberIdBlur}
              placeholder="G123456789"
              maxLength={10}
              className="text-muted"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>From Name</Form.Label>
            <Form.Control type="text" value={fromName} readOnly />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="toMemberId">To Member ID *</Form.Label>
            <Form.Control
              required
              type="text"
              id="toMemberId"
              name="toMemberId"
              value={toMemberId}
              onChange={handleToMemberIdChange}
              onPaste={handleToMemberIdPaste}
              onKeyDown={handleToMemberIdKeyDown}
              onBlur={handleToMemberIdBlur}
              placeholder="G123456789"
              maxLength={10}
              className="text-muted"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>To Name</Form.Label>
            <Form.Control type="text" value={toName} readOnly />
          </Form.Group>
        </Col>
      </Row>
      <Row>
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
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>From User Available Balance</Form.Label>
            <Form.Control type="text" value={availableBalance} readOnly />
          </Form.Group>
        </Col>
      </Row>
      <Row>
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
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Transaction Password *</Form.Label>
            <Form.Control
              type="password"
              value={txnPassword}
              onChange={(e) => setTxnPassword(e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>
      <div className="d-flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={
            loadingTransfer ||
            !fromMemberId ||
            !toMemberId ||
            fromMemberId === toMemberId ||
            !amount ||
            parseFloat(amount) < 0.01 ||
            !txnPassword
          }
        >
          Transfer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

AdminUserToUserTransferForm.propTypes = {
  walletTypes: PropTypes.array,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  adminTransfer: PropTypes.func.isRequired,
  loadingTransfer: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  loadingTransfer: state.adminWalletManagement?.loadingTransfer,
});

export default connect(mapStateToProps, {
  adminTransfer,
  resolveMember,
  getBalance,
})(AdminUserToUserTransferForm);
