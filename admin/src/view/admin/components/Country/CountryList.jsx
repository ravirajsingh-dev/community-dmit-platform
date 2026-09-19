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
  getCountries,
  resetComponentStore,
  deleteCountry,
  hardDeleteCountry,
  toggleCountryStatus,
  restoreCountry,
  approveCountry,
  rejectCountry,
} from "@src/actions/adminCountryActions";

const CountryList = ({
  loggedInUser,
  countryList: { data, count },
  getCountries,
  loadingCountriesList,
  resetComponentStore,
  sortingParams,
  deleteCountry,
  hardDeleteCountry,
  toggleCountryStatus,
  restoreCountry,
  approveCountry,
  rejectCountry,
}) => {
  const loggedInAdmin = loggedInUser;
  const [onlyOnce, setOnce] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = React.useState(false);
  const [showToggleModal, setShowToggleModal] = React.useState(false);
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);
  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState(null);

  const [countryParams, setCountryParams] = React.useState(() =>
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc", search: "" })
  );

  const navigate = useNavigate();
  React.useEffect(() => {
    if (onlyOnce) {
      resetComponentStore();
      setOnce(false);
    }

    if (!loggedInUser) return;

    getCountries(countryParams);
  }, [getCountries, countryParams, resetComponentStore, loggedInUser]);

  const handleConfirmDeletion = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await deleteCountry(selectedCountry._id, txnPassword);
      setShowDeleteModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
    }
  };

  const handleConfirmHardDeletion = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await hardDeleteCountry(selectedCountry._id, txnPassword);
      setShowHardDeleteModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
    }
  };

  const handleConfirmToggle = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await toggleCountryStatus(selectedCountry._id, txnPassword);
      setShowToggleModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
    }
  };

  const handleConfirmRestore = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await restoreCountry(selectedCountry._id, txnPassword);
      setShowRestoreModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
    }
  };

  const handleApproveClick = (country) => {
    setSelectedCountry(country);
    setShowApproveModal(true);
  };

  const handleRejectClick = (country) => {
    setSelectedCountry(country);
    setShowRejectModal(true);
  };

  const handleConfirmApprove = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await approveCountry(selectedCountry._id, txnPassword);
      setShowApproveModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
    }
  };

  const handleConfirmReject = async (txnPassword) => {
    if (selectedCountry && txnPassword) {
      await rejectCountry(selectedCountry._id, txnPassword);
      setShowRejectModal(false);
      setSelectedCountry(null);
      getCountries(countryParams);
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
          <Badge bg={row.status === "active" ? "success" : row.status === "pending" ? "warning" : row.status === "rejected" ? "danger" : "warning"}>
            {row.status || "pending"}
          </Badge>
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
      width: "25%",
      wrap: true,
    },
    {
      name: "Actions",
      width: "30%",
      cell: (row) => (
        <div className="d-flex gap-2">
          {row.status === "pending" && hasPermission(loggedInAdmin, "countries", "edit") && (
            <>
              <Button
                variant="link"
                className="text-success p-0"
                onClick={() => handleApproveClick(row)}
                title="Approve Country"
              >
                <FaCheckCircle size={18} />
              </Button>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => handleRejectClick(row)}
                title="Reject Country"
              >
                <FaTimesCircle size={18} />
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "countries", "edit") && (
            <>
              <Button
                variant="link"
                className="text-primary p-0"
                onClick={() => navigate(`/admin/countries/edit/${row._id}`)}
                title="Edit Country"
              >
                <VscEdit size={20} />
              </Button>
              <Button
                variant="link"
                className={row.isActive ? "text-warning p-0" : "text-success p-0"}
                onClick={() => {
                  setSelectedCountry(row);
                  setShowToggleModal(true);
                }}
                title={row.isActive ? "Deactivate" : "Activate"}
              >
                {row.isActive ? <TbToggleRight size={20} /> : <TbToggleLeft size={20} />}
              </Button>
            </>
          )}
          {hasPermission(loggedInAdmin, "countries", "delete") && (
            <>
              {!row.isDeleted && (
                <Button
                  variant="link"
                  className="text-danger p-0"
                  onClick={() => {
                    setSelectedCountry(row);
                    setShowDeleteModal(true);
                  }}
                  title="Delete Country"
                >
                  <RiDeleteBin5Line size={20} />
                </Button>
              )}
              {row.isDeleted && (
                <Button
                  variant="link"
                  className="text-success p-0"
                  onClick={() => {
                    setSelectedCountry(row);
                    setShowRestoreModal(true);
                  }}
                  title="Restore Country"
                >
                  <RiRestartLine size={20} />
                </Button>
              )}
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCountry(row);
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
      <AppBreadCrumb pageTitle="Countries" crumbs={[{ name: "Countries" }]} />

      <MainCard>
        <div className="table-filter-section mb-3">
          <Row className="d-flex justify-content-between">
            <Col md="4">
              {hasPermission(loggedInAdmin, "countries", "create") && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/admin/countries/add")}
                >
                  Add Country
                </Button>
              )}
            </Col>
          </Row>
        </div>

        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={countryParams}
          setParams={setCountryParams}
          pagination
          responsive
          striped={true}
          progressPending={loadingCountriesList}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </MainCard>

      <VerificationConfirmModal
        show={showDeleteModal}
        handleClose={() => {
          setShowDeleteModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmDeletion}
        title="Confirm Soft Deletion"
        body={`Are you sure you want to soft delete "${selectedCountry?.name}"? This will mark it as deleted but keep the data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete"
      />

      <VerificationConfirmModal
        show={showHardDeleteModal}
        handleClose={() => {
          setShowHardDeleteModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmHardDeletion}
        title="Confirm Permanent Deletion"
        body={`Are you sure you want to permanently delete "${selectedCountry?.name}"? This action cannot be undone and will delete all related data. Please enter your transaction password to confirm.`}
        submitBtnText="Delete Permanently"
      />

      <VerificationConfirmModal
        show={showToggleModal}
        handleClose={() => {
          setShowToggleModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmToggle}
        title="Confirm Status Change"
        body={`Are you sure you want to ${selectedCountry?.isActive ? "deactivate" : "activate"} "${selectedCountry?.name}"? Please enter your transaction password to confirm.`}
        submitBtnText="Confirm"
      />

      <VerificationConfirmModal
        show={showRestoreModal}
        handleClose={() => {
          setShowRestoreModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmRestore}
        title="Confirm Restore"
        body={`Are you sure you want to restore "${selectedCountry?.name}"? This will make it available again. Please enter your transaction password to confirm.`}
        submitBtnText="Restore"
      />

      <VerificationConfirmModal
        show={showApproveModal}
        handleClose={() => {
          setShowApproveModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmApprove}
        title="Approve Country"
        body={`Are you sure you want to approve "${selectedCountry?.name}"? This will set its status to active. Please enter your transaction password to confirm.`}
        submitBtnText="Approve"
      />

      <VerificationConfirmModal
        show={showRejectModal}
        handleClose={() => {
          setShowRejectModal(false);
          setSelectedCountry(null);
        }}
        handleConfirm={handleConfirmReject}
        title="Reject Country"
        body={`Are you sure you want to reject "${selectedCountry?.name}"? This will set its status to rejected. Please enter your transaction password to confirm.`}
        submitBtnText="Reject"
      />
    </Container>
  );
};

CountryList.propTypes = {
  getCountries: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  countryList: state.country.countryList,
  loadingCountriesList: state.country.loadingCountriesList,
  sortingParams: state.country.sortingParams,
  loggedInUser: state.adminAuth.admin,
});

export default connect(mapStateToProps, {
  getCountries,
  resetComponentStore,
  deleteCountry,
  hardDeleteCountry,
  toggleCountryStatus,
  restoreCountry,
  approveCountry,
  rejectCountry,
})(CountryList);
