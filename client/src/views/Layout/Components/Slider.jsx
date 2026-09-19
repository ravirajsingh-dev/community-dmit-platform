import React, { useEffect, useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { Modal, Button } from "react-bootstrap";
import { getSliderBanners } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

/**
 * Custom Slider Component
 * A fully responsive, reusable slider without any 3rd party dependencies
 *
 * @param {Array} banners - Array of banner objects with {imageUrl, title?, link?}
 * @param {Number} autoplaySpeed - Auto-play interval in milliseconds (default: 5000)
 * @param {Boolean} autoplay - Enable/disable auto-play (default: true)
 * @param {Boolean} pauseOnHover - Pause auto-play on hover (default: true)
 * @param {Boolean} showArrows - Show navigation arrows (default: true)
 * @param {Boolean} showDots - Show pagination dots (default: true)
 * @param {String} transition - Transition type: 'fade' or 'slide' (default: 'fade')
 */
const SliderComponent = ({
  banners: propBanners = null,
  autoplaySpeed = 5000,
  autoplay = true,
  pauseOnHover = true,
  showArrows = true,
  showDots = true,
  transition = "fade",
  common: { commonSettings, loadingCommonSettings } = {},
}) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSlideIndex, setModalSlideIndex] = useState(0);
  const intervalRef = useRef(null);
  const sliderRef = useRef(null);
  const fetchIdRef = useRef(0);

  // Fetch banners if not provided as props (cancel previous request, ignore stale responses)
  useEffect(() => {
    if (propBanners === null) {
      const controller = new AbortController();
      const currentId = ++fetchIdRef.current;

      const fetchBanners = async () => {
        try {
          const data = await getSliderBanners({ signal: controller.signal });
          if (currentId !== fetchIdRef.current) return;
          setBanners(Array.isArray(data) ? data : []);
        } catch (error) {
          if (currentId !== fetchIdRef.current) return;
          const isAborted =
            error?.name === "AbortError" ||
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED";
          if (isAborted) return;
          console.error("Error fetching banners:", error);
          setBanners([]);
        } finally {
          if (currentId === fetchIdRef.current) {
            setLoading(false);
          }
        }
      };
      fetchBanners();

      return () => {
        controller.abort();
      };
    } else {
      setBanners(Array.isArray(propBanners) ? propBanners : []);
      setLoading(false);
    }
  }, [propBanners]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoplay || banners.length <= 1 || isPaused || loading) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, autoplaySpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, autoplaySpeed, banners.length, isPaused, loading]);

  // Handle mouse enter/leave for pause on hover
  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  }, [pauseOnHover]);

  // Navigation functions
  const goToSlide = useCallback(
    (index) => {
      if (index >= 0 && index < banners.length) {
        setCurrentSlide(index);
      }
    },
    [banners.length],
  );

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Modal controls
  const openModalAtIndex = useCallback(
    (index) => {
      if (index >= 0 && index < banners.length) {
        setModalSlideIndex(index);
        setIsModalOpen(true);
        setIsPaused(true);
      }
    },
    [banners.length],
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsPaused(false);
  }, []);

  const goToModalNext = useCallback(() => {
    setModalSlideIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToModalPrev = useCallback(() => {
    setModalSlideIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPrev, goToNext]);

  if (loading) {
    return (
      <div className="hero-slider-area">
        <div className="hero-slider-loading">
          <BouncingLoader />
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    const welcomeText = loadingCommonSettings
      ? "Loading..."
      : commonSettings?.abbreviation
        ? `Welcome to ${commonSettings.abbreviation}`
        : "Welcome";
    return (
      <div className="hero-slider-area">
        <div className="hero-slider-empty">
          <div className="text-center">
            <h3>{welcomeText}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="hero-slider-area"
      ref={sliderRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hero-slider-container">
        {banners.map((banner, index) => (
          <div
            key={banner._id || index}
            className={`hero-slider-slide ${
              index === currentSlide ? "active" : ""
            }`}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title || `Slide ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              onClick={() => openModalAtIndex(index)}
              style={{ cursor: "pointer" }}
            />
            {/* {(banner.title || banner.link) && (
              <div className="slider-overlay">
                {banner.title && (
                  <h2 className="slider-title">{banner.title}</h2>
                )}
                {banner.link && (
                  <a
                    href={banner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="slider-link-btn"
                  >
                    Learn More
                  </a>
                )}
              </div>
            )} */}
          </div>
        ))}
      </div>
      {banners.length > 0 && (
        <Modal
          show={isModalOpen}
          onHide={closeModal}
          size="lg"
          centered
          className="slider-image-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {banners[modalSlideIndex]?.title ||
                `Slide ${modalSlideIndex + 1}`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <img
              src={banners[modalSlideIndex]?.imageUrl}
              alt={
                banners[modalSlideIndex]?.title ||
                `Slide ${modalSlideIndex + 1}`
              }
              style={{ maxWidth: "100%", height: "auto" }}
            />
            {banners[modalSlideIndex]?.link && (
              <div className="mt-3">
                <a
                  href={banners[modalSlideIndex].link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {banners[modalSlideIndex].link}
                </a>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
            <Button variant="secondary" onClick={goToModalPrev}>
              Prev
            </Button>
            <div className="text-muted">
              {modalSlideIndex + 1} / {banners.length}
            </div>
            <Button variant="secondary" onClick={goToModalNext}>
              Next
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps)(SliderComponent);
