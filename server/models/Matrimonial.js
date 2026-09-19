const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Matrimonial profile. One per user. References User and UserDetails.
 * No admin approval: status is system-driven (1 = active). Visibility is user-controlled via isActive.
 * Hard delete only; no soft delete.
 */
const MatrimonialSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    userDetailsId: {
      type: Schema.Types.ObjectId,
      ref: "user_details",
      required: true,
      index: true,
    },
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      required: true,
      index: true,
    },
    status: {
      type: Schema.Types.Mixed,
      default: 1,
      required: true,
      index: true,
      enum: [1, "approved"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MatrimonialSchema.index({ communityId: 1, status: 1, isActive: 1 });
MatrimonialSchema.index({ status: 1, isActive: 1 });
MatrimonialSchema.index({ createdAt: -1 });

const Matrimonial = mongoose.model("matrimonials", MatrimonialSchema);

module.exports = Matrimonial;
