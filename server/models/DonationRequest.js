const mongoose = require("mongoose");
const { Schema } = mongoose;

const DonationRequestSchema = new Schema(
  {
    donorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    utrNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["UPI", "BANK"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const DonationRequest = mongoose.model("donation_requests", DonationRequestSchema);

module.exports = DonationRequest;

