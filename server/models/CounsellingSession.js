/**
 * Counselling Session Model - Designation_2 (COUNSELLOR)
 * 1 Appointment = 1 CounsellingSession
 * Status: CREATED → COUNSELLOR_COMPLETED → (user confirm) → CLOSED
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const COUNSELLING_STATUSES = [
  "CREATED",
  "COUNSELLOR_COMPLETED",
  "USER_CONFIRMATION_PENDING",
  "ISSUE_REPORTED",
  "RECOUNSELLING_PENDING",
  "RECOUNSELLING_IN_PROGRESS",
  "CLOSED",
];

const CounsellingSessionSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
      unique: true,
    },
    counsellorId: {
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
      enum: COUNSELLING_STATUSES,
      default: "CREATED",
    },
    mode: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: null,
    },
    counsellorNotes: { type: String, default: null },
    durationMinutes: { type: Number, min: 0, default: null },
    completedAt: { type: Date, default: null },
    userClosedAt: { type: Date, default: null },
    closedBy: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: null,
    },
    adminClosedBy: { type: Schema.Types.ObjectId, ref: "users", default: null },
    rating: { type: Number, min: 0, max: 5, default: null },
    userConfirmedCounsellingDone: { type: Boolean, default: null },
    issueReported: { type: Boolean, default: false },
    issueReportedAt: { type: Date, default: null },
    issueDescription: { type: String, default: null },
    commissionCredited: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    chargedAmount: { type: Number, min: 0, default: 0 },
    recounsellingReason: { type: String, default: null },
    recounsellingRequestedAt: { type: Date, default: null },
    recounsellingRequestedBy: { type: Schema.Types.ObjectId, ref: "users", default: null },
    replacementAppointmentId: { type: Schema.Types.ObjectId, ref: "appointments", default: null },
  },
  { timestamps: true }
);

CounsellingSessionSchema.index({ counsellorId: 1, status: 1 });
CounsellingSessionSchema.index({ requesterId: 1, status: 1 });
CounsellingSessionSchema.index({ status: 1 });
CounsellingSessionSchema.index({ completedAt: 1 });

const CounsellingSession = mongoose.model(
  "CounsellingSession",
  CounsellingSessionSchema,
  "counselling_sessions"
);

module.exports = CounsellingSession;
module.exports.COUNSELLING_STATUSES = COUNSELLING_STATUSES;
