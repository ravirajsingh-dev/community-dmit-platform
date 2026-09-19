import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const LoadingSkeleton = ({
  count = 1,
  circle = false,
  className = "",
  enableAnimation = true,
}) => {
  return (
    <span
      aria-live="polite"
      aria-busy="true"
      className={`loading-skeleton-container ${className}`.trim()}
    >
      <Skeleton
        count={count}
        circle={circle}
        inline={true}
        enableAnimation={enableAnimation}
        className="loading-skeleton-wrapper"
      />
    </span>
  );
};

export default LoadingSkeleton;
