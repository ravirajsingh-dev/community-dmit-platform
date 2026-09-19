const mongoose = require("mongoose");
const { Schema } = mongoose;

const PaymentHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: function () {
        // userId is required for Activation/Upgrade, optional for Donation (guest users)
        return this.paymentType !== "Donation";
      },
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    paymentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ["Activation", "Donation", "Verification", "Other"],
      default: "Activation",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["UPI", "Netbanking", "Card", "Wallet", "Other"],
      default: "UPI",
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      trim: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    // Donor information for guest donations
    donorName: {
      type: String,
      trim: true,
    },
    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    donorPhone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
PaymentHistorySchema.index({ userId: 1, createdAt: -1 });
PaymentHistorySchema.index({ status: 1, createdAt: -1 });
PaymentHistorySchema.index({ paymentType: 1, status: 1, amount: -1 }); // For top donations query
// paymentId index is already defined in field definition (index: true)

const PaymentHistory = mongoose.model("payment_history", PaymentHistorySchema);

module.exports = PaymentHistory;
