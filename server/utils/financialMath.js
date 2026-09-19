/**
 * Financial Math Utilities - Integer safety
 * Convert Decimal128 → cents → compute → cents → Decimal128 at storage only.
 * NEVER multiply Decimal128 by percentage.
 */

const mongoose = require("mongoose");
const DECIMAL = mongoose.Types.Decimal128;

/**
 * Convert Decimal128 or number/string to integer cents.
 */
function toCents(value) {
  if (value == null) return 0;
  if (typeof value === "number") {
    if (Number.isNaN(value) || value === Infinity || value === -Infinity) return 0;
    return Math.round(value * 100);
  }
  if (value instanceof mongoose.Types.Decimal128) {
    const str = value.toString();
    const n = parseFloat(str);
    return Number.isNaN(n) ? 0 : Math.round(n * 100);
  }
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

/**
 * Compute commission in integer cents: floor(amountCents * percent / 100)
 */
function computeCommissionCents(amountCents, percent) {
  if (percent <= 0 || amountCents <= 0) return 0;
  const p = Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
  return Math.floor((amountCents * p) / 100);
}

/**
 * Convert integer cents to Decimal128 for storage.
 */
function centsToDecimal(cents) {
  const str = (cents / 100).toFixed(2);
  return DECIMAL.fromString(str);
}

module.exports = {
  toCents,
  computeCommissionCents,
  centsToDecimal,
};
