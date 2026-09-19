# Rank System – Deep QA Questions (Detail mein – galti na ho)

> **Use:** Har question ko QA meeting mein discuss karo. Answer blank space mein likho. Implementation ke time koi confusion nahi rahegi.

---

## 4.1 Flow Type

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

---

## 4.2 User Model (Database mein rank kaise store hoga)

---

**Q4: User par rank kaise store karein?**

**Exact puchna hai:** User document mein rank ka data structure kya hoga? Developer ko exact field name aur type pata hona chahiye.

**Concrete scenario:**
- User D ka Rank 2 hai. MongoDB User document mein kya dikhega?

**Options (ek select karo):**
- **A) `User.rankCode` (single number):** `{ rankCode: 2 }` – sirf current rank. Simple. History nahi.
- **B) `User.ranks[]` (array, Designations jaisa):** `[{ rankCode: 2, status: "APPROVED", appliedAt, approvedAt, ... }]` – full history, apply flow ke liye.
- **C) Don't store – compute on demand:** Har baar eligibility check karke rank derive karo. User document mein kuch nahi.

**Edge case:** Agar B select kiya – ek user ke multiple rank entries (Rank 1 approved, Rank 2 pending)? Ya sirf highest rank hi array mein?

**Answer:** _____________

---

**Q5: Agar `User.ranks[]` use karein – status values kya honge?**

**Exact puchna hai:** Designations mein PENDING, APPROVED, REJECTED, INACTIVE, DELETED hai. Ranks ke liye same ya alag?

**Options (ek select karo):**
- **A) Same as Designations:** PENDING | APPROVED | REJECTED | INACTIVE | DELETED
- **B) Simplified:** Sirf APPROVED | PENDING (reject/inactive/delete nahi chahiye)
- **C) N/A:** User.rankCode use kar rahe hain, status nahi

**Answer:** _____________

---

**Q6: Ek user ke paas kitne ranks ho sakte hain?**

**Exact puchna hai:** User ek saath multiple ranks hold kar sakta hai? (e.g. Rank 1 + Rank 2 dono, ya sirf highest?)

**Concrete scenario:**
- Rank 1, 2, 3 sequential hain. User Rank 3 achieve karta hai. Uske paas Rank 1 aur 2 bhi count honge ya sirf Rank 3?

**Options (ek select karo):**
- **A) Sirf highest rank:** User.rankCode = 3. Rank 1, 2 implicitly achieved.
- **B) Multiple ranks possible:** Alag categories (e.g. Sales Rank, Team Rank) – dono alag store.
- **C) Full history:** User.ranks[] mein 1, 2, 3 sab with dates.

**Answer:** _____________

---

## 4.3 Eligibility (Kab aur kaise check hogi)

---

**Q7: Eligibility kab check hogi?**

**Exact puchna hai:** System rank eligibility kab verify karega? Trigger kya hoga?

**Concrete scenario:**
- User E ne abhi 51st ACTIVE downline add kiya. Rank 2 ke liye teamSizeRequired = 50. Kab tak Rank 2 milega?

**Options (ek select karo):**
- **A) On activation (downline ki):** Jab koi naya user activate ho, uske upline sabhi ka eligibility check.
- **B) On each sale/registration:** Har registration/sale event pe upline check.
- **C) Cron job (daily/weekly):** Fixed time pe sabhi users ka batch check.
- **D) User apply pe:** Sirf jab user "Apply for Rank 2" click kare tab check. Auto kabhi nahi.

**Edge case:** 1000 users ek saath eligible ho gaye. Cron 1 AM pe chalega – sabko rank assign ho jayega ya queue/limit?

**Answer:** _____________

---

**Q8: requiredRankCode – previous rank hona zaroori hai?**

**Exact puchna hai:** Rank 2 ke liye user ke paas Rank 1 hona mandatory hai? (Current config: requiredRankCode = rankCode - 1)

