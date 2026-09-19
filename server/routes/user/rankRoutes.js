/**
 * User Rank Routes - QA Q19/Q20
 * GET /api/users/rank
 */

const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const { getRankInfo } = require("./Controllers/RankController");

router.get("/", UserAuth, checkSessionExpiry, getRankInfo);

module.exports = router;
