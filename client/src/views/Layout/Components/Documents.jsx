import React, { useEffect, useState } from "react";
import { getPDFs } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import { TbFileTypePdf } from "react-icons/tb";

const Documents = () => {
  const [pdfDocuments, setPDFDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPDFs = async () => {
      try {
        const pdfData = await getPDFs();
        setPDFDocuments(Array.isArray(pdfData) ? pdfData : []);
      } catch (error) {
        console.error("Error fetching PDF documents:", error);
        setPDFDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPDFs();
  }, []);

  if (loading) {
    return (
      <section className="documents-section">
        <div className="container">
          <div className="documents-loading">
            <BouncingLoader />
          </div>
        </div>
      </section>
    );
  }

  const getTypeLabel = (type) => {
    const labels = {
      policy: "Policy",
      terms: "Terms & Conditions",
      refund: "Refund Policy",
      plan: "Plan PDF",
      misc: "Document",
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <section className="documents-section py-5">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-title animation-fade-in-up text-center mb-5">
              <span>Important Documents</span>
              <h2>Policies & Documents</h2>
              <p>
                Access our important documents, policies, and terms. Download or
                view them directly in your browser.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          {pdfDocuments.length === 0 ? (
            <div className="col-12 text-center text-muted py-3">
              No documents available at the moment.
            </div>
          ) : (
            pdfDocuments.map((pdf) => (
              <div key={pdf._id} className="col-md-6 col-lg-4 mb-4">
                <div className="document-item h-100">
                  <div className="document-card p-4 h-100 d-flex flex-column">
                    <div className="document-icon mb-3">
                      <TbFileTypePdf size={48} className="text-danger" />
                    </div>
                    <div className="document-content flex-grow-1">
                      <h5 className="document-title mb-2">{pdf.title}</h5>
                      <div className="document-meta mb-3">
                        <span className="badge bg-info me-2">
                          {getTypeLabel(pdf.type)}
                        </span>
                        {pdf.fileSize && (
                          <span className="text-muted small">
                            {formatFileSize(pdf.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="document-actions mt-auto">
                      <a
                        href={pdf.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary w-100"
                      >
                        <TbFileTypePdf className="me-2" />
                        View Document
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Documents;
