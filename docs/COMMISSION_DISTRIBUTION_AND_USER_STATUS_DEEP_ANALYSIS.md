# Commission Distribution + User Status (Sponsor 1|4, Commission gate status=1&isPaid) Deep Analysis

Date: 2026-03-20

This doc answers:
1) Commission kaise distribute hota hai (exact code-paths, eligibility, idempotency, formulas).
2) Sponsor eligibility: `status = 1` ya `status = 4` user “new user add/sponsor” kar sakta hai?

---

## 0) Core Concepts / Definitions

### User `status` meaning (from `server/models/User.js`)
- `status = 1` => Active
- `status = 2` => Inactive
- `status = 3` => Blocked
- `status = 4` => New

User `isPaid`:
- `true` => sponsor/eligible payouts ke liye “paid” condition satisfy karta hai
- `false` => eligibility fail

Source: `server/models/User.js` (`status` enum comment + default).

### Commission engines (wallet transaction types)
Wallet ledger me these types relevant hain:
- `ACTIVATION` (DEBIT): activation fee ko debit karna
- `LEVEL_INCOME` (CREDIT): upline ko level commission
- `RANK_INCOME` (CREDIT): monthly/period rank payout
- `SBI_PRO_COMMISSION` (CREDIT to trainer wallet in service; type name used by idempotency)
- `COUNSELLING_COMMISSION` (CREDIT to counsellor wallet in service)

Source: `server/models/WalletTransaction.js` (`TX_TYPES` list).

---

## 1) Activation trigger: jab user “active” hota hai (status=4 -> status=1)

### 1.1 Where activation trigger hota hai?
Activation is not directly done from registration; instead it is “transfer-based”.

Flow:
1. A user receives MAIN wallet credit via `WalletController.transfer()`
2. Agar recipient `toUser.status === 4` ho, then `maybeTriggerWalletActivation(toUserId)` run hota hai

Source: `server/routes/user/Controllers/WalletController.js`
- `transfer()` me:
  - `if (walletKey === "MAIN" && toUser.status === 4) { const activationResult = await maybeTriggerWalletActivation(toUserId); ... }`

### 1.2 Activation eligibility checks (`maybeTriggerWalletActivation`)
`maybeTriggerWalletActivation(userId)` activation tabhi trigger karega jab:
- `user.status === 4` (new user)
- `user.isPaid !== true` (already paid nahi ho)
- `existingActivationDebit` already exist na ho (idempotency)
- `WalletSettings.registrationFee > 0`
- receiver wallet balance >= registrationFee

Source: `server/services/levelCommissionService.js` (`maybeTriggerWalletActivation`)
- Check examples:
  - `if (!user || user.status !== 4 || user.isPaid === true || existingActivationDebit) return { activated: false }`
  - `if (balance < registrationFee) return { activated: false }`

### 1.3 Atomic execution + idempotency
Activation + level distribution ek MongoDB transaction me hota hai.

Idempotency:
- `performActivationAndLevelDistribution` first checks existing `ACTIVATION` DEBIT txn for that user.
- If exists, it returns previously distributed level totals by summing old `LEVEL_INCOME` credits with requestId regex.

Source: `server/services/levelCommissionService.js`
- `existingActivationDebit` check
- previous level tx sum via regex on `requestId: /^level:...:<activatedUserId>:/`

---

## 2) LEVEL commission distribution (activation fee se unilevel payouts)

### 2.1 Activation fee debit
Activation perform karte waqt:
- `ACTIVATION` DEBIT: activatedUser ke MAIN wallet se `registrationFee` debit hota hai
- requestId: `activation:<activationEventId>:<activatedUserId>:MAIN`

Source: `server/services/levelCommissionService.js`
- `await debitMainWallet(activatedUserId, registrationFeeStr, { type: "ACTIVATION", requestId: feeReqId, ... })`

### 2.2 Level engine: `distributeLevelIncome()`
Key behavior:
- It distributes from the same activation fee using integer cents math.
- It stops when `remainingRef.value <= 0`.
- It does not “mint” extra money: it only credits from the activation fee amount.

Source: `server/services/incomeService.js`
- `commission comes from remainingAmountCentsRef; never mints. Stops when remaining <= 0.`
- In code:
  - `remainingRef.value -= commissionCents;`

### 2.3 Integer math rules (important)
- `toCents(registrationFee)` => integer cents
- commission per level:
  - `commissionCents = floor(amountCents * percent / 100)`

