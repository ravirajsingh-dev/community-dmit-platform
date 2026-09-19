/**
 * Counsellor Commission Service - Designation_2
 * Credits Counsellor main wallet when user/admin confirms and closes.
 * Commission = registrationFee × designation.commissionPercent / 100
 * Idempotent via requestId: counselling:commission:<counsellingSessionId>
 */

const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const CounsellingSession = require("../models/CounsellingSession");
const WalletSettings = require("../models/WalletSettings");
const walletService = require("./walletService");
const {
  buildTransactionDescription,
  formatAmountForDescription,
} = require("../utils/transactionDescriptionEngine");

const DESIGNATION_COUNSELLOR = 2;

async function resolveAppointmentMemberInfo(appointmentId) {
  const apt = await Appointment.findById(appointmentId)
    .populate("requesterId", "name memberId phone")
    .lean();
  if (!apt) return null;
  const requester = apt.requesterId;
  if (!requester) return null;
  const memberName = (requester.name || "N/A").trim();
  const memberIdentifier = (requester.memberId || requester.phone || "N/A").trim();
  return { memberName, memberIdentifier };
}

/**
 * Credit counsellor commission when CounsellingSession is CLOSED (user or admin confirmed).
 * @param {Object} [opts] - { adminId, session }
 */
async function creditCounsellorCommission(
  counsellingSessionId,
  counsellorId,
  opts = {}
) {
  const adminId = opts.adminId || null;
  const extSession = opts.session || null;
  const csId = mongoose.Types.ObjectId.isValid(counsellingSessionId)
    ? new mongoose.Types.ObjectId(counsellingSessionId)
    : null;
  const cId = mongoose.Types.ObjectId.isValid(counsellorId)
    ? new mongoose.Types.ObjectId(counsellorId)
    : null;

  if (!csId || !cId) {
    return { credited: false, reason: "Invalid counsellingSessionId or counsellorId" };
  }

  const sess = await CounsellingSession.findById(csId)
    .session(extSession || null)
    .lean();
  if (!sess || sess.status !== "CLOSED") {
    return { credited: false, reason: "Session not closed" };
  }
  if (sess.commissionCredited) {
    return { credited: true, amount: "0", idempotent: true };
  }

  const settings = await WalletSettings.getOrCreateSettings();
  const registrationFee = Number(settings?.registrationFee) || 0;
  const designations = settings?.designations || [];
  const desConfig = designations.find((d) => d.designationCode === DESIGNATION_COUNSELLOR);

  if (!desConfig) {
    return { credited: false, reason: "Designation 2 (COUNSELLOR) not configured" };
  }

  const commissionPercent = Number(desConfig.commissionPercent) || 0;
  const commissionAmount = (registrationFee * commissionPercent) / 100;

  if (commissionAmount <= 0) {
    return { credited: false, reason: "No commission (registrationFee or commissionPercent is 0)" };
  }

  const amountStr = commissionAmount.toFixed(2);
  const requestId = `counselling:commission:${csId.toString()}`;

  const aptId = sess.appointmentId?._id || sess.appointmentId;
  const memberInfo = await resolveAppointmentMemberInfo(aptId);
  const memberName = memberInfo?.memberName ?? "Unknown";
  const memberIdentifier = memberInfo?.memberIdentifier ?? csId.toString();

  const description = buildTransactionDescription("COUNSELLING_INCOME", {
    amount: formatAmountForDescription(amountStr),
    memberName,
    memberIdentifier,
  });

  const options = {
    type: "COUNSELLING_COMMISSION",
    requestId,
    description,
    adminId: adminId || undefined,
    session: extSession,
  };

  try {
    const result = await walletService.creditMainWallet(cId, amountStr, options);
    return {
      credited: true,
      amount: amountStr,
      walletKey: "MAIN",
      idempotent: result?.idempotent === true,
    };
  } catch (err) {
    console.error("[Counsellor Commission] creditCounsellorCommission error:", err);
    return { credited: false, reason: err.message || "Wallet credit failed" };
  }
}

module.exports = {
  creditCounsellorCommission,
  DESIGNATION_COUNSELLOR,
};
