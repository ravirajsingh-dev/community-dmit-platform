const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const connectDB = require("../config/db");
const User = require("../models/User");
const { encryptPassword } = require("../utils/passwordEncryption");
const { ROOT_MEMBER_ID } = require("../constants/system");

const run = async () => {
  try {
    const password = process.env.SEED_ROOT_PASSWORD;
    if (!password || password.length < 8) {
      console.error(
        "Set SEED_ROOT_PASSWORD (min 8 chars) before creating the root user.",
      );
      process.exit(1);
    }

    await connectDB();

    const existing = await User.findOne({
      memberId: ROOT_MEMBER_ID,
    });
    if (existing) {
      console.log("Root already exists");
      await mongoose.connection.close();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      memberId: ROOT_MEMBER_ID,
      name: process.env.SEED_ROOT_NAME || "Community Root",
      phone: process.env.SEED_ROOT_PHONE || "9999999999",
      email: process.env.SEED_ROOT_EMAIL || "root@example.com",
      password: hashedPassword,
      pwdRef: encryptPassword(password),
      status: 1,
      isPaid: true,
      isSystemRoot: true,
      referredBy: null,
      referredByMemberId: null,
      uuid: uuidv4(),
    });
    await user.save();

    console.log("Root created successfully");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
