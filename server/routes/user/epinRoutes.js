const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { UserAuth } = require("../../middleware/auth");
const { checkSessionExpiry } = require("../../middleware/checkSessionExpiry");
const {
  listOwnEPins,
  transferEPinToMember,
  transferEPinsBulk,
  getTransferReport,
} = require("./Controllers/EPinController");

router.use(UserAuth);
router.use(checkSessionExpiry);

router.get("/", listOwnEPins);

router.post(
  "/transfer",
  [
    check("toMemberId", "Recipient Member ID is required")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 10 })
      .matches(/^G\d{9}$/)
      .withMessage("Invalid Member ID format (e.g. G123456789)"),
    check("epinId", "E-PIN is required")
      .notEmpty()
      .trim()
      .isLength({ min: 20, max: 20 })
      .matches(/^G[A-Z0-9]{19}$/i)
      .withMessage("Invalid E-PIN format"),
  ],
  transferEPinToMember,
);

router.post(
  "/transfer-bulk",
  [
    check("toMemberId", "Recipient Member ID is required")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 10 })
      .matches(/^G\d{9}$/)
      .withMessage("Invalid Member ID format (e.g. G123456789)"),
    check("count", "Count is required")
      .notEmpty()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Count must be between 1 and 10000"),
  ],
  transferEPinsBulk,
);

router.get("/transfer-report", getTransferReport);

module.exports = router;
