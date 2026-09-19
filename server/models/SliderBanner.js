const mongoose = require("mongoose");

const SliderBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for ordering
SliderBannerSchema.index({ order: 1, createdAt: -1 });

const SliderBanner = mongoose.model("slider_banners", SliderBannerSchema);

module.exports = SliderBanner;

