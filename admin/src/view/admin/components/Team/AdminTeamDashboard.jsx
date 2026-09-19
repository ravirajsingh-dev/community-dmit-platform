import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import { resolveUserByMemberId } from "@src/actions/adminTeamActions";
import {
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
  isValidMemberIdFormat,
} from "@src/utils/memberIdFormatter";

const AdminTeamDashboard = () => {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [resolvedUser, setResolvedUser] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleSearch = async (e) => {
    e?.preventDefault();
    const id = String(memberId).trim();
    if (!id || !isValidMemberIdFormat(id)) {
      setError("Please provide a valid Member ID (G followed by 9 digits).");
      return;
    }
    setLoading(true);
    setError(null);
    setResolvedUser(null);
    try {
      const user = await resolveUserByMemberId(id);
      setResolvedUser(user);
    } catch (err) {
      setError(err.message || "Member not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Team Explorer"
        crumbs={[
          { name: "Team", path: "/admin/team" },
          { name: "Dashboard" },
        ]}
      />

      <MainCard>
        <h5 className="mb-4">Admin Team Dashboard</h5>
        <p className="text-muted small mb-3">
          Search by Member ID to view a user&apos;s team hierarchy.
        </p>

        <Form onSubmit={handleSearch} className="mb-4">
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label htmlFor="memberId">Member ID</Form.Label>
                <Form.Control
                  type="text"
                  id="memberId"
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
            <Col md={2} className="d-flex align-items-end pb-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </Col>
          </Row>
        </Form>

        {error && <div className="text-danger mb-3">{error}</div>}

        {resolvedUser && (
          <Card className="mb-3">
            <Card.Body>
              <Row>
                <Col>
                  <h6>{resolvedUser.name}</h6>
                  <span className="text-muted">{resolvedUser.memberId}</span>
                  <span className="ms-2">
                    {resolvedUser.status === 1 ? (
                      <Badge bg="success">Active</Badge>
                    ) : (
                      <Badge bg="secondary">Inactive</Badge>
                    )}
                  </span>
                </Col>
                <Col>
                  <strong>Direct:</strong> {resolvedUser.directCount ?? 0}
                </Col>
                <Col>
                  <strong>Total:</strong> {resolvedUser.totalDownlineCount ?? 0}
                </Col>
                <Col>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/team/direct/${resolvedUser.userId}`)
                    }
                  >
                    Direct Team
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    className="ms-2"
                    onClick={() =>
                      navigate(`/admin/team/all/${resolvedUser.userId}`)
                    }
                  >
                    Full Team
                  </Button>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="ms-2"
                    onClick={() =>
                      navigate(`/admin/team/structure/${resolvedUser.userId}`)
                    }
                  >
                    Structure
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </MainCard>
    </Container>
  );
};

export default AdminTeamDashboard;
