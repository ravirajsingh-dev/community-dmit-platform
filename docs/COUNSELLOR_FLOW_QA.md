# Counsellor (Designation_2) Flow – Deep Q&A Document

**Date:** March 7, 2025  
**Purpose:** Counsellor flow ke liye clarification – aap javab dein, phir implementation.

---

## Summary of Your 6 Points

1. **Designation_2 (COUNSELLOR)** – same assign/accept as Designation_1
2. **Only Designation_2** – user ki report ki counselling karega, jo time user ne select kiya us time par
3. **Online ya Offline** – dono ho sakti hai
4. **COUNSELLOR** – "counselling complete" option hona chahiye
5. **User** – confirmation jana chahiye (counselling huyi ya nahi, koi issue, rating) – sab confirm karke request close honi chahiye
6. **Commission** – jese hi user close kare (sab theek hai) → COUNSELLOR ko commission main wallet me credit

---

## Part 1: Assign / Accept (Designation_1 jaisa)

**Rule:** Designation_2 same Designation_1 jese assign/accept hoga.

### Q1.1 – Admin Accept par kya hoga?

Designation_1 (Trainer) me: Admin Accept → SbiProSession auto-create hota hai.

Designation_2 (COUNSELLOR) me:

- **A)** Admin Accept → CounsellingSession (ya similar) auto-create ho jaye – jese SbiProSession
- **B)** Sirf Appointment ACCEPTED – koi alag session model nahi, Appointment hi track karega
- **C)** Kuch aur (specify)

---

### Q1.2 – Counsellor ka "My Sessions" / dashboard

Trainer ke paas "My Sessions (Trainer)" hai – assigned DMIT sessions list.

COUNSELLOR ke paas:

- **A)** Same style – "My Counselling Sessions" – assigned counselling appointments list
- **B)** Appointments page me hi – "Assigned to Me" tab me Counsellor appointments
- **C)** Dono – alag Counselling page + Appointments me bhi

---

## Part 2: Report ki Counselling – Scope & Timing

**Rule:** COUNSELLOR user ki report ki counselling karega – jo time user ne select kiya us time par.

### Q2.1 – "Report" ka matlab

- **A)** DMIT Report (PDF) – jo user ko Trainer flow complete hone ke baad mila
- **B)** Koi aur report (specify)
- **C)** DMIT Report + kuch extra (specify)

---

### Q2.2 – Ek user kitni counselling sessions book kar sakta hai?

- **A)** Ek hi – 1 DMIT Report = 1 Counselling (jese One Trainer per user)
- **B)** Multiple – user apni report par multiple Counsellors se counselling le sakta hai (different times)
- **C)** Multiple – same Counsellor se bhi multiple sessions (follow-up)

---

### Q2.3 – Time "jo user ne select kiya"

Appointment me dateKey + slotId hai. Counselling kab hogi?

- **A)** Sirf scheduled time – COUNSELLOR aur User dono ko reminder/notification
- **B)** Online ke liye – meeting link / video call link bhi chahiye (COUNSELLOR ya system generate karega)
- **C)** Offline – physical meeting, koi link nahi; Online – link chahiye (specify kaun add karega)

---

## Part 3: Online vs Offline

**Rule:** Counselling online ya offline dono ho sakti hai.

### Q3.1 – Kaun decide karega – Online ya Offline?

- **A)** User book karte waqt select karega (dropdown: Online / Offline)
- **B)** COUNSELLOR decide karega (session start se pehle ya during)
- **C)** Admin / System – slot ya Counsellor profile me fixed (e.g. Counsellor X = sirf Offline)

---

### Q3.2 – Online counselling ke liye kya chahiye?

- **A)** Sirf flag "mode: online" – meeting link bahar se share (WhatsApp, etc.)
- **B)** App me meeting link field – COUNSELLOR link daal de, user ko dikhe
- **C)** In-app video call integration (Zoom/Meet embed, etc.)
- **D)** Abhi nahi – future me; for now sirf Online/Offline flag

---

## Part 4: COUNSELLOR – "Counselling Complete"

**Rule:** COUNSELLOR ke paas "counselling complete" option hona chahiye.

### Q4.1 – Counselling complete ka matlab

- **A)** COUNSELLOR ne session conduct kar di – ab user ko verify/confirm karna hai
- **B)** COUNSELLOR ne mark kiya "done" – turant user ko notification, user confirm karega
- **C)** Kuch aur (specify)

---

