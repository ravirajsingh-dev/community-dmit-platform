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
  getVillages,
  resetComponentStore,
  deleteVillage,
  hardDeleteVillage,
  toggleVillageStatus,
  restoreVillage,
  approveVillage,
  rejectVillage,
} from "@src/actions/adminVillageActions";

const VillageList = ({
  loggedInUser,
  villageList: { data, count },
  getVillages,
  loadingVillagesList,
  deleteVillage,
  hardDeleteVillage,
  toggleVillageStatus,
  restoreVillage,
  approveVillage,
  rejectVillage,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedVillage, setSelectedVillage] = React.useState(null);

  const [villageParams, setVillageParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getVillages(villageParams);
  }, [getVillages, villageParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await deleteVillage(selectedVillage._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await hardDeleteVillage(selectedVillage._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await toggleVillageStatus(selectedVillage._id, txnPassword);
      setShowToggleModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await restoreVillage(selectedVillage._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
    }
  };

  const handleApproveClick = (village) => {
    setSelectedVillage(village);
    setShowApproveModal(true);
  };

  const handleRejectClick = (village) => {
    setSelectedVillage(village);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await approveVillage(selectedVillage._id, txnPassword);
      setShowApproveModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedVillage && txnPassword) {
      await rejectVillage(selectedVillage._id, txnPassword);
      setShowRejectModal(false);
      setSelectedVillage(null);
      getVillages(villageParams);
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
      name: "District",
      selector: (row) => {
        if (row.districtId && typeof row.districtId === 'object') {
          return row.districtId.name || "-";
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
          {row.status === "pending" && hasPermission(loggedInAdmin, "villages", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Village"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Village"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "villages", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/villages/edit/${row._id}`)}
                title="Edit Village"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedVillage(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "villages", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedVillage(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Village"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedVillage(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Village"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVillage(row);
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
      <AppBreadCrumb pageTitle="Villages" crumbs={[{ name: "Villages" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "villages", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/villages/add")}
                >
                  Add Village
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={villageParams}
          setParams={setVillageParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingVillagesList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedVillage?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedVillage?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedVillage?.isActive ? "deactivate" : "activate"} "${selectedVillage?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedVillage?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Village"
        body={`Are you sure you want to approve "${selectedVillage?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedVillage(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Village"
        body={`Are you sure you want to reject "${selectedVillage?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

VillageList.propTypes = {
  getVillages: PropTypes.func.isRequired,
};

const mapVillageToProps = (village) => ({
  villageList: village.village.villageList || { data: [], count: 0 },
  loadingVillagesList: village.village.loadingVillagesList || false,
  sortingParams: village.village.sortingParams,
  loggedInUser: village.adminAuth.admin,
});

export default connect(mapVillageToProps, {
  getVillages,
  resetComponentStore,
  deleteVillage,
  hardDeleteVillage,
  toggleVillageStatus,
  restoreVillage,
  approveVillage,
  rejectVillage,
})(VillageList);
