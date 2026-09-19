/**
 * Admin Commission Payout Management
 * Payout schedule, ranks overview, credit preview, run payout, history
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Modal,
  Spinner,
  Accordion,
  Nav,
} from "react-bootstrap";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AdminNoDataState from "@src/view/commonComponents/dataTable/AdminNoDataState";
import BouncingLoader from "@src/view/spinners/BouncingLoader";
import VerificationConfirmModal from "@src/view/admin/modals/VerificationConfirmModal";
import {
  getRanksOverview,
  getCommissionPreview,
  getPayoutHistory,
  getPayoutHistoryDetail,
  runCommissionPayout,
  updateCommissionPayoutSettings,
} from "@src/actions/adminCommissionPayoutActions";
import { useDispatch } from "react-redux";
import { initialSortingParams } from "@src/constants";
import { FiCalendar, FiTrendingUp, FiUsers } from "react-icons/fi";

/** Convert MongoDB Decimal128 or number to display string */
const toNum = (val) => {
  if (val == null || val === "") return "—";
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val?.$numberDecimal != null)
    return val.$numberDecimal;
  return String(val);
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

const RANKS_COLUMNS = [
  { name: "Rank", selector: (r) => r.rankCode, width: "150px" },
  { name: "Name", selector: (r) => r.name, width: "250px" },
  {
    name: "Commission %",
    selector: (r) => `${toNum(r.commissionPercent)}%`,
    width: "150px",
  },
  {
    name: "Capping",
    selector: (r) => (r.capping ? `₹${toNum(r.capping)}` : "—"),
    width: "150px",
  },
  {
    name: "Monthly Target",
    selector: (r) => (r.monthlyTarget != null ? toNum(r.monthlyTarget) : "—"),
    width: "180px",
  },
  { name: "Users", selector: (r) => r.userCount, width: "150px" },
];

const CLUBS_COLUMNS = [
  { name: "Club", selector: (r) => r.name, width: "180px" },
  { name: "Wallet", selector: (r) => r.walletKey || "-", width: "150px" },
  {
    name: "Commission %",
    selector: (r) => `${toNum(r.commissionPercent)}%`,
    width: "160px",
  },
  {
    name: "Capping",
    selector: (r) => (r.capping ? `₹${toNum(r.capping)}` : "—"),
    width: "140px",
  },
  {
    name: "Min Rank",
    selector: (r) => r.minimumRankCode ?? "—",
    width: "110px",
  },
  {
    name: "Self Sale",
    selector: (r) => r.selfSaleRequired ?? "—",
    width: "110px",
  },
  {
    name: "Monthly Target",
    selector: (r) => r.monthlyTarget ?? "—",
    width: "180px",
  },
  {
    name: "Admin Only",
    selector: (r) => (r.isAdminOnly ? "Yes" : "No"),
    width: "130px",
  },
];

const ELIGIBLE_USERS_COLUMNS = [
  { name: "Member ID", selector: (u) => u.memberId || "-", width: "150px" },
  { name: "Name", selector: (u) => u.name || "-", width: "250px" },
  { name: "Phone", selector: (u) => u.phone || "-", width: "150px" },
  {
    name: "Amount",
    selector: (u) => `₹${toNum(u.perUserAmount)}`,
    width: "150px",
  },
  {
    name: "Status",
    cell: (u) =>
      u.alreadyCredited ? (
        <Badge bg="success">Already credited</Badge>
      ) : (
        <Badge bg="primary">Will credit</Badge>
      ),
    width: "150px",
  },
];

const HISTORY_DETAIL_COLUMNS = [
  { name: "Member ID", selector: (d) => d.memberId || "-", width: "150px" },
  { name: "Name", selector: (d) => d.name || "-", width: "250px" },
  { name: "Phone", selector: (d) => d.phone || "-", width: "150px" },
  {
    name: "Rank/Club",
    selector: (d) =>
      d.rankCode != null ? `R${d.rankCode}` : d.clubWalletKey || "-",
    width: "130px",
  },
  { name: "Amount", selector: (d) => `₹${toNum(d.amount)}`, width: "150px" },
  {
    name: "Credited At",
    selector: (d) =>
      d.creditedAt ? new Date(d.creditedAt).toLocaleString() : "—",
    width: "200px",
  },
];
const MONTH_OPTIONS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (specific day of month)" },
];

