import React from "react";
import PropTypes from "prop-types";
import { Modal } from "react-bootstrap";

const NewsDetailsModal = ({ show, onHide, newsItem }) => {
  if (!newsItem) {
    return null;
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="news-details-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title className="news-details-modal-title">
          {newsItem.title || "News Details"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="news-details-modal-body">
        {newsItem.imageUrl && (
          <div className="news-details-image-wrapper mb-3">
            <img
              src={newsItem.imageUrl}
              alt={newsItem.title || "News"}
              className="img-fluid news-details-image"
            />
          </div>
        )}
        <div className="news-details-content">
          {newsItem.description ? (
            <p className="news-details-description text-preserve-line-breaks">
              {newsItem.description}
            </p>
          ) : (
            <p className="news-details-description text-muted">
              No description available.
            </p>
          )}
          {newsItem.createdAt && (
            <small className="text-muted news-details-date">
              Published on{" "}
              {new Date(newsItem.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </small>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

NewsDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  newsItem: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    imageUrl: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

NewsDetailsModal.defaultProps = {
  newsItem: null,
};

export default NewsDetailsModal;
