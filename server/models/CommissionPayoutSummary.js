const mongoose = require("mongoose");

const { Schema } = mongoose;

const CommissionPayoutSummarySchema = new Schema(
  {
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    payoutType: {
      type: String,
      enum: ["rank", "club"],
      required: true,
      index: true,
    },
    // Snapshot of calculationBreakdown for this period
    totalRevenue: { type: Number, default: 0 },
    levelsPercent: { type: Number, default: 0 },
    designationsPercent: { type: Number, default: 0 },
    adminSurchargePercent: { type: Number, default: 0 },
    companyProfitPercent: { type: Number, default: 0 },
    companyProfitPool: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    // Period bounds snapshot for cursor-less scheduling
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    // Whether payout for this (periodKey, payoutType) has been fully executed
    isPaid: { type: Boolean, default: false },
    // Total amount not distributed because of capping across all ranks/clubs
    lostDueToCapping: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CommissionPayoutSummarySchema.index(
  { periodKey: 1, payoutType: 1 },
  { unique: true },
);

const CommissionPayoutSummary = mongoose.model(
  "commission_payout_summary",
  CommissionPayoutSummarySchema,
);

module.exports = CommissionPayoutSummary;

