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
  getCommunities,
  resetComponentStore,
  deleteCommunity,
  hardDeleteCommunity,
  toggleCommunityStatus,
  restoreCommunity,
  approveCommunity,
  rejectCommunity,
} from "@src/actions/adminCommunityActions";

const CommunityList = ({
  loggedInUser,
  communityList: { data, count },
  getCommunities,
  loadingCommunitiesList,
  resetComponentStore,
  sortingParams,
  deleteCommunity,
  hardDeleteCommunity,
  toggleCommunityStatus,
  restoreCommunity,
  approveCommunity,
  rejectCommunity,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedCommunity, setSelectedCommunity] = React.useState(null);

  const [communityParams, setCommunityParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getCommunities(communityParams);
  }, [getCommunities, communityParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await deleteCommunity(selectedCommunity._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await hardDeleteCommunity(selectedCommunity._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await toggleCommunityStatus(selectedCommunity._id, txnPassword);
      setShowToggleModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await restoreCommunity(selectedCommunity._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const handleApproveClick = (community) => {
    setSelectedCommunity(community);
    setShowApproveModal(true);
  };

  const handleRejectClick = (community) => {
    setSelectedCommunity(community);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await approveCommunity(selectedCommunity._id, txnPassword);
      setShowApproveModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedCommunity && txnPassword) {
      await rejectCommunity(selectedCommunity._id, txnPassword);
      setShowRejectModal(false);
      setSelectedCommunity(null);
      getCommunities(communityParams);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      sortField: "name",
      width: "25%",
      wrap: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const desc = row.description || "-";
        return desc.length > 100 ? `${desc.substring(0, 100)}...` : desc;
      },
      sortable: false,
      width: "35%",
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
          {row.status === "pending" && hasPermission(loggedInAdmin, "communities", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Community"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Community"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "communities", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/communities/edit/${row._id}`)}
                title="Edit Community"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedCommunity(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "communities", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedCommunity(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Community"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedCommunity(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Community"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCommunity(row);
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
      <AppBreadCrumb pageTitle="Communities" crumbs={[{ name: "Communities" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "communities", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/communities/add")}
                >
                  Add Community
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={communityParams}
          setParams={setCommunityParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingCommunitiesList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedCommunity?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedCommunity?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedCommunity?.isActive ? "deactivate" : "activate"} "${selectedCommunity?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedCommunity?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Community"
        body={`Are you sure you want to approve "${selectedCommunity?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedCommunity(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Community"
        body={`Are you sure you want to reject "${selectedCommunity?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

CommunityList.propTypes = {
  getCommunities: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  communityList: state.community.communityList,
  loadingCommunitiesList: state.community.loadingCommunitiesList,
  sortingParams: state.community.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getCommunities,
  resetComponentStore,
  deleteCommunity,
  hardDeleteCommunity,
  toggleCommunityStatus,
  restoreCommunity,
  approveCommunity,
  rejectCommunity,
})(CommunityList);
