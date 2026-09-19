import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";

import Errors from "@src/notifications/Errors";
import { getWalletDetails } from "@src/actions/walletActions";
import {
  getWithdrawalSettings,
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
} from "@src/actions/withdrawalActions";

const normUpiInput = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9@._-]/g, "")
    .slice(0, 60);
const normBankNameInput = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 &.'(),\/-]/g, "")
    .slice(0, 80);
const normAccountHolderInput = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z .'-]/g, "")
    .slice(0, 50);

const WithdrawalModal = ({
  show,
  onHide,
  availableBalance,
  settings,
  pendingRequest,
  loadingSettings,
  loadingRequests,
  loadingCreate,
  loadingCancel,
  getWithdrawalSettings,
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getWalletDetails,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [amount, setAmount] = useState("");

  // UPI
  const [upiId, setUpiId] = useState("");

  // BANK
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  // CHEQUE
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBankName, setChequeBankName] = useState("");

  const minWithdrawal = settings?.mainMinWithdrawal ?? null;
  const maxWithdrawal = settings?.mainMaxWithdrawal ?? null;
  const surchargePercent = settings?.adminWithdrawalSurchargePercent ?? 0;
  const isEnabled = settings?.isWithdrawalEnabled !== undefined ? !!settings.isWithdrawalEnabled : true;
  const maxDaily =
    settings?.withdrawalDailyLimit ?? settings?.maxUserTransactionsPerDay ?? null;
  const dailyLimitNum =
    maxDaily != null && maxDaily !== "" ? Number(maxDaily) : 0;
  const dailyRemainingRaw = settings?.withdrawalDailyRemaining;
  const dailyRemainingModal =
    dailyRemainingRaw == null ? null : Math.max(0, Number(dailyRemainingRaw));

  const mainBalanceNum = useMemo(() => Number(availableBalance || 0), [availableBalance]);
  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);
  const netPayoutApprox = useMemo(() => {
    if (!amountNum || amountNum <= 0) return 0;
    const s = (amountNum * Number(surchargePercent || 0)) / 100;
    return Math.max(0, amountNum - s);
  }, [amountNum, surchargePercent]);

  useEffect(() => {
    if (show) {
      getWithdrawalSettings();
      getWithdrawalRequests({ status: "PENDING", limit: 1 });
      // reset fields for a fresh form
      setPaymentMethod("UPI");
      setAmount("");
      setUpiId("");
      setBankName("");
      setAccountHolderName("");
      setAccountNumber("");
      setIfsc("");
      setChequeNumber("");
      setChequeBankName("");
    }
  }, [show, getWithdrawalSettings, getWithdrawalRequests]);

  const closeAndReset = () => {
    onHide();
  };

  const paymentDetailsValid = useMemo(() => {
    if (paymentMethod === "UPI") return !!upiId.trim();
    if (paymentMethod === "BANK")
      return !!bankName.trim() && !!accountHolderName.trim() && !!accountNumber.trim() && !!ifsc.trim();
    return false;
  }, [paymentMethod, upiId, bankName, accountHolderName, accountNumber, ifsc, chequeNumber]);

  const amountValid = useMemo(() => {
    if (!amountNum || amountNum <= 0) return false;
    if (amountNum > mainBalanceNum) return false;
    if (minWithdrawal != null && Number(minWithdrawal) > 0 && amountNum < Number(minWithdrawal)) return false;
    if (maxWithdrawal != null && Number(maxWithdrawal) > 0 && amountNum > Number(maxWithdrawal)) return false;
    return true;
  }, [amountNum, mainBalanceNum, minWithdrawal, maxWithdrawal]);

  const maxWithdrawableModal = useMemo(() => {
    const maxN =
      maxWithdrawal != null && Number(maxWithdrawal) > 0
        ? Number(maxWithdrawal)
        : 0;
    if (!maxN) return mainBalanceNum;
    return Math.min(mainBalanceNum, maxN);
  }, [mainBalanceNum, maxWithdrawal]);

  const withdrawalLimitViolationModal = useMemo(() => {
    if (dailyLimitNum > 0 && dailyRemainingModal != null && dailyRemainingModal <= 0) {
      return true;
    }
    const minN =
      minWithdrawal != null && Number(minWithdrawal) > 0
        ? Number(minWithdrawal)
        : 0;
    if (minN > 0 && maxWithdrawableModal < minN) {
      return true;
    }
    const amountStr = String(amount).trim();
    if (!amountStr) {
      return false;
    }
    if (minN > 0 && amountNum > 0 && amountNum < minN) {
      return true;
    }
    const maxN =
      maxWithdrawal != null && Number(maxWithdrawal) > 0
        ? Number(maxWithdrawal)
        : 0;
    if (maxN > 0 && amountNum > maxN) {
      return true;
    }
    if (amountNum > maxWithdrawableModal) {
      return true;
    }
    return false;
  }, [
    amount,
    amountNum,
    minWithdrawal,
    maxWithdrawal,
    maxWithdrawableModal,
    dailyLimitNum,
    dailyRemainingModal,
  ]);

  const canSubmit = useMemo(() => {
    if (!isEnabled) return false;
    if (pendingRequest) return false;
    if (loadingRequests || loadingSettings) return false;
    if (loadingCreate) return false;
    if (withdrawalLimitViolationModal) return false;
    return amountValid && paymentDetailsValid;
  }, [
    isEnabled,
    pendingRequest,
    loadingRequests,
    loadingSettings,
    loadingCreate,
    withdrawalLimitViolationModal,
    amountValid,
    paymentDetailsValid,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const uuidFallback = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      // eslint-disable-next-line no-bitwise
      const r = (Math.random() * 16) | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const requestId = crypto.randomUUID ? crypto.randomUUID() : uuidFallback;

    const paymentDetails =
      paymentMethod === "UPI"
        ? { upiId: upiId.trim().toUpperCase() }
        : {
            bankName: bankName.trim().toUpperCase(),
            accountHolderName: accountHolderName.trim().toUpperCase(),
            accountNumber: String(accountNumber || "").replace(/\D/g, "").slice(0, 18),
            ifsc: String(ifsc || "")
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 11),
          };

    await createWithdrawalRequest({
      requestId,
      amount: amountNum,
      paymentMethod,
      paymentDetails,
    });

    // Refresh wallet and pending request state
    getWalletDetails();
    await getWithdrawalRequests({ status: "PENDING", limit: 1 });
  };

  const handleCancelPending = async () => {
    if (!pendingRequest?._id || loadingCancel) return;
    await cancelWithdrawalRequest(pendingRequest._id);
    getWalletDetails();
    await getWithdrawalRequests({ status: "PENDING", limit: 1 });
  };

  const renderPaymentFields = () => {
    if (paymentMethod === "UPI") {
      return (
        <>
          <Form.Group className="mb-3">
            <Form.Label>UPI ID *</Form.Label>
            <Form.Control
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(normUpiInput(e.target.value))}
              placeholder="NAME@BANK"
              disabled={!isEnabled}
              className="text-uppercase"
            />
            <Errors current_key="upiId" />
          </Form.Group>
        </>
      );
    }

    if (paymentMethod === "BANK") {
      return (
        <>
          <Form.Group className="mb-3">
            <Form.Label>Bank Name *</Form.Label>
            <Form.Control
              value={bankName}
              onChange={(e) => setBankName(normBankNameInput(e.target.value))}
              placeholder="STATE BANK OF INDIA"
              maxLength={80}
              disabled={!isEnabled}
              className="text-uppercase"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Account Holder Name *</Form.Label>
            <Form.Control
              value={accountHolderName}
              onChange={(e) =>
                setAccountHolderName(normAccountHolderInput(e.target.value))
              }
              placeholder="ACCOUNT HOLDER NAME"
              maxLength={50}
              disabled={!isEnabled}
              className="text-uppercase"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Account Number *</Form.Label>
            <Form.Control
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^\d]/g, "")
                    .slice(0, 18),
                )
              }
              placeholder="123456789012"
              inputMode="numeric"
              disabled={!isEnabled}
              className="text-uppercase"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>IFSC *</Form.Label>
            <Form.Control
              value={ifsc}
              onChange={(e) =>
                setIfsc(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 11),
                )
              }
              placeholder="BARB0VJHAJA"
              maxLength={11}
              disabled={!isEnabled}
              className="text-uppercase"
            />
          </Form.Group>
          <Errors current_key="bankName" />
          <Errors current_key="accountHolderName" />
          <Errors current_key="accountNumber" />
          <Errors current_key="ifsc" />
        </>
      );
    }
    return null;
  };

  return (
    <Modal show={show} onHide={closeAndReset} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Withdrawal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {pendingRequest ? (
          <>
            <Alert variant="warning" className="mb-3">
              Aapki withdrawal request pending hai. Is case me aap dusri request submit nahi kar sakte.
              Aap apni request cancel kar sakte ho.
            </Alert>
            <Row className="g-3">
              <Col md={6}>
                <div>
                  <strong>Requested Amount</strong>
                  <div>₹ {Number(pendingRequest.amount || 0).toFixed(2)}</div>
                </div>
              </Col>
              <Col md={6}>
                <div>
                  <strong>Payment Method</strong>
                  <div>{pendingRequest.paymentMethod || "—"}</div>
                </div>
              </Col>
              <Col md={12}>
                <div className="text-muted small">
                  Net payout (after surcharge): ₹ {Number(pendingRequest.netPayoutAmount || 0).toFixed(2)}
                </div>
              </Col>
            </Row>
          </>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-muted small mb-1">
                Available balance: ₹ {mainBalanceNum.toFixed(2)}
              </div>
              <div className="text-muted small mb-1">
                {isEnabled ? "Withdrawals enabled" : "Withdrawals disabled by admin"}
              </div>
              {surchargePercent != null && surchargePercent !== 0 && (
                <div className="text-muted small mb-1">
                  Admin surcharge: {surchargePercent}% (approx. net payout: ₹ {netPayoutApprox.toFixed(2)})
                </div>
              )}
              {maxDaily != null && maxDaily !== "" && (
                <div className="text-muted small">
                  Daily limit: {maxDaily} withdrawal request(s)
                </div>
              )}
            </div>

            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col xs={12} sm={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Amount *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={mainBalanceNum}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={!isEnabled}
                    />
                    <Form.Text className="text-muted">
                      {minWithdrawal != null && Number(minWithdrawal) > 0 ? `Min: ₹${Number(minWithdrawal).toFixed(2)}` : ""}
                      {minWithdrawal != null && Number(minWithdrawal) > 0 && maxWithdrawal != null && Number(maxWithdrawal) > 0 ? " • " : ""}
                      {maxWithdrawal != null && Number(maxWithdrawal) > 0 ? `Max: ₹${Number(maxWithdrawal).toFixed(2)}` : ""}
                    </Form.Text>
                    <Errors current_key="amount" />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Withdrawal Source *</Form.Label>
                    <Form.Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={!isEnabled}
                    >
                      <option value="UPI">UPI</option>
                      <option value="BANK">Bank Account</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {renderPaymentFields()}

              <div className="d-flex gap-2 mt-2">
                <Button variant="primary" type="submit" disabled={!canSubmit}>
                  {loadingCreate ? "Submitting..." : "Request Withdrawal"}
                </Button>
                <Button variant="outline-secondary" type="button" onClick={closeAndReset}>
                  Cancel
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {pendingRequest ? (
          <>
            <Button variant="outline-secondary" onClick={closeAndReset} disabled={loadingCancel}>
              Close
            </Button>
            <Button variant="danger" onClick={handleCancelPending} disabled={loadingCancel}>
              {loadingCancel ? "Cancelling..." : "Cancel Request"}
            </Button>
          </>
        ) : (
          <>
            <div className="text-muted small me-auto">
              Note: Withdrawal hold ke baad aap transfer nahi kar sakte until decision.
            </div>
            <Button variant="outline-secondary" onClick={closeAndReset}>
              Close
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

WithdrawalModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  availableBalance: PropTypes.number,
  settings: PropTypes.object,
  pendingRequest: PropTypes.object,
  loadingSettings: PropTypes.bool,
  loadingRequests: PropTypes.bool,
  loadingCreate: PropTypes.bool,
  loadingCancel: PropTypes.bool,
  getWithdrawalSettings: PropTypes.func.isRequired,
  getWithdrawalRequests: PropTypes.func.isRequired,
  createWithdrawalRequest: PropTypes.func.isRequired,
  cancelWithdrawalRequest: PropTypes.func.isRequired,
  getWalletDetails: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  settings: state.withdrawal?.settings ?? null,
  pendingRequest: state.withdrawal?.pendingRequest ?? null,
  loadingSettings: state.withdrawal?.loadingSettings ?? false,
  loadingRequests: state.withdrawal?.loadingRequests ?? false,
  loadingCreate: state.withdrawal?.loadingCreate ?? false,
  loadingCancel: state.withdrawal?.loadingCancel ?? false,
  availableBalance: state.wallet?.mainBalance ?? 0,
});

export default connect(mapStateToProps, {
  getWithdrawalSettings,
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getWalletDetails,
})(WithdrawalModal);

