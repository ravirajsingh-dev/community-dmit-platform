import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Form,
  Button,
} from "react-bootstrap";
import { format, parseISO } from "date-fns";
import { FaArrowLeft } from "react-icons/fa";
import {
  fetchWithdrawalSettings,
  fetchWithdrawalRequests,
  fetchWithdrawalHistory,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
} from "../../../actions/withdrawalActions";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";
import { getWalletDetails } from "../../../actions/walletActions";
import { toast } from "react-toastify";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";

const toNumber = (n) => {
  const parsed =
    typeof n === "number" ? n : parseFloat(String(n).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmtMoney = (n) => toNumber(n).toFixed(2);
const UPI_ID_REGEX = /^[A-Z0-9._-]{2,}@[A-Z]{2,}$/;
const BANK_ACC_REGEX = /^\d{9,18}$/;
// 4-letter bank code + 0 + 6-char alphanumeric branch (e.g. BARB0VJHAJA)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_HOLDER_REGEX = /^[A-Z][A-Z .'-]{1,49}$/;
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
const buildRequestId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const WalletWithdrawal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((s) => s.auth);
  const wallet = useSelector((s) => s.wallet);
  const {
    settings,
    requests,
    historyItems,
    historyPagination,
    loadingSettings,
    loadingRequests,
    loadingHistory,
    loadingCreate: submitting,
    loadingCancel: cancelling,
  } = useSelector((s) => s.withdrawal);

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [historyParams, setHistoryParams] = useState({ page: 1, limit: 10 });

  const available = toNumber(wallet?.mainBalance);
  const minW = toNumber(settings?.mainMinWithdrawal);
  const maxW = toNumber(settings?.mainMaxWithdrawal);
  // Admin-configured surcharge percent (matches backend field name)
  const surchargePct = toNumber(settings?.adminWithdrawalSurchargePercent);
  const dailyLimit = toNumber(
    settings?.withdrawalDailyLimit ?? settings?.maxUserTransactionsPerDay,
  );
  const dailyRemainingRaw = settings?.withdrawalDailyRemaining;
  const dailyRemaining =
    dailyRemainingRaw == null ? null : Math.max(0, toNumber(dailyRemainingRaw));
  const isEnabled = settings?.isWithdrawalEnabled !== false;

  const pendingRequest = useMemo(
    () => (requests || []).find((r) => r.status === "PENDING"),
    [requests],
  );

  const historyColumns = useMemo(
    () => [
      {
        name: "Date",
        selector: (row) =>
          row.createdAt
            ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
            : "—",
        width: "168px",
      },
      {
        name: "Status",
        cell: (row) => {
          const st = String(row.status || "").toUpperCase();
          if (st === "APPROVED") return <Badge bg="success">Approved</Badge>;
          if (st === "REJECTED") return <Badge bg="danger">Rejected</Badge>;
          if (st === "CANCELLED")
            return <Badge bg="secondary">Cancelled</Badge>;
          return <Badge bg="secondary">{st || "—"}</Badge>;
        },
        width: "120px",
      },
      {
        name: "Amount",
        selector: (row) => `₹ ${fmtMoney(row.amount)}`,
        width: "110px",
      },
      {
        name: "Net payout",
        selector: (row) =>
          String(row.status || "").toUpperCase() === "APPROVED"
            ? `₹ ${fmtMoney(row.netPayoutAmount)}`
            : "—",
        width: "120px",
      },
      {
        name: "Payment ref (UTR / Txn / Cheque)",
        selector: (row) =>
          String(row.status || "").toUpperCase() === "APPROVED" &&
          row.payoutReference
            ? row.payoutReference
            : "—",
        wrap: true,
      },
      {
        name: "Admin remarks",
        cell: (row) => {
          const st = String(row.status || "").toUpperCase();
          const text = (row.adminRemarks || "").trim();
          if (!text) return <span className="text-muted">—</span>;
          return (
            <span
              className="text-break d-inline-block"
              style={{ maxWidth: "min(100%, 320px)" }}
            >
              {text}
            </span>
          );
        },
        wrap: true,
        minWidth: "200px",
      },
      {
        name: "Method",
        selector: (row) => row.paymentMethod || "—",
        width: "100px",
      },
    ],
    [],
  );

  const maxWithdrawable = useMemo(() => {
    if (!maxW || maxW <= 0) return available;
    return Math.min(available, maxW);
  }, [available, maxW]);

  const amountNum = useMemo(() => {
    const n = parseFloat(String(amount).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const { surchargeAmount, netAfterSurcharge } = useMemo(() => {
    if (amountNum <= 0 || !surchargePct) {
      return { surchargeAmount: 0, netAfterSurcharge: 0 };
    }
    const fee = (amountNum * surchargePct) / 100;
    const net = Math.max(0, amountNum - fee);
    return { surchargeAmount: fee, netAfterSurcharge: net };
  }, [amountNum, surchargePct]);

  /** Disable submit when daily cap is hit, range is impossible, or entered amount breaks min/max */
  const withdrawalLimitViolation = useMemo(() => {
    if (dailyLimit > 0 && dailyRemaining != null && dailyRemaining <= 0) {
      return true;
    }
    if (minW > 0 && maxWithdrawable < minW) {
      return true;
    }
    const amountStr = String(amount).trim();
    if (!amountStr) {
      return false;
    }
    if (minW > 0 && amountNum > 0 && amountNum < minW) {
      return true;
    }
    if (maxW > 0 && amountNum > maxW) {
      return true;
    }
    if (amountNum > maxWithdrawable) {
      return true;
    }
    return false;
  }, [
    amount,
    amountNum,
    minW,
    maxW,
    maxWithdrawable,
    dailyLimit,
    dailyRemaining,
  ]);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      dispatch(getWalletDetails());
      dispatch(fetchWithdrawalSettings());
      dispatch(fetchWithdrawalRequests({ status: "PENDING", limit: 1 }));
    }
  }, [dispatch, auth?.isAuthenticated]);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    dispatch(fetchWithdrawalHistory(historyParams));
  }, [
    dispatch,
    auth?.isAuthenticated,
    historyParams.page,
    historyParams.limit,
  ]);

  const resetForm = () => {
    setAmount("");
    setSource("UPI");
    setUpiId("");
    setBankName("");
    setBankAccountName("");
    setBankAccountNumber("");
    setBankIfsc("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEnabled) {
      toast.error("Withdrawals are disabled.");
      return;
    }
    if (pendingRequest) {
      toast.error("You already have a pending withdrawal request.");
      return;
    }
    if (amountNum < minW) {
      toast.error(`Minimum withdrawal is ₹${fmtMoney(minW)}`);
      return;
    }
    if (maxW > 0 && amountNum > maxW) {
      toast.error(`Maximum per request is ₹${fmtMoney(maxW)}`);
      return;
    }
    if (amountNum > available) {
      toast.error("Insufficient main wallet balance.");
      return;
    }
    if (
      !Number.isFinite(amountNum) ||
      amountNum <= 0 ||
      amountNum > maxWithdrawable
    ) {
      toast.error(
        `Please enter a valid amount up to ₹${fmtMoney(maxWithdrawable)}`,
      );
      return;
    }
    if (source === "UPI" && !upiId.trim()) {
      toast.error("UPI ID is required.");
      return;
    }
    if (source === "UPI" && !UPI_ID_REGEX.test(upiId.trim())) {
      toast.error("Please enter a valid UPI ID (example: NAME@BANK).");
      return;
    }
    if (source === "BANK") {
      if (
        !bankName.trim() ||
        !bankAccountName.trim() ||
        !bankAccountNumber.trim() ||
        !bankIfsc.trim()
      ) {
        toast.error("Please fill all bank fields.");
        return;
      }
      if (!ACCOUNT_HOLDER_REGEX.test(bankAccountName.trim())) {
        toast.error("Please enter a valid account holder name.");
        return;
      }
      if (!BANK_ACC_REGEX.test(bankAccountNumber.trim())) {
        toast.error("Account number must be 9 to 18 digits.");
        return;
      }
      if (!IFSC_REGEX.test(bankIfsc.trim().toUpperCase())) {
        toast.error("Please enter a valid IFSC code.");
        return;
      }
    }

    const paymentDetails =
      source === "UPI"
        ? { upiId: upiId.trim().toUpperCase() }
        : {
            bankName: bankName.trim().toUpperCase(),
            accountHolderName: bankAccountName.trim().toUpperCase(),
            accountNumber: bankAccountNumber.replace(/\D/g, "").slice(0, 18),
            ifsc: bankIfsc.trim().toUpperCase(),
          };

    try {
      await dispatch(
        createWithdrawalRequest({
          requestId: buildRequestId(),
          amount: amountNum,
          paymentMethod: source,
          paymentDetails,
        }),
      );
      resetForm();
      // Refresh page state immediately so pending card appears without hard refresh.
      await Promise.all([
        dispatch(fetchWithdrawalRequests({ status: "PENDING", limit: 1 })),
        dispatch(
          fetchWithdrawalHistory({
            page: 1,
            limit: historyParams.limit,
          }),
        ),
        dispatch(getWalletDetails()),
      ]);
      setHistoryParams((p) => ({ ...p, page: 1 }));
    } catch (err) {
      // Alert is already handled in action; no extra handling needed here.
    }
  };

  const handleCancelPending = async () => {
    if (!pendingRequest?._id) return;
    if (
      !window.confirm(
        "Cancel this withdrawal request? The hold will be released.",
      )
    )
      return;
    try {
      await dispatch(cancelWithdrawalRequest(pendingRequest._id));
      navigate("/user/wallet");
    } catch (err) {
      // Error alert handled in action.
    }
  };

  const loading = loadingSettings || loadingRequests;

  return (
    <div className="wallet-dashboard wallet-withdrawal">
      <Container fluid className="py-4">
        <Row className="mb-3">
          <Col>
            <AppBreadCrumb
              pageTitle="Withdrawals"
              crumbs={[{ name: "Withdrawals" }]}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="wallet-dashboard__card">
              <CardBody>
                {loading ? (
                  <p className="text-muted mb-0">Loading…</p>
                ) : pendingRequest ? (
                  <>
                    <div className="wallet-withdrawal__pending">
                      <div className="wallet-withdrawal__pending-title">
                        Withdrawal request pending
                      </div>
                      <div className="small mb-2">
                        <div className="text-warning mb-1">
                          Your withdrawal request is currently under review. You
                          won’t be able to submit another request until this one
                          is approved, rejected, or cancelled.
                        </div>

                        <div className="text-info">
                          <strong>Note:</strong> This process may take 24–72
                          hours. We appreciate your patience and will update
                          your request as soon as possible.
                        </div>
                      </div>
                      <Row className="mt-3">
                        <Col md="6" className="mb-2">
                          <div className="wallet-withdrawal__summary-label">
                            Requested amount
                          </div>
                          <div className="wallet-withdrawal__summary-value wallet-withdrawal__summary-value--secondary">
                            ₹ {fmtMoney(pendingRequest.amount)}
                          </div>
                        </Col>
                        <Col md="6" className="mb-2">
                          <div className="wallet-withdrawal__summary-label">
                            Source
                          </div>
                          <div className="text-main font-weight-semibold">
                            {pendingRequest.paymentMethod ||
                              pendingRequest.source ||
                              "-"}
                          </div>
                        </Col>
                      </Row>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        variant="outline-warning"
                        onClick={handleCancelPending}
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelling…" : "Cancel request"}
                      </Button>
                      <Button
                        as={Link}
                        to="/user/wallet"
                        variant="outline-secondary"
                      >
                        Back to wallet
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {!isEnabled && (
                      <div className="wallet-withdrawal__disabled">
                        <strong className="text-danger d-block mb-1">
                          Withdrawals are disabled
                        </strong>
                        <span className="text-muted small">
                          Withdrawals are currently turned off. Please try again
                          later or contact support.
                        </span>
                      </div>
                    )}

                    <h5 className="wallet-withdrawal__section-title mb-0">
                      Request payout from wallet
                    </h5>

                    <div className="wallet-withdrawal__summary">
                      <Row className="align-items-stretch">
                        <Col md="5" className="mb-3 mb-md-0">
                          <div className="wallet-withdrawal__summary-label">
                            Available balance
                          </div>
                          <div className="wallet-withdrawal__summary-value">
                            ₹ {fmtMoney(available)}
                          </div>
                          {maxW > 0 && maxWithdrawable < available && (
                            <div className="text-muted small mt-2">
                              Max per request: ₹ {fmtMoney(maxW)} (you can
                              withdraw up to ₹ {fmtMoney(maxWithdrawable)} now)
                            </div>
                          )}
                        </Col>
                        <Col
                          md="2"
                          className="d-none d-md-flex align-items-center justify-content-center px-0"
                        >
                          <div className="wallet-withdrawal__summary-divider" />
                        </Col>
                        <Col md="5">
                          <div className="wallet-withdrawal__summary-label">
                            Net payout (after surcharge)
                          </div>
                          <div className="wallet-withdrawal__summary-value wallet-withdrawal__summary-value--secondary">
                            ₹ {fmtMoney(netAfterSurcharge)}
                          </div>
                          {surchargePct > 0 && (
                            <div className="text-muted small mt-2">
                              Admin surcharge: {surchargePct}% ( ₹{" "}
                              {fmtMoney(surchargeAmount)} )
                            </div>
                          )}
                        </Col>
                      </Row>
                    </div>

                    {isEnabled && (
                      <Form onSubmit={handleSubmit}>
                        <Form.Group>
                          <Form.Label className="text-gold">
                            Amount *
                          </Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min={minW > 0 ? minW : undefined}
                            max={
                              maxWithdrawable > 0 ? maxWithdrawable : undefined
                            }
                            value={amount}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (!raw) {
                                setAmount("");
                                return;
                              }
                              // Keep amount realistic: up to 2 decimals, up to 9 digits before decimal.
                              if (!/^\d{0,9}(\.\d{0,2})?$/.test(raw)) return;
                              setAmount(raw);
                            }}
                            onBlur={() => {
                              if (!amount) return;
                              const parsed = parseFloat(amount);
                              if (!Number.isFinite(parsed) || parsed <= 0) {
                                setAmount("");
                                return;
                              }
                              if (
                                maxWithdrawable > 0 &&
                                parsed > maxWithdrawable
                              ) {
                                setAmount(String(maxWithdrawable));
                                return;
                              }
                              setAmount(parsed.toFixed(2));
                            }}
                            placeholder="0.00"
                            required
                            disabled={submitting}
                          />
                          <small className="text-muted form-text">
                            Min ₹ {fmtMoney(minW)}
                            {maxW > 0
                              ? ` · Max ₹ ${fmtMoney(maxWithdrawable)}`
                              : ""}
                            {dailyLimit > 0
                              ? ` · Daily limit ${Math.trunc(dailyLimit)} request(s)`
                              : ""}
                            {dailyRemaining != null && dailyLimit > 0
                              ? ` · Remaining today ${Math.trunc(dailyRemaining)}`
                              : ""}
                          </small>
                        </Form.Group>

                        <Form.Group>
                          <Form.Label className="text-gold">
                            Withdrawal source *
                          </Form.Label>
                          <Form.Select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            disabled={submitting}
                          >
                            <option value="UPI">UPI</option>
                            <option value="BANK">Bank transfer</option>
                          </Form.Select>
                        </Form.Group>

                        {source === "UPI" && (
                          <Form.Group>
                            <Form.Label className="text-gold">
                              UPI ID *
                            </Form.Label>
                            <Form.Control
                              value={upiId}
                              onChange={(e) =>
                                setUpiId(normUpiInput(e.target.value))
                              }
                              placeholder="NAME@BANK"
                              maxLength={60}
                              required
                              disabled={submitting}
                              className="text-uppercase"
                            />
                          </Form.Group>
                        )}

                        {source === "BANK" && (
                          <>
                            <Form.Group>
                              <Form.Label className="text-gold">
                                Bank name *
                              </Form.Label>
                              <Form.Control
                                value={bankName}
                                onChange={(e) =>
                                  setBankName(normBankNameInput(e.target.value))
                                }
                                placeholder="E.G. STATE BANK OF INDIA"
                                maxLength={80}
                                required
                                disabled={submitting}
                                className="text-uppercase"
                              />
                            </Form.Group>
                            <Form.Group>
                              <Form.Label className="text-gold">
                                Account holder name *
                              </Form.Label>
                              <Form.Control
                                value={bankAccountName}
                                onChange={(e) =>
                                  setBankAccountName(
                                    normAccountHolderInput(e.target.value),
                                  )
                                }
                                maxLength={50}
                                required
                                disabled={submitting}
                                className="text-uppercase"
                              />
                            </Form.Group>
                            <Form.Group>
                              <Form.Label className="text-gold">
                                Account number *
                              </Form.Label>
                              <Form.Control
                                value={bankAccountNumber}
                                onChange={(e) =>
                                  setBankAccountNumber(
                                    e.target.value
                                      .toUpperCase()
                                      .replace(/[^\d]/g, "")
                                      .slice(0, 18),
                                  )
                                }
                                inputMode="numeric"
                                required
                                disabled={submitting}
                                className="text-uppercase"
                              />
                            </Form.Group>
                            <Form.Group>
                              <Form.Label className="text-gold">
                                IFSC *
                              </Form.Label>
                              <Form.Control
                                value={bankIfsc}
                                onChange={(e) =>
                                  setBankIfsc(
                                    e.target.value
                                      .toUpperCase()
                                      .replace(/[^A-Z0-9]/g, "")
                                      .slice(0, 11),
                                  )
                                }
                                required
                                disabled={submitting}
                                className="text-uppercase"
                              />
                            </Form.Group>
                          </>
                        )}

                        <div className="d-flex flex-wrap gap-2 mt-3">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={submitting || withdrawalLimitViolation}
                          >
                            {submitting ? "Submitting…" : "Request withdrawal"}
                          </Button>
                          <Button
                            as={Link}
                            to="/user/wallet"
                            variant="outline-secondary"
                            type="button"
                          >
                            Back
                          </Button>
                        </div>
                      </Form>
                    )}

                    {!isEnabled && (
                      <div className="mt-3">
                        <Button
                          as={Link}
                          to="/user/wallet"
                          variant="outline-secondary"
                        >
                          Back to wallet
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>

            {!loadingSettings ? (
              <Card className="wallet-dashboard__card mt-4">
                <CardBody>
                  <h6 className="wallet-withdrawal__section-title mb-3">
                    Recent withdrawals
                  </h6>
                  {historyPagination?.totalCount != null ? (
                    <p className="text-muted small mb-3">
                      Total completed:{" "}
                      <strong>{historyPagination.totalCount}</strong>
                    </p>
                  ) : null}
                  <CustomDataTable
                    columns={historyColumns}
                    data={historyItems || []}
                    count={historyPagination?.totalCount ?? 0}
                    params={historyParams}
                    setParams={(p) =>
                      setHistoryParams((prev) => ({ ...prev, ...p }))
                    }
                    pagination
                    responsive
                    striped
                    progressPending={loadingHistory}
                    paginationServer
                    persistTableHead
                    minHeight="240px"
                  />
                </CardBody>
              </Card>
            ) : null}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default WalletWithdrawal;
