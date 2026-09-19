/**
 * User Team Routes
 *
 * All routes require UserAuth.
 * GET /api/users/team/direct | all | level/:level | structure | structure/:nodeId | dashboard
 */

const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const { validateNodeId, validateLevelParam, validateUserId } = require("../../middleware/teamValidation");
const {
  getDirect,
  getAll,
  getByLevel,
  getStructure,
  getDashboard,
  getMemberDirect,
  getMemberAll,
} = require("./Controllers/TeamController");

router.use(UserAuth, checkSessionExpiry);

router.get("/direct", getDirect);
router.get("/all", getAll);
router.get("/level/:level", validateLevelParam, getByLevel);
router.get("/structure", getStructure);
router.get("/structure/:nodeId", validateNodeId, getStructure);
router.get("/dashboard", getDashboard);
router.get("/member/:userId/direct", validateUserId, getMemberDirect);
router.get("/member/:userId/all", validateUserId, getMemberAll);

module.exports = router;
