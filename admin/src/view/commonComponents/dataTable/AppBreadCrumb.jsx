import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import { capitalizeFirst } from "@utils/helper";
import { Container } from "react-bootstrap";

const AppBreadcrumb = ({ crumbs }) => {
  const items = Array.isArray(crumbs) ? crumbs : [];

  return (
    <Container className="p-0">
      <div className="bread-crumb">
        {items.length > 0 ? (
          <Breadcrumb>
            <Breadcrumb.Item
              linkProps={{
                to: "/admin/dashboard",
              }}
              linkAs={Link}
            >
              Dashboard
            </Breadcrumb.Item>
            {items.map((item, i) => {
              const href = item.path ?? item.link;
              const name = item.name ?? item.label ?? "";
              return (
                <React.Fragment key={i}>
                  {href ? (
                    <Breadcrumb.Item linkProps={{ to: href }} linkAs={Link}>
                      {capitalizeFirst(name)}
                    </Breadcrumb.Item>
                  ) : (
                    <Breadcrumb.Item active>
                      {capitalizeFirst(name)}
                    </Breadcrumb.Item>
                  )}
                </React.Fragment>
              );
            })}
          </Breadcrumb>
        ) : undefined}
      </div>
    </Container>
  );
};

export default AppBreadcrumb;
