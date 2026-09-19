const mongoose = require("mongoose");
const { Schema } = mongoose;

const KulSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      required: true,
      index: true,
    },
    vanshId: {
      type: Schema.Types.ObjectId,
      ref: "vanshes",
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

KulSchema.index({ vanshId: 1, name: 1, isDeleted: 1 }, { unique: true });
KulSchema.index({ communityId: 1, vanshId: 1, isActive: 1, isDeleted: 1 });

const Kul = mongoose.model("kuls", KulSchema);

module.exports = Kul;
