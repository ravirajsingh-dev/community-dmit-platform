const mongoose = require("mongoose");
const {
  encryptPassword,
  decryptPassword,
} = require("../utils/passwordEncryption");

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 20,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 50,
      required: false,
      index: true,
    },

    ccode: {
      type: String,
      minlength: 1,
      maxlength: 5,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 10,
      minlength: 10,
      required: false,
      index: true,
    },
    admin_id: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 15,
      minlength: 8,
      index: true,
    },
    uuid: {
      type: String,
      unique: true,
      maxlength: 64,
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

    role: {
      type: Number, // 1 = User, 2 = Admin
      required: true,
      default: 2,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual properties for backward compatibility
AdminSchema.virtual("passCopy")
  .get(function () {
    if (this.admPwdRef) {
      return decryptPassword(this.admPwdRef);
    }
    return null;
  })
  .set(function (value) {
    this.admPwdRef = value ? encryptPassword(value) : null;
  });

AdminSchema.virtual("txnPassCopy")
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
AdminSchema.set("toJSON", { virtuals: true });
AdminSchema.set("toObject", { virtuals: true });

// Pre-save middleware: encrypt fields before saving if they're plain text
AdminSchema.pre("save", async function () {
  // Singleton guard: only one admin document is allowed.
  if (this.isNew) {
    const existingAdmin = await this.constructor.exists({
      _id: { $ne: this._id },
    });
    if (existingAdmin) {
      throw new Error("Not allowed: admin already exist");
    }
  }

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
AdminSchema.pre(
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

const Admin = mongoose.model("admins", AdminSchema);

module.exports = Admin;
