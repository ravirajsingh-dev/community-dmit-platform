const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  getCountries,
  getStates,
  getDistricts,
  getVillages,
  createState,
  createDistrict,
  createVillage,
} = require("./Controllers/LocationController");

router.get("/countries", UserAuth, checkSessionExpiry, getCountries);
router.get("/states", UserAuth, checkSessionExpiry, getStates);
router.post("/states", UserAuth, checkSessionExpiry, createState);

router.get("/districts", UserAuth, checkSessionExpiry, getDistricts);
router.post("/districts", UserAuth, checkSessionExpiry, createDistrict);

router.get("/villages", UserAuth, checkSessionExpiry, getVillages);
router.post("/villages", UserAuth, checkSessionExpiry, createVillage);

module.exports = router;
