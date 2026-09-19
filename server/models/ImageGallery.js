const mongoose = require("mongoose");

const ImageGallerySchema = new mongoose.Schema(
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
    category: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Index for category filtering
ImageGallerySchema.index({ category: 1, isActive: 1, createdAt: -1 });

const ImageGallery = mongoose.model("image_galleries", ImageGallerySchema);

module.exports = ImageGallery;
