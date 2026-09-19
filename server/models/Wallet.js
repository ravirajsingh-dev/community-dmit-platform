const mongoose = require("mongoose");
const { Schema } = mongoose;

const WalletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? v.toString() : "0"),
    },
    clubBalances: {
      type: Map,
      of: Schema.Types.Decimal128,
      default: {},
    },
    totalBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? v.toString() : "0"),
    },
    totalClubBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? v.toString() : "0"),
    },
    lastTransactionAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

WalletSchema.index({ totalBalance: 1 });
WalletSchema.index({ totalClubBalance: 1 });
WalletSchema.index({ balance: 1 });
WalletSchema.index({ lastTransactionAt: -1 });

WalletSchema.set("toJSON", { getters: true });
WalletSchema.set("toObject", { getters: true });

module.exports = mongoose.model("wallets", WalletSchema);
