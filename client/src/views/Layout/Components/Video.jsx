import React, { useEffect, useState } from "react";
import { getVideos } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";

const Video = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videoData = await getVideos();
        setVideos(Array.isArray(videoData) ? videoData : []);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <section className="video-gallery-section">
        <div className="container">
          <div className="video-gallery-loading">
            <BouncingLoader />
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="video-gallery-section">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-title animation-fade-in-up text-center mb-5">
              <span>Our Videos</span>
              <h2>Watch Our Journey</h2>
              <p>
                Experience SBI Pro in action through these videos showcasing
                fingerprint analysis, brain insights, session workflows, and how
                our platform helps unlock your potential.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          {videos.map((video) => (
            <div
              key={video._id || video.embedUrl}
              className="col-md-6 col-lg-4 mb-4"
            >
              <div className="video-gallery-item">
                <div className="video-gallery-wrapper">
                  <iframe
                    src={video.embedUrl}
                    title={video.title || "Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="video-gallery-iframe"
                  ></iframe>
                </div>
                {video.title && (
                  <div className="video-gallery-title">
                    <h4>{video.title}</h4>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Video;
