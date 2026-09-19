const config = require("../../config/config");

/**
 * Email Templates
 *
 * Purpose: Centralized email templates and subjects
 *
 * Benefits:
 * - Single source of truth for email content
 * - Easy to update templates
 * - Consistent branding
 */

/**
 * Get donation thank you email HTML template
 * @param {Object} data - Template data
 * @param {string} data.donorName - Donor name
 * @param {number} data.amount - Donation amount
 * @param {string} data.paymentMode - Payment mode (UPI/BANK/Card/Netbanking/Wallet)
 * @param {string} data.transactionId - Transaction/Order ID (optional)
 * @param {string} data.date - Donation date (optional)
 * @param {string} data.appName - Application name from settings (optional)
 * @param {string} data.appAbbreviation - Application abbreviation from settings (optional)
 * @returns {string} HTML email content
 */
const getDonationThankYouTemplate = ({
  donorName,
  amount,
  paymentMode,
  transactionId,
  date,
  appName,
  appAbbreviation,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Your Donation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #27ae60;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .donation-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .donation-details h3 {
          color: #2c3e50;
          margin-top: 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
        }
        .detail-value {
          color: #333;
        }
        .amount {
          font-size: 24px;
          font-weight: bold;
          color: #27ae60;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 14px;
        }
        .thank-you-message {
          font-size: 18px;
          color: #27ae60;
          margin: 20px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Uniting Communities, Empowering Lives</p>
        </div>
        
        <div class="content">
          <p>Dear ${donorName},</p>
          
          <p>We are deeply grateful for your generous donation${appName ? ` to ${appName}` : ""}. Your contribution helps us in our mission to unite communities, support education, sports, cultural activities, and empower initiatives like GauShala, old age homes, and women empowerment programs.</p>
          
          <div class="thank-you-message">
            🙏 Thank You for Making a Difference! 🙏
          </div>
          
          <div class="donation-details">
            <h3>Your Donation Details</h3>
            <div class="detail-row">
              <span class="detail-label">Donor Name:</span>
              <span class="detail-value">${donorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value amount">₹${amount.toLocaleString(
                "en-IN",
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Mode:</span>
              <span class="detail-value">${paymentMode || "UPI"}</span>
            </div>
            ${
              transactionId
                ? `
            <div class="detail-row">
              <span class="detail-label">Transaction ID:</span>
              <span class="detail-value">${transactionId}</span>
            </div>
            `
                : ""
            }
            ${
              date
                ? `
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${date}</span>
            </div>
            `
                : ""
            }
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #27ae60; font-weight: bold;">Success</span>
            </div>
          </div>
          
          <p>Your donation has been successfully processed and will be used to support our community initiatives including GauShala, old age homes, women empowerment programs, education, sports, and cultural activities. Every contribution, big or small, makes a significant impact in strengthening our communities.</p>
          
          <p>We truly appreciate your support and compassion. Together, we can create a thriving ecosystem where communities connect, grow, and support each other.</p>
          
          <p>With heartfelt gratitude,<br><strong>The ${appName || ""} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get donation rejection email HTML template
 * @param {Object} data - Template data
 * @param {string} data.donorName - Donor name
 * @param {number} data.amount - Donation amount
 * @param {string} data.paymentMode - Payment mode (UPI/BANK)
 * @param {string} data.rejectionReason - Reason for rejection
 * @param {string} data.date - Donation date (optional)
 * @param {string} data.appName - Application name from settings (optional)
 * @param {string} data.appAbbreviation - Application abbreviation from settings (optional)
 * @returns {string} HTML email content
 */
const getDonationRejectedTemplate = ({
  donorName,
  amount,
  paymentMode,
  rejectionReason,
  date,
  appName,
  appAbbreviation,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Verification Update</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #c0392b;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .donation-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .donation-details h3 {
          color: #2c3e50;
          margin-top: 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
        }
        .detail-value {
          color: #333;
        }
        .amount {
          font-size: 20px;
          font-weight: bold;
          color: #c0392b;
        }
        .reason-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Donation Verification Update</p>
        </div>
        
        <div class="content">
          <p>Dear ${donorName},</p>
          
          <p>Thank you for submitting your bank transfer donation request${
            appName ? ` to ${appName}` : ""
          }. After manual verification by our admin team, we were unable to confirm this transaction.</p>

          <div class="donation-details">
            <h3>Your Donation Request</h3>
            <div class="detail-row">
              <span class="detail-label">Donor Name:</span>
              <span class="detail-value">${donorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value amount">₹${amount.toLocaleString(
                "en-IN",
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Mode:</span>
              <span class="detail-value">${paymentMode || "BANK"}</span>
            </div>
            ${
              date
                ? `
            <div class="detail-row">
              <span class="detail-label">Request Date:</span>
              <span class="detail-value">${date}</span>
            </div>
            `
                : ""
            }
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #c0392b; font-weight: bold;">Rejected</span>
            </div>
          </div>

          <div class="reason-box">
            <strong>Reason for Rejection:</strong>
            <p style="margin-top: 8px;">${
              rejectionReason ||
              "Your bank transfer details could not be verified against our records."
            }</p>
          </div>

          <p>
            For your security, the transaction reference / order ID you provided
            has been removed from our systems and will not be stored further.
          </p>

          <p>
            If you believe this decision was made in error, please contact our team
            with the correct transaction details and screenshot from your bank/UPI app
            so that we can re-verify your donation.
          </p>

          <p>
            We truly appreciate your intention to support our initiatives and hope to
            receive your contribution again.
          </p>

          <p>With regards,<br><strong>The ${appName || ""} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${
            appName
              ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>`
              : ""
          }
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get forgot password OTP email HTML template
 * @param {Object} data - Template data
 * @param {string} data.name - User name
 * @param {string} data.otp - 6-digit OTP
 * @param {number} data.expiryMinutes - OTP expiry time in minutes
 * @param {string} data.appName - Application name from settings (optional)
 * @param {string} data.appAbbreviation - Application abbreviation from settings (optional)
 * @returns {string} HTML email content
 */
const getForgotPasswordOtpTemplate = ({
  name,
  otp,
  expiryMinutes,
  appName,
  appAbbreviation,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #27ae60;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .otp-box {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #007bff;
          letter-spacing: 8px;
          margin: 15px 0;
          font-family: 'Courier New', monospace;
        }
        .expiry-notice {
          color: #dc3545;
          font-weight: bold;
          margin-top: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 12px;
        }
        .security-notice {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Uniting Communities, Empowering Lives</p>
        </div>
        
        <div class="content">
          <p>Hello ${name || "User"},</p>
          
          <p>You have requested to reset your password. Please use the following OTP to verify your identity:</p>
          
          <div class="otp-box">
            <p style="margin-top: 0; color: #555;">Your Password Reset OTP:</p>
            <div class="otp-code">${otp}</div>
            <p class="expiry-notice">This OTP will expire in ${expiryMinutes} minutes.</p>
          </div>
          
          <div class="security-notice">
            <p style="margin: 0;"><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your account remains secure.</p>
          </div>
          
          <p>Please do not share this OTP with anyone. Our team will never ask for your OTP or password.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get welcome email HTML template for ACTIVE users (payment successful)
 * @param {Object} data - Template data
 * @param {string} data.name - User name
 * @param {string} data.memberId - User Member ID
 * @param {string} data.password - User password
 * @param {string} data.appName - Application name from settings (optional)
 * @param {string} data.appAbbreviation - Application abbreviation from settings (optional)
 * @returns {string} HTML email content
 */
const getActiveUserWelcomeTemplate = ({
  name,
  memberId,
  password,
  appName,
  appAbbreviation,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome - Registration Successful</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #27ae60;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .credentials-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #27ae60;
        }
        .credentials-box h3 {
          color: #2c3e50;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .credential-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .credential-row:last-child {
          border-bottom: none;
        }
        .credential-label {
          font-weight: bold;
          color: #555;
        }
        .credential-value {
          color: #333;
          font-family: 'Courier New', monospace;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          background-color: #27ae60;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 14px;
        }
        .success-message {
          font-size: 18px;
          color: #27ae60;
          margin: 20px 0;
          text-align: center;
          font-weight: bold;
        }
        .security-notice {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Uniting Communities, Empowering Lives</p>
        </div>
        
        <div class="content">
          <p>Dear ${name},</p>
          
          <div class="success-message">
            🎉 Welcome! Your Registration is Complete 🎉
          </div>
          
          <p>Congratulations! Your payment has been successfully processed and your account has been activated. You are now an <strong>ACTIVE</strong> member of our community platform.</p>
          
          <div class="credentials-box">
            <h3>Your Login Credentials</h3>
            <div class="credential-row">
              <span class="credential-label">Member ID:</span>
              <span class="credential-value">${memberId}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${password}</span>
            </div>
            <div class="status-badge">Status: ACTIVE</div>
          </div>
          
          <p>You can now log in to your account using the credentials above and start exploring all the features of our community platform.</p>
          
          <div class="security-notice">
            <p style="margin: 0;"><strong>Security Notice:</strong> Please keep your login credentials secure and do not share them with anyone. We recommend changing your password after your first login.</p>
          </div>
          
          <p>Thank you for joining our community! Together, we can unite communities, support education, sports, culture, and make a meaningful impact through donations and social initiatives.</p>
          
          <p>With warm regards,<br><strong>The ${appName || ""} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get welcome email HTML template for GUEST users (payment failed/incomplete)
 * @param {Object} data - Template data
 * @param {string} data.name - User name
 * @param {string} data.memberId - User Member ID
 * @param {string} data.password - User password
 * @param {string} data.appName - Application name from settings (optional)
 * @param {string} data.appAbbreviation - Application abbreviation from settings (optional)
 * @returns {string} HTML email content
 */
const getGuestUserWelcomeTemplate = ({
  name,
  memberId,
  password,
  appName,
  appAbbreviation,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome - Complete Your Registration</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #e67e22;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .credentials-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #e67e22;
        }
        .credentials-box h3 {
          color: #2c3e50;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .credential-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .credential-row:last-child {
          border-bottom: none;
        }
        .credential-label {
          font-weight: bold;
          color: #555;
        }
        .credential-value {
          color: #333;
          font-family: 'Courier New', monospace;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          background-color: #e67e22;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 10px;
        }
        .payment-notice {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #777;
          font-size: 14px;
        }
        .welcome-message {
          font-size: 18px;
          color: #2c3e50;
          margin: 20px 0;
          text-align: center;
          font-weight: bold;
        }
        .security-notice {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName || ""}</h1>
          <p>Uniting Communities, Empowering Lives</p>
        </div>
        
        <div class="content">
          <p>Dear ${name},</p>
          
          <div class="welcome-message">
            Welcome to Our Community Platform!
          </div>
          
          <p>Thank you for registering with us! Your account has been created successfully. However, we noticed that your payment is incomplete or was not successful.</p>
          
          <div class="credentials-box">
            <h3>Your Login Credentials</h3>
            <div class="credential-row">
              <span class="credential-label">Member ID:</span>
              <span class="credential-value">${memberId}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${password}</span>
            </div>
            <div class="status-badge">Status: GUEST</div>
          </div>
          
          <div class="payment-notice">
            <p style="margin: 0;"><strong>Payment Status:</strong> Your payment is incomplete. To activate your account and access all features, please complete the payment process. You can log in with your credentials above and complete the payment from your dashboard.</p>
          </div>
          
          <p>Once you complete the payment, your account will be upgraded to <strong>ACTIVE</strong> status, and you'll have full access to all platform features.</p>
          
          <div class="security-notice">
            <p style="margin: 0;"><strong>Note:</strong> Please keep your login credentials secure. You can use these credentials to log in and complete your registration.</p>
          </div>
          
          <p>We look forward to having you as an active member of our community!</p>
          
          <p>With warm regards,<br><strong>The ${appName || ""} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>For any queries, please contact us at: ${
            config.MAIL_FROM_ADDRESS
          }</p>
          ${appName ? `<p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get counselling issue reported email HTML template (for counsellor & admin)
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient name (counsellor or admin)
 * @param {string} data.requesterName - User who reported the issue
 * @param {string} data.requesterMemberId - User member ID
 * @param {string} data.issueDescription - Issue description (optional)
 * @param {string} data.appName - Application name (optional)
 * @returns {string} HTML email content
 */
const getCounsellingIssueReportedTemplate = ({
  recipientName,
  requesterName,
  requesterMemberId,
  issueDescription,
  appName,
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Counselling Issue Reported</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 style="color: #dc3545;">⚠️ Counselling Issue Reported</h2>
        <p>Hello ${recipientName || "Team"},</p>
        <p>A user has reported an issue with their counselling session. Please take action.</p>
        <div class="alert-box">
          <strong>User:</strong> ${requesterName || "-"} (${requesterMemberId || "-"})<br>
          ${issueDescription ? `<strong>Issue:</strong> ${issueDescription}` : ""}
        </div>
        <p>Log in to the app to resolve the issue. Counsellor can mark as resolved after addressing the concern; Admin can close with or without commission.</p>
        <div class="footer">
          <p>${appName ? `© ${new Date().getFullYear()} ${appName}` : ""}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get email subjects
 * @param {string} appName - Application name from settings (optional)
 * @param {string} appAbbreviation - Application abbreviation from settings (optional)
 * @returns {Object} Email subjects
 */
const getSubjects = (appName, appAbbreviation) => ({
  DONATION_THANK_YOU: `Thank You for Your Generous Donation${appName ? ` - ${appName}` : ""}`,
  DONATION_REJECTED: `Your Donation Verification Status${appName ? ` - ${appName}` : ""}`,
  FORGOT_PASSWORD_OTP: `Password Reset OTP${appName ? ` - ${appName}` : ""}`,
  ACTIVE_USER_WELCOME: `Welcome! Your Registration is Complete${appName ? ` - ${appName}` : ""}`,
  GUEST_USER_WELCOME: `Welcome! Complete Your Registration${appName ? ` - ${appName}` : ""}`,
  COUNSELLING_ISSUE_REPORTED: `Counselling Issue Reported${appName ? ` - ${appName}` : ""}`,
});

module.exports = {
  getDonationThankYouTemplate,
  getDonationRejectedTemplate,
  getForgotPasswordOtpTemplate,
  getActiveUserWelcomeTemplate,
  getGuestUserWelcomeTemplate,
  getCounsellingIssueReportedTemplate,
  getSubjects,
};
