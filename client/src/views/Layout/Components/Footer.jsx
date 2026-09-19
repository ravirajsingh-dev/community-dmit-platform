import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaAngleDoubleUp } from "react-icons/fa";
import { Button } from "react-bootstrap";
import LogoSpinner from "@src/views/Common/Loaders/LogoSpinner";
import LoadingSkeleton from "@src/views/Common/Loaders/LoadingSkeleton";
import { getCommonSettings } from "@src/actions/commonActions";
import CopyIcon from "@src/views/Common/CopyIcon";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";

const Footer = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch common settings on component mount
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Brand from abbreviation only; no hardcoded names
  const brandLabel = commonSettings?.abbreviation || "";
  const address = commonSettings?.address || "";
  const contactUs = commonSettings?.contactUs || "";
  const email = commonSettings?.email || "";
  const socialMedia = commonSettings?.socialMedia || {};
  const logoUrl = commonSettings?.logoUrl;

  // Parse phone numbers (handle comma, newline, or semicolon separated)
  const parsePhoneNumbers = (phoneString) => {
    if (!phoneString) return [];
    return phoneString
      .split(/[,;\n]/)
      .map((phone) => phone.trim())
      .filter((phone) => phone.length > 0);
  };

  const phoneNumbers = parsePhoneNumbers(contactUs);

  // Render skeleton loader while loading
  if (loadingCommonSettings) {
    return (
      <footer className="layout-footer-area">
        <div className="layout-footer-main">
          <div className="container">
            <div className="layout-footer-center-wrapper">
              {/* Logo - Spinner */}
              <div className="layout-footer-logo">
                <LogoSpinner />
              </div>

              {/* Brand Text - Skeleton */}
              <LoadingSkeleton className="skeleton-width-200 skeleton-height-28 skeleton-radius-4" />
              <div className="footer-skeleton-spacing-bottom">
                <LoadingSkeleton className="skeleton-width-250 skeleton-height-16 skeleton-radius-4" />
              </div>

              {/* Social Icons - Skeleton */}
              <div className="layout-footer-social-info mb-3">
                <LoadingSkeleton
                  count={3}
                  circle={true}
                  className="skeleton-width-100 skeleton-height-40 skeleton-circle"
                />
              </div>

              {/* Navigation - Skeleton */}
              <div className="footer-skeleton-spacing-bottom">
                <LoadingSkeleton className="skeleton-width-200 skeleton-height-20 skeleton-radius-4" />
              </div>

              {/* Contact - Skeleton */}
              <div className="layout-footer-contact">
                <LoadingSkeleton className="skeleton-width-300 skeleton-height-16 skeleton-radius-4" />
                <div className="footer-skeleton-spacing-top">
                  <LoadingSkeleton className="skeleton-width-200 skeleton-height-16 skeleton-radius-4" />
                </div>
                <div className="footer-skeleton-spacing-top">
                  <LoadingSkeleton className="skeleton-width-250 skeleton-height-16 skeleton-radius-4" />
                </div>
                <div className="footer-skeleton-spacing-top">
                  <LoadingSkeleton className="skeleton-width-280 skeleton-height-16 skeleton-radius-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="layout-footer-area">
      <div className="layout-footer-main">
        <div className="container">
          <div className="layout-footer-center-wrapper">
            {/* Logo */}
            {logoUrl && (
              <div className="layout-footer-logo">
                <img src={logoUrl} alt={brandLabel} />
              </div>
            )}

            {/* Brand Text */}
            {brandLabel && (
              <h4 className="layout-footer-brand">{brandLabel.toUpperCase()}</h4>
            )}

            {/* Social Icons */}
            <div className="layout-footer-social-info mb-3">
              <SocialIcons socialMedia={socialMedia} size="medium" />
            </div>

            {/* Navigation Links */}
            <div className="layout-footer-navigation mb-4">
              <Link to="/about-us" className="layout-footer-nav-link">
                About Us
              </Link>
              <span className="layout-footer-nav-separator">|</span>
              <Link to="/contact-us" className="layout-footer-nav-link">
                Contact Us
              </Link>
              {commonSettings?.comingSoon?.enabled && (
                <>
                  <span className="layout-footer-nav-separator">|</span>
                  <Link to="/coming-soon" className="layout-footer-nav-link">
                    Coming Soon
                  </Link>
                </>
              )}
            </div>

            {/* Contact */}
            <div className="layout-footer-contact">
              {address && <p>{address}</p>}
              {phoneNumbers.length > 0 && (
                <>
                  {phoneNumbers.map((phone, index) => (
                    <p key={index}>
                      {index === 0 && <span>Phone:</span>} {phone}
                      <CopyIcon
                        textToCopy={phone}
                        iconSize={16}
                        className="ms-2"
                      />
                    </p>
                  ))}
                </>
              )}
              {email && (
                <p>
                  <span>Email:</span> {email}
                  <CopyIcon textToCopy={email} iconSize={16} className="ms-2" />
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isVisible && (
        <Button
          className="layout-scroll-up-button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <FaAngleDoubleUp />
        </Button>
      )}
    </footer>
  );
};

Footer.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(Footer);
