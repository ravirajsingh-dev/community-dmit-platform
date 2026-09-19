const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * FamilyMember
 * - Belongs to a Family
 * - Can have multiple marriages (tracked in FamilyMarriage collection)
 * - Children are linked via FamilyMarriage.children (child-to-spouse mapping)
 */
const FamilyMemberSchema = new Schema(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: "families",
      required: true,
      index: true,
    },
    userId: {
      // Redundant convenience field for fast admin/user validation
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    gender: {
      // Align with existing project style
      type: String,
      enum: ["male", "female", "other"],
      required: true,
      index: true,
    },
    dob: {
      type: Date,
    },
    dateOfDeath: {
      type: Date,
      default: null,
    },
    isAlive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    meta: {
      // Future-proof, flexible member details without schema changes
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

FamilyMemberSchema.index({ familyId: 1, isDeleted: 1 });
FamilyMemberSchema.index({ familyId: 1, isDeleted: 1, createdAt: 1 });
FamilyMemberSchema.index({ userId: 1, familyId: 1, isDeleted: 1 });

const FamilyMember = mongoose.model("family_members", FamilyMemberSchema);
module.exports = FamilyMember;

