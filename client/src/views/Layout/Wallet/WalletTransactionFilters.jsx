import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

/**
 * Wallet Transaction filters: Wallet, Type, CR/DR, From Date, To Date.
 * Used by Wallet Transactions filter page (same pattern as Direct Team filters).
 */
const WALLET_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "LEVEL_INCOME", label: "Level Income" },
  { value: "RANK_INCOME", label: "Rank Income" },
  { value: "CLUB_INCOME", label: "Club Income" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ADMIN", label: "Admin" },
  { value: "ACTIVATION", label: "Activation" },
  { value: "ADMIN_CR", label: "Admin Credit" },
  { value: "ADMIN_DR", label: "Admin Debit" },
  { value: "ADMIN_TRANSFER", label: "Admin Transfer" },
  { value: "SBI_PRO_COMMISSION", label: "SBI Pro Commission" },
  { value: "COUNSELLING_COMMISSION", label: "Counselling Commission" },
  { value: "COUNSELLING_CHARGE", label: "Counselling Charge" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "All" },
  { value: "CREDIT", label: "Credit (CR)" },
  { value: "DEBIT", label: "Debit (DR)" },
];

const WalletTransactionFilters = ({
  filterParams = {},
  onFilterChange,
  walletOptions = [], // [{ clubKey: "MAIN" }, { clubKey: "L1" }, ...] from availableClubs; MAIN always first
}) => {
  const [walletKey, setWalletKey] = useState(filterParams.walletKey ?? "");
  const [type, setType] = useState(filterParams.type ?? "");
  const [direction, setDirection] = useState(filterParams.direction ?? "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate ?? "");
  const [toDate, setToDate] = useState(filterParams.toDate ?? "");

  const handleApplyFilters = () => {
    const params = {
      page: 1,
      limit: filterParams.limit ?? 20,
      walletKey: walletKey?.trim() || undefined,
      type: type?.trim() || undefined,
      direction: direction?.trim() || undefined,
      fromDate: fromDate?.trim() || undefined,
      toDate: toDate?.trim() || undefined,
    };
    if (onFilterChange) onFilterChange(params);
  };

  const handleResetFilters = () => {
    setWalletKey("");
    setType("");
    setDirection("");
    setFromDate("");
    setToDate("");
    if (onFilterChange) {
      onFilterChange({
        page: 1,
        limit: filterParams.limit ?? 20,
        walletKey: undefined,
        type: undefined,
        direction: undefined,
        fromDate: undefined,
        toDate: undefined,
      });
    }
  };

  const walletSelectOptions = [
    { value: "", label: "All Wallets" },
    { value: "MAIN", label: "Main" },
    ...(walletOptions || [])
      .filter((c) => (c.clubKey || c.walletKey || "").trim().toUpperCase() !== "MAIN")
      .map((c) => ({
        value: (c.clubKey || c.walletKey || "").trim().toUpperCase(),
        label: c.name || c.clubKey || c.walletKey || "—",
      })),
  ];

  return (
    <div className="mb-3">
      <Row className="row-gap-2">
        <Col xs={12}>
          <h6 className="text-muted mb-2">Filters</h6>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Wallet</Form.Label>
            <Form.Select
              value={walletKey}
              onChange={(e) => setWalletKey(e.target.value)}
            >
              {walletSelectOptions.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>Type</Form.Label>
            <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
              {WALLET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>CR/DR</Form.Label>
            <Form.Select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              {DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>From Date</Form.Label>
            <Form.Control
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Form.Group>
            <Form.Label>To Date</Form.Label>
            <Form.Control
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} className="mt-3 d-flex align-items-end gap-2">
          <Button variant="primary" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outline-secondary" onClick={handleResetFilters}>
            Reset
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default WalletTransactionFilters;
