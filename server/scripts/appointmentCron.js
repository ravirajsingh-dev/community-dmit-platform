/**
 * Appointment Auto-Expiry Cron Job - Phase-2.1
 *
 * Expires PENDING appointments older than 24 hours -> CANCELLED_BY_SYSTEM
 *
 * Run every hour via cron:
 *   0 * * * * cd /path/to/godjee && node server/scripts/appointmentCron.js
 *
 * Or run manually:
 *   node server/scripts/appointmentCron.js
 *
 * Requires: MONGO_URI in env
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { expirePendingAppointments } = require("../services/appointmentService");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[AppointmentCron] Connected to MongoDB");

    const result = await expirePendingAppointments();
    console.log(
      `[AppointmentCron] Cancelled ${result.modifiedCount} expired PENDING appointment(s)`
    );
  } catch (err) {
    console.error("[AppointmentCron] Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[AppointmentCron] Disconnected");
    process.exit(0);
  }
}

run();
