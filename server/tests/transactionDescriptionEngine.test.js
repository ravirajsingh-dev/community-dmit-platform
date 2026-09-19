/**
 * Transaction Description Engine Tests
 * Run: node tests/transactionDescriptionEngine.test.js
 */

const {
  DESCRIPTION_TEMPLATES,
  buildTransactionDescription,
  formatAmountForDescription,
} = require("../utils/transactionDescriptionEngine");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertThrows(fn, msgContains) {
  try {
    fn();
    throw new Error("Expected function to throw");
  } catch (e) {
    if (msgContains && !e.message.includes(msgContains)) {
      throw new Error(`Expected error containing "${msgContains}", got: ${e.message}`);
    }
  }
}

console.log("Running transaction description engine tests...");

// formatAmountForDescription
assert(formatAmountForDescription(100) === "100.00", "formatAmount 100");
assert(formatAmountForDescription(10.5) === "10.50", "formatAmount 10.5");
assert(formatAmountForDescription("99.99") === "99.99", "formatAmount string");

// Each template builds correctly
const tests = [
  ["ACTIVATION_DEBIT", { amount: "500.00" }, "DEBIT ₹500.00 for account activation"],
  ["ACTIVATION_EPIN_SPONSOR_DEBIT", { amount: "500.00", memberId: "M001" }, "DEBIT ₹500.00 E-PIN activation fee for MemberID: M001"],
  ["ACTIVATION_EPIN_CREDIT", { amount: "500.00" }, "CREDIT ₹500.00 E-PIN value allocated for account activation"],
  ["LEVEL_INCOME", { amount: "50.00", level: 1, fromMemberId: "M002", fromUserName: "John" }, "CREDIT ₹50.00 Level 1 commission from MemberID: M002 (John)"],
  ["RANK_INCOME", { amount: "100.00", rankCode: "GOLD" }, "CREDIT ₹100.00 Rank GOLD reward"],
  ["CLUB_INCOME", { amount: "25.00", clubKey: "L1" }, "CREDIT ₹25.00 Club L1 income"],
  ["TRANSFER_DEBIT", { amount: "200.00", toMemberId: "M003", toUserName: "Jane" }, "DEBIT ₹200.00 transferred to MemberID: M003 (Jane)"],
  ["TRANSFER_CREDIT", { amount: "200.00", fromMemberId: "M004", fromUserName: "Bob" }, "CREDIT ₹200.00 received from MemberID: M004 (Bob)"],
  ["ADMIN_CREDIT", { amount: "1000.00", reason: "Top-up" }, "CREDIT ₹1000.00 wallet top-up by Admin (Reason: Top-up)"],
  ["ADMIN_DEBIT", { amount: "500.00", reason: "Adjustment" }, "DEBIT ₹500.00 adjusted by Admin (Reason: Adjustment)"],
  ["CLUB_TO_MAIN_DEBIT", { amount: "150.00", clubKey: "COMMON" }, "DEBIT ₹150.00 from Club COMMON wallet transferred to MAIN balance"],
  ["CLUB_TO_MAIN_CREDIT", { amount: "150.00", clubKey: "COMMON" }, "CREDIT ₹150.00 from Club COMMON wallet transferred to MAIN balance"],
];

for (const [key, data, expected] of tests) {
  const result = buildTransactionDescription(key, data);
  assert(result === expected, `Template ${key}: expected "${expected}", got "${result}"`);
}

// Missing placeholder throws error
assertThrows(
  () => buildTransactionDescription("LEVEL_INCOME", { amount: "50.00", level: 1 }),
  "required placeholder"
);

// Invalid template key throws error
assertThrows(
  () => buildTransactionDescription("UNKNOWN_KEY", {}),
  "unknown template key"
);

// Empty templateKey
assertThrows(
  () => buildTransactionDescription("", {}),
  "templateKey is required"
);

// Description never contains undefined/null
assertThrows(
  () => buildTransactionDescription("ACTIVATION_DEBIT", { amount: undefined }),
  "required placeholder"
);

// Min length validation (ACTIVATION_DEBIT with "0.01" = 33 chars, so fine)
const shortResult = buildTransactionDescription("ACTIVATION_DEBIT", { amount: "0.01" });
assert(shortResult.length >= 15, "Min length satisfied");

// Max length validation - use a very long reason
const longReason = "A".repeat(280);
assertThrows(
  () => buildTransactionDescription("ADMIN_CREDIT", { amount: "1.00", reason: longReason }),
  "exceeds maximum"
);

// All template keys in DESCRIPTION_TEMPLATES are covered
const coveredKeys = new Set(tests.map((t) => t[0]));
for (const key of Object.keys(DESCRIPTION_TEMPLATES)) {
  assert(coveredKeys.has(key), `Template key ${key} has no test case`);
}

console.log("✅ All transaction description engine tests passed");
