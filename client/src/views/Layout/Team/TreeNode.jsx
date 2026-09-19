/**
 * TreeNode - Presentational node for Unilevel expandable tree
 * Renders circular avatar, name, memberId, direct count.
 * Not recursive - parent handles recursion.
 */

import React, { memo, useCallback } from "react";
import { PropTypes } from "prop-types";

import "./UnilevelTree.scss";

const statusLabel = (status) => {
  if (status === 1) return "active";
  if (status === 2) return "inactive";
  if (status === 3) return "blocked";
  return "new";
};

const TreeNode = memo(function TreeNode({
  node,
  isLoading = false,
  isExpanded = false,
  hasChildren = false,
  onToggle,
  onNodeClick,
}) {
  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      onToggle?.(node._id);
    },
    [node._id, onToggle]
  );

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onNodeClick?.(node._id);
    },
    [node._id, onNodeClick]
  );

  const displayName = node.name || "-";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="unilevel-tree-node">
      <div className="unilevel-tree-node__content">
        <div
          className={`unilevel-tree-node__avatar unilevel-tree-node__avatar--${statusLabel(node.status ?? 1)}`}
          onClick={handleClick}
          onKeyDown={(e) => e.key === "Enter" && handleClick(e)}
          role="button"
          tabIndex={0}
          aria-label={`${displayName}, ${node.memberId || ""}`}
        >
          {initials}
        </div>
        <div className="unilevel-tree-node__info">
          <span className="unilevel-tree-node__name">{displayName}</span>
          <span className="unilevel-tree-node__member-id">
            {node.memberId || ""}
          </span>
          {hasChildren && (
            <span className="unilevel-tree-node__count">
              {node.directCount ?? 0} direct
            </span>
          )}
        </div>
        {hasChildren && (
          <button
            type="button"
            className="unilevel-tree-node__expand"
            onClick={handleToggle}
            disabled={isLoading}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isLoading ? (
              <span className="unilevel-tree-node__spinner" />
            ) : isExpanded ? (
              "−"
            ) : (
              "+"
            )}
          </button>
        )}
      </div>
    </div>
  );
});

TreeNode.propTypes = {
  node: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    memberId: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.number,
    directCount: PropTypes.number,
    hasChildren: PropTypes.bool,
  }).isRequired,
  isLoading: PropTypes.bool,
  isExpanded: PropTypes.bool,
  hasChildren: PropTypes.bool,
  onToggle: PropTypes.func,
  onNodeClick: PropTypes.func,
};

export default TreeNode;