Source: `server/utils/financialMath.js`
- `computeCommissionCents(amountCents, percent)`
  - `return Math.floor((amountCents * p) / 100)`

### 2.4 Upline eligibility chain (chain-safe): only `status=1 & isPaid=true` earns
`getEligibleUplineChain()` climbs sponsor chain via `referredBy`.

Walk behavior:
- If current user has no `referredBy`, chain stops.
- If a sponsor document is missing, chain stops.
- If sponsor exists but sponsor `status !== 1` OR sponsor `isPaid !== true`, then the sponsor is **SKIPPED** and the walk **CONTINUES upward** (no income-loss chain break).

Source: `server/services/incomeService.js`
```js
if (sponsor.status !== 1 || sponsor.isPaid !== true) {
  // Sponsor is not eligible for commission (status must be 1 AND isPaid must be true).
  // Skip and keep walking upwards in the upline chain.
  console.log(`Skipping sponsor ${sponsor._id} (inactive/unpaid)`);
  currentId = sponsor._id;
  continue;
}
```

### 2.5 Level commission per eligible sponsor
For each eligible sponsor at level `levelNumber`:
- level percent comes from `WalletSettings.levels`
- wallet key comes from `levelConfig.walletKey` (or default `L<levelNumber>` / derived keys)
- requestId format:
  - `level:<eventId>:<activatedUserId>:<walletKey>`
- credited amount is `(commissionCents / 100).toFixed(2)`

Source: `server/services/incomeService.js` (`distributeLevelIncome`)
- `const requestId = \`level:${eventId}:${activatedUserId}:${walletKey}\`;`
- `await creditMainWallet(sponsorId, amountStr, { type: "LEVEL_INCOME", requestId, ... })`

### 2.6 After level credits: user becomes Active
At end of activation:
- `User.status = 1`
- `User.isPaid = true`
- `onUserBecameActive(activatedUserId)` runs to update team counters
- rank checks:
  - `checkActivatedUserForRank1(activatedUserId, { session })`

Source: `server/services/levelCommissionService.js`
- `await User.findByIdAndUpdate(activatedUserId, { $set: { status: 1, isPaid: true } }, { session });`

---

## 3) Team counters update on status transition (status=1 only)

When a user becomes Active (`status` changes to `1`):
- sponsor’s `directCount += 1`
- sponsor’s ancestors `totalDownlineCount += 1`

When a user becomes non-active:
- counters decrement (floor at 0)

But only ACTIVE (`status===1`) users are counted for those fields.

Source: `server/services/userStatusTransitionService.js`
- `ACTIVE_STATUS = 1`
- `directCount and totalDownlineCount represent ONLY ACTIVE users (status === 1).`

---

## 4) RANK commission distribution (monthly/period payout)

### 4.1 Where payout is triggered?
Admin uses:
`POST /api/admin/commission-payout/run`

Controller loads period bounds and calls:
- `runRankCommissionForPeriod(periodStart, periodEnd, periodKeyRes, { dryRun: false })`

Source: `server/routes/admin/Controllers/CommissionPayoutController.js`

### 4.2 Company pool calculation (formula)
Backend uses:
- `sumLevels = sum(settings.levels.commissionPercent)`
- `sumDesignations = sum(settings.designations.commissionPercent)`
- `companyProfitPercent = max(0, 100 - sumLevels - sumDesignations)`
- `activeCount` = number of activation DEBIT txns in period
- `companyProfitPool = (companyProfitPercent/100) * activeCount * registrationFee`

Source: `server/services/rankCommissionService.js`
- `companyProfitPercent = Math.max(0, 100 - sumLevels - sumDesignations)`
- `const activeCount = await getActivationsCountInPeriod(...)`
- `companyProfitPool = (companyProfitPercent / 100) * activeCount * registrationFee`

### 4.3 Rank eligibility filters (status gate)
For each configured rank:
Eligible users query requires:
- `status: 1`
- `isPaid: true`
- `rankCode: <rankCode>`

Source: `server/services/rankCommissionService.js`
- `User.find({ status: 1, isPaid: true, rankCode })`

### 4.4 Monthly target filter (extra eligibility)
If `rankConfig.monthlyTarget > 0` then each user is checked:
- `monthlyCount = getMonthlyDownlineActiveCount(userId, monthStart, monthEnd)`
- eligibility only if `monthlyCount >= monthlyTarget`

Source:
- `server/services/rankCommissionService.js`
- `server/services/rankEligibilityService.js`:
  - counts only `status: 1` downline and `createdAt` inside bounds

