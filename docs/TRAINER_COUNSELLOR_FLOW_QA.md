# Trainer & Counsellor Flow – Deep Q&A Document

**Date:** March 7, 2025  
**Purpose:** 4 points for questions – you answer, then implementation.

---

## Summary of Your 4 Points

1. **Each user will be assigned a trainer only once** – One trainer per user, once only
2. **For whom (Analysis for) – Child without phone: use parent phone remove** – 1 ID = 1 user simple
3. **Until trainer flow is complete, Counsellor select option will not be shown**
4. **No change in Trainer workflow**

---

## Part 1: One Trainer Per User (Once Only)

**Rule:** Each user gets assigned a Trainer only once.

### Q1.1 – Exact meaning of "once"

- **A)** User booked DMIT → Trainer X assigned → Session complete (Report/Mark Done) → User can **never** book DMIT with any other Trainer
- **B)** User booked DMIT → Trainer X assigned → **Still** (before session complete) cannot book with another Trainer Y – complete first one
- **C)** Both – (A) + (B) – complete first, then never again

*Current system:* Fingerprint lock – DMIT re-booking blocked after complete. Only one active (PENDING/ACCEPTED) allowed per user per date.

---

### Q1.2 – Scope of "User"

What does the lock apply to?

- **A)** Only **SELF** (the user who booked, same ID)
- **B)** **SELF + OTHER** both – if booked for Child/Wife, lock applies to Child/Wife (beneficiary) too – no DMIT again on their phone/ID
- **C)** Only SELF – remove OTHER option entirely per "1 ID = 1 user" (linked to Point 2)

---

### Q1.3 – Admin bypass

If user calls and says "redo my finger analysis" / "wrong trainer assigned":

- **A)** Admin can create new DMIT via override – lock bypass, logged
- **B)** No – once assigned = forever, admin cannot change
- **C)** Admin will only do manual DB change in special cases (no UI)

*Current:* Admin SBI PRO override API exists (`create-sbi-pro-override`).

---

## Part 2: For Whom (Analysis for) – Child Without Phone Remove, 1 ID = 1 User

**Current UI (BookAppointment.jsx):**
- "For whom (Analysis for)" section – Self (Mine) / Add person (name + phone)
- Hint: "Child without phone: use parent phone"

**Your point:** Remove this hint, 1 ID = 1 user simple.

### Q2.1 – Meaning of "1 ID = 1 user"

- **A)** Only **SELF** option – no "Add person" / OTHER option. User books with their own ID only
- **B)** **OTHER** option remains, but **phone mandatory** – no support for "Child without phone" case. Cannot book if child has no phone
- **C)** OTHER remains, but hint "Child without phone: use parent phone" **only removed** – no logic change, just remove UI text

---

### Q2.2 – If OTHER is removed (Option A)

- How to get DMIT done for children / spouse / others?
- **A)** Not at all – DMIT only for self
- **B)** Create separate user account for them, then login as them and book
- **C)** Something else (specify)

---

### Q2.3 – If OTHER remains + phone mandatory (Option B)

- Child (minor) has no phone – what to do?
- **A)** Use parent's phone – but don't show hint, backend stays same
- **B)** No DMIT for child – until they have phone, cannot book
- **C)** Lightweight "Add family member" flow – add child, link parent phone

---

## Part 3: Counsellor – Show Only After Trainer Flow Complete

**Rule:** Until Trainer (DMIT) flow is complete, Counsellor select option will not be shown.

### Q3.1 – Meaning of "Trainer flow complete"

When should user see Counsellor option?

- **A)** When user's **DMIT appointment** status = **COMPLETED** (Holder clicked "Complete")
- **B)** When **DMIT Session** status = **CLOSED** (Admin uploaded Report or Mark Done)
- **C)** Both should be same – appointment COMPLETED only when DMIT session CLOSED

*Current:* `checkProgressionRule` – user needs **at least 1 COMPLETED appointment** for designation 1 (Trainer/DMIT) to book designation 2 (Counsellor).

---

### Q3.2 – Where should Counsellor show / not show?

