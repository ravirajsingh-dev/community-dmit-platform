/**
 * SBI PRO Finger Analysis Model
 * Admin enters code + count for each of 10 fingers per SBI PRO session.
 * Codes are fixed: Steady (L,R), Arch (X1,X2), Dominant (W1,W2,W4,W5,W6,W7,W8,W9), Compliant (W3)
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const FINGER_TYPES = [
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

const SBI_PRO_CODES = ["L", "R", "X1", "X2", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"];

const fingerEntrySchema = new Schema(
  {
    code: { type: String, default: null },
    count: { type: Number, min: 0, max: 99, default: null },
  },
  { _id: false }
);

const SbiProFingerAnalysisSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
      unique: true,
    },
    fingers: {
      LEFT_THUMB: { type: fingerEntrySchema, default: () => ({}) },
      LEFT_INDEX: { type: fingerEntrySchema, default: () => ({}) },
      LEFT_MIDDLE: { type: fingerEntrySchema, default: () => ({}) },
      LEFT_RING: { type: fingerEntrySchema, default: () => ({}) },
      LEFT_LITTLE: { type: fingerEntrySchema, default: () => ({}) },
      RIGHT_THUMB: { type: fingerEntrySchema, default: () => ({}) },
      RIGHT_INDEX: { type: fingerEntrySchema, default: () => ({}) },
      RIGHT_MIDDLE: { type: fingerEntrySchema, default: () => ({}) },
      RIGHT_RING: { type: fingerEntrySchema, default: () => ({}) },
      RIGHT_LITTLE: { type: fingerEntrySchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

const SbiProFingerAnalysis = mongoose.model("SbiProFingerAnalysis", SbiProFingerAnalysisSchema, "sbi_pro_finger_analyses");

module.exports = SbiProFingerAnalysis;
module.exports.FINGER_TYPES = FINGER_TYPES;
module.exports.SBI_PRO_CODES = SBI_PRO_CODES;
