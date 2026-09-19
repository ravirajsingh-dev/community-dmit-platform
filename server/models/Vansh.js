const mongoose = require("mongoose");
const { Schema } = mongoose;

const VanshSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
  },
);

VanshSchema.index({ communityId: 1, name: 1, isDeleted: 1 }, { unique: true });
VanshSchema.index({ communityId: 1, isActive: 1, isDeleted: 1 });

const Vansh = mongoose.model("vanshes", VanshSchema);

module.exports = Vansh;