### 4.5 Distribution amount + capping
Per rank:
- `rankPool = companyProfitPool * (commissionPercent/100)`
- `amountToDistribute = min(rankPool, capping)` (if capping>0)
- `perUserAmount = amountToDistribute / userCount`

Then each eligible user gets a credit:
- type: `RANK_INCOME`
- requestId:
  - new path: `rank_period:<periodKey>:<userId>:RANK_<rankCode>`
  - legacy path: also checks `rank_monthly:...`

Source: `server/services/rankCommissionService.js`
- capping logic + requestId idempotency checks

### 4.6 Idempotency behavior
Before crediting each user, code checks existing `WalletTransaction` by requestId pattern.
If existing, it skips (or marks `alreadyCredited` in dry-run preview).

This means: same period + same rankCode + same userId won’t get double-credited.

---

## 5) Designation-linked commissions (Counsellor + SBI PRO)

### 5.1 Counsellor commission (Designation code = 2)
Credit occurs only when counselling session is CLOSED:
- `sess.status === "CLOSED"`
- `sess.commissionCredited` false (prevents double credit)

Amount:
- `commissionAmount = registrationFee * (designation.commissionPercent/100)`

Idempotency requestId:
- `counselling:commission:<counsellingSessionId>`

Source: `server/services/counsellorCommissionService.js`

### 5.2 SBI PRO trainer commission (Designation code = 1)
Credit occurs when SBI PRO session is CLOSED (trigger comes from session service):

Amount:
- `commissionAmount = registrationFee * (designation.commissionPercent/100)`

Idempotency requestId:
- `sbi-pro:commission:<appointmentId>`

Credits to trainer wallet via walletService credit:
- uses `walletService.creditMainWallet(trId, amountStr, options)`

Source: `server/services/sbiProCommissionService.js`

---

## 6) Club income engine: code exists, but usage not found

There is a `distributeClubIncome()` engine in `server/services/incomeService.js`
but repo-wide search me `distributeClubIncome` call site nahi mila, aur `CLUB_INCOME` credits ko drive karne wala workflow direct nahi dikh raha.

So current state me:
- LEVEL_INCOME + RANK_INCOME + Counsellor/SBI PRO commissions are clearly wired
- CLUB_INCOME engine present hai, but not confirmed as actively triggered in this codebase

Source: `server/services/incomeService.js` (engine definition)

---

## 7) Agar user ka `status != 1` ho to kya wo “new user add/sponsor” kar sakta hai?

### 7.1 Direct answer: YES (sponsor allowed for `status = 1` OR `status = 4`)
`validateReferralId()` sponsor eligibility ke liye updated gates use karta hai:
- Sponsor exists hona chahiye
- Sponsor `status` in `[1, 4]` hona chahiye
- `isPaid` ka requirement referral eligibility ke liye nahi hai

Source: `server/services/referralService.js`
```js
if (![1, 4].includes(referrer.status)) {
  return {
    valid: false,
    referrer: null,
    message: "Sponsor is not allowed to refer",
  };
}

return {
  valid: true,
  referrer,
  message: "Referral ID is valid",
};
```

### 7.2 Registration controller ka behavior
`RegisterController` me referral validation run hoti hai:
- `const referralValidation = await validateReferralId(referralIdTrimmed);`
- agar valid nahi hua:
  - it throws error, aur response me `referralId` path pe error aata hai

Source: `server/routes/user/auth/Controllers/RegisterController.js`

So: agar kisi user ka `status` 1 ya 4 nahi hai, wo apne referral ID ke through new user registration sponsor nahi kar payega.

### 7.3 Admin create-user bhi same sponsor rule follow karta hai (referralId based)
Admin `createUser` endpoint me bhi referralId present karna required hota hai,
aur code `validateReferralIdService(referralIdStr)` use karta hai.

Iska matlab:
- admin bhi referralId ke through user create kar sakta hai jab sponsor `status` 1 ya 4 me ho

Source: `server/routes/admin/Controllers/AdminUserController.js`
and `server/services/referralService.js`

### 7.4 Commission side effect (related, but different)
Even agar chain me `status = 4` / unpaid users exist karte hain:
- `LEVEL_INCOME` distribution me woh users **skip** hote hain (commission credited nahi hota), lekin upline walk **continue** karti rehti hai.
- `RANK_INCOME` payout ke liye woh users eligible query me aate hi nahi: backend uses `status: 1` and `isPaid: true`.

Source:
- `server/services/incomeService.js` (skip sponsor when status!=1 or isPaid!=true)
- `server/services/rankCommissionService.js` (query status:1, isPaid:true)

