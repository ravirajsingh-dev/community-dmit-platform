const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Family (Vanshavriksh container)
 * - Linked to a single userId (one family tree per user)
 * - Root can be a single member or a marriage/couple (rootMarriageId)
 * - Completely independent from existing schemas
 */
const FamilySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    rootMemberId: {
      type: Schema.Types.ObjectId,
      ref: "family_members",
      index: true,
    },
    rootMarriageId: {
      type: Schema.Types.ObjectId,
      ref: "family_marriages",
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
  { timestamps: true }
);

FamilySchema.index({ userId: 1, isDeleted: 1 }, { unique: true });

const Family = mongoose.model("families", FamilySchema);
module.exports = Family;

