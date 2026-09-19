/**
 * SBI PRO Commission Service - Phase 4
 * Credits Trainer wallet when SBI PRO session becomes CLOSED (Report upload / Mark Done).
 * Commission = registrationFee × designation.commissionPercent / 100
 * Idempotent via requestId: sbi-pro:commission:<appointmentId>
 */

const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const WalletSettings = require("../models/WalletSettings");
const walletService = require("./walletService");
const { buildTransactionDescription, formatAmountForDescription } = require("../utils/transactionDescriptionEngine");

const DESIGNATION_SBI_PRO = 1;

/**
 * Resolve member name and identifier for SBI PRO appointment (client/beneficiary).
 * SELF: requester's name and memberId; OTHER: beneficiaryName and beneficiaryPhone.
 * @returns {{ memberName: string, memberIdentifier: string } | null}
 */
async function resolveAppointmentMemberInfo(appointmentId) {
  const apt = await Appointment.findById(appointmentId)
    .populate("requesterId", "name memberId phone")
    .lean();
  if (!apt) return null;

  const beneficiaryType = apt.beneficiaryType || "SELF";
  if (beneficiaryType === "OTHER") {
    const name = (apt.beneficiaryName || "N/A").trim();
    const identifier = (apt.beneficiaryPhone || apt.beneficiaryRef || "N/A").trim();
    if (!name || !identifier) return null;
    return { memberName: name, memberIdentifier: identifier };
  }

  const requester = apt.requesterId;
  if (!requester) return null;
  const memberName = (requester.name || "N/A").trim();
  const memberIdentifier = (requester.memberId || requester.phone || "N/A").trim();
  if (!memberName || !memberIdentifier) return null;
  return { memberName, memberIdentifier };
}

/**
 * Credit trainer commission when SBI PRO session is CLOSED.
 * Called from uploadReport and markAnalysisDone in sbiProSessionService.
 *
 * @param {ObjectId|string} appointmentId - Appointment ID
 * @param {ObjectId|string} trainerId - Assigned trainer (holder) user ID
 * @param {ObjectId|string} [adminId] - Admin who triggered (upload/mark done)
 * @returns {{ credited: boolean, amount?: string, reason?: string, idempotent?: boolean }}
 */
async function creditTrainerCommission(appointmentId, trainerId, adminId = null) {
  const aptId = mongoose.Types.ObjectId.isValid(appointmentId)
    ? new mongoose.Types.ObjectId(appointmentId)
    : null;
  const trId = mongoose.Types.ObjectId.isValid(trainerId)
    ? new mongoose.Types.ObjectId(trainerId)
    : null;

  if (!aptId || !trId) {
    return { credited: false, reason: "Invalid appointmentId or trainerId" };
  }

  const settings = await WalletSettings.getOrCreateSettings();
  const registrationFee = Number(settings?.registrationFee) || 0;
  const designations = settings?.designations || [];
  const desConfig = designations.find((d) => d.designationCode === DESIGNATION_SBI_PRO);

  if (!desConfig) {
    return { credited: false, reason: "Designation 1 (SBI PRO) not configured" };
  }

  const commissionPercent = Number(desConfig.commissionPercent) || 0;
  const commissionAmount = (registrationFee * commissionPercent) / 100;

  if (commissionAmount <= 0) {
    return { credited: false, reason: "No commission (registrationFee or commissionPercent is 0)" };
  }

  const amountStr = commissionAmount.toFixed(2);
  const requestId = `sbi-pro:commission:${aptId.toString()}`;

  const memberInfo = await resolveAppointmentMemberInfo(aptId);
  const memberName = memberInfo?.memberName ?? "Unknown";
  const memberIdentifier = memberInfo?.memberIdentifier ?? aptId.toString();

  const description = buildTransactionDescription("SBI_PRO_INCOME", {
    amount: formatAmountForDescription(amountStr),
    memberName,
    memberIdentifier,
  });

  const options = {
    type: "SBI_PRO_COMMISSION",
    requestId,
    description,
    adminId: adminId || undefined,
  };

  try {
    // Designation commission always credits to MAIN wallet (no separate designation wallet)
    const result = await walletService.creditMainWallet(trId, amountStr, options);
    return {
      credited: true,
      amount: amountStr,
      walletKey: "MAIN",
      idempotent: result?.idempotent === true,
    };
  } catch (err) {
    console.error("[SBI PRO Commission] creditTrainerCommission error:", err);
    return { credited: false, reason: err.message || "Wallet credit failed" };
  }
}

module.exports = {
  creditTrainerCommission,
  DESIGNATION_SBI_PRO,
};
