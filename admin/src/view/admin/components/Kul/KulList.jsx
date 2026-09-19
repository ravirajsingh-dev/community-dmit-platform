import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { RiDeleteBin5Line, RiRestartLine } from "react-icons/ri";
import { VscEdit } from "react-icons/vsc";
import { TbToggleLeft, TbToggleRight } from "react-icons/tb";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";
import { getInitialSortingParams } from "@src/constants";

import {
  getKulList,
  resetComponentStore,
  deleteKul,
  hardDeleteKul,
  toggleKulStatus,
  restoreKul,
  approveKul,
  rejectKul,
} from "@src/actions/adminKulActions";

const KulList = ({
  loggedInUser,
  kulList: { data, count },
  getKulList,
  loadingKulList,
  resetComponentStore,
  sortingParams,
  deleteKul,
  hardDeleteKul,
  toggleKulStatus,
  restoreKul,
  approveKul,
  rejectKul,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedKul, setSelectedKul] = React.useState(null);

  const [kulParams, setKulParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "", communityId: "", vanshId: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getKulList(kulParams);
  }, [getKulList, kulParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await deleteKul(selectedKul._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await hardDeleteKul(selectedKul._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await toggleKulStatus(selectedKul._id, txnPassword);
      setShowToggleModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await restoreKul(selectedKul._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const handleApproveClick = (kul) => {
    setSelectedKul(kul);
    setShowApproveModal(true);
  };

  const handleRejectClick = (kul) => {
    setSelectedKul(kul);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await approveKul(selectedKul._id, txnPassword);
      setShowApproveModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedKul && txnPassword) {
      await rejectKul(selectedKul._id, txnPassword);
      setShowRejectModal(false);
      setSelectedKul(null);
      getKulList(kulParams);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "15%",
      wrap: true,
    },
    {
      name: "Community",
      selector: (row) => row.communityId?.name || "-",
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "Vansh",
      selector: (row) => row.vanshId?.name || "-",
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 60 ? `${desc.substring(0, 60)}...` : desc;
      },
      sortable: false,
      width: "25%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <div className="d-flex gap-1 flex-wrap">
          {row.status && (
            <Badge bg={row.status === "active" ? "success" : row.status === "pending" ? "warning" : row.status === "rejected" ? "danger" : "warning"}>
              {row.status}
            </Badge>
          )}
          <Badge bg={row.isActive ? "success" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
          {row.isDeleted && (
            <Badge bg="danger">
              Deleted
            </Badge>
          )}
        </div>
      ),
      sortable: false,
      width: "15%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "20%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {row.status === "pending" && hasPermission(loggedInAdmin, "kul", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Kul"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Kul"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "kul", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/kul/edit/${row._id}`)}
                title="Edit Kul"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedKul(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "kul", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedKul(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Kul"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedKul(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Kul"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedKul(row);
                  setShowHardDeleteModal(true);
                }}
                title="Delete Permanently"
              >
                <RiDeleteBin5Line size={20} style={{ opacity: 0.6 }} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <AppBreadCrumb pageTitle="Kul" crumbs={[{ name: "Kul" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "kul", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/kul/add")}
                >
                  Add Kul
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={kulParams}
          setParams={setKulParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingKulList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedKul?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedKul?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedKul?.isActive ? "deactivate" : "activate"} "${selectedKul?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedKul?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Kul"
        body={`Are you sure you want to approve "${selectedKul?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedKul(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Kul"
        body={`Are you sure you want to reject "${selectedKul?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

KulList.propTypes = {
  getKulList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  kulList: state.kul.kulList,
  loadingKulList: state.kul.loadingKulList,
  sortingParams: state.kul.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getKulList,
  resetComponentStore,
  deleteKul,
  hardDeleteKul,
  toggleKulStatus,
  restoreKul,
  approveKul,
  rejectKul,
})(KulList);
