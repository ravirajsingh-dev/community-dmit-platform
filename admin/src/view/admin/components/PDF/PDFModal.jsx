import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Errors from "@src/notifications/Errors";
import { validateForm } from "@src/utils/validation";
import { setErrors } from "@src/actions/adminAuth";
import {
  createPDF,
  updatePDF,
  removePDFErrors,
} from "@src/actions/adminPDFActions";

const PDFModal = ({
  show,
  handleClose,
  pdf,
  createPDF,
  updatePDF,
  removePDFErrors,
  setErrors,
  errorList,
  loadingPDFList,
}) => {
  const DEFAULT_TITLES = useMemo(
    () => [
      "Privacy Policy",
      "Terms & Conditions",
      "Refund Policies",
      "Plan PDF",
    ],
    [],
  );
  const DEFAULT_TYPES_BY_TITLE = useMemo(
    () => ({
      "Privacy Policy": "policy",
      "Terms & Conditions": "terms",
      "Refund Policies": "refund",
      "Plan PDF": "plan",
    }),
    [],
  );

  const [formData, setFormData] = useState({
    title: "",
    type: "misc",
    isActive: true,
    displayOrder: 0,
    file: null,
  });
  const [filePreview, setFilePreview] = useState(null);
  const [selectedTitleOption, setSelectedTitleOption] = useState("");

  const normalizeTitle = (value) => (value || "").trim().toLowerCase();

  // Build list of existing titles from current PDF list in Redux (if provided via errors bag later)
  // Fallback: empty, backend will still enforce uniqueness.
  const existingTitles = useMemo(() => {
    const list = Array.isArray(errorList?.__pdfExistingTitles)
      ? errorList.__pdfExistingTitles
      : [];
    return list;
  }, [errorList]);

  useEffect(() => {
    if (pdf) {
      setFormData({
        title: pdf.title || "",
        type: pdf.type || "misc",
        isActive: pdf.isActive !== undefined ? pdf.isActive : true,
        displayOrder: pdf.displayOrder || 0,
        file: null,
      });
      setFilePreview(pdf.fileUrl || null);
      const currentTitle = pdf.title || "";
      const matchDefault = DEFAULT_TITLES.find(
        (t) => normalizeTitle(t) === normalizeTitle(currentTitle),
      );
      setSelectedTitleOption(matchDefault || "__custom__");
    } else {
      setFormData({
        title: "",
        type: "misc",
        isActive: true,
        displayOrder: 0,
        file: null,
      });
      setFilePreview(null);
      setSelectedTitleOption("");
    }
    removePDFErrors();
  }, [pdf, show, removePDFErrors, DEFAULT_TITLES]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseInt(value) || 0
            : value,
    });
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors([{ path: "file", msg: "PDF size must be less than 10MB" }]);
        return;
      }

      // Validate file type
      if (file.type !== "application/pdf") {
        setErrors([{ path: "file", msg: "Only PDF files are allowed" }]);
        return;
      }

      setFormData({ ...formData, file: file });
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleTitleSelectChange = (e) => {
    const value = e.target.value;
    setSelectedTitleOption(value);
    if (value && value !== "__custom__") {
      setFormData((prev) => ({
        ...prev,
        title: value,
        type: DEFAULT_TYPES_BY_TITLE[value] || "misc",
      }));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    removePDFErrors();

    const validationRules = [];
    if (!pdf && !formData.file) {
      validationRules.push({ path: "file", msg: "PDF file is required" });
    }
    if (!formData.title || !formData.title.trim()) {
      validationRules.push({ path: "title", msg: "Title is required" });
    }

    // Enforce unique title (case-insensitive) against known existing titles
    const currentNormalized = normalizeTitle(formData.title);
    const existingNormalized = (existingTitles || []).map((t) =>
      normalizeTitle(t),
    );
    const currentTitleOfPdf = pdf?.title || "";
    const isSameAsCurrent =
      pdf && normalizeTitle(currentTitleOfPdf) === currentNormalized;
    if (!isSameAsCurrent && existingNormalized.includes(currentNormalized)) {
      validationRules.push({
        path: "title",
        msg: "A PDF already exists for this title.",
      });
    }

    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      return;
    }

    if (pdf) {
      // Update - send FormData if file is provided, otherwise JSON
      if (formData.file) {
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title);
        formDataToSend.append("type", formData.type);
        formDataToSend.append("isActive", formData.isActive);
        formDataToSend.append("displayOrder", formData.displayOrder);
        formDataToSend.append("file", formData.file);
        updatePDF(formDataToSend, pdf._id, handleClose);
      } else {
        const formDataToSend = {
          title: formData.title,
          type: formData.type,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
        };
        updatePDF(formDataToSend, pdf._id, handleClose);
      }
    } else {
      // Create - send FormData with file
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("type", formData.type);
      formDataToSend.append("isActive", formData.isActive);
      formDataToSend.append("displayOrder", formData.displayOrder);
      formDataToSend.append("file", formData.file);
      createPDF(formDataToSend, handleClose);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {pdf ? "Edit PDF Document" : "Add PDF Document"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          <Row>
            <Col md="12" className="mb-3">
              <Form.Group>
                <Form.Label>Title *</Form.Label>
                <Form.Select
                  className="mb-2"
                  value={selectedTitleOption}
                  onChange={handleTitleSelectChange}
                >
                  <option value="">Select title</option>
                  {DEFAULT_TITLES.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                  <option value="__custom__">Custom / Other…</option>
                </Form.Select>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  placeholder="Enter or customize title"
                  className={errorList.title ? "invalid" : ""}
                />
                <Errors current_key="title" />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group>
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={onChange}
                  min="0"
                />
              </Form.Group>
            </Col>

            <Col md="6" className="mb-3">
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="isActive"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>

            {!pdf && (
              <Col md="12" className="mb-3">
                <Form.Group>
                  <Form.Label>PDF File *</Form.Label>
                  <Form.Control
                    type="file"
                    name="file"
                    accept="application/pdf"
                    onChange={onFileChange}
                    className={errorList.file ? "invalid" : ""}
                  />
                  <Errors current_key="file" />
                  <Form.Text className="text-muted">
                    Maximum file size: 10MB. Only PDF files are allowed.
                  </Form.Text>
                </Form.Group>
              </Col>
            )}

            {pdf && (
              <Col md="12" className="mb-3">
                <Form.Label>Current PDF</Form.Label>
                <div className="border p-2 rounded">
                  <a
                    href={pdf.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-flex align-items-center gap-2 text-decoration-none"
                  >
                    <span className="text-danger">📄</span>
                    <span>{pdf.fileName || "document.pdf"}</span>
                    <span className="text-muted small">
                      ({Math.round(pdf.fileSize / 1024)} KB)
                    </span>
                  </a>
                </div>
                <Form.Text className="text-muted">
                  To replace the PDF, select a new file below.
                </Form.Text>
              </Col>
            )}

            {pdf && (
              <Col md="12" className="mb-3">
                <Form.Group>
                  <Form.Label>Replace PDF File (Optional)</Form.Label>
                  <Form.Control
                    type="file"
                    name="file"
                    accept="application/pdf"
                    onChange={onFileChange}
                    className={errorList.file ? "invalid" : ""}
                  />
                  <Errors current_key="file" />
                  {filePreview && (
                    <div className="mt-2">
                      <Form.Text className="text-success">
                        New file selected: {formData.file?.name}
                      </Form.Text>
                    </div>
                  )}
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loadingPDFList}>
            {loadingPDFList ? "Saving..." : pdf ? "Update" : "Upload"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

PDFModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  pdf: PropTypes.object,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
  loadingPDFList: state.pdfs.loadingPDFList,
});

export default connect(mapStateToProps, {
  createPDF,
  updatePDF,
  removePDFErrors,
  setErrors,
})(PDFModal);
