const mongoose = require("mongoose");
const { Schema } = mongoose;

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const PAYMENT_METHODS = ["UPI", "BANK", "CHEQUE"];

const DecimalString = {
  type: Schema.Types.Decimal128,
  required: true,
  get: (v) => (v ? v.toString() : "0"),
};

const WalletWithdrawalRequestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    memberId: { type: String, default: "", index: true, trim: true },
    userName: { type: String, default: "", trim: true },

    // Idempotency for request creation (client sends UUID)
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    amount: DecimalString, // Gross amount debited from wallet

    adminWithdrawalSurchargePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 99,
    },
    adminWithdrawalSurchargeAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? v.toString() : "0"),
    },
    netPayoutAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? v.toString() : "0"),
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS,
      index: true,
    },
    paymentDetails: {
      // UPI
      upiId: { type: String, default: "", trim: true },

      // BANK
      bankName: { type: String, default: "", trim: true },
      accountHolderName: { type: String, default: "", trim: true },
      accountNumber: { type: String, default: "", trim: true },
      ifsc: { type: String, default: "", trim: true },

      // CHEQUE
      chequeNumber: { type: String, default: "", trim: true },
      chequeBankName: { type: String, default: "", trim: true },
    },

    status: {
      type: String,
      required: true,
      enum: STATUSES,
      index: true,
      default: "PENDING",
    },

    adminId: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      default: null,
      index: true,
    },
    adminRemarks: { type: String, default: "", trim: true },
    /** UTR / transaction ID / cheque no. etc. — shown to user after payout */
    payoutReference: { type: String, default: "", trim: true, maxlength: 120 },

    cancelledAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

WalletWithdrawalRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

WalletWithdrawalRequestSchema.set("toJSON", { getters: true });
WalletWithdrawalRequestSchema.set("toObject", { getters: true });

module.exports = mongoose.model(
  "wallet_withdrawal_requests",
  WalletWithdrawalRequestSchema,
);

module.exports.STATUSES = STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;