**Concrete scenario:**
- User F ne directly 100 downline bana liye bina Rank 1 ke. Kya Rank 2 skip karke Rank 3 ke liye eligible? Ya pehle Rank 1, phir 2, phir 3 sequential?

**Options (ek select karo):**
- **A) Haan, sequential mandatory:** Rank 2 ke liye Rank 1 required. Skip nahi kar sakte.
- **B) Nahi, direct jump allowed:** Agar Rank 3 criteria meet ho, seedha Rank 3.
- **C) Admin override:** Normally sequential, but admin manually koi bhi rank assign kar sakta.

**Answer:** _____________

---

**Q9: requiredDesignations – downline mein designation holders ka count kaise?**

**Exact puchna hai:** Rank 2 requires: "Designation 1 ke min 5 users downline mein". Ye 5 users kaun se honge?

**Concrete scenario:**
- User G ke downline mein 10 users hain. Unme se 6 ke paas Designation 1 hai – 4 APPROVED, 2 PENDING. Count = 4 ya 6?

**Options (ek select karo):**
- **A) Sirf ACTIVE + APPROVED:** User.status = 1 AND designations.status = "APPROVED". PENDING/REJECTED count nahi.
- **B) APPROVED + INACTIVE bhi:** INACTIVE designation holders bhi count.
- **C) PENDING bhi count:** Jo apply kar chuke, unko bhi count.

**Technical:** `User.countDocuments({ _id: { $in: downlineIds }, status: 1, "designations": { $elemMatch: { designationCode: 1, status: "APPROVED" } } })` – ye query sahi hai?

**Answer:** _____________

---

**Q10: selfSaleRequired, teamSizeRequired, monthlyTarget – data kahan se aayega?**

**Exact puchna hai:** In fields ke liye values ka source kya hai? Kaunsi table/aggregation?

**Concrete scenario:**
- Rank 2: selfSaleRequired = 5000, teamSizeRequired = 50, monthlyTarget = 10000.
- selfSaleRequired = user ne khud kitna sell kiya? Kahan se fetch? (Activation amount? Product sale? Custom?)
- monthlyTarget = current month ki downline sales? Kis table se?

**Options (per field – specify):**
- **selfSaleRequired:** (A) Registration fee jo user ne pay kiya, (B) Downline activations ka sum, (C) Product/order table se, (D) Abhi use nahi – 0
- **teamSizeRequired:** (A) User.totalDownlineCount (cached), (B) UserHierarchy se live count, (C) Sirf ACTIVE status wale
- **monthlyTarget:** (A) Activation amounts ka monthly sum, (B) Order/sale table aggregation, (C) Abhi use nahi – 0

**Answer:** _____________

---

**Q11: Capping – rank commission par limit?**

**Exact puchna hai:** WalletSettings.ranks[].capping = 5000. Matlab kya?

**Concrete scenario:**
- Rank 2 commission 10% hai. User H ko is month 1 lakh ka rank income banta hai (10% of 10L). Capping 50000 hai.
- User H ko kitna milega – 1L ya 50K?

**Options (ek select karo):**
- **A) Per user per month cap:** Har user har month max capping amount tak commission.
- **B) Per user lifetime cap:** Total lifetime rank income capping tak.
- **C) Per rank global cap:** Sabhi Rank 2 users mila ke total max capping.
- **D) Capping use nahi – 0 = unlimited.**

**Answer:** _____________

---

## 4.4 Apply + Admin Flow (agar Designations jaisa flow)

---

**Q12: User apply karega ya system auto assign karega?**

**Exact puchna hai:** Q1 se link – agar Apply+Approve flow hai, toh user ko button dikhega. Agar Auto hai, toh nahi.

**Answer:** _____________ (Q1 ke answer ke hisaab se)

---

**Q13: Admin ko rank applications pe kya actions milenge?**

**Exact puchna hai:** Admin Designation Management jaisa – Approve, Reject, Set Inactive, Delete. Ranks ke liye same?

