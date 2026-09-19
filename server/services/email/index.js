/**
 * Email Service Module
 *
 * Purpose: Main entry point for email functionality
 *
 * Architecture:
 * - brevoClient.js: Low-level Brevo API HTTP client
 * - emailService.js: High-level email sending service
 * - templates.js: Email templates and subjects
 *
 * Usage:
 *   const emailService = require('./services/email');
 *
 *   // Send generic email
 *   await emailService.sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Welcome',
 *     html: '<h1>Welcome!</h1>'
 *   });
 *
 *   // Send donation thank you email
 *   await emailService.sendDonationThankYouEmail({
 *     donorName: 'John Doe',
 *     email: 'john@example.com',
 *     amount: 1000,
 *     paymentMode: 'UPI'
 *   });
 */

const emailService = require("./emailService");
const templates = require("./templates");
const brevoClient = require("./brevoClient");
const CommonSettings = require("../../models/CommonSettings");

/**
 * Send donation thank you email
 * @param {Object} donationRequest - Donation request data
 * @param {string} donationRequest.donorName - Donor name
 * @param {string} donationRequest.email - Donor email
 * @param {number} donationRequest.amount - Donation amount
 * @param {string} donationRequest.paymentMode - Payment mode (UPI/BANK/Card/Netbanking/Wallet)
 * @param {string} donationRequest.transactionId - Transaction/Order ID (optional)
 * @param {string} donationRequest.date - Donation date (optional)
 * @returns {Promise<Object>} Email sending result
 */
const sendDonationThankYouEmail = async (donationRequest) => {
  const { donorName, email, amount, paymentMode, transactionId, date } =
    donationRequest;

  if (!email) {
    return { success: false, error: "Donor email is required" };
  }

  // Fetch application settings for app name and abbreviation
  let appName = "";
  let appAbbreviation = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
    appAbbreviation = settings.abbreviation || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    // Continue with empty values if settings fetch fails
  }

  const html = templates.getDonationThankYouTemplate({
    donorName: donorName || "Valued Donor",
    amount,
    paymentMode: paymentMode || "UPI",
    transactionId,
    date,
    appName,
    appAbbreviation,
  });

  const subjects = templates.getSubjects(appName, appAbbreviation);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.DONATION_THANK_YOU,
    html: html,
  });
};

/**
 * Send donation rejection email
 * @param {Object} donationRequest - Donation request data
 * @param {string} donationRequest.donorName - Donor name
 * @param {string} donationRequest.email - Donor email
 * @param {number} donationRequest.amount - Donation amount
 * @param {string} donationRequest.paymentMode - Payment mode (UPI/BANK)
 * @param {string} donationRequest.rejectionReason - Reason for rejection
 * @param {string} donationRequest.date - Donation date (optional)
 * @returns {Promise<Object>} Email sending result
 */
const sendDonationRejectedEmail = async (donationRequest) => {
  const { donorName, email, amount, paymentMode, rejectionReason, date } =
    donationRequest;

  if (!email) {
    return { success: false, error: "Donor email is required" };
  }

  // Fetch application settings for app name and abbreviation
  let appName = "";
  let appAbbreviation = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
    appAbbreviation = settings.abbreviation || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    // Continue with empty values if settings fetch fails
  }

  const html = templates.getDonationRejectedTemplate({
    donorName: donorName || "Valued Donor",
    amount,
    paymentMode: paymentMode || "BANK",
    rejectionReason,
    date,
    appName,
    appAbbreviation,
  });

  const subjects = templates.getSubjects(appName, appAbbreviation);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.DONATION_REJECTED,
    html: html,
  });
};

/**
 * Send forgot password OTP email
 * @param {Object} otpRequest - OTP request data
 * @param {string} otpRequest.name - User name
 * @param {string} otpRequest.email - User email
 * @param {string} otpRequest.otp - 6-digit OTP
 * @param {number} otpRequest.expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<Object>} Email sending result
 */
const sendForgotPasswordOtpEmail = async (otpRequest) => {
  const { name, email, otp, expiryMinutes } = otpRequest;

  // Fetch application settings for app name and abbreviation
  let appName = "";
  let appAbbreviation = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
    appAbbreviation = settings.abbreviation || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    // Continue with empty values if settings fetch fails
  }

  const html = templates.getForgotPasswordOtpTemplate({
    name,
    otp,
    expiryMinutes,
    appName,
    appAbbreviation,
  });

  const subjects = templates.getSubjects(appName, appAbbreviation);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.FORGOT_PASSWORD_OTP,
    html: html,
  });
};

/**
 * Send welcome email for ACTIVE users (payment successful)
 * @param {Object} welcomeRequest - Welcome email request data
 * @param {string} welcomeRequest.name - User name
 * @param {string} welcomeRequest.email - User email
 * @param {string} welcomeRequest.memberId - User Member ID
 * @param {string} welcomeRequest.password - User password (plain text)
 * @returns {Promise<Object>} Email sending result
 */
const sendActiveUserWelcomeEmail = async (welcomeRequest) => {
  const { name, email, memberId, password } = welcomeRequest;

  if (!email) {
    return { success: false, error: "User email is required" };
  }

  // Fetch application settings for app name and abbreviation
  let appName = "";
  let appAbbreviation = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
    appAbbreviation = settings.abbreviation || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    // Continue with empty values if settings fetch fails
  }

  const html = templates.getActiveUserWelcomeTemplate({
    name: name || "User",
    memberId,
    password,
    appName,
    appAbbreviation,
  });

  const subjects = templates.getSubjects(appName, appAbbreviation);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.ACTIVE_USER_WELCOME,
    html: html,
  });
};

/**
 * Send welcome email for GUEST users (payment failed/incomplete)
 * @param {Object} welcomeRequest - Welcome email request data
 * @param {string} welcomeRequest.name - User name
 * @param {string} welcomeRequest.email - User email
 * @param {string} welcomeRequest.memberId - User Member ID
 * @param {string} welcomeRequest.password - User password (plain text)
 * @returns {Promise<Object>} Email sending result
 */
const sendGuestUserWelcomeEmail = async (welcomeRequest) => {
  const { name, email, memberId, password } = welcomeRequest;

  if (!email) {
    return { success: false, error: "User email is required" };
  }

  // Fetch application settings for app name and abbreviation
  let appName = "";
  let appAbbreviation = "";
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    appName = settings.name || "";
    appAbbreviation = settings.abbreviation || "";
  } catch (error) {
    console.error("Error fetching settings for email template:", error);
    // Continue with empty values if settings fetch fails
  }

  const html = templates.getGuestUserWelcomeTemplate({
    name: name || "User",
    memberId,
    password,
    appName,
    appAbbreviation,
  });

  const subjects = templates.getSubjects(appName, appAbbreviation);

  return await emailService.sendEmail({
    to: email,
    subject: subjects.GUEST_USER_WELCOME,
    html: html,
  });
};

module.exports = {
  // Core service
  sendEmail: emailService.sendEmail,

  // Pre-built email functions
  sendDonationThankYouEmail,
  sendDonationRejectedEmail,
  sendForgotPasswordOtpEmail,
  sendActiveUserWelcomeEmail,
  sendGuestUserWelcomeEmail,

  // Low-level client (for advanced use cases)
  verifyConnection: brevoClient.verifyConnection,
};
