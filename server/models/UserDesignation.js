const mongoose = require("mongoose");
const { Schema } = mongoose;

const DESIGNATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "INACTIVE", "DELETED"];

const UserDesignationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    designationCode: { type: Number, required: true, min: 1, index: true },
    status: { type: String, required: true, enum: DESIGNATION_STATUSES, index: true },
    appliedAt: { type: Date, required: true },
    approvedAt: { type: Date, default: null, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "admins", default: null },
    remarks: { type: String, default: null, trim: true },

    // true when admin has force-assigned / directly approved designation
    // (bypassing standard business eligibility rules). Visible to user.
    forceAssigned: { type: Boolean, default: false, index: true },

    // Holder availability + rating live alongside the designation doc.
    online: { type: Boolean, default: false, index: true },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

// "Current/latest semantics" per the existing admin UI:
// Only one doc per user+designationCode.
UserDesignationSchema.index({ userId: 1, designationCode: 1 }, { unique: true });

// Common query patterns in this app:
UserDesignationSchema.index({ designationCode: 1, status: 1 });
UserDesignationSchema.index({ status: 1, appliedAt: -1 });
UserDesignationSchema.index({ status: 1, approvedAt: -1 });

module.exports = mongoose.model("user_designations", UserDesignationSchema);

