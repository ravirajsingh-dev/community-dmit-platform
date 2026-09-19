const mongoose = require("mongoose");
const { Schema } = mongoose;

const levelSchema = new Schema(
  {
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    walletKey: {
      type: String,
      trim: true,
      uppercase: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: true },
);

/**
 * Rank schema - strict structure per spec.
 * rankCode: 1,2,3... sequential. requiredRankCode = rankCode-1 (null for 1).
 * walletKey auto-derived from rankCode.
 */
const rankSchema = new Schema(
  {
    rankCode: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    walletKey: {
      type: String,
      trim: true,
      uppercase: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    selfSaleRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    teamSizeRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    requiredRankCode: {
      type: Number,
      default: null,
    },
    requiredRankCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    monthlyTarget: {
      type: Number,
      min: 0,
      default: 0,
    },
    capping: {
      type: Number,
      min: 0,
      default: 0,
    },
    requiredDesignations: [
      {
        designationCode: { type: Number, required: true },
        minCount: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { _id: true },
);

/**
 * Designation schema - dynamic designation configuration.
 * designationCode: 1,2,3... sequential. requiredDesignationCode < current.
 */
const designationSchema = new Schema(
  {
    designationCode: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    walletKey: {
      type: String,
      trim: true,
      uppercase: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    selfSaleRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    teamSizeRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    requiredDesignationCode: {
      type: Number,
      default: null,
    },
    requiredDesignationCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    monthlyTarget: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    freeSessionCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxSessionsPerDay: {
      type: Number,
      min: 1,
      default: 10,
    },
  },
  { _id: true },
);

const clubSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    walletKey: {
      type: String,
      trim: true,
      uppercase: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    minimumRankCode: {
      type: Number,
      default: null,
    },
    selfSaleRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    monthlyTarget: {
      type: Number,
      min: 0,
      default: 0,
    },
    capping: {
      type: Number,
      min: 0,
      default: 0,
    },
    isAdminOnly: {
      type: Boolean,
      default: false,
    },
    minTransfer: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxTransfer: {
      type: Number,
      min: 0,
      default: 0,
    },
    minWithdrawal: {
      type: Number,
      min: 0,
      default: null,
    },
    maxWithdrawal: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: true },
);

const WalletSettingsSchema = new Schema(
  {
    singletonKey: {
      type: String,
      default: "GLOBAL",
      required: true,
      unique: true,
      immutable: true,
    },
    registrationFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isRegistrationFeeEditable: {
      type: Boolean,
      default: false,
    },
    configVersion: {
      type: Number,
      default: 1,
    },
    maxAdminAdjustAmount: {
      type: Number,
      min: 0,
      default: 999999,
    },
    mainMinWithdrawal: {
      type: Number,
      min: 0,
      default: null,
    },
    mainMaxWithdrawal: {
      type: Number,
      min: 0,
      default: null,
    },
    maxUserTransactionsPerDay: {
      type: Number,
      min: 0,
      default: null,
    },
    freeAppointmentsPerUser: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Percentage surcharge on withdrawals configured via Governance (0–99 integer)
    adminWithdrawalSurchargePercent: {
      type: Number,
      min: 0,
      max: 99,
      default: 0,
    },
    // Master toggle: whether withdrawals are enabled at all
    isWithdrawalEnabled: {
      type: Boolean,
      default: true,
    },
    freeSessionExpiryMonths: {
      type: Number,
      min: 0,
      default: 12,
    },
    counsellingCharge: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Admin-configured surcharge percentage (0–99), kept in wallet settings
    adminSurchargePercent: {
      type: Number,
      min: 0,
      max: 99,
      default: 0,
    },
    /**
     * Commission Payout Schedule - Admin configurable
     * scheduleType: daily, weekly, monthly, quarterly, half_yearly, yearly, custom
     * customDayOfMonth: 1-31 for "har month ki X tarik" when scheduleType=custom or monthly
     * customDayOfWeek: 0-6 (Sun-Sat) for weekly
     */
    commissionPayoutSettings: {
      scheduleType: {
        type: String,
        enum: ["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly", "custom"],
        default: "monthly",
      },
      customDayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        default: 1,
      },
      customDayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 0,
      },
      payoutTimeHH: { type: Number, min: 0, max: 23, default: 1 },
      payoutTimeMM: { type: Number, min: 0, max: 59, default: 0 },
    },
    levels: { type: [levelSchema], default: [] },
    ranks: { type: [rankSchema], default: [] },
    clubs: { type: [clubSchema], default: [] },
    designations: { type: [designationSchema], default: [] },
  },
  { timestamps: true },
);

/**
 * Round monetary value to 2 decimal places
 */
function roundMoney(value) {
  if (
    typeof value !== "number" ||
    isNaN(value) ||
    value === Infinity ||
    value === -Infinity
  ) {
    return value;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Validate monetary field: valid number, >= 0, max 2 decimals, reject NaN/Infinity
 */
function validateMoney(value, fieldName) {
  if (typeof value !== "number" || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (value === Infinity || value === -Infinity) {
    throw new Error(`${fieldName} cannot be Infinity`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} must be >= 0`);
  }
  const decimals = (String(value).split(".")[1] || "").length;
  if (decimals > 2) {
    throw new Error(`${fieldName} must not have more than 2 decimal places`);
  }
}

WalletSettingsSchema.pre("save", async function () {
  const levels = this.levels || [];
  const ranks = this.ranks || [];
  const clubs = this.clubs || [];
  const designations = this.designations || [];

  // --- MONEY PRECISION: auto-round and validate ---
  if (
    typeof this.registrationFee !== "number" ||
    isNaN(this.registrationFee) ||
    this.registrationFee === Infinity ||
    this.registrationFee === -Infinity
  ) {
    throw new Error("registrationFee must be a valid number");
  }
  validateMoney(this.registrationFee, "registrationFee");
  this.registrationFee = roundMoney(this.registrationFee);
  for (const l of levels) {
    const cp = l.commissionPercent;
    if (
      typeof cp !== "number" ||
      isNaN(cp) ||
      cp === Infinity ||
      cp === -Infinity
    ) {
      throw new Error("level.commissionPercent must be a valid number");
    }
    validateMoney(cp, "level.commissionPercent");
    l.commissionPercent = roundMoney(cp);
  }
  for (const r of ranks) {
    const cp = r.commissionPercent;
    if (
      typeof cp !== "number" ||
      isNaN(cp) ||
      cp === Infinity ||
      cp === -Infinity
    ) {
      throw new Error("rank.commissionPercent must be a valid number");
    }
    validateMoney(cp, "rank.commissionPercent");
    r.commissionPercent = roundMoney(cp);
    validateMoney(r.selfSaleRequired ?? 0, "rank.selfSaleRequired");
    r.selfSaleRequired = roundMoney(r.selfSaleRequired ?? 0);
    validateMoney(r.teamSizeRequired ?? 0, "rank.teamSizeRequired");
    r.teamSizeRequired = roundMoney(r.teamSizeRequired ?? 0);
    validateMoney(r.requiredRankCount ?? 0, "rank.requiredRankCount");
    r.requiredRankCount = roundMoney(r.requiredRankCount ?? 0);
    validateMoney(r.monthlyTarget ?? 0, "rank.monthlyTarget");
    r.monthlyTarget = roundMoney(r.monthlyTarget ?? 0);
    validateMoney(r.capping ?? 0, "rank.capping");
    r.capping = roundMoney(r.capping ?? 0);
  }
  for (const c of clubs) {
    const cp = c.commissionPercent;
    if (
      typeof cp !== "number" ||
      isNaN(cp) ||
      cp === Infinity ||
      cp === -Infinity
    ) {
      throw new Error("club.commissionPercent must be a valid number");
    }
    validateMoney(cp, "club.commissionPercent");
    c.commissionPercent = roundMoney(cp);
    if (c.minimumRankCode != null) {
      validateMoney(c.minimumRankCode, "club.minimumRankCode");
      c.minimumRankCode = roundMoney(c.minimumRankCode);
    }
    validateMoney(c.selfSaleRequired ?? 0, "club.selfSaleRequired");
    c.selfSaleRequired = roundMoney(c.selfSaleRequired ?? 0);
    validateMoney(c.monthlyTarget ?? 0, "club.monthlyTarget");
    c.monthlyTarget = roundMoney(c.monthlyTarget ?? 0);
    validateMoney(c.capping ?? 0, "club.capping");
    c.capping = roundMoney(c.capping ?? 0);
    if (c.minWithdrawal != null) {
      validateMoney(c.minWithdrawal, "club.minWithdrawal");
      c.minWithdrawal = roundMoney(c.minWithdrawal);
    }
    if (c.maxWithdrawal != null) {
      validateMoney(c.maxWithdrawal, "club.maxWithdrawal");
      c.maxWithdrawal = roundMoney(c.maxWithdrawal);
    }
    if (
      c.minWithdrawal != null &&
      c.maxWithdrawal != null &&
      c.minWithdrawal > c.maxWithdrawal
    ) {
      throw new Error("club.minWithdrawal must be <= club.maxWithdrawal");
    }
  }
  for (const d of designations) {
    const freeSessionCount = d.freeSessionCount ?? 0;
    if (typeof freeSessionCount !== "number" || freeSessionCount < 0) {
      throw new Error(
        "designation.freeSessionCount must be a number >= 0",
      );
    }
    const maxSessionsPerDay = d.maxSessionsPerDay ?? 5;
    if (typeof maxSessionsPerDay !== "number" || maxSessionsPerDay < 1) {
      throw new Error(
        "designation.maxSessionsPerDay must be a number >= 1",
      );
    }
    const cp = d.commissionPercent;
    if (
      typeof cp !== "number" ||
      isNaN(cp) ||
      cp === Infinity ||
      cp === -Infinity
    ) {
      throw new Error("designation.commissionPercent must be a valid number");
    }
    validateMoney(cp, "designation.commissionPercent");
    d.commissionPercent = roundMoney(cp);
    validateMoney(d.selfSaleRequired ?? 0, "designation.selfSaleRequired");
    d.selfSaleRequired = roundMoney(d.selfSaleRequired ?? 0);
    validateMoney(d.teamSizeRequired ?? 0, "designation.teamSizeRequired");
    d.teamSizeRequired = roundMoney(d.teamSizeRequired ?? 0);
    validateMoney(
      d.requiredDesignationCount ?? 0,
      "designation.requiredDesignationCount",
    );
    d.requiredDesignationCount = roundMoney(d.requiredDesignationCount ?? 0);
    validateMoney(d.monthlyTarget ?? 0, "designation.monthlyTarget");
    d.monthlyTarget = roundMoney(d.monthlyTarget ?? 0);
  }

  if (
    this.mainMinWithdrawal != null &&
    this.mainMaxWithdrawal != null &&
    this.mainMinWithdrawal > this.mainMaxWithdrawal
  ) {
    throw new Error("mainMinWithdrawal must be <= mainMaxWithdrawal");
  }
  if (this.maxAdminAdjustAmount != null) {
    const max = parseInt(this.maxAdminAdjustAmount, 10);
    if (Number.isNaN(max) || max < 0 || max > 100000000) {
      throw new Error(
        "maxAdminAdjustAmount must be an integer >= 0 and <= 100000000 (10 crore)",
      );
    }
    this.maxAdminAdjustAmount = max;
  }
  if (this.mainMinWithdrawal != null)
    validateMoney(this.mainMinWithdrawal, "mainMinWithdrawal");
  if (this.mainMaxWithdrawal != null)
    validateMoney(this.mainMaxWithdrawal, "mainMaxWithdrawal");
  if (this.maxUserTransactionsPerDay != null) {
    const n = this.maxUserTransactionsPerDay;
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(
        "maxUserTransactionsPerDay must be a non-negative integer",
      );
    }
  }

  if (this.adminSurchargePercent != null) {
    const n = this.adminSurchargePercent;
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      throw new Error(
        "adminSurchargePercent must be an integer between 0 and 99",
      );
    }
  }

  if (this.adminWithdrawalSurchargePercent != null) {
    const n = this.adminWithdrawalSurchargePercent;
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      throw new Error(
        "adminWithdrawalSurchargePercent must be an integer between 0 and 99",
      );
    }
  }

  // --- BUSINESS RULE: Total commission must not exceed 100% ---
  const sumLevels = levels.reduce((s, l) => s + (l.commissionPercent || 0), 0);
  const sumRanks = ranks.reduce((s, r) => s + (r.commissionPercent || 0), 0);
  const sumClubs = clubs.reduce((s, c) => s + (c.commissionPercent || 0), 0);
  const sumDesignations = designations.reduce(
    (s, d) => s + (d.commissionPercent || 0),
    0,
  );
  const totalCommission = sumLevels + sumRanks + sumClubs + sumDesignations;
  if (totalCommission > 100) {
    throw new Error(
      `Total configured commission must not exceed 100%. Current: ${totalCommission}% (levels: ${sumLevels}%, ranks: ${sumRanks}%, clubs: ${sumClubs}%, designations: ${sumDesignations}%)`,
    );
  }

  // --- LEVEL RULES ---
  if (levels.length > 0) {
    const levelNumbers = levels.map((l) => l.levelNumber);
    const uniqueLevelNumbers = [...new Set(levelNumbers)];
    if (levelNumbers.length !== uniqueLevelNumbers.length) {
      throw new Error("levelNumber must be unique within levels array");
    }
    const sorted = [...levelNumbers].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        throw new Error(
          "levelNumber must be sequential (1,2,3...) with no gaps",
        );
      }
    }
    const levelKeys = levels
      .map((l) => (l.walletKey || "").trim().toUpperCase())
      .filter(Boolean);
    const uniqueLevelKeys = [...new Set(levelKeys)];
    if (levelKeys.length !== uniqueLevelKeys.length) {
      throw new Error("walletKey must be unique within levels array");
    }
  }

  // --- RANK RULES ---
  if (ranks.length > 0) {
    // rankCode must be sequential 1,2,3... no gaps
    const rankCodes = ranks.map((r) => r.rankCode).filter((c) => c != null);
    const uniqueRankCodes = [...new Set(rankCodes)];
    if (rankCodes.length !== uniqueRankCodes.length) {
      throw new Error("rankCode must be unique within ranks array");
    }
    const sortedCodes = [...rankCodes].sort((a, b) => a - b);
    for (let i = 0; i < sortedCodes.length; i++) {
      if (sortedCodes[i] !== i + 1) {
        throw new Error("rankCode must be sequential (1,2,3...) with no gaps");
      }
    }
    const rankNames = ranks.map((r) => (r.name || "").trim().toLowerCase());
    const uniqueRankNames = [...new Set(rankNames)];
    if (rankNames.length !== uniqueRankNames.length) {
      throw new Error(
        "rank name must be unique (case-insensitive) within ranks array",
      );
    }
    // requiredRankCode must equal rankCode-1 (null for rankCode 1)
    for (const r of ranks) {
      const expected = r.rankCode === 1 ? null : r.rankCode - 1;
      const actual = r.requiredRankCode;
      if (actual !== expected) {
        throw new Error(
          `rank requiredRankCode must equal rankCode-1 (rankCode ${r.rankCode} expects ${expected}, got ${actual})`,
        );
      }
    }
    // selfSaleRequired: mandatory only for rankCode 1 and 2 (schema default 0 applies)
    // teamSizeRequired: mandatory for all (schema default 0 applies)
    const rankKeys = ranks
      .map((r) => (r.walletKey || "").trim().toUpperCase())
      .filter(Boolean);
    const uniqueRankKeys = [...new Set(rankKeys)];
    if (rankKeys.length !== uniqueRankKeys.length) {
      throw new Error("walletKey must be unique within ranks array");
    }
  }

  // --- CLUB RULES ---
  if (clubs.length > 0) {
    const clubNames = clubs.map((c) => c.name.trim().toLowerCase());
    const uniqueClubNames = [...new Set(clubNames)];
    if (clubNames.length !== uniqueClubNames.length) {
      throw new Error(
        "club name must be unique within clubs array (case-insensitive)",
      );
    }
    const clubKeys = clubs
      .map((c) => (c.walletKey || "").trim().toUpperCase())
      .filter(Boolean);
    const uniqueClubKeys = [...new Set(clubKeys)];
    if (clubKeys.length !== uniqueClubKeys.length) {
      throw new Error("walletKey must be unique within clubs array");
    }
  }

  // --- DESIGNATION RULES ---
  if (designations.length > 0) {
    const desCodes = designations
      .map((d) => d.designationCode)
      .filter((c) => c != null);
    const uniqueDesCodes = [...new Set(desCodes)];
    if (desCodes.length !== uniqueDesCodes.length) {
      throw new Error(
        "designationCode must be unique within designations array",
      );
    }
    const sortedDesCodes = [...desCodes].sort((a, b) => a - b);
    for (let i = 0; i < sortedDesCodes.length; i++) {
      if (sortedDesCodes[i] !== i + 1) {
        throw new Error(
          "designationCode must be sequential (1,2,3...) with no gaps",
        );
      }
    }
    const desNamesLower = designations.map((d) =>
      (d.name || "").trim().toLowerCase(),
    );
    const uniqueDesNames = [...new Set(desNamesLower)];
    if (desNamesLower.length !== uniqueDesNames.length) {
      throw new Error(
        "designation name must be unique (case-insensitive) within designations array",
      );
    }
    const designationCodesSet = new Set(
      designations.map((d) => d.designationCode),
    );
    for (const d of designations) {
      if (!d.walletKey || !d.walletKey.trim()) {
        d.walletKey = `DESIGNATION_${d.designationCode}`;
      }
      const wk = (d.walletKey || "").trim().toUpperCase();
      if (d.requiredDesignationCode != null) {
        if (!designationCodesSet.has(d.requiredDesignationCode)) {
          throw new Error(
            `requiredDesignationCode ${d.requiredDesignationCode} must exist in designations`,
          );
        }
        if (d.requiredDesignationCode >= d.designationCode) {
          throw new Error(
            `requiredDesignationCode must be less than current designationCode for designation ${d.designationCode}`,
          );
        }
        const visited = new Set();
        let cur = d.requiredDesignationCode;
        while (cur != null) {
          if (visited.has(cur)) {
            throw new Error(
              `Circular designation dependency detected at designation ${d.designationCode}`,
            );
          }
          visited.add(cur);
          const prevDes = designations.find((x) => x.designationCode === cur);
          cur = prevDes?.requiredDesignationCode ?? null;
        }
      }
      if (
        d.requiredDesignationCode == null &&
        (d.requiredDesignationCount || 0) !== 0
      ) {
        throw new Error(
          "requiredDesignationCount must be 0 when requiredDesignationCode is null",
        );
      }
    }
    const desKeys = designations
      .map((d) => (d.walletKey || "").trim().toUpperCase())
      .filter(Boolean);
    const uniqueDesKeys = [...new Set(desKeys)];
    if (desKeys.length !== uniqueDesKeys.length) {
      throw new Error("walletKey must be unique within designations array");
    }
  }

  // --- RANK requiredDesignations validation ---
  if (ranks.length > 0 && designations.length > 0) {
    const designationCodesSet = new Set(
      designations.map((d) => d.designationCode),
    );
    for (const r of ranks) {
      const reqDes = r.requiredDesignations || [];
      const seenCodes = new Set();
      for (const rd of reqDes) {
        if (rd.designationCode == null) continue;
        if (!designationCodesSet.has(rd.designationCode)) {
          throw new Error(
            `rank ${r.rankCode} requiredDesignations: designationCode ${rd.designationCode} must exist in designations`,
          );
        }
        if (seenCodes.has(rd.designationCode)) {
          throw new Error(
            `rank ${r.rankCode} requiredDesignations: duplicate designationCode ${rd.designationCode}`,
          );
        }
        seenCodes.add(rd.designationCode);
        if ((rd.minCount || 0) < 1) {
          throw new Error(
            `rank ${r.rankCode} requiredDesignations: minCount must be >= 1`,
          );
        }
      }
    }
  }

  // --- walletKey unique across levels, ranks, clubs, designations ---
  const allKeys = [
    ...levels
      .map((l) => (l.walletKey || "").trim().toUpperCase())
      .filter(Boolean),
    ...ranks
      .map((r) => (r.walletKey || "").trim().toUpperCase())
      .filter(Boolean),
    ...clubs
      .map((c) => (c.walletKey || "").trim().toUpperCase())
      .filter(Boolean),
    ...designations
      .map((d) => (d.walletKey || "").trim().toUpperCase())
      .filter(Boolean),
  ];
  const uniqueAllKeys = [...new Set(allKeys)];
  if (allKeys.length > 0 && allKeys.length !== uniqueAllKeys.length) {
    throw new Error(
      "walletKey must be unique across all levels, ranks, clubs, and designations",
    );
  }
});

/**
 * Migrate old rank format (requiredRank ObjectId, target) to new (rankCode, requiredRankCode, etc.)
 */
function migrateRanksToNewSchema(ranks) {
  if (!ranks || ranks.length === 0) return false;
  const hasOldFormat = ranks.some(
    (r) => r.requiredRank != null || (r.target != null && r.rankCode == null),
  );
  if (!hasOldFormat && ranks.every((r) => r.rankCode != null)) return false;

  const idToRank = new Map();
  ranks.forEach((r) => {
    if (r._id) idToRank.set(r._id.toString(), r);
  });
  const sorted = [];
  const visited = new Set();
  function addByRequiredRef(rank) {
    const rid = rank._id && rank._id.toString();
    if (visited.has(rid)) return;
    visited.add(rid);
    if (rank.requiredRank) {
      const ref = idToRank.get(rank.requiredRank.toString());
      if (ref) addByRequiredRef(ref);
    }
    sorted.push(rank);
  }
  ranks.forEach((r) => addByRequiredRef(r));

  let rankCode = 1;
  for (const r of sorted) {
    r.rankCode = rankCode;
    r.walletKey = `RANK_${rankCode}`;
    r.requiredRankCode = rankCode === 1 ? null : rankCode - 1;
    r.selfSaleRequired = rankCode <= 2 ? (r.target ?? 0) : 0;
    r.teamSizeRequired = r.teamSizeRequired ?? 0;
    r.requiredRankCount = r.requiredRankCount ?? 0;
    r.monthlyTarget = r.monthlyTarget ?? 0;
    r.capping = r.capping ?? 0;
    delete r.requiredRank;
    delete r.target;
    rankCode++;
  }
  return true;
}

const SINGLETON_KEY = "GLOBAL";

// --- In-memory TTL cache (Node process level) ---
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
let cacheState = {
  data: null,
  expiresAt: 0,
  inFlightPromise: null, // coalesces concurrent fetches when cache expired
};

/**
 * Invalidate the WalletSettings cache. Call after any DB write/update.
 * Concurrency-safe: clears cache and any in-flight coalesce state.
 */
WalletSettingsSchema.statics.invalidateSettingsCache = function () {
  cacheState = {
    data: null,
    expiresAt: 0,
    inFlightPromise: null,
  };
};

// Register post-save hook for cache invalidation on any document save
WalletSettingsSchema.post("save", function () {
  const Model = this.constructor;
  if (Model && Model.invalidateSettingsCache) {
    Model.invalidateSettingsCache();
  }
});

WalletSettingsSchema.statics.getOrCreateSettings = async function () {
  const self = this;
  const now = Date.now();

  const isCacheValid = () =>
    cacheState.data != null && cacheState.expiresAt > now;

  // Fast path: return cached value if valid
  if (isCacheValid()) {
    return cacheState.data;
  }

  const fetchFromDb = async () => {
    try {
      let settings = await self.findOne({ singletonKey: SINGLETON_KEY });
      if (settings) {
        settings = await self._migrateAndReturn(settings);
        return settings;
      }

      const legacy = await self.findOne({
        $or: [
          { singletonKey: { $exists: false } },
          { singletonKey: null },
        ],
      });
      if (legacy) {
        try {
          await self.updateOne(
            { _id: legacy._id },
            { $set: { singletonKey: SINGLETON_KEY } },
          );
        } catch (e) {
          if (e.code === 11000) {
            settings = await self.findOne({ singletonKey: SINGLETON_KEY });
            if (settings) {
              settings = await self._migrateAndReturn(settings);
              return settings;
            }
          }
          throw e;
        }
        settings = await self.findOne({ singletonKey: SINGLETON_KEY });
        if (settings) {
          settings = await self._migrateAndReturn(settings);
          return settings;
        }
      }

      try {
        settings = await self.create({ singletonKey: SINGLETON_KEY });
        console.log("✅ Wallet Settings Created");
      } catch (e) {
        if (e.code === 11000) {
          settings = await self.findOne({ singletonKey: SINGLETON_KEY });
          if (settings) {
            settings = await self._migrateAndReturn(settings);
            return settings;
          }
        }
        throw e;
      }
      return settings;
    } catch (error) {
      console.error("Error in getOrCreateSettings:", error);
      throw error;
    }
  };

  // Concurrency: one in-flight fetch, others wait for it
  if (cacheState.inFlightPromise) {
    const result = await cacheState.inFlightPromise;
    if (isCacheValid()) return cacheState.data;
    return result;
  }

  const promise = fetchFromDb();
  cacheState.inFlightPromise = promise;

  try {
    const result = await promise;
    cacheState.data = result;
    cacheState.expiresAt = now + CACHE_TTL_MS;
    return result;
  } finally {
    cacheState.inFlightPromise = null;
  }
};

WalletSettingsSchema.statics._migrateAndReturn = async function (settings) {
  if (!settings) return null;
  let modified = false;
  if (settings.freeAppointmentsPerUser === undefined || settings.freeAppointmentsPerUser === null) {
    settings.freeAppointmentsPerUser = 0;
    modified = true;
  }
  if (
    settings.adminWithdrawalSurchargePercent === undefined ||
    settings.adminWithdrawalSurchargePercent === null
  ) {
    settings.adminWithdrawalSurchargePercent = 0;
    modified = true;
  }
  if (settings.isWithdrawalEnabled === undefined || settings.isWithdrawalEnabled === null) {
    settings.isWithdrawalEnabled = true;
    modified = true;
  }
  if (settings.freeSessionExpiryMonths === undefined || settings.freeSessionExpiryMonths === null) {
    settings.freeSessionExpiryMonths = 12;
    modified = true;
  }
  if (settings.counsellingCharge === undefined || settings.counsellingCharge === null) {
    settings.counsellingCharge = 0;
    modified = true;
  }
  if (
    settings.adminSurchargePercent === undefined ||
    settings.adminSurchargePercent === null
  ) {
    settings.adminSurchargePercent = 0;
    modified = true;
  }
  if (!settings.commissionPayoutSettings || typeof settings.commissionPayoutSettings !== "object") {
    settings.commissionPayoutSettings = {
      scheduleType: "monthly",
      customDayOfMonth: 1,
      customDayOfWeek: 0,
      payoutTimeHH: 1,
      payoutTimeMM: 0,
    };
    modified = true;
  }
  if (settings.levels && settings.levels.length > 0) {
    for (const level of settings.levels) {
      if (!level.walletKey) {
        level.walletKey = `LEVEL_${level.levelNumber}`;
        modified = true;
      }
    }
  }
  if (!Array.isArray(settings.ranks)) {
    settings.ranks = [];
    modified = true;
  } else if (migrateRanksToNewSchema(settings.ranks)) {
    modified = true;
  }
  if (settings.ranks && settings.ranks.length > 0) {
    for (const rank of settings.ranks) {
      if (!rank.walletKey && rank.rankCode) {
        rank.walletKey = `RANK_${rank.rankCode}`;
        modified = true;
      }
    }
  }
  if (settings.clubs && settings.clubs.length > 0) {
    const levelKeys = (settings.levels || [])
      .map((l) => (l.walletKey || "").toUpperCase())
      .filter(Boolean);
    const rankKeys = (settings.ranks || [])
      .map((r) => (r.walletKey || "").toUpperCase())
      .filter(Boolean);
    const clubKeys = settings.clubs
      .map((c) => (c.walletKey || "").toUpperCase())
      .filter(Boolean);
    const usedKeys = new Set([...levelKeys, ...rankKeys, ...clubKeys]);
    for (const club of settings.clubs) {
      if (!club.walletKey && club.name) {
        const base =
          (club.name || "")
            .replace(/\s+/g, "_")
            .replace(/[^A-Za-z0-9_]/g, "")
            .toUpperCase() || "CLUB";
        let key = base;
        let suffix = 0;
        while (usedKeys.has(key)) {
          suffix += 1;
          key = `${base}_${suffix}`;
        }
        club.walletKey = key;
        usedKeys.add(key);
        modified = true;
      }
      if (club.selfSaleRequired === undefined) club.selfSaleRequired = 0;
      if (club.monthlyTarget === undefined) club.monthlyTarget = 0;
      if (club.capping === undefined) club.capping = 0;
      if (club.isAdminOnly === undefined) club.isAdminOnly = false;
      delete club.requiredClubId;
      delete club.requireSelf;
      delete club.category;
      delete club.teamSizeRequired;
      delete club.requiredRankCode;
      delete club.requiredRankCount;
      delete club.target;
    }
  }
  if (settings.designations && settings.designations.length > 0) {
    for (const d of settings.designations) {
      if (d.freeSessionCount === undefined || d.freeSessionCount === null) {
        d.freeSessionCount = 0;
        modified = true;
      }
      if (d.maxSessionsPerDay === undefined || d.maxSessionsPerDay === null) {
        d.maxSessionsPerDay = 5;
        modified = true;
      }
    }
  }
  if (modified) {
    await settings.save();
  }
  return settings;
};

WalletSettingsSchema.statics.getDerivedWalletKeys = function (settings) {
  const s = settings || {};
  const levelKeys = (s.levels || [])
    .map((l) => (l.walletKey || "").trim().toUpperCase())
    .filter(Boolean);
  const rankKeys = (s.ranks || [])
    .map((r) => (r.walletKey || "").trim().toUpperCase())
    .filter(Boolean);
  const clubKeys = (s.clubs || [])
    .map((c) => (c.walletKey || "").trim().toUpperCase())
    .filter(Boolean);
  // Designation amounts credit to MAIN wallet - no separate designation wallet
  return [...levelKeys, ...rankKeys, ...clubKeys];
};

const WalletSettings = mongoose.model("wallet_settings", WalletSettingsSchema);

module.exports = WalletSettings;
