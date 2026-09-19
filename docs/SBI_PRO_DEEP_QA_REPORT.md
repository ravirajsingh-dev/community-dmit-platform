# DMIT Trainer Assignment – DEEP QA Report

**Date:** March 4, 2025  
**Purpose:** Q&A answers ke baad remaining ambiguities, technical gaps, aur clarification ke liye sawal.

---

## 1. Executive Summary

Aapke answers se base rules clear hain. Lekin **booking-for-others**, **beneficiary identification**, **lock mechanism**, aur **free-session expiry** par kuch critical sawal open hain. Neeche section-wise deep QA hai.

---

## 2. Q1.4 – Designation 1 Block: DEEP QA

**Answer:** Sirf Designation 1 (DMIT) block, baaki designations allowed.

### DQ1.4.1 – Error message

Jab locked user DMIT (Designation 1) book kare to kya dikhe?

| Option | Message | Action |
|--------|---------|--------|
| A | "Aapka DMIT pehle hi complete ho chuka hai. Fingerprints kabhi change nahi hote." | Book button disable / redirect |
| B | "Aap already ek DMIT report ke saath linked hain. Koi aur appointment book nahi kar sakte." | Same |
| C | Custom message (specify) | |

**Recommendation:** A ya B – user ko clearly samjhe ki DMIT dobara nahi ho sakta.

---

### DQ1.4.2 – Pre-check vs post-submit

Block kab dikhe?

- **A)** Holder list load hote hi – Designation 1 par locked user ko "Book DMIT" option hi na dikhe  
- **B)** Holder select ke baad slot select karte waqt – "Aap DMIT ke liye eligible nahi hain"  
- **C)** Submit click par – validation error  

**Recommendation:** A (earliest) – user time na waste kare.

---

### DQ1.4.3 – Baaki designations

User A ne DMIT complete kiya. Ab User A:

- Astrology (Designation 2) book kar sakta? → **Haan (expected)**  
- Koi aur designation (3, 4, 5…) book kar sakta? → **Haan (expected)**  

Confirm karna hai: Koi aur designation fingerprint/lock se affect nahi hota?

---

## 3. Q2 – Booking For Others: CRITICAL DEEP QA

**Scenario:** Booker (meri ID) se wife / bhai / colleague / known person ke liye book. Beneficiary ka account nahi.

### DQ2.1 – Beneficiary identification (MOST CRITICAL)

Beneficiary identify karne ke liye kya store karenge?

Fingerprint lock beneficiary par hai. Same person dobara book na ho, iske liye ek unique identifier chahiye.

| Option | Identifier | Lock logic | Problem |
|--------|------------|-----------|---------|
| A | **Phone** (required) | `beneficiaryPhone` → agar same phone pe pehle DMIT complete, block | Two people same phone? Rare |
| B | **Name + DOB** | `hash(name+dob)` → collision possible | Same name + DOB possible |
| C | **Name + Phone + DOB** | Composite key | Best accuracy |
| D | **Beneficiary ID** (lightweight) | Booker "Add Family Member" → unique ID | Extra flow, Q2.2 "Not needed" se thoda ulta |

**Sawal:** Beneficiary add karte waqt **minimum kya compulsory** hona chahiye?
- Name – Yes/No  
- Phone – Yes/No (lock ke liye strongly recommended)  
- DOB – Yes/No  
- Relation (optional) – Yes/No  

**Recommendation:** Name + Phone mandatory. DOB optional. Lock = `beneficiaryPhone` (agar phone unique hai to), warna `bookerId + beneficiaryPhone`.

---

### DQ2.2 – Same person, different bookers

**Case:** Husband (Booker1) ne Child ke liye DMIT complete kara. Baad mein Wife (Booker2) bhi same Child ke liye book kare.

- Child ka account nahi.
- Lock Child par hai.
- Kaise pata chalega ki Booker2 ka "Child" = Booker1 ka "Child"?

**Options:**

| Option | Approach |
|--------|----------|
| A | Phone mandatory – Child ka phone same ho to match, block |
| B | Dono bookers same household – koi link nahi, duplicate possible |
| C | Admin / support manually check – no system check |

**Sawal:** A ko prefer karein? Agar Child ka phone nahi hai (minor) to kya use karenge – parent phone?

---

### DQ2.3 – Batch booking (3 orders sath)

**Answer:** "Me 3 order sath hi create kar du – 1 mera, 1 wife, 1 papa."

**Sawal:**

1. **Same slot / same date?**  
   - 3 alag appointments, same Trainer, same date, same slot?  
   - Ya 3 alag dates/slots?

2. **Flow:**  
   - Option A: Ek form – "For whom" dropdown (Self / Wife / Father) × 3 rows, ek Submit  
   - Option B: 3 alag bookings sequence mein – har ek ke liye "For whom" select

3. **Trainer side:**  
   - Trainer ko 3 sessions dikhen (3 appointments)?  
   - Har session ke liye 10 images alag upload?

4. **Verification:**  
   - Booker ek hi baar mein teeno verify kare?  
   - Ya teeno ke liye alag-alag verify?

**Recommendation:** Option A (single form, multiple "for whom") – UX simple. Backend = 3 separate appointments + 3 DMIT sessions. Trainer ko 3 sessions, har ek mein 10 images.

