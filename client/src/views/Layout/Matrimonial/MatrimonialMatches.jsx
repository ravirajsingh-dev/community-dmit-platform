import React, { useEffect, useState } from "react";
import { Container, Card, Row, Col, Button, Badge } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaArrowLeft, FaUser } from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordFound from "@src/views/Common/NotFound/NoRecordFound";
import { getMatrimonialMatches } from "@src/actions/matrimonialActions";

const MatrimonialMatches = ({
  matches,
  matchesPagination,
  loadingMatches,
  getMatrimonialMatches,
}) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    getMatrimonialMatches({ page, limit });
  }, [getMatrimonialMatches, page, limit]);

  const total = matchesPagination?.total ?? 0;
  const pages = matchesPagination?.pages ?? 0;
  const hasMore = page < pages;

  const details = (ud) => {
    if (!ud) return {};
    const d = typeof ud === "object" ? ud : {};
    return {
      fatherName: d.fatherName ?? "-",
      motherName: d.motherName ?? "-",
      education: d.education ?? "-",
      occupation: d.occupation ?? "-",
      maritalStatus: d.maritalStatus ?? "-",
      gender: d.gender ?? "-",
      dob: d.dob,
    };
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FaHeart className="me-2" />
          Matrimonial Matches
        </h2>
        <Button
          variant="outline-secondary"
          onClick={() => window.history.back()}
        >
          <FaArrowLeft className="me-2" />
          Back
        </Button>
      </div>

      <p className="text-muted mb-4">
        Default: your community; if none found, all active profiles are shown.
        You can also use the full filters on the List page.
      </p>

      {loadingMatches && matches.length === 0 ? (
        <BouncingLoader minHeight="400px" />
      ) : matches.length === 0 ? (
        <NoRecordFound message="No matches found in your community yet." />
      ) : (
        <>
          <Row>
            {matches.map((m) => {
              const user = m.userId || m.user;
              const ud = m.userDetailsId || m.userDetails;
              const d = details(ud);
              const name = user?.name ?? "-";
              const memberId = user?.memberId ?? "-";
              const age = d.dob
                ? Math.floor(
                    (new Date() - new Date(d.dob)) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : null;
              return (
                <Col key={m._id} md={6} lg={4} className="mb-4">
                  <MainCard>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="mb-0">{name}</h5>
                        {age != null && <Badge bg="secondary">{age} yrs</Badge>}
                      </div>
                      <p className="text-muted small mb-1">
                        Member ID: {memberId}
                      </p>
                      <p className="small mb-1">
                        <strong>Father:</strong> {d.fatherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Mother:</strong> {d.motherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Education:</strong> {d.education}
                      </p>
                      <p className="small mb-1">
                        <strong>Occupation:</strong> {d.occupation}
                      </p>
                      <p className="small mb-3">
                        <strong>Marital:</strong> {d.maritalStatus}
                      </p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          navigate(`/user/matrimonial/profile/${m._id}`)
                        }
                      >
                        <FaUser className="me-2" />
                        View full profile
                      </Button>
                    </Card.Body>
                  </MainCard>
                </Col>
              );
            })}
          </Row>
          {pages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Page {page} of {pages} ({total} total)
              </span>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="ms-2"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

MatrimonialMatches.propTypes = {
  matches: PropTypes.array,
  matchesPagination: PropTypes.object,
  loadingMatches: PropTypes.bool,
  getMatrimonialMatches: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  matches: state.matrimonial?.matches ?? [],
  matchesPagination: state.matrimonial?.matchesPagination ?? {},
  loadingMatches: state.matrimonial?.loadingMatches ?? false,
});

export default connect(mapStateToProps, {
  getMatrimonialMatches,
})(MatrimonialMatches);
