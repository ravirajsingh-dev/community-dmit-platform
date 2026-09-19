const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { whitelistBodyFields } = require("../../middleware/inputValidation");
const {
  getWalletSettings,
  createWalletSettings,
  updateRegistrationFee,
  updateRegistrationFeeEditable,
  updateGovernanceSettings,
  updateCommissionPayoutSettings,
  addLevel,
  updateLevel,
  deleteLevel,
  addRank,
  updateRank,
  deleteRank,
  addClub,
  updateClub,
  deleteClub,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  updateAdminSurcharge,
} = require("./Controllers/WalletSettingsController");

const REG_FEE_FIELDS = ["registrationFee", "configVersion", "txn_password"];
const REG_FEE_EDITABLE_FIELDS = [
  "isRegistrationFeeEditable",
  "configVersion",
  "txn_password",
];
const CONFIG_VERSION_CHECK = check(
  "configVersion",
  "configVersion is required and must be a positive integer",
)
  .isInt({ min: 1 })
  .toInt();
const LEVEL_ADD_FIELDS = ["commissionPercent", "configVersion", "txn_password"];
const LEVEL_UPDATE_FIELDS = [
  "commissionPercent",
  "configVersion",
  "txn_password",
];
const RANK_ADD_FIELDS = [
  "name",
  "commissionPercent",
  "selfSaleRequired",
  "teamSizeRequired",
  "requiredRankCount",
  "monthlyTarget",
  "capping",
  "requiredDesignations",
  "configVersion",
  "txn_password",
];
const RANK_UPDATE_FIELDS = [
  "name",
  "commissionPercent",
  "selfSaleRequired",
  "teamSizeRequired",
  "requiredRankCount",
  "monthlyTarget",
  "capping",
  "requiredDesignations",
  "configVersion",
  "txn_password",
];
const DESIGNATION_ADD_FIELDS = [
  "name",
  "commissionPercent",
  "selfSaleRequired",
  "teamSizeRequired",
  "requiredDesignationCode",
  "requiredDesignationCount",
  "monthlyTarget",
  "freeSessionCount",
  "maxSessionsPerDay",
  "isActive",
  "configVersion",
  "txn_password",
];
const DESIGNATION_UPDATE_FIELDS = [
  "name",
  "commissionPercent",
  "selfSaleRequired",
  "teamSizeRequired",
  "requiredDesignationCode",
  "requiredDesignationCount",
  "monthlyTarget",
  "freeSessionCount",
  "maxSessionsPerDay",
  "isActive",
  "configVersion",
  "txn_password",
];
const GOVERNANCE_FIELDS = [
  "maxAdminAdjustAmount",
  "mainMinWithdrawal",
  "mainMaxWithdrawal",
  "maxUserTransactionsPerDay",
  "freeAppointmentsPerUser",
  "counsellingCharge",
  "adminWithdrawalSurchargePercent",
  "isWithdrawalEnabled",
  "configVersion",
  "txn_password",
];
const ADMIN_SURCHARGE_FIELDS = [
  "adminSurchargePercent",
  "configVersion",
  "txn_password",
];
const CLUB_ADD_FIELDS = [
  "name",
  "commissionPercent",
  "minimumRankCode",
  "selfSaleRequired",
  "monthlyTarget",
  "capping",
  "isAdminOnly",
  "minWithdrawal",
  "maxWithdrawal",
  "configVersion",
  "txn_password",
];
const CLUB_UPDATE_FIELDS = [
  "name",
  "commissionPercent",
  "minimumRankCode",
  "selfSaleRequired",
  "monthlyTarget",
  "capping",
  "isAdminOnly",
  "minWithdrawal",
  "maxWithdrawal",
  "configVersion",
  "txn_password",
];

// All routes require admin authentication
router.use(AdminAuth);

// @route GET api/admin/wallet-settings
// @desc Get wallet settings (auto-creates if not found)
// @access Private (Admin only)
router.get("/", [checkPermission("wallet-settings")], getWalletSettings);

// @route POST api/admin/wallet-settings
// @desc Create wallet settings (only if not exists)
// @access Private (Admin only)
router.post(
  "/",
  [checkPermission("wallet-settings"), verifyTransactionPassword],
  createWalletSettings,
);

// @route PUT api/admin/wallet-settings/registration-fee
// @desc Update registration fee (blocked if isRegistrationFeeEditable=false)
// @access Private (Admin only)
router.put(
  "/registration-fee",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(REG_FEE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("registrationFee", "Registration fee is required and must be >= 0")
      .isFloat({ min: 0 })
      .toFloat(),
  ],
  updateRegistrationFee,
);

