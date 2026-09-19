const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const WalletSettings = require("../../../models/WalletSettings");

/**
 * @route GET /api/admin/wallet-settings
 * @desc Get wallet settings (auto-creates if not found)
 * @access Private (Admin only)
 */
const getWalletSettings = async (req, res) => {
  try {
    const settings = await WalletSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      settings,
      "Wallet settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getWalletSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const {
  getDerivedWalletKeys: getServiceWalletKeys,
} = require("../../../services/walletService");

/**
 * @route GET /api/admin/wallet-settings/derived-wallet-keys
 * @desc Get derived wallet keys from levels, clubs, and REGISTRATION_FEE
 * @access Private (Admin only)
 */
const getDerivedWalletKeys = async (req, res) => {
  try {
    const walletKeys = await getServiceWalletKeys();

    return response.successResponse(
      res,
      { walletKeys },
      "Derived wallet keys retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getDerivedWalletKeys:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route POST /api/admin/wallet-settings
 * @desc Create wallet settings (only if not exists)
 * @access Private (Admin only)
 */
const createWalletSettings = async (req, res) => {
  try {
    const existing = await WalletSettings.findOne();
    if (existing) {
      return response.errorResponse(
        res,
        { msg: "Wallet settings already exist. Use update endpoints instead." },
        "Wallet settings already exist.",
        400,
      );
    }

    const settings = await WalletSettings.create({ singletonKey: "GLOBAL" });
    return response.successResponse(
      res,
      settings,
      "Wallet settings created successfully.",
    );
  } catch (err) {
    console.error("Error in createWalletSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Validate monetary value: valid number, >= 0, max 2 decimals
 */
function validateMonetary(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { valid: false, msg: `${fieldName} is required` };
  }
  const n = parseFloat(value);
  if (isNaN(n)) {
    return { valid: false, msg: `${fieldName} must be a valid number` };
  }
  if (n === Infinity || n === -Infinity) {
    return { valid: false, msg: `${fieldName} cannot be Infinity` };
  }
  if (n < 0) {
    return { valid: false, msg: `${fieldName} must be >= 0` };
  }
  const str = String(value);
  const decPart = str.split(".")[1];
  if (decPart && decPart.length > 2) {
    return {
      valid: false,
      msg: `${fieldName} must not have more than 2 decimal places`,
    };
  }
  return { valid: true, value: Math.round(n * 100) / 100 };
}

/**
 * Parse optional monetary field: empty -> 0, valid number -> rounded, invalid -> reject
 */
function parseOptionalMoney(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { value: 0 };
  }
  const result = validateMonetary(value, fieldName);
  if (!result.valid) {
    return { error: result.msg };
  }
  return { value: result.value };
}

/**
 * Parse optional numeric field that allows null: empty -> null, valid number -> rounded
 */
function parseOptionalMoneyOrNull(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const result = validateMonetary(value, fieldName);
  if (!result.valid) {
    return { error: result.msg };
  }
  return { value: result.value };
}

/**
 * @route PUT /api/admin/wallet-settings/registration-fee
 * @desc Update registration fee
 * @access Private (Admin only)
 * Requires: txn_password, configVersion (for version safety)
 * Blocked if isRegistrationFeeEditable === false
 */
const updateRegistrationFee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();

    if (settings.isRegistrationFeeEditable !== true) {
      return response.errorResponse(
        res,
        { msg: "Registration fee is locked and cannot be edited." },
        "Registration fee is locked.",
        403,
      );
    }

    const clientVersion = req.body.configVersion;
    if (clientVersion === undefined || clientVersion === null) {
      return response.errorResponse(
        res,
        { msg: "configVersion is required." },
        "Validation Error",
        400,
      );
    }
    const currentVersion = settings.configVersion ?? 1;
    if (Number(clientVersion) !== currentVersion) {
      return response.errorResponse(
        res,
        {
          msg: "Configuration was modified by another user. Please refresh and try again.",
        },
        "Version conflict.",
        409,
      );
    }

    const regFeeVal = validateMonetary(
      req.body.registrationFee,
      "registrationFee",
    );
    if (!regFeeVal.valid) {
      return response.errorResponse(
        res,
        { msg: regFeeVal.msg },
        "Validation Error",
        400,
      );
    }

    settings.registrationFee = regFeeVal.value;
    settings.isRegistrationFeeEditable = false;
    settings.configVersion = (currentVersion || 1) + 1;
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Registration fee updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateRegistrationFee:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/registration-fee-editable
 * @desc Toggle whether registration fee can be edited (unlock/lock)
 * @access Private (Admin only)
 */
const updateRegistrationFeeEditable = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();

    const clientVersion = req.body.configVersion;
    if (clientVersion === undefined || clientVersion === null) {
      return response.errorResponse(
        res,
        { msg: "configVersion is required." },
        "Validation Error",
        400,
      );
    }
    const currentVersion = settings.configVersion ?? 1;
    if (Number(clientVersion) !== currentVersion) {
      return response.errorResponse(
        res,
        {
          msg: "Configuration was modified by another user. Please refresh and try again.",
        },
        "Version conflict.",
        409,
      );
    }

    const val = req.body.isRegistrationFeeEditable;
    if (val !== true && val !== false) {
      return response.errorResponse(
        res,
        { msg: "isRegistrationFeeEditable must be true or false." },
        "Validation Error",
        400,
      );
    }

    settings.isRegistrationFeeEditable = val;
    settings.configVersion = (currentVersion || 1) + 1;
    await settings.save();

    return response.successResponse(
      res,
      settings,
      `Registration fee is now ${val ? "editable" : "locked"}.`,
    );
  } catch (err) {
    console.error("Error in updateRegistrationFeeEditable:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * Check configVersion from body; return 400 if missing, 409 if mismatch
 */
function checkConfigVersion(settings, reqBody) {
  const clientVersion = reqBody.configVersion;
  if (clientVersion === undefined || clientVersion === null) {
    return {
      statusCode: 400,
      msg: "configVersion is required for this operation.",
    };
  }
  const currentVersion = settings.configVersion ?? 1;
  if (Number(clientVersion) !== currentVersion) {
    return {
      statusCode: 409,
      msg: "Configuration was modified by another user. Please refresh and try again.",
    };
  }
  return null;
}

/**
 * Calculate total commission; throw if > 100
 */
function assertTotalCommissionWithinLimit(settings) {
  const levels = settings.levels || [];
  const ranks = settings.ranks || [];
  const clubs = settings.clubs || [];
  const designations = settings.designations || [];
  const sumLevels = levels.reduce((s, l) => s + (l.commissionPercent || 0), 0);
  const sumRanks = ranks.reduce((s, r) => s + (r.commissionPercent || 0), 0);
  const sumClubs = clubs.reduce((s, c) => s + (c.commissionPercent || 0), 0);
  const sumDesignations = designations.reduce(
    (s, d) => s + (d.commissionPercent || 0),
    0,
  );
  const total = sumLevels + sumRanks + sumClubs + sumDesignations;
  if (total > 100) {
    throw new Error(
      `Total commission must not exceed 100%. Current: ${total}% (levels: ${sumLevels}%, ranks: ${sumRanks}%, clubs: ${sumClubs}%, designations: ${sumDesignations}%)`,
    );
  }
}

/**
 * Increment configVersion before save
 */
function incrementConfigVersion(settings) {
  settings.configVersion = (settings.configVersion ?? 1) + 1;
}

/**
 * @route PUT /api/admin/wallet-settings/admin-surcharge
 * @desc Update admin surcharge percent (0–99 integer) in wallet settings
 * @access Private (Admin only)
 */
const updateAdminSurcharge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const raw = req.body.adminSurchargePercent;
    if (raw === undefined || raw === null || raw === "") {
      return response.errorResponse(
        res,
        {
          msg: "adminSurchargePercent is required.",
          path: "adminSurchargePercent",
        },
        "Validation Error",
        400,
      );
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n > 99) {
      return response.errorResponse(
        res,
        {
          msg: "adminSurchargePercent must be an integer between 0 and 99.",
          path: "adminSurchargePercent",
        },
        "Validation Error",
        400,
      );
    }

    settings.adminSurchargePercent = n;
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Admin surcharge updated successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("adminSurchargePercent must be an integer")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message, path: "adminSurchargePercent" },
        "Validation Error",
        400,
      );
    }
    console.error("Error in updateAdminSurcharge:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route POST /api/admin/wallet-settings/levels
 * @desc Add level
 * @access Private (Admin only)
 */
const addLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const { commissionPercent } = req.body;
    const parsedCommissionPercent = parseFloat(commissionPercent);

    if (
      isNaN(parsedCommissionPercent) ||
      parsedCommissionPercent < 0 ||
      parsedCommissionPercent > 100
    ) {
      return response.errorResponse(
        res,
        { msg: "commissionPercent must be between 0 and 100." },
        "Validation Error",
        400,
      );
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const maxLevelNumber =
        settings.levels.length > 0
          ? Math.max(...settings.levels.map((l) => l.levelNumber))
          : 0;
      const nextLevelNumber = maxLevelNumber + 1;

      const levelWalletKey = `LEVEL_${nextLevelNumber}`;
      const existingKeys = [
        ...(settings.levels || [])
          .map((l) => (l.walletKey || "").toUpperCase())
          .filter(Boolean),
        ...(settings.clubs || [])
          .map((c) => (c.walletKey || "").toUpperCase())
          .filter(Boolean),
      ];
      let finalWalletKey = levelWalletKey;
      let suffix = 0;
      while (existingKeys.includes(finalWalletKey)) {
        suffix += 1;
        finalWalletKey = `${levelWalletKey}_${suffix}`;
      }
      settings.levels.push({
        levelNumber: nextLevelNumber,
        walletKey: finalWalletKey,
        commissionPercent: parsedCommissionPercent,
      });
      settings.levels.sort((a, b) => a.levelNumber - b.levelNumber);
      incrementConfigVersion(settings);
      assertTotalCommissionWithinLimit(settings);

      try {
        await settings.save();
        return response.successResponse(
          res,
          settings,
          "Level added successfully.",
        );
      } catch (saveErr) {
        if (
          saveErr.message &&
          saveErr.message.includes("Total commission must not exceed")
        ) {
          return response.errorResponse(
            res,
            { msg: saveErr.message },
            "Commission overflow.",
            400,
          );
        }
        const isDuplicateLevel =
          saveErr.message &&
          saveErr.message.includes("levelNumber must be unique");
        if (isDuplicateLevel && attempt < maxRetries) {
          continue;
        }
        throw saveErr;
      }
    }
  } catch (err) {
    console.error("Error in addLevel:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/levels/:id
 * @desc Update level
 * @access Private (Admin only)
 */
const updateLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid level id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const level = settings.levels.id(id);
    if (!level) {
      return response.errorResponse(
        res,
        { msg: "Level not found." },
        "Not found",
        404,
      );
    }

    const { commissionPercent } = req.body;
    if (commissionPercent !== undefined) {
      const parsed = parseFloat(commissionPercent);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return response.errorResponse(
          res,
          { msg: "commissionPercent must be between 0 and 100." },
          "Validation Error",
          400,
        );
      }
      level.commissionPercent = parsed;
    }

    settings.levels.sort((a, b) => a.levelNumber - b.levelNumber);
    incrementConfigVersion(settings);
    assertTotalCommissionWithinLimit(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Level updated successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    console.error("Error in updateLevel:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route DELETE /api/admin/wallet-settings/levels/:id
 * @desc Delete level
 * @access Private (Admin only)
 */
const deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid level id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const level = settings.levels.id(id);
    if (!level) {
      return response.errorResponse(
        res,
        { msg: "Level not found." },
        "Not found",
        404,
      );
    }

    const maxLevelNumber =
      settings.levels.length > 0
        ? Math.max(...settings.levels.map((l) => l.levelNumber))
        : 0;
    if (level.levelNumber !== maxLevelNumber) {
      return response.errorResponse(
        res,
        {
          msg: "Only the last level can be deleted. Delete levels from the end one by one.",
        },
        "Only the last level can be deleted.",
        400,
      );
    }

    settings.levels.pull(id);
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Level deleted successfully.",
    );
  } catch (err) {
    console.error("Error in deleteLevel:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route POST /api/admin/wallet-settings/clubs
 * @desc Add club
 * @access Private (Admin only)
 */
const addClub = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const {
      name,
      commissionPercent,
      minimumRankCode,
      selfSaleRequired,
      monthlyTarget,
      capping,
      isAdminOnly,
      minWithdrawal,
      maxWithdrawal,
    } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return response.errorResponse(
        res,
        { msg: "Club name is required." },
        "Validation Error",
        400,
      );
    }

    const parsedCommissionPercent = parseFloat(commissionPercent);
    if (
      isNaN(parsedCommissionPercent) ||
      parsedCommissionPercent < 0 ||
      parsedCommissionPercent > 100
    ) {
      return response.errorResponse(
        res,
        { msg: "commissionPercent must be between 0 and 100." },
        "Validation Error",
        400,
      );
    }

    const nameLower = trimmedName.toLowerCase();
    const duplicate = settings.clubs.some(
      (c) => c.name.trim().toLowerCase() === nameLower,
    );
    if (duplicate) {
      return response.errorResponse(
        res,
        { msg: "Club name must be unique (case-insensitive)." },
        "Validation Error",
        400,
      );
    }

    const walletKeyFromName =
      trimmedName
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_]/g, "")
        .toUpperCase() || "CLUB";
    const existingKeys = [
      ...(settings.levels || [])
        .map((l) => (l.walletKey || "").toUpperCase())
        .filter(Boolean),
      ...(settings.ranks || [])
        .map((r) => (r.walletKey || "").toUpperCase())
        .filter(Boolean),
      ...(settings.clubs || [])
        .map((c) => (c.walletKey || "").toUpperCase())
        .filter(Boolean),
    ];
    let walletKey = walletKeyFromName;
    let suffix = 0;
    while (existingKeys.includes(walletKey)) {
      suffix += 1;
      walletKey = `${walletKeyFromName}_${suffix}`;
    }

    const minRankRes = parseOptionalMoneyOrNull(
      minimumRankCode,
      "minimumRankCode",
    );
    if (minRankRes.error) {
      return response.errorResponse(
        res,
        { msg: minRankRes.error },
        "Validation Error",
        400,
      );
    }
    const selfSaleRes = parseOptionalMoney(
      selfSaleRequired,
      "selfSaleRequired",
    );
    if (selfSaleRes.error) {
      return response.errorResponse(
        res,
        { msg: selfSaleRes.error },
        "Validation Error",
        400,
      );
    }
    const monthlyTargetRes = parseOptionalMoney(monthlyTarget, "monthlyTarget");
    if (monthlyTargetRes.error) {
      return response.errorResponse(
        res,
        { msg: monthlyTargetRes.error },
        "Validation Error",
        400,
      );
    }
    const cappingRes = parseOptionalMoney(capping, "capping");
    if (cappingRes.error) {
      return response.errorResponse(
        res,
        { msg: cappingRes.error },
        "Validation Error",
        400,
      );
    }
    const minWithdrawalRes = parseOptionalMoneyOrNull(
      minWithdrawal,
      "minWithdrawal",
    );
    if (minWithdrawalRes.error) {
      return response.errorResponse(
        res,
        { msg: minWithdrawalRes.error },
        "Validation Error",
        400,
      );
    }
    const maxWithdrawalRes = parseOptionalMoneyOrNull(
      maxWithdrawal,
      "maxWithdrawal",
    );
    if (maxWithdrawalRes.error) {
      return response.errorResponse(
        res,
        { msg: maxWithdrawalRes.error },
        "Validation Error",
        400,
      );
    }
    if (
      minWithdrawalRes.value != null &&
      maxWithdrawalRes.value != null &&
      minWithdrawalRes.value > maxWithdrawalRes.value
    ) {
      return response.errorResponse(
        res,
        { msg: "minWithdrawal must be <= maxWithdrawal." },
        "Validation Error",
        400,
      );
    }

    const newClub = {
      name: trimmedName,
      walletKey,
      commissionPercent: parsedCommissionPercent,
      minimumRankCode: minRankRes.value,
      selfSaleRequired: selfSaleRes.value,
      monthlyTarget: monthlyTargetRes.value,
      capping: cappingRes.value,
      isAdminOnly: Boolean(isAdminOnly),
      minWithdrawal: minWithdrawalRes.value,
      maxWithdrawal: maxWithdrawalRes.value,
    };
    assertTotalCommissionWithinLimit({
      levels: settings.levels || [],
      ranks: settings.ranks || [],
      clubs: [...(settings.clubs || []), newClub],
      designations: settings.designations || [],
    });

    settings.clubs.push(newClub);
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(res, settings, "Club added successfully.");
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    console.error("Error in addClub:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/clubs/:id
 * @desc Update club
 * @access Private (Admin only)
 */
const updateClub = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid club id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const club = settings.clubs.id(id);
    if (!club) {
      return response.errorResponse(
        res,
        { msg: "Club not found." },
        "Not found",
        404,
      );
    }

    const {
      name,
      commissionPercent,
      minimumRankCode,
      selfSaleRequired,
      monthlyTarget,
      capping,
      isAdminOnly,
      minWithdrawal,
      maxWithdrawal,
    } = req.body;

    if (name !== undefined) {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) {
        return response.errorResponse(
          res,
          { msg: "Club name is required." },
          "Validation Error",
          400,
        );
      }
      const nameLower = trimmedName.toLowerCase();
      const duplicate = settings.clubs.some(
        (c) =>
          c._id.toString() !== id && c.name.trim().toLowerCase() === nameLower,
      );
      if (duplicate) {
        return response.errorResponse(
          res,
          { msg: "Club name must be unique (case-insensitive)." },
          "Validation Error",
          400,
        );
      }
      club.name = trimmedName;
      const base =
        trimmedName
          .replace(/\s+/g, "_")
          .replace(/[^A-Za-z0-9_]/g, "")
          .toUpperCase() || "CLUB";
      const existingKeys = [
        ...(settings.levels || [])
          .map((l) => (l.walletKey || "").toUpperCase())
          .filter(Boolean),
        ...(settings.ranks || [])
          .map((r) => (r.walletKey || "").toUpperCase())
          .filter(Boolean),
        ...(settings.clubs || [])
          .filter((c) => c._id.toString() !== id)
          .map((c) => (c.walletKey || "").toUpperCase())
          .filter(Boolean),
      ];
      let walletKey = base;
      let suffix = 0;
      while (existingKeys.includes(walletKey)) {
        suffix += 1;
        walletKey = `${base}_${suffix}`;
      }
      club.walletKey = walletKey;
    }
    if (commissionPercent !== undefined) {
      const parsed = parseFloat(commissionPercent);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return response.errorResponse(
          res,
          { msg: "commissionPercent must be between 0 and 100." },
          "Validation Error",
          400,
        );
      }
      club.commissionPercent = parsed;
    }
    if (minimumRankCode !== undefined) {
      const res_ = parseOptionalMoneyOrNull(minimumRankCode, "minimumRankCode");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      club.minimumRankCode = res_.value;
    }
    if (selfSaleRequired !== undefined) {
      const res_ = parseOptionalMoney(selfSaleRequired, "selfSaleRequired");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      club.selfSaleRequired = res_.value;
    }
    if (monthlyTarget !== undefined) {
      const mtRes = parseOptionalMoney(monthlyTarget, "monthlyTarget");
      if (mtRes.error) {
        return response.errorResponse(
          res,
          { msg: mtRes.error },
          "Validation Error",
          400,
        );
      }
      club.monthlyTarget = mtRes.value;
    }
    if (capping !== undefined) {
      const capRes = parseOptionalMoney(capping, "capping");
      if (capRes.error) {
        return response.errorResponse(
          res,
          { msg: capRes.error },
          "Validation Error",
          400,
        );
      }
      club.capping = capRes.value;
    }
    if (isAdminOnly !== undefined) {
      club.isAdminOnly = Boolean(isAdminOnly);
    }
    if (minWithdrawal !== undefined) {
      const res_ = parseOptionalMoneyOrNull(
        req.body.minWithdrawal,
        "minWithdrawal",
      );
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      club.minWithdrawal = res_.value;
    }
    if (maxWithdrawal !== undefined) {
      const res_ = parseOptionalMoneyOrNull(
        req.body.maxWithdrawal,
        "maxWithdrawal",
      );
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      club.maxWithdrawal = res_.value;
    }
    const mn = club.minWithdrawal;
    const mx = club.maxWithdrawal;
    if (mn != null && mx != null && mn > mx) {
      return response.errorResponse(
        res,
        { msg: "minWithdrawal must be <= maxWithdrawal." },
        "Validation Error",
        400,
      );
    }

    incrementConfigVersion(settings);
    assertTotalCommissionWithinLimit(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Club updated successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    console.error("Error in updateClub:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route DELETE /api/admin/wallet-settings/clubs/:id
 * @desc Delete club
 * @access Private (Admin only)
 */
const deleteClub = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid club id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const clubExists = settings.clubs.some(
      (c) => c._id && c._id.toString() === id,
    );
    if (!clubExists) {
      return response.errorResponse(
        res,
        { msg: "Club not found." },
        "Not found",
        404,
      );
    }

    settings.clubs.pull(id);
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Club deleted successfully.",
    );
  } catch (err) {
    console.error("Error in deleteClub:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route POST /api/admin/wallet-settings/ranks
 * @desc Add rank (sequential rankCode, step progression)
 * @access Private (Admin only)
 */
const addRank = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const {
      name,
      commissionPercent,
      selfSaleRequired,
      teamSizeRequired,
      requiredRankCount,
      monthlyTarget,
      capping,
      requiredDesignations,
    } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return response.errorResponse(
        res,
        { msg: "Rank name is required." },
        "Validation Error",
        400,
      );
    }
    const rankName = trimmedName.toUpperCase();

    const parsedCommissionPercent = parseFloat(commissionPercent);
    if (
      isNaN(parsedCommissionPercent) ||
      parsedCommissionPercent < 0 ||
      parsedCommissionPercent > 100
    ) {
      return response.errorResponse(
        res,
        { msg: "commissionPercent must be between 0 and 100." },
        "Validation Error",
        400,
      );
    }

    const ranks = settings.ranks || [];
    const nextRankCode =
      ranks.length > 0 ? Math.max(...ranks.map((r) => r.rankCode || 0)) + 1 : 1;

    const selfSaleRes = parseOptionalMoney(
      selfSaleRequired,
      "selfSaleRequired",
    );
    if (selfSaleRes.error) {
      return response.errorResponse(
        res,
        { msg: selfSaleRes.error },
        "Validation Error",
        400,
      );
    }
    const teamSizeRes = parseOptionalMoney(
      teamSizeRequired,
      "teamSizeRequired",
    );
    if (teamSizeRes.error) {
      return response.errorResponse(
        res,
        { msg: teamSizeRes.error },
        "Validation Error",
        400,
      );
    }
    const requiredRankCountRes = parseOptionalMoney(
      requiredRankCount,
      "requiredRankCount",
    );
    if (requiredRankCountRes.error) {
      return response.errorResponse(
        res,
        { msg: requiredRankCountRes.error },
        "Validation Error",
        400,
      );
    }
    const monthlyTargetRes = parseOptionalMoney(monthlyTarget, "monthlyTarget");
    if (monthlyTargetRes.error) {
      return response.errorResponse(
        res,
        { msg: monthlyTargetRes.error },
        "Validation Error",
        400,
      );
    }
    const cappingRes = parseOptionalMoney(capping, "capping");
    if (cappingRes.error) {
      return response.errorResponse(
        res,
        { msg: cappingRes.error },
        "Validation Error",
        400,
      );
    }

    const nameLower = rankName.toLowerCase();
    const duplicate = ranks.some(
      (r) => (r.name || "").trim().toLowerCase() === nameLower,
    );
    if (duplicate) {
      return response.errorResponse(
        res,
        { msg: "Rank name must be unique (case-insensitive)." },
        "Validation Error",
        400,
      );
    }

    const walletKey = `RANK_${nextRankCode}`;
    const requiredRankCode = nextRankCode === 1 ? null : nextRankCode - 1;

    const designations = settings.designations || [];
    const desCodesSet = new Set(designations.map((d) => d.designationCode));
    const validatedReqDes = [];
    if (
      Array.isArray(requiredDesignations) &&
      requiredDesignations.length > 0
    ) {
      const seen = new Set();
      for (const rd of requiredDesignations) {
        const code = rd?.designationCode;
        const minCount = rd?.minCount;
        if (code == null || !desCodesSet.has(code)) {
          return response.errorResponse(
            res,
            {
              msg: `requiredDesignations: designationCode ${code} must exist in designations`,
            },
            "Validation Error",
            400,
          );
        }
        if (seen.has(code)) {
          return response.errorResponse(
            res,
            { msg: `requiredDesignations: duplicate designationCode ${code}` },
            "Validation Error",
            400,
          );
        }
        seen.add(code);
        const mc =
          typeof minCount === "number" ? minCount : parseInt(minCount, 10);
        if (isNaN(mc) || mc < 1) {
          return response.errorResponse(
            res,
            { msg: "requiredDesignations: minCount must be >= 1" },
            "Validation Error",
            400,
          );
        }
        validatedReqDes.push({ designationCode: code, minCount: mc });
      }
    }

    const newRank = {
      rankCode: nextRankCode,
      name: rankName,
      walletKey,
      commissionPercent: parsedCommissionPercent,
      selfSaleRequired: selfSaleRes.value,
      teamSizeRequired: teamSizeRes.value,
      requiredRankCode,
      requiredRankCount: requiredRankCountRes.value,
      monthlyTarget: monthlyTargetRes.value,
      capping: cappingRes.value,
      requiredDesignations: validatedReqDes,
    };
    assertTotalCommissionWithinLimit({
      levels: settings.levels || [],
      ranks: [...ranks, newRank],
      clubs: settings.clubs || [],
      designations: designations,
    });
    settings.ranks.push(newRank);
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(res, settings, "Rank added successfully.");
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    console.error("Error in addRank:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/ranks/:id
 * @desc Update rank (rankCode and requiredRankCode are read-only)
 * @access Private (Admin only)
 */
const updateRank = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid rank id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const rank = settings.ranks ? settings.ranks.id(id) : null;
    if (!rank) {
      return response.errorResponse(
        res,
        { msg: "Rank not found." },
        "Not found",
        404,
      );
    }

    const {
      name,
      commissionPercent,
      selfSaleRequired,
      teamSizeRequired,
      requiredRankCount,
      monthlyTarget,
      capping,
      requiredDesignations,
    } = req.body;

    if (name !== undefined) {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) {
        return response.errorResponse(
          res,
          { msg: "Rank name is required." },
          "Validation Error",
          400,
        );
      }
      const rankName = trimmedName.toUpperCase();
      const nameLower = rankName.toLowerCase();
      const duplicate = (settings.ranks || []).some(
        (r) =>
          r._id.toString() !== id &&
          (r.name || "").trim().toLowerCase() === nameLower,
      );
      if (duplicate) {
        return response.errorResponse(
          res,
          { msg: "Rank name must be unique (case-insensitive)." },
          "Validation Error",
          400,
        );
      }
      rank.name = rankName;
    }
    if (commissionPercent !== undefined) {
      const parsed = parseFloat(commissionPercent);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return response.errorResponse(
          res,
          { msg: "commissionPercent must be between 0 and 100." },
          "Validation Error",
          400,
        );
      }
      rank.commissionPercent = parsed;
    }
    if (selfSaleRequired !== undefined) {
      const res_ = parseOptionalMoney(selfSaleRequired, "selfSaleRequired");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      rank.selfSaleRequired = res_.value;
    }
    if (teamSizeRequired !== undefined) {
      const res_ = parseOptionalMoney(teamSizeRequired, "teamSizeRequired");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      rank.teamSizeRequired = res_.value;
    }
    if (requiredRankCount !== undefined) {
      const res_ = parseOptionalMoney(requiredRankCount, "requiredRankCount");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      rank.requiredRankCount = res_.value;
    }
    if (monthlyTarget !== undefined) {
      const mtRes = parseOptionalMoney(monthlyTarget, "monthlyTarget");
      if (mtRes.error) {
        return response.errorResponse(
          res,
          { msg: mtRes.error },
          "Validation Error",
          400,
        );
      }
      rank.monthlyTarget = mtRes.value;
    }
    if (capping !== undefined) {
      const capRes = parseOptionalMoney(capping, "capping");
      if (capRes.error) {
        return response.errorResponse(
          res,
          { msg: capRes.error },
          "Validation Error",
          400,
        );
      }
      rank.capping = capRes.value;
    }
    if (requiredDesignations !== undefined) {
      const designations = settings.designations || [];
      const desCodesSet = new Set(designations.map((d) => d.designationCode));
      if (
        Array.isArray(requiredDesignations) &&
        requiredDesignations.length > 0
      ) {
        const validatedReqDes = [];
        const seen = new Set();
        for (const rd of requiredDesignations) {
          const code = rd?.designationCode;
          const minCount = rd?.minCount;
          if (code == null || !desCodesSet.has(code)) {
            return response.errorResponse(
              res,
              {
                msg: `requiredDesignations: designationCode ${code} must exist in designations`,
              },
              "Validation Error",
              400,
            );
          }
          if (seen.has(code)) {
            return response.errorResponse(
              res,
              {
                msg: `requiredDesignations: duplicate designationCode ${code}`,
              },
              "Validation Error",
              400,
            );
          }
          seen.add(code);
          const mc =
            typeof minCount === "number" ? minCount : parseInt(minCount, 10);
          if (isNaN(mc) || mc < 1) {
            return response.errorResponse(
              res,
              { msg: "requiredDesignations: minCount must be >= 1" },
              "Validation Error",
              400,
            );
          }
          validatedReqDes.push({ designationCode: code, minCount: mc });
        }
        rank.requiredDesignations = validatedReqDes;
      } else {
        rank.requiredDesignations = [];
      }
    }

    incrementConfigVersion(settings);
    assertTotalCommissionWithinLimit(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Rank updated successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    console.error("Error in updateRank:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route DELETE /api/admin/wallet-settings/ranks/:id
 * @desc Delete rank (only the last rank by rankCode can be deleted)
 * @access Private (Admin only)
 */
const deleteRank = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid rank id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const rank = (settings.ranks || []).find(
      (r) => r._id && r._id.toString() === id,
    );
    if (!rank) {
      return response.errorResponse(
        res,
        { msg: "Rank not found." },
        "Not found",
        404,
      );
    }

    const maxRankCode =
      (settings.ranks || []).length > 0
        ? Math.max(...(settings.ranks || []).map((r) => r.rankCode || 0))
        : 0;
    if ((rank.rankCode || 0) !== maxRankCode) {
      return response.errorResponse(
        res,
        {
          msg: "Only the last rank can be deleted. Delete ranks from the end one by one.",
        },
        "Cannot delete rank if higher rank exists.",
        400,
      );
    }

    // QA Q22: Block delete if any user has this rank
    const User = require("../../../models/User");
    const usersWithRank = await User.countDocuments({ rankCode: rank.rankCode });
    if (usersWithRank > 0) {
      return response.errorResponse(
        res,
        {
          msg: `Cannot delete rank: ${usersWithRank} user(s) have Rank ${rank.rankCode}. Migrate them first.`,
        },
        "Rank in use",
        400,
      );
    }

    settings.ranks.pull(id);
    incrementConfigVersion(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Rank deleted successfully.",
    );
  } catch (err) {
    console.error("Error in deleteRank:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route POST /api/admin/wallet-settings/designations
 * @desc Add designation (sequential designationCode)
 * @access Private (Admin only)
 */
const addDesignation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const {
      name,
      commissionPercent,
      selfSaleRequired,
      teamSizeRequired,
      requiredDesignationCode,
      requiredDesignationCount,
      monthlyTarget,
      isActive,
      freeSessionCount,
      maxSessionsPerDay,
    } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return response.errorResponse(
        res,
        { msg: "Designation name is required." },
        "Validation Error",
        400,
      );
    }
    const parsedCp = parseFloat(commissionPercent);
    if (isNaN(parsedCp) || parsedCp < 0 || parsedCp > 100) {
      return response.errorResponse(
        res,
        { msg: "commissionPercent must be between 0 and 100." },
        "Validation Error",
        400,
      );
    }

    const designations = settings.designations || [];
    const nextCode =
      designations.length > 0
        ? Math.max(...designations.map((d) => d.designationCode || 0)) + 1
        : 1;
    const nameLower = trimmedName.toLowerCase();
    const duplicate = designations.some(
      (d) => (d.name || "").trim().toLowerCase() === nameLower,
    );
    if (duplicate) {
      return response.errorResponse(
        res,
        { msg: "Designation name must be unique (case-insensitive)." },
        "Validation Error",
        400,
      );
    }

    const selfSaleRes = parseOptionalMoney(
      selfSaleRequired,
      "selfSaleRequired",
    );
    if (selfSaleRes.error)
      return response.errorResponse(
        res,
        { msg: selfSaleRes.error },
        "Validation Error",
        400,
      );
    const teamSizeRes = parseOptionalMoney(
      teamSizeRequired,
      "teamSizeRequired",
    );
    if (teamSizeRes.error)
      return response.errorResponse(
        res,
        { msg: teamSizeRes.error },
        "Validation Error",
        400,
      );
    const reqDesCountRes = parseOptionalMoney(
      requiredDesignationCount,
      "requiredDesignationCount",
    );
    if (reqDesCountRes.error)
      return response.errorResponse(
        res,
        { msg: reqDesCountRes.error },
        "Validation Error",
        400,
      );
    const monthlyRes = parseOptionalMoney(monthlyTarget, "monthlyTarget");
    if (monthlyRes.error)
      return response.errorResponse(
        res,
        { msg: monthlyRes.error },
        "Validation Error",
        400,
      );

    let reqDesCode = null;
    if (
      requiredDesignationCode !== undefined &&
      requiredDesignationCode !== null &&
      requiredDesignationCode !== ""
    ) {
      const n = parseInt(requiredDesignationCode, 10);
      if (isNaN(n) || n < 1) {
        return response.errorResponse(
          res,
          { msg: "requiredDesignationCode must be a valid positive number." },
          "Validation Error",
          400,
        );
      }
      if (!designations.some((d) => d.designationCode === n)) {
        return response.errorResponse(
          res,
          { msg: "requiredDesignationCode must exist in designations." },
          "Validation Error",
          400,
        );
      }
      if (n >= nextCode) {
        return response.errorResponse(
          res,
          {
            msg: "requiredDesignationCode must be less than current designationCode.",
          },
          "Validation Error",
          400,
        );
      }
      reqDesCode = n;
    }
    if (reqDesCode == null && reqDesCountRes.value > 0) {
      return response.errorResponse(
        res,
        {
          msg: "requiredDesignationCount must be 0 when requiredDesignationCode is null.",
        },
        "Validation Error",
        400,
      );
    }

    const freeSessionCountVal =
      freeSessionCount !== undefined && freeSessionCount !== null && freeSessionCount !== ""
        ? parseInt(freeSessionCount, 10)
        : 0;
    if (Number.isNaN(freeSessionCountVal) || freeSessionCountVal < 0) {
      return response.errorResponse(
        res,
        { msg: "freeSessionCount must be >= 0." },
        "Validation Error",
        400,
      );
    }
    const maxSessionsPerDayVal =
      maxSessionsPerDay !== undefined && maxSessionsPerDay !== null && maxSessionsPerDay !== ""
        ? parseInt(maxSessionsPerDay, 10)
        : 5;
    if (Number.isNaN(maxSessionsPerDayVal) || maxSessionsPerDayVal < 1) {
      return response.errorResponse(
        res,
        { msg: "maxSessionsPerDay is required and must be >= 1." },
        "Validation Error",
        400,
      );
    }

    const newDes = {
      designationCode: nextCode,
      name: trimmedName.toUpperCase(),
      walletKey: `DESIGNATION_${nextCode}`,
      commissionPercent: parsedCp,
      selfSaleRequired: selfSaleRes.value,
      teamSizeRequired: teamSizeRes.value,
      requiredDesignationCode: reqDesCode,
      requiredDesignationCount: reqDesCountRes.value,
      monthlyTarget: monthlyRes.value,
      isActive: isActive !== false,
      freeSessionCount: freeSessionCountVal,
      maxSessionsPerDay: maxSessionsPerDayVal,
    };

    const existingKeys = [
      ...(settings.levels || [])
        .map((l) => (l.walletKey || "").toUpperCase())
        .filter(Boolean),
      ...(settings.ranks || [])
        .map((r) => (r.walletKey || "").toUpperCase())
        .filter(Boolean),
      ...(settings.clubs || [])
        .map((c) => (c.walletKey || "").toUpperCase())
        .filter(Boolean),
      ...designations
        .map((d) => (d.walletKey || "").toUpperCase())
        .filter(Boolean),
    ];
    let wk = newDes.walletKey;
    let suffix = 0;
    while (existingKeys.includes(wk)) {
      suffix += 1;
      wk = `DESIGNATION_${nextCode}_${suffix}`;
    }
    newDes.walletKey = wk;

    assertTotalCommissionWithinLimit({
      levels: settings.levels || [],
      ranks: settings.ranks || [],
      clubs: settings.clubs || [],
      designations: [...designations, newDes],
    });
    settings.designations.push(newDes);
    incrementConfigVersion(settings);
    await settings.save();
    return response.successResponse(
      res,
      settings,
      "Designation added successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res
        .status(400)
        .json({ status: false, message: "Validation failed", errors });
    }
    console.error("Error in addDesignation:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/designations/:id
 * @desc Update designation
 * @access Private (Admin only)
 */
const updateDesignation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid designation id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const des = (settings.designations || []).find(
      (d) => d._id && d._id.toString() === id,
    );
    if (!des) {
      return response.errorResponse(
        res,
        { msg: "Designation not found." },
        "Not found",
        404,
      );
    }

    const {
      name,
      commissionPercent,
      selfSaleRequired,
      teamSizeRequired,
      requiredDesignationCode,
      requiredDesignationCount,
      monthlyTarget,
      isActive,
      freeSessionCount,
      maxSessionsPerDay,
    } = req.body;

    if (name !== undefined) {
      const t = typeof name === "string" ? name.trim() : "";
      if (!t)
        return response.errorResponse(
          res,
          { msg: "Designation name is required." },
          "Validation Error",
          400,
        );
      const lower = t.toUpperCase().toLowerCase();
      const dup = (settings.designations || []).some(
        (d) =>
          d._id.toString() !== id &&
          (d.name || "").trim().toLowerCase() === lower,
      );
      if (dup)
        return response.errorResponse(
          res,
          { msg: "Designation name must be unique (case-insensitive)." },
          "Validation Error",
          400,
        );
      des.name = t.toUpperCase();
    }
    if (commissionPercent !== undefined) {
      const n = parseFloat(commissionPercent);
      if (isNaN(n) || n < 0 || n > 100)
        return response.errorResponse(
          res,
          { msg: "commissionPercent must be between 0 and 100." },
          "Validation Error",
          400,
        );
      des.commissionPercent = n;
    }
    if (selfSaleRequired !== undefined) {
      const r = parseOptionalMoney(selfSaleRequired, "selfSaleRequired");
      if (r.error)
        return response.errorResponse(
          res,
          { msg: r.error },
          "Validation Error",
          400,
        );
      des.selfSaleRequired = r.value;
    }
    if (teamSizeRequired !== undefined) {
      const r = parseOptionalMoney(teamSizeRequired, "teamSizeRequired");
      if (r.error)
        return response.errorResponse(
          res,
          { msg: r.error },
          "Validation Error",
          400,
        );
      des.teamSizeRequired = r.value;
    }
    if (requiredDesignationCode !== undefined) {
      if (requiredDesignationCode === null || requiredDesignationCode === "") {
        des.requiredDesignationCode = null;
        des.requiredDesignationCount = 0;
      } else {
        const n = parseInt(requiredDesignationCode, 10);
        if (isNaN(n) || n < 1)
          return response.errorResponse(
            res,
            { msg: "requiredDesignationCode must be a valid positive number." },
            "Validation Error",
            400,
          );
        const codes = (settings.designations || []).map(
          (d) => d.designationCode,
        );
        if (!codes.includes(n))
          return response.errorResponse(
            res,
            { msg: "requiredDesignationCode must exist." },
            "Validation Error",
            400,
          );
        if (n >= des.designationCode)
          return response.errorResponse(
            res,
            { msg: "requiredDesignationCode must be less than current." },
            "Validation Error",
            400,
          );
        des.requiredDesignationCode = n;
        if (requiredDesignationCount !== undefined) {
          const r = parseOptionalMoney(
            requiredDesignationCount,
            "requiredDesignationCount",
          );
          if (r.error)
            return response.errorResponse(
              res,
              { msg: r.error },
              "Validation Error",
              400,
            );
          des.requiredDesignationCount = r.value;
        }
      }
    }
    if (
      requiredDesignationCount !== undefined &&
      des.requiredDesignationCode != null
    ) {
      const r = parseOptionalMoney(
        requiredDesignationCount,
        "requiredDesignationCount",
      );
      if (r.error)
        return response.errorResponse(
          res,
          { msg: r.error },
          "Validation Error",
          400,
        );
      des.requiredDesignationCount = r.value;
    }
    if (monthlyTarget !== undefined) {
      const r = parseOptionalMoney(monthlyTarget, "monthlyTarget");
      if (r.error)
        return response.errorResponse(
          res,
          { msg: r.error },
          "Validation Error",
          400,
        );
      des.monthlyTarget = r.value;
    }
    if (freeSessionCount !== undefined) {
      const val =
        freeSessionCount === "" || freeSessionCount === null
          ? 0
          : parseInt(freeSessionCount, 10);
      if (Number.isNaN(val) || val < 0)
        return response.errorResponse(
          res,
          { msg: "freeSessionCount must be >= 0." },
          "Validation Error",
          400,
        );
      des.freeSessionCount = val;
    }
    if (maxSessionsPerDay !== undefined) {
      const val =
        maxSessionsPerDay === "" || maxSessionsPerDay === null
          ? 5
          : parseInt(maxSessionsPerDay, 10);
      if (Number.isNaN(val) || val < 1)
        return response.errorResponse(
          res,
          { msg: "maxSessionsPerDay must be >= 1." },
          "Validation Error",
          400,
        );
      des.maxSessionsPerDay = val;
    }
    if (isActive !== undefined) des.isActive = Boolean(isActive);

    incrementConfigVersion(settings);
    assertTotalCommissionWithinLimit(settings);
    await settings.save();
    return response.successResponse(
      res,
      settings,
      "Designation updated successfully.",
    );
  } catch (err) {
    if (
      err.message &&
      err.message.includes("Total commission must not exceed")
    ) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Commission overflow.",
        400,
      );
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res
        .status(400)
        .json({ status: false, message: "Validation failed", errors });
    }
    console.error("Error in updateDesignation:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route DELETE /api/admin/wallet-settings/designations/:id
 * @desc Delete designation (only the last designation can be deleted)
 * @access Private (Admin only)
 */
const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        { msg: "Invalid designation id." },
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const des = (settings.designations || []).find(
      (d) => d._id && d._id.toString() === id,
    );
    if (!des) {
      return response.errorResponse(
        res,
        { msg: "Designation not found." },
        "Not found",
        404,
      );
    }
    const maxCode =
      (settings.designations || []).length > 0
        ? Math.max(
            ...(settings.designations || []).map((d) => d.designationCode || 0),
          )
        : 0;
    if ((des.designationCode || 0) !== maxCode) {
      return response.errorResponse(
        res,
        {
          msg: "Only the last designation can be deleted. Delete from the end.",
        },
        "Cannot delete",
        400,
      );
    }

    // QA Q23: Block delete if any rank requires this designation
    const ranks = settings.ranks || [];
    const rankRequiring = ranks.find((r) =>
      (r.requiredDesignations || []).some(
        (rd) => rd.designationCode === des.designationCode
      )
    );
    if (rankRequiring) {
      return response.errorResponse(
        res,
        {
          msg: `Cannot delete designation: Rank ${rankRequiring.rankCode} requires it. Remove from rank config first.`,
        },
        "Cannot delete designation",
        400,
      );
    }

    settings.designations.pull(id);
    incrementConfigVersion(settings);
    await settings.save();
    return response.successResponse(
      res,
      settings,
      "Designation deleted successfully.",
    );
  } catch (err) {
    console.error("Error in deleteDesignation:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/governance
 * @desc Update governance settings (maxAdminAdjustAmount, mainMinWithdrawal, mainMaxWithdrawal, maxUserTransactionsPerDay)
 * @access Private (Admin only)
 */
const updateGovernanceSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const {
      maxAdminAdjustAmount,
      mainMinWithdrawal,
      mainMaxWithdrawal,
      maxUserTransactionsPerDay,
      freeAppointmentsPerUser,
      counsellingCharge,
      adminWithdrawalSurchargePercent,
      isWithdrawalEnabled,
    } = req.body;

    if (maxAdminAdjustAmount !== undefined) {
      const n = parseInt(maxAdminAdjustAmount, 10);
      if (isNaN(n) || n < 0) {
        return response.errorResponse(
          res,
          { msg: "maxAdminAdjustAmount must be a non-negative integer." },
          "Validation Error",
          400,
        );
      }
      if (n > 100000000) {
        return response.errorResponse(
          res,
          { msg: "maxAdminAdjustAmount cannot exceed 100000000 (10 crore)." },
          "Validation Error",
          400,
        );
      }
      settings.maxAdminAdjustAmount = n;
    }
    if (mainMinWithdrawal !== undefined) {
      const res_ = parseOptionalMoneyOrNull(
        mainMinWithdrawal,
        "mainMinWithdrawal",
      );
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      settings.mainMinWithdrawal = res_.value;
    }
    if (mainMaxWithdrawal !== undefined) {
      const res_ = parseOptionalMoneyOrNull(
        mainMaxWithdrawal,
        "mainMaxWithdrawal",
      );
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      settings.mainMaxWithdrawal = res_.value;
    }
    if (maxUserTransactionsPerDay !== undefined) {
      if (
        maxUserTransactionsPerDay === null ||
        maxUserTransactionsPerDay === ""
      ) {
        settings.maxUserTransactionsPerDay = null;
      } else {
        const n = parseInt(maxUserTransactionsPerDay, 10);
        if (isNaN(n) || n < 0) {
          return response.errorResponse(
            res,
            {
              msg: "maxUserTransactionsPerDay must be a non-negative integer.",
            },
            "Validation Error",
            400,
          );
        }
        settings.maxUserTransactionsPerDay = n;
      }
    }
    if (freeAppointmentsPerUser !== undefined) {
      const n = parseInt(freeAppointmentsPerUser, 10);
      if (isNaN(n) || n < 0) {
        return response.errorResponse(
          res,
          {
            msg: "freeAppointmentsPerUser must be a non-negative integer.",
          },
          "Validation Error",
          400,
        );
      }
      settings.freeAppointmentsPerUser = n;
    }
    if (counsellingCharge !== undefined) {
      const res_ = parseOptionalMoneyOrNull(counsellingCharge, "counsellingCharge");
      if (res_.error) {
        return response.errorResponse(
          res,
          { msg: res_.error },
          "Validation Error",
          400,
        );
      }
      settings.counsellingCharge = res_.value ?? 0;
    }

    if (adminWithdrawalSurchargePercent !== undefined) {
      if (
        adminWithdrawalSurchargePercent === null ||
        adminWithdrawalSurchargePercent === ""
      ) {
        settings.adminWithdrawalSurchargePercent = 0;
      } else {
        const n = parseInt(adminWithdrawalSurchargePercent, 10);
        if (Number.isNaN(n) || n < 0 || n > 99) {
          return response.errorResponse(
            res,
            {
              msg: "adminWithdrawalSurchargePercent must be an integer between 0 and 99.",
            },
            "Validation Error",
            400,
          );
        }
        settings.adminWithdrawalSurchargePercent = n;
      }
    }

    if (isWithdrawalEnabled !== undefined) {
      settings.isWithdrawalEnabled = Boolean(isWithdrawalEnabled);
    }

    if (
      settings.mainMinWithdrawal != null &&
      settings.mainMaxWithdrawal != null &&
      settings.mainMinWithdrawal > settings.mainMaxWithdrawal
    ) {
      return response.errorResponse(
        res,
        { msg: "mainMinWithdrawal must be <= mainMaxWithdrawal." },
        "Validation Error",
        400,
      );
    }

    incrementConfigVersion(settings);
    assertTotalCommissionWithinLimit(settings);
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Governance settings updated successfully.",
    );
  } catch (err) {
    if (err.message && err.message.includes("mainMinWithdrawal must be")) {
      return response.errorResponse(
        res,
        { msg: err.message },
        "Validation Error",
        400,
      );
    }
    console.error("Error in updateGovernanceSettings:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/wallet-settings/commission-payout-settings
 * @desc Update commission payout schedule
 * @access Private (Admin only)
 */
const updateCommissionPayoutSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    let settings = await WalletSettings.getOrCreateSettings();
    const verErr = checkConfigVersion(settings, req.body);
    if (verErr) {
      return response.errorResponse(
        res,
        { msg: verErr.msg },
        "Version conflict.",
        verErr.statusCode,
      );
    }

    const {
      scheduleType,
      customDayOfMonth,
      customDayOfWeek,
      payoutTimeHH,
      payoutTimeMM,
    } = req.body;

    const validTypes = ["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly", "custom"];
    if (scheduleType !== undefined) {
      if (!validTypes.includes(scheduleType)) {
        return response.errorResponse(
          res,
          { msg: `scheduleType must be one of: ${validTypes.join(", ")}` },
          "Validation Error",
          400,
        );
      }
      settings.commissionPayoutSettings = settings.commissionPayoutSettings || {};
      settings.commissionPayoutSettings.scheduleType = scheduleType;
    }
    if (customDayOfMonth !== undefined) {
      const n = parseInt(customDayOfMonth, 10);
      if (isNaN(n) || n < 1 || n > 31) {
        return response.errorResponse(
          res,
          { msg: "customDayOfMonth must be 1-31" },
          "Validation Error",
          400,
        );
      }
      settings.commissionPayoutSettings = settings.commissionPayoutSettings || {};
      settings.commissionPayoutSettings.customDayOfMonth = n;
    }
    if (customDayOfWeek !== undefined) {
      const n = parseInt(customDayOfWeek, 10);
      if (isNaN(n) || n < 0 || n > 6) {
        return response.errorResponse(
          res,
          { msg: "customDayOfWeek must be 0-6 (Sun=0, Sat=6)" },
          "Validation Error",
          400,
        );
      }
      settings.commissionPayoutSettings = settings.commissionPayoutSettings || {};
      settings.commissionPayoutSettings.customDayOfWeek = n;
    }
    if (payoutTimeHH !== undefined) {
      const n = parseInt(payoutTimeHH, 10);
      if (isNaN(n) || n < 0 || n > 23) {
        return response.errorResponse(
          res,
          { msg: "payoutTimeHH must be 0-23" },
          "Validation Error",
          400,
        );
      }
      settings.commissionPayoutSettings = settings.commissionPayoutSettings || {};
      settings.commissionPayoutSettings.payoutTimeHH = n;
    }
    if (payoutTimeMM !== undefined) {
      const n = parseInt(payoutTimeMM, 10);
      if (isNaN(n) || n < 0 || n > 59) {
        return response.errorResponse(
          res,
          { msg: "payoutTimeMM must be 0-59" },
          "Validation Error",
          400,
        );
      }
      settings.commissionPayoutSettings = settings.commissionPayoutSettings || {};
      settings.commissionPayoutSettings.payoutTimeMM = n;
    }

    await settings.save();
    return response.successResponse(
      res,
      settings,
      "Commission payout settings updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateCommissionPayoutSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getWalletSettings,
  getDerivedWalletKeys,
  createWalletSettings,
  updateRegistrationFee,
  updateRegistrationFeeEditable,
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
  updateGovernanceSettings,
  updateCommissionPayoutSettings,
  updateAdminSurcharge,
};
