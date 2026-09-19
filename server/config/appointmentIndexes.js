/**
 * MongoDB Indexes for Appointment Slot System
 *
 * Issue 6: Index hardening - ensures all appointment and slot indexes exist.
 * Run at startup or via migration.
 */

const Appointment = require("../models/Appointment");
const SlotDefinition = require("../models/SlotDefinition");

async function ensureAppointmentIndexes() {
  try {
    await Appointment.syncIndexes();
    await SlotDefinition.syncIndexes();
    return { ok: 1 };
  } catch (err) {
    console.error("Appointment index creation error:", err);
    throw err;
  }
}

module.exports = { ensureAppointmentIndexes };
