import React from "react";
import PropTypes from "prop-types";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const AdminLoadingSkeleton = ({
  count = 1,
  circle = false,
  height,
  width,
  className = "",
  enableAnimation = true,
}) => {
  return (
    <span
      aria-live="polite"
      aria-busy="true"
      className={`admin-loading-skeleton ${className}`.trim()}
    >
      <Skeleton
        count={count}
        circle={circle}
        inline={true}
        height={height}
        width={width}
        enableAnimation={enableAnimation}
      />
    </span>
  );
};

AdminLoadingSkeleton.propTypes = {
  count: PropTypes.number,
  circle: PropTypes.bool,
  height: PropTypes.number,
  width: PropTypes.number,
  className: PropTypes.string,
  enableAnimation: PropTypes.bool,
};

export default AdminLoadingSkeleton;
