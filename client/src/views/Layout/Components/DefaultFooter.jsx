import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

const DefaultFooter = ({ common: { commonSettings } }) => {
  const appName = commonSettings?.abbreviation || "";

  return (
    <footer className="layout-footer-area">
      <div className="layout-footer-bottom">
        <div className="layout-footer-border-line"></div>
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="layout-footer-copyright-text text-center">
                <p>
                  © {new Date().getFullYear()}{" "}
                  {appName && (
                    <span className="layout-footer-link-web">{appName}</span>
                  )}
                  {appName && ". "}All Rights Reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

DefaultFooter.propTypes = {
  common: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps)(DefaultFooter);
