import React from "react";
import PropTypes from "prop-types";
import { Card, Badge, Button } from "react-bootstrap";

/**
 * Marriages section only. Renders marriage cards with divorce action.
 * No forms; no API calls. Parent owns data and handlers.
 */
const FamilyMarriagesSection = ({
  marriages = [],
  membersById = new Map(),
  loading,
  onDivorce,
}) => {
  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <h5 className="mb-3">Marriages</h5>
        <div className="d-flex flex-wrap gap-2">
          {(marriages || []).map((mar) => {
            const s1 = membersById.get(String(mar.spouse1Id));
            const s2 = membersById.get(String(mar.spouse2Id));
            const label =
              `${s1?.firstName || "Spouse 1"} ${s1?.lastName || ""} + ${s2?.firstName || "Spouse 2"} ${s2?.lastName || ""}`
                .replace(/\s+/g, " ")
                .trim();
            const status = mar.status || "active";
            const isActive = status === "active";
            const sortedChildren = mar.sortedChildren || [];
            return (
              <Card key={mar._id} className="border" style={{ minWidth: "260px" }}>
                <Card.Body className="py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
                    <span className="small text-break">{label}</span>
                    <div className="d-flex align-items-center gap-1">
                      <Badge bg={isActive ? "success" : "secondary"}>
                        {status === "active"
                          ? "Active"
                          : status === "divorced"
                            ? "Divorced"
                            : "Widowed"}
                      </Badge>
                      {isActive && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => onDivorce(mar)}
                          disabled={loading}
                        >
                          Divorce
                        </Button>
                      )}
                    </div>
                  </div>
                  {sortedChildren.length > 0 && (
                    <div className="mt-2 pt-2 border-top small">
                      <span className="text-muted me-1">Children (order):</span>
                      {sortedChildren.map((entry, idx) => {
                        const mem = membersById.get(String(entry.memberId));
                        const name = mem
                          ? `${mem.firstName || ""} ${mem.lastName || ""}`.trim() || "Unnamed"
                          : "—";
                        return (
                          <div
                            key={entry.memberId}
                            className="d-flex align-items-center gap-1 mt-1"
                          >
                            <span className="text-nowrap">
                              {idx + 1}. {name}
                            </span>
                            {entry.order != null && (
                              <Badge bg="light" text="dark" className="small">
                                #{entry.order}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
          {(marriages || []).length === 0 && (
            <span className="text-muted small">No marriages yet.</span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

FamilyMarriagesSection.propTypes = {
  marriages: PropTypes.array,
  membersById: PropTypes.instanceOf(Map),
  loading: PropTypes.bool,
  onDivorce: PropTypes.func.isRequired,
};

export default FamilyMarriagesSection;
