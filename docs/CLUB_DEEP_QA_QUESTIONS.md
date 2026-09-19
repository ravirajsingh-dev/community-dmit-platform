# Club System - Deep QA Questions (Answer Template)

> Purpose: In sab questions ke answers lock hone ke baad hi `club` ko `rank` jaisa end-to-end implement karna safe rahega.

> Instructions:
> - Har question ke niche `Answer:` wali blank line fill karo.
> - If option-based hai, to ek option select karke usi ke format me likho (e.g. `A`, `B`, `C`).
> - Implementation ke time in answers ko code/spec me convert kiya jayega.

---

## 1) Flow Type / Life-cycle

### Q1: Club payout flow kya hoga - Auto ya Apply+Approve?
**Exact puchna hai:** Jab eligibility meet ho jaye, tab club income ka credit kaise trigger hoga?

**Concrete scenario:**
- Club X ke eligibility criteria meet ho gaye (minimumRankCode/selfSaleRequired/monthlyTarget etc).
- Ab club income credit kab hoga?

**Options (ek select karo):**
- **A) Fully Auto (Admin run/cron):** Eligible users ko period-end cron/admin “Run payout” se credit
- **B) Apply + Admin Approve:** User apply kare, admin approve kare, phir credit
- **C) Hybrid:** Kuch clubs auto, kuch clubs apply+approve

**Edge case:** Eligibility beech me change ho jaye (monthlyTarget miss ho jaye). Approve/credit me kya behavior?

`Answer: A) Fully Auto (Admin run/cron)`
Period-end (monthly) payout run/cron se credit hoga. Har month eligibility re-check hogi:
- Month me eligible hua => us month ka club payout milega.
- Next month eligible nahi hua => us month payout nahi milega.
- Future month me dubara eligible hua => us month ka payout normally milega.

---

### Q2: Club membership/clubCode store karna hai ya compute on demand?
**Options:**
- **A) Store club status on User** (e.g. `user.clubCodes[]` with active flags)
- **B) Do not store**: har payout ke time WalletSettings.clubs ke criteria se eligibility compute
- **C) Store only for display** but eligibility payout time pe re-check

`Answer: B) Do not store`
Club eligibility payout ke time `WalletSettings.clubs` se compute hogi (source of truth wallet settings hi rahega).

---

### Q3: Club downgrade possible hai?
**Exact puchna hai:** Agar user ki eligibility lose ho jaye to kya club status downgrade/expire hoga?

**Options:**
- **A) Nahi downgrade** (once gained remains forever)
- **B) Eligibility lose = downgrade/expire** (next payout pe eligible nahi rahega)
- **C) Manual admin override only**

`Answer: A) Nahi downgrade`
Once gained remains forever as membership context; club eligibility payout per-period re-check hogi.
Jis club wallet me amount aa chuka hai, wo expire nahi hoga.

---

## 2) Eligibility Gates (exact semantics)

### Q4: Eligibility ka base gate kya hoga?
**Exact puchna hai:** Club income ka credit start karne se pehle kya gates apply karne hain?

**Options:**
- **A) `status=1` AND `isPaid=true`** only
- **B) `status=1` only** (isPaid ignored)
- **C) status 1 & 4 both allowed**

`Answer: A) status=1 AND isPaid=true only`
Aur wallet settings ka club section hi source of truth rahega (rank jaisa).

---

### Q5: `minimumRankCode` ka meaning kya hoga?
**Concrete scenario:**
- Club X me `minimumRankCode = 3`
- User ka current `rankCode = 2`

**Options:**
- **A) Eligible if `rankCode >= minimumRankCode`**
- **B) Eligible if `rankCode == minimumRankCode`**
- **C) Eligible if `rankCode > minimumRankCode`**
- **D) If null => always eligible**

`Answer: A) Eligible if rankCode >= minimumRankCode`

---

### Q6: `selfSaleRequired` club me directCount ke basis pe hai?
**Exact puchna hai:** club eligibility me `selfSaleRequired` ka source kya hoga?

**Options:**
- **A) Direct ACTIVE users count**: `User.directCount >= selfSaleRequired`
- **B) Downline total ACTIVE count**: `User.totalDownlineCount >= selfSaleRequired`
- **C) Monthly direct activations** (createdAt-based)
- **D) Use nahi karna (0/ignore)**

`Answer: A) Direct ACTIVE users count: User.directCount >= selfSaleRequired`

