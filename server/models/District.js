const mongoose = require("mongoose");
const { Schema } = mongoose;

const DistrictSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "states",
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

DistrictSchema.index({ name: 1, stateId: 1, isDeleted: 1 });
DistrictSchema.index({ stateId: 1, isActive: 1, isDeleted: 1 });
DistrictSchema.index({ isActive: 1, isDeleted: 1 });

const District = mongoose.model("districts", DistrictSchema);

module.exports = District;
