# Rank System – Deep QA Questions & Key Points

> **Context:** Designations aur Wallet Settings flow ka analysis karke Ranks ke liye QA questions. Ranks ka flow Designations jaisa hoga lekin thoda alag.

---

## 1. Designations Flow – Summary (Reference)

### 1.1 Configuration (Wallet Settings)
- **Storage:** `WalletSettings.designations[]` – singleton config
- **Fields:** designationCode, name, walletKey, commissionPercent, selfSaleRequired, teamSizeRequired, requiredDesignationCode, requiredDesignationCount, monthlyTarget, isActive, freeSessionCount, maxSessionsPerDay
- **Admin UI:** Wallet Settings → Designations section – Add/Edit/Delete (last-only delete)
- **Rules:** designationCode sequential 1,2,3…; requiredDesignationCode < current; circular dependency check

### 1.2 User-Side Flow
1. **Eligibility Check:** `getDesignationEligibility()` – directCount, totalDownlineCount, monthlyDirectCount, requiredDesignationCount
2. **Apply:** User clicks "Apply for X" → `applyForDesignation(designationCode)` → atomic push to `User.designations[]` with status PENDING
3. **Blocking:** Cannot apply if same designationCode already PENDING or APPROVED

### 1.3 Admin-Side Flow
1. **List Applications:** `getDesignationApplications(status, options)` – filter by PENDING/APPROVED/REJECTED/INACTIVE/DELETED/ALL
2. **Actions:** Approve, Reject, Set Inactive, Delete (soft) – with state machine transitions
3. **Remarks:** Required for Reject/Delete

### 1.4 User Model
- `User.designations[]`: { designationCode, status, appliedAt, approvedAt, approvedBy, remarks }
- Status: PENDING | APPROVED | REJECTED | INACTIVE | DELETED

### 1.5 Commission
- Designation commission credits to **MAIN** wallet (no separate designation wallet)
- Used in SBI PRO, Counselling flows

---

## 2. Wallet Settings Flow – Summary (Reference)

### 2.1 Structure
- **Singleton:** `WalletSettings` – single document, `singletonKey: "GLOBAL"`
- **Sections:** Registration Fee, Governance, Levels, Ranks, Clubs, Designations
- **Transaction Password:** Required for Add/Edit/Delete of Levels, Ranks, Clubs, Designations
- **Commission Cap:** Total (levels + ranks + clubs + designations) ≤ 100%

### 2.2 Ranks (Current Config-Only)
- **Storage:** `WalletSettings.ranks[]`
- **Fields:** rankCode, name, walletKey, commissionPercent, selfSaleRequired, teamSizeRequired, requiredRankCode, requiredRankCount, monthlyTarget, capping, requiredDesignations[]
- **Rules:** rankCode sequential; requiredRankCode = rankCode - 1 (null for 1); requiredDesignations: [{ designationCode, minCount }]
- **Admin UI:** Add/Edit/Delete (last-only) – config only, no user-facing apply/approve

---

## 3. Current Rank System – What Exists

### 3.1 Backend
- **rankEligibilityService:** `checkRankEligibility(userId, rankCode, options)` – requiredRankCode, selfSaleRequired, teamSizeRequired, monthlyTarget, requiredDesignations
- **incomeService:** `distributeRankIncome(userId, rankCode, amount)` – credits MAIN wallet
- **walletJobHandler:** Can enqueue rank income jobs
- **User model:** **NO** `rankCode` or `ranks[]` – rank is NOT stored on user

### 3.2 Gaps
- No user apply flow
- No admin approval flow
- No `User.rankCode` – rank computed on demand when passed to eligibility
- No automatic rank upgrade when eligibility met
- No user-facing "My Rank" or "Rank Applications" UI

---

## 4. Ranks – Deep QA Questions (Detail mein – galti na ho)

**IMPORTANT:** Saare 24 questions detail mein (example, scenario, options, edge case) yahan hain: **[RANK_QA_DETAILED_QUESTIONS.md](./RANK_QA_DETAILED_QUESTIONS.md)** – QA meeting mein wahi file use karo.

