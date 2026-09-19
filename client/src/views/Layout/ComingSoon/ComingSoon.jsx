import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

const ComingSoon = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch settings on mount to ensure we have the latest Coming Soon data
    // This is especially important when navigating directly to /coming-soon
    if (!loadingCommonSettings) {
      getCommonSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    // Check if Coming Soon page is enabled
    // Only redirect after settings are loaded and if Coming Soon is explicitly disabled
    if (
      !loadingCommonSettings &&
      commonSettings?.comingSoon !== undefined &&
      !commonSettings.comingSoon.enabled
    ) {
      // Redirect to home if Coming Soon is disabled
      navigate("/", { replace: true });
    }
  }, [commonSettings, loadingCommonSettings, navigate]);

  if (loadingCommonSettings) {
    return (
      <div className="coming-soon-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const comingSoon = commonSettings?.comingSoon || {};

  // If Coming Soon is disabled, show nothing (redirect will happen)
  if (!comingSoon.enabled) {
    return null;
  }

  const hasContent =
    comingSoon.title ||
    comingSoon.description ||
    (comingSoon.initiatives && comingSoon.initiatives.length > 0);

  // If no content is available, show a message
  if (!hasContent) {
    return (
      <div className="coming-soon-page">
        <Container>
          <div className="coming-soon-empty">
            <h2>Coming Soon</h2>
            <p>Content is being updated. Please check back soon.</p>
          </div>
        </Container>
      </div>
    );
  }

  // Sort initiatives by order if available
  const sortedInitiatives = comingSoon.initiatives
    ? [...comingSoon.initiatives].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        return orderA - orderB;
      })
    : [];

  return (
    <div className="coming-soon-page">
      <section className="coming-soon-content-section">
        <Container>
          {/* HEADER */}
          {comingSoon.title && (
            <div className="coming-soon-content-header">
              <h1 className="coming-soon-content-title">{comingSoon.title}</h1>
            </div>
          )}

          {/* DESCRIPTION */}
          {comingSoon.description && (
            <div className="coming-soon-description">
              <div
                className="coming-soon-description-content"
                dangerouslySetInnerHTML={{
                  __html: comingSoon.description.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          )}

          {/* INITIATIVES LIST */}
          {sortedInitiatives.length > 0 && (
            <div className="coming-soon-initiatives">
              <h2 className="coming-soon-initiatives-title">Future Initiatives</h2>
              <Row className="coming-soon-initiatives-row">
                {sortedInitiatives.map((initiative, index) => (
                  <Col xs={12} md={6} lg={4} key={index} className="mb-4">
                    <div className="coming-soon-initiative-card">
                      <div className="coming-soon-initiative-icon">
                        <span className="coming-soon-initiative-bullet">•</span>
                      </div>
                      <div className="coming-soon-initiative-content">
                        <h3 className="coming-soon-initiative-title">
                          {initiative.title}
                        </h3>
                        {initiative.description && (
                          <div
                            className="coming-soon-initiative-description"
                            dangerouslySetInnerHTML={{
                              __html: initiative.description.replace(/\n/g, "<br />"),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
};

ComingSoon.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(ComingSoon);
