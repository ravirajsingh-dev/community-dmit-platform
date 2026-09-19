import React from "react";
import PropTypes from "prop-types";
import { Card, Badge } from "react-bootstrap";

const PersonCard = ({ person, variant = "light" }) => {
  if (!person) return null;
  return (
    <Card className={`family-tree__person family-tree__person--${variant}`}>
      <Card.Body className="p-2">
        <div className="d-flex align-items-center justify-content-between">
          <div className="fw-semibold">{person.displayName || "Unnamed"}</div>
          <Badge bg="secondary" className="text-capitalize">
            {person.gender || "other"}
          </Badge>
        </div>
      </Card.Body>
    </Card>
  );
};

PersonCard.propTypes = {
  person: PropTypes.object,
  variant: PropTypes.string,
};

const TreeNode = ({ node }) => {
  if (!node || !node.member) return null;
  const marriages = Array.isArray(node.marriages) ? node.marriages : [];

  return (
    <li>
      <div className="family-tree__node">
        {marriages.length === 0 ? (
          <div className="family-tree__couple">
            <PersonCard person={node.member} variant="primary" />
          </div>
        ) : (
          <div className="family-tree__marriages">
            {marriages.map((m) => (
              <div key={m.marriageId} className="family-tree__marriage">
                <div className="family-tree__couple">
                  <PersonCard person={node.member} variant="primary" />
                  <div className="family-tree__spouse-sep" />
                  <PersonCard person={m.spouse} variant="light" />
                </div>

                {Array.isArray(m.children) && m.children.length > 0 && (
                  <ul>
                    {m.children.map((child) => (
                      <TreeNode key={child.member?._id || Math.random()} node={child} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
};

TreeNode.propTypes = {
  node: PropTypes.object,
};

const FamilyTreeView = ({ treeData }) => {
  const rootNode = treeData?.tree || null;

  if (!rootNode) {
    return <div className="text-muted">No family tree found.</div>;
  }

  return (
    <div className="family-tree">
      <div className="family-tree__scroll">
        <ul className="family-tree__ul">
          <TreeNode node={rootNode} />
        </ul>
      </div>
    </div>
  );
};

FamilyTreeView.propTypes = {
  treeData: PropTypes.object,
};

export default FamilyTreeView;

