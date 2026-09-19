import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

const AboutUs = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    // Fetch settings if not already loaded
    if (!commonSettings?.aboutUs) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <div className="about-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const aboutUs = commonSettings?.aboutUs || {};
  const hasContent =
    aboutUs.title || aboutUs.description || aboutUs.mission || aboutUs.vision;

  // If no content is available, show a message
  if (!hasContent) {
    return (
      <div className="about-us-page">
        <Container>
          <div className="about-us-empty">
            <h2>About Us</h2>
            <p>Content is being updated. Please check back soon.</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="about-us-page">
      <section className="about-us-content-section">
        <Container>
          {/* HEADER */}
          {aboutUs.title && (
            <div className="about-us-content-header">
              <h1 className="about-us-content-title">{aboutUs.title}</h1>
            </div>
          )}

          {/* DESCRIPTION */}
          {aboutUs.description && (
            <div className="about-us-description">
              <div
                className="about-us-description-content"
                dangerouslySetInnerHTML={{
                  __html: aboutUs.description.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          )}

          {/* MISSION + VISION */}
          {(aboutUs.mission || aboutUs.vision) && (
            <Row className="about-us-content-row">
              {aboutUs.mission && (
                <Col xs={12} md={6}>
                  <div className="about-us-content-block">
                    <h3>Our Mission</h3>
                    <div
                      className="about-us-content-text"
                      dangerouslySetInnerHTML={{
                        __html: aboutUs.mission.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </Col>
              )}

              {aboutUs.vision && (
                <Col xs={12} md={6}>
                  <div
                    className={`about-us-content-block ${
                      aboutUs.mission ? "about-us-content-block-right" : ""
                    }`}
                  >
                    <h3>Our Vision</h3>
                    <div
                      className="about-us-content-text"
                      dangerouslySetInnerHTML={{
                        __html: aboutUs.vision.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Container>
      </section>
    </div>
  );
};

AboutUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(AboutUs);
