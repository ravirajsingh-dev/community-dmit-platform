# Donation Section – Deep Analysis Report

**Project:** Godjee  
**Scope:** Client (Public) Donation UI, Modals, Redux, API, Server, Admin  
**Date:** March 17, 2025  

---

## 1. Executive Summary

The Donation section allows visitors to support the mission via **UPI** (currently disabled at gateway level) and **Bank Transfer** (legacy flow). It includes configurable amount buttons, a donation modal, top-donations marquee, and admin management for buttons, settings, and donation requests. **UPI payment gateway is intentionally disabled**; only Bank Transfer (with UTR) is functional end-to-end.

---

## 2. Architecture Overview

| Layer | Components / Files |
|-------|--------------------|
| **Client (Public)** | `Donation.jsx`, `DonationModal.jsx`, `TopDonations.jsx` |
| **Client State** | `donationActions.js`, `donationReducer.js` |
| **Styles** | `donation.scss`, `topDonations.scss` |
| **Server (Public API)** | `DonationController.js` (common routes), `commonRoutes.js` |
| **Server (Admin API)** | `DonationController.js`, `donationRoutes.js` |
| **Models** | `DonationButton`, `DonationRequest`, `PaymentHistory`, `CommonSettings` (donation + UPI + bank) |
| **Admin UI** | `DonationButtonsList.jsx`, `DonationRequestsList.jsx`, ApplicationSettings (donation toggles) |

---

## 3. User Flows

### 3.1 Public Donation Flow

1. **Landing:** User sees Donation section on Home (`Home.jsx` → `Donation`).
2. **Visibility:** Section renders only if `donationSettings.donationEnabled === true`; otherwise component returns `null`.
3. **Data Load:** On mount, `getActiveDonationButtons()` and `getDonationSettings()` are dispatched (parallel).
4. **UPI Buttons:** Active donation buttons (from `DonationButton` with `isActive: true`) are shown. Two types:
   - **FIXED:** Shows amount (e.g. ₹500) and optional `buttonText`; click opens modal with pre-filled amount.
   - **ANY:** Single “Donate Any Other Amount” button; click opens modal with empty amount.
5. **Modal (UPI):** `DonationModal` with `paymentMode="UPI"` shows “Payment gateway is not available. Please use Bank Transfer.” No actual payment; form collects donor details but submit is blocked for UPI (alert only).
6. **Modal (Bank):** Bank donation block is **commented out** in `Donation.jsx` (lines 135–166). So currently **Bank Transfer is not reachable from the main Donation section** in the UI, though the modal and API exist.
7. **Top Donations:** `TopDonations` fetches `/api/common/donation/top` (success-only from `PaymentHistory`), displays scrolling marquee (name + amount). Empty state: “No donations yet. Be the first to support…”

### 3.2 Bank Donation Flow (When Enabled in UI)

- User would click “Donate via Bank Transfer” → `DonationModal` with `paymentMode="BANK"`.
- Form: donor name, phone, email, address (optional), amount, UTR number.
- Submit → `POST /api/common/donation/request` → creates `DonationRequest` with `status: "pending"`.
- Admin approves/rejects in Donation Requests; on approve, thank-you email is sent.

### 3.3 Intended Gateway Flow (Currently Disabled)

- `initiateDonationPayment` and `verifyDonationPayment` return `400` with “Donation temporarily disabled”.
- No redirect to gateway; no `PaymentHistory` creation from gateway for donations from this flow.

---

## 4. Component Deep Dive

### 4.1 `Donation.jsx` (Main Section)

