const { validationResult } = require("express-validator");
const CommonSettings = require("../../../models/CommonSettings");
const { generateQRCodeWithAmount } = require("../../../utils/qrCodeUtils");
const response = require("../../../config/response");
const { logSecurityEvent, EVENT_TYPES } = require("../../../utils/auditLogger");

/**
 * Generate UPI QR code for given amount.
 * UPI details are read from Application Settings (CommonSettings) - single source of truth.
 * Reusable for donation and any other feature (e.g. events, membership).
 *
 * @route POST /api/common/qr/generate
 * @body { number } amount - Amount (required, min 1)
 * @access Public
 */
const generateQR = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400
      );
    }

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount < 1) {
      return response.errorResponse(
        res,
        [{ msg: "Amount must be at least 1" }],
        "Validation Error",
        400
      );
    }

    const settings = await CommonSettings.getOrCreateSettings();

    if (!settings.upi?.upiId || !settings.upi?.upiHolderName) {
      return response.errorResponse(
        res,
        [{ msg: "UPI details not configured. Please set UPI ID and holder name in Application Settings." }],
        "Service configuration error",
        400
      );
    }

    const qrData = await generateQRCodeWithAmount(
      settings.upi.upiId,
      settings.upi.upiHolderName,
      amount
    );

    logSecurityEvent({
      eventType: EVENT_TYPES.QR_CODE_GENERATED,
      status: "success",
      req,
      details: { amount: qrData.amount, transactionRef: qrData.transactionRef },
    });

    return response.successResponse(
      res,
      {
        qrCodeData: qrData.qrCodeData,
        amount: qrData.amount,
      },
      "QR code generated successfully"
    );
  } catch (err) {
    console.error("Error generating QR code:", err);
    return response.errorResponse(
      res,
      [],
      err.message || "An error occurred",
      500
    );
  }
};

module.exports = {
  generateQR,
};
