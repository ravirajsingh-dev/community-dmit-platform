import React, { useEffect, useState } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import {
  FiCheckCircle,
  FiRotateCcw,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const WalletMemberBalanceFilters = ({
  filterParams = {},
  onFilterChange,
  walletTypes = [],
}) => {
  const [memberId, setMemberId] = useState(filterParams.memberId || "");
  const [walletKey, setWalletKey] = useState(filterParams.walletKey || "MAIN");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");
  const [filterToday, setFilterToday] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMemberId(filterParams.memberId || "");
    setWalletKey(filterParams.walletKey || "MAIN");
    setFromDate(filterParams.fromDate || "");
    setToDate(filterParams.toDate || "");
  }, [
    filterParams.memberId,
    filterParams.walletKey,
    filterParams.fromDate,
    filterParams.toDate,
  ]);

  useEffect(() => {
    if (!filterToday) return;
    const todayStr = new Date().toISOString().split("T")[0];
    setFromDate(todayStr);
    setToDate(todayStr);
  }, [filterToday]);

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

  const handleTodayFilter = (e) => {
    const checked = e.target.checked;
    setFilterToday(checked);
    if (!checked) {
      setFromDate("");
      setToDate("");
    }
  };

  const handleApplyFilters = () => {
    if (!onFilterChange) return;
    onFilterChange({
      memberId: memberId.trim(),
      walletKey: walletKey || "MAIN",
      fromDate: fromDate || "",
      toDate: toDate || "",
    });
  };

  const handleResetFilters = () => {
    setMemberId("");
    setWalletKey("MAIN");
    setFromDate("");
    setToDate("");
    setFilterToday(false);
    if (!onFilterChange) return;
    onFilterChange({
      memberId: "",
      walletKey: "MAIN",
      fromDate: "",
      toDate: "",
    });
  };

  return (
    <div className="mb-3 users-filter-wrap">
      <div className="users-filters-panel">
        <div className="users-filters-panel__header">
          <button
            type="button"
            className="users-filters-panel__toggle"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span>All Filters</span>
            {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </button>
        </div>

        {isOpen && (
          <div className="users-filters-panel__body">
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label htmlFor="wallet-memberId">Member ID</Form.Label>
                  <Form.Control
                    type="text"
                    id="wallet-memberId"
                    name="memberId"
                    value={memberId}
                    onChange={handleMemberIdChange}
                    onPaste={handleMemberIdPaste}
                    onKeyDown={handleMemberIdKeyDown}
                    placeholder="G123456789"
                    maxLength={10}
                    className="text-muted"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Wallet Type</Form.Label>
                  <Form.Select
                    value={walletKey}
                    onChange={(e) => setWalletKey(e.target.value)}
                  >
                    {walletTypes?.map((wt) => (
                      <option key={wt.key} value={wt.key}>
                        {wt.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>From Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={filterToday}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>To Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={filterToday}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Check
                  type="checkbox"
                  label="Today"
                  checked={filterToday}
                  onChange={handleTodayFilter}
                />
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-3">
              <Button variant="primary" onClick={handleApplyFilters}>
                <FiCheckCircle size={15} className="me-1" />
                Apply
              </Button>
              <Button variant="secondary" onClick={handleResetFilters}>
                <FiRotateCcw size={15} className="me-1" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletMemberBalanceFilters;