### Q4.2 – Counselling complete ke baad status flow

Trainer flow: UPLOADED → VERIFICATION_PENDING (user verify) → ANALYSIS_PENDING → CLOSED.

Counsellor flow:

- **A)** COUNSELLOR_COMPLETED → User confirmation pending → User close → COMPLETED
- **B)** COUNSELLOR_DONE → User rating + confirm → COMPLETED
- **C)** Aapka suggested flow (specify steps)

---

### Q4.3 – Counselling complete par kya optional info?

- **A)** Sirf "Mark Complete" button
- **B)** Notes field – COUNSELLOR short summary likh sake (optional)
- **C)** Duration – kitni der counselling hui (optional)
- **D)** Online/Offline – confirm kiya actual me kaunsa hua

---

## Part 5: User Confirmation & Close

**Rule:** User ko confirmation jana chahiye – counselling huyi ya nahi, koi issue, rating. Sab confirm karke request close.

### Q5.1 – User ko kya dikhega?

- **A)** Counselling complete hua? (Yes/No) + Rating (1–5) + Issue? (optional text) + "Confirm & Close" button
- **B)** Sirf Rating + "All good, Close" button
- **C)** Step-by-step: Pehle "Counselling huyi?" → Phir Rating → Phir "Koi issue?" → Last "Confirm & Close"

---

### Q5.2 – Agar user "counselling nahi huyi" / "issue hai" select kare?

- **A)** Request close nahi hogi – COUNSELLOR ko notify, woh resolve karega, phir user dobara confirm karega
- **B)** Request close ho jayegi – but "issue reported" flag, admin review ke liye
- **C)** User ko do option: "Close with issue" (commission hold?) ya "Reopen" (COUNSELLOR se phir connect)

---

### Q5.3 – Rating mandatory hai?

- **A)** Haan – close se pehle rating dena zaroori
- **B)** Nahi – optional, user skip kar sakta hai
- **C)** Optional – but agar issue hai to rating mandatory

---

### Q5.4 – "Request close" = kaunsa status?

- **A)** Appointment status = COMPLETED (jese Trainer flow me)
- **B)** Alag status – COUNSELLING_CLOSED (Appointment me ya CounsellingSession me)
- **C)** Dono – Appointment COMPLETED + CounsellingSession CLOSED

---

## Part 6: Commission

**Rule:** User close kare (sab theek) → COUNSELLOR ko commission main wallet me.

### Q6.1 – Commission ka source

Trainer: `registrationFee × designation.commissionPercent / 100`

Counsellor:

- **A)** Same – registrationFee se (WalletSettings me Designation_2 ka commissionPercent)
- **B)** Alag fee – counselling ke liye separate fee (e.g. counsellingFee) – specify kahan configure hoga
- **C)** Same registrationFee – user ne pehle hi pay kiya (DMIT), counselling usi package me?

---

### Q6.2 – Commission kab credit?

- **A)** Sirf jab user "Confirm & Close" kare (sab theek) – turant credit
- **B)** COUNSELLOR "complete" kare → hold; user close → credit
- **C)** User close ke baad – koi delay/approval nahi

---

### Q6.3 – Agar user "issue hai" close kare?

- **A)** Commission nahi milega – hold/cancel
- **B)** Commission milega – but "disputed" flag, admin review
- **C)** Commission nahi – jab tak user "sab theek" na kare, credit nahi

---

## Part 7: Technical / Edge Cases

### Q7.1 – CounsellingSession model

Designation_1 ke liye SbiProSession hai. Designation_2 ke liye:

- **A)** Naya model CounsellingSession – appointmentId, counsellorId, requesterId, status, mode (online/offline), completedAt, userClosedAt, rating, etc.
- **B)** Sirf Appointment – extra fields (counsellingStatus, rating, etc.) Appointment me hi
- **C)** Hybrid – minimal CounsellingSession (sirf status/notes) + Appointment me baki

---

### Q7.2 – One Counsellor per user?

Designation_1: One Trainer per user (lock).

Designation_2:

- **A)** One Counsellor per user – ek bar counselling complete, phir kisi aur Counsellor se nahi
- **B)** Multiple Counsellors – user different Counsellors se book kar sakta hai
- **C)** Same Counsellor se multiple sessions – follow-up allowed

---

### Q7.3 – WalletSettings – Designation_2

- **A)** Designation_2 already configured hai – name "COUNSELLOR", commissionPercent set
- **B)** Abhi nahi – implementation me add karenge
- **C)** Commission 0% – pehle flow test, baad me percent set

