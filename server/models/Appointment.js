/**
 * Appointment Model - Phase-2.1
 *
 * Booking between normal users and designation holders.
 * Status machine: PENDING, ACCEPTED, COMPLETED, REJECTED,
 * CANCELLED_BY_USER, CANCELLED_BY_HOLDER, CANCELLED_BY_ADMIN,
 * CANCELLED_BY_SYSTEM, CANCEL_REQUESTED
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const APPOINTMENT_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_HOLDER",
  "CANCELLED_BY_ADMIN",
  "CANCELLED_BY_SYSTEM",
  "CANCEL_REQUESTED",
];

const AppointmentSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    designationCode: {
      type: Number,
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      required: true,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: "slotdefinitions",
      required: true,
    },
    sessionStartTime: {
      type: Date,
      default: null,
    },
    requestedAt: { type: Date, default: () => new Date() },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
    rating: { type: Number, min: 0, max: 5, default: null },
    review: { type: String, default: null },
    // Phase 3-4: SBI PRO beneficiary (designation 1 only)
    beneficiaryType: { type: String, enum: ["SELF", "OTHER"], default: "SELF" },
    beneficiaryName: { type: String, default: null },
    beneficiaryPhone: { type: String, default: null },
    // For unique constraint: SELF => requesterId, OTHER => phone (child=parent phone if no phone)
    beneficiaryRef: { type: String, default: null },
    adminOverrideBy: { type: Schema.Types.ObjectId, ref: "users", default: null },
    adminOverrideAt: { type: Date, default: null },
    // Counselling billing metadata (designation 2)
    isPaid: { type: Boolean, default: false },
    chargedAmount: { type: Number, min: 0, default: 0 },
    // When booking uses previous failed counselling entitlement
    isRecounsellingReplacement: { type: Boolean, default: false },
    replacementForSessionId: {
      type: Schema.Types.ObjectId,
      ref: "CounsellingSession",
      default: null,
    },
  },
  { timestamps: true }
);

// Issue 6: Index hardening
AppointmentSchema.index({ assignedTo: 1, dateKey: 1, slotId: 1, status: 1 });
// Phase 3-4: Allow batch - unique per (requester, designation, date, beneficiaryRef)
// beneficiaryRef: "SELF:<userId>" or "OTHER:<phone>"; null/legacy => treated as SELF in app
AppointmentSchema.index(
  { requesterId: 1, designationCode: 1, dateKey: 1, beneficiaryRef: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING", "ACCEPTED"] } },
  }
);
AppointmentSchema.index({ status: 1, designationCode: 1, requestedAt: -1 });
AppointmentSchema.index({ assignedTo: 1, dateKey: 1, status: 1 });
AppointmentSchema.index({ assignedTo: 1, status: 1 });
AppointmentSchema.index({ requesterId: 1, status: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ requestedAt: 1 });
AppointmentSchema.index({ dateKey: 1 });

const Appointment = mongoose.model("appointments", AppointmentSchema);
module.exports = Appointment;
module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