## 7.5 Final Business Matrix (Sponsor eligibility + Level commission)

| status | isPaid | Can Sponsor | Gets Commission |
| ------ | ------ | ----------- | --------------- |
| 1      | true   | ✅           | ✅               |
| 1      | false  | ✅           | ❌               |
| 4      | false  | ✅           | ❌               |
| 2 / 3  | any    | ❌           | ❌               |

## 7.6 Chain Behavior (Skip vs Break)
- **Invalid/ineligible sponsor** (exists but not `status=1 & isPaid=true`): **SKIP** and **CONTINUE** upward (no income-loss chain break).
- **Missing link or sponsor doc**: chain **stops** (safe termination when there is no further upline).

---

## 8) Summary (short)

- Commission distribution ka main backbone:
  - Transfer-based activation:
    - `WalletController.transfer()` -> `maybeTriggerWalletActivation()` -> activation debit
    - `performActivationAndLevelDistribution()` -> `distributeLevelIncome()` -> upline chain me only `status=1 && isPaid=true` gets credited (others skipped; walk continues)
  - Monthly/period rank payout:
    - admin run -> `runRankCommissionForPeriod()`
    - eligibility: `status=1 && isPaid=true && rankCode matches`
  - Counsellor/SBI PRO commissions:
    - session closure triggers
    - amount = registrationFee * designation.commissionPercent/100
- Sponsor eligibility:
  - `status=1` aur `status=4` user referral ID se sponsor kar sakte hain
  - `status=2/3` user sponsor nahi kar sakte
- Level commission eligibility:
  - Level income tabhi credited hoti hai jab upline `status=1 && isPaid=true` ho; ineligible sponsors skip hote hain

---

## 9) Open Notes / Potential Risk Areas (for deeper review later)

1) Rank commission percent semantics risk:
   - Rank service me `rankPool = companyProfitPool * (rankCommissionPercent/100)`
   - UI text also shows `commissionPercent` as “% of pool”.
   - Lekin `WalletSettings` me business rule `totalCommission (levels+ranks+clubs+designations) must not exceed 100%` treat karta hai sab ko ek hi “global percent” sense me.
   - Is mismatch ko verify karna useful hoga:
     - is `rank.commissionPercent` config ke hisaab se percent of pool hai ya percent of revenue?

2) CLUB_INCOME:
   - Engine present hai but call-sites missing hain. Hence current payout model me club percents effectively unused ho sakte hain.

---
## 10) Troubleshooting: `memberId = 9999999999-99` par Level-1 commission kyu nahi mila?

Ye section aapke doubt (“5 direct members kiye, 2 active hain, phir bhi Level-1 commission nahi mila”) ko backend code ki exact rules ke hisaab se analyze karta hai.

### 10.1 Most common root cause: “Active” ≠ “Commission eligible”
`LEVEL_INCOME` ke liye upline chain traversal (`getEligibleUplineChain`) me hard gate hai:
- `sponsor.status === 1`
- `sponsor.isPaid === true`

Agar sponsor `9999999999-99` ka `status=1` hai lekin `isPaid=false` hai, to backend us sponsor ko level-1 par `SKIP` karta hai aur upline me upar walk continue rehta hai (no break, but credit nahi).

Source: `server/services/incomeService.js` (`getEligibleUplineChain`)

### 10.2 Level-1 commission tabhi generate hota hai jab downline “activation” kare (status=4 -> status=1)
Activation trigger (`maybeTriggerWalletActivation`) sirf tab chalti hai jab:
- downline `status === 4` (New)
- downline `isPaid !== true`
- registration fee > 0
- downline wallet balance >= registration fee

Iska matlab:
- Agar aapke direct referrals “active” (status=1) hain *lekin unka activation flow (status 4 -> 1 + isPaid true) run nahi hua*, to level credits generate hi nahi honge.
- Iske baad commission retroactively re-issue nahi hota (idempotency: activation debit exist hone par rerun se duplicate level credits nahi bante).

Source:
- `server/services/levelCommissionService.js` (`maybeTriggerWalletActivation`)
- `server/services/levelCommissionService.js` (`performActivationAndLevelDistribution` existing `ACTIVATION` debit check)

### 10.3 Level-1 sponsor mapping `referredBy` se hoti hai
Level-1 sponsor = immediate upline jo downline ka `referredBy` field me set hota hai.
Closure table (`UserHierarchy`) ka direct use level income me nahi dikh raha; `getEligibleUplineChain()` `User.findById(currentId)` karke `user.referredBy` se next sponsor pick karta hai.