---

### Q7: `monthlyTarget` club me kaise check hoga?
**Exact puchna hai:** Club monthlyTarget = new ACTIVE downline users count, ya direct count, ya kuch aur.

**Concrete scenario:**
- Club X me `monthlyTarget = 10`
- Commission run period: March
- User ke downline me March me new ACTIVE users = 12

**Options:**
- **A) `getMonthlyDownlineActiveCount(uid, monthBounds) >= monthlyTarget`** (rank jaisa)
- **B) Monthly direct active count >= monthlyTarget**
- **C) Monthly team sales/orders based aggregation**
- **D) MonthlyTarget irrelevant (ignore)**

`Answer: A) getMonthlyDownlineActiveCount(uid, monthBounds) >= monthlyTarget (rank jaisa)`

---

### Q8: `isAdminOnly` club ka exact behavior kya hai?
UI hint: “If checked: club excluded from user eligibility. Still included in commission 100% cap.”

**Exact puchna hai:** payout run me isAdminOnly ke users ko kaise handle karna hai?

**Options:**
- **A) Users eligible list se club exclude => club income kisiko nahi milega**
- **B) Eligible users list exclude, but admin/company wallet ko club income milega** (confirm recipient)
- **C) Only admin accounts allowed (if admin has wallets)**
- **D) UI wording wrong; it means withdrawal rules only**

`Answer: C) Only admin accounts allowed`
`isAdminOnly` club ka payout sirf admin user ko credit hoga (`isSystemRoot=true`).

---

## 3) Commission Calculation / Payout Math

### Q9: Pool semantics - club commissionPercent kya hai?
Rank doc risk: “% of pool vs % of revenue” ambiguity.

**Options:**
- **A) Percent of computed `companyProfitPool`** (same as rank)
- **B) Percent of total activation revenue** (direct)
- **C) Fixed amount per eligible user** (not percentage)

`Answer: A) Percent of computed companyProfitPool (same as rank)`

---

### Q10: `capping` club me kaise apply hoga?
**Options:**
- **A) Per club global cap for the period** (clubPool min(cap, pool))
- **B) Per user cap** (max payout per eligible user per period)
- **C) Lifetime cap**
- **D) No cap**

`Answer: A) Per club global cap for the period`
Monthly capping same as rank:
- Period club amount > capping => sirf capping amount distribute hoga.
- `perUser = cappedAmount / eligibleUserCount`.

---

### Q11: eligible users share divide ka rule kya hoga?
**Options:**
- **A) `perUser = amountToDistribute / eligibleUserCount`** (equal split)
- **B) weighted split (by something like rank/selfSale/monthly contributions)**
- **C) fixed per-user slab (not equal)**

`Answer: A) perUser = amountToDistribute / eligibleUserCount (equal split, same as rank)`

---

### Q12: Club income credit kis wallet me hoga?
**Options:**
- **A) CLUB wallet only**: `WalletTransaction.type=CLUB_INCOME` + `walletKey=club.walletKey`
- **B) MAIN wallet only**
- **C) Both (split)**

`Answer: A) CLUB wallet only`
`WalletTransaction.type=CLUB_INCOME` + `walletKey=club.walletKey`.
Eligibility ke hisab se user ke liye separate club wallets (walletKey-wise) create/use honge.

---

## 4) Idempotency / requestId Format (important)

### Q13: Club payout run me idempotency requestId format kya hoga?
**Exact puchna hai:** requestId ka pattern stable rahe, aur `walletService.validateRequestId()` ko pass kare.

**Options:**
- **A) `club_<periodType>:<periodKey>:<userId>:<CLUB_KEY>`**
- **B) `club_monthly:<YYYY-MM>:<userId>:<CLUB_KEY>`**
- **C) Extend `validateRequestId()` to accept `club_period:...` and use it**

`Answer: A) club_<periodType>:<periodKey>:<userId>:<CLUB_KEY> (same as rank style)`

---

## 5) Trigger / Schedule / Admin APIs

### Q14: Club payout scheduling ka source kya hoga?
**Options:**
- **A) Same as rank:** `/api/admin/commission-payout/run` via `WalletSettings.commissionPayoutSettings.scheduleType`
- **B) Separate scheduling**
- **C) Only manual run**

`Answer: A) Same as rank`
`/api/admin/commission-payout/run` via `WalletSettings.commissionPayoutSettings.scheduleType`.

