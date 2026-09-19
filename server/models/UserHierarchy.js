/**
 * User Hierarchy - Closure Table Model
 *
 * Stores ancestor-descendant relationships for MLM team structure.
 * Designed for: 100k–500k+ users, 10M+ hierarchy rows.
 *
 * Schema:
 *   user: ObjectId     → descendant (the user in downline)
 *   ancestor: ObjectId → ancestor (upline user)
 *   level: Number      → distance (1 = direct sponsor)
 *
 * Index strategy:
 *   - { user: 1 }                  → "Who are my ancestors?"
 *   - { ancestor: 1 }              → "Who is my downline?"
 *   - { ancestor: 1, level: 1 }    → Level-wise downline
 *   - { user: 1, ancestor: 1 }     → UNIQUE, prevent duplicates
 *
 * No recursion, no $graphLookup. All queries use indexed lookups.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserHierarchySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    ancestor: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
  },
  {
    timestamps: false,
    _id: true,
  }
);

// Compound indexes for efficient queries
UserHierarchySchema.index({ user: 1 });
UserHierarchySchema.index({ ancestor: 1 });
UserHierarchySchema.index({ ancestor: 1, level: 1 });
UserHierarchySchema.index({ user: 1, ancestor: 1 }, { unique: true });

const UserHierarchy = mongoose.model(
  "user_hierarchy",
  UserHierarchySchema,
  "user_hierarchy"
);

module.exports = UserHierarchy;
