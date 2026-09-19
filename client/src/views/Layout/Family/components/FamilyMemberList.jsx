import React from "react";
import PropTypes from "prop-types";
import { Card, Button, Badge } from "react-bootstrap";
import CustomDataTable from "@src/views/Common/DataTable/CustomDataTable";

/**
 * Members list only. Same CustomDataTable usage as UsersList: data, count, params, setParams from Redux/parent.
 */
const FamilyMemberList = ({
  data = [],
  count = 0,
  params,
  setParams,
  progressPending,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      name: "Name",
      selector: (row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unnamed",
      cell: (row) => {
        const deceased = row.isAlive === false;
        return (
          <>
            {deceased && (
              <span className="me-1" title="Deceased">
                &#9760;
              </span>
            )}
            {`${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unnamed"}
          </>
        );
      },
      width: "200px",
      wrap: true,
    },
    {
      name: "Gender",
      selector: (row) => row.gender || "other",
      cell: (row) => (
        <span className="text-capitalize">{row.gender || "other"}</span>
      ),
      width: "100px",
    },
    {
      name: "Status",
      selector: (row) => row.isAlive === false,
      cell: (row) =>
        row.isAlive === false ? (
          <Badge bg="secondary">Deceased</Badge>
        ) : (
          <Badge bg="success">Alive</Badge>
        ),
      width: "120px",
    },
    {
      name: "Actions",
      width: "180px",
      cell: (row) => (
        <div className="d-flex gap-1 justify-content-end">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete(row)}
            disabled={progressPending}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <h5 className="mb-3">Members</h5>
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={params}
          setParams={setParams}
          pagination
          responsive
          striped={true}
          progressPending={progressPending}
          highlightOnHover
          persistTableHead={true}
          paginationServer
        />
      </Card.Body>
    </Card>
  );
};

FamilyMemberList.propTypes = {
  data: PropTypes.array,
  count: PropTypes.number,
  params: PropTypes.shape({
    page: PropTypes.number,
    limit: PropTypes.number,
  }).isRequired,
  setParams: PropTypes.func.isRequired,
  progressPending: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default FamilyMemberList;
