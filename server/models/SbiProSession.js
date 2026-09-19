/**
 * SBI PRO Session Model - Phase 3
 * 1 Appointment = 1 SBI PRO Session (Designation_1 only)
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const SBI_PRO_STATUSES = [
  "CREATED",
  "UPLOADING",
  "UPLOADED",
  "VERIFICATION_PENDING",
  "REOPENED",
  "ANALYSIS_PENDING",
  "CLOSED",
];

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

const SbiProSessionSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: false,
    },
    beneficiaryType: { type: String, enum: ["SELF", "OTHER"], default: "SELF" },
    beneficiaryName: { type: String, default: null },
    beneficiaryPhone: { type: String, default: null },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    status: {
      type: String,
      enum: SBI_PRO_STATUSES,
      default: "CREATED",
    },
    images: {
      LEFT_THUMB: { type: String, default: null },
      LEFT_INDEX: { type: String, default: null },
      LEFT_MIDDLE: { type: String, default: null },
      LEFT_RING: { type: String, default: null },
      LEFT_LITTLE: { type: String, default: null },
      RIGHT_THUMB: { type: String, default: null },
      RIGHT_INDEX: { type: String, default: null },
      RIGHT_MIDDLE: { type: String, default: null },
      RIGHT_RING: { type: String, default: null },
      RIGHT_LITTLE: { type: String, default: null },
    },
    imageKeys: {
      LEFT_THUMB: { type: String, default: null },
      LEFT_INDEX: { type: String, default: null },
      LEFT_MIDDLE: { type: String, default: null },
      LEFT_RING: { type: String, default: null },
      LEFT_LITTLE: { type: String, default: null },
      RIGHT_THUMB: { type: String, default: null },
      RIGHT_INDEX: { type: String, default: null },
      RIGHT_MIDDLE: { type: String, default: null },
      RIGHT_RING: { type: String, default: null },
      RIGHT_LITTLE: { type: String, default: null },
    },
    uploadedCount: { type: Number, default: 0 },
    verificationRequestedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    analysisCompletedAt: { type: Date, default: null },
    reportUrl: { type: String, default: null },
    reportKey: { type: String, default: null },
  },
  { timestamps: true }
);

SbiProSessionSchema.index({ userId: 1 });
SbiProSessionSchema.index({ beneficiaryPhone: 1 });
SbiProSessionSchema.index({ trainerId: 1 });
SbiProSessionSchema.index({ status: 1 });

const SbiProSession = mongoose.model("SbiProSession", SbiProSessionSchema, "sbi_pro_sessions");

module.exports = SbiProSession;
module.exports.SBI_PRO_STATUSES = SBI_PRO_STATUSES;
module.exports.FINGER_TYPES = FINGER_TYPES;
