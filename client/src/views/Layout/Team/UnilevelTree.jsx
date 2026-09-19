/**
 * UnilevelTree - Expandable tree with root at top center, horizontal branching
 * Lazy loads children on expand. No external tree libraries.
 * State: childrenMap, loadingMap, expandedSet - all local.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { PropTypes } from "prop-types";

import TreeNode from "./TreeNode";

import "./UnilevelTree.scss";

/**
 * @param {Object} node - { _id, memberId, name, status, directCount }
 * @param {Object} childrenMap - { [nodeId]: Node[] }
 * @param {Object} loadingMap - { [nodeId]: boolean }
 * @param {Set<string>} expandedSet - Set of expanded node IDs
 * @param {Function} onToggle - (nodeId) => void
 * @param {Function} onNodeClick - (nodeId) => void
 */
function renderChildrenRow(nodes, childrenMap, loadingMap, expandedSet, onToggle, onNodeClick) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="unilevel-tree__row">
      {nodes.map((node) => {
        const nodeId = String(node._id);
        const children = childrenMap[nodeId] ?? [];
        const isLoading = loadingMap[nodeId] ?? false;
        const isExpanded = expandedSet.has(nodeId);
        const hasChildren = node.hasChildren ?? (node.directCount ?? 0) > 0;

        return (
          <div key={nodeId} className="unilevel-tree__connector">
            <div className="unilevel-tree__connector-line-v" />
            <TreeNode
              node={node}
              isLoading={isLoading}
              isExpanded={isExpanded}
              hasChildren={hasChildren}
              onToggle={onToggle}
              onNodeClick={onNodeClick}
            />
            {isExpanded && hasChildren && (
              <>
                <div className="unilevel-tree__connector-line-v" />
                <div className="unilevel-tree__row">
                  {children.map((child) => {
                    const cid = String(child._id);
                    const cChildren = childrenMap[cid] ?? [];
                    const cLoading = loadingMap[cid] ?? false;
                    const cExpanded = expandedSet.has(cid);
                    const cHasChildren = child.hasChildren ?? (child.directCount ?? 0) > 0;

                    return (
                      <React.Fragment key={cid}>
                        <div className="unilevel-tree__connector">
                          <div className="unilevel-tree__connector-line-v" />
                          <TreeNode
                            node={child}
                            isLoading={cLoading}
                            isExpanded={cExpanded}
                            hasChildren={cHasChildren}
                            onToggle={onToggle}
                            onNodeClick={onNodeClick}
                          />
                          {cExpanded && cHasChildren && (
                            cLoading ? (
                              <div className="unilevel-tree-node__children unilevel-tree-node__children--loading">
                                <span className="unilevel-tree__spinner" />
                              </div>
                            ) : (
                              renderChildrenRow(
                                cChildren,
                                childrenMap,
                                loadingMap,
                                expandedSet,
                                onToggle,
                                onNodeClick
                              )
                            )
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            )}
            {isExpanded && hasChildren && isLoading && (
              <div className="unilevel-tree__loading">
                <span className="unilevel-tree__spinner" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * UnilevelTree - Lazy-loaded expandable tree
 */
function UnilevelTree({
  apiBase = "/api/users/team",
  rootNode,
  initialChildren = [],
}) {
  const [childrenMap, setChildrenMap] = useState(() => {
    const map = {};
    if (rootNode && initialChildren.length > 0) {
      map[String(rootNode._id)] = initialChildren;
    }
    return map;
  });
  const [loadingMap, setLoadingMap] = useState({});
  const [expandedSet, setExpandedSet] = useState(new Set());
  const loadedIdsRef = useRef(new Set());

  const fetchChildren = useCallback(
    async (nodeId) => {
      const id = String(nodeId);
      if (loadedIdsRef.current.has(id)) return;

      setLoadingMap((prev) => ({ ...prev, [id]: true }));
      try {
        const api = (await import("@src/utils/axiosSetup")).default;
        const res = await api.get(`${apiBase}/structure/${nodeId}`);
        const children = res.data?.response?.children ?? [];
        loadedIdsRef.current.add(id);
        setChildrenMap((prev) => ({ ...prev, [id]: children }));
      } catch (err) {
        console.error("Failed to fetch structure children", err);
        loadedIdsRef.current.add(id);
        setChildrenMap((prev) => ({ ...prev, [id]: [] }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [id]: false }));
      }
    },
    [apiBase]
  );

  const handleToggle = useCallback(
    (nodeId) => {
      const id = String(nodeId);
      setExpandedSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      fetchChildren(nodeId);
    },
    [fetchChildren]
  );

  const handleNodeClick = useCallback(
    (nodeId) => {
      handleToggle(nodeId);
    },
    [handleToggle]
  );

  // Initial load: ensure root children are in map and mark as loaded
  useEffect(() => {
    if (rootNode && initialChildren.length > 0) {
      const rootId = String(rootNode._id);
      loadedIdsRef.current.add(rootId);
      setChildrenMap((prev) => ({
        ...prev,
        [rootId]: initialChildren,
      }));
    }
  }, [rootNode, initialChildren]);

  if (!rootNode) return null;

  const rootId = String(rootNode._id);
  const rootChildren = childrenMap[rootId] ?? initialChildren;
  const rootLoading = loadingMap[rootId] ?? false;
  const rootExpanded = expandedSet.has(rootId);
  const rootHasChildren = rootNode.hasChildren ?? (rootNode.directCount ?? 0) > 0;

  return (
    <div className="unilevel-tree">
      <div className="unilevel-tree__root-wrap">
        <TreeNode
          node={rootNode}
          isLoading={rootLoading}
          isExpanded={rootExpanded}
          hasChildren={rootHasChildren}
          onToggle={handleToggle}
          onNodeClick={handleNodeClick}
        />
        <div
          className={`unilevel-tree__root-line ${!rootHasChildren ? "unilevel-tree__root-line--empty" : ""}`}
        />
      </div>
      {rootHasChildren && rootExpanded && (
        <>
          {rootLoading ? (
            <div className="unilevel-tree__loading">
              <span className="unilevel-tree__spinner" />
            </div>
          ) : (
            renderChildrenRow(
              rootChildren,
              childrenMap,
              loadingMap,
              expandedSet,
              handleToggle,
              handleNodeClick
            )
          )}
        </>
      )}
    </div>
  );
}

UnilevelTree.propTypes = {
  apiBase: PropTypes.string,
  rootNode: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    memberId: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.number,
    directCount: PropTypes.number,
    hasChildren: PropTypes.bool,
  }),
  initialChildren: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
      memberId: PropTypes.string,
      name: PropTypes.string,
      status: PropTypes.number,
      directCount: PropTypes.number,
      hasChildren: PropTypes.bool,
    })
  ),
};

export default UnilevelTree;
