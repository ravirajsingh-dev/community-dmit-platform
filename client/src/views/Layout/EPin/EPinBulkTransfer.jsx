import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { TbTransfer } from "react-icons/tb";
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import { fetchUserEPins, transferEPinsBulk } from "@src/actions/epinActions";
import {
  isValidMemberIdFormat,
  createMemberIdChangeHandler,
  createMemberIdPasteHandler,
  createMemberIdKeyDownHandler,
} from "@src/utils/memberIdFormatter";

const EPinBulkTransfer = ({ fetchUserEPins, transferEPinsBulk }) => {
  const navigate = useNavigate();
  const [toMemberId, setToMemberId] = useState("");
  const [count, setCount] = useState("");
  const [unusedCount, setUnusedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchUserEPins({
          page: 1,
          limit: 1,
          status: "unused",
        });
        setUnusedCount(result.unusedCount || 0);
      } catch (err) {
        setUnusedCount(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchUserEPins]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!toMemberId || !isValidMemberIdFormat(toMemberId.trim())) {
      setError("Please enter a valid Member ID (e.g. G123456789)");
      return;
    }
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1) {
      setError("Count must be a positive number");
      return;
    }
    if (countNum > unusedCount) {
      setError(`Count cannot exceed available unused E-PINs (${unusedCount})`);
      return;
    }
    setTransferring(true);
    try {
      await transferEPinsBulk(toMemberId.trim().toUpperCase(), countNum);
      navigate("/user/epins");
    } catch (err) {
      setError(err.message || "Bulk transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const handleMemberIdChange = createMemberIdChangeHandler(
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );
  const handleMemberIdPaste = createMemberIdPasteHandler((formatted) =>
    setToMemberId(formatted),
  );
  const handleMemberIdKeyDown = createMemberIdKeyDownHandler(
    toMemberId,
    (e) => setToMemberId(e.target.value),
    "toMemberId",
  );

  return (
    <Container className="py-4 epin-bulk-transfer-page">
      <AppBreadCrumb
        title="Bulk Transfer E-PINs"
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "E-PINs", link: "/user/epins" },
          { label: "Bulk Transfer" },
        ]}
      />
      <MainCard>
        <div className="epin-transfer-card">
          <div className="epin-transfer-card-header">
            <div className="epin-transfer-card-icon">
              <TbTransfer size={24} />
            </div>
            <h2 className="epin-transfer-card-title">Bulk Transfer E-PINs</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : (
              <>
                <div className="epin-available-badge">
                  Available unused E-PINs: <strong>{unusedCount}</strong>
                </div>
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>To Member ID *</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="G123456789"
                          value={toMemberId}
                          onChange={handleMemberIdChange}
                          onPaste={handleMemberIdPaste}
                          onKeyDown={handleMemberIdKeyDown}
                          maxLength={10}
                          isInvalid={!!error}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Count *</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={unusedCount}
                          placeholder={`Max: ${unusedCount}`}
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
                      type="button"
                      variant="outline-secondary"
                      onClick={() => navigate("/user/epins")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      disabled={transferring || unusedCount < 1}
                      className="d-inline-flex align-items-center gap-2"
                    >
                      {transferring ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <TbTransfer size={18} />
                          Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </div>
        </div>
      </MainCard>
    </Container>
  );
};

EPinBulkTransfer.propTypes = {
  fetchUserEPins: PropTypes.func.isRequired,
  transferEPinsBulk: PropTypes.func.isRequired,
};

const ConnectedEPinBulkTransfer = connect(null, {
  fetchUserEPins,
  transferEPinsBulk,
})(EPinBulkTransfer);
export default ConnectedEPinBulkTransfer;
