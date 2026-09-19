import React, { useEffect, useState } from "react";
import { Container, Card, Row, Col, Button, Badge, Alert, Spinner } from "react-bootstrap";
import { PropTypes } from "prop-types";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaUserEdit, FaToggleOn, FaToggleOff, FaTrash, FaList } from "react-icons/fa";
import MainCard from "@src/views/Common/Cards/MainCard";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import {
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
} from "@src/actions/matrimonialActions";

const MatrimonialIndex = ({
  myProfile,
  loadingMe,
  applying,
  activating,
  deactivating,
  deleting,
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
}) => {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [incompleteFields, setIncompleteFields] = useState([]);

  useEffect(() => {
    getMyMatrimonialProfile();
  }, [getMyMatrimonialProfile]);

  const handleApply = async () => {
    setIncompleteFields([]);
    const result = await applyForMatrimonial();
    if (result && typeof result === "object" && result.missingFields?.length) {
      setIncompleteFields(result.missingFields);
    }
    if (result && result._id) getMyMatrimonialProfile();
  };

  const handleActivate = async () => {
    await activateMatrimonialProfile();
    getMyMatrimonialProfile();
  };

  const handleDeactivate = async () => {
    await deactivateMatrimonialProfile();
    getMyMatrimonialProfile();
  };

  const handleDelete = async () => {
    const done = await deleteMatrimonialProfile();
    if (done) {
      setDeleteConfirm(false);
      navigate("/user/matrimonial");
      getMyMatrimonialProfile();
    }
  };

  if (loadingMe && myProfile === undefined) {
    return <BouncingLoader minHeight="400px" />;
  }

  const hasProfile = myProfile && myProfile._id;
  const isActive = myProfile?.isActive === true;

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        <FaHeart className="me-2" />
        Matrimonial
      </h2>

      {!hasProfile && (
        <>
          {incompleteFields.length > 0 && (
            <Alert variant="warning" className="mb-4" dismissible onClose={() => setIncompleteFields([])}>
              <Alert.Heading>Complete these profile fields to apply</Alert.Heading>
              <p className="mb-2">The following fields are required for Matrimonial. Update them in your profile and try again.</p>
              <ul className="mb-3 mb-md-0">
                {incompleteFields.map((f) => (
                  <li key={f.path}><strong>{f.label}</strong></li>
                ))}
              </ul>
              <Button variant="warning" onClick={() => navigate("/user/profile")}>
                <FaUserEdit className="me-2" />
                Update Profile
              </Button>
            </Alert>
          )}
          <MainCard>
            <Card.Body>
              <p className="text-muted mb-3">
                You can browse all matrimonial profiles without applying. Apply only when you want your own profile to appear in the listings.
              </p>
              <p className="text-muted mb-4">
                After applying, your profile becomes visible immediately. You can edit your details from your main profile, and activate or deactivate visibility anytime.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Button variant="outline-primary" onClick={() => navigate("/user/matrimonial/list")}>
                  <FaList className="me-2" />
                  Browse Profiles
                </Button>
                <Button variant="primary" onClick={handleApply} disabled={applying}>
                  {applying ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Submitting...
                    </>
                  ) : (
                    "Apply for Matrimonial"
                  )}
                </Button>
              </div>
            </Card.Body>
          </MainCard>
        </>
      )}

      {hasProfile && (
        <>
          <Alert variant="info" className="mb-4">
            <strong>Visibility:</strong>{" "}
            <Badge bg={isActive ? "success" : "secondary"}>
              {isActive ? "Visible in listings" : "Hidden from listings"}
            </Badge>
          </Alert>

          <MainCard>
            <Card.Body>
              <Row>
                <Col md={12} className="mb-3">
                  <p className="mb-0">
                    Your matrimonial profile is linked to your main profile. To update your details, edit your profile first.
                  </p>
                </Col>
                <Col md={12} className="d-flex flex-wrap gap-2 align-items-center">
                  <Button variant="outline-primary" onClick={() => navigate("/user/profile")}>
                    <FaUserEdit className="me-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline-primary" onClick={() => navigate("/user/matrimonial/list")}>
                    <FaList className="me-2" />
                    Browse Profiles
                  </Button>
                  {isActive ? (
                    <Button
                      variant="outline-secondary"
                      onClick={handleDeactivate}
                      disabled={deactivating}
                    >
                      <FaToggleOff className="me-2" />
                      {deactivating ? "..." : "Deactivate (hide from listings)"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline-success"
                      onClick={handleActivate}
                      disabled={activating}
                    >
                      <FaToggleOn className="me-2" />
                      {activating ? "..." : "Activate (show in listings)"}
                    </Button>
                  )}
                  {!deleteConfirm ? (
                    <Button
                      variant="outline-danger"
                      onClick={() => setDeleteConfirm(true)}
                      disabled={deleting}
                    >
                      <FaTrash className="me-2" />
                      Delete Matrimonial Profile
                    </Button>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-danger small">Permanent. Are you sure?</span>
                      <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "..." : "Yes, Delete"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </MainCard>
        </>
      )}
    </Container>
  );
};

MatrimonialIndex.propTypes = {
  myProfile: PropTypes.object,
  loadingMe: PropTypes.bool,
  applying: PropTypes.bool,
  activating: PropTypes.bool,
  deactivating: PropTypes.bool,
  deleting: PropTypes.bool,
  getMyMatrimonialProfile: PropTypes.func.isRequired,
  applyForMatrimonial: PropTypes.func.isRequired,
  activateMatrimonialProfile: PropTypes.func.isRequired,
  deactivateMatrimonialProfile: PropTypes.func.isRequired,
  deleteMatrimonialProfile: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  myProfile: state.matrimonial?.myProfile ?? null,
  loadingMe: state.matrimonial?.loadingMe ?? false,
  applying: state.matrimonial?.applying ?? false,
  activating: state.matrimonial?.activating ?? false,
  deactivating: state.matrimonial?.deactivating ?? false,
  deleting: state.matrimonial?.deleting ?? false,
});

export default connect(mapStateToProps, {
  getMyMatrimonialProfile,
  applyForMatrimonial,
  activateMatrimonialProfile,
  deactivateMatrimonialProfile,
  deleteMatrimonialProfile,
})(MatrimonialIndex);
