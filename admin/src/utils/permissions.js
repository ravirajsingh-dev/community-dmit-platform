/**
 * Frontend Permission Utilities
 * 
 * These utilities work with the dynamic permission system
 * and support ANY module/action without hardcoding
 */

/**
 * Check if user has permission for a module/action
 * @param {Object} user - User object from state (admin or sub-admin)
 * @param {String} module - Module name (e.g., 'users', 'dashboard', 'slider')
 * @param {String} action - Optional action name (e.g., 'list', 'create', 'edit', 'delete')
 * @returns {Boolean} - True if user has permission, false otherwise
 */
export const hasPermission = (user, module, action = null) => {
  // Admin (role 2) has full access
  if (user && (user.role === 2 || (typeof user.role === "number" && user.role === 2))) {
    return true;
  }

  // Sub-admin permission check
  if (!user || !user.permissions) {
    return false;
  }

  const permissions = user.permissions;

  // Check if module exists in permissions
  if (!permissions.hasOwnProperty(module)) {
    return false;
  }

  const modulePermission = permissions[module];

  // If module permission is boolean
  if (typeof modulePermission === "boolean") {
    return modulePermission === true;
  }

  // If module permission is an object (action-level permissions)
  if (typeof modulePermission === "object" && modulePermission !== null) {
    // If no specific action requested, check if module has any access
    if (!action) {
      // Check if any action is allowed
      return Object.values(modulePermission).some((val) => val === true);
    }

    // Check specific action
    if (!modulePermission.hasOwnProperty(action)) {
      return false;
    }

    return modulePermission[action] === true;
  }

  return false;
};

/**
 * Check if user is admin
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
const isAdmin = (user) => {
  return user && (user.role === 2 || (typeof user.role === "number" && user.role === 2));
};

/**
 * Check if user is sub-admin
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
const isSubAdmin = (user) => {
  return user && (user.role === 3 || (typeof user.role === "number" && user.role === 3) || user.isSubAdmin);
};

/**
 * Check if user is admin or sub-admin
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
const isAdminOrSubAdmin = (user) => {
  return isAdmin(user) || isSubAdmin(user);
};

/**
 * Filter menu items based on permissions
 * @param {Array} menuItems - Array of menu items
 * @param {Object} user - User object from state
 * @returns {Array} - Filtered menu items
 */
const filterChildrenByPermissions = (children, user) => {
  return children.filter((child) => {
    if (child.children && child.children.length > 0) {
      const filteredGrandchildren = filterChildrenByPermissions(
        child.children,
        user
      );
      if (filteredGrandchildren.length > 0) {
        child.children = filteredGrandchildren;
        return true;
      }
      return false;
    }
    const module = getModuleFromPath(child.path);
    return hasPermission(user, module);
  });
};

export const filterMenuByPermissions = (menuItems, user) => {
  if (!user) return [];

  // Admin has access to everything
  if (isAdmin(user)) {
    return menuItems;
  }

  // Sub-admin: filter by permissions
  return menuItems.filter((item) => {
    // Sub-admins cannot manage other sub-admins - hide sub-admins menu
    if (item.key === "sub-admins") {
      return false;
    }

    // If item has children, check if any child has permission (recursively)
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterChildrenByPermissions(item.children, user);
      if (filteredChildren.length > 0) {
        item.children = filteredChildren;
        return true;
      }
      return false;
    }

    // For items without children, check module permission
    const module = getModuleFromPath(item.path);
    return hasPermission(user, module);
  });
};

/**
 * Extract module name from route path
 * Maps frontend routes to permission module names
 * @param {String} path - Route path (e.g., '/admin/users-list', '/admin/slider')
 * @returns {String} - Module name (e.g., 'users', 'slider')
 */
export const getModuleFromPath = (path) => {
  if (!path) return "";

  // Remove /admin prefix if present
  const cleanPath = path.replace(/^\/admin\/?/, "");

  // Map common paths to module names
  const pathToModuleMap = {
    "dashboard": "dashboard",
    "application-settings": "application-settings",
    "users-list": "users",
    "users/add": "users",
    "users/edit": "users",
    "sub-admins": "sub-admins",
    "sub-admins/create": "sub-admins",
    "sub-admins/edit": "sub-admins",
    "slider": "slider",
    "gallery": "gallery",
    "donation/buttons": "donation",
    "donation/requests": "donation",
    "epins": "epins",
    "referrals": "referrals",
    "team": "team",
    "wallets": "wallets",
    "wallet": "wallets",
    "wallet-settings": "wallet-settings",
    "wallet-management": "wallet-settings",
    "commission-payout": "wallet-settings",
    "designations": "designations",
    "ranks": "designations",
    "appointments": "appointments",
    "slots": "appointments",
    "sbi-pro-sessions": "appointments",
    "counselling-sessions": "appointments",
  };

  // Try exact match first
  if (pathToModuleMap[cleanPath]) {
    return pathToModuleMap[cleanPath];
  }

  // Try prefix match for nested routes
  for (const [key, module] of Object.entries(pathToModuleMap)) {
    if (cleanPath.startsWith(key)) {
      return module;
    }
  }

  // Default: use first segment of path as module name
  const segments = cleanPath.split("/");
  return segments[0] || "dashboard";
};

/**
 * Check if route should be accessible
 * @param {String} path - Route path
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
export const canAccessRoute = (path, user) => {
  if (!user) return false;

  // Admin has access to everything
  if (isAdmin(user)) {
    return true;
  }

  // Sub-admin: check permission
  const module = getModuleFromPath(path);
  return hasPermission(user, module);
};

/**
 * Get the first allowed route for a user
 * @param {Object} user - User object from state
 * @param {Array} routes - Optional array of route objects with path property
 * @returns {String|null} - First allowed route path or null if no access
 */
export const getFirstAllowedRoute = (user, routes = null) => {
  if (!user) return null;

  // Admin always gets dashboard
  if (isAdmin(user)) {
    return "/admin/dashboard";
  }

  // Sub-admin: find first route they have permission for
  if (!user.permissions || Object.keys(user.permissions).length === 0) {
    return null; // No permissions assigned
  }

  // If routes array provided, use it
  if (routes && Array.isArray(routes)) {
    for (const route of routes) {
      // Skip sub-admin management routes
      if (route.path.startsWith("sub-admins")) {
        continue;
      }

      // Check if user has permission for this route
      // Route paths are now relative, so construct full path for permission check
      const fullPath = `/admin/${route.path}`;
      if (canAccessRoute(fullPath, user)) {
        return `/admin/${route.path}`;
      }
    }
  }

  // Fallback: check common routes in priority order
  // Dashboard is optional - check it only if user has permission
  const commonRoutes = [
    "application-settings",
    "users-list",
    "slider",
    "gallery",
    "donation/buttons",
    "donation/requests",
    "dashboard", // Dashboard is last - optional feature
  ];

  for (const routePath of commonRoutes) {
    const fullPath = `/admin/${routePath}`;
    if (canAccessRoute(fullPath, user)) {
      return `/admin/${routePath}`;
    }
  }

  return null; // No accessible routes found
};
