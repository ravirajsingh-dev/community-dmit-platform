import React from "react";

const LogoSpinner = ({ className = "" }) => {
  return (
    <div className={`logo-spinner ${className}`.trim()}>
      <div className="loader"></div>
    </div>
  );
};

export default LogoSpinner;
