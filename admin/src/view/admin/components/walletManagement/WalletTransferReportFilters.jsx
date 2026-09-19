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

const WalletTransferReportFilters = ({
  filterParams = {},
  onFilterChange,
  walletTypes = [],
}) => {
  const [fromMemberId, setFromMemberId] = useState(filterParams.fromMemberId || "");
  const [toMemberId, setToMemberId] = useState(filterParams.toMemberId || "");
  const [walletKey, setWalletKey] = useState(filterParams.walletKey || "");
  const [transferType, setTransferType] = useState(filterParams.transferType || "");
  const [fromDate, setFromDate] = useState(filterParams.fromDate || "");
  const [toDate, setToDate] = useState(filterParams.toDate || "");

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setFromMemberId(filterParams.fromMemberId || "");
    setToMemberId(filterParams.toMemberId || "");
    setWalletKey(filterParams.walletKey || "");
    setTransferType(filterParams.transferType || "");
    setFromDate(filterParams.fromDate || "");
    setToDate(filterParams.toDate || "");
  }, [
    filterParams.fromMemberId,
    filterParams.toMemberId,
    filterParams.walletKey,
    filterParams.transferType,
    filterParams.fromDate,
    filterParams.toDate,
  ]);

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

  const handleApplyFilters = () => {
    if (!onFilterChange) return;
    onFilterChange({
      fromMemberId: fromMemberId.trim(),
      toMemberId: toMemberId.trim(),
      walletKey: walletKey || "",
      transferType: transferType || "",
      fromDate: fromDate || "",
      toDate: toDate || "",
    });
  };

  const handleResetFilters = () => {
    setFromMemberId("");
    setToMemberId("");
    setWalletKey("");
    setTransferType("");
    setFromDate("");
    setToDate("");
    if (!onFilterChange) return;
    onFilterChange({
      fromMemberId: "",
      toMemberId: "",
      walletKey: "",
      transferType: "",
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
                  <Form.Label htmlFor="fromMemberId">From Member ID</Form.Label>
                  <Form.Control
                    type="text"
                    id="fromMemberId"
                    name="fromMemberId"
                    value={fromMemberId}
                    onChange={handleFromMemberIdChange}
                    onPaste={handleFromMemberIdPaste}
                    onKeyDown={handleFromMemberIdKeyDown}
                    placeholder="G123456789"
                    maxLength={10}
                    className="text-muted"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label htmlFor="toMemberId">To Member ID</Form.Label>
                  <Form.Control
                    type="text"
                    id="toMemberId"
                    name="toMemberId"
                    value={toMemberId}
                    onChange={handleToMemberIdChange}
                    onPaste={handleToMemberIdPaste}
                    onKeyDown={handleToMemberIdKeyDown}
                    placeholder="G123456789"
                    maxLength={10}
                    className="text-muted"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Wallet Type</Form.Label>
                  <Form.Select value={walletKey} onChange={(e) => setWalletKey(e.target.value)}>
                    <option value="">All</option>
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
                  <Form.Label>Transfer Type</Form.Label>
                  <Form.Select value={transferType} onChange={(e) => setTransferType(e.target.value)}>
                    <option value="">All</option>
                    <option value="User Transfer">User Transfer</option>
                    <option value="Admin Transfer">Admin Transfer</option>
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
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>To Date</Form.Label>
                  <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </Form.Group>
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

export default WalletTransferReportFilters;

