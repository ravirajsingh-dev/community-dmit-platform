/**
 * Wallet System Financial Validation Tests
 * Run: node tests/walletFinancialValidation.test.js (requires mongoose connect)
 * Verifies: toCents, computeCommissionCents, requestId format, integer math.
 */

const mongoose = require("mongoose");
const { toCents, computeCommissionCents, centsToDecimal } = require("../utils/financialMath");
const { validateRequestId } = require("../services/walletService");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("Running wallet financial validation...");

// Financial math
assert(toCents(10.5) === 1050, "toCents(10.5) should be 1050");
assert(computeCommissionCents(1000, 10) === 100, "commission 1000@10% = 100");
assert(computeCommissionCents(1001, 10) === 100, "commission floor");
assert(centsToDecimal(1050).toString() === "10.50", "centsToDecimal");

// requestId validation
assert(validateRequestId("550e8400-e29b-41d4-a716-446655440000"), "UUID valid");
assert(validateRequestId("level:550e8400-e29b-41d4-a716-446655440000:u1:L1"), "level format");
assert(validateRequestId("admin:adjust:550e8400-e29b-41d4-a716-446655440000"), "admin format");
assert(!validateRequestId(null), "null invalid");
assert(!validateRequestId(""), "empty invalid");

console.log("✅ All wallet financial validations passed");
