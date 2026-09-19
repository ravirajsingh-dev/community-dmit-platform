const mongoose = require("mongoose");
const { Schema } = mongoose;

const TX_TYPES = [
  "CREDIT",
  "DEBIT",
  "TRANSFER",
  "LEVEL_INCOME",
  "RANK_INCOME",
  "CLUB_INCOME",
  "SBI_PRO_COMMISSION",
  "COUNSELLING_COMMISSION",
  "COUNSELLING_CHARGE",
  "ADMIN",
  "ACTIVATION",
  "ADMIN_CR",
  "ADMIN_DR",
  "ADMIN_TRANSFER",
  "WITHDRAWAL_HOLD",
  "WITHDRAWAL_RELEASE",
];

const DIRECTIONS = ["CREDIT", "DEBIT"];

const WalletTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
      sparse: true, // Allows multiple nulls for legacy docs; enforces uniqueness for non-null
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: TX_TYPES,
      index: true,
    },
    direction: {
      type: String,
      required: true,
      enum: DIRECTIONS,
      index: true,
    },
    walletKey: {
      type: String,
      default: "MAIN",
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? v.toString() : "0"),
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
);

WalletTransactionSchema.set("toJSON", { getters: true });
WalletTransactionSchema.set("toObject", { getters: true });

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, walletKey: 1 });
WalletTransactionSchema.index({ userId: 1, direction: 1, createdAt: -1 });

WalletTransactionSchema.pre("updateOne", function () {
  throw new Error(
    "WalletTransaction documents are immutable and cannot be updated",
  );
});
WalletTransactionSchema.pre("updateMany", function () {
  throw new Error(
    "WalletTransaction documents are immutable and cannot be updated",
  );
});
WalletTransactionSchema.pre("findOneAndUpdate", function () {
  throw new Error(
    "WalletTransaction documents are immutable and cannot be updated",
  );
});
WalletTransactionSchema.pre("deleteOne", function () {
  throw new Error("WalletTransaction documents cannot be deleted");
});
WalletTransactionSchema.pre("deleteMany", function () {
  throw new Error("WalletTransaction documents cannot be deleted");
});
WalletTransactionSchema.pre("remove", function () {
  throw new Error("WalletTransaction documents cannot be removed");
});
WalletTransactionSchema.pre("findOneAndDelete", function () {
  throw new Error("WalletTransaction is immutable");
});
WalletTransactionSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("WalletTransaction is immutable");
  }
});

const WalletTransactionModel = mongoose.model(
  "wallet_transactions",
  WalletTransactionSchema,
);

WalletTransactionModel.ensureIdempotencyIndexMigrated = async function () {
  await this.syncIndexes();
};

module.exports = WalletTransactionModel;
module.exports.TX_TYPES = TX_TYPES;
module.exports.DIRECTIONS = DIRECTIONS;
