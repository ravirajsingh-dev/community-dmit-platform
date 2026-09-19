export const EPIN_REGEX = /^G[A-Z0-9]{19}$/;

export const isValidEPinFormat = (value) => {
  if (!value || typeof value !== "string") return false;
  return EPIN_REGEX.test(value.trim().toUpperCase());
};

export const formatEPinInput = (value) => {
  if (!value) return "";
  let cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length > 0 && cleaned[0] !== "G") {
    cleaned = `G${cleaned.replace(/^G?/, "").substring(0, 19)}`;
  } else if (cleaned.startsWith("G")) {
    cleaned = `G${cleaned.substring(1, 20)}`;
  } else {
    cleaned = cleaned.substring(0, 20);
  }
  if (cleaned.length > 20) cleaned = cleaned.substring(0, 20);
  return cleaned;
};
