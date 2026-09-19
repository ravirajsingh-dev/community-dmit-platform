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
  getKhampList,
  resetComponentStore,
  deleteKhamp,
  hardDeleteKhamp,
  toggleKhampStatus,
  restoreKhamp,
  approveKhamp,
  rejectKhamp,
} from "@src/actions/adminKhampActions";

const KhampList = ({
  loggedInUser,
  khampList: { data, count },
  getKhampList,
  loadingKhampList,
  resetComponentStore,
  sortingParams,
  deleteKhamp,
  hardDeleteKhamp,
  toggleKhampStatus,
  restoreKhamp,
  approveKhamp,
  rejectKhamp,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedKhamp, setSelectedKhamp] = React.useState(null);

  const [khampParams, setKhampParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "", communityId: "", vanshId: "", kulId: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getKhampList(khampParams);
  }, [getKhampList, khampParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await deleteKhamp(selectedKhamp._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await hardDeleteKhamp(selectedKhamp._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await toggleKhampStatus(selectedKhamp._id, txnPassword);
      setShowToggleModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await restoreKhamp(selectedKhamp._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const handleApproveClick = (khamp) => {
    setSelectedKhamp(khamp);
    setShowApproveModal(true);
  };

  const handleRejectClick = (khamp) => {
    setSelectedKhamp(khamp);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await approveKhamp(selectedKhamp._id, txnPassword);
      setShowApproveModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedKhamp && txnPassword) {
      await rejectKhamp(selectedKhamp._id, txnPassword);
      setShowRejectModal(false);
      setSelectedKhamp(null);
      getKhampList(khampParams);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "12%",
      wrap: true,
    },
    {
      name: "Community",
      selector: (row) => row.communityId?.name || "-",
      sortable: false,
      width: "12%",
      wrap: true,
    },
    {
      name: "Vansh",
      selector: (row) => row.vanshId?.name || "-",
      sortable: false,
      width: "12%",
      wrap: true,
    },
    {
      name: "Kul",
      selector: (row) => row.kulId?.name || "-",
      sortable: false,
      width: "12%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
      },
      sortable: false,
      width: "22%",
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
          {row.status === "pending" && hasPermission(loggedInAdmin, "khamp", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Khamp"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Khamp"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "khamp", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/khamp/edit/${row._id}`)}
                title="Edit Khamp"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedKhamp(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "khamp", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedKhamp(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Khamp"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedKhamp(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Khamp"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedKhamp(row);
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
      <AppBreadCrumb pageTitle="Khamp" crumbs={[{ name: "Khamp" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "khamp", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/khamp/add")}
                >
                  Add Khamp
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={khampParams}
          setParams={setKhampParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingKhampList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedKhamp?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedKhamp?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedKhamp?.isActive ? "deactivate" : "activate"} "${selectedKhamp?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedKhamp?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Khamp"
        body={`Are you sure you want to approve "${selectedKhamp?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedKhamp(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Khamp"
        body={`Are you sure you want to reject "${selectedKhamp?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

KhampList.propTypes = {
  getKhampList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  khampList: state.khamp.khampList,
  loadingKhampList: state.khamp.loadingKhampList,
  sortingParams: state.khamp.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getKhampList,
  resetComponentStore,
  deleteKhamp,
  hardDeleteKhamp,
  toggleKhampStatus,
  restoreKhamp,
  approveKhamp,
  rejectKhamp,
})(KhampList);