| Aspect | Detail |
|--------|--------|
| **State** | `showUPIModal`, `showBankModal`, `selectedAmount`, `isFixedAmount` |
| **Effects** | Single `useEffect` calling `getActiveDonationButtons` and `getDonationSettings` (no deps issue; stable dispatch refs) |
| **Early returns** | If `!donationSettings.donationEnabled` → `null`. If loading buttons/settings → `BouncingLoader` in section. |
| **Layout** | Header (“MAKE A DIFFERENCE”, “Support Our Mission”, optional `donationMessage`) → UPI buttons grid → Top Donations → Bank block (commented) |
| **Button grid** | `donationButtons.filter(btn => btn.isActive)`. Col sizing: `lg={button.type === "ANY" ? 12 : 2.4}` (custom 2.4 for 5 columns on large). |
| **Modals** | Two `DonationModal` instances (UPI + BANK); BANK modal is mounted but Bank CTA is hidden. |

**Issues / Notes:**

- Bank Transfer block is commented out: users cannot open Bank modal from Donation section.
- Double filter: backend already returns only active buttons; `.filter(btn => btn.isActive)` is redundant but safe.

### 4.2 `DonationModal.jsx`

| Aspect | Detail |
|--------|--------|
| **Props** | `show`, `handleClose`, `paymentMode` (UPI \| BANK), `initialAmount`, `isFixedAmount`, `donationSettings` |
| **State** | `formData` (donorName, phone, email, address, amount, utrNumber), `customAmount`, `isPaymentProcessing` |
| **Pre-fill** | On open, form is reset and donor fields filled from `loggedInUser` (name, phone, email) when available. |
| **Validation** | Uses `validateForm`; rules: donorName, phone, email, amount, (BANK) utrNumber. Amount digits-only; email regex. |
| **UPI submit** | Does not submit; shows alert “Payment gateway is not available. Please use Bank Transfer.” |
| **BANK submit** | Builds `submitData` (formData + paymentMode), calls `submitDonationRequest(submitData)`. On success, modal closes after 2s. |
| **Bank details** | Rendered when `paymentMode === "BANK"` and `donationSettings.bank`; shows bank name, account holder, account no, IFSC. |

**Issues / Notes:**

- UPI path still shows “Proceed to Payment” and amount/custom amount UI but never initiates payment; UX is misleading.
- `initialFormData` in component uses `initialAmount` from closure; reset in `useEffect` depends on `initialAmount` and `loggedInUser` — correct.
- No PropTypes for `donationSettings` shape (bank, upi, etc.); consider defining for maintainability.

### 4.3 `TopDonations.jsx`

| Aspect | Detail |
|--------|--------|
| **Data** | `getTopDonations(limit)` from Redux; `topDonations` = success-only donations from backend. |
| **Limit** | Uses `TOP_DONATIONS_LIMIT` (20) from `@src/constants`. |
| **Animation** | Vertical marquee; content duplicated for seamless loop when count > 1; `scrollUp` 30s linear infinite. Pause on hover. |
| **Empty** | When `topDonations.length === 0`: “No donations yet. Be the first to support our community initiatives!” |
| **Display** | Each item: `donorName` (fallback “Guest User”) and `amount` (₹ formatted with `toLocaleString("en-IN")`). |

**Issues / Notes:**

- Key uses `donation._id` and index to support duplicated list; acceptable. No server-side pagination; single fetch with limit.

---

## 5. Redux & API

### 5.1 Donation Reducer (`donationReducer.js`)

- **State:** `donationButtons`, `donationSettings` (with upi, bank), `qrCodeData`, `topDonations`, and loading flags for buttons, settings, QR, submit, top donations.
- **Actions:** donationButtonsUpdated, donationSettingsUpdated, topDonationsUpdated, loading* variants, submitDonationSuccess, clearQRCode, resetDonationState.
- **Default settings:** `donationEnabled: false`, empty message, empty upi/bank objects — safe for SSR/initial load.

### 5.2 Donation Actions (`donationActions.js`)