---

### DQ2.4 – "For whom" options in UI

**Sawal:** Booker ko "Analysis for" select karne ke options:

- **A)** Self (default) / Add Other (name, phone, relation optional)  
- **B)** Self / Wife / Child / Father / Mother / Brother / Sister / Other (dropdown + custom name)  
- **C)** Sirf "Other" – name + phone manual  

Kaunsa prefer?

---

### DQ2.5 – Admin "vapas kro" / bypass

**Answer:** "User call karke bolega 'meri finger analysis vapas kro' – admin direct trainer assign karega."

**Sawal:**

1. **Kab use hoga?**  
   - Report galat?  
   - Technical issue?  
   - Wrong trainer assigned?

2. **Admin action:**  
   - Lock temporarily remove + naya appointment create?  
   - Ya existing session re-open?  
   - Ya "Admin override" flag se naya flow?

3. **Limit:**  
   - Kitni baar admin bypass kar sakta?  
   - Ya har case pe manual approval?

4. **Audit:**  
   - Admin bypass ka log required? (Security/compliance)

**Recommendation:** Admin panel me "Create DMIT (Override Lock)" – manual, logged. Limit = policy, not hard-coded.

---

## 4. Q3 – UI / Professional: DEEP QA

### DQ3.1 – Q3.1 vs earlier instruction

**Earlier:** "User ko dikhna nahi chahiye – free, paid, time."  
**Answer:** "Full advanced high tech – sab visible."

Final confirm: User ko **sab** dikhe – free count, paid count, time, slots – theek hai?

---

### DQ3.2 – Free session expiry

**Answer:** "Remaining X dikhao, fix time use karo, nahi to expire. Admin manage karega."

**Sawal:**

1. **Expiry kab?**  
   - Calendar date (e.g. "Use by 31 Dec 2025")?  
   - Registration se X months?  
   - Per designation alag?

2. **Expire hone par:**  
   - Sirf message "Expired"?  
   - Ya auto-deduct / notification?

3. **Admin controls:**  
   - Per-user extend?  
   - Global settings (e.g. 12 months from registration)?

4. **UI:**  
   - "X free sessions remaining, valid till DD/MM/YYYY" – ye format ok?

---

### DQ3.3 – Geographic / downline priority (Q4.1)

**Answer:** Geographic + downline dono options.

**Sawal:**

1. **Geographic:**  
   - User location ka source? (Profile: city/district/village?)  
   - Trainer location kahan stored?  
   - "Nearby" = same district? same state?

2. **Downline:**  
   - `referredBy` hierarchy use karenge?  
   - "Same downline" = direct referral? ya koi level tak?

3. **Default sort:**  
   - Pehle downline, phir geographic?  
   - Ya user filter choose kare (Downline first / Nearby first / All)?

---

## 5. Data Model – Proposed Changes (For Implementation)

### 5.1 – Appointment / DMIT Session

| Field | Current | Proposed |
|-------|---------|----------|
| `requesterId` | Booker (user who books) | Same |
| `assignedTo` | Trainer | Same |
| `userId` (DMIT session) | = requesterId | **= beneficiary (fingerprint person)** |
| `beneficiaryId` / `analysisFor` | N/A | **New:** userId (if self) ya beneficiaryRef |

### 5.2 – Beneficiary (agar lightweight chahiye)

| Field | Type | Purpose |
|-------|------|---------|
| `bookerId` | ObjectId | Owner |
| `name` | String | Display |
| `phone` | String | Unique key for lock |
| `dob` | Date (optional) | Extra identifier |
| `relation` | String (optional) | Wife, Child, etc. |

### 5.3 – Lock storage

| Collection / Field | Purpose |
|--------------------|---------|
| `dmit_completed_beneficiaries` ya User field | `{ userId OR beneficiaryPhone, completedAt, trainerId }` |
| Booking check | Agar `userId` ya `beneficiaryPhone` already in completed → block |

---

## 6. Implementation Phases (Suggested)

| Phase | Scope | Dependency |
|-------|--------|------------|
| **1** | Fingerprint lock (self only) | Current data, no beneficiary |
| **2** | Block Designation 1 only, error handling | Phase 1 |
| **3** | Booking for others (beneficiary) | DQ2.1, DQ2.2 resolve |
| **4** | Batch booking UI | Phase 3 |
| **5** | Free session expiry | DQ3.2 resolve |
| **6** | Geographic / downline filters | DQ3.3 resolve |
| **7** | Admin bypass | DQ2.5 resolve |

---

## 7. Action Items – Aapke Jawab Chahiye

In points par decision dein, taaki implementation start ho sake:

1. **DQ2.1:** Beneficiary = Name + Phone mandatory? DOB optional?
2. **DQ2.2:** Same person, different bookers – Phone se match karein?
3. **DQ2.3:** Batch = 3 alag appointments, same date/slot, ek form?
4. **DQ2.4:** "For whom" = Self / Add Other (name, phone) ya pre-defined relations?
5. **DQ2.5:** Admin bypass = manual, logged, limit?
6. **DQ3.2:** Free expiry = "X months from registration" ya fixed date?
7. **DQ3.3:** Geographic = district-level? Downline = direct only ya multi-level?

In decisions ke baad Phase 1 (lock + block) turant start ho sakta hai.
