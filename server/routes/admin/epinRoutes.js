const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  createEPinsForMember,
  transferEPinsBulk,
  deleteEPin,
  deleteEPinsBulk,
  listEPins,
  getTransferReport,
  getTransferDetails,
} = require("./Controllers/EPinController");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");

router.use(AdminAuth);

router.get("/transfers", [checkPermission("epins", "list")], getTransferReport);
router.get(
  "/transfers/:transferId",
  [checkPermission("epins", "list")],
  getTransferDetails,
);
router.get("/", [checkPermission("epins", "list")], listEPins);

router.post(
  "/create",
  [checkPermission("epins", "create")],
  [
    check("memberId", "Member ID is required").notEmpty().trim(),
    check("count", "Count is required")
      .notEmpty()
      .isInt({ min: 1, max: 100 })
      .withMessage("Count must be between 1 and 100"),
  ],
  createEPinsForMember,
);

router.post(
  "/transfer-bulk",
  [checkPermission("epins", "edit")],
  [
    check("fromMemberId", "From Member ID is required")
      .notEmpty()
      .trim()
      .isLength({ min: 10, max: 10 })
      .matches(/^G\d{9}$/)
      .withMessage("Invalid Member ID format (e.g. G123456789)"),
    check("toMemberId", "To Member ID is required")
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

router.post(
  "/delete-bulk",
  [checkPermission("epins", "delete")],
  [
    check("memberId", "Member ID is required").notEmpty().trim(),
    check("count", "Count is required")
      .notEmpty()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Count must be between 1 and 10000"),
  ],
  deleteEPinsBulk,
);

router.delete(
  "/:epinId",
  [checkPermission("epins", "delete"), verifyTransactionPassword],
  deleteEPin,
);

module.exports = router;