- **A)** **Book Appointment** page – Designation dropdown should not show Counsellor option until Trainer complete
- **B)** **Designations** page (Apply for Counsellor) – Apply button disabled / hidden until Trainer complete
- **C)** Both – Book Appointment + Designations
- **D)** Only Book Appointment – Designations apply is separate flow

---

### Q3.3 – Counsellor designation code

What is Counsellor's designationCode in WalletSettings?

- **A)** 2
- **B)** 3
- **C)** Other (specify)
- **D)** Not configured yet – admin will set

*Note:* Implementation will use `requiredDesignationCode` check – Counsellor (e.g. 2) will have `requiredDesignationCode = 1` (Trainer/DMIT).

---

### Q3.4 – "Option will not be shown" – UI behaviour

- **A)** **Hide** from designation list – Counsellor option does not appear in dropdown
- **B)** **Disabled** – show but greyed out, tooltip: "Complete DMIT (Trainer) first"
- **C)** Show, but on select show error: "Complete designation 1 first"

**Recommendation:** (A) – don't confuse user, don't show what's not available.

---

## Part 4: Trainer Flow – No Change

**Confirm:** No change in Trainer workflow (upload images, submit, client verify, etc.).

### Q4.1 – Verification

- **A)** Yes – Trainer flow stays exactly same, no code change
- **B)** Some minor UX improvements needed (specify)

---

## Part 5: Technical / Edge Cases

### Q5.1 – DMIT batch booking

If we do "1 ID = 1 user" + "Other remove" (Option A), what about **batch booking** (3 people in one slot – self, wife, father)?

- **A)** Batch booking **removed** – single (SELF) booking only
- **B)** Batch remains – but all SELF type (same user multiple slots? – confusing)
- **C)** Batch removed – clear

---

### Q5.2 – Existing data

Users who previously booked with "Child without phone / parent phone" – their data?

- **A)** No migration – old data stays, new rules apply only to new bookings
- **B)** Validate old appointments too (unlikely)

---

## Summary – Checklist for Your Answers

```
PART 1 – One Trainer
Q1.1: A / B / C – meaning of once?
Q1.2: A / B / C – lock scope (SELF only / SELF+OTHER)?
Q1.3: A / B / C – admin bypass?

PART 2 – For Whom
Q2.1: A / B / C – 1 ID = 1 user meaning?
Q2.2: A / B / C – if OTHER removed, how for children?
Q2.3: A / B / C – child without phone?
Q5.1: A / B / C – batch booking?

PART 3 – Counsellor
Q3.1: A / B / C – Trainer complete = ?
Q3.2: A / B / C / D – where to hide Counsellor?
Q3.3: A / B / C / D – Counsellor designation code?
Q3.4: A / B / C – hide vs disabled vs error?

PART 4 – Trainer Flow
Q4.1: A / B – no change confirm?

PART 5 – Edge
Q5.2: A / B – existing data?
```

---

## Implementation Scope (After answers)

| Point | Scope | Files Affected (Expected) |
|-------|-------|---------------------------|
| 1 | One trainer lock | `appointmentService`, `designationEligibility`, `BookAppointment` |
| 2 | For whom simplify | `BookAppointment.jsx`, beneficiary validation |
| 3 | Counsellor hide | `getDesignationEligibility`, `BookAppointment`, progression check |
| 4 | No change | — |

---

**Status:** ~~Awaiting your answers.~~ **IMPLEMENTED** (March 7, 2025)

---

## Implementation Summary (Post-Answers)

| Point | Implementation |
|-------|----------------|
| **1. One Trainer** | SELF only – `isUserSbiProLocked(uid)` blocks re-booking. Admin override exists. |
| **2. For Whom** | "For whom" section removed. Always SELF. Batch booking rejected for DMIT. |
| **3. Counsellor Hide** | `showForBooking` added to eligibility – designations with `requiredDesignationCode` hidden until user has 1 COMPLETED appointment. `uploadReport` / `markAnalysisDone` set Appointment to COMPLETED when DMIT session CLOSED. |
| **4. Trainer Flow** | No changes. |

**Files changed:** `dmitSessionService.js`, `appointmentService.js`, `DesignationController.js`, `BookAppointment.jsx`