**Options (sab jo chahiye select karo):**
- Approve
- Reject
- Set Inactive
- Delete (soft)
- Koi bhi nahi (fully auto flow)

**Answer:** _____________

---

**Q14: Remarks mandatory kahan?**

**Exact puchna hai:** Reject/Delete karte waqt admin ko remarks likhna zaroori hai? (Designations mein hai)

**Options (ek select karo):**
- **A) Reject + Delete dono pe mandatory**
- **B) Sirf Delete pe mandatory**
- **C) Optional sab jagah**

**Answer:** _____________

---

**Q15: Re-apply allowed? (REJECTED/INACTIVE/DELETED ke baad)**

**Exact puchna hai:** User ne Rank 2 apply kiya, reject ho gaya. Dubara apply kar sakta hai?

**Options (ek select karo):**
- **A) Haan, turant:** Reject ke baad same rank ke liye dubara apply.
- **B) Haan, lekin X days baad:** Cooldown period.
- **C) Nahi:** Ek baar reject = forever. Admin manually assign karega agar chahiye.

**Answer:** _____________

---

## 4.5 Commission & Income

---

**Q16: Rank commission kab credit hoga?**

**Exact puchna hai:** `distributeRankIncome(userId, rankCode, amount)` kab call hoga? Kis event pe?

**Concrete scenario:**
- User I ka Rank 2 hai. Uske downline mein koi activate hua. User I ko rank commission kab milega?

**Options (ek select karo):**
- **A) Har downline activation pe:** Jab bhi koi activate ho, upline ko unke rank ke hisaab se commission.
- **B) Monthly payout:** Month end pe sabka rank income calculate karke credit.
- **C) Sale/order pe:** Product sale hone pe.
- **D) Abhi rank income use nahi:** Future phase.

**Answer:** _____________

---

**Q17: Rank commission ka amount kis event se aata hai?**

**Exact puchna hai:** `distributeRankIncome(userId, rankCode, amount)` – ye `amount` kya hai? Kis calculation se?

**Concrete scenario:**
- Downline activation hua, registration fee 5000. Rank 2 commission 10%. amount = 500?

**Options (ek select karo):**
- **A) Registration fee ka %:** activation amount × rankConfig.commissionPercent / 100
- **B) Fixed amount per activation:** Config mein fixed value
- **C) Downline sale/order se:** Product value ka %
- **D) Kuch aur (specify):** _____________

**Answer:** _____________

---

**Q18: Rank commission kis wallet mein jayega?**

**Exact puchna hai:** Level commission LEVEL_1, LEVEL_2... wallets mein jata hai. Rank commission?

**Options (ek select karo):**
- **A) MAIN wallet:** Designations jaisa – sab MAIN mein. RANK_1, RANK_2 separate wallets nahi.
- **B) Separate RANK_X wallets:** Club jaisa – User.wallet.clubBalances mein RANK_1, RANK_2 keys.

**Answer:** _____________

---

## 4.6 UI & UX

---

**Q19: User portal mein Rank section kahan hoga?**

**Exact puchna hai:** User ko apna rank kahan dikhega? Sidebar link kya hoga?

**Options (ek select karo):**
- **A) Dashboard pe:** Card/section ke form mein current rank
- **B) Profile page pe:** Profile ke andar rank display
- **C) Alag "Ranks" page:** Designations jaisa – /user/ranks – full page
- **D) Multiple:** Dashboard + alag page dono

**Answer:** _____________

---

**Q20: User ko kya kya dikhega?**

**Exact puchna hai:** Rank page/section mein UI elements list karo.

**Checklist (jo chahiye tick karo):**
- [ ] Current rank name + badge
- [ ] Next rank eligibility (progress: 45/50 team size)
- [ ] "Apply for Rank X" button (agar apply flow)
- [ ] Rank history (agar User.ranks[] with history)
- [ ] Commission earned this month
- [ ] Kuch aur: _____________

**Answer:** _____________

---

**Q21: Admin – Rank management alag page ya Wallet Settings ke andar?**

