import React, { useState, useEffect } from "react";
import { Image } from "react-bootstrap";
import { connect } from "react-redux";
import LogoSpinner from "./LogoSpinner";

const PreLoaderWithText = ({ commonSettings, loadingCommonSettings }) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const messages = [
      "Initializing application...",
      "Loading resources...",
      "Optimizing performance...",
      "Finalizing setup...",
      "Almost there!",
    ];

    let currentIndex = 0;
    setMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setMessage(messages[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const logoUrl = commonSettings?.logoUrl;

  return (
    <div className="preloader-overlay">
      <div className="preloader-container">
        <div className="preloader-circle"></div>
        <div className="preloader-circle"></div>
        <div className="preloader-circle"></div>
        <div className="preloader-img">
          {loadingCommonSettings || !logoUrl ? (
            <LogoSpinner />
          ) : (
            <Image src={logoUrl} alt="Application Logo" />
          )}
        </div>
        {/* Separated message container */}
        <div className="preloader-message">
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  commonSettings: state.common?.commonSettings || {},
  loadingCommonSettings: state.common?.loadingCommonSettings || false,
});

export default connect(mapStateToProps)(PreLoaderWithText);
