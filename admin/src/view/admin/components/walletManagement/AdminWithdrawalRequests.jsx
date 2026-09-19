import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Modal,
  Row,
} from "react-bootstrap";
import { format, parseISO } from "date-fns";
import { FiCheckCircle, FiClock, FiPieChart, FiXCircle } from "react-icons/fi";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";

import DonationVerificationModal from "@src/view/admin/modals/DonationVerificationModal";
import {
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  generateWithdrawalUpiQr,
  setWithdrawalPayoutReference,
} from "@src/actions/adminWithdrawalActions";
import { formatIndianNumber } from "@src/utils/helper";
import AdminWithdrawalFilters from "./AdminWithdrawalFilters";

function WithdrawalPaymentDetailsCell({ row }) {
  const d = row?.paymentDetails || {};
  const method = String(row?.paymentMethod || "").toUpperCase();

  const line = (label, value, mono = false) => {
    const v =
      value != null && String(value).trim() !== ""
        ? String(value).trim()
        : null;
    return (
      <div>
        <div
          className="text-muted text-uppercase fw-bold"
          style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}
        >
          {label}
        </div>
        <div
          className={`text-break ${mono ? "font-monospace" : ""} fw-semibold`}
          style={{ fontSize: "0.875rem" }}
        >
          {v || "—"}
        </div>
      </div>
    );
  };

  const block = (children) => (
    <div
      className="text-start py-1 d-flex flex-column gap-2 admin-withdrawal-payment-details"
      style={{ minWidth: "220px", maxWidth: "340px" }}
    >
      {children}
    </div>
  );

  if (method === "UPI") {
    return block(line("UPI ID", d.upiId));
  }

  if (method === "BANK") {
    return block(
      <>
        {line("Bank name", d.bankName)}
        {line("Account holder", d.accountHolderName)}
        {line("Account number", d.accountNumber, true)}
        {line("IFSC", d.ifsc, true)}
      </>,
    );
  }

  if (method === "CHEQUE") {
    return block(
      <>
        {line("Cheque number", d.chequeNumber, true)}
        {line("Bank (cheque)", d.chequeBankName)}
      </>,
    );
  }

  return <span className="text-muted">—</span>;
}

WithdrawalPaymentDetailsCell.propTypes = {
  row: PropTypes.object,
};

