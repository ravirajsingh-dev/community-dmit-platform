import React, { useEffect } from "react";
import { Container, Card, Row, Col, Button, Badge } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHeart } from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordFound from "@src/views/Common/NotFound/NoRecordFound";
import { getMatrimonialProfileById } from "@src/actions/matrimonialActions";

const formatDob = (dob) => {
  if (!dob) return "-";
  const d = new Date(dob);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((new Date() - d) / (365.25 * 24 * 60 * 60 * 1000));
};

const MatrimonialProfileView = ({
  profile,
  loadingProfile,
  getMatrimonialProfileById,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) getMatrimonialProfileById(id);
  }, [id, getMatrimonialProfileById]);

  if (loadingProfile && !profile) {
    return <BouncingLoader minHeight="400px" />;
  }

  if (!profile && !loadingProfile) {
    return (
      <Container className="py-4">
        <NoRecordFound message="Profile not found or not available." />
        <Button
          variant="outline-secondary"
          onClick={() => navigate("/user/matrimonial/list")}
        >
          <FaArrowLeft className="me-2" />
          Back to list
        </Button>
      </Container>
    );
  }

  const user = profile.user || {};
  const ud = profile.userDetails || {};
  const community = profile.community || ud.community || {};
  const name = user.name ?? "-";
  const phone = user.phone ?? "-";
  const memberId = user.memberId ?? "-";
  const age = ageFromDob(ud.dob);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FaHeart className="me-2" />
          Matrimonial Profile
        </h2>
        <Button
          variant="outline-secondary"
          onClick={() => navigate("/user/matrimonial/list")}
        >
          <FaArrowLeft className="me-2" />
          Back to list
        </Button>
      </div>

      <MainCard>
        <Card.Body>
          <Row>
            <Col md={12} className="mb-3">
              <div className="d-flex justify-content-between align-items-start flex-wrap">
                <h4 className="mb-2">{name}</h4>
                {age != null && <Badge bg="secondary">{age} years</Badge>}
              </div>
              <p className="text-muted mb-0">Member ID: {memberId}</p>
            </Col>
          </Row>
          <hr />
          <Row>
            <Col md={6} lg={4} className="mb-2">
              <strong>Phone</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {phone}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Date of birth</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {formatDob(ud.dob)}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Gender</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.gender ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Father&apos;s name</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.fatherName ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Mother&apos;s name</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.motherName ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Height (cm)</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.height ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Weight (kg)</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.weight ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Address</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.address ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Community</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {community.name ?? ud.community?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Vansh</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.vansh?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Kul</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.kul?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Khamp</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.khamp?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Gotra</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.gotra?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Marital status</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.maritalStatus ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Education</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.education ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Occupation</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.occupation ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Country</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.countryId?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>State</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.stateId?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>District</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.districtId?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>Village</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.villageId?.name ?? "-"}
            </Col>
            <Col md={6} lg={4} className="mb-2">
              <strong>WhatsApp contact</strong>
            </Col>
            <Col md={6} lg={8} className="mb-2">
              {ud.whatsappContact ?? "-"}
            </Col>
          </Row>
        </Card.Body>
      </MainCard>
    </Container>
  );
};

MatrimonialProfileView.propTypes = {
  profile: PropTypes.object,
  loadingProfile: PropTypes.bool,
  getMatrimonialProfileById: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  profile: state.matrimonial?.profile ?? null,
  loadingProfile: state.matrimonial?.loadingProfile ?? false,
});

export default connect(mapStateToProps, {
  getMatrimonialProfileById,
})(MatrimonialProfileView);
