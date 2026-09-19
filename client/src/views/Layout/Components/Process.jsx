import React, { useEffect } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getCommonSettings } from "@src/actions/commonActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import { FiZap, FiTrendingUp, FiTarget } from "react-icons/fi";

const STEP_ICONS = [FiZap, FiTrendingUp, FiTarget];

/**
 * How SBI Pro Analysis Works – admin-managed steps (replaces generic "How Our Platform Works").
 */
const Process = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.homepage?.howItWorks) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <section className="process-steps-section">
        <Container>
          <div className="process-steps-loading">
            <BouncingLoader minHeight="320px" />
          </div>
        </Container>
      </section>
    );
  }

  const howItWorks = commonSettings?.homepage?.howItWorks || {};
  if (!howItWorks.enabled) return null;

  const tag = howItWorks.tag || "SBI PRO ANALYSIS";
  const title = howItWorks.title || "How SBI Pro Analysis Works";
  let steps = Array.isArray(howItWorks.steps) ? howItWorks.steps : [];

  if (steps.length === 0) {
    steps = [
      {
        title: "Advanced Fingerprint Analysis",
        description:
          "Our certified analysts capture and process your fingerprint data using scientifically validated methods to uncover your innate potential and cognitive patterns.",
      },
      {
        title: "Personalized Intelligence Insights",
        description:
          "Receive detailed reports and actionable insights tailored to your unique profile—helping you understand strengths and areas for growth.",
      },
      {
        title: "Optimize Mental Performance",
        description:
          "Apply your SBI Pro insights to make better decisions, enhance learning, and achieve optimal mental performance in life and work.",
      },
    ];
  }

  return (
    <section className="process-steps-section process-steps-sbi">
      <Container>
        <div className="process-steps-header">
          <span className="process-steps-tag">{tag}</span>
          <h2 className="process-steps-title">{title}</h2>
        </div>

        <div className="process-steps-row">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <div key={index} className="process-steps-item">
                <div className="process-steps-card">
                  <span className="process-steps-num">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="process-steps-icon">
                    <Icon />
                  </div>
                  <h4 className="process-steps-item-title">{step.title}</h4>
                  <p className="process-steps-item-desc">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

Process.propTypes = {
  common: PropTypes.shape({
    commonSettings: PropTypes.object,
    loadingCommonSettings: PropTypes.bool,
  }).isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(Process);
