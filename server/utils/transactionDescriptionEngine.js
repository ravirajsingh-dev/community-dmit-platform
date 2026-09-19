/**
 * Transaction Description Engine - Centralized template-based description builder.
 * Single source of truth for all wallet transaction descriptions.
 */

const DESCRIPTION_TEMPLATES = {
  ACTIVATION_DEBIT:
    "DEBIT ₹{amount} for account activation",

  ACTIVATION_EPIN_SPONSOR_DEBIT:
    "DEBIT ₹{amount} E-PIN activation fee for MemberID: {memberId}",

  ACTIVATION_EPIN_CREDIT:
    "CREDIT ₹{amount} E-PIN value allocated for account activation",

  LEVEL_INCOME:
    "CREDIT ₹{amount} Level {level} commission from MemberID: {fromMemberId} ({fromUserName})",

  RANK_INCOME:
    "CREDIT ₹{amount} Rank {rankCode} reward",

  CLUB_INCOME:
    "CREDIT ₹{amount} Club {clubKey} income",

  SBI_PRO_INCOME:
    "CREDIT ₹{amount} SBI PRO TRAINER session commission for (Appointment: {memberName} • {memberIdentifier})",

  TRANSFER_DEBIT:
    "DEBIT ₹{amount} transferred to MemberID: {toMemberId} ({toUserName})",

  TRANSFER_CREDIT:
    "CREDIT ₹{amount} received from MemberID: {fromMemberId} ({fromUserName})",

  ADMIN_CREDIT:
    "CREDIT ₹{amount} wallet top-up by Admin (Reason: {reason})",

  ADMIN_DEBIT:
    "DEBIT ₹{amount} adjusted by Admin (Reason: {reason})",

  CLUB_TO_MAIN_DEBIT:
    "DEBIT ₹{amount} from Club {clubKey} wallet transferred to MAIN balance",

  CLUB_TO_MAIN_CREDIT:
    "CREDIT ₹{amount} from Club {clubKey} wallet transferred to MAIN balance",

  ADMIN_TRANSFER_DEBIT:
    "DEBIT ₹{amount} transferred to MemberID: {toMemberId} ({toUserName}) by Admin",

  ADMIN_TRANSFER_CREDIT:
    "CREDIT ₹{amount} received from MemberID: {fromMemberId} ({fromUserName}) by Admin",

  COUNSELLING_DEBIT:
    "DEBIT ₹{amount} for counsellor appointment booking",

  COUNSELLING_INCOME:
    "CREDIT ₹{amount} SBI PRO COUNSELLOR session commission for (Appointment: {memberName} • {memberIdentifier})",
};

const MIN_LENGTH = 15;
const MAX_LENGTH = 300;

const PLACEHOLDER_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Extract placeholder names from a template string.
 * @param {string} template
 * @returns {string[]}
 */
function extractPlaceholders(template) {
  const names = new Set();
  let m;
  const re = new RegExp(PLACEHOLDER_REGEX.source, "g");
  while ((m = re.exec(template)) !== null) {
    names.add(m[1]);
  }
  return Array.from(names);
}

/**
 * Build transaction description from template key and context.
 * @param {string} templateKey - Key in DESCRIPTION_TEMPLATES
 * @param {Record<string, string|number>} data - Context for placeholders
 * @returns {string}
 * @throws {Error} If template key not found, placeholder missing, or validation fails
 */
function buildTransactionDescription(templateKey, data = {}) {
  if (!templateKey || typeof templateKey !== "string") {
    throw new Error("transactionDescriptionEngine: templateKey is required");
  }

  const template = DESCRIPTION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`transactionDescriptionEngine: unknown template key "${templateKey}"`);
  }

  const placeholders = extractPlaceholders(template);
  const dataObj = data && typeof data === "object" ? data : {};

  let result = template;
  for (const name of placeholders) {
    const value = dataObj[name];
    if (value === undefined || value === null || value === "") {
      throw new Error(
        `transactionDescriptionEngine: required placeholder "{${name}}" is missing for template "${templateKey}"`
      );
    }
    const str = String(value).trim();
    if (str === "") {
      throw new Error(
        `transactionDescriptionEngine: placeholder "{${name}}" resolves to empty for template "${templateKey}"`
      );
    }
    result = result.replace(new RegExp(`\\{${name}\\}`, "g"), str);
  }

  if (result.includes("undefined") || result.includes("null")) {
    throw new Error(
      `transactionDescriptionEngine: description contains undefined/null for template "${templateKey}"`
    );
  }

  if (result.length < MIN_LENGTH) {
    throw new Error(
      `transactionDescriptionEngine: description length ${result.length} is below minimum ${MIN_LENGTH} for template "${templateKey}"`
    );
  }

  if (result.length > MAX_LENGTH) {
    throw new Error(
      `transactionDescriptionEngine: description length ${result.length} exceeds maximum ${MAX_LENGTH} for template "${templateKey}"`
    );
  }

  if (!result.includes("₹")) {
    throw new Error(
      `transactionDescriptionEngine: description must include ₹ symbol for template "${templateKey}"`
    );
  }

  return result;
}

function formatAmountForDescription(amount) {
  if (amount == null) return "";
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (Number.isNaN(n)) return String(amount);
  return n.toFixed(2);
}

module.exports = {
  DESCRIPTION_TEMPLATES,
  buildTransactionDescription,
  formatAmountForDescription,
};
