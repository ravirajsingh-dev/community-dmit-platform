const mongoose = require("mongoose");
const { Schema } = mongoose;

const StateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "countries",
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

StateSchema.index({ name: 1, countryId: 1, isDeleted: 1 });
StateSchema.index({ countryId: 1, isActive: 1, isDeleted: 1 });
StateSchema.index({ isActive: 1, isDeleted: 1 });

const State = mongoose.model("states", StateSchema);

module.exports = State;