// @route PUT api/admin/wallet-settings/commission-payout-settings
// @desc Update commission payout schedule (scheduleType, customDayOfMonth, etc)
// @access Private (Admin only)
router.put(
  "/commission-payout-settings",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields([
      "scheduleType",
      "customDayOfMonth",
      "customDayOfWeek",
      "payoutTimeHH",
      "payoutTimeMM",
      "configVersion",
      "txn_password",
    ]),
    check("scheduleType")
      .optional()
      .isIn(["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly", "custom"])
      .withMessage("Invalid scheduleType"),
    check("customDayOfMonth")
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage("customDayOfMonth must be 1-31"),
    check("customDayOfWeek")
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage("customDayOfWeek must be 0-6"),
    check("payoutTimeHH")
      .optional()
      .isInt({ min: 0, max: 23 })
      .withMessage("payoutTimeHH must be 0-23"),
    check("payoutTimeMM")
      .optional()
      .isInt({ min: 0, max: 59 })
      .withMessage("payoutTimeMM must be 0-59"),
  ],
  updateCommissionPayoutSettings,
);

// @route PUT api/admin/wallet-settings/governance
// @desc Update governance settings (maxAdminAdjustAmount, mainMin/MaxWithdrawal, maxUserTransactionsPerDay)
// @access Private (Admin only)
router.put(
  "/governance",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(GOVERNANCE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("maxAdminAdjustAmount")
      .optional()
      .isInt({ min: 0 })
      .withMessage("maxAdminAdjustAmount must be a non-negative integer"),
    check("maxUserTransactionsPerDay")
      .optional()
      .isInt({ min: 0 })
      .withMessage("maxUserTransactionsPerDay must be a non-negative integer"),
    check("freeAppointmentsPerUser")
      .optional()
      .isInt({ min: 0 })
      .withMessage("freeAppointmentsPerUser must be a non-negative integer"),
    check("counsellingCharge")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("counsellingCharge must be a non-negative number"),
  ],
  updateGovernanceSettings,
);

// @route PUT api/admin/wallet-settings/registration-fee-editable
// @desc Toggle whether registration fee can be edited (unlock/lock)
// @access Private (Admin only)
router.put(
  "/registration-fee-editable",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(REG_FEE_EDITABLE_FIELDS),
    CONFIG_VERSION_CHECK,
    check(
      "isRegistrationFeeEditable",
      "isRegistrationFeeEditable must be true or false",
    ).isBoolean(),
  ],
  updateRegistrationFeeEditable,
);

// @route PUT api/admin/wallet-settings/admin-surcharge
// @desc Update admin surcharge percent (0–99 integer) in wallet settings
// @access Private (Admin only)
router.put(
  "/admin-surcharge",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(ADMIN_SURCHARGE_FIELDS),
    CONFIG_VERSION_CHECK,
    check(
      "adminSurchargePercent",
      "adminSurchargePercent is required and must be an integer between 0 and 99",
    )
      .isInt({ min: 0, max: 99 })
      .toInt(),
  ],
  updateAdminSurcharge,
);

// @route POST api/admin/wallet-settings/levels
// @desc Add level
// @access Private (Admin only)
router.post(
  "/levels",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(LEVEL_ADD_FIELDS),
    CONFIG_VERSION_CHECK,
    check(
      "commissionPercent",
      "commissionPercent is required and must be between 0 and 100",
    )
      .isFloat({ min: 0, max: 100 })
      .toFloat(),
  ],
  addLevel,
);

// @route PUT api/admin/wallet-settings/levels/:id
// @desc Update level
// @access Private (Admin only)
router.put(
  "/levels/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(LEVEL_UPDATE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("commissionPercent")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("commissionPercent must be between 0 and 100"),
  ],
  updateLevel,
);

// @route DELETE api/admin/wallet-settings/levels/:id
// @desc Delete level (only last level can be deleted)
// @access Private (Admin only)
router.delete(
  "/levels/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(["configVersion", "txn_password"]),
    CONFIG_VERSION_CHECK,
  ],
  deleteLevel,
);

