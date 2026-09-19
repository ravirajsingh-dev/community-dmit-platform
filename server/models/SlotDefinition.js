/**
 * Slot Definition Model - Phase-2.2
 *
 * Time slots for designation-based appointments.
 * Each slot has capacity; bookings are counted per holder per date per slot.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const SlotDefinitionSchema = new Schema(
  {
    designationCode: { type: Number, required: true },
    label: { type: String, required: true },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SlotDefinitionSchema.index({ designationCode: 1 });
SlotDefinitionSchema.index({ active: 1 });
SlotDefinitionSchema.index({ designationCode: 1, active: 1, startTime: 1, endTime: 1 });

const SlotDefinition = mongoose.model("slotdefinitions", SlotDefinitionSchema);
module.exports = SlotDefinition;
