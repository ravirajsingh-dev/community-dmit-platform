import React, { useState } from "react";
import { Container, Form, Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { TbTransfer } from "react-icons/tb";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";

import { transferAdminEPinsBulk } from "@src/actions/adminEPinActions";
import { hasPermission } from "@src/utils/permissions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const EPinBulkTransfer = ({ loggedInAdmin, transferAdminEPinsBulk }) => {
  const navigate = useNavigate();
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [count, setCount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState(null);

  const handleFromMemberIdChange = createMemberIdChangeHandler(
    (e) => setFromMemberId(e.target.value),
    "fromMemberId",
  );
  const handleFromMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setFromMemberId(formatted),
  );
  const handleFromMemberIdKeyDown = createMemberIdKeyDownHandler(
    fromMemberId,
    (e) => setFromMemberId(e.target.value),
    "fromMemberId",
  );

  const handleToMemberIdChange = createMemberIdChangeHandler(
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );
  const handleToMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setToMemberId(formatted),
  );
  const handleToMemberIdKeyDown = createMemberIdKeyDownHandler(
    toMemberId,
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!fromMemberId || !fromMemberId.trim()) {
      setError("From Member ID is required");
      return;
    }
    if (!toMemberId || !toMemberId.trim()) {
      setError("To Member ID is required");
      return;
    }
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1) {
      setError("Count must be a positive number");
      return;
    }
    setTransferring(true);
    try {
      await transferAdminEPinsBulk(
        fromMemberId.trim().toUpperCase(),
        toMemberId.trim().toUpperCase(),
        countNum,
      );
      navigate("/admin/epins");
    } catch (err) {
      setError(err.message || "Bulk transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  if (!hasPermission(loggedInAdmin, "epins", "edit")) {
    navigate("/admin/epins");
    return null;
  }

  return (
    <Container className="epin-form-page">
      <AppBreadCrumb
        pageTitle="Bulk Transfer E-PINs"
        crumbs={[
          { name: "E-PINs", path: "/admin/epins" },
          { name: "Bulk Transfer" },
        ]}
      />

      <MainCard>
        <div className="epin-form-card">
          <div className="epin-form-card-header">
            <div className="epin-form-card-icon">
              <TbTransfer size={24} />
            </div>
            <h2 className="epin-form-card-title">Bulk Transfer E-PINs</h2>
          </div>
          <div className="epin-form-card-body">
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={4}>
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
                      placeholder="G123456789"
                      maxLength={10}
                      isInvalid={!!error}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
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
                      placeholder="G123456789"
                      maxLength={10}
                      isInvalid={!!error}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Count *</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      max={10000}
                      placeholder="Count"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      isInvalid={!!error}
                    />
                    <Form.Control.Feedback type="invalid">
                      {error}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex gap-2 mt-3">
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate("/admin/epins")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={transferring} variant="success" className="d-inline-flex align-items-center gap-2">
                  {transferring ? "Transferring..." : (
                    <>
                      <TbTransfer size={18} />
                      Transfer
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </MainCard>
    </Container>
  );
};

EPinBulkTransfer.propTypes = {
  transferAdminEPinsBulk: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  loggedInAdmin: state.adminAuth?.admin,
});

export default connect(mapStateToProps, { transferAdminEPinsBulk })(
  EPinBulkTransfer,
);
