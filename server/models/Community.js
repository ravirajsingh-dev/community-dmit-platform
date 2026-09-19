const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommunitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
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
  }
);

CommunitySchema.index({ name: 1, isDeleted: 1 });
CommunitySchema.index({ isActive: 1, isDeleted: 1 });

const Community = mongoose.model("communities", CommunitySchema);

module.exports = Community;
