/**
 * SBI PRO Finger Analysis Service
 * Get/save admin-entered code + count per finger.
 */

const mongoose = require("mongoose");
const SbiProFingerAnalysis = require("../models/SbiProFingerAnalysis");
const SbiProSession = require("../models/SbiProSession");
const { FINGER_TYPES, SBI_PRO_CODES } = require("../models/SbiProFingerAnalysis");

function validateFingerEntry(entry) {
  if (!entry) return true;
  const { code, count } = entry;
  if (code != null && code !== "" && !SBI_PRO_CODES.includes(code)) {
    return false;
  }
  if (count != null && count !== "" && (Number(count) < 0 || Number(count) > 99)) {
    return false;
  }
  return true;
}

/**
 * Get finger analysis by appointmentId
 */
async function getByAppointmentId(appointmentId) {
  const analysis = await SbiProFingerAnalysis.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  })
    .lean();

  if (!analysis) {
    const empty = { appointmentId, fingers: {} };
    FINGER_TYPES.forEach((ft) => {
      empty.fingers[ft] = { code: null, count: null };
    });
    return empty;
  }

  const fingers = analysis.fingers || {};
  FINGER_TYPES.forEach((ft) => {
    if (!fingers[ft]) fingers[ft] = { code: null, count: null };
  });
  return { ...analysis, fingers };
}

/**
 * Save finger analysis - admin only.
 * Validates: appointmentId must have SBI PRO session, codes in SBI_PRO_CODES, count 0-99
 */
async function save(appointmentId, fingers) {
  const sess = await SbiProSession.findOne({
    appointmentId: new mongoose.Types.ObjectId(appointmentId),
  }).lean();

  if (!sess) {
    return { success: false, reason: "SBI PRO session not found" };
  }

  for (const ft of FINGER_TYPES) {
    const entry = fingers?.[ft];
    if (!validateFingerEntry(entry)) {
      return { success: false, reason: `Invalid code or count for ${ft}` };
    }
  }

  const update = {};
  FINGER_TYPES.forEach((ft) => {
    const entry = fingers?.[ft] || {};
    let code = entry.code;
    let count = entry.count;
    if (code === "" || code === undefined) code = null;
    if (count === "" || count === undefined) count = null;
    if (count !== null) {
      const n = Number(count);
      if (isNaN(n) || n < 0 || n > 99) count = null;
      else count = n;
    }
    update[`fingers.${ft}`] = { code, count };
  });

  const result = await SbiProFingerAnalysis.findOneAndUpdate(
    { appointmentId: new mongoose.Types.ObjectId(appointmentId) },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  return { success: true, analysis: result };
}

module.exports = {
  getByAppointmentId,
  save,
};
