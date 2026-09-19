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
  getDistricts,
  resetComponentStore,
  deleteDistrict,
  hardDeleteDistrict,
  toggleDistrictStatus,
  restoreDistrict,
  approveDistrict,
  rejectDistrict,
} from "@src/actions/adminDistrictActions";

const DistrictList = ({
  loggedInUser,
  districtList: { data, count },
  getDistricts,
  loadingDistrictsList,
  deleteDistrict,
  hardDeleteDistrict,
  toggleDistrictStatus,
  restoreDistrict,
  approveDistrict,
  rejectDistrict,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedDistrict, setSelectedDistrict] = React.useState(null);

  const [districtParams, setDistrictParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getDistricts(districtParams);
  }, [getDistricts, districtParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await deleteDistrict(selectedDistrict._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await hardDeleteDistrict(selectedDistrict._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await toggleDistrictStatus(selectedDistrict._id, txnPassword);
      setShowToggleModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await restoreDistrict(selectedDistrict._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
    }
  };

  const handleApproveClick = (district) => {
    setSelectedDistrict(district);
    setShowApproveModal(true);
  };

  const handleRejectClick = (district) => {
    setSelectedDistrict(district);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await approveDistrict(selectedDistrict._id, txnPassword);
      setShowApproveModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedDistrict && txnPassword) {
      await rejectDistrict(selectedDistrict._id, txnPassword);
      setShowRejectModal(false);
      setSelectedDistrict(null);
      getDistricts(districtParams);
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
      name: "State",
      selector: (row) => {
        if (row.stateId && typeof row.stateId === 'object') {
          return row.stateId.name || "-";
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
          {row.status === "pending" && hasPermission(loggedInAdmin, "districts", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve District"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject District"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "districts", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/districts/edit/${row._id}`)}
                title="Edit District"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedDistrict(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "districts", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedDistrict(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete District"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedDistrict(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore District"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDistrict(row);
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
      <AppBreadCrumb pageTitle="Districts" crumbs={[{ name: "Districts" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "districts", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/districts/add")}
                >
                  Add District
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={districtParams}
          setParams={setDistrictParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingDistrictsList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedDistrict?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedDistrict?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedDistrict?.isActive ? "deactivate" : "activate"} "${selectedDistrict?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedDistrict?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve District"
        body={`Are you sure you want to approve "${selectedDistrict?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedDistrict(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject District"
        body={`Are you sure you want to reject "${selectedDistrict?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

DistrictList.propTypes = {
  getDistricts: PropTypes.func.isRequired,
};

const mapDistrictToProps = (district) => ({
  districtList: district.district.districtList || { data: [], count: 0 },
  loadingDistrictsList: district.district.loadingDistrictsList || false,
  sortingParams: district.district.sortingParams,
  loggedInUser: district.adminAuth.admin,
});

export default connect(mapDistrictToProps, {
  getDistricts,
  resetComponentStore,
  deleteDistrict,
  hardDeleteDistrict,
  toggleDistrictStatus,
  restoreDistrict,
  approveDistrict,
  rejectDistrict,
})(DistrictList);
