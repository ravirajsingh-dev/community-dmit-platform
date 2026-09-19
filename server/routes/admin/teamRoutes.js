/**
 * Admin Team Routes
 *
 * All routes require AdminAuth.
 * GET /api/admin/team/:userId/direct | all | level/:level | structure | structure/:nodeId | dashboard
 */

const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { validateUserId, validateNodeId, validateLevelParam } = require("../../middleware/teamValidation");
const {
  resolveUserByMemberId,
  getDirect,
  getAll,
  getByLevel,
  getStructure,
  getDashboard,
} = require("./Controllers/TeamController");

router.use(AdminAuth);

router.get("/resolve", resolveUserByMemberId);
router.get("/:userId/direct", validateUserId, getDirect);
router.get("/:userId/all", validateUserId, getAll);
router.get("/:userId/level/:level", validateUserId, validateLevelParam, getByLevel);
router.get("/:userId/structure", validateUserId, getStructure);
router.get("/:userId/structure/:nodeId", validateUserId, validateNodeId, getStructure);
router.get("/:userId/dashboard", validateUserId, getDashboard);

module.exports = router;
