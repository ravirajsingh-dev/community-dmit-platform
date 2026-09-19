const mongoose = require("mongoose");
const { Schema } = mongoose;

const PhoneRegistrationCounterSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 10,
      maxlength: 10,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "phone_registration_counters",
  PhoneRegistrationCounterSchema,
);
