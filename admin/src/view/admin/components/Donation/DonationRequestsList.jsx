import React, { useState, useEffect } from "react";
import { Row, Col, Container, Badge, Button, Card } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaRupeeSign,
} from "react-icons/fa";
import { format, parseISO } from "date-fns";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import DonationVerificationModal from "@src/view/admin/modals/DonationVerificationModal";
import DonationFilters from "./DonationFilters";
import AdminLoadingSkeleton from "@src/view/commonComponents/loaders/AdminLoadingSkeleton";

import {
  getDonationRequests,
  approveDonationRequest,
  rejectDonationRequest,
} from "@src/actions/adminDonationActions";
import { formatIndianNumber } from "@src/utils/helper";

const DonationRequestsList = ({
  loggedInAdmin,
  donationRequests,
  getDonationRequests,
  loadingDonationRequests,
  loadingOnDonationRequestAction,
  approveDonationRequest,
  rejectDonationRequest,
}) => {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    status: "",
    phone: "",
    email: "",
    amount: "",
    donorType: "",
    search: "",
    fromDate: "",
    toDate: "",
  });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [verificationAction, setVerificationAction] = useState(null); // "approve" | "reject"

  const openApproveModal = (row) => {
    if (row.isGatewayPayment) return;
    setSelectedRequest(row);
    setVerificationAction("approve");
    setShowVerifyModal(true);
  };

  const openRejectModal = (row) => {
    if (row.isGatewayPayment) return;
    setSelectedRequest(row);
    setVerificationAction("reject");
    setShowVerifyModal(true);
  };

  const handleVerificationClose = () => {
    setShowVerifyModal(false);
    setSelectedRequest(null);
    setVerificationAction(null);
  };

  const handleVerificationConfirm = async (txn_password, reason) => {
    if (!selectedRequest || !verificationAction) {
      handleVerificationClose();
      return;
    }

    if (verificationAction === "approve") {
      const res = await approveDonationRequest(
        selectedRequest._id,
        txn_password,
      );
      if (res && res.status) {
        getDonationRequests(params);
      }
    } else if (verificationAction === "reject") {
      const res = await rejectDonationRequest(
        selectedRequest._id,
        txn_password,
        reason || "",
      );
      if (res && res.status) {
        getDonationRequests(params);
      }
    }

    handleVerificationClose();
  };

  useEffect(() => {
    getDonationRequests(params);
  }, [getDonationRequests, params]);

  const handleApplyFilters = (nextFilters) => {
    setParams((prev) => ({
      ...prev,
      ...nextFilters,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setParams((prev) => ({
      ...prev,
      status: "",
      phone: "",
      email: "",
      amount: "",
      donorType: "",
      search: "",
      fromDate: "",
      toDate: "",
      page: 1,
    }));
  };

  const applySummaryFilter = (type) => {
    if (type === "total") {
      setParams((prev) => ({ ...prev, status: "", page: 1 }));
      return;
    }
    const statusMap = {
      approved: "approved",
      pending: "pending",
      rejected: "rejected",
    };
    const statusValue = statusMap[type];
    if (!statusValue) return;
    setParams((prev) => ({ ...prev, status: statusValue, page: 1 }));
  };

  const getStatusBadge = (status) => {
    const safeStatus = status ? status.toLowerCase() : "pending";

    if (safeStatus === "pending") {
      return <Badge bg="warning">PENDING</Badge>;
    }

    const isSuccess = safeStatus === "success" || safeStatus === "approved";
    const bg = isSuccess ? "success" : "danger";
    const text = safeStatus.toUpperCase();
    return <Badge bg={bg}>{text}</Badge>;
  };

  const getDonorTypeBadge = (donorType, isGatewayPayment) => {
    if (isGatewayPayment) {
      return donorType === "registered" ? (
        <Badge bg="primary">Registered</Badge>
      ) : (
        <Badge bg="secondary">Guest</Badge>
      );
    }
    return <Badge bg="secondary">Guest</Badge>; // Bank transfers are always guest
  };

  const columns = [
    {
      name: "Donor Name",
      selector: (row) => row.donorName || "Guest User",
      sortable: false,
      width: "150px",
      wrap: true,
    },
    {
      name: "Email",
      selector: (row) => row.email || "N/A",
      sortable: false,
      width: "250px",
      wrap: true,
    },
    {
      name: "Mobile",
      selector: (row) => row.phone || "N/A",
      sortable: false,
      width: "120px",
      wrap: true,
    },
    {
      name: "Amount",
      cell: (row) => `₹${formatIndianNumber(row.amount) || 0}`,
      sortable: true,
      width: "120px",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => getStatusBadge(row.status),
      sortable: false,
      width: "130px",
      wrap: true,
    },
    {
      name: "Mode",
      cell: (row) => (
        <Badge
          bg={
            row.paymentMode === "UPI"
              ? "info"
              : row.paymentMode === "BANK"
                ? "secondary"
                : "primary"
          }
        >
          {row.paymentMode || "N/A"}
        </Badge>
      ),
      sortable: false,
      width: "120px",
      wrap: true,
    },
    {
      name: "Transaction/UTR",
      selector: (row) => row.utrNumber || "N/A",
      sortable: false,
      width: "250px",
      wrap: true,
    },
    {
      name: "Type",
      cell: (row) => getDonorTypeBadge(row.donorType, row.isGatewayPayment),
      sortable: false,
      width: "120px",
      wrap: true,
    },
    {
      name: "Date & Time",
      cell: (row) =>
        row.createdAt
          ? format(parseISO(row.createdAt), "dd/MM/yyyy, hh:mm a")
          : "N/A",
      sortable: true,
      width: "200px",
      wrap: true,
    },
    {
      name: "Rejection Reason",
      selector: (row) =>
        row.status?.toLowerCase() === "rejected"
          ? row.rejectionReason || "-"
          : "-",
      sortable: false,
      width: "300px",
      wrap: true,
    },
    {
      name: "Actions",
      cell: (row) => {
        if (row.isGatewayPayment || row.status?.toLowerCase() !== "pending") {
          return <span className="text-muted small">N/A</span>;
        }
        return (
          <div className="d-flex flex-row gap-1">
            <Button
              size="sm"
              variant="success"
              disabled={loadingOnDonationRequestAction}
              onClick={() => openApproveModal(row)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={loadingOnDonationRequestAction}
              onClick={() => openRejectModal(row)}
            >
              Reject
            </Button>
          </div>
        );
      },
      sortable: false,
      width: "300px",
      wrap: true,
    },
  ];

  const data = donationRequests?.data || [];
  const pagination = donationRequests?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  };

  const totalApproved = data.filter(
    (item) =>
      item.status &&
      (item.status.toLowerCase() === "approved" ||
        item.status.toLowerCase() === "success"),
  ).length;
  const totalRejected = data.filter(
    (item) => item.status && item.status.toLowerCase() === "rejected",
  ).length;
  const totalPending = data.filter(
    (item) => item.status && item.status.toLowerCase() === "pending",
  ).length;

  const sumAmount = (items) =>
    items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalApprovedAmount = sumAmount(
    data.filter(
      (item) =>
        item.status &&
        (item.status.toLowerCase() === "approved" ||
          item.status.toLowerCase() === "success"),
    ),
  );
  const totalRejectedAmount = sumAmount(
    data.filter(
      (item) => item.status && item.status.toLowerCase() === "rejected",
    ),
  );
  const totalPendingAmount = sumAmount(
    data.filter(
      (item) => item.status && item.status.toLowerCase() === "pending",
    ),
  );

  const selectedSummaryCard = (() => {
    const s = (params.status || "").toLowerCase();
    if (!s) return "total";
    if (s === "approved" || s === "success") return "approved";
    if (s === "pending") return "pending";
    if (s === "rejected") return "rejected";
    return null;
  })();

  const handlePageChange = (page) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  };

  const renderSummaryValue = (value) => {
    if (loadingDonationRequests) {
      return <AdminLoadingSkeleton height={30} width={58} />;
    }
    return value;
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Donation Requests"
        crumbs={[{ name: "Donations" }]}
      />

      <>
        <Row className="mb-3 g-3">
          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--total ${
                selectedSummaryCard === "total" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("total")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("total");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FaRupeeSign size={16} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Total</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(data.length)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--success ${
                selectedSummaryCard === "approved" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("approved")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("approved");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FaCheckCircle size={16} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Approved</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(totalApproved)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--warning ${
                selectedSummaryCard === "pending" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("pending")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("pending");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FaClock size={16} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Pending</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(totalPending)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} sm={6} md={3}>
            <Card
              className={`admin-stat-card users-summary-card admin-stat-card--muted ${
                selectedSummaryCard === "rejected" ? "is-selected" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => applySummaryFilter("rejected")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  applySummaryFilter("rejected");
              }}
            >
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FaTimesCircle size={16} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Rejected</div>
                  <div className="admin-stat-card__value">
                    {renderSummaryValue(totalRejected)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <DonationFilters
          filterParams={params}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        <CustomDataTable
          columns={columns}
          data={data}
          count={pagination.total}
          params={{
            page: pagination.page,
            limit: pagination.limit,
          }}
          setParams={(newParams) => {
            if (newParams.page !== undefined) handlePageChange(newParams.page);
            if (newParams.limit !== undefined)
              handleLimitChange(newParams.limit);
          }}
          pagination
          responsive
          striped={true}
          progressPending={loadingDonationRequests}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </>

      <DonationVerificationModal
        show={showVerifyModal}
        handleClose={handleVerificationClose}
        handleConfirm={handleVerificationConfirm}
        title={
          verificationAction === "reject"
            ? "Reject Donation Request"
            : "Approve Donation Request"
        }
        body={
          selectedRequest
            ? verificationAction === "reject"
              ? `Are you sure you want to reject this bank transfer donation request of ₹${formatIndianNumber(
                  selectedRequest.amount,
                )} from ${
                  selectedRequest.donorName || "Guest User"
                }? The donor will receive an email with the rejection reason. Please enter your transaction password and rejection reason to confirm.`
              : `Are you sure you want to approve this bank transfer donation request of ₹${formatIndianNumber(
                  selectedRequest.amount,
                )} from ${
                  selectedRequest.donorName || "Guest User"
                }? The donor will receive a thank you email. Please enter your transaction password to confirm.`
            : ""
        }
        submitBtnText={
          verificationAction === "reject" ? "Reject Request" : "Approve Request"
        }
        isSubmitting={loadingOnDonationRequestAction}
        showReason={verificationAction === "reject"}
        reasonRequired={verificationAction === "reject"}
        reasonLabel="Rejection Reason"
        reasonPlaceholder="Enter reason for rejecting this donation (will be sent to donor)"
      />
    </Container>
  );
};

DonationRequestsList.propTypes = {
  getDonationRequests: PropTypes.func.isRequired,
  approveDonationRequest: PropTypes.func.isRequired,
  rejectDonationRequest: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  donationRequests: state.adminDonation.donationRequests,
  loadingDonationRequests: state.adminDonation.loadingDonationRequests,
  loadingOnDonationRequestAction:
    state.adminDonation.loadingOnDonationRequestAction,
  loggedInAdmin: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getDonationRequests,
  approveDonationRequest,
  rejectDonationRequest,
})(DonationRequestsList);
