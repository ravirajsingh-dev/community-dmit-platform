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
  getGotraList,
  resetComponentStore,
  deleteGotra,
  hardDeleteGotra,
  toggleGotraStatus,
  restoreGotra,
  approveGotra,
  rejectGotra,
} from "@src/actions/adminGotraActions";

const GotraList = ({
  loggedInUser,
  gotraList: { data, count },
  getGotraList,
  loadingGotraList,
  resetComponentStore,
  sortingParams,
  deleteGotra,
  hardDeleteGotra,
  toggleGotraStatus,
  restoreGotra,
  approveGotra,
  rejectGotra,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedGotra, setSelectedGotra] = React.useState(null);

  const [gotraParams, setGotraParams] = React.useState(() =>
    getInitialSortingParams({
      orderBy: "createdAt",
      ascending: "desc",
      search: "",
      communityId: "",
      vanshId: "",
      kulId: "",
      khampId: "",
    })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getGotraList(gotraParams);
  }, [getGotraList, gotraParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await deleteGotra(selectedGotra._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await hardDeleteGotra(selectedGotra._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await toggleGotraStatus(selectedGotra._id, txnPassword);
      setShowToggleModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await restoreGotra(selectedGotra._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
    }
  };

  const handleApproveClick = (gotra) => {
    setSelectedGotra(gotra);
    setShowApproveModal(true);
  };

  const handleRejectClick = (gotra) => {
    setSelectedGotra(gotra);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await approveGotra(selectedGotra._id, txnPassword);
      setShowApproveModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedGotra && txnPassword) {
      await rejectGotra(selectedGotra._id, txnPassword);
      setShowRejectModal(false);
      setSelectedGotra(null);
      getGotraList(gotraParams);
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
      width: "10%",
      wrap: true,
    },
    {
      name: "Vansh",
      selector: (row) => row.vanshId?.name || "-",
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Kul",
      selector: (row) => row.kulId?.name || "-",
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Khamp",
      selector: (row) => row.khampId?.name || "-",
      sortable: false,
      width: "10%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
      },
      sortable: false,
      width: "18%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <div className="d-flex gap-1 flex-wrap">
          {row.status && (
            <Badge
              bg={
                row.status === "active"
                  ? "success"
                  : row.status === "pending"
                    ? "warning"
                    : row.status === "rejected"
                      ? "danger"
                      : "warning"
              }
            >
              {row.status}
            </Badge>
          )}
          <Badge bg={row.isActive ? "success" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
          {row.isDeleted && <Badge bg="danger">Deleted</Badge>}
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
          {row.status === "pending" &&
            hasPermission(loggedInAdmin, "gotra", "edit") && (
              <>
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => handleApproveClick(row)}
                  title="Approve Gotra"
                >
                  <FaCheckCircle size={18} />
                </Button>
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => handleRejectClick(row)}
                  title="Reject Gotra"
                >
                  <FaTimesCircle size={18} />
                </Button>
              </>
            )}
          {hasPermission(loggedInAdmin, "gotra", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/gotra/edit/${row._id}`)}
                title="Edit Gotra"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={
                  row.isActive ? "text-warning p-0" : "text-success p-0"
                }
                onClick={() => {
                  setSelectedGotra(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? (
                  <TbToggleRight size={20} />
                ) : (
                  <TbToggleLeft size={20} />
                )}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "gotra", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedGotra(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Gotra"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedGotra(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Gotra"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGotra(row);
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
      <AppBreadCrumb pageTitle="Gotra" crumbs={[{ name: "Gotra" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "gotra", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/gotra/add")}
                >
                  Add Gotra
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={gotraParams}
          setParams={setGotraParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingGotraList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedGotra?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedGotra?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedGotra?.isActive ? "deactivate" : "activate"} "${selectedGotra?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedGotra?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Gotra"
        body={`Are you sure you want to approve "${selectedGotra?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedGotra(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Gotra"
        body={`Are you sure you want to reject "${selectedGotra?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

GotraList.propTypes = {
  getGotraList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gotraList: state.gotra.gotraList,
  loadingGotraList: state.gotra.loadingGotraList,
  sortingParams: state.gotra.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getGotraList,
  resetComponentStore,
  deleteGotra,
  hardDeleteGotra,
  toggleGotraStatus,
  restoreGotra,
  approveGotra,
  rejectGotra,
})(GotraList);
