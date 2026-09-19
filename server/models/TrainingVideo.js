const mongoose = require("mongoose");
const { Schema } = mongoose;

const TrainingVideoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    embedUrl: {
      type: String,
      required: true,
      trim: true,
    },
    designations: {
      type: Number,
      required: true,
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
  },
);

module.exports = mongoose.model("training_videos", TrainingVideoSchema);
