const mongoose = require("mongoose");
const { Schema } = mongoose;

const NewsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imageKey: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("news", NewsSchema);
