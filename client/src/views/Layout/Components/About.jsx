import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

const About = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    // Fetch settings if not already loaded
    if (!commonSettings?.aboutUs) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  // Show loading state
  if (loadingCommonSettings) {
    return (
      <section className="about-content-section">
        <Container>
          <BouncingLoader minHeight="400px" />
        </Container>
      </section>
    );
  }

  const aboutUs = commonSettings?.aboutUs || {};
  const hasMission = aboutUs.mission && aboutUs.mission.trim().length > 0;
  const hasVision = aboutUs.vision && aboutUs.vision.trim().length > 0;
  const hasDescription = aboutUs.description && aboutUs.description.trim().length > 0;
  const hasTitle = aboutUs.title && aboutUs.title.trim().length > 0;

  // If no mission or vision content, don't render the section
  if (!hasMission && !hasVision) {
    return null;
  }

  return (
    <section className="about-content-section">
      <Container>
        {/* HEADER */}
        <div className="about-content-header">
          {hasTitle ? (
            <>
              <span className="about-content-tag">ABOUT {commonSettings?.abbreviation || "US"}</span>
              <h2 className="about-content-title">
                {aboutUs.title}
              </h2>
            </>
          ) : (
            <>
              <span className="about-content-tag">ABOUT {commonSettings?.abbreviation || "US"}</span>
              <h2 className="about-content-title">
                Our Mission & Vision
                <br />
                <span>to Unite Communities</span>
              </h2>
            </>
          )}

          {hasDescription && (
            <div
              className="about-content-intro"
              dangerouslySetInnerHTML={{
                __html: aboutUs.description.replace(/\n/g, "<br />"),
              }}
            />
          )}
        </div>

        {/* MISSION + VISION (ALWAYS ONE ROW) */}
        <Row className="about-content-row">
          {hasMission && (
            <Col xs={12} md={hasVision ? 6 : 12}>
              <div className="about-content-block">
                <h3>Our Mission</h3>
                <div
                  className="about-content-text"
                  dangerouslySetInnerHTML={{
                    __html: aboutUs.mission.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            </Col>
          )}

          {hasVision && (
            <Col xs={12} md={hasMission ? 6 : 12}>
              <div
                className={`about-content-block ${
                  hasMission ? "about-content-block-right" : ""
                }`}
              >
                <h3>Our Vision</h3>
                <div
                  className="about-content-text"
                  dangerouslySetInnerHTML={{
                    __html: aboutUs.vision.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            </Col>
          )}
        </Row>
      </Container>
    </section>
  );
};

About.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(About);
