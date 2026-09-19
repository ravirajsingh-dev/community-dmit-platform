import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Container, Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import { getFamilyTree } from "@src/actions/familyActions";
import { FAMILY_LOADER_MESSAGES } from "@src/constants/familyConstants";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import FamilyTreeView from "./components/FamilyTreeView";

const FamilyTreePage = ({ family, getFamilyTree }) => {
  const navigate = useNavigate();
  const { loadingTree, tree } = family;

  useEffect(() => {
    getFamilyTree();
  }, [getFamilyTree]);

  return (
    <Container className="card-profile-container">
      <Card className="shadow-sm mb-3">
        <Card.Body className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="mb-1">Family Tree</h4>
            <div className="text-muted small">Read-only view</div>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/user/family")}
            >
              Manage Family
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {loadingTree ? (
            <BouncingLoader
              minHeight="400px"
              message={FAMILY_LOADER_MESSAGES.LOADING_TREE}
            />
          ) : tree?.tree ? (
            <FamilyTreeView treeData={tree} />
          ) : (
            <div className="text-center text-muted py-5">
              <p className="mb-0">No family tree yet.</p>
              <p className="small mb-0">
                Initialize your root from Manage Family, then add members and
                build the hierarchy.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

FamilyTreePage.propTypes = {
  family: PropTypes.shape({
    loadingTree: PropTypes.bool,
    tree: PropTypes.object,
  }).isRequired,
  getFamilyTree: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  family: state.family,
});

export default connect(mapStateToProps, { getFamilyTree })(FamilyTreePage);
