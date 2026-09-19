const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getCommunities,
  getVanshes,
  getKuls,
  getKhamps,
  getGotras,
  createCommunity,
  createVansh,
  createKul,
  createKhamp,
  createGotra,
} = require("./Controllers/MasterDataController");

router.get("/communities", UserAuth, checkSessionExpiry, getCommunities);
router.post("/communities", UserAuth, checkSessionExpiry, createCommunity);

router.get("/vanshes", UserAuth, checkSessionExpiry, getVanshes);
router.post("/vanshes", UserAuth, checkSessionExpiry, createVansh);

router.get("/kuls", UserAuth, checkSessionExpiry, getKuls);
router.post("/kuls", UserAuth, checkSessionExpiry, createKul);

router.get("/khamps", UserAuth, checkSessionExpiry, getKhamps);
router.post("/khamps", UserAuth, checkSessionExpiry, createKhamp);

router.get("/gotras", UserAuth, checkSessionExpiry, getGotras);
router.post("/gotras", UserAuth, checkSessionExpiry, createGotra);

module.exports = router;
