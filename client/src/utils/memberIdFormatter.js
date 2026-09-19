/**
 * Utility functions for formatting and validating Member ID input
 * Format: G + 9 digits (e.g., G123456789)
 */

export const MEMBER_ID_REGEX = /^G\d{9}$/;

export const isValidMemberIdFormat = (value) => {
  if (!value) return false;
  return MEMBER_ID_REGEX.test(String(value).trim().toUpperCase());
};

export const formatMemberIdInput = (value) => {
  if (!value) return "";
  const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digits = cleaned.replace(/[^0-9]/g, "").slice(0, 9);
  return `G${digits}`;
};

export const createMemberIdChangeHandler = (baseOnChange, fieldName) => {
  return (e) => {
    const formatted = formatMemberIdInput(e.target.value);
    baseOnChange({
      ...e,
      target: {
        ...e.target,
        name: fieldName,
        value: formatted,
      },
    });
  };
};

export const createMemberIdPasteHandler = (onPasteValue) => {
  return (e) => {
    const pastedText = e.clipboardData.getData("text/plain");
    if (!pastedText || !pastedText.trim()) return;
    e.preventDefault();
    const formatted = formatMemberIdInput(pastedText.trim());
    if (typeof onPasteValue === "function") {
      onPasteValue(formatted);
      return;
    }
    const input = e.target;
    input.value = formatted;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
};

export const createMemberIdKeyDownHandler = () => {
  return () => {};
};
