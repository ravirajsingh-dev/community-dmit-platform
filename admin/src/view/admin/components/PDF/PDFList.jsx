import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

// icons
import { RiDeleteBin5Line, RiEditLine } from "react-icons/ri";
import { VscEye } from "react-icons/vsc";
import { TbFileTypePdf } from "react-icons/tb";

// custom imports
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";
import { getInitialSortingParams } from "@src/constants";

import {
  getPDFs,
  resetComponentStore,
  deletePDF,
} from "@src/actions/adminPDFActions";
import PDFModal from "./PDFModal";

const PDFList = ({
  loggedInUser,
  pdfList: { data, count },
  getPDFs,
  loadingPDFList,
  resetComponentStore,
  sortingParams,
  deletePDF,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedPDF, setSelectedPDF] = React.useState(null);
  const [selectedType, setSelectedType] = React.useState("");

  const { page, limit } = sortingParams;

  const [pdfParams, setPDFParams] = React.useState(() =>
    getInitialSortingParams({ type: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getPDFs(pdfParams);
  }, [getPDFs, pdfParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedPDF && txnPassword) {
      deletePDF(selectedPDF._id, txnPassword);
      setShowModal(false);
      setSelectedPDF(null);
    }
  };

  const handleCreatePDFClick = (e) => {
    e.preventDefault();
    setSelectedPDF(null);
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setSelectedPDF(null);
    // Refresh list
    getPDFs(pdfParams);
  };

  const handleTypeFilter = (type) => {
    setSelectedType(type);
    setPDFParams({
      ...pdfParams,
      type: type || "",
      page: 1,
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getTypeLabel = (type) => {
    const labels = {
      policy: "Policy",
      terms: "Terms & Conditions",
      refund: "Refund Policy",
      plan: "Plan PDF",
      misc: "Miscellaneous",
    };
    return labels[type] || type;
  };

  const columns = [
    {
      name: "Title",
      selector: (row) => row.title || "-",
      sortable: false,
      width: "25%",
      wrap: true,
    },
    {
      name: "Type",
      selector: (row) => (
        <Badge bg="info">{getTypeLabel(row.type)}</Badge>
      ),
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "File",
      selector: (row) => (
        <div className="d-flex align-items-center gap-2">
          <TbFileTypePdf size={20} className="text-danger" />
          <div>
            <div className="small">{row.fileName || "document.pdf"}</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              {formatFileSize(row.fileSize)}
            </div>
          </div>
        </div>
      ),
      sortable: false,
      width: "20%",
      wrap: true,
    },
    {
      name: "Display Order",
      selector: (row) => row.displayOrder,
      sortable: true,
      sortField: "displayOrder",
      width: "10%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge bg={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "20%",
      cell: (row) => (
        <div className="d-flex gap-2">
          <a
            href={row.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
            title="View PDF"
          >
            <VscEye size={20} />
          </a>
          {hasPermission(loggedInAdmin, "pdfs", "edit") && (
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() => {
                setSelectedPDF(row);
                setShowEditModal(true);
              }}
              title="Edit PDF"
            >
              <RiEditLine size={20} />
            </Button>
          )}
          {hasPermission(loggedInAdmin, "pdfs", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedPDF(row);
                setShowModal(true);
              }}
              title="Delete PDF"
            >
              <RiDeleteBin5Line size={20} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="PDF Documents"
        crumbs={[{ name: "PDF Documents" }]}
      />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between align-items-center">
            <Col md="4">
              {hasPermission(loggedInAdmin, "pdfs", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreatePDFClick}
                >
                  Add PDF
                </Button>
              )}
            </Col>
            <Col md="4">
              <select
                className="form-select"
                value={selectedType}
                onChange={(e) => handleTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="policy">Policy</option>
                <option value="terms">Terms & Conditions</option>
                <option value="refund">Refund Policy</option>
                <option value="plan">Plan PDF</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={pdfParams}
          setParams={setPDFParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingPDFList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showModal}
        handleClose={() => {
          setShowModal(false);
          setSelectedPDF(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body={`Are you sure you want to delete this PDF document? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <PDFModal
        show={showEditModal}
        handleClose={handleModalClose}
        pdf={selectedPDF}
      />
    </Container>
  );
};

PDFList.propTypes = {
  getPDFs: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  pdfList: state.pdfs.pdfList,
  loadingPDFList: state.pdfs.loadingPDFList,
  sortingParams: state.pdfs.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getPDFs,
  resetComponentStore,
  deletePDF,
})(PDFList);
