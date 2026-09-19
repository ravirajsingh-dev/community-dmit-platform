import React, { useEffect } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

/**
 * SBI Pro Hero – "Unlock Your Brain's Full Potential"
 * Dark executive theme, neural background, brain graphic, admin-managed copy.
 */
const HeroSection = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.homepage?.hero) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <section className="sbi-hero-section">
        <div className="sbi-hero-background" />
        <Container>
          <div className="sbi-hero-loading">
            <BouncingLoader />
          </div>
        </Container>
      </section>
    );
  }

  const hero = commonSettings?.homepage?.hero || {};
  const heroBrainUrl = commonSettings?.heroBrainUrl || "";
  const title = hero.title || "Unlock Your Brain's Full Potential";
  const subheading =
    hero.subheading ||
    "Advanced Intelligence Analysis for Optimal Mental Performance.";
  const ctaPrimaryText = hero.ctaPrimaryText || "Get Started";
  const ctaPrimaryLink = hero.ctaPrimaryLink || "/login";
  const ctaSecondaryText = hero.ctaSecondaryText || "Learn More";
  const ctaSecondaryLink = hero.ctaSecondaryLink || "/about-us";

  return (
    <section className="sbi-hero-section" aria-label="Hero">
      <div className="sbi-hero-background" aria-hidden="true">
        <div className="sbi-hero-network" />
        <div className="sbi-hero-glow-dots" />
      </div>

      <Container className="sbi-hero-container" fluid>
        <div className="sbi-hero-inner">
          <Row className="align-items-center g-4 g-lg-5">
            <Col lg={6} xl={5} className="sbi-hero-content-col">
              <p className="sbi-hero-badge">
                Smart Brain Intelligence Pro Analysis
              </p>
              <h1 className="sbi-hero-title">{title}</h1>
              <p className="sbi-hero-subheading">{subheading}</p>
              <div className="sbi-hero-ctas">
                <Button
                  as={Link}
                  to={ctaPrimaryLink}
                  variant="primary"
                  className="sbi-hero-btn-primary"
                >
                  {ctaPrimaryText}
                </Button>
                <Button
                  as={Link}
                  to={ctaSecondaryLink}
                  variant="outline-light"
                  className="sbi-hero-btn-secondary"
                >
                  {ctaSecondaryText}
                </Button>
              </div>
            </Col>
            <Col lg={6} xl={7} className="sbi-hero-graphic-col">
              <div className="sbi-hero-brain-wrap">
                {heroBrainUrl && (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={heroBrainUrl}
                    alt="Brain intelligence graphic"
                    className="sbi-hero-brain-img"
                  />
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Container>
    </section>
  );
};

HeroSection.propTypes = {
  common: PropTypes.shape({
    commonSettings: PropTypes.object,
    loadingCommonSettings: PropTypes.bool,
  }).isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(HeroSection);
