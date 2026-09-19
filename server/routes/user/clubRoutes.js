const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const { getClubInfo } = require("./Controllers/ClubController");

router.get("/", UserAuth, checkSessionExpiry, getClubInfo);

module.exports = router;
