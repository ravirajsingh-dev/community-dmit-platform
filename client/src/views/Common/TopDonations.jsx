import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { getTopDonations } from "@src/actions/donationActions";
import { TOP_DONATIONS_LIMIT } from "@src/constants";
import "@src/assets/scss/components/topDonations.scss";

const TopDonations = ({
  getTopDonations,
  topDonations,
  loadingTopDonations,
  limit = TOP_DONATIONS_LIMIT,
  className = "",
}) => {
  const marqueeRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    getTopDonations(limit);
  }, [getTopDonations, limit]);

  useEffect(() => {
    // Only process if we have success donations
    const successDonationsCount = Array.isArray(topDonations) ? topDonations.length : 0;
    
    if (!marqueeRef.current || successDonationsCount === 0) {
      return;
    }

    const marquee = marqueeRef.current;
    const content = marquee.querySelector(".top-donations-content");

    if (!content) return;

    // Only animate if more than 1 item (seamless loop requires duplication)
    if (successDonationsCount > 1) {
      content.style.animation = "none";
      setTimeout(() => {
        if (!isPaused) {
          content.style.animation = "topDonationsScroll 35s linear infinite";
        }
      }, 10);
    } else {
      content.style.animation = "none";
    }
  }, [topDonations, isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (marqueeRef.current) {
      const content = marqueeRef.current.querySelector(".top-donations-content");
      if (content) {
        content.style.animationPlayState = "paused";
      }
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    if (marqueeRef.current) {
      const content = marqueeRef.current.querySelector(".top-donations-content");
      if (content) {
        content.style.animationPlayState = "running";
      }
    }
  };

  if (loadingTopDonations) {
    return (
      <div className={`top-donations-container ${className}`}>
        <div className="top-donations-loading">Loading donations...</div>
      </div>
    );
  }

  // CRITICAL: Empty state ONLY when there are ZERO SUCCESS donations from PaymentHistory
  // topDonations array contains ONLY success donations from PaymentHistory (backend source of truth)
  const successDonations = Array.isArray(topDonations) ? topDonations : [];
  const successDonationsCount = successDonations.length;
  
  // Show empty state ONLY when ZERO SUCCESS donation records exist in PaymentHistory
  if (successDonationsCount === 0) {
    return (
      <div className={`top-donations-container ${className}`}>
        <div className="top-donations-empty">No donations yet. Be the first to support our community initiatives!</div>
      </div>
    );
  }

  // Duplicate items for seamless loop (only if more than 1 item)
  const displayItems =
    successDonationsCount > 1
      ? [...successDonations, ...successDonations]
      : successDonations;

  return (
    <div
      className={`top-donations-container top-donations-cards ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="top-donations-marquee" ref={marqueeRef}>
        <div
          className={`top-donations-content ${successDonations.length > 1 ? "animate" : ""}`}
        >
          {displayItems.map((donation, index) => (
            <div
              key={`${donation._id}-${index}`}
              className="top-donations-item"
            >
              <span className="top-donations-name">
                {donation.donorName || "Guest User"}
              </span>
              <span className="top-donations-amount">
                ₹{donation.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

TopDonations.propTypes = {
  getTopDonations: PropTypes.func.isRequired,
  topDonations: PropTypes.array,
  loadingTopDonations: PropTypes.bool,
  limit: PropTypes.number,
  className: PropTypes.string,
};

const mapStateToProps = (state) => ({
  topDonations: state.donation.topDonations,
  loadingTopDonations: state.donation.loadingTopDonations,
});

export default connect(mapStateToProps, {
  getTopDonations,
})(TopDonations);
