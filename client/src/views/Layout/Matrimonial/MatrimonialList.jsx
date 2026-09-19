import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Badge,
  Form,
} from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaArrowLeft,
  FaFilter,
  FaSearch,
  FaUser,
} from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordFound from "@src/views/Common/NotFound/NoRecordFound";
import { getMatrimonialList } from "@src/actions/matrimonialActions";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchGotras,
} from "@src/actions/masterDataActions";
import {
  fetchCountries,
  fetchStates,
  fetchDistricts,
  fetchVillages,
} from "@src/actions/locationActions";
import { EducationOptions } from "@src/constants/educationConstants";

const MARITAL_OPTIONS = [
  { value: "", label: "Any" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "remarried", label: "Remarried" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const detailsFrom = (item) => {
  const ud = item.userDetails || item.userDetailsId || {};
  return {
    fatherName: ud.fatherName ?? "-",
    motherName: ud.motherName ?? "-",
    education: ud.education ?? "-",
    occupation: ud.occupation ?? "-",
    maritalStatus: ud.maritalStatus ?? "-",
    gender: ud.gender ?? "-",
    dob: ud.dob,
    community: item.community?.name ?? ud.community?.name ?? "-",
  };
};

const MatrimonialList = ({
  list,
  listPagination,
  loadingList,
  getMatrimonialList,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [filters, setFilters] = useState({
    communityScope: "my_community",
    communityId: "",
    vanshId: "",
    kulId: "",
    khampId: "",
    gotraId: "",
    gender: "",
    maritalStatus: "",
    education: "",
    occupation: "",
    countryId: "",
    stateId: "",
    districtId: "",
    villageId: "",
    ageMin: "",
    ageMax: "",
    search: "",
  });

  const loadOptions = async () => {
    await dispatch(fetchCommunities());
    await dispatch(fetchCountries());
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const fetchList = (p, f) => {
    const params = { page: p ?? page, limit, ...(f ?? filters) };
    Object.keys(params).forEach((k) => {
      if (params[k] === "" || params[k] == null) delete params[k];
    });
    getMatrimonialList(params);
  };

  useEffect(() => {
    fetchList();
  }, [page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "communityId"
        ? { vanshId: "", kulId: "", khampId: "", gotraId: "" }
        : {}),
      ...(key === "vanshId" ? { kulId: "", khampId: "", gotraId: "" } : {}),
      ...(key === "kulId" ? { khampId: "", gotraId: "" } : {}),
      ...(key === "khampId" ? { gotraId: "" } : {}),
    }));
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchList(1, filters);
  };

  const total = listPagination?.total ?? 0;
  const pages = listPagination?.pages ?? 0;
  const hasMore = page < pages;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FaHeart className="me-2" />
          Matrimonial Profiles
        </h2>
        <Button
          variant="outline-secondary"
          onClick={() => navigate("/user/matrimonial")}
        >
          <FaArrowLeft className="me-2" />
          Back
        </Button>
      </div>

      <p className="text-muted mb-3">
        Browse profiles. By default you see your community; if none are
        available, all profiles are shown. Use filters to narrow down.
      </p>

      <MainCard className="mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
            <Form.Group>
              <Form.Label className="small">Scope</Form.Label>
              <Form.Select
                value={filters.communityScope}
                onChange={(e) =>
                  handleFilterChange("communityScope", e.target.value)
                }
              >
                <option value="my_community">My Community</option>
                <option value="all">All Communities</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label className="small">
                Search (name / email / phone / Member ID)
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </Form.Group>
            <Button
              variant="outline-primary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter className="me-2" />
              {showFilters ? "Hide filters" : "More filters"}
            </Button>
            <Button variant="primary" onClick={handleSearch}>
              <FaSearch className="me-2" />
              Search
            </Button>
          </div>

          {showFilters && (
            <Row className="g-2 mt-2 pt-3 border-top">
              <Col md={6} lg={2}>
                <Form.Label className="small">Gender</Form.Label>
                <Form.Select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange("gender", e.target.value)}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Marital status</Form.Label>
                <Form.Select
                  value={filters.maritalStatus}
                  onChange={(e) =>
                    handleFilterChange("maritalStatus", e.target.value)
                  }
                >
                  {MARITAL_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Education</Form.Label>
                <Form.Select
                  value={filters.education}
                  onChange={(e) =>
                    handleFilterChange("education", e.target.value)
                  }
                >
                  <option value="">Any</option>
                  {EducationOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Occupation</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Any"
                  value={filters.occupation}
                  onChange={(e) =>
                    handleFilterChange("occupation", e.target.value)
                  }
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Age from</Form.Label>
                <Form.Control
                  type="number"
                  min={18}
                  max={100}
                  placeholder="18"
                  value={filters.ageMin}
                  onChange={(e) => handleFilterChange("ageMin", e.target.value)}
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label className="small">Age to</Form.Label>
                <Form.Control
                  type="number"
                  min={18}
                  max={100}
                  placeholder="60"
                  value={filters.ageMax}
                  onChange={(e) => handleFilterChange("ageMax", e.target.value)}
                />
              </Col>
            </Row>
          )}
        </Card.Body>
      </MainCard>

      {loadingList && list.length === 0 ? (
        <BouncingLoader minHeight="400px" />
      ) : list.length === 0 ? (
        <NoRecordFound message="No matrimonial profiles found. Try changing filters or scope." />
      ) : (
        <>
          <Row>
            {list.map((m) => {
              const user = m.user || m.userId || {};
              const d = detailsFrom(m);
              const name = user.name ?? "-";
              const memberId = user.memberId ?? "-";
              const age = d.dob
                ? Math.floor(
                    (new Date() - new Date(d.dob)) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : null;
              return (
                <Col key={m._id} md={6} lg={4} className="mb-4">
                  <MainCard>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="mb-0">{name}</h5>
                        {age != null && <Badge bg="secondary">{age} yrs</Badge>}
                      </div>
                      <p className="text-muted small mb-1">
                        Member ID: {memberId}
                      </p>
                      <p className="small mb-1">
                        <strong>Community:</strong> {d.community}
                      </p>
                      <p className="small mb-1">
                        <strong>Father:</strong> {d.fatherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Mother:</strong> {d.motherName}
                      </p>
                      <p className="small mb-1">
                        <strong>Education:</strong> {d.education}
                      </p>
                      <p className="small mb-1">
                        <strong>Occupation:</strong> {d.occupation}
                      </p>
                      <p className="small mb-3">
                        <strong>Marital:</strong> {d.maritalStatus}
                      </p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          navigate(`/user/matrimonial/profile/${m._id}`)
                        }
                      >
                        <FaUser className="me-2" />
                        View full profile
                      </Button>
                    </Card.Body>
                  </MainCard>
                </Col>
              );
            })}
          </Row>
          {pages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Page {page} of {pages} ({total} total)
              </span>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="ms-2"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

MatrimonialList.propTypes = {
  list: PropTypes.array,
  listPagination: PropTypes.object,
  loadingList: PropTypes.bool,
  getMatrimonialList: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  list: state.matrimonial?.list ?? [],
  listPagination: state.matrimonial?.listPagination ?? {},
  loadingList: state.matrimonial?.loadingList ?? false,
});

export default connect(mapStateToProps, {
  getMatrimonialList,
})(MatrimonialList);