---

### Q15: Preview endpoint ka behavior kya hoga?
Rank has preview/dry-run that returns eligible users + perUser amounts.

**Options:**
- **A) Club preview also returns eligible users list + breakdown**
- **B) Preview only summary totals**

`Answer: A) Club preview also returns eligible users list + breakdown`

---

## 6) Eligibility Computation Inputs (Data Sources)

### Q16: Club eligibility computation kitni expensive ho sakti hai?
**Options:**
- **A) Closure table based downline counts** (rankEligibilityService jaisa)
- **B) directCount/totalDownlineCount cached fields only**
- **C) Aggregations on wallet transactions/orders**

`Answer: A) Closure table based downline counts (rankEligibilityService jaisa)`

---

## 7) Edge Cases (must clarify)

### Q17: Club config change (edit/delete) existing users par impact?
**Options:**
- **A) Next payout uses latest config only**
- **B) Backfill previous period payouts using old config snapshot (hard)**
- **C) Freeze config per periodKey**

`Answer: A) Next payout uses latest config only`
Har month fresh period-based recomputation hoga.

---

### Q18: Club deleted while some users eligible in old period?
**Options:**
- **A) No effect on already credited txns (ledger immutable)**
- **B) Re-run/adjustments blocked**
- **C) Something else**

`Answer: A) No effect on already credited txns (ledger immutable)`

---

### Q19: requestId collision / partial run (dry-run then run)?
**Options:**
- **A) Dry-run marks “alreadyCredited” but no credits written; run later should work cleanly**
- **B) Dry-run creates txns**

`Answer: A) Dry-run marks alreadyCredited but no credits written; run later should work cleanly (same as rank)`

---

## 8) UI/UX scope (minimum needed)

### Q20: User portal me “Club eligibility/status” dikhani hai ya sirf club balance/transactions?
**Options:**
- **A) Only balances + club income transactions (existing wallet pages already show wallet tx)**
- **B) Also show eligibility + next payout expected amount**
- **C) Full membership history**

`Answer: B) Also show eligibility + next payout expected amount`
Saath me wallet balances/club transactions bhi visible rahenge; user ko progress and conditions clear dikhni chahiye.

---

## Final Answer Table (Copy/paste and fill)

| Q# | Topic | Answer |
|---|-------|--------|
| Q1 | Club flow type | A (Fully Auto; monthly period re-check) |
| Q2 | Store membership vs compute | B (Do not store; compute from WalletSettings.clubs) |
| Q3 | Downgrade/expire behavior | A (No downgrade; payout still period-eligibility based) |
| Q4 | Base eligibility gate | A (`status=1` AND `isPaid=true`) |
| Q5 | minimumRankCode logic | A (`rankCode >= minimumRankCode`) |
| Q6 | selfSaleRequired source | A (Direct ACTIVE users count via `directCount`) |
| Q7 | monthlyTarget logic | A (`getMonthlyDownlineActiveCount(...) >= monthlyTarget`) |
| Q8 | isAdminOnly behavior | C (Only admin account; `isSystemRoot=true`) |
| Q9 | commissionPercent semantics | A (% of `companyProfitPool`) |
| Q10 | capping logic | A (Per-period global cap; monthly) |
| Q11 | eligible split rule | A (Equal split) |
| Q12 | wallet credit target | A (CLUB wallet; `CLUB_INCOME` + `walletKey`) |
| Q13 | requestId format | A (`club_<periodType>:<periodKey>:<userId>:<CLUB_KEY>`) |
| Q14 | scheduling source | A (Same as rank commission run settings) |
| Q15 | preview output | A (Eligible users list + breakdown) |
| Q16 | data sources allowed | A (Closure table based counts) |
| Q17 | config change impact | A (Next payout uses latest config) |
| Q18 | club delete effect | A (No impact on credited immutable ledger) |
| Q19 | dry-run vs run edge | A (Dry-run no write; run remains clean) |
| Q20 | UI scope | B (+ balances/transactions visibility) |

---

## Implementation Checklist (Post-QA)

1) `Club eligibility service` implement/extend  
2) `Club commission service` (pool -> rank-like distribution + capping + idempotency)  
3) `Admin preview/run/history` endpoints (rank commission-payout parity)  
4) `requestId validation` update if required to support club patterns  
5) Add/adjust scripts for cron if used in production  

