import React from "react";
import PropTypes from "prop-types";

/**
 * Smooth, modern bouncing loader for async operations.
 * Used for: initializing family tree, adding family member, fetching tree data.
 * Optional message shown below the dots for context.
 */
const BouncingLoader = ({
  minHeight = "500px",
  className = "",
  message = "",
}) => {
  const minHeightClass =
    minHeight === "150px" ? "min-height-150" :
    minHeight === "400px" ? "min-height-400" : "min-height-500";
  return (
    <div
      className={`bouncing-loader-container ${minHeightClass} ${className}`.trim()}
    >
      <div className="bouncing-loader-wrapper">
        <div className="bouncing-loader">
          <div aria-hidden="true" />
          <div aria-hidden="true" />
          <div aria-hidden="true" />
        </div>
        {message && (
          <p
            className="bouncing-loader-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

BouncingLoader.propTypes = {
  minHeight: PropTypes.string,
  className: PropTypes.string,
  message: PropTypes.string,
};

export default BouncingLoader;
