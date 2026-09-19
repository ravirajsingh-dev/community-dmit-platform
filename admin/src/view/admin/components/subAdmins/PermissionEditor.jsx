import React, { useState, useEffect } from "react";
import { Form, Card, Row, Col, Button } from "react-bootstrap";

// Get available modules from sidebar/routes
// Note: sub-admins module is excluded - only full admins can manage sub-admins
const AVAILABLE_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "application-settings", label: "Application Settings" },
  { key: "wallet-settings", label: "Wallet Settings" },
  { key: "users", label: "Users" },
  { key: "designations", label: "Designations" },
  { key: "appointments", label: "Appointments" },
  { key: "slider", label: "Slider Banners" },
  { key: "gallery", label: "Image Gallery" },
  { key: "donation", label: "Donations" },
];

const MODULE_ACTIONS = {
  users: ["list", "create", "edit", "delete"],
  slider: ["list", "create", "edit", "delete"],
  gallery: ["list", "create", "edit", "delete"],
  donation: ["buttons", "requests"],
  designations: ["list", "approve", "reject", "inactive", "delete", "transition"],
};

const PermissionEditor = ({ permissions = {}, onChange }) => {
  const [localPermissions, setLocalPermissions] = useState(permissions || {});

  useEffect(() => {
    setLocalPermissions(permissions || {});
  }, [permissions]);

  const handleModuleToggle = (moduleKey, value) => {
    const newPermissions = { ...localPermissions };
    if (value) {
      newPermissions[moduleKey] = true;
    } else {
      delete newPermissions[moduleKey];
    }
    setLocalPermissions(newPermissions);
    if (onChange) onChange(newPermissions);
  };

  const handleActionToggle = (moduleKey, action, value) => {
    const newPermissions = { ...localPermissions };
    if (!newPermissions[moduleKey] || typeof newPermissions[moduleKey] === "boolean") {
      newPermissions[moduleKey] = {};
    }
    if (value) {
      newPermissions[moduleKey][action] = true;
    } else {
      delete newPermissions[moduleKey][action];
      if (Object.keys(newPermissions[moduleKey]).length === 0) {
        delete newPermissions[moduleKey];
      }
    }
    setLocalPermissions(newPermissions);
    if (onChange) onChange(newPermissions);
  };

  const hasModuleAccess = (moduleKey) => {
    return localPermissions[moduleKey] === true;
  };

  const hasActionAccess = (moduleKey, action) => {
    return (
      localPermissions[moduleKey] === true ||
      (typeof localPermissions[moduleKey] === "object" &&
        localPermissions[moduleKey]?.[action] === true)
    );
  };

  const getModuleActions = (moduleKey) => {
    return MODULE_ACTIONS[moduleKey] || [];
  };

  return (
    <div>
      <h6 className="mb-3">Permissions</h6>
      <Row className="row-gap-3">
        {AVAILABLE_MODULES.map((module) => {
          const actions = getModuleActions(module.key);
          const hasActions = actions.length > 0;
          const moduleAccess = hasModuleAccess(module.key);

          return (
            <Col xs={12} md={6} lg={4} key={module.key}>
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Check
                      type="switch"
                      id={`module-${module.key}`}
                      label={<strong>{module.label}</strong>}
                      checked={moduleAccess}
                      onChange={(e) =>
                        handleModuleToggle(module.key, e.target.checked)
                      }
                    />
                  </div>

                  {hasActions && !moduleAccess && (
                    <div className="ms-4 mt-2">
                      <small className="text-muted d-block mb-2">
                        Action-level permissions:
                      </small>
                      {actions.map((action) => (
                        <Form.Check
                          key={action}
                          type="switch"
                          id={`action-${module.key}-${action}`}
                          label={action.charAt(0).toUpperCase() + action.slice(1)}
                          checked={hasActionAccess(module.key, action)}
                          onChange={(e) =>
                            handleActionToggle(
                              module.key,
                              action,
                              e.target.checked
                            )
                          }
                          className="mb-1"
                        />
                      ))}
                    </div>
                  )}

                  {hasActions && moduleAccess && (
                    <div className="ms-4 mt-2">
                      <small className="text-success">
                        Full access (all actions enabled)
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className="mt-3 p-3 bg-light rounded">
        <small className="text-muted">
          <strong>Note:</strong> Toggle a module ON for full access, or use
          action-level permissions for granular control. When a module is ON, all
          actions are automatically enabled.
        </small>
      </div>
    </div>
  );
};

export default PermissionEditor;
