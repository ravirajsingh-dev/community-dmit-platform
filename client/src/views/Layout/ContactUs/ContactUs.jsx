import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";

const ContactUs = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    // Fetch settings if not already loaded
    if (!commonSettings?.contactUsPage) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <div className="contact-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const contactUsPage = commonSettings?.contactUsPage || {};
  const socialMedia = commonSettings?.socialMedia || {};

  // Use contactUsPage data, fallback to general settings if not available
  const phone = contactUsPage.phone || commonSettings?.contactUs || "";
  const secondaryPhone = contactUsPage.secondaryPhone || "";
  const email = contactUsPage.email || commonSettings?.email || "";
  const address = contactUsPage.address || commonSettings?.address || "";

  const hasContent = phone || email || address;

  // If no content is available, show a message
  if (!hasContent) {
    return (
      <div className="contact-us-page">
        <Container>
          <div className="contact-us-empty">
            <h2>Contact Us</h2>
            <p>Contact information is being updated. Please check back soon.</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="contact-us-page">
      <section className="contact-us-content-section">
        <Container>
          {/* HEADER */}
          <div className="contact-us-content-header">
            <h1 className="contact-us-content-title">Contact Us</h1>
            <p className="contact-us-content-subtitle">
              We'd love to hear from you. Get in touch with us using the
              information below.
            </p>
          </div>

          {/* CONTACT INFORMATION */}
          <Row className="contact-us-info-row">
            {/* Phone */}
            {phone && (
              <Col xs={12} md={6} lg={4} className="mb-4">
                <div className="contact-us-info-card">
                  <div className="contact-us-info-icon">
                    <FaPhone />
                  </div>
                  <h3>Phone</h3>
                  <div className="contact-us-info-content">
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                    {secondaryPhone && (
                      <>
                        <br />
                        <a href={`tel:${secondaryPhone.replace(/\s/g, "")}`}>
                          {secondaryPhone}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </Col>
            )}

            {/* Email */}
            {email && (
              <Col xs={12} md={6} lg={4} className="mb-4">
                <div className="contact-us-info-card">
                  <div className="contact-us-info-icon">
                    <FaEnvelope />
                  </div>
                  <h3>Email</h3>
                  <div className="contact-us-info-content">
                    <a href={`mailto:${email}`}>{email}</a>
                  </div>
                </div>
              </Col>
            )}

            {/* Address */}
            {address && (
              <Col xs={12} md={6} lg={4} className="mb-4">
                <div className="contact-us-info-card">
                  <div className="contact-us-info-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <h3>Address</h3>
                  <div
                    className="contact-us-info-content"
                    dangerouslySetInnerHTML={{
                      __html: address.replace(/\n/g, "<br />"),
                    }}
                  />
                </div>
              </Col>
            )}
          </Row>

          {/* SOCIAL MEDIA LINKS */}
          {(socialMedia.instagram ||
            socialMedia.facebook ||
            socialMedia.youtube ||
            socialMedia.zoomMeeting) && (
            <div className="contact-us-social-section">
              <h3 className="contact-us-social-title">Follow Us</h3>
              <div className="contact-us-social-links">
                <SocialIcons socialMedia={socialMedia} size="medium" />
              </div>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
};

ContactUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(ContactUs);