Source: `server/services/incomeService.js` (`getEligibleUplineChain`)

### 10.4 Verification checklist (aapko exact root-cause yahan se confirm ho jayega)
#### A) Sponsor `9999999999-99` ka eligibility check (status + isPaid)
```js
db.users.findOne(
  { memberId: "9999999999-99" },
  { memberId: 1, status: 1, isPaid: 1, _id: 1 }
)
```
Expected (credit ke liye): `status: 1` and `isPaid: true`

#### B) Downlines (jinhe “active” bola) par activation debit exist karta hai?
```js
// downlineMemberId ko replace karein
const downline = db.users.findOne({ memberId: "<DOWNLINE_MEMBER_ID>" }, { _id: 1 });

db.wallet_transactions.find(
  { userId: downline._id, type: "ACTIVATION", direction: "DEBIT" }
).sort({ createdAt: -1 }).limit(5);
```
Expected: `ACTIVATION` debit ka record exist hona chahiye. Nahi hai to level-1 credit generate hi nahi hua hoga.

#### C) Downlines ka `referredByMemberId` (immediate sponsor) `9999999999-99` hai?
```js
db.users.find(
  { memberId: { $in: ["<DOWNLINE1_MEMBER_ID>", "<DOWNLINE2_MEMBER_ID>"] } },
  { memberId: 1, referredByMemberId: 1, referredBy: 1, status: 1, isPaid: 1 }
);
```
Expected: `referredByMemberId === "9999999999-99"` dono downlines ke liye.

### 10.5 “Sabse likely” conclusion (agar aapke data ke hisaab se match kare)
Backend rules ke hisaab se aapke case me top 3 possibilities:
1) `9999999999-99` ka `isPaid=false` tha at time of downline activation -> level-1 `SKIP`
2) “Active” direct downlines ka activation flow run hi nahi hua (status=4 -> 1) -> no level credits ever generated
3) Downline ka immediate upline (`referredBy`) `9999999999-99` nahi hai -> level-1 me aayega hi nahi

### 10.6 Deep check: `isSystemRoot` = true hone se commission par koi special block hota hai?
Short answer: `isSystemRoot` ka role commission eligibility me **directly** nahi hai.

Backend behavior:
1) `getEligibleUplineChain()` me commission credit ka gate sirf yahi hai:
   - sponsor `status === 1`
   - sponsor `isPaid === true`
   (`isSystemRoot` use nahi hota.)
2) `isSystemRoot` sirf `User` model ki constraints/creation safekeeping ke liye relevant hai:
   - Root ke alawa kisi aur ko `isSystemRoot=true` nahi allowed
   - Root (`memberId === ROOT_MEMBER_ID`) ke liye `referredBy` required nahi hai

Iska practical matlab:
- Agar aapka `memberId=9999999999-99` wala user true me **ROOT_MEMBER_ID** hai, to Level-1 credit tab milega jab:
  - Root document ka `status=1` ho
  - Root document ka `isPaid=true` ho
  - Downline ka `referredByMemberId === "9999999999-99"` ho
- Agar root ka `isPaid=false` hai (even `status=1`), to root sponsor ko `getEligibleUplineChain` me SKIP kar diya jayega.

Verification queries (root-specific):
#### A) Root doc ki actual eligibility
```js
db.users.findOne(
  { memberId: "9999999999-99" },
  { memberId: 1, status: 1, isPaid: 1, isSystemRoot: 1, referredByMemberId: 1 }
)
```
Expected for root Level-1 credits:
- `isSystemRoot: true`
- `status: 1`
- `isPaid: true`

#### B) Downline direct referrals ka sponsor mapping
```js
db.users.find(
  { memberId: { $in: ["<DOWNLINE1_MEMBER_ID>", "<DOWNLINE2_MEMBER_ID>"] } },
  { memberId: 1, referredByMemberId: 1, status: 1, isPaid: 1 }
)
```
Expected:
- `referredByMemberId: "9999999999-99"`

#### C) Downline activation really hui thi ya nahi (necessary for any level credits)
```js
db.wallet_transactions.find(
  { userId: ObjectId("<DOWNLINE_DOC_ID>"), type: "ACTIVATION", direction: "DEBIT" }
).sort({ createdAt: -1 }).limit(5);
```
Expected:
- `ACTIVATION` debit मौजूद hona chahiye; warna level credits generate hi nahi honge.

