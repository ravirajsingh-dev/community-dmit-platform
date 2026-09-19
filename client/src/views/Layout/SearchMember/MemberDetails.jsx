import React, { useEffect } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

// Icons
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaIdBadge,
  FaHome,
  FaMapMarkerAlt,
  FaCity,
  FaGlobe,
  FaUsers,
  FaSitemap,
  FaMapMarkedAlt,
  FaUserFriends,
  FaWhatsapp,
} from "react-icons/fa";
import { BsCalendar3, BsDroplet } from "react-icons/bs";
import {
  BiUser,
  BiMaleFemale,
  BiBriefcase,
  BiBook,
  BiHeart,
} from "react-icons/bi";
import { MdFamilyRestroom } from "react-icons/md";

// Custom Imports
import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";
import {
  getMemberDetailsById,
  resetMemberDetails,
} from "@src/actions/searchMemberActions";
import { EducationOptions } from "@src/constants/educationConstants";

const MemberDetails = ({
  memberDetails,
  loadingMemberDetails,
  memberDetailsError,
  getMemberDetailsById,
  resetMemberDetails,
}) => {
  const { user_id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (user_id) {
      getMemberDetailsById(user_id);
    }
    return () => {
      resetMemberDetails();
    };
  }, [user_id, getMemberDetailsById, resetMemberDetails]);

  if (loadingMemberDetails) {
    return (
      <Container className="member-details-container">
        <AppBreadCrumb
          title="Member Details"
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Search Member", link: "/user/search-member" },
            { label: "Member Details" },
          ]}
        />
        <div
          className="member-details-loading d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    );
  }

  if (memberDetailsError || !memberDetails) {
    return (
      <Container className="member-details-container">
        <AppBreadCrumb
          title="Member Details"
          breadcrumbs={[
            { label: "Dashboard", link: "/user/dashboard" },
            { label: "Search Member", link: "/user/search-member" },
            { label: "Member Details" },
          ]}
        />
        <MainCard>
          <div className="alert alert-danger" role="alert">
            <h5>Error Loading Member Details</h5>
            <p>{memberDetailsError || "Member not found"}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/user/search-member")}
            >
              Back to Search
            </button>
          </div>
        </MainCard>
      </Container>
    );
  }

  const ud = memberDetails.userDetails || {};

  return (
    <Container className="member-details-container">
      <AppBreadCrumb
        title="Member Details"
        breadcrumbs={[
          { label: "Dashboard", link: "/user/dashboard" },
          { label: "Search Member", link: "/user/search-member" },
          { label: "Member Details" },
        ]}
      />

      <MainCard>
        {/* Header */}
        <div className="member-details-header mb-4">
          <h3 className="member-details-title custom-heading-theam">
            Member Details
          </h3>
        </div>

        {/* Basic Info Section */}
        <Card className="profile-card mb-4">
          <Card.Header className="profile-card-header">
            <h5 className="profile-card-title">Basic Information</h5>
          </Card.Header>
          <Card.Body className="profile-card-body">
            <Row className="g-3">
              <Col xs={12} md={6}>
                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <FaUser size={18} className="profile-form-label-icon" />
                    Name
                  </div>
                  <div className="profile-detail-value">
                    {memberDetails.name || "-"}
                  </div>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <FaIdBadge size={18} className="profile-form-label-icon" />
                    Member ID
                  </div>
                  <div className="profile-detail-value">
                    {memberDetails.memberId || "-"}
                  </div>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <FaPhoneAlt size={18} className="profile-form-label-icon" />
                    Phone Number
                  </div>
                  <div className="profile-detail-value">
                    {memberDetails.phone || "-"}
                  </div>
                </div>
              </Col>

              {ud.alternatePhone && (
                <Col xs={12} md={6}>
                  <div className="profile-detail-item">
                    <div className="profile-detail-label">
                      <FaPhoneAlt
                        size={18}
                        className="profile-form-label-icon"
                      />
                      Alternate Phone
                    </div>
                    <div className="profile-detail-value">
                      {ud.alternatePhone}
                    </div>
                  </div>
                </Col>
              )}

              <Col xs={12} md={6}>
                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <FaEnvelope size={18} className="profile-form-label-icon" />
                    Email
                  </div>
                  <div className="profile-detail-value">
                    {memberDetails.email || "-"}
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Community Details Section */}
        {(ud.community || ud.vansh || ud.kul || ud.khamp || ud.gotra) && (
          <Card className="profile-card mb-4">
            <Card.Header className="profile-card-header">
              <h5 className="profile-card-title">Community Details</h5>
            </Card.Header>
            <Card.Body className="profile-card-body">
              <Row className="g-3">
                {ud.communityLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaUsers
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Community
                      </div>
                      <div className="profile-detail-value">
                        {ud.communityLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.vanshLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <MdFamilyRestroom
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Vansh
                      </div>
                      <div className="profile-detail-value">
                        {ud.vanshLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.kulLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BiUser size={18} className="profile-form-label-icon" />
                        Kul
                      </div>
                      <div className="profile-detail-value">{ud.kulLabel}</div>
                    </div>
                  </Col>
                )}

                {ud.khampLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaSitemap
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Khamp
                      </div>
                      <div className="profile-detail-value">
                        {ud.khampLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.gotraLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaSitemap
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Gotra
                      </div>
                      <div className="profile-detail-value">
                        {ud.gotraLabel}
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Location Details Section */}
        {(ud.countryLabel ||
          ud.stateLabel ||
          ud.districtLabel ||
          ud.villageLabel ||
          ud.address) && (
          <Card className="profile-card mb-4">
            <Card.Header className="profile-card-header">
              <h5 className="profile-card-title">Address Details</h5>
            </Card.Header>
            <Card.Body className="profile-card-body">
              <Row className="g-3">
                {ud.countryLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaGlobe
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Country
                      </div>
                      <div className="profile-detail-value">
                        {ud.countryLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.stateLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaMapMarkerAlt
                          size={18}
                          className="profile-form-label-icon"
                        />
                        State
                      </div>
                      <div className="profile-detail-value">
                        {ud.stateLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.districtLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaCity size={18} className="profile-form-label-icon" />
                        District
                      </div>
                      <div className="profile-detail-value">
                        {ud.districtLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.villageLabel && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaHome size={18} className="profile-form-label-icon" />
                        Native Village
                      </div>
                      <div className="profile-detail-value">
                        {ud.villageLabel}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.address && (
                  <Col xs={12}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaMapMarkedAlt
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Current Address
                      </div>
                      <div className="profile-detail-value">{ud.address}</div>
                    </div>
                  </Col>
                )}

                {ud.whatsappContact && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaWhatsapp
                          size={18}
                          className="profile-form-label-icon"
                        />
                        WhatsApp Contact
                      </div>
                      <div className="profile-detail-value">
                        {ud.whatsappContact}
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Other Details Section */}
        {(ud.dob ||
          ud.gender ||
          ud.fatherName ||
          ud.motherName ||
          ud.height != null ||
          ud.weight != null ||
          ud.maritalStatus ||
          ud.education ||
          ud.occupation ||
          ud.bloodGroup) && (
          <Card className="profile-card mb-4">
            <Card.Header className="profile-card-header">
              <h5 className="profile-card-title">Other Details</h5>
            </Card.Header>
            <Card.Body className="profile-card-body">
              <Row className="g-3">
                {ud.dob && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BsCalendar3
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Date of Birth
                      </div>
                      <div className="profile-detail-value">
                        {new Date(ud.dob).toLocaleDateString()}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.gender && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BiMaleFemale
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Gender
                      </div>
                      <div className="profile-detail-value">
                        {ud.gender.charAt(0).toUpperCase() + ud.gender.slice(1)}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.fatherName && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaUserFriends
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Father's Name
                      </div>
                      <div className="profile-detail-value">
                        {ud.fatherName}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.motherName && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <FaUserFriends
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Mother's Name
                      </div>
                      <div className="profile-detail-value">
                        {ud.motherName}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.height != null && ud.height !== "" && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Height (cm)</div>
                      <div className="profile-detail-value">{ud.height}</div>
                    </div>
                  </Col>
                )}

                {ud.weight != null && ud.weight !== "" && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Weight (kg)</div>
                      <div className="profile-detail-value">{ud.weight}</div>
                    </div>
                  </Col>
                )}

                {ud.maritalStatus && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BiHeart
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Marital Status
                      </div>
                      <div className="profile-detail-value">
                        {ud.maritalStatus.charAt(0).toUpperCase() +
                          ud.maritalStatus.slice(1)}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.education && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BiBook size={18} className="profile-form-label-icon" />
                        Education
                      </div>
                      <div className="profile-detail-value">
                        {EducationOptions.find((o) => o.value === ud.education)
                          ?.label ?? ud.education}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.occupation && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BiBriefcase
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Occupation
                      </div>
                      <div className="profile-detail-value">
                        {ud.occupation}
                      </div>
                    </div>
                  </Col>
                )}

                {ud.bloodGroup && (
                  <Col xs={12} md={6}>
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">
                        <BsDroplet
                          size={18}
                          className="profile-form-label-icon"
                        />
                        Blood Group
                      </div>
                      <div className="profile-detail-value">
                        {ud.bloodGroup}
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        )}
      </MainCard>
    </Container>
  );
};

MemberDetails.propTypes = {
  memberDetails: PropTypes.object,
  loadingMemberDetails: PropTypes.bool,
  memberDetailsError: PropTypes.string,
  getMemberDetailsById: PropTypes.func.isRequired,
  resetMemberDetails: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  memberDetails: state.searchMember.memberDetails,
  loadingMemberDetails: state.searchMember.loadingMemberDetails,
  memberDetailsError: state.searchMember.memberDetailsError,
});

export default connect(mapStateToProps, {
  getMemberDetailsById,
  resetMemberDetails,
})(MemberDetails);
