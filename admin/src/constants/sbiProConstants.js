/**
 * Admin SBI PRO constants – mirrors client for consistency
 */

export const FINGER_TYPES = [
  "LEFT_THUMB",
  "LEFT_INDEX",
  "LEFT_MIDDLE",
  "LEFT_RING",
  "LEFT_LITTLE",
  "RIGHT_THUMB",
  "RIGHT_INDEX",
  "RIGHT_MIDDLE",
  "RIGHT_RING",
  "RIGHT_LITTLE",
];

export const FINGER_LABELS = {
  LEFT_THUMB: "Left Thumb",
  LEFT_INDEX: "Left Index",
  LEFT_MIDDLE: "Left Middle",
  LEFT_RING: "Left Ring",
  LEFT_LITTLE: "Left Little",
  RIGHT_THUMB: "Right Thumb",
  RIGHT_INDEX: "Right Index",
  RIGHT_MIDDLE: "Right Middle",
  RIGHT_RING: "Right Ring",
  RIGHT_LITTLE: "Right Little",
};

export const STATUS_BADGES = {
  CREATED: "secondary",
  UPLOADING: "info",
  UPLOADED: "primary",
  VERIFICATION_PENDING: "warning",
  REOPENED: "info",
  ANALYSIS_PENDING: "dark",
  CLOSED: "success",
};

export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "CREATED", label: "Created" },
  { value: "UPLOADING", label: "Uploading" },
  { value: "UPLOADED", label: "Uploaded" },
  { value: "VERIFICATION_PENDING", label: "Verification Pending" },
  { value: "REOPENED", label: "Reopened" },
  { value: "ANALYSIS_PENDING", label: "Analysis Pending" },
  { value: "CLOSED", label: "Closed" },
];

export const SBI_PRO_CODES = ["L", "R", "X1", "X2", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"];
