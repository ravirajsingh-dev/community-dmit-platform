import React, { useState, useEffect } from "react";
import { Container, Badge, Button, Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";

import AppBreadCrumb from "@src/view/commonComponents/dataTable/AppBreadCrumb";
import MainCard from "@src/view/commonComponents/mainCard/MainCard";
import api from "@src/utils/axiosSetup";
import { getAdminStructureChildren } from "@src/actions/adminTeamActions";

const statusLabel = (s) => (s === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>);

const TreeNode = ({ node, userId, childrenMap, loadingMap, onExpand, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const children = childrenMap[node._id] ?? [];
  const hasLoaded = Object.prototype.hasOwnProperty.call(childrenMap, node._id);
  const hasChildren = node.hasChildren ?? (node.directCount ?? 0) > 0;
  const isLoading = loadingMap[node._id];
  const paddingLeft = 20 + depth * 24;

  const handleToggle = () => {
    if (!expanded && hasChildren && !hasLoaded) onExpand(node._id);
    setExpanded(!expanded);
  };

  return (
    <div className="mb-1">
      <div
        className="d-flex align-items-center py-2 px-2 rounded border"
        style={{ paddingLeft: `${paddingLeft}px`, marginLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <Button variant="link" size="sm" className="p-0 me-2 text-secondary" onClick={handleToggle} disabled={isLoading}>
            {isLoading ? <Spinner animation="border" size="sm" /> : expanded ? "−" : "+"}
          </Button>
        ) : (
          <span className="me-2" style={{ width: "20px" }} />
        )}
        <span className="fw-medium">{node.name || "-"}</span>
        <span className="text-muted ms-2 small">{node.memberId || ""}</span>
        <span className="ms-2">{statusLabel(node.status)}</span>
        <span className="ms-2 small text-muted">Direct: {node.directCount ?? 0}</span>
      </div>
      {expanded && hasLoaded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              userId={userId}
              childrenMap={childrenMap}
              loadingMap={loadingMap}
              onExpand={onExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminStructureExplorer = () => {
  const { userId } = useParams();
  const [rootNode, setRootNode] = useState(null);
  const [rootChildren, setRootChildren] = useState([]);
  const [childrenMap, setChildrenMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [loadingRoot, setLoadingRoot] = useState(true);

  const loadChildren = async (nodeId) => {
    if (!userId) return;
    setLoadingMap((prev) => ({ ...prev, [nodeId]: true }));
    try {
      const children = await getAdminStructureChildren(userId, nodeId);
      setChildrenMap((prev) => ({ ...prev, [nodeId]: children }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  useEffect(() => {
    if (!userId) return;
    setLoadingRoot(true);
    api
      .get(`/api/admin/team/${userId}/structure`)
      .then((res) => {
        if (res.data?.status && res.data?.response) {
          const { root, children } = res.data.response;
          if (root) setRootNode(root);
          if (children) setRootChildren(children);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRoot(false));
  }, [userId]);

  if (!userId) {
    return (
      <Container>
        <AppBreadCrumb pageTitle="Structure" crumbs={[{ name: "Team", path: "/admin/team" }, { name: "Structure" }]} />
        <MainCard><p>No user selected.</p></MainCard>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Team Structure"
        crumbs={[{ name: "Team", path: "/admin/team" }, { name: "Structure" }]}
      />
      <MainCard>
        <h5 className="mb-3">Team Structure Explorer (Lazy Loaded)</h5>
        <p className="text-muted small mb-3">Expand nodes to load children.</p>

        {loadingRoot ? (
          <div className="text-center py-4"><Spinner animation="border" /></div>
        ) : (
          <div>
            {rootNode && (
              <div className="d-flex align-items-center py-2 px-2 rounded border bg-light mb-2">
                <span className="fw-bold">{rootNode.name}</span>
                <span className="text-muted ms-2">{rootNode.memberId}</span>
                <span className="ms-2">{statusLabel(rootNode.status)}</span>
                <span className="ms-2 small text-muted">Direct: {rootNode.directCount ?? 0}</span>
              </div>
            )}
            {rootChildren.map((child) => (
              <TreeNode
                key={child._id}
                node={child}
                userId={userId}
                childrenMap={childrenMap}
                loadingMap={loadingMap}
                onExpand={loadChildren}
              />
            ))}
          </div>
        )}
      </MainCard>
    </Container>
  );
};

export default AdminStructureExplorer;
