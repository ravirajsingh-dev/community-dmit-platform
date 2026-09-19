const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const DonationButton = require("../../../models/DonationButton");
const DonationRequest = require("../../../models/DonationRequest");
const CommonSettings = require("../../../models/CommonSettings");
const PaymentHistory = require("../../../models/PaymentHistory");
const User = require("../../../models/User");
const emailService = require("../../../services/email");
const response = require("../../../config/response");
const { logSecurityEvent, EVENT_TYPES } = require("../../../utils/auditLogger");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
  sanitizeValidationErrors,
} = require("../../../utils/errorSanitizer");
/**
 * @route GET /api/common/donation/top
 * @desc Get top donations (sorted by amount, highest first) from approved DonationRequest
 * @access Public
 */
const getTopDonations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20; // Default to 20, can be overridden

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return response.errorResponse(
        res,
        [{ msg: "Limit must be between 1 and 1000" }],
        "Invalid limit",
        400,
      );
    }

    // Fetch from DonationRequest: ONLY approved requests
    const approvedRequests = await DonationRequest.find({ status: "approved" })
      .sort({ amount: -1 }) // Highest amount first
      .limit(limit)
      .select("donorName amount createdAt")
      .lean();

    const transformedDonations = approvedRequests.map((donation) => ({
      _id: donation._id,
      donorName: donation.donorName || "Guest User",
      amount: donation.amount,
      createdAt: donation.createdAt,
    }));

    return response.successResponse(
      res,
      {
        donations: transformedDonations,
        limit,
        total: transformedDonations.length,
      },
      "Top donations retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching top donations:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/common/donation/buttons
 * @desc Get active donation buttons
 * @access Public
 */
const getActiveDonationButtons = async (req, res) => {
  try {
    const buttons = await DonationButton.find({ isActive: true })
      .sort({ amount: 1 })
      .lean();

    return response.successResponse(
      res,
      buttons,
      "Donation buttons retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation buttons:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route GET /api/common/donation/settings
 * @desc Get donation section visibility settings
 * @access Public
 */
const getDonationSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    const donationSettings = {
      donationEnabled: settings.donationEnabled || false,
      donationMessage: settings.donationMessage || "",
      upi: {
        upiId: settings.upi?.upiId || "",
        upiHolderName: settings.upi?.upiHolderName || "",
      },
      bank: {
        bankName: settings.bank?.bankName || "",
        accountNo: settings.bank?.accountNo || "",
        accountHolderName: settings.bank?.accountHolderName || "",
        ifscCode: settings.bank?.ifscCode || "",
      },
    };

    return response.successResponse(
      res,
      donationSettings,
      "Donation settings retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation settings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 *
 * @route POST /api/common/donation/request
 * @desc Submit donation request (legacy - for bank transfers, kept for backward compatibility)
 * @access Public
 */
const submitDonationRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const { donorName, phone, email, address, amount, utrNumber, paymentMode } =
      req.body;

    // Check if UTR number already exists
    const existingRequest = await DonationRequest.findOne({ utrNumber });
    if (existingRequest) {
      return response.errorResponse(
        res,
        [{ path: "utrNumber", msg: "Duplicate field error" }],
        "Duplicate field error",
        400,
      );
    }

    const donationRequest = new DonationRequest({
      donorName,
      phone,
      email,
      address: address || "",
      amount,
      utrNumber,
      paymentMode,
      status: "pending",
    });

    await donationRequest.save();

    // Log payment verification request
    logSecurityEvent({
      eventType: EVENT_TYPES.PAYMENT_VERIFICATION,
      status: "success",
      req,
      details: {
        donationRequestId: donationRequest._id.toString(),
        amount,
        paymentMode,
        utrNumber: utrNumber ? "provided" : "not_provided", // Don't log full UTR for security
      },
    });

    return response.successResponse(
      res,
      { id: donationRequest._id },
      "Your donation request has been submitted for admin approval",
      201,
    );
  } catch (err) {
    console.error("Error submitting donation request:", err);
    if (err.code === 11000) {
      // Duplicate key error (UTR number)
      const sanitizedError = sanitizeDuplicateKeyError(err, "utrNumber");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Duplicate field error",
        400,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/buttons
 * @desc Get all donation buttons (admin)
 * @access Private (Admin)
 */
const getAllDonationButtons = async (req, res) => {
  try {
    const buttons = await DonationButton.find().sort({ amount: 1 }).lean();

    return response.successResponse(
      res,
      buttons,
      "Donation buttons retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation buttons:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route POST /api/admin/donation/buttons
 * @desc Create donation button (admin)
 * @access Private (Admin)
 */
const createDonationButton = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const { amount, type, buttonText, isActive } = req.body;
    const buttonType = type || "FIXED";

    // If type is ANY, check if one already exists
    if (buttonType === "ANY") {
      const existingAnyButton = await DonationButton.findOne({ type: "ANY" });
      if (existingAnyButton) {
        return response.errorResponse(
          res,
          [
            {
              path: "type",
              msg: "Only one 'ANY' type donation button is allowed",
            },
          ],
          "Only one 'ANY' type donation button is allowed",
          400,
        );
      }
    }

    const donationButton = new DonationButton({
      amount: buttonType === "ANY" ? 0 : amount,
      type: buttonType,
      buttonText:
        buttonType === "ANY"
          ? buttonText || "Donate Any Other Amount"
          : buttonText || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await donationButton.save();

    return response.successResponse(
      res,
      donationButton,
      "Donation button created successfully",
      201,
    );
  } catch (err) {
    console.error("Error creating donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/buttons/:id
 * @desc Update donation button (admin)
 * @access Private (Admin)
 */
const updateDonationButton = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    const { amount, type, buttonText, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationButton = await DonationButton.findById(id);
    if (!donationButton) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    // If changing to ANY type, check if another ANY button exists
    if (type !== undefined && type === "ANY" && donationButton.type !== "ANY") {
      const existingAnyButton = await DonationButton.findOne({
        type: "ANY",
        _id: { $ne: id },
      });
      if (existingAnyButton) {
        return response.errorResponse(
          res,
          [
            {
              path: "type",
              msg: "Only one 'ANY' type donation button is allowed",
            },
          ],
          "Only one 'ANY' type donation button is allowed",
          400,
        );
      }
    }

    if (type !== undefined) donationButton.type = type;
    const buttonType = type !== undefined ? type : donationButton.type;

    if (buttonType === "FIXED") {
      if (amount !== undefined) donationButton.amount = amount;
      if (buttonText !== undefined)
        donationButton.buttonText = buttonText || null;
    } else {
      // For ANY type, set amount to 0
      donationButton.amount = 0;
      if (buttonText !== undefined)
        donationButton.buttonText = buttonText || "Donate Any Other Amount";
    }

    if (isActive !== undefined) donationButton.isActive = isActive;

    await donationButton.save();

    return response.successResponse(
      res,
      donationButton,
      "Donation button updated successfully",
    );
  } catch (err) {
    console.error("Error updating donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route DELETE /api/admin/donation/buttons/:id
 * @desc Delete donation button (admin)
 * @access Private (Admin)
 */
const deleteDonationButton = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationButton = await DonationButton.findById(id);
    if (!donationButton) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    await DonationButton.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Donation button deleted successfully",
    );
  } catch (err) {
    console.error("Error deleting donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/requests
 * @desc Get all donation requests with filters (admin)
 * @desc Now fetches from PaymentHistory for gateway donations + DonationRequest for bank transfers
 * @access Private (Admin)
 */
const getAllDonationRequests = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      phone,
      email,
      amount,
      donorType,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Build query for PaymentHistory (gateway donations)
    const paymentHistoryQuery = { paymentType: "Donation" };

    if (status) {
      // Map status: pending -> pending, approved -> success, rejected -> failed
      if (status === "approved") {
        paymentHistoryQuery.status = "success";
      } else if (status === "rejected") {
        paymentHistoryQuery.status = "failed";
      } else {
        paymentHistoryQuery.status = status;
      }
    }

    if (phone) {
      paymentHistoryQuery.$or = [
        { donorPhone: { $regex: phone, $options: "i" } },
        { "userId.phone": { $regex: phone, $options: "i" } },
      ];
    }

    if (email) {
      paymentHistoryQuery.$or = [
        ...(paymentHistoryQuery.$or || []),
        { donorEmail: { $regex: email, $options: "i" } },
        { "userId.email": { $regex: email, $options: "i" } },
      ];
    }

    if (donorType === "registered") {
      paymentHistoryQuery.userId = { $ne: null };
    } else if (donorType === "guest") {
      paymentHistoryQuery.userId = null;
    }

    if (amount) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        paymentHistoryQuery.amount = amountNum;
      }
    }

    if (search) {
      paymentHistoryQuery.$or = [
        ...(paymentHistoryQuery.$or || []),
        { orderId: { $regex: search, $options: "i" } },
        { paymentId: { $regex: search, $options: "i" } },
        { donorEmail: { $regex: search, $options: "i" } },
        { donorName: { $regex: search, $options: "i" } },
      ];
    }

    if (fromDate || toDate) {
      paymentHistoryQuery.createdAt = {};
      if (fromDate) {
        paymentHistoryQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        paymentHistoryQuery.createdAt.$lte = toDateEnd;
      }
    }

    // Build query for DonationRequest (bank transfers - legacy)
    const donationRequestQuery = {};

    if (status) {
      donationRequestQuery.status = status;
    }

    if (phone) {
      donationRequestQuery.phone = { $regex: phone, $options: "i" };
    }

    if (email) {
      donationRequestQuery.email = { $regex: email, $options: "i" };
    }

    if (amount) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        donationRequestQuery.amount = amountNum;
      }
    }

    if (search) {
      donationRequestQuery.$or = [
        { utrNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { donorName: { $regex: search, $options: "i" } },
      ];
    }

    if (fromDate || toDate) {
      donationRequestQuery.createdAt = {};
      if (fromDate) {
        donationRequestQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        donationRequestQuery.createdAt.$lte = toDateEnd;
      }
    }

    // Fetch all gateway donations from PaymentHistory (no pagination yet)
    const gatewayDonations = await PaymentHistory.find(paymentHistoryQuery)
      .populate("userId", "name email phone memberId")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch all bank transfer donations from DonationRequest (no pagination yet)
    const bankDonations = await DonationRequest.find(donationRequestQuery)
      .sort({ createdAt: -1 })
      .lean();

    // Transform gateway donations to match expected format
    const transformedGatewayDonations = gatewayDonations.map((payment) => ({
      _id: payment._id,
      donorName:
        payment.donorName ||
        payment.userName ||
        payment.userId?.name ||
        "Guest User",
      phone: payment.donorPhone || payment.userId?.phone || "-",
      email: payment.donorEmail || payment.userId?.email || "-",
      amount: payment.amount,
      paymentMode: payment.method || "UPI",
      status:
        payment.status === "success"
          ? "approved"
          : payment.status === "failed"
            ? "rejected"
            : payment.status,
      orderId: payment.orderId,
      transactionId: payment.paymentId || payment.orderId,
      donorType: payment.userId ? "registered" : "guest",
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      isGatewayPayment: true,
    }));

    // Transform bank donations to match expected format
    const transformedBankDonations = bankDonations.map((request) => ({
      _id: request._id,
      donorName: request.donorName,
      phone: request.phone,
      email: request.email,
      amount: request.amount,
      paymentMode: request.paymentMode,
      utrNumber: request.utrNumber,
      status: request.status,
      rejectionReason: request.rejectionReason || "",
      donorType: "guest", // Bank transfers are always guest
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      isGatewayPayment: false,
    }));

    // Combine and sort by date (newest first)
    const allDonations = [
      ...transformedGatewayDonations,
      ...transformedBankDonations,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination to combined results
    const totalDonations = allDonations.length;
    const paginatedDonations = allDonations.slice(
      skip,
      skip + parseInt(limit, 10),
    );

    return response.successResponse(
      res,
      {
        data: paginatedDonations,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: totalDonations,
          pages: Math.ceil(totalDonations / parseInt(limit, 10)),
        },
      },
      "Donation requests retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation requests:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/requests/:id
 * @desc Get single donation request (admin)
 * @access Private (Admin)
 */
const getDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationRequest = await DonationRequest.findById(id).lean();

    if (!donationRequest) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    return response.successResponse(
      res,
      donationRequest,
      "Donation request retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/requests/:id/approve
 * @desc Approve donation request (admin) - Legacy endpoint for bank transfers only
 * @desc Gateway donations are auto-approved via payment gateway, no manual approval needed
 * @access Private (Admin)
 */
const approveDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    // Only allow approval for bank transfer donations (DonationRequest model)
    // Gateway donations are handled automatically via payment gateway
    const donationRequest = await DonationRequest.findById(id);

    if (!donationRequest) {
      return response.errorResponse(
        res,
        {},
        "Donation request not found. Gateway donations are automatically processed and do not require manual approval.",
        404,
      );
    }

    if (donationRequest.status === "approved") {
      return response.errorResponse(
        res,
        {},
        "Donation request is already approved",
        400,
      );
    }

    donationRequest.status = "approved";
    await donationRequest.save();

    // Send thank you email to donor
    const emailResult = await emailService.sendDonationThankYouEmail({
      donorName: donationRequest.donorName,
      email: donationRequest.email,
      amount: donationRequest.amount,
      paymentMode: donationRequest.paymentMode,
      date: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });
    if (!emailResult.success) {
      console.error(
        "Failed to send donation thank you email:",
        emailResult.error,
      );
    }

    return response.successResponse(
      res,
      donationRequest,
      "Donation request approved successfully",
    );
  } catch (err) {
    console.error("Error approving donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/requests/:id/reject
 * @desc Reject donation request (admin) - Legacy endpoint for bank transfers only
 * @desc Gateway donations are auto-processed via payment gateway
 * @access Private (Admin)
 */
const rejectDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    // Only allow rejection for bank transfer donations (DonationRequest model)
    const donationRequest = await DonationRequest.findById(id);

    if (!donationRequest) {
      return response.errorResponse(
        res,
        {},
        "Donation request not found. Gateway donations are automatically processed and cannot be manually rejected.",
        404,
      );
    }

    if (donationRequest.status === "rejected") {
      return response.errorResponse(
        res,
        {},
        "Donation request is already rejected",
        400,
      );
    }

    const rejectionReason =
      typeof reason === "string" && reason.trim().length > 0
        ? reason.trim().slice(0, 500)
        : "Your bank transfer details could not be verified.";

    donationRequest.status = "rejected";
    donationRequest.rejectionReason = rejectionReason;

    await donationRequest.save();

    // Send rejection email with reason
    const emailResult = await emailService.sendDonationRejectedEmail({
      donorName: donationRequest.donorName,
      email: donationRequest.email,
      amount: donationRequest.amount,
      paymentMode: donationRequest.paymentMode,
      rejectionReason,
      date: new Date(donationRequest.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });
    if (!emailResult.success) {
      console.error(
        "Failed to send donation rejection email:",
        emailResult.error,
      );
    }

    return response.successResponse(
      res,
      donationRequest,
      "Donation request rejected successfully",
    );
  } catch (err) {
    console.error("Error rejecting donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  // Public routes
  getActiveDonationButtons,
  getDonationSettings,
  getTopDonations,
  submitDonationRequest,
  // Admin routes
  getAllDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
  getAllDonationRequests,
  getDonationRequest,
  approveDonationRequest,
  rejectDonationRequest,
};