**Har question ke niche:**
- Exact kya puchna hai
- Concrete example / scenario
- Clear A/B/C options (jisme se ek select karna hai)
- Agar X hua toh kya hoga – edge case

---

### 4.1 Flow Type

---

**Q1: Rank upgrade ka flow kya hoga – Auto ya Apply+Approve?**

**Exact puchna hai:** Jab user Rank 2 ke liye eligible ho jaye (teamSizeRequired, requiredRankCount, etc. sab meet ho), toh rank kaise assign hoga?

**Concrete scenario:**
- User A ka Rank 1 hai. Uske downline mein 50 ACTIVE users hain. Rank 2 ke liye teamSizeRequired = 50 hai.
- Ab kya hoga?

**Options (ek select karo):**
- **A) Fully Auto:** System khud check karega (cron/event pe) → eligible mila → `User.rankCode = 2` set. Koi apply/approve nahi.
- **B) Apply + Admin Approve:** User ko "Apply for Rank 2" button dikhega → click → PENDING → Admin approve karega → rank assign. Bilkul Designations jaisa.
- **C) Hybrid:** Rank 1→2 auto; Rank 2→3, 3→4... ke liye apply+approve.

**Edge case:** User ne apply kiya, PENDING hai. Uske beech eligibility lose ho gayi (e.g. downline inactive). Approve karte waqt kya? (A) Eligibility dobara check karni hai, (B) Nahi, jo apply time pe thi wahi valid.

**Answer:** _____________

---

**Q2: User ko pehla rank (Rank 1) kab milna chahiye?**

**Exact puchna hai:** Naya user register + activate hone ke baad – Rank 1 kab assign hoga?

**Concrete scenario:**
- User B ne aaj 10 AM pe registration complete kiya, 11 AM pe payment karke activate ho gaya.
- Rank 1 kab milega?

**Options (ek select karo):**
- **A) Activation ke turant baad:** Payment success → activation complete → same transaction mein `User.rankCode = 1`.
- **B) Manual admin assign:** Admin ko manually rank assign karna padega. Koi auto nahi.
- **C) Kuch aur condition:** e.g. first direct referral ke baad, ya first sale ke baad.

**Edge case:** Agar Rank 1 ke liye bhi koi eligibility hai (e.g. selfSaleRequired > 0)? Toh naya user kab tak rankless rahega?

**Answer:** _____________

---

**Q3: Rank downgrade possible hai? Agar haan, kab?**

**Exact puchna hai:** User ka Rank 3 hai. Baad mein teamSizeRequired ya monthlyTarget miss ho jata hai. Kya rank 2 ya 1 pe revert hoga?

**Concrete scenario:**
- User C ka Rank 3 tha. Uske 100 downline the. Ab 20 users inactive/blocked ho gaye. teamSizeRequired for Rank 3 = 80.
- Ab 80 se kam ACTIVE downline. Kya User C ka rank downgrade hoga?

**Options (ek select karo):**
- **A) Nahi, rank kabhi downgrade nahi:** Once Rank 3, always Rank 3. Sirf upgrade.
- **B) Haan, eligibility lose = downgrade:** Monthly cron check karega → agar criteria fail → rank -1.
- **C) Haan, lekin manual:** Admin manually downgrade kar sakta hai.

**Edge case:** Downgrade hone par pehle mila hua rank commission (RANK_3 wallet se) wapas le lena hai ya nahi?

**Answer:** _____________

### 4.2 User Model
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q4 | User par rank kaise store karein? | (A) `User.rankCode` (single), (B) `User.ranks[]` (history + status like designations), (C) Don’t store – compute on demand |
| Q5 | Agar `User.ranks[]` – status kya hoga? | PENDING | APPROVED | REJECTED | INACTIVE | DELETED (Designations jaisa)? |
| Q6 | Multiple ranks ek user par? | Single highest rank only, ya multiple (e.g. different categories)? |

