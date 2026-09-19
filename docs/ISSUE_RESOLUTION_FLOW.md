# Counselling Issue Resolution Flow – Complete Step-by-Step

**Date:** March 7, 2025  
**Purpose:** User-friendly flow when counselling session par issue report hota hai.

---

## Overview

Jab user counselling session ke baad **issue report** karta hai (counselling nahi hui / koi problem hai), to:

1. **Counsellor** ko turant **email notification** jati hai
2. **Counsellor** ko **resolve karne ka moka** milta hai
3. **Admin** ke paas **sare options** hote hain: Confirm & Close, Close without commission, Re-counselling
4. **Commission** sirf tab milta hai jab user **satisfied** ho

---

## Step-by-Step Flow

### Step 1: Counsellor marks "Mark Complete"

- Counsellor counselling session conduct karta hai
- Appointments → Assigned to Me → **Mark Complete** button
- Notes, duration, mode (Online/Offline) optional fill kar sakta hai
- Status: `CREATED` → `USER_CONFIRMATION_PENDING`

---

### Step 2: User ko Confirm & Close dikhai deta hai

- User **My Counselling** page par jata hai
- Step-by-step flow:
  1. **Counselling huyi?** → Yes / No
  2. **Rating** (optional, 1–5)
  3. **Koi issue?** → No / Yes (agar Yes to description)
  4. **Confirm & Close**

---

### Step 3A: User "Sab theek" select kare

- User **Confirm & Close** kare (sab theek, no issue)
- Status: `USER_CONFIRMATION_PENDING` → `CLOSED`
- **Counsellor ko commission** turant credit hota hai
- Flow complete ✅

---

### Step 3B: User "Issue hai" select kare

- User issue report kare (counselling nahi hui / koi problem)
- Status: `USER_CONFIRMATION_PENDING` → `ISSUE_REPORTED`
- **Email nahi** – counsellor website par **Assigned to Me** me dekhega
- **Admin** panel me session **ISSUE_REPORTED** dikhai deta hai
- Request close **nahi** hoti – counsellor ko moka milta hai

---

### Step 4: Counsellor – Issue Resolve

- Counsellor **Assigned to Me** me session dekhta hai
- Status **ISSUE_REPORTED** par **"I've Resolved"** button dikhai deta hai
- Counsellor user se baat karke issue resolve karta hai
- **"I've Resolved"** click kare
- Status: `ISSUE_REPORTED` → `USER_CONFIRMATION_PENDING`
- **User ko dobara** Confirm & Close karna hoga (My Counselling me)

---

### Step 5: User dobara Confirm kare (counsellor ne resolve kiya)

- User **My Counselling** me session dekhega
- Status ab **USER_CONFIRMATION_PENDING**
- User phir se step-by-step confirm kare
- Agar **sab theek** → CLOSED, commission credit ✅
- Agar phir bhi **issue** → wapas ISSUE_REPORTED (Step 4 repeat)

---

### Step 6: Admin Options (ISSUE_REPORTED par)

Admin **Counselling Sessions** page par jata hai. Har ISSUE_REPORTED session ke liye **3 options**:

| Option | Kya hota hai | Commission |
|--------|--------------|------------|
| **Confirm & Close** | Admin sab theek maan kar close karta hai | ✅ Counsellor ko milega |
| **Close without commission** | Admin close karta hai, user satisfied nahi | ❌ Counsellor ko nahi milega |
| **Re-counselling** | Counsellor ko dobara session karne ka moka | Counsellor "Mark Complete" phir karega |

---

### Step 6A: Admin "Confirm & Close"

- Admin user/counsellor ko satisfied maan kar close karta hai
- Status: `ISSUE_REPORTED` → `CLOSED`
- **Commission counsellor ko** credit hota hai

---

### Step 6B: Admin "Close without commission"

- Admin decide karta hai: user satisfied nahi, counsellor ko commission nahi dena
- Status: `ISSUE_REPORTED` → `CLOSED`
- **Commission nahi** milega counsellor ko

---

### Step 6C: Admin "Re-counselling"

- Admin counsellor ko **dobara try** karne ka moka deta hai
- Status: `ISSUE_REPORTED` → `CREATED`
- Counsellor **Mark Complete** phir se karega (naya session conduct karke)
- Phir user confirm karega (Step 2–5 repeat)

---

## Summary Table

| Role | Action | Result |
|------|--------|--------|
| **User** | Issue report | Counsellor + Admin notify, status ISSUE_REPORTED |
| **Counsellor** | I've Resolved | Status USER_CONFIRMATION_PENDING, user dobara confirm karega |
| **Admin** | Confirm & Close | CLOSED, commission ✅ |
| **Admin** | Close without commission | CLOSED, commission ❌ |
| **Admin** | Re-counselling | CREATED, counsellor dobara Mark Complete karega |

---

## Commission Rules

- **User satisfied** (Confirm & Close, sab theek) → **Commission ✅**
- **User not satisfied** (issue report, admin close without commission) → **Commission ❌**
- **Admin Confirm & Close** (override) → **Commission ✅**

---

## Notifications

- **ISSUE_REPORTED** par: Counsellor ko **email** jati hai
- Admin panel me session list me **ISSUE_REPORTED** filter se dekh sakte hain

---

## UI Locations

| Role | Page | Actions |
|------|------|---------|
| **User** | Appointments → My Counselling | Confirm & Close (step-by-step) |
| **Counsellor** | Appointments → Assigned to Me | Mark Complete, I've Resolved (ISSUE_REPORTED par) |
| **Admin** | Counselling Sessions | Confirm & Close, Close without commission, Re-counselling |

---

**Status:** ✅ Complete flow implemented.