const AdminCommissionManagement = () => {
  const dispatch = useDispatch();
  const [overview, setOverview] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState({ history: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduleType: "monthly",
    customDayOfMonth: 1,
    customDayOfWeek: 0,
    payoutTimeHH: 1,
    payoutTimeMM: 0,
  });
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [runMonth, setRunMonth] = useState(new Date().getMonth());
  const [showRunModal, setShowRunModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear());
  const [previewMonth, setPreviewMonth] = useState(new Date().getMonth());

  const previewPeriodKey = `${previewYear}-${String(previewMonth + 1).padStart(2, "0")}`;
  const runPeriodKey = `${runYear}-${String(runMonth + 1).padStart(2, "0")}`;
  const [historyParams, setHistoryParams] = useState(initialSortingParams);
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [detailPeriodKey, setDetailPeriodKey] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [payoutType, setPayoutType] = useState("rank");

  const loadOverview = async () => {
    setLoading(true);
    const data = await dispatch(getRanksOverview({ payoutType }));
    if (data) {
      setOverview(data);
      if (data.payoutSettings) {
        setScheduleForm({
          scheduleType: data.payoutSettings.scheduleType || "monthly",
          customDayOfMonth: data.payoutSettings.customDayOfMonth ?? 1,
          customDayOfWeek: data.payoutSettings.customDayOfWeek ?? 0,
          payoutTimeHH: data.payoutSettings.payoutTimeHH ?? 1,
          payoutTimeMM: data.payoutSettings.payoutTimeMM ?? 0,
        });
      }
    }
    setLoading(false);
  };

  const loadPreview = async () => {
    if (!previewPeriodKey) return;
    setLoadingPreview(true);
    const data = await dispatch(
      getCommissionPreview({ periodKey: previewPeriodKey, payoutType }),
    );
    if (data) setPreview(data);
    setLoadingPreview(false);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await dispatch(
      getPayoutHistory({
        page: historyParams.page,
        limit: historyParams.limit,
        payoutType,
      }),
    );
    if (data) {
      setHistory({
        history: data.history || [],
        pagination: data.pagination || {},
      });
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadOverview();
  }, [payoutType]);

  useEffect(() => {
    if (previewPeriodKey) loadPreview();
  }, [previewPeriodKey]);

  useEffect(() => {
    loadHistory();
  }, [historyParams.page, historyParams.limit]);

  const handleSaveSchedule = async (txn_password) => {
    const configVersion = overview?.configVersion ?? 1;
    const result = await dispatch(
      updateCommissionPayoutSettings({
        ...scheduleForm,
        configVersion,
        txn_password,
      }),
    );
    if (result) {
      setShowScheduleModal(false);
      setScheduleEditMode(false);
      loadOverview();
    }
  };

  const loadHistoryDetail = async (periodKey) => {
    setDetailPeriodKey(periodKey);
    setLoadingDetail(true);
    const data = await dispatch(getPayoutHistoryDetail(periodKey, payoutType));
    setHistoryDetail(data);
    setLoadingDetail(false);
  };

  const historyColumns = [
    { name: "Period", selector: (h) => h.periodKey, width: "120px" },
    {
      name: "Total Amount",
      selector: (h) => `₹${toNum(h.totalAmount)}`,
      width: "160px",
    },
    { name: "Users", selector: (h) => h.userCount, width: "100px" },
    {
      name: "Company Profit %",
      selector: (h) =>
        h.companyProfitPercent != null ? `${toNum(h.companyProfitPercent)}%` : "—",
      width: "160px",
    },
    {
      name: "Admin Surcharge %",
      selector: (h) =>
        h.adminSurchargePercent != null ? `${toNum(h.adminSurchargePercent)}%` : "—",
      width: "170px",
    },
    {
      name: "Company Pool",
      selector: (h) =>
        h.companyProfitPool != null ? `₹${toNum(h.companyProfitPool)}` : "—",
      width: "170px",
    },
    {
      name: "Last Credited",
      selector: (h) =>
        h.lastCreditedAt ? new Date(h.lastCreditedAt).toLocaleString() : "—",
      width: "200px",
    },
    {
      name: "Details",
      width: "150px",
      cell: (h) => (
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => loadHistoryDetail(h.periodKey)}
        >
          View Details
        </Button>
      ),
    },
  ];

  const handleRunPayout = async (txn_password) => {
    setRunning(true);
    const data = runPeriodKey
      ? { periodKey: runPeriodKey, payoutType, txn_password }
      : { payoutType, txn_password };
    const result = await dispatch(runCommissionPayout(data));
    setRunning(false);
    setShowRunModal(false);
    if (result) {
      const d = new Date();
      setRunYear(d.getFullYear());
      setRunMonth(d.getMonth());
      loadOverview();
      loadPreview();
      loadHistory();
    }
  };

  if (loading && !overview) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Commission Payout Management"
          crumbs={[{ name: "Commission Payout Management" }]}
        />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container className="commission-mgmt-page">
      <AppBreadCrumb
        pageTitle="Commission Payout Management"
        crumbs={[{ name: "Commission Payout Management" }]}
      />
      <>
        <Nav
          variant="tabs"
          activeKey={payoutType}
          onSelect={(k) => setPayoutType(k || "rank")}
          className="mb-4 user-edit-tabs"
        >
          <Nav.Item>
            <Nav.Link eventKey="rank">Rank Payout</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="club">Club Payout</Nav.Link>
          </Nav.Item>
        </Nav>

        <Row className="g-3 mb-4">
          <Col xs={6} md={4}>
            <Card className="admin-stat-card users-summary-card admin-stat-card--total h-100">
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiCalendar size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Current Period</div>
                  <div className="admin-stat-card__value fs-6">
                    {overview?.periodKey || "-"}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4}>
            <Card className="admin-stat-card users-summary-card admin-stat-card--muted h-100">
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiUsers size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Activations</div>
                  <div className="admin-stat-card__value">
                    {overview?.activeCount ?? 0}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4}>
            <Card className="admin-stat-card users-summary-card admin-stat-card--success h-100">
              <Card.Body className="admin-stat-card__body">
                <div className="admin-stat-card__icon">
                  <FiTrendingUp size={18} />
                </div>
                <div className="admin-stat-card__meta">
                  <div className="admin-stat-card__label">Company Pool</div>
                  <div className="admin-stat-card__value fs-6">
                    ₹{toNum(overview?.companyProfitPool)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        {/* Payout Schedule Config - Edit mode required */}
        <Card className="mb-4 commission-section-card">
          <Card.Header className="bg-primary text-white d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <h5 className="mb-0">Payout Schedule</h5>
            <small className="opacity-75">
              Shared schedule for Rank and Club payout. Txn password required to
              save.
            </small>
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setScheduleEditMode(!scheduleEditMode);
                if (scheduleEditMode)
                  setScheduleForm({
                    scheduleType:
                      overview?.payoutSettings?.scheduleType || "monthly",
                    customDayOfMonth:
                      overview?.payoutSettings?.customDayOfMonth ?? 1,
                    customDayOfWeek:
                      overview?.payoutSettings?.customDayOfWeek ?? 0,
                    payoutTimeHH: overview?.payoutSettings?.payoutTimeHH ?? 1,
                    payoutTimeMM: overview?.payoutSettings?.payoutTimeMM ?? 0,
                  });
              }}
            >
              {scheduleEditMode ? "Cancel" : "Edit"}
            </Button>
          </Card.Header>
          <Card.Body>
            {scheduleEditMode ? (
              <Row className="g-2">
                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-2">
                    <Form.Label>Schedule</Form.Label>
                    <Form.Select
                      value={scheduleForm.scheduleType}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduleType: e.target.value,
                        })
                      }
                    >
                      {SCHEDULE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                {(scheduleForm.scheduleType === "custom" ||
                  scheduleForm.scheduleType === "monthly") && (
                  <Col xs={12} sm={6} md={2}>
                    <Form.Group className="mb-2">
                      <Form.Label>Day of Month</Form.Label>
                      <Form.Select
                        value={scheduleForm.customDayOfMonth}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            customDayOfMonth: parseInt(e.target.value, 10),
                          })
                        }
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ),
                        )}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}
                <Col xs={12} sm={6} md={2}>
                  <Form.Group className="mb-2">
                    <Form.Label>Time (HH)</Form.Label>
                    <Form.Select
                      value={scheduleForm.payoutTimeHH}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          payoutTimeHH: parseInt(e.target.value, 10),
                        })
                      }
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={2}>
                  <Form.Group className="mb-2">
                    <Form.Label>Time (MM)</Form.Label>
                    <Form.Select
                      value={scheduleForm.payoutTimeMM}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          payoutTimeMM: parseInt(e.target.value, 10),
                        })
                      }
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col
                  xs={12}
                  sm={6}
                  md={3}
                  className="d-flex align-items-end gap-1"
                >
                  <Button
                    variant="primary"
                    className="w-100"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    Save
                  </Button>
                </Col>
              </Row>
            ) : (
              <Row className="g-2">
                <Col xs={12} sm={6} md={4}>
                  <strong>Schedule:</strong>{" "}
                  {SCHEDULE_OPTIONS.find(
                    (o) => o.value === scheduleForm.scheduleType,
                  )?.label ?? scheduleForm.scheduleType}
                </Col>
                {(scheduleForm.scheduleType === "custom" ||
                  scheduleForm.scheduleType === "monthly") && (
                  <Col xs={12} sm={6} md={3}>
                    <strong>Day of Month:</strong>{" "}
                    {scheduleForm.customDayOfMonth}
                  </Col>
                )}
                <Col xs={12} sm={6} md={3}>
                  <strong>Time:</strong>{" "}
                  {String(scheduleForm.payoutTimeHH).padStart(2, "0")}:
                  {String(scheduleForm.payoutTimeMM).padStart(2, "0")}
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>

        {/* Overview */}
        <Card className="mb-4 commission-section-card">
          <Card.Header className="bg-secondary text-white">
            <h5 className="mb-0">
              {payoutType === "club" ? "Clubs Overview" : "Ranks Overview"}
            </h5>
          </Card.Header>
          <Card.Body>
            <p className="text-muted mb-2">
              Period: <strong>{overview?.periodKey}</strong> | Activations:{" "}
              <strong>{overview?.activeCount ?? 0}</strong> | Company Pool: ₹
              {toNum(overview?.companyProfitPool)}
            </p>
            <p className="text-muted small mb-3">Read-only overview table.</p>
            <CustomDataTable
              columns={payoutType === "club" ? CLUBS_COLUMNS : RANKS_COLUMNS}
              data={
                payoutType === "club"
                  ? overview?.clubs || []
                  : overview?.ranks || []
              }
              count={
                payoutType === "club"
                  ? (overview?.clubs || []).length
                  : (overview?.ranks || []).length
              }
              params={initialSortingParams}
              setParams={() => {}}
              pagination={false}
              responsive
              striped
              noDataComponent={
                payoutType === "club" ? "No clubs." : "No ranks."
              }
            />
          </Card.Body>
        </Card>

        {/* Credit Beneficiaries Preview */}
        <Card className="mb-4 commission-section-card">
          <Card.Header className="bg-info text-white d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <h5 className="mb-0">Credit Beneficiaries Preview</h5>
            <div className="d-flex gap-2 align-items-center flex-wrap w-100">
              <Form.Select
                size="sm"
                className="w-auto"
                value={previewYear}
                onChange={(e) => setPreviewYear(parseInt(e.target.value, 10))}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
              <Form.Select
                size="sm"
                className="w-auto"
                value={previewMonth}
                onChange={(e) => setPreviewMonth(parseInt(e.target.value, 10))}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Form.Select>
              <Button
                size="sm"
                variant="light"
                onClick={loadPreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Preview"
                )}
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {loadingPreview ? (
              <BouncingLoader />
            ) : preview ? (
              <>
                <p className="mb-2">
                  <strong>Period:</strong> {preview.periodKey} |{" "}
                  <strong>Activations:</strong> {preview.activeCount ?? 0} |{" "}
                  <strong>Company Pool:</strong> ₹
                  {toNum(preview.companyProfitPool)} |{" "}
                  <strong>Total to Distribute:</strong> ₹
                  {typeof preview.distributed === "number"
                    ? preview.distributed.toFixed(2)
                    : toNum(preview.distributed)}
                </p>

                {/* Calculation breakdown */}
                {preview.calculationBreakdown && (
                  <Card className="mb-3 bg-light">
                    <Card.Header className="py-2">
                      <strong>Company Profit Calculation</strong>
                    </Card.Header>
                    <Card.Body className="py-2 small">
                      <p className="mb-1">
                        <strong>
                          Step 1 – Commission split from each activation:
                        </strong>
                      </p>
                      <p className="mb-1 ms-2">
                        Levels:{" "}
                        {toNum(preview.calculationBreakdown.levelsPercent)}% |
                        Designations:{" "}
                        {toNum(
                          preview.calculationBreakdown.designationsPercent,
                        )}
                        % | Company Profit:{" "}
                        {toNum(
                          preview.calculationBreakdown.companyProfitPercent,
                        )}
                        %
                      </p>
                      <p className="mb-1">
                        <strong>Formula:</strong>{" "}
                        <code>{preview.calculationBreakdown.formula}</code>
                      </p>
                      <p className="mb-1">
                        <strong>
                          Step 2 – Company pool (from activations this period):
                        </strong>
                      </p>
                      <p className="mb-1 ms-2">
                        <code>{preview.calculationBreakdown.poolFormula}</code>
                      </p>
                      <p className="mb-2">
                        <strong>
                          Total revenue (Activations × Registration Fee):
                        </strong>{" "}
                        ₹{toNum(preview.calculationBreakdown.totalRevenue)} →
                        Company share: ₹
                        {toNum(preview.calculationBreakdown.companyProfitPool)}{" "}
                        (
                        {toNum(
                          preview.calculationBreakdown.companyProfitPercent,
                        )}
                        %)
                      </p>
                      {preview.breakdown?.length > 0 && (
                        <>
                          <p className="mb-1">
                            <strong>
                              Step 3 – Rank share from company pool:
                            </strong>
                          </p>
                          <ul className="mb-0 ps-3">
                            {preview.breakdown.map((b) => (
                              <li key={b.rankCode}>
                                {b.rankName}: {toNum(b.commissionPercent)}% of
                                pool = ₹{toNum(b.rankPool)} → {b.userCount}{" "}
                                users, ₹{toNum(b.perUserAmount)} each
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                )}

                {(preview.activeCount ?? 0) === 0 ? (
                  <p className="text-muted mb-0">
                    No activations in this period. Company profit pool is zero.
                  </p>
                ) : (preview.eligibleUsers || []).length === 0 ? (
                  <p className="text-muted mb-0">
                    No eligible users for {payoutType} commission in this
                    period.
                  </p>
                ) : (
                  <>
                    <p className="text-muted small mb-2">
                      Amount shown is per user if you run payout now. If payout
                      was run multiple times before, users credited in earlier
                      runs may have different amounts (higher when fewer users
                      were eligible).
                    </p>
                    <Accordion>
                      {(preview.eligibleUsers || []).map((eu, idx) => (
                        <Accordion.Item key={idx} eventKey={String(idx)}>
                          <Accordion.Header>
                            {eu.rankName || eu.clubName} –{" "}
                            {eu.users?.length ?? 0} users, ₹
                            {toNum(eu.users?.[0]?.perUserAmount)} each
                          </Accordion.Header>
                          <Accordion.Body>
                            <CustomDataTable
                              columns={ELIGIBLE_USERS_COLUMNS}
                              data={eu.users || []}
                              count={(eu.users || []).length}
                              params={initialSortingParams}
                              setParams={() => {}}
                              pagination={false}
                              responsive
                              striped
                              dense
                              noDataComponent={
                                <AdminNoDataState title="No users found" />
                              }
                            />
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </>
                )}
              </>
            ) : (
              <p className="text-muted">
                Select year and month, then click Preview
              </p>
            )}
          </Card.Body>
        </Card>

        {/* Run Payout */}
        <Card className="mb-4 commission-section-card">
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">Run Payout (Manual)</h5>
          </Card.Header>
          <Card.Body>
            <p className="text-muted mb-3">
              Selected period ke eligible users ko {payoutType} payout credit
              hoga. Existing credited users skip ho jayenge.
            </p>
            <Row className="align-items-end g-2">
              <Col xs={12} sm={6} md={3}>
                <Form.Group className="mb-2">
                  <Form.Label>Year</Form.Label>
                  <Form.Select
                    value={runYear}
                    onChange={(e) => setRunYear(parseInt(e.target.value, 10))}
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Form.Group className="mb-2">
                  <Form.Label>Month</Form.Label>
                  <Form.Select
                    value={runMonth}
                    onChange={(e) => setRunMonth(parseInt(e.target.value, 10))}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Button
                  variant="success"
                  onClick={() => setShowRunModal(true)}
                  disabled={running}
                  className="w-100"
                >
                  Run Payout
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* History */}
        <Card className="commission-section-card">
          <Card.Header className="bg-dark text-white">
            <h5 className="mb-0">Payout History</h5>
          </Card.Header>
          <Card.Body>
            <CustomDataTable
              columns={historyColumns}
              data={history.history || []}
              count={
                history.pagination?.totalCount ?? history.pagination?.total ?? 0
              }
              params={historyParams}
              setParams={(p) => setHistoryParams((prev) => ({ ...prev, ...p }))}
              pagination
              responsive
              striped
              paginationServer
              progressPending={loadingHistory}
              noDataComponent={<AdminNoDataState title="No payout history" />}
            />
          </Card.Body>
        </Card>
      </>

      <VerificationConfirmModal
        show={showScheduleModal}
        handleClose={() => setShowScheduleModal(false)}
        handleConfirm={handleSaveSchedule}
        title="Update Payout Schedule"
        body={`Update shared ${payoutType} payout schedule settings? Enter transaction password.`}
        submitBtnText="Save"
      />

      <VerificationConfirmModal
        show={showRunModal}
        handleClose={() => setShowRunModal(false)}
        handleConfirm={handleRunPayout}
        title="Run Commission Payout"
        body={
          runPeriodKey
            ? `Run ${payoutType} payout for period "${runPeriodKey}"? Enter transaction password.`
            : "Run payout for previous period? Enter transaction password."
        }
        submitBtnText="Run"
      />

      {/* History Detail Modal */}
      <Modal
        show={!!detailPeriodKey}
        onHide={() => {
          setDetailPeriodKey(null);
          setHistoryDetail(null);
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Payout Details: {detailPeriodKey}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetail ? (
            <BouncingLoader />
          ) : historyDetail?.details?.length > 0 ? (
            <>
              {historyDetail.meta && (
                <div className="alert alert-secondary py-2 small mb-3">
                  <div>
                    <strong>Snapshot (at payout time)</strong>
                  </div>
                  <div className="d-flex flex-wrap gap-3 mt-1">
                    <span>
                      <strong>Company Profit %:</strong>{" "}
                      {historyDetail.meta.companyProfitPercent != null
                        ? `${toNum(historyDetail.meta.companyProfitPercent)}%`
                        : "—"}
                    </span>
                    <span>
                      <strong>Admin Surcharge %:</strong>{" "}
                      {historyDetail.meta.adminSurchargePercent != null
                        ? `${toNum(historyDetail.meta.adminSurchargePercent)}%`
                        : "—"}
                    </span>
                    <span>
                      <strong>Levels %:</strong>{" "}
                      {historyDetail.meta.levelsPercent != null
                        ? `${toNum(historyDetail.meta.levelsPercent)}%`
                        : "—"}
                    </span>
                    <span>
                      <strong>Designations %:</strong>{" "}
                      {historyDetail.meta.designationsPercent != null
                        ? `${toNum(historyDetail.meta.designationsPercent)}%`
                        : "—"}
                    </span>
                    <span>
                      <strong>Company Pool:</strong>{" "}
                      {historyDetail.meta.companyProfitPool != null
                        ? `₹${toNum(historyDetail.meta.companyProfitPool)}`
                        : "—"}
                    </span>
                    <span>
                      <strong>Active Count:</strong>{" "}
                      {historyDetail.meta.activeCount != null
                        ? toNum(historyDetail.meta.activeCount)
                        : "—"}
                    </span>
                    <span>
                      <strong>Registration Fee:</strong>{" "}
                      {historyDetail.meta.registrationFee != null
                        ? `₹${toNum(historyDetail.meta.registrationFee)}`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
              <div className="alert alert-info py-2 small mb-3">
                <strong>Why do amounts differ?</strong> Payout may have been run
                multiple times for this period. Each run uses:{" "}
                <code>perUser = pool ÷ eligibleUserCount</code>. Earlier runs
                had fewer eligible users → higher amount. Later runs had more
                users → lower amount. Already-credited users are skipped, so
                they keep their original amount. Preview shows the amount if you
                run now (all current users get same share).
              </div>
              <CustomDataTable
                columns={HISTORY_DETAIL_COLUMNS}
                data={historyDetail.details || []}
                count={(historyDetail.details || []).length}
                params={initialSortingParams}
                setParams={() => {}}
                pagination={false}
                responsive
                striped
                dense
                noDataComponent={<AdminNoDataState title="No records found" />}
              />
            </>
          ) : (
            <p className="text-muted mb-0">
              No payout records for this period.
            </p>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AdminCommissionManagement;
