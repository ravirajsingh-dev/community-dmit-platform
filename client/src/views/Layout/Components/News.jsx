import React, { useEffect, useState } from "react";
import { getNews } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NewsDetailsModal from "@src/views/Common/Modal/NewsDetailsModal";

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsData = await getNews();
        setNewsItems(Array.isArray(newsData) ? newsData : []);
      } catch (error) {
        console.error("Error fetching news:", error);
        setNewsItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const handleReadMore = (news) => {
    setSelectedNews(news);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNews(null);
  };

  if (loading) {
    return (
      <section className="news-section">
        <div className="container">
          <div className="news-loading">
            <BouncingLoader />
          </div>
        </div>
      </section>
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

  return (
    <section className="news-section">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-title animation-fade-in-up text-center mb-5">
              <span>Latest News</span>
              <h2>Stay Updated</h2>
              <p>
                Read our latest news and updates about SBI Pro analysis,
                fingerprint sessions, brain insights, trainer reports, and
                platform improvements.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          {newsItems.map((news) => (
            <div key={news._id} className="col-md-6 col-lg-4 mb-4">
              <div className="news-item">
                {news.imageUrl && (
                  <div className="news-thumbnail-image">
                    <img
                      src={news.imageUrl}
                      alt={news.title || "News"}
                      className="img-fluid news-thumbnail-image"
                    />
                  </div>
                )}
                <div className="news-content">
                  <h4 className="news-title">{news.title}</h4>
                  <p className="news-description">
                    {news.description && news.description.length > 150
                      ? `${news.description.substring(0, 150)}...`
                      : news.description}
                    {news.description && news.description.length > 150 && (
                      <button
                        className="btn-read-more-link mt-2"
                        onClick={() => handleReadMore(news)}
                      >
                        Read More
                      </button>
                    )}
                  </p>
                  {news.createdAt && (
                    <small className="text-muted news-date">
                      {new Date(news.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </small>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <NewsDetailsModal
        show={showModal}
        onHide={handleCloseModal}
        newsItem={selectedNews}
      />
    </section>
  );
};

export default News;
