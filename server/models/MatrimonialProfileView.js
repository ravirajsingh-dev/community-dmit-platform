const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Tracks who viewed a matrimonial profile and when.
 */
const MatrimonialProfileViewSchema = new Schema(
  {
    matrimonialId: {
      type: Schema.Types.ObjectId,
      ref: "matrimonials",
      required: true,
      index: true,
    },
    viewedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

MatrimonialProfileViewSchema.index({ matrimonialId: 1, viewedByUserId: 1 });
MatrimonialProfileViewSchema.index({ matrimonialId: 1, viewedAt: -1 });

const MatrimonialProfileView = mongoose.model("matrimonial_profile_views", MatrimonialProfileViewSchema);

module.exports = MatrimonialProfileView;
