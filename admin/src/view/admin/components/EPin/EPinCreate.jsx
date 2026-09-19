import React, { useState } from "react";
import { Container, Form, Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { TbCreditCard } from "react-icons/tb";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";

import { createAdminEPins } from "@src/actions/adminEPinActions";
import { hasPermission } from "@src/utils/permissions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const EPinCreate = ({ loggedInAdmin, createAdminEPins }) => {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [count, setCount] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!memberId || !memberId.trim()) {
      setError("Member ID is required");
      return;
    }
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      setError("Count must be between 1 and 100");
      return;
    }
    setCreating(true);
    try {
      await createAdminEPins(memberId.trim().toUpperCase(), countNum);
      navigate("/admin/epins");
    } catch (err) {
      setError(err.message || "Failed to create E-PINs");
    } finally {
      setCreating(false);
    }
  };

  if (!hasPermission(loggedInAdmin, "epins", "create")) {
    navigate("/admin/epins");
    return null;
  }

  return (
    <Container className="epin-form-page">
      <AppBreadCrumb
        pageTitle="Create E-PINs"
        crumbs={[
          { name: "E-PINs", path: "/admin/epins" },
          { name: "Create E-PINs" },
        ]}
      />

      <MainCard>
        <div className="epin-form-card">
          <div className="epin-form-card-header">
            <div className="epin-form-card-icon">
              <TbCreditCard size={24} />
            </div>
            <h2 className="epin-form-card-title">Create E-PINs</h2>
          </div>
          <div className="epin-form-card-body">
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label htmlFor="memberId">Member ID *</Form.Label>
                    <Form.Control
                      required
                      type="text"
                      id="memberId"
                      name="memberId"
                      value={memberId}
                      onChange={handleMemberIdChange}
                      onPaste={handleMemberIdPaste}
                      onKeyDown={handleMemberIdKeyDown}
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
                      max={100}
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
                <Button type="submit" disabled={creating} className="d-inline-flex align-items-center gap-2">
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </MainCard>
    </Container>
  );
};

EPinCreate.propTypes = {
  createAdminEPins: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  loggedInAdmin: state.adminAuth?.admin,
});

const ConnectedEPinCreate = connect(mapStateToProps, { createAdminEPins })(EPinCreate);
export default ConnectedEPinCreate;
