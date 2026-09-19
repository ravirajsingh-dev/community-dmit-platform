/**
 * Shared SBI PRO constants – single source of truth for client & admin.
 * Used by: SbiProIndex, SbiProSessionDetail, AdminSbiProSessionsList
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