const AdminWithdrawalRequests = ({
  adminWithdrawal,
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  generateWithdrawalUpiQr,
  setWithdrawalPayoutReference,
}) => {
  const withdrawalRequestsState = adminWithdrawal?.withdrawalRequests || {
    data: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  };
  const loading = adminWithdrawal?.loadingWithdrawalRequests ?? false;
  const pagination = withdrawalRequestsState.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };
  const data = withdrawalRequestsState.data || [];
  const loadingAction = adminWithdrawal?.loadingAction ?? false;

  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    status: "",
    paymentMethod: "",
    memberId: "",
    fromDate: "",
    toDate: "",
  });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState(null); // "approve" | "reject"
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrState, setQrState] = useState({
    qrCodeData: null,
    amount: null,
    upiUrl: null,
  });

  const [showPayoutRefModal, setShowPayoutRefModal] = useState(false);
  const [payoutRefRequest, setPayoutRefRequest] = useState(null);

  const statusSummary = useMemo(() => {
    const initial = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    data.forEach((item) => {
      const s = (item.status || "").toUpperCase();
      if (s === "PENDING") initial.pending += 1;
      if (s === "APPROVED") initial.approved += 1;
      if (s === "REJECTED" || s === "CANCELLED") initial.rejected += 1;
    });
    return initial;
  }, [data]);

  const selectedSummaryCard = (() => {
    const selected = (params.status || "").toUpperCase();
    if (!selected) return "total";
    if (selected === "PENDING") return "pending";
    if (selected === "APPROVED") return "approved";
    if (selected === "REJECTED" || selected === "CANCELLED") return "rejected";
    return null;
  })();

  const applyStatusFilter = (status) => {
    setParams((prev) => ({
      ...prev,
      status: status || "",
      page: 1,
    }));
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return <Badge bg="warning">PENDING</Badge>;
    if (s === "approved") return <Badge bg="success">APPROVED</Badge>;
    if (s === "rejected") return <Badge bg="danger">REJECTED</Badge>;
    if (s === "cancelled") return <Badge bg="secondary">CANCELLED</Badge>;
    return <Badge bg="secondary">{(status || "UNKNOWN").toUpperCase()}</Badge>;
  };

  const paymentBadgeVariant = (method) => {
    if (method === "UPI") return "info";
    if (method === "BANK") return "primary";
    if (method === "CHEQUE") return "secondary";
    return "secondary";
  };

  const columns = useMemo(
    () => [
      {
        name: "Member ID",
        selector: (row) => row.memberId || "-",
        width: "160px",
      },
      {
        name: "User",
        selector: (row) => row.userName || "-",
        width: "180px",
        wrap: true,
      },
      {
        name: "Amount",
        cell: (row) => (
          <span>₹ {formatIndianNumber(Number(row.amount || 0))}</span>
        ),
        width: "130px",
      },
      {
        name: "Net Payout",
        cell: (row) => {
          const isPending = (row.status || "").toUpperCase() === "PENDING";
          const isUpi = (row.paymentMethod || "").toUpperCase() === "UPI";
          return (
            <div className="d-flex flex-column gap-2 align-items-start">
              <span
                className={
                  (row.status || "").toUpperCase() === "APPROVED"
                    ? "text-success"
                    : ""
                }
              >
                ₹ {formatIndianNumber(Number(row.netPayoutAmount || 0))}
              </span>
              {isPending && isUpi ? (
                <Button
                  size="sm"
                  variant="outline-primary"
                  disabled={loadingAction}
                  onClick={async () => {
                    const res = await generateWithdrawalUpiQr(row._id);
                    if (res?.qrCodeData) {
                      setQrState({
                        qrCodeData: res.qrCodeData,
                        amount: res.amount,
                        upiUrl: res.upiUrl,
                      });
                      setShowQrModal(true);
                    }
                  }}
                >
                  Generate QR
                </Button>
              ) : null}
            </div>
          );
        },
        width: "200px",
        wrap: true,
      },
      {
        name: "Method",
        cell: (row) => (
          <Badge bg={paymentBadgeVariant(row.paymentMethod)}>
            {row.paymentMethod || "—"}
          </Badge>
        ),
        width: "130px",
      },
      {
        name: "Payment Details",
        cell: (row) => <WithdrawalPaymentDetailsCell row={row} />,
        minWidth: "280px",
        wrap: true,
      },
      {
        name: "Payout ref (UTR / Txn / Cheque)",
        selector: (row) => row.payoutReference || "—",
        width: "200px",
        wrap: true,
      },
      {
        name: "Admin Remarks",
        selector: (row) => row.adminRemarks || "—",
        width: "260px",
        wrap: true,
      },
      {
        name: "Status",
        cell: (row) => statusBadge(row.status),
        width: "130px",
      },
      {
        name: "Created",
        cell: (row) =>
          row.createdAt
            ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
            : "-",
        width: "220px",
      },
      {
        name: "Actions",
        cell: (row) => {
          const isPending = (row.status || "").toUpperCase() === "PENDING";
          const isApproved = (row.status || "").toUpperCase() === "APPROVED";

          return (
            <div className="d-flex gap-2 flex-wrap">
              {isPending && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setSelectedRequest(row);
                      setVerificationAction("approve");
                      setShowVerifyModal(true);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setSelectedRequest(row);
                      setVerificationAction("reject");
                      setShowVerifyModal(true);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              {isApproved && (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => {
                    setPayoutRefRequest(row);
                    setShowPayoutRefModal(true);
                  }}
                >
                  {row.payoutReference ? "Edit payout ref" : "Set payout ref"}
                </Button>
              )}
            </div>
          );
        },
        width: "220px",
        wrap: true,
      },
    ],
    [generateWithdrawalUpiQr, loadingAction],
  );

  const handleVerifyClose = () => {
    setShowVerifyModal(false);
    setSelectedRequest(null);
    setVerificationAction(null);
  };

  const handleVerifyConfirm = async (txn_password, reason, payoutReference) => {
    if (!selectedRequest || !verificationAction) return handleVerifyClose();

    try {
      if (verificationAction === "approve") {
        await approveWithdrawalRequest(
          selectedRequest._id,
          txn_password,
          reason || "",
          payoutReference || "",
        );
      } else if (verificationAction === "reject") {
        await rejectWithdrawalRequest(
          selectedRequest._id,
          txn_password,
          reason || "",
        );
      }
      handleVerifyClose();
      getWithdrawalRequests(params);
    } catch {
      // Errors are handled by action + modal via errors slice
    }
  };

  useEffect(() => {
    getWithdrawalRequests(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    getWithdrawalRequests,
    params.page,
    params.limit,
    params.status,
    params.paymentMethod,
    params.memberId,
    params.fromDate,
    params.toDate,
  ]);

  const onFilterChange = (newParams) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Withdrawal Requests"
        crumbs={[{ name: "Withdrawal Requests" }]}
      />

      <Row className="g-2 g-md-3 mb-3 manage-wallets-summary">
        <Col xs={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--total h-100 ${
              selectedSummaryCard === "total" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiPieChart size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Total Requests</div>
                <div className="admin-stat-card__value">
                  {pagination.total || 0}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--warning h-100 ${
              selectedSummaryCard === "pending" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("PENDING")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("PENDING");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiClock size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Pending</div>
                <div className="admin-stat-card__value">
                  {statusSummary.pending}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--success h-100 ${
              selectedSummaryCard === "approved" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("APPROVED")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("APPROVED");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiCheckCircle size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Approved</div>
                <div className="admin-stat-card__value">
                  {statusSummary.approved}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`admin-stat-card users-summary-card admin-stat-card--danger h-100 ${
              selectedSummaryCard === "rejected" ? "is-selected" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => applyStatusFilter("REJECTED")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyStatusFilter("REJECTED");
              }
            }}
          >
            <Card.Body className="admin-stat-card__body">
              <div className="admin-stat-card__icon">
                <FiXCircle size={18} />
              </div>
              <div className="admin-stat-card__meta">
                <div className="admin-stat-card__label">Rejected</div>
                <div className="admin-stat-card__value">
                  {statusSummary.rejected}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <AdminWithdrawalFilters
        filterParams={params}
        onFilterChange={onFilterChange}
      />

      {loading ? <AdminLoadingSkeleton height={220} /> : null}

      <Card>
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={data}
            count={pagination.total || 0}
            params={{
              page: pagination.page || params.page,
              limit: pagination.limit || params.limit,
            }}
            setParams={(p) => {
              if (p.page !== undefined)
                setParams((prev) => ({ ...prev, page: p.page }));
              if (p.limit !== undefined)
                setParams((prev) => ({ ...prev, limit: p.limit }));
            }}
            pagination
            responsive
            striped
            persistTableHead={true}
            progressPending={loading}
            paginationServer
          />
        </Card.Body>
      </Card>

      <DonationVerificationModal
        show={showVerifyModal}
        handleClose={handleVerifyClose}
        handleConfirm={(txn_password, reason, payoutRef) =>
          handleVerifyConfirm(txn_password, reason, payoutRef)
        }
        title={
          verificationAction === "reject"
            ? "Reject Withdrawal Request"
            : "Approve Withdrawal Request"
        }
        body={
          selectedRequest
            ? verificationAction === "reject"
              ? `Are you sure you want to reject this withdrawal request of ₹${formatIndianNumber(
                  Number(selectedRequest.amount || 0),
                )}?`
              : `Are you sure you want to approve this withdrawal request of ₹${formatIndianNumber(
                  Number(selectedRequest.amount || 0),
                )}?`
            : ""
        }
        submitBtnText={
          verificationAction === "reject" ? "Reject Request" : "Approve Request"
        }
        showReason={true}
        reasonLabel="Admin Payout Mode / Remarks"
        reasonPlaceholder="Enter: CHEQUE / IMPS / NEFT / RTGS / any remarks"
        reasonRequired={verificationAction === "approve"}
        showPayoutReference={verificationAction === "approve"}
        payoutReferenceLabel="UTR / Transaction ID / Cheque no. (optional)"
        payoutReferencePlaceholder="Shown to the member after approval"
        payoutReferenceRequired={false}
        payoutReferenceInitial=""
        isSubmitting={loadingAction}
      />

      <DonationVerificationModal
        show={showPayoutRefModal}
        handleClose={() => {
          setShowPayoutRefModal(false);
          setPayoutRefRequest(null);
        }}
        handleConfirm={async (txn_password, _reason, payoutRef) => {
          if (!payoutRefRequest?._id) return;
          try {
            await setWithdrawalPayoutReference(
              payoutRefRequest._id,
              txn_password,
              payoutRef || "",
            );
            setShowPayoutRefModal(false);
            setPayoutRefRequest(null);
            getWithdrawalRequests(params);
          } catch {
            // handled in action
          }
        }}
        title="Set payout reference"
        body="Enter UTR, transaction ID, or cheque number. This will be visible to the member."
        submitBtnText="Save reference"
        showReason={false}
        showPayoutReference
        payoutReferenceLabel="UTR / Transaction ID / Cheque no."
        payoutReferencePlaceholder="Required — shown to the member"
        payoutReferenceRequired
        payoutReferenceInitial={payoutRefRequest?.payoutReference || ""}
        isSubmitting={loadingAction}
      />

      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>UPI Payment QR</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {qrState?.qrCodeData ? (
            <div className="d-flex flex-column align-items-center gap-3">
              <img
                src={qrState.qrCodeData}
                alt="UPI QR Code"
                style={{ width: 280, height: 280, objectFit: "contain" }}
              />
              <div className="text-center">
                <div className="fw-semibold">
                  Amount: ₹ {formatIndianNumber(Number(qrState.amount || 0))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted">QR not available.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowQrModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdminWithdrawalRequests.propTypes = {
  adminWithdrawal: PropTypes.object,
  getWithdrawalRequests: PropTypes.func.isRequired,
  approveWithdrawalRequest: PropTypes.func.isRequired,
  rejectWithdrawalRequest: PropTypes.func.isRequired,
  generateWithdrawalUpiQr: PropTypes.func.isRequired,
  setWithdrawalPayoutReference: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  adminWithdrawal: state.adminWithdrawal,
});

export default connect(mapStateToProps, {
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  generateWithdrawalUpiQr,
  setWithdrawalPayoutReference,
})(AdminWithdrawalRequests);
