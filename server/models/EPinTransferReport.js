const mongoose = require("mongoose");
const { Schema } = mongoose;

const ACTIVITY_TYPES = [
  "transfer",
  "admin_create",
  "admin_bulk_delete",
  "admin_delete",
];

const EPinTransferReportSchema = new Schema(
  {
    activityType: {
      type: String,
      enum: ACTIVITY_TYPES,
      default: "transfer",
      required: true,
    },
    /** Sender (member-to-member or admin bulk transfer source) */
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    /** Recipient (transfers) or member who received new E-PINs (admin_create) */
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    /** Member whose unused E-PINs were removed (admin bulk/single delete) */
    affectedUser: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      default: null,
    },
    count: {
      type: Number,
      required: true,
    },
    epinIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "epins",
      },
    ],
    /** Human-readable E-PIN codes (especially when epin documents are deleted) */
    epinDisplayIds: {
      type: [String],
      default: undefined,
    },
    transferredByAdmin: {
      type: Boolean,
      default: false,
      required: true,
    },
    transferredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EPinTransferReportSchema.index({ fromUser: 1 });
EPinTransferReportSchema.index({ toUser: 1 });
EPinTransferReportSchema.index({ affectedUser: 1 });
EPinTransferReportSchema.index({ adminId: 1 });
EPinTransferReportSchema.index({ activityType: 1 });
EPinTransferReportSchema.index({ transferredAt: -1 });

const EPinTransferReport = mongoose.model("epin_transfer_reports", EPinTransferReportSchema);
module.exports = EPinTransferReport;
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
