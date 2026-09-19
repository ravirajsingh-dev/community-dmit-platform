const QRCode = require("qrcode");
const crypto = require("crypto");
const { validateUPI, validateAmount } = require("./inputValidation");

/**
 * Generate QR code with UPI payment details
 * @param {string} upi - UPI ID (e.g., "user@paytm")
 * @param {string} payeeName - Name of the payee
 * @param {number} amount - Amount to be paid
 * @param {object} options - Additional options
 * @param {string} options.transactionRef - Optional custom transaction reference
 * @param {string} options.token - Optional custom token
 * @returns {Promise<{qrCodeData: string, transactionRef: string, token: string, upiUrl: string}>}
 */
const generateQRCodeWithAmount = async (
  upi,
  payeeName,
  amount,
  options = {}
) => {
  try {
    // Validate UPI ID using strict validation
    const upiValidation = validateUPI(upi);
    if (!upiValidation.valid) {
      throw new Error(upiValidation.error);
    }
    const sanitizedUpi = upiValidation.sanitized;

    // Validate payee name
    if (
      !payeeName ||
      typeof payeeName !== "string" ||
      payeeName.trim() === ""
    ) {
      throw new Error("Payee name is required and must be a non-empty string");
    }
    
    // Sanitize payee name
    let sanitizedPayeeName = payeeName.trim();
    // Remove HTML/script tags
    sanitizedPayeeName = sanitizedPayeeName.replace(/<[^>]*>/g, '');
    // Remove MongoDB operators
    sanitizedPayeeName = sanitizedPayeeName.replace(/\$[a-zA-Z]+/g, '');

    // Validate amount using strict validation
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      throw new Error(amountValidation.error);
    }
    const sanitizedAmount = amountValidation.sanitized;

    // Generate transaction reference and token if not provided
    const transactionRef =
      options.transactionRef ||
      crypto.randomBytes(16).toString("hex").slice(0, 20);
    const token = options.token || crypto.randomBytes(16).toString("hex");

    // Format amount to 2 decimal places (already sanitized)
    const formattedAmount = parseFloat(sanitizedAmount.toFixed(2));

    // Build UPI URL
    const upiUrl = `upi://pay?pa=${encodeURIComponent(
      sanitizedUpi
    )}&pn=${encodeURIComponent(
      sanitizedPayeeName
    )}&tr=${transactionRef}&am=${formattedAmount}&cu=INR&tn=${token}`;

    // Generate QR code as a base64 string with error correction level
    const qrCodeData = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
    });

    return {
      qrCodeData,
      transactionRef,
      token,
      upiUrl,
      amount: formattedAmount,
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

module.exports = {
  generateQRCodeWithAmount,
};
