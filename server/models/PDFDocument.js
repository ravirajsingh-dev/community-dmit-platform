const mongoose = require("mongoose");
const { Schema } = mongoose;

const PDFDocumentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ["policy", "terms", "refund", "plan", "misc"],
      default: "misc",
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileKey: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
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

// Indexes for efficient queries
PDFDocumentSchema.index({ type: 1, isActive: 1, displayOrder: 1 });
PDFDocumentSchema.index({ isActive: 1, displayOrder: 1, createdAt: -1 });

module.exports = mongoose.model("pdf_documents", PDFDocumentSchema);
