import React, { useState } from "react";
import { Container, Form, Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { TbTrash } from "react-icons/tb";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";

import { deleteAdminEPinsBulk } from "@src/actions/adminEPinActions";
import { hasPermission } from "@src/utils/permissions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const EPinBulkDelete = ({ loggedInAdmin, deleteAdminEPinsBulk }) => {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [count, setCount] = useState("");
  const [deleting, setDeleting] = useState(false);
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
    if (isNaN(countNum) || countNum < 1) {
      setError("Count must be a positive number");
      return;
    }
    setDeleting(true);
    try {
      await deleteAdminEPinsBulk(memberId.trim().toUpperCase(), countNum);
      navigate("/admin/epins");
    } catch (err) {
      setError(err.message || "Failed to delete E-PINs");
    } finally {
      setDeleting(false);
    }
  };

  if (!hasPermission(loggedInAdmin, "epins", "delete")) {
    navigate("/admin/epins");
    return null;
  }

  return (
    <Container className="epin-form-page">
      <AppBreadCrumb
        pageTitle="Bulk Delete E-PINs"
        crumbs={[
          { name: "E-PINs", path: "/admin/epins" },
          { name: "Bulk Delete" },
        ]}
      />

      <MainCard>
        <div className="epin-form-card epin-form-card--danger">
          <div className="epin-form-card-header">
            <div className="epin-form-card-icon">
              <TbTrash size={24} />
            </div>
            <h2 className="epin-form-card-title">Bulk Delete Unused E-PINs</h2>
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
                <Button variant="danger" type="submit" disabled={deleting} className="d-inline-flex align-items-center gap-2">
                  {deleting ? "Deleting..." : (
                    <>
                      <TbTrash size={18} />
                      Delete
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

EPinBulkDelete.propTypes = {
  deleteAdminEPinsBulk: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  loggedInAdmin: state.adminAuth?.admin,
});

export default connect(mapStateToProps, { deleteAdminEPinsBulk })(
  EPinBulkDelete,
);
