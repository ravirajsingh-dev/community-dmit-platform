const mongoose = require("mongoose");
const { Schema } = mongoose;

const CountrySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "active",
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

CountrySchema.index({ name: 1, isDeleted: 1 });
CountrySchema.index({ isActive: 1, isDeleted: 1 });

const Country = mongoose.model("countries", CountrySchema);

module.exports = Country;