| Action | API | Purpose |
|--------|-----|--------|
| `getActiveDonationButtons` | GET `/api/common/donation/buttons` | Active buttons for section |
| `getDonationSettings` | GET `/api/common/donation/settings` | donationEnabled, donationMessage, upi, bank |
| `getTopDonations(limit)` | GET `/api/common/donation/top?limit=` | Top success donations |
| `submitDonationRequest(formData)` | POST `/api/common/donation/request` | Bank donation request (legacy) |

Error handling: on failure, buttons/settings/top donations are set to [] or safe defaults; alerts/errors set via `setAlert` / `setErrorsList`.

### 5.3 Public API Endpoints (Donation)

| Method | Route | Controller | Access |
|--------|--------|-------------|--------|
| GET | `/api/common/donation/buttons` | getActiveDonationButtons | Public |
| GET | `/api/common/donation/settings` | getDonationSettings | Public |
| GET | `/api/common/donation/top` | getTopDonations | Public |
| POST | `/api/common/donation/generate-qr` | generateDonationQRCode | Public (legacy) |
| POST | `/api/common/donation/initiate-payment` | initiateDonationPayment | Public (returns 400 disabled) |
| POST | `/api/common/donation/verify-payment` | verifyDonationPayment | Public (returns 400 disabled) |
| POST | `/api/common/donation/request` | submitDonationRequest | Public |

---

## 6. Server-Side Logic (DonationController)

### 6.1 getTopDonations

- Query: `PaymentHistory` with `paymentType: "Donation"`, `status: "success"`.
- Sort: `amount` descending; limit from query (default 20, max 1000).
- Populate: `userId` with `name`.
- Response: `{ donations: [{ _id, donorName, amount, createdAt }], limit, total }`. donorName from donorName → userName → userId.name → “Guest User”.

### 6.2 getActiveDonationButtons

- `DonationButton.find({ isActive: true }).sort({ amount: 1 })`. No pagination.

### 6.3 getDonationSettings

- `CommonSettings.getOrCreateSettings()`; returns donationEnabled, donationMessage, upi (upiId, upiHolderName), bank (bankName, accountNo, accountHolderName, ifscCode).

### 6.4 submitDonationRequest (Bank)

- Validates donorName, phone, email, amount, utrNumber, paymentMode (UPI/BANK).
- Duplicate UTR check: `DonationRequest.findOne({ utrNumber })`; 400 if exists.
- Creates `DonationRequest` with status `"pending"`.
- Audit log: PAYMENT_VERIFICATION.
- Response: 201 with request id and message for admin approval.

### 6.5 initiateDonationPayment / verifyDonationPayment

- Both return `400` with message “Donation temporarily disabled”. No DB write, no gateway call.

### 6.6 Admin: getAllDonationRequests

- Combines **PaymentHistory** (paymentType: Donation) and **DonationRequest** (bank).
- Supports filters: status, fromDate, toDate, phone, email, amount, donorType, search; then pagination (page, limit).
- Normalizes to common shape (donorName, phone, email, amount, paymentMode, status, orderId/transactionId/utrNumber, donorType, isGatewayPayment).
- Approve/Reject only for `DonationRequest` (bank); gateway donations are not manually approved.

---

## 7. Data Models

### 7.1 DonationButton

- **Collection:** donation_buttons  
- **Fields:** amount (required for FIXED, min 0), type (FIXED | ANY), buttonText (max 100), isActive (default true).  
- **Rule:** Only one button with type `ANY` allowed (enforced in create/update).

### 7.2 DonationRequest

- **Collection:** donation_requests  
- **Fields:** donorName, phone, email, address, amount, utrNumber (unique, indexed), paymentMode (UPI | BANK), status (pending | approved | rejected).  
- Used for bank (and legacy UPI) manual submission and admin approval.

### 7.3 PaymentHistory (Donation usage)

- **Collection:** payment_history  
- **Relevant:** paymentType “Donation”, status “success”/“failed”/“pending”, userId optional for Donation, donorName, donorEmail, donorPhone, amount, method, orderId, paymentId.  
- **Index:** `{ paymentType: 1, status: 1, amount: -1 }` for top-donations query.

