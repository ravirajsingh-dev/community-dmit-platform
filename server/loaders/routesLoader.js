/**
 * Routes Loader Module
 * 
 * Loads and registers all application routes.
 * Routes are defined in the routes/ directory and organized by feature.
 */

/**
 * Load application routes
 * @param {Express} app - Express application instance
 */
const loadRoutes = (app) => {
  app.use(require("../routes"));
  console.log("✅ Routes loaded");
};

module.exports = {
  loadRoutes,
};
