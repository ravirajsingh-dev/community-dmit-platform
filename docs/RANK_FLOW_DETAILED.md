# Rank Flow - पूरी Details (क्या, कैसे, कब, कहाँ)

यह document Rank system की complete flow, eligibility, credit timing और edge cases की detail देता है।

---

## Table of Contents

1. [Overview](#overview)
2. [Rank Eligibility – कौन किस Rank के लिए Eligible](#rank-eligibility)
3. [Rank Push Flow – Rank कब और कैसे Assign होती है](#rank-push-flow)
4. [Credit Flow – Rank Reward कब Credit होता है](#credit-flow)
5. [Configuration (WalletSettings)](#configuration)
6. [Kuch Galat To Nahi?](#kuch-galat-to-nahi--quick-check)
7. [Potential Issues / Edge Cases](#potential-issues)
8. [Debugging Checklist](#debugging-checklist)

---

## Overview

| चीज़            | Detail                                                           |
| --------------- | ---------------------------------------------------------------- |
| **Rank Assign** | Auto – activation के बाद eligibility check                       |
| **Downgrade**   | नहीं – एक बार rank मिली तो revert नहीं होती                      |
| **Credit**      | Monthly cron – previous month के लिए                             |
| **Source**      | `rankService`, `rankEligibilityService`, `rankCommissionService` |

---

## Rank Eligibility

**File:** `server/services/rankEligibilityService.js`

किसी user को next rank के लिए check होने वाली सारी conditions:

### 1. `requiredRankCode`

- Rank 2 के लिए Rank 1 जरूरी
- Rank 3 के लिए Rank 2 जरूरी
- Rank 1 के लिए: null (कोई previous rank नहीं चाहिए)

### 2. `selfSaleRequired`

- Direct ACTIVE referrals की count ≥ `selfSaleRequired`
- Data: `User.directCount`

### 3. `teamSizeRequired`

- Total downline में ACTIVE users की count ≥ `teamSizeRequired`
- Data: `User.totalDownlineCount`
- Source: `UserHierarchy` (closure table) से downline count

### 4. `monthlyTarget`

- **इसी calendar month** में downline में **नए ACTIVE** users की count ≥ `monthlyTarget`
- Logic: downline users जहाँ `status=1` और `createdAt` इसी month के अंदर
- Data: `getMonthlyDownlineActiveCount()` से आता है

### 5. `requiredDesignations`

- Downline में specific designation के min X users चाहिए
- Format: `[{ designationCode: 1, minCount: 1 }]`
- Check: downline में `designations` array में `designationCode` + `status: "APPROVED"`

सभी conditions pass होने पर ही `eligible: true` मिलता है।

---

## Rank Push Flow

**File:** `server/services/rankService.js`

### Flow 1: Naya User Activate हुआ → Rank 1 Check

```
Registration → status=4, isPaid=false
     ↓
Activation (maybeTriggerWalletActivation)
     ↓
performActivationAndLevelDistribution
     ↓
User: status=1, isPaid=true
     ↓
onUserBecameActive (directCount, totalDownlineCount update)
     ↓
checkActivatedUserForRank1(activatedUserId)  ← same flow में
     ↓
agar Rank 1 eligibility pass → User.rankCode = 1
```

**Call sites:**

- `levelCommissionService.js` – `performActivationAndLevelDistribution` के अंत में
- सिर्फ उस user के लिए जो अभी activate हुआ

### Flow 2: Upline Ka Rank Upgrade (Activation के बाद)

```
Koi downline user activate hua
     ↓
maybeTriggerWalletActivation(userId) return { activated: true }
     ↓
checkUplinesRankOnActivation(userId)  ← Background (setImmediate)
     ↓
getAncestorIds(activatedUserId) → sab uplines
     ↓
Filter: status=1, isPaid=true
     ↓
Har upline ke liye: checkAndUpgradeRank(aid)
     ↓
checkRankEligibility → agar eligible → rankCode upgrade
```

**Important:**

- `checkUplinesRankOnActivation` **background** में चलता है (non-blocking)
- Sequential upgrade ही होता है (Rank 0→1, 1→2, 2→3)

### Rank Upgrade Logic (`checkAndUpgradeRank`)

- Current rank = X तो अगला rank = X+1
- `checkRankEligibility(uid, nextRankCode, ...)` चलता है
- Eligible होने पर: `User.findByIdAndUpdate(uid, { $set: { rankCode: nextRankCode } })`

---

## Credit Flow

**File:** `server/services/rankCommissionService.js`  
**Cron:** `server/scripts/rankCron.js`

### Kab Chalta Hai

- हर महीने की **1 तारीख** को (अगर cron schedule है)
- Previous month के लिए
- Manual run: `node server/scripts/rankCron.js [year month]`  
  e.g. `node server/scripts/rankCron.js 2026 3` (March 2026)

### Formula

```
companyProfitPercent = 100 - sum(level commissions) - sum(designation commissions)
companyProfitPool = (companyProfitPercent/100) * activationsThisMonth * registrationFee

For each rank:
  rankPool = companyProfitPool * (rank.commissionPercent/100)
  amountToDistribute = min(rankPool, capping)   // agar capping > 0
  perUserAmount = amountToDistribute / userCount
```

### Kaun Users Credit Paate Hain

```javascript
User.find({ status: 1, isPaid: true, rankCode });
// + if monthlyTarget > 0: filter by getMonthlyDownlineActiveCount(uid, commissionMonth) >= monthlyTarget
```

- **Base:** `status === 1`, `isPaid === true`, `rankCode` match
- **monthlyTarget:** Agar rank में `monthlyTarget > 0` set hai to **इसी commission month** में downline में नए ACTIVE users की count ≥ monthlyTarget होनी चाहिए
- `monthlyTarget === 0` होने पर ye check skip (सभी rank users eligible)

### Idempotency (Duplicate Prevent)

- `requestId`: `rank_monthly:YYYY-MM:userId:RANK_X`
- अगर इसी `requestId` का transaction पहले से है तो उस user को skip

### Activation Count Source

- `WalletTransaction` में:
  - `type: "ACTIVATION"`
  - `direction: "DEBIT"`
  - `createdAt` उस month के अंदर

---

## Configuration

**Model:** `server/models/WalletSettings.js` → `ranks[]`

| Field                  | Type   | Use                               |
| ---------------------- | ------ | --------------------------------- |
| `rankCode`             | number | 1, 2, 3...                        |
| `name`                 | string | EXPERT, PROFESSIONAL, etc         |
| `commissionPercent`    | number | Company profit से %               |
| `capping`              | number | Per rank total cap (0 = no cap)   |
| `selfSaleRequired`     | number | Direct count                      |
| `teamSizeRequired`     | number | Total downline count              |
| `requiredRankCode`     | number | Previous rank (null for Rank 1)   |
| `monthlyTarget`        | number | Rank eligibility + Commission payout दोनों में (0 = skip) |
| `requiredDesignations` | array  | `[{ designationCode, minCount }]` |

---

## Kuch Galat To Nahi? – Quick Check

| Check                        | Expected                                                          | Agar Galat Hai To                                                                           |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Rank push activation ke baad | Activation → Rank 1 check (same flow) → Upline check (background) | `checkActivatedUserForRank1` / `checkUplinesRankOnActivation` call ho rahe hain verify karo |
| Credit sirf Active + Paid ko | `status=1`, `isPaid=true` (+ monthlyTarget if > 0)                 | Inactive/Unpaid / monthlyTarget fail → no credit                                            |
| Monthly credit idempotent    | Same month 2 baar run = duplicate nahi                            | `requestId` duplicate check sahi hai                                                        |
| Sequential rank              | Rank 1 → 2 → 3, skip nahi                                         | `requiredRankCode` check                                                                    |
| monthlyTarget                | Naya ACTIVE users **is month** (createdAt in month)               | `getMonthlyDownlineActiveCount` logic                                                       |
| Company profit pool          | 100 - levels - designations                                       | Agar 0 ho to rank commission bhi 0                                                          |

**Design:** Commission payout में agar `monthlyTarget > 0` hai to sirf वो users credit पाते हैं जिन्होंने commission month में downline में नए ACTIVE users की target achieve ki. `monthlyTarget === 0` होने पर सभी rank users को credit।

---

## Potential Issues

### 1. Sirf Kuch Users Ko Credit

- **Check:** `status`, `isPaid`, और `monthlyTarget` (agar > 0)
- Agar 4 Rank 1 users हैं लेकिन 2 को ही credit मिला → बाकी 2 में `status !== 1`, `isPaid !== true`, या commission month में monthlyTarget achieve nahi hua

### 2. Rank Nahi Push Hui

- `requiredDesignations` fail (TRAINER etc downline में नहीं)
- `monthlyTarget` fail
- `requiredRankCode` fail (previous rank नहीं)
- `checkUplinesRankOnActivation` background में fail (console log check करें)

### 3. Commission Zero

- `companyProfitPercent = 0` (levels + designations = 100%)
- उस month में कोई ACTIVATION DEBIT नहीं
- Rank का `commissionPercent = 0`

### 4. Capping Lag Kar Raha Hai

- `rankPool > capping` होने पर `amountToDistribute = capping`
- Per-user amount कम हो जाता है

### 5. monthlyTarget

- **Rank eligibility:** इस month में downline में **नए ACTIVE** users ≥ monthlyTarget
- **Commission payout:** Agar `monthlyTarget > 0` hai to **commission वाले month** में downline में नए ACTIVE users ≥ monthlyTarget होना चाहिए; `monthlyTarget === 0` होने पर skip

---

## Debugging Checklist

1. **Rank assign**
   - `User.rankCode`, `status`, `isPaid` check करें
   - `rankEligibilityService.checkRankEligibility()` का output देखें

2. **Commission na milna**

   ```javascript
   // Rank 1 users jo credit ke eligible the
   db.users.find(
     { rankCode: 1, status: 1, isPaid: true },
     { memberId: 1, status: 1, isPaid: 1 },
   );

   // Jo already credit ho chuke
   db.wallettransactions.find({
     requestId: /^rank_monthly:2026-03:.*:RANK_1$/,
   });
   ```

3. **Activation count**

   ```javascript
   db.wallettransactions.countDocuments({
     type: "ACTIVATION",
     direction: "DEBIT",
     createdAt: {
       $gte: ISODate("2026-03-01"),
       $lte: ISODate("2026-03-31T23:59:59.999Z"),
     },
   });
   ```

4. **Cron logs**
   - `[Rank Cron] Distributed ₹X.XX`
   - `Rank N (name): Y users, ₹Z each`

---

## Commission Payout Schedule (Admin Configurable)

Admin can set payout schedule in **Commission Payout Management** (`/admin/commission-payout`):

| Schedule     | Kab Chalega                                      |
| ------------ | ------------------------------------------------ |
| Daily        | Har din previous day ke liye                     |
| Weekly       | Har week (day select) ke baad previous week      |
| Monthly      | Har month 1 ko previous month ke liye            |
| Custom       | Har month ki X tarik (e.g. 5 = 5 tarik ko)       |
| Quarterly    | Jan 1, Apr 1, Jul 1, Oct 1 – previous quarter    |
| Half Yearly  | Jan 1, Jul 1 – previous half                     |
| Yearly       | Jan 1 – previous year                            |

**Admin Features:** Payout schedule, ranks overview (capping, work done), preview (kis ko credit), manual run, history.

---

## Quick Reference – File Map

| Purpose                            | File                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| Rank eligibility                   | `server/services/rankEligibilityService.js`                  |
| Rank assignment                    | `server/services/rankService.js`                             |
| Commission payout                  | `server/services/rankCommissionService.js`                   |
| Commission payout admin API        | `server/routes/admin/Controllers/CommissionPayoutController.js` |
| Activation + Rank 1 + Upline check | `server/services/levelCommissionService.js`                  |
| Monthly cron                       | `server/scripts/rankCron.js`                                 |
| Flexible cron (schedule from DB)   | `server/scripts/rankCronFlexible.js`                         |
| User rank API                      | `server/routes/user/Controllers/RankController.js`           |
| Transaction description            | `server/utils/transactionDescriptionEngine.js` (RANK_INCOME) |

---

## Flow Diagram (Text)

```
[User Registers] → status=4, isPaid=false
        ↓
[Transfer/EPIN → Balance sufficient]
        ↓
maybeTriggerWalletActivation()
        ↓
performActivationAndLevelDistribution()
   ├─ ACTIVATION DEBIT
   ├─ Level commission distribute
   ├─ User: status=1, isPaid=true
   ├─ onUserBecameActive (counts update)
   └─ checkActivatedUserForRank1()
        ↓
checkUplinesRankOnActivation() [BACKGROUND]
   └─ For each upline: checkAndUpgradeRank()
        └─ checkRankEligibility() → upgrade if eligible
        ↓
[Monthly Cron - 1st of month]
rankCron.js → runMonthlyRankCommission(prevYear, prevMonth)
   └─ For each rank: credit all status=1, isPaid=true, rankCode users
   └─ requestId: rank_monthly:YYYY-MM:userId:RANK_X (idempotent)
```
