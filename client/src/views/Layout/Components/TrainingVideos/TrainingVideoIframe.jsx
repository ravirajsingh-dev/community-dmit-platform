import React from "react";

const TrainingVideoIframe = ({ embedUrl, title }) => {
  if (!embedUrl) return null;

  return (
    <div className="training-video-wrapper">
      <iframe
        src={embedUrl}
        title={title || "Training Video"}
        className="training-video-iframe"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        // Keep capabilities minimal since embedUrl is user-controlled from the admin panel.
        // Provider-specific playback still works on common embed URLs (e.g., YouTube/Vimeo).
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    </div>
  );
};

export default TrainingVideoIframe;

