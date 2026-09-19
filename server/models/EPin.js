const mongoose = require("mongoose");
const { Schema } = mongoose;

const EPIN_REGEX = /^G[A-Z0-9]{19}$/;

const EPinSchema = new Schema(
  {
    epinId: {
      type: String,
      required: true,
      unique: true,
      length: 20,
      uppercase: true,
      trim: true,
      validate: {
        validator: (v) => EPIN_REGEX.test(v),
        message: "EPin must start with G followed by 19 uppercase alphanumeric characters",
      },
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["unused", "used"],
      default: "unused",
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

EPinSchema.index({ ownerId: 1, status: 1 });
EPinSchema.index({ status: 1 });

const EPin = mongoose.model("epins", EPinSchema);
module.exports = EPin;
