const mongoose = require("mongoose");
const Khamp = require("./Khamp");
const { Schema } = mongoose;

const UserDetailsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    motherName: {
      type: String,
      required: false,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    height: {
      type: Number,
      required: false,
      min: 0,
      max: 300,
    },
    weight: {
      type: Number,
      required: false,
      min: 0,
      max: 500,
    },
    address: {
      type: String,
    required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "countries",
      index: true,
    required: true,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "states",
      index: true,
    required: true,
    },
    districtId: {
      type: Schema.Types.ObjectId,
      ref: "districts",
      index: true,
    required: true,
    },
    villageId: {
      type: Schema.Types.ObjectId,
      ref: "villages",
      index: true,
    required: true,
    },
    community: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      index: true,
      required: false,
    },
    vansh: {
      type: Schema.Types.ObjectId,
      ref: "vanshes",
      index: true,
      required: false,
    },
    kul: {
      type: Schema.Types.ObjectId,
      ref: "kuls",
      index: true,
      required: false,
    },
    khamp: {
      type: Schema.Types.ObjectId,
      ref: "khamps",
      index: true,
      required: false,
    },
    gotra: {
      type: Schema.Types.ObjectId,
      ref: "gotras",
      index: true,
      required: false,
    },
    maritalStatus: {
      type: String,
      enum: [
        "single",
        "married",
        "remarried",
        "divorced",
        "widowed",
        "separated",
      ],
      required: true,
    },
    education: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 100,
      required: false,
    },
    occupationDetails: {
      department: { type: String, trim: true, maxlength: 200 },
      position: { type: String, trim: true, maxlength: 200 },
      location: { type: String, trim: true, maxlength: 200 },
      businessName: { type: String, trim: true, maxlength: 200 },
      businessType: { type: String, trim: true, maxlength: 200 },
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    whatsappContact: {
      type: String,
      minlength: 10,
      maxlength: 10,
    },
  },
  {
    timestamps: true,
  },
);

const UserDetails = mongoose.model("user_details", UserDetailsSchema);
module.exports = UserDetails;
