const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { MONGO_URI } = require("../config/config");

const Admin = require("../models/Admin");

const loadAdmin = async () => {
  try {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      console.error(
        "Set SEED_ADMIN_PASSWORD (min 8 chars) before running the admin seed.",
      );
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    const adminData = {
      name: process.env.SEED_ADMIN_NAME || "Admin",
      email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
      phone: process.env.SEED_ADMIN_PHONE || "9876543210",
      admin_id: process.env.SEED_ADMIN_ID || "ADMIN001",
      uuid: randomUUID(),
      status: 1,
    };

    const salt = await bcrypt.genSalt(10);
    adminData.admPwdRef = password;
    adminData.password = await bcrypt.hash(password, salt);
    adminData.txnRef = password;
    adminData.txn_password = await bcrypt.hash(password, salt);

    const admin = new Admin(adminData);
    await admin.save();

    console.log(`Admin seeded: ${adminData.admin_id}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Admin seed failed:", err);
    try {
      await mongoose.disconnect();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  }
};

loadAdmin();
