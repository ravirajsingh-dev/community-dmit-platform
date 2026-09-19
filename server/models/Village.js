const mongoose = require("mongoose");
const { Schema } = mongoose;

const VillageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    districtId: {
      type: Schema.Types.ObjectId,
      ref: "districts",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VillageSchema.index({ name: 1, districtId: 1, isDeleted: 1 });
VillageSchema.index({ districtId: 1, isActive: 1, isDeleted: 1 });
VillageSchema.index({ isActive: 1, isDeleted: 1 });

const Village = mongoose.model("villages", VillageSchema);

module.exports = Village;
