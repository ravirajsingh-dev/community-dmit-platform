import React, { useMemo, useState } from "react";
import { Container, Row, Col, Alert, Button } from "react-bootstrap";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

import TrainingVideoIframe from "./TrainingVideoIframe";

const TrainingVideosSection = ({
  loading,
  activeDesignationCodes = [],
  videos,
}) => {
  const [activeVideoKey, setActiveVideoKey] = useState(null);

  const effectiveDesignationCodes = useMemo(() => {
    const toCodeNum = (code) => {
      const n = typeof code === "string" ? parseInt(code, 10) : code;
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const normalizedUserCodes = Array.isArray(activeDesignationCodes)
      ? activeDesignationCodes.map((c) => toCodeNum(c)).filter((x) => x != null)
      : [];

    if (normalizedUserCodes.length > 0) {
      return [...new Set(normalizedUserCodes)].sort((a, b) => a - b);
    }

    // If user designation codes aren't detected for any reason,
    // still show what server returned so the page doesn't appear broken.
    const list = Array.isArray(videos) ? videos : [];
    const codesFromVideos = [];
    list.forEach((v) => {
      if (Array.isArray(v?.designations)) {
        v.designations.forEach((c) => {
          const n = toCodeNum(c);
          if (n != null) codesFromVideos.push(n);
        });
      } else if (v?.designations != null) {
        const n = toCodeNum(v.designations);
        if (n != null) codesFromVideos.push(n);
      }
    });

    return [...new Set(codesFromVideos)].sort((a, b) => a - b);
  }, [activeDesignationCodes, videos]);

  const designationCodeToName = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(videos) ? videos : [];

    list.forEach((v) => {
      const codes = Array.isArray(v.designations)
        ? v.designations
        : v.designations != null
          ? [v.designations]
          : [];
      const names = Array.isArray(v.designationNames) ? v.designationNames : [];

      codes.forEach((code, idx) => {
        const n = typeof code === "string" ? parseInt(code, 10) : code;
        if (!Number.isFinite(n) || n <= 0) return;
        const name = names[idx];
        if (name && !map.has(n)) map.set(n, name);
      });
    });

    return map;
  }, [videos]);

  const grouped = useMemo(() => {
    const list = Array.isArray(videos) ? videos : [];
    const codesToShow = Array.isArray(effectiveDesignationCodes)
      ? effectiveDesignationCodes
      : [];

    const byCode = new Map();
    codesToShow.forEach((c) => byCode.set(c, []));

    list.forEach((video) => {
      const rawCodes = Array.isArray(video.designations)
        ? video.designations
        : video.designations != null
          ? [video.designations]
          : [];

      const videoCodes = rawCodes
        .map((code) => {
          const n = typeof code === "string" ? parseInt(code, 10) : code;
          return Number.isFinite(n) && n > 0 ? n : null;
        })
        .filter((x) => x != null);

      videoCodes.forEach((code) => {
        if (!byCode.has(code)) return; // show only relevant designation sections
        byCode.get(code).push(video);
      });
    });

    // Sort each group + compute group ordering by the first video's displayOrder.
    const groupEntries = [...byCode.entries()]
      .map(([code, groupVideos]) => {
        const sorted = [...groupVideos].sort(
          (a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0),
        );
        return { code, videos: sorted };
      })
      .filter((g) => g.videos.length > 0)
      .sort(
        (a, b) =>
          (a.videos[0]?.displayOrder ?? 0) - (b.videos[0]?.displayOrder ?? 0),
      );

    return groupEntries;
  }, [videos, effectiveDesignationCodes]);

  if (loading) {
    return (
      <section className="training-videos-section">
        <Container>
          <div className="training-videos-loading">
            <BouncingLoader />
          </div>
        </Container>
      </section>
    );
  }

  if (!videos || videos.length === 0 || grouped.length === 0) {
    return (
      <section className="training-videos-section">
        <Container>
          <div className="training-videos-header text-center mb-4">
            <span>Training Videos</span>
            <h2>Learn & Grow</h2>
            <p className="mb-0">
              Training videos are not available for your current designation.
            </p>
          </div>
          <Alert variant="light" className="text-center">
            Training videos are not available at the moment.
          </Alert>
        </Container>
      </section>
    );
  }

  return (
    <section className="training-videos-section">
      <Container>
        <div className="training-videos-header text-center mb-5">
          <span>Training Videos</span>
          <h2>Learn & Grow</h2>
          <p className="mb-0">Showing videos based on your designation.</p>
        </div>

        {grouped.map((group) => {
          const designationLabel =
            designationCodeToName.get(group.code) ||
            `Designation_${group.code}`;

          return (
            <div
              className="training-videos-designation-group mb-5"
              key={group.code}
            >
              <div className="training-videos-designation-heading">
                <h3 className="mb-4">{designationLabel}</h3>
              </div>

              <Row>
                {group.videos.map((video, idx) => {
                  const videoKey =
                    video._id || video.embedUrl || `${video.title}-${idx}`;
                  const isActive = activeVideoKey === videoKey;
                  const autoplayEmbedUrl = (() => {
                    const url = video.embedUrl || "";
                    if (!url) return url;
                    const hasAutoplay = url.includes("autoplay=");
                    if (hasAutoplay) {
                      return url.replace(/autoplay=\d+/g, "autoplay=1");
                    }
                    const joinChar = url.includes("?") ? "&" : "?";
                    return `${url}${joinChar}autoplay=1`;
                  })();

                  return (
                    <Col key={videoKey} xs={12} md={6} lg={4} className="mb-4">
                      <div className="training-video-item h-100">
                        <div className="training-video-player-area">
                          {isActive ? (
                            <TrainingVideoIframe
                              embedUrl={autoplayEmbedUrl}
                              title={video.title || "Training Video"}
                            />
                          ) : (
                            <div className="training-video-placeholder">
                              <Button
                                variant="primary"
                                className="training-video-play-btn"
                                onClick={() => setActiveVideoKey(videoKey)}
                                aria-label={`Play ${video.title || "training video"}`}
                              >
                                Play
                              </Button>
                            </div>
                          )}
                        </div>

                        {video.title && (
                          <div className="training-video-title">
                            <h4>{video.title}</h4>
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          );
        })}
      </Container>
    </section>
  );
};

export default TrainingVideosSection;
