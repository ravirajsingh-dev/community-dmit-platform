import React from "react";
import PropTypes from "prop-types";
import { Card } from "react-bootstrap";

/* ======================
   Person Card
====================== */
const PersonCard = ({ person, variant }) => {
  if (!person) return null;

  return (
    <Card
      className={`border-0 family-tree__person family-tree__person--${variant}`}
    >
      <Card.Body className="p-0 text-center">
        <div className="fw-semibold">{person.displayName}</div>
      </Card.Body>
    </Card>
  );
};

PersonCard.propTypes = {
  person: PropTypes.object,
  variant: PropTypes.string,
};

/* ======================
   Tree Node
====================== */
const TreeNode = ({ node }) => {
  if (!node || !node.member) return null;

  const marriages = node.marriages || [];

  return (
    <li>
      <PersonCard person={node.member} variant="primary" />

      {marriages.length > 0 && (
        <ul>
          {marriages.map((m) => (
            <li key={m.marriageId}>
              {/* WIFE */}
              <PersonCard person={m.spouse} variant="light" />

              {/* CHILDREN */}
              {m.children?.length > 0 && (
                <ul>
                  {m.children.map((child) => (
                    <TreeNode key={child.member._id} node={child} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

TreeNode.propTypes = {
  node: PropTypes.object,
};

/* ======================
   Family Tree View
====================== */
const FamilyTreeView = ({ treeData }) => {
  if (!treeData?.tree) return null;

  return (
    <div className="family-tree">
      <div className="family-tree__scroll">
        <ul className="family-tree__ul">
          <TreeNode node={treeData.tree} />
        </ul>
      </div>
    </div>
  );
};

FamilyTreeView.propTypes = {
  treeData: PropTypes.object,
};

export default FamilyTreeView;
