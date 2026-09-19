import React from "react";
import { Button, Row, Col, Container, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";

// icons
import { RiDeleteBin5Line } from "react-icons/ri";
import { VscEye } from "react-icons/vsc";

// custom imports
import CustomDataTable from "@src/view/commonComponents/dataTable/CustomDataTable";
import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import VerificationConfirmModal from "../../modals/VerificationConfirmModal";
import { hasPermission } from "@src/utils/permissions";
import { getInitialSortingParams } from "@src/constants";

import {
  getVideos,
  resetComponentStore,
  deleteVideo,
} from "@src/actions/adminVideoActions";

const VideoList = ({
  loggedInUser,
  videoList: { data, count },
  getVideos,
  loadingVideoList,
  resetComponentStore,
  sortingParams,
  deleteVideo,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  const { page, limit } = sortingParams;

  const [videoParams, setVideoParams] = React.useState(() =>
    getInitialSortingParams()
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getVideos(videoParams);
  }, [getVideos, videoParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = (txnPassword) => {
    if (selectedVideo && txnPassword) {
      deleteVideo(selectedVideo._id, txnPassword);
      setShowModal(false);
      setSelectedVideo(null);
    }
  };

  const columns = [
    {
      name: "Title",
      selector: (row) => row.title || "-",
      sortable: false,
      width: "30%",
      wrap: true,
    },
    {
      name: "Embed URL",
      selector: (row) => (
        <a
          href={row.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="table-link-cell"
        >
          {row.embedUrl || "-"}
        </a>
      ),
      sortable: false,
      width: "30%",
      wrap: true,
    },
    {
      name: "Display Order",
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
      width: "10%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {hasPermission(loggedInAdmin, "video", "edit") && (
            <Link
              to={`/admin/video/edit/${row._id}`}
              title="View/Edit Video"
              className="text-primary"
            >
              <VscEye size={20} />
            </Link>
          )}
          {hasPermission(loggedInAdmin, "video", "delete") && (
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => {
                setSelectedVideo(row);
                setShowModal(true);
              }}
              title="Delete Video"
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
      <AppBreadCrumb pageTitle="Videos" crumbs={[{ name: "Videos" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "video", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/video/add")}
                >
                  Add Video
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={videoParams}
          setParams={setVideoParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingVideoList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showModal}
        handleClose={() => {
          setShowModal(false);
          setSelectedVideo(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Deletion"
        body={`Are you sure you want to delete this video? This action cannot be undone. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />
    </Container>
  );
};

VideoList.propTypes = {
  getVideos: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  videoList: state.video.videoList,
  loadingVideoList: state.video.loadingVideoList,
  sortingParams: state.video.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getVideos,
  resetComponentStore,
  deleteVideo,
})(VideoList);