### 4.3 Eligibility
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q7 | Eligibility kab check hogi? | (A) On activation, (B) On each sale/registration, (C) Cron job (daily/weekly), (D) User apply pe |
| Q8 | requiredRankCode – user ke paas previous rank hona zaroori? | Current: Yes. Rank 2 ke liye Rank 1 required. Confirm? |
| Q9 | requiredDesignations – downline mein X designation holders – ACTIVE+APPROVED count? | Designations jaisa – status=1 + designation APPROVED? |
| Q10 | selfSaleRequired / teamSizeRequired / monthlyTarget – source kya? | Activation amount? Registration fee? Product sale? Custom aggregation? |
| Q11 | Capping – rank commission par cap? | Per user per month? Per rank? |

### 4.4 Apply + Admin Flow (agar Designations jaisa)
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q12 | User apply karega ya auto? | Apply → Admin approve (Designations jaisa) ya fully auto? |
| Q13 | Admin actions kya honge? | Approve, Reject, Set Inactive, Delete (soft)? |
| Q14 | Remarks mandatory kahan? | Reject/Delete pe? |
| Q15 | Re-apply allowed? | REJECTED/INACTIVE/DELETED ke baad user dubara apply kar sakta hai? |

### 4.5 Commission & Income
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q16 | Rank commission kab credit hoga? | Activation pe? Sale pe? Monthly? |
| Q17 | Rank commission kis event se aata hai? | Downline activation? Downline sale? Club income? |
| Q18 | Rank wallet separate hai ya MAIN? | Current: MAIN. Confirm? |

### 4.6 UI & UX
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q19 | User portal – Rank section kahan? | Dashboard? Profile? Separate "Ranks" page (Designations jaisa)? |
| Q20 | User kya dikhega? | Current rank, eligibility for next rank, apply button (agar apply flow)? |
| Q21 | Admin – Rank management alag page ya Wallet Settings ke andar? | Designations: alag AdminDesignationManagement. Ranks: alag page ya Wallet Settings config hi? |

### 4.7 Edge Cases
| # | Question | Options / Notes |
|---|----------|-----------------|
| Q22 | Rank config change (edit/delete) – existing users par impact? | User.rankCode 3 hai, Rank 3 delete kiya – kya hoga? |
| Q23 | requiredDesignations – designation delete ho jaye? | Rank 2 requires Des 1. Des 1 delete – rank eligibility invalid? |
| Q24 | Rank 1 – koi prerequisite? | requiredRankCode null. Koi bhi eligible? Activation enough? |

---

## 5. Key Points – Ranks vs Designations

| Aspect | Designations | Ranks (Proposed) |
|--------|--------------|------------------|
| **Config** | WalletSettings.designations | WalletSettings.ranks |
| **User storage** | User.designations[] | User.rankCode OR User.ranks[] |
| **Flow** | Apply → Admin Approve | Auto upgrade OR Apply+Approve (TBD) |
| **Status** | PENDING/APPROVED/REJECTED/INACTIVE/DELETED | TBD – same ya simplified |
| **Prerequisite** | requiredDesignationCode + requiredDesignationCount | requiredRankCode + requiredDesignations |
| **Commission** | MAIN wallet | MAIN wallet |
| **Admin UI** | Separate Designation Management | TBD – separate ya Wallet Settings |
| **User UI** | DesignationsIndex – apply, eligibility | TBD – rank display, apply/auto |

---

## 6. Implementation Checklist (Post-QA)

- [ ] User schema: Add `rankCode` or `ranks[]`
- [ ] Rank eligibility: Integrate with activation/sale/cron (as decided)
- [ ] Rank upgrade: Auto OR apply+approve service
- [ ] Admin: Rank management page (if apply flow)
- [ ] User: Rank display + apply (if apply flow)
- [ ] Commission: Ensure distributeRankIncome called from correct events
- [ ] Migration: Backfill existing users with rankCode (if auto from eligibility)

---

## 7. References

- `server/models/WalletSettings.js` – rankSchema
- `server/services/rankEligibilityService.js` – checkRankEligibility
- `server/services/designationService.js` – apply, transition
- `server/services/designationEligibilityService.js` – getEligibilityForAll
- `admin/src/view/admin/components/Designations/AdminDesignationManagement.jsx`
- `admin/src/view/admin/components/WalletSettings/WalletSettings.jsx`
- `client/src/views/Layout/Designations/DesignationsIndex.jsx`
- `docs/DESIGNATION_PHASE1_IMPLEMENTATION.md`