### 7.4 CommonSettings (Donation)

- donationEnabled (Boolean), donationMessage (String).  
- upi: upiId, upiHolderName.  
- bank: bankName, accountNo, accountHolderName, ifscCode.

---

## 8. Styling

- **donation.scss:** Section padding, header/tag/title/intro, subtitle, buttons grid, amount button (gradient, hover lift), bank block and CTA, modal (header/body, form controls, primary button). Responsive: col breakpoints and button min-height.  
- **topDonations.scss:** Container height 300px (250px on mobile), marquee, scrollUp keyframes (-50% for duplicated content), item card with name/amount, loading and empty states.

---

## 9. Security & Validation

- **Common routes:** express-validator on donation/request (donorName length + no HTML/Mongo operators, phone, email, amount, utrNumber, paymentMode, address optional string).  
- **UTR uniqueness:** Enforced in DB and checked before insert; duplicate UTR returns 400.  
- **Donor name:** XSS/NoSQL guarded in validation.  
- **Public donation routes** listed in `server/config/constants.js` (e.g. `/api/common/donation`) for CORS/auth handling if applicable.

---

## 10. Gaps & Recommendations

| # | Issue | Recommendation |
|---|--------|----------------|
| 1 | Bank Transfer UI commented out in Donation section | Uncomment Bank block in `Donation.jsx` (lines 135–166) if bank donations are desired, or remove dead Bank modal code. |
| 2 | UPI modal shows “Proceed to Payment” but gateway disabled | Either hide UPI buttons until gateway is live, or change CTA to “Bank Transfer” and open Bank modal; avoid misleading “Proceed to Payment”. |
| 3 | No thank-you email for UPI (gateway) donations | When gateway is enabled, ensure success callback creates PaymentHistory and triggers thank-you email (similar to bank approval flow). |
| 4 | Top Donations limit hardcoded to 20 on client | Already configurable via `TOP_DONATIONS_LIMIT`; backend supports query limit 1–1000. Document for admins. |
| 5 | DonationRequest approval does not write to PaymentHistory | Bank approvals only update DonationRequest status and send email. If “top donations” must include bank-approved requests, add a step to create a PaymentHistory entry (or aggregate both sources in getTopDonations). |
| 6 | Redundant `.filter(btn => btn.isActive)` | Optional: remove for clarity; backend already returns only active buttons. |
| 7 | PropTypes for donationSettings shape | Add shape for donationSettings (donationEnabled, donationMessage, upi, bank) in DonationModal. |

---

## 11. File Reference

| Purpose | Path |
|--------|------|
| Section component | `client/src/views/Layout/Components/Donation.jsx` |
| Donation modal | `client/src/views/Common/Modal/DonationModal.jsx` |
| Top donations | `client/src/views/Common/TopDonations.jsx` |
| Actions | `client/src/actions/donationActions.js` |
| Reducer | `client/src/reducers/donationReducer.js` |
| Constants | `client/src/constants/index.jsx` (TOP_DONATIONS_LIMIT) |
| Donation styles | `client/src/assets/scss/pages/donation.scss` |
| Top donations styles | `client/src/assets/scss/components/topDonations.scss` |
| Controller | `server/routes/admin/Controllers/DonationController.js` |
| Common routes | `server/routes/common/commonRoutes.js` |
| Admin donation routes | `server/routes/admin/donationRoutes.js` |
| Models | `server/models/DonationButton.js`, `DonationRequest.js`, `PaymentHistory.js`, `CommonSettings.js` |
| Admin UI | `admin/src/view/admin/components/Donation/DonationButtonsList.jsx`, `DonationRequestsList.jsx` |
| Email | `server/services/email/index.js` (sendDonationThankYouEmail), `templates.js` (getDonationThankYouTemplate) |

---

*End of Donation Section Deep Analysis Report.*
