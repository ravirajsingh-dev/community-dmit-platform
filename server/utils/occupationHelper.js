const { OCCUPATION_VALUES } = require("./constants");

const OCCUPATION_DETAILS_MAXLENGTH = 200;

/**
 * Build occupationDetails object for persistence. Only includes keys relevant to
 * the given occupation; other keys are omitted. Trims and enforces maxlength.
 */
function buildOccupationDetails(occupation, rawDetails) {
  if (!occupation || !OCCUPATION_VALUES.includes(occupation)) {
    return undefined;
  }
  const details =
    rawDetails && typeof rawDetails === "object" ? rawDetails : {};
  const result = {};
  if (occupation === "Government Job" || occupation === "Private Job") {
    ["department", "position", "location"].forEach((key) => {
      if (details[key] != null && String(details[key]).trim() !== "") {
        const val = String(details[key]).trim();
        result[key] = val.slice(0, OCCUPATION_DETAILS_MAXLENGTH);
      }
    });
  } else if (occupation === "Business") {
    ["businessName", "businessType", "location"].forEach((key) => {
      if (details[key] != null && String(details[key]).trim() !== "") {
        const val = String(details[key]).trim();
        result[key] = val.slice(0, OCCUPATION_DETAILS_MAXLENGTH);
      }
    });
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

module.exports = {
  OCCUPATION_VALUES,
  buildOccupationDetails,
};
