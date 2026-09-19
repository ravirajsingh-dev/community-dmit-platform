const mongoose = require("mongoose");
const {
  encryptPassword,
  decryptPassword,
} = require("../utils/passwordEncryption");

const SubAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 50,
      required: false,
      index: true,
    },

    admin_id: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 15,
      minlength: 8,
      required: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    admPwdRef: {
      type: String,
      required: true,
      minlength: 8,
    },

    txn_password: {
      type: String,
      minlength: 8,
    },
    txnRef: {
      type: String,
      minlength: 8,
    },

    status: {
      type: Number,
      default: 1, // 1 = Active, 2 = Inactive
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["admin", "sub_admin", "staff", "manager"],
      default: "sub_admin",
      required: true,
    },

    last_login: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    avatar: {
      type: String,
    },

    uuid: {
      type: String,
      unique: true,
      maxlength: 64,
    },

    // Dynamic permissions object - no fixed schema
    // Supports: { "module": true/false } or { "module": { "action": true/false } }
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admins",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual properties for backward compatibility
SubAdminSchema.virtual("passCopy")
  .get(function () {
    if (this.admPwdRef) {
      return decryptPassword(this.admPwdRef);
    }
    return null;
  })
  .set(function (value) {
    this.admPwdRef = value ? encryptPassword(value) : null;
  });

SubAdminSchema.virtual("txnPassCopy")
  .get(function () {
    if (this.txnRef) {
      return decryptPassword(this.txnRef);
    }
    return null;
  })
  .set(function (value) {
    this.txnRef = value ? encryptPassword(value) : null;
  });

// Ensure virtuals are included in JSON output
SubAdminSchema.set("toJSON", { virtuals: true });
SubAdminSchema.set("toObject", { virtuals: true });

// Pre-save middleware: encrypt fields before saving if they're plain text
SubAdminSchema.pre("save", async function () {
  if (
    this.admPwdRef &&
    typeof this.admPwdRef === "string" &&
    !this.admPwdRef.includes(":")
  ) {
    const encrypted = encryptPassword(this.admPwdRef);
    if (encrypted) {
      this.admPwdRef = encrypted;
    }
  }
  if (
    this.txnRef &&
    typeof this.txnRef === "string" &&
    !this.txnRef.includes(":")
  ) {
    const encrypted = encryptPassword(this.txnRef);
    if (encrypted) {
      this.txnRef = encrypted;
    }
  }
});

// Pre-update middleware: encrypt fields in update operations
SubAdminSchema.pre(
  ["updateOne", "findOneAndUpdate", "updateMany"],
  async function () {
    const update = this.getUpdate();
    if (update) {
      // Handle direct updates
      if (
        update.admPwdRef &&
        typeof update.admPwdRef === "string" &&
        !update.admPwdRef.includes(":")
      ) {
        const encrypted = encryptPassword(update.admPwdRef);
        if (encrypted) {
          update.admPwdRef = encrypted;
        }
      }
      if (
        update.txnRef &&
        typeof update.txnRef === "string" &&
        !update.txnRef.includes(":")
      ) {
        const encrypted = encryptPassword(update.txnRef);
        if (encrypted) {
          update.txnRef = encrypted;
        }
      }
      // Handle $set operations
      if (update.$set) {
        if (
          update.$set.admPwdRef &&
          typeof update.$set.admPwdRef === "string" &&
          !update.$set.admPwdRef.includes(":")
        ) {
          const encrypted = encryptPassword(update.$set.admPwdRef);
          if (encrypted) {
            update.$set.admPwdRef = encrypted;
          }
        }
        if (
          update.$set.txnRef &&
          typeof update.$set.txnRef === "string" &&
          !update.$set.txnRef.includes(":")
        ) {
          const encrypted = encryptPassword(update.$set.txnRef);
          if (encrypted) {
            update.$set.txnRef = encrypted;
          }
        }
      }
    }
  },
);

// Index for faster queries
SubAdminSchema.index({ admin_id: 1, status: 1 });
SubAdminSchema.index({ email: 1, status: 1 });

const SubAdmin = mongoose.model("sub_admins", SubAdminSchema);

module.exports = SubAdmin;
