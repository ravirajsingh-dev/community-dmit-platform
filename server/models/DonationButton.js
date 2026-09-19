const mongoose = require("mongoose");
const { Schema } = mongoose;

const DonationButtonSchema = new Schema(
  {
    amount: {
      type: Number,
      required: function () {
        return this.type === "FIXED";
      },
      min: 0,
      default: 0,
    },
    type: {
      type: String,
      enum: ["FIXED", "ANY"],
      required: true,
      default: "FIXED",
    },
    buttonText: {
      type: String,
      trim: true,
      maxlength: 100,
      default: function () {
        return this.type === "ANY" ? "Donate Any Other Amount" : null;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const DonationButton = mongoose.model("donation_buttons", DonationButtonSchema);

module.exports = DonationButton;
