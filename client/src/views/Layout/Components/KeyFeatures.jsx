import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { getCommonSettings } from "@src/actions/commonActions";
import { getDonationSettings } from "@src/actions/donationActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

/**
 * Our Key Features – light background section, admin-managed (ref: "Our Key Features").
 */
const KeyFeatures = ({
  common: { commonSettings, loadingCommonSettings },
  donationSettings,
  getCommonSettings,
  getDonationSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.homepage?.keyFeatures) {
      getCommonSettings();
    }
    getDonationSettings();
  }, [getCommonSettings, getDonationSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <section className="key-features-section">
        <Container>
          <div className="key-features-loading">
            <BouncingLoader minHeight="280px" />
          </div>
        </Container>
      </section>
    );
  }

  const keyFeatures = commonSettings?.homepage?.keyFeatures || {};
  if (!keyFeatures.enabled) return null;

  const title = keyFeatures.title || "Our Key Features";
  const description =
    keyFeatures.description ||
    "Explore the advanced tools and insights designed to enhance your cognitive performance.";
  const items = Array.isArray(keyFeatures.items) ? keyFeatures.items : [];

  return (
    <section className="key-features-section">
      <Container>
        {donationSettings?.donationEnabled && (
          <div className="key-features-donate-wrap">
            <Link to="/donate" className="key-features-donate-button">
              Donate Now
            </Link>
          </div>
        )}
        <div className="key-features-header">
          <span className="key-features-tag">What We Offer</span>
          <h2 className="key-features-title">{title}</h2>
          <p className="key-features-description">{description}</p>
        </div>
        {items.length > 0 ? (
          <Row className="key-features-row">
            {items.map((item, index) => (
              <Col
                key={index}
                xs={12}
                md={6}
                lg={items.length >= 3 ? 4 : 6}
                className="key-features-col"
              >
                <div className="key-features-card">
                  <span className="key-features-card-num">{String(index + 1).padStart(2, "0")}</span>
                  <h4 className="key-features-card-title">{item.title}</h4>
                  {item.description && (
                    <p className="key-features-card-desc">{item.description}</p>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="key-features-empty" />
        )}
      </Container>
    </section>
  );
};

KeyFeatures.propTypes = {
  common: PropTypes.shape({
    commonSettings: PropTypes.object,
    loadingCommonSettings: PropTypes.bool,
  }).isRequired,
  donationSettings: PropTypes.shape({
    donationEnabled: PropTypes.bool,
  }),
  getCommonSettings: PropTypes.func.isRequired,
  getDonationSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
  donationSettings: state.donation?.donationSettings,
});

export default connect(mapStateToProps, {
  getCommonSettings,
  getDonationSettings,
})(KeyFeatures);
