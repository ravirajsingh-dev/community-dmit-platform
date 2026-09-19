import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";

import { RiDeleteBin5Line } from "react-icons/ri";
import { VscEdit } from "react-icons/vsc";

import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";
import { getInitialSortingParams } from "@src/constants";

import {
  getTrainingVideos,
  resetTrainingVideoStore,
  deleteTrainingVideo,
} from "@src/actions/adminTrainingVideoActions";
import TrainingModal from "./TrainingModal";

const TrainingList = ({
  loggedInUser,
  trainingVideoList: { data, count },
  getTrainingVideos,
  loadingTrainingVideoList,
  resetTrainingVideoStore,
  sortingParams,
  deleteTrainingVideo,
}) => {
  const location = useLocation();
  const loggedInAdmin = loggedInUser;
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [editingVideo, setEditingVideo] = React.useState(null);

  const { page, limit } = sortingParams;

  const [trainingParams, setTrainingParams] = React.useState(() =>
    getInitialSortingParams()
  );

  React.useEffect(() => {
    if (!loggedInUser) {
      return;
    }

    // Always refetch on navigation or parameter change so latest data is shown
    resetTrainingVideoStore();
    getTrainingVideos(trainingParams);
  }, [
    loggedInUser,
    location.key,
    getTrainingVideos,
    trainingParams,
    resetTrainingVideoStore,
  ]);

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedVideo && txnPassword) {
      deleteTrainingVideo(selectedVideo._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedVideo(null);
    }
  };

  const openCreateModal = () => {
    setEditingVideo(null);
    setShowFormModal(true);
  };

  const openEditModal = (row) => {
    setEditingVideo(row);
    setShowFormModal(true);
  };

  const handleFormModalClose = () => {
    setShowFormModal(false);
    setEditingVideo(null);
  };

  const handleTrainingSaveSuccess = () => {
    resetTrainingVideoStore();
    getTrainingVideos(trainingParams);
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
      name: "Designation",
      selector: (row) =>
        (row.designationNames && row.designationNames.length
          ? row.designationNames.join(", ")
          : "-"),
      sortable: false,
      width: "30%",
      wrap: true,
    },
    {
      name: "Order",
      selector: (row) => row.displayOrder,
      sortable: true,
      sortField: "displayOrder",
      width: "15%",
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
      width: "15%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "15%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "training-videos", "edit") && (
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() => openEditModal(row)}
              title="Edit Training Content"
            >
              <VscEdit size={20} />
            </Button>
          )}
          {hasPermission(loggedInAdmin, "training-videos", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedVideo(row);
                setShowDeleteModal(true);
              }}
              title="Delete Training Content"
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
        pageTitle="Training Content"
        crumbs={[{ name: "Training Content" }]}
      />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "training-videos", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={openCreateModal}
                >
                  Add Training Content
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={trainingParams}
          setParams={setTrainingParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingTrainingVideoList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedVideo(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body={`Are you sure you want to delete this training content? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      {showFormModal && (
        <TrainingModal
          show={showFormModal}
          handleClose={handleFormModalClose}
          trainingVideo={editingVideo}
          onSuccess={handleTrainingSaveSuccess}
        />
      )}
    </Container>
  );
};

TrainingList.propTypes = {
  getTrainingVideos: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  trainingVideoList: state.training.trainingVideoList,
  loadingTrainingVideoList: state.training.loadingTrainingVideoList,
  sortingParams: state.training.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getTrainingVideos,
  resetTrainingVideoStore,
  deleteTrainingVideo,
})(TrainingList);