**Exact puchna hai:** Designations: AdminDesignationManagement alag page hai (applications list, approve/reject). Ranks ke liye?

**Options (ek select karo):**
- **A) Alag page:** Admin Rank Management – applications list, filters, actions. Route: /admin/ranks
- **B) Wallet Settings ke andar:** Sirf config (add/edit rank) – applications nahi. Agar auto flow hai toh yahi enough.
- **C) Dono:** Config Wallet Settings mein, applications alag page.

**Answer:** _____________

---

## 4.7 Edge Cases (Config change, delete, invalid state)

---

**Q22: Admin ne Rank 3 delete kar diya. User J ka User.rankCode = 3 hai. Kya hoga?**

**Exact puchna hai:** Rank config se delete = existing users ka rank invalid?

**Options (ek select karo):**
- **A) User.rankCode = 2 (previous):** Downgrade to last valid rank.
- **B) User.rankCode = null/0:** Rankless. Admin manually assign karega.
- **C) Delete allow nahi:** Agar kisi user ka rank 3 hai, delete block. Pehle sabko migrate karo.
- **D) User.rankCode = 3 rehne do:** Config se delete but user ke paas stale value. Display pe "Rank 3 (discontinued)"?

**Answer:** _____________

---

**Q23: Rank 2 requires Designation 1 (min 5). Admin ne Designation 1 delete kar diya. Kya hoga?**

**Exact puchna hai:** requiredDesignations mein jo designation config se delete ho jaye – eligibility invalid?

**Options (ek select karo):**
- **A) Rank 2 ki eligibility check skip:** requiredDesignations empty ho to rule ignore. Sab eligible.
- **B) Rank 2 ki eligibility fail:** Designation 1 exist nahi karta, toh koi Rank 2 eligible nahi.
- **C) Rank config edit强制:** Designation delete se pehle Rank 2 se requiredDesignations remove karna zaroori. Validation add karo.

**Answer:** _____________

---

**Q24: Rank 1 – koi prerequisite? Naya user kab Rank 1 banega?**

**Exact puchna hai:** requiredRankCode = null for Rank 1. Toh Rank 1 ke liye kya chahiye?

**Concrete scenario:**
- User K naya register + activate. Rank 1 ke liye selfSaleRequired = 0, teamSizeRequired = 0. Kya turant Rank 1?

**Options (ek select karo):**
- **A) Activation = Rank 1:** Koi aur condition nahi. Activate = Rank 1.
- **B) Activation + isPaid = true:** Payment confirm hone ke baad.
- **C) Kuch aur eligibility:** Rank 1 ke liye bhi min direct count, etc. Specify: _____________

**Answer:** _____________

---

## Summary – Implementation ke liye Final Answers

| Q# | Topic | Answer |
|----|-------|--------|
| Q1 | Flow type | |
| Q2 | Rank 1 kab | |
| Q3 | Downgrade | |
| Q4 | User storage | |
| Q5 | Status values | |
| Q6 | Multiple ranks | |
| Q7 | Eligibility trigger | |
| Q8 | requiredRankCode | |
| Q9 | requiredDesignations count | |
| Q10 | selfSale/teamSize/monthlyTarget source | |
| Q11 | Capping | |
| Q12 | Apply vs Auto | |
| Q13 | Admin actions | |
| Q14 | Remarks | |
| Q15 | Re-apply | |
| Q16 | Commission trigger | |
| Q17 | Commission amount source | |
| Q18 | Wallet (MAIN vs RANK_X) | |
| Q19 | User UI location | |
| Q20 | User UI elements | |
| Q21 | Admin UI | |
| Q22 | Rank delete – existing users | |
| Q23 | Designation delete – rank eligibility | |
| Q24 | Rank 1 prerequisite | |

---

**QA meeting ke baad:** Ye table fill karo aur `RANK_DEEP_QA_QUESTIONS.md` mein merge karo. Phir implementation start karo.
