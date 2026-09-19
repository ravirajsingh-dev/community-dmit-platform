const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * FamilyMarriage (Relationship mapping)
 * - Encodes spouse-to-spouse relationship
 * - children: [{ memberId, order }] is the single source of truth for children of this marriage.
 */
const FamilyMarriageSchema = new Schema(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: "families",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    spouse1Id: {
      type: Schema.Types.ObjectId,
      ref: "family_members",
      required: true,
      index: true,
    },
    spouse2Id: {
      type: Schema.Types.ObjectId,
      ref: "family_members",
      required: true,
      index: true,
    },
    // Single source of truth: [{ memberId, order }]. order = 1 (eldest), 2, 3... Optional; DOB used when order missing.
    children: [
      {
        memberId: {
          type: Schema.Types.ObjectId,
          ref: "family_members",
          required: true,
        },
        order: { type: Number, default: null },
      },
    ],
    order: {
      // Optional ordering for multiple marriages
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      // active = current marriage; divorced/widowed = ended (kept for history, children remain attached)
      type: String,
      enum: ["active", "divorced", "widowed"],
      default: "active",
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// Non-unique: allows remarriage after divorce. "Only one active marriage per spouse pair" enforced in application logic.
FamilyMarriageSchema.index({
  familyId: 1,
  spouse1Id: 1,
  spouse2Id: 1,
  isDeleted: 1,
});
FamilyMarriageSchema.index({ familyId: 1, isDeleted: 1 });
FamilyMarriageSchema.index({ familyId: 1, status: 1, isDeleted: 1 });

const FamilyMarriage = mongoose.model("family_marriages", FamilyMarriageSchema);
module.exports = FamilyMarriage;
