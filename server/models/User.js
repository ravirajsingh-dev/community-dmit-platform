const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  encryptPassword,
  decryptPassword,
} = require("../utils/passwordEncryption");
const { ROOT_MEMBER_ID } = require("../constants/system");
const MEMBER_ID_REGEX = /^G\d{9}$/;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

if (!MEMBER_ID_REGEX.test(ROOT_MEMBER_ID)) {
  throw new Error("Invalid ROOT_MEMBER_ID format. Expected G#########");
}

const UserSchema = new Schema(
  {
    memberId: {
      type: String,
      unique: true,
      required: true,
      immutable: true,
      index: true,
      uppercase: true,
      minlength: 10,
      maxlength: 10,
      match: [/^G\d{9}$/, "Member ID must be in format G#########"],
    },
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: true,
      index: true,
      minlength: 10,
      maxlength: 10,
      match: [PHONE_REGEX, "Phone must be exactly 10 digits"],
    },
    email: {
      type: String,
      required: true,
      index: true,
      match: [EMAIL_REGEX, "Invalid email format"],
    },
    alternatePhone: {
      type: String,
      required: false,
      minlength: 10,
      maxlength: 10,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
    },
    pwdRef: {
      type: String,
      required: true,
      minlength: 6,
    },
    status: {
      type: Number,
      default: 4, // 1 = Active, 2 = Inactive, 3 = Blocked, 4 = New
      enum: [1, 2, 3, 4],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: function () {
        return this.memberId !== ROOT_MEMBER_ID;
      },
      index: true,
    },
    referredByMemberId: {
      type: String,
      required: function () {
        return this.memberId !== ROOT_MEMBER_ID;
      },
      index: true,
      uppercase: true,
      minlength: 10,
      maxlength: 10,
      match: [/^G\d{9}$/, "Referral Member ID must be in format G#########"],
    },
    isSystemRoot: {
      type: Boolean,
      default: false,
    },
    last_login: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    uuid: {
      type: String,
      maxlength: 64,
    },
    directCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDownlineCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rankCode: {
      type: Number,
      default: null,
      min: 1,
      index: true,
    },
    freeAppointmentsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual property for backward compatibility
UserSchema.virtual("passwordCopy")
  .get(function () {
    if (this.pwdRef) {
      return decryptPassword(this.pwdRef);
    }
    return null;
  })
  .set(function (value) {
    this.pwdRef = value ? encryptPassword(value) : null;
  });

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

UserSchema.index(
  { isSystemRoot: 1 },
  {
    unique: true,
    partialFilterExpression: { isSystemRoot: true },
  },
);

// Team hierarchy indexes (closure-table queries, pagination)
// referredBy already has index: true in schema
UserSchema.index({ status: 1 });
UserSchema.index({ referredBy: 1, createdAt: -1 });
UserSchema.index({ referredBy: 1, status: 1, createdAt: -1 });
UserSchema.index({ phone: 1, createdAt: -1 });

// Phase-2.1: designationStats moved to `user_designations`.

UserSchema.pre("save", async function () {
  // 1) normalize member identifiers
  if (this.memberId && typeof this.memberId === "string") {
    this.memberId = this.memberId.trim().toUpperCase();
  }
  if (this.referredByMemberId && typeof this.referredByMemberId === "string") {
    this.referredByMemberId = this.referredByMemberId.trim().toUpperCase();
  }
  if (this.phone && typeof this.phone === "string") {
    this.phone = this.phone.trim();
  }
  if (this.email && typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }

  // 2) enforce referral requirement for non-root users
  if (this.memberId !== ROOT_MEMBER_ID) {
    if (!this.referredBy || !this.referredByMemberId) {
      throw new Error("Referral is mandatory");
    }
  }
  // 3) validate root constraint
  if (this.isSystemRoot && this.memberId !== ROOT_MEMBER_ID) {
    throw new Error("Only root member can have isSystemRoot=true");
  }

  // 4) keep password reference encrypted
  if (this.passwordCopy && !this.pwdRef) {
    this.pwdRef = this.passwordCopy;
    delete this.passwordCopy;
  }

  if (
    this.pwdRef &&
    typeof this.pwdRef === "string" &&
    !this.pwdRef.includes(":")
  ) {
    const encrypted = encryptPassword(this.pwdRef);
    if (encrypted) {
      this.pwdRef = encrypted;
    }
  }
});

UserSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const doc = await this.model.findOne(this.getQuery());

  if (!doc) return typeof next === "function" ? next() : undefined;

  if (doc.memberId !== ROOT_MEMBER_ID) {
    const newReferredBy = update?.referredBy ?? update?.$set?.referredBy;
    const newReferredByMemberId =
      update?.referredByMemberId ?? update?.$set?.referredByMemberId;
    const unsetReferredBy = update?.$unset?.referredBy;
    const unsetReferredByMemberId = update?.$unset?.referredByMemberId;

    if (
      newReferredBy === null ||
      newReferredByMemberId === null ||
      unsetReferredBy ||
      unsetReferredByMemberId
    ) {
      const err = new Error("Referral cannot be removed");
      return typeof next === "function" ? next(err) : Promise.reject(err);
    }
  }

  return typeof next === "function" ? next() : undefined;
});

// Pre-update middleware
UserSchema.pre(
  ["updateOne", "findOneAndUpdate", "updateMany"],
  async function () {
    const update = this.getUpdate();
    const options = this.getOptions?.() || {};
    const immutableOverwriteEnabled = options.overwriteImmutable === true;

    if (
      !immutableOverwriteEnabled &&
      (Object.prototype.hasOwnProperty.call(update || {}, "memberId") ||
        Object.prototype.hasOwnProperty.call(update?.$set || {}, "memberId"))
    ) {
      throw new Error(
        "memberId is immutable and cannot be updated without overwriteImmutable=true",
      );
    }

    if (typeof update?.memberId === "string") {
      update.memberId = update.memberId.trim().toUpperCase();
    }
    if (typeof update?.referredByMemberId === "string") {
      update.referredByMemberId = update.referredByMemberId
        .trim()
        .toUpperCase();
    }
    if (typeof update?.phone === "string") {
      update.phone = update.phone.trim();
    }
    if (typeof update?.email === "string") {
      update.email = update.email.trim().toLowerCase();
    }
    if (typeof update?.$set?.memberId === "string") {
      update.$set.memberId = update.$set.memberId.trim().toUpperCase();
    }
    if (typeof update?.$set?.referredByMemberId === "string") {
      update.$set.referredByMemberId = update.$set.referredByMemberId
        .trim()
        .toUpperCase();
    }
    if (typeof update?.$set?.phone === "string") {
      update.$set.phone = update.$set.phone.trim();
    }
    if (typeof update?.$set?.email === "string") {
      update.$set.email = update.$set.email.trim().toLowerCase();
    }

    if (
      update?.pwdRef &&
      typeof update.pwdRef === "string" &&
      !update.pwdRef.includes(":")
    ) {
      update.pwdRef = encryptPassword(update.pwdRef);
    }

    if (
      update?.$set?.pwdRef &&
      typeof update.$set.pwdRef === "string" &&
      !update.$set.pwdRef.includes(":")
    ) {
      update.$set.pwdRef = encryptPassword(update.$set.pwdRef);
    }
  },
);

const User = mongoose.model("users", UserSchema);
module.exports = User;
