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
  getVanshList,
  resetComponentStore,
  deleteVansh,
  hardDeleteVansh,
  toggleVanshStatus,
  restoreVansh,
  approveVansh,
  rejectVansh,
} from "@src/actions/adminVanshActions";

const VanshList = ({
  loggedInUser,
  vanshList: { data, count },
  getVanshList,
  loadingVanshList,
  resetComponentStore,
  sortingParams,
  deleteVansh,
  hardDeleteVansh,
  toggleVanshStatus,
  restoreVansh,
  approveVansh,
  rejectVansh,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedVansh, setSelectedVansh] = React.useState(null);

  const [vanshParams, setVanshParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "", communityId: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getVanshList(vanshParams);
  }, [getVanshList, vanshParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await deleteVansh(selectedVansh._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await hardDeleteVansh(selectedVansh._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await toggleVanshStatus(selectedVansh._id, txnPassword);
      setShowToggleModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await restoreVansh(selectedVansh._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const handleApproveClick = (vansh) => {
    setSelectedVansh(vansh);
    setShowApproveModal(true);
  };

  const handleRejectClick = (vansh) => {
    setSelectedVansh(vansh);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await approveVansh(selectedVansh._id, txnPassword);
      setShowApproveModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedVansh && txnPassword) {
      await rejectVansh(selectedVansh._id, txnPassword);
      setShowRejectModal(false);
      setSelectedVansh(null);
      getVanshList(vanshParams);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "20%",
      wrap: true,
    },
    {
      name: "Community",
      selector: (row) => row.communityId?.name || "-",
      sortable: false,
      width: "20%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 80 ? `${desc.substring(0, 80)}...` : desc;
      },
      sortable: false,
      width: "30%",
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
          {row.status === "pending" && hasPermission(loggedInAdmin, "vansh", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Vansh"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Vansh"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "vansh", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/vansh/edit/${row._id}`)}
                title="Edit Vansh"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedVansh(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "vansh", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedVansh(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Vansh"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedVansh(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Vansh"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVansh(row);
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
      <AppBreadCrumb pageTitle="Vansh" crumbs={[{ name: "Vansh" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "vansh", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/vansh/add")}
                >
                  Add Vansh
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={vanshParams}
          setParams={setVanshParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingVanshList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedVansh?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedVansh?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedVansh?.isActive ? "deactivate" : "activate"} "${selectedVansh?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedVansh?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Vansh"
        body={`Are you sure you want to approve "${selectedVansh?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedVansh(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Vansh"
        body={`Are you sure you want to reject "${selectedVansh?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

VanshList.propTypes = {
  getVanshList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  vanshList: state.vansh.vanshList,
  loadingVanshList: state.vansh.loadingVanshList,
  sortingParams: state.vansh.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getVanshList,
  resetComponentStore,
  deleteVansh,
  hardDeleteVansh,
  toggleVanshStatus,
  restoreVansh,
  approveVansh,
  rejectVansh,
})(VanshList);
