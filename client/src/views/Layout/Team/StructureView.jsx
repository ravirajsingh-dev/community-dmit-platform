import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import { PropTypes } from "prop-types";

import AppBreadCrumb from "@src/views/Common/AppBreadCrumb";
import MainCard from "@src/views/Common/Cards/MainCard";

import UnilevelTree from "./UnilevelTree";

const StructureView = ({ user }) => {
  const [rootNode, setRootNode] = useState(null);
  const [initialChildren, setInitialChildren] = useState([]);
  const [loadingRoot, setLoadingRoot] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoot = async () => {
      setLoadingRoot(true);
      setError(null);
      try {
        const api = (await import("@src/utils/axiosSetup")).default;
        const res = await api.get("/api/users/team/structure");
        if (res.data?.status && res.data?.response) {
          const { root, children } = res.data.response;
          setRootNode(
            root ||
              (user
                ? {
                    _id: user.id,
                    memberId: user.memberId,
                    name: user.name,
                    status: user.status ?? 1,
                    directCount: user.directCount ?? 0,
                    hasChildren: (children?.length ?? 0) > 0,
                  }
                : null),
          );
          setInitialChildren(children ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch root structure", err);
        setError(err?.message || "Failed to load structure");
      } finally {
        setLoadingRoot(false);
      }
    };
    fetchRoot();
  }, [user]);

  if (loadingRoot && !rootNode) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Team Structure"
          crumbs={[{ name: "Team", path: "/user/team" }, { name: "Structure" }]}
        />
        <MainCard>
          <div className="text-center py-5">Loading...</div>
        </MainCard>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <AppBreadCrumb
          pageTitle="Team Structure"
          crumbs={[{ name: "Team", path: "/user/team" }, { name: "Structure" }]}
        />
        <MainCard>
          <div className="text-center py-5 text-danger">{error}</div>
        </MainCard>
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        pageTitle="Team Structure"
        crumbs={[
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "Structure" },
        ]}
      />

      <MainCard>
        <h5 className="mb-3">Team Structure</h5>
        <p className="text-muted small mb-3">
          Click nodes to expand and load direct referrals. Lazy-loaded for
          scale.
        </p>

        {rootNode ? (
          <UnilevelTree
            apiBase="/api/users/team"
            rootNode={rootNode}
            initialChildren={initialChildren}
          />
        ) : (
          <div className="text-center py-5 text-muted">No data</div>
        )}
      </MainCard>
    </Container>
  );
};

StructureView.propTypes = {
  user: PropTypes.object,
};

const mapStateToProps = (state) => ({
  user: state.auth?.user,
});

export default connect(mapStateToProps)(StructureView);