// @route POST api/admin/wallet-settings/ranks
// @desc Add rank
// @access Private (Admin only)
router.post(
  "/ranks",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(RANK_ADD_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name", "Rank name is required").notEmpty().trim(),
    check(
      "commissionPercent",
      "commissionPercent is required and must be between 0 and 100",
    )
      .isFloat({ min: 0, max: 100 })
      .toFloat(),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("teamSizeRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("teamSizeRequired must be >= 0"),
    check("requiredRankCount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("requiredRankCount must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("capping")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("capping must be >= 0"),
  ],
  addRank,
);

// @route PUT api/admin/wallet-settings/ranks/:id
// @desc Update rank
// @access Private (Admin only)
router.put(
  "/ranks/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(RANK_UPDATE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name")
      .optional()
      .notEmpty()
      .trim()
      .withMessage("Rank name cannot be empty"),
    check("commissionPercent")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("commissionPercent must be between 0 and 100"),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("teamSizeRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("teamSizeRequired must be >= 0"),
    check("requiredRankCount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("requiredRankCount must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("capping")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("capping must be >= 0"),
  ],
  updateRank,
);

// @route DELETE api/admin/wallet-settings/ranks/:id
// @desc Delete rank (only if not referenced by other ranks)
// @access Private (Admin only)
router.delete(
  "/ranks/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(["configVersion", "txn_password"]),
    CONFIG_VERSION_CHECK,
  ],
  deleteRank,
);

// @route POST api/admin/wallet-settings/clubs
// @desc Add club
// @access Private (Admin only)
router.post(
  "/clubs",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(CLUB_ADD_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name", "Club name is required").notEmpty().trim(),
    check(
      "commissionPercent",
      "commissionPercent is required and must be between 0 and 100",
    )
      .isFloat({ min: 0, max: 100 })
      .toFloat(),
    check("minimumRankCode")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("minimumRankCode must be >= 0"),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("capping")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("capping must be >= 0"),
    check("isAdminOnly")
      .optional()
      .isBoolean()
      .withMessage("isAdminOnly must be true or false"),
    check("minWithdrawal")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("minWithdrawal must be >= 0"),
    check("maxWithdrawal")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("maxWithdrawal must be >= 0"),
  ],
  addClub,
);

// @route PUT api/admin/wallet-settings/clubs/:id
// @desc Update club
// @access Private (Admin only)
router.put(
  "/clubs/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(CLUB_UPDATE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name")
      .optional()
      .notEmpty()
      .trim()
      .withMessage("Club name cannot be empty"),
    check("commissionPercent")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("commissionPercent must be between 0 and 100"),
    check("minimumRankCode")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("minimumRankCode must be >= 0"),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("capping")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("capping must be >= 0"),
    check("isAdminOnly")
      .optional()
      .isBoolean()
      .withMessage("isAdminOnly must be true or false"),
    check("minWithdrawal")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("minWithdrawal must be >= 0"),
    check("maxWithdrawal")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("maxWithdrawal must be >= 0"),
  ],
  updateClub,
);

// @route DELETE api/admin/wallet-settings/clubs/:id
// @desc Delete club
// @access Private (Admin only)
router.delete(
  "/clubs/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(["configVersion", "txn_password"]),
    CONFIG_VERSION_CHECK,
  ],
  deleteClub,
);

// @route POST api/admin/wallet-settings/designations
router.post(
  "/designations",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(DESIGNATION_ADD_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name", "Designation name is required").notEmpty().trim(),
    check(
      "commissionPercent",
      "commissionPercent is required and must be between 0 and 100",
    )
      .isFloat({ min: 0, max: 100 })
      .toFloat(),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("teamSizeRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("teamSizeRequired must be >= 0"),
    check("requiredDesignationCount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("requiredDesignationCount must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be boolean"),
  ],
  addDesignation,
);

// @route PUT api/admin/wallet-settings/designations/:id
router.put(
  "/designations/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(DESIGNATION_UPDATE_FIELDS),
    CONFIG_VERSION_CHECK,
    check("name")
      .optional()
      .notEmpty()
      .trim()
      .withMessage("Designation name cannot be empty"),
    check("commissionPercent")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("commissionPercent must be 0-100"),
    check("selfSaleRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("selfSaleRequired must be >= 0"),
    check("teamSizeRequired")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("teamSizeRequired must be >= 0"),
    check("requiredDesignationCount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("requiredDesignationCount must be >= 0"),
    check("monthlyTarget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("monthlyTarget must be >= 0"),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be boolean"),
  ],
  updateDesignation,
);

// @route DELETE api/admin/wallet-settings/designations/:id
router.delete(
  "/designations/:id",
  [
    checkPermission("wallet-settings"),
    verifyTransactionPassword,
    whitelistBodyFields(["configVersion", "txn_password"]),
    CONFIG_VERSION_CHECK,
  ],
  deleteDesignation,
);

module.exports = router;
