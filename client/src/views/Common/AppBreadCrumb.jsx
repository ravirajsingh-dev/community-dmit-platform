import React from "react";
import { Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { TiArrowBackOutline } from "react-icons/ti";

/**
 * Normalizes crumb to { label, link } format.
 * Supports both: { label, link } and { name, path }
 */
const normalizeCrumb = (crumb) => {
  if (!crumb || typeof crumb !== "object") return { label: "", link: null };
  const label = crumb.label ?? crumb.name ?? "";
  const link = crumb.link ?? crumb.path ?? null;
  return { label, link };
};

const AppBreadCrumb = ({ title, pageTitle, breadcrumbs, crumbs }) => {
  const navigate = useNavigate();

  const displayTitle = title ?? pageTitle ?? "";
  const items = breadcrumbs ?? crumbs ?? [];

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <section className="breadcrumb-area position-relative">
      <div className="container">
        <div className="row">
          <div className="col-xl-8 offset-xl-2">
            <div className="breadcrumb-title text-center">
              <h2>{displayTitle}</h2>
              <div className="breadcrumb-list">
                <div>
                  <Button className="btn-back" onClick={handleBack}>
                    <TiArrowBackOutline size={25} />
                  </Button>
                </div>
                <div>
                  <ul>
                    {Array.isArray(items)
                      ? items.map((crumb, index) => {
                          const { label, link } = normalizeCrumb(crumb);
                          return (
                            <li key={index}>
                              {link ? (
                                <Link to={link}>{label}</Link>
                              ) : (
                                label
                              )}
                            </li>
                          );
                        })
                      : null}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

AppBreadCrumb.propTypes = {
  title: PropTypes.string,
  pageTitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      link: PropTypes.string,
      name: PropTypes.string,
      path: PropTypes.string,
    })
  ),
  crumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      link: PropTypes.string,
      name: PropTypes.string,
      path: PropTypes.string,
    })
  ),
  backgroundImage: PropTypes.string,
};

export default AppBreadCrumb;