---

### Q7.4 – requestId format (commission idempotency)

Trainer: `sbi-pro:commission:<appointmentId>`

Counsellor:

- **A)** `counselling:commission:<appointmentId>` (1 appointment = 1 counselling)
- **B)** `counselling:commission:<counsellingSessionId>` (agar alag session model)
- **C)** Aapka format (specify)

---

## Summary – Checklist for Your Answers

```
PART 1 – Assign/Accept
Q1.1: A – Admin Accept → CounsellingSession auto-create (jese SbiProSession). Admin ko pata hoga CounsellingSession active h, kya chal rha h. Mostly Counsellor + User offline meeting karenge.
Q1.2: C / A – Dono (alag Counselling page + Appointments me bhi) – ya A (Same style "My Counselling Sessions") – jo best ho user friendly

PART 2 – Report & Timing
Q2.1: A – SBI PRO Report (PDF) – jo user ko Trainer flow complete hone ke baad mila. NOTE: "DMIT" word kahin use nahi – only "SBI PRO". "Your SBI PRO report is ready."
Q2.2: B + C – Multiple Counsellors + same Counsellor se multiple sessions (follow-up). Only 1st counselling free (per user id), baaki sab paid. Admin: Free Appointments/User limit. Free khatam → next counselling chargeable. counsellingCharge (X amount) user ke main wallet se debit. "X rs debit for counsellor appointment" type message.
Q2.3: A – Sirf scheduled time – COUNSELLOR + User dono ko reminder/notification. Abhi itna hi.

PART 3 – Online/Offline
Q3.1: Note – Koi decide nahi karega. Counselling Online/Offline – apne Counsellor se confirm kar lein on call.
Q3.2: D – Abhi nahi – future me; for now sirf Online/Offline flag.

PART 4 – Counselling Complete
Q4.1: B – COUNSELLOR ne mark kiya "done" – turant user ko notification, user confirm karega.
Q4.2: A – COUNSELLOR_COMPLETED → User confirmation pending → User close → Rating optional → COMPLETED
Q4.3: A + B + C + D – Sab 4: Mark Complete button, Notes (optional), Duration (optional), Online/Offline confirm.

PART 5 – User Confirmation
Q5.1: C – Step-by-step: Pehle "Counselling huyi?" → Phir Rating → Phir "Koi issue?" → Last "Confirm & Close"
Q5.2: A + B – Dono: (A) Request close nahi – COUNSELLOR notify, resolve karega, user dobara confirm. (B) Request close – "issue reported" flag, admin review. Counsellor + Admin dono ko notify.
Q5.3: B – Nahi – optional, user skip kar sakta hai.
Q5.4: C – Dono – Appointment COMPLETED + CounsellingSession CLOSED.

PART 6 – Commission
Q6.1: A – Same – registrationFee se (WalletSettings Designation_2 commissionPercent)
Q6.2: A – Sirf jab user "Confirm & Close" kare (sab theek) – turant credit.
Q6.3: C – Commission nahi jab tak user "sab theek" na kare – hold. Admin ko power: admin bhi request Confirm & Close kar sake → tab commission turant credit.

PART 7 – Technical
Q7.1: A – Naya CounsellingSession model – appointmentId, counsellorId, requesterId, status, mode, completedAt, userClosedAt, rating, etc. Fully advance banao.
Q7.2: B + C – Multiple Counsellors + Same Counsellor multiple sessions – dono allowed.
Q7.3: A – Designation_2 already configured – "COUNSELLOR", commissionPercent. WalletSettings only source of truth.
Q7.4: Proper format choose karo (e.g. counselling:commission:<counsellingSessionId>)
```

---

## Implementation Scope (Finalised)

| Area | Scope |
|------|-------|
| Models | CounsellingSession (new), Appointment extensions, User.freeAppointmentsUsed, counsellingCharge config |
| Services | counsellingSessionService, counsellorCommissionService |
| Routes | User + Admin + Counsellor APIs |
| UI | Counsellor "My Sessions" / "My Counselling", User "My Counselling", step-by-step confirmation flow |
| Wallet | Commission credit on user/admin Confirm & Close (Designation_2); counsellingCharge debit from user wallet for paid sessions |
| Notifications | Reminder/notification to Counsellor + User at scheduled time; notify on complete, on issue |

---

**Status:** ✅ Answers finalised. Ready for implementation.
