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
  getStates,
  resetComponentStore,
  deleteState,
  hardDeleteState,
  toggleStateStatus,
  restoreState,
  approveState,
  rejectState,
} from "@src/actions/adminStateActions";

const StateList = ({
  loggedInUser,
  stateList: { data, count },
  getStates,
  loadingStatesList,
  deleteState,
  hardDeleteState,
  toggleStateStatus,
  restoreState,
  approveState,
  rejectState,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedState, setSelectedState] = React.useState(null);

  const [stateParams, setStateParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getStates(stateParams);
  }, [getStates, stateParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await deleteState(selectedState._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await hardDeleteState(selectedState._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await toggleStateStatus(selectedState._id, txnPassword);
      setShowToggleModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await restoreState(selectedState._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const handleApproveClick = (state) => {
    setSelectedState(state);
    setShowApproveModal(true);
  };

  const handleRejectClick = (state) => {
    setSelectedState(state);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await approveState(selectedState._id, txnPassword);
      setShowApproveModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedState && txnPassword) {
      await rejectState(selectedState._id, txnPassword);
      setShowRejectModal(false);
      setSelectedState(null);
      getStates(stateParams);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "30%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => (
        <div className="d-flex gap-1 flex-wrap">
          <Badge bg={row.isActive ? "success" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
          {row.isDeleted && (
            <Badge bg="danger">
              Deleted
            </Badge>
          )}
          {row.status && (
            <Badge bg={row.status === "active" ? "success" : row.status === "pending" ? "warning" : row.status === "rejected" ? "danger" : "warning"}>
              {row.status}
            </Badge>
          )}
        </div>
      ),
      sortable: false,
      width: "20%",
      wrap: true,
    },
    {
      name: "Country",
      selector: (row) => {
        if (row.countryId && typeof row.countryId === 'object') {
          return row.countryId.name || "-";
        }
        return "-";
      },
      sortable: false,
      width: "20%",
    },
    {
      name: "Actions",
      width: "25%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {row.status === "pending" && hasPermission(loggedInAdmin, "states", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve State"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject State"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "states", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/states/edit/${row._id}`)}
                title="Edit State"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedState(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "states", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedState(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete State"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedState(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore State"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedState(row);
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
      <AppBreadCrumb pageTitle="States" crumbs={[{ name: "States" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "states", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/states/add")}
                >
                  Add State
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={stateParams}
          setParams={setStateParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingStatesList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedState?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedState?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedState?.isActive ? "deactivate" : "activate"} "${selectedState?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedState?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve State"
        body={`Are you sure you want to approve "${selectedState?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedState(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject State"
        body={`Are you sure you want to reject "${selectedState?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

StateList.propTypes = {
  getStates: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  stateList: state.state.stateList || { data: [], count: 0 },
  loadingStatesList: state.state.loadingStatesList || false,
  sortingParams: state.state.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getStates,
  resetComponentStore,
  deleteState,
  hardDeleteState,
  toggleStateStatus,
  restoreState,
  approveState,
  rejectState,
})(StateList);
