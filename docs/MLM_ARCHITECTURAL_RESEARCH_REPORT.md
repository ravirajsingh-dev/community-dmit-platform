# MLM System — Architectural Research Report

**Report Type:** Deep Structural Analysis (No Optimizations)  
**Auditor Role:** Production Financial System Architect / MongoDB Schema Auditor  
**Scope:** User, Wallet, Ledger, Level Commission, WalletSettings, Hierarchy  
**Scale Target:** 500K+ users, real-money operations  
**Date:** 2025-03-02  

---

# SECTION 1 — USER SCHEMA DEEP ANALYSIS

## 1.1 Field-by-Field Breakdown

| Field | Type | Source | Derived/Stored | Extensibility |
|-------|------|--------|---------------|---------------|
| `memberId` | String(13) | Assigned at registration | Source | Immutable, unique. No multi-ID support. |
| `name` | String(3–50) | User input | Source | Standard. |
| `phone` | String(10) | User input | Source | Immutable, indexed. Single-phone constraint. |
| `email` | String | User input | Source | Standard. |
| `alternatePhone` | String(10) | User input | Source | Optional. |
| `password` | String | Hashed | Source | Standard. |
| `pwdRef` | String | Encrypted copy | Source | Legacy/admin-view pattern. |
| `status` | Number enum [1,2,3,4] | Business logic | Source | 1=Active, 2=Inactive, 3=Blocked, 4=New. No extensible enum. |
| `isPaid` | Boolean | Activation | Source | Activation gate; required for level income eligibility. |
| `referredBy` | ObjectId | Registration / sponsor change | **Source of truth** | Single parent; tree invariant. |
| `referredByMemberId` | String(13) | Denormalized from sponsor | **Derived** | Redundant with referredBy; reduces join cost. |
| `isSystemRoot` | Boolean | Seed | Source | Singleton root; partial unique index. |
| `last_login` | Date | Login flow | Source | Standard. |
| `passwordChangedAt` | Date | Password change | Source | Standard. |
| `uuid` | String(64) | Registration | Source | Standard. |
| `directCount` | Number | teamRegistrationService / sponsorChangeService | **Derived** | Must match `User.countDocuments({ referredBy })`; can desync if bypassed. |
| `totalDownlineCount` | Number | teamRegistrationService / sponsorChangeService | **Derived** | Must match closure count; can desync. |

## 1.2 Activation State Handling

- **status + isPaid:** Both required for upline commission eligibility (`getEligibleUplineChain` requires `status === 1 && isPaid === true`).
- **status=4 (New):** Pending; can be activated via `levelCommissionService` (wallet balance ≥ registrationFee) or admin override.
- **activation flow:** `performActivationAndLevelDistribution` sets `status: 1, isPaid: true` after level distribution.
- **Risk:** `status` and `isPaid` are independent; admin can set `isPaid: true` without activation logic, creating inconsistent state.

## 1.3 referredBy Logic

- **Source of truth** for tree structure.
- Required for all non-root users (schema `required` + pre-save validation).
- Cannot be nulled for non-root (findOneAndUpdate hook).
- **Sponsor change:** Handled by `sponsorChangeService.processSponsorChange`, which updates `referredBy`, `referredByMemberId`, closure table, and counts atomically.
- **Admin direct update:** AdminUserController routes sponsor changes through `processSponsorChange` when `referredBy` differs; no bypass observed.

## 1.4 directCount / totalDownlineCount

| Field | Source of Truth | Update Path |
|-------|-----------------|-------------|
| `directCount` | `User.countDocuments({ referredBy: userId })` | teamRegistrationService (+1), sponsorChangeService (±1) |
| `totalDownlineCount` | `UserHierarchy.countDocuments({ ancestor: userId })` | teamRegistrationService (+1 for sponsor+ancestors), sponsorChangeService (±subtreeSize) |

- **Derived nature:** Stored for performance; desync possible if updates bypass services.
- **Reconciliation:** Script `reconcileTeamCounts.js` exists to recompute and fix desyncs.

## 1.5 Rank / Designation Fields

**Critical finding:** User schema has **no** `rankCode`, `designationCode`, or `designations` field.

- Rank/designation configuration lives in `WalletSettings` (ranks[], designations[]).
- `rankEligibilityService.checkRankEligibility` requires `options.userRankCode` to be passed in; it is not read from User.
- `rankEligibilityService` checks `User.countDocuments({ _id: { $in: downlineIds }, "designations.designationCode": designationCode })` for `requiredDesignations`. **User has no `designations` field** — this query will always return 0. **Structural gap.**

## 1.6 Sponsor Change Implications

- **Full cascade:** `sponsorChangeService` performs:
  1. Delete all hierarchy rows for moved user + descendants.
  2. Update `User.referredBy` / `referredByMemberId`.
  3. Insert new hierarchy rows (moved + descendants under new sponsor chain).
  4. Decrement counts on old sponsor chain.
  5. Increment counts on new sponsor chain.
- **Cost:** O(|subtree| × |newSponsorAncestors|) hierarchy writes; acceptable for typical subtree sizes.

## 1.7 Derived / Denormalized Fields

| Field | Derivation | Desync Risk |
|-------|------------|-------------|
| `referredByMemberId` | From sponsor.memberId | Low if sponsor change goes through service |
| `directCount` | Count of direct referrals | Medium if registration/hierarchy bypassed |
| `totalDownlineCount` | Closure table count | Medium; same as above |

## 1.8 Indexes

- `memberId` unique, immutable
- `phone` unique, immutable
- `referredBy` indexed
- `referredByMemberId` indexed
- `status` indexed
- `{ referredBy: 1, createdAt: -1 }` for direct team + sort
- `{ isSystemRoot: 1 }` unique partial (isSystemRoot: true)

## 1.9 Risk of Future Expansion

| Requirement | Current Support | Migration Pain |
|-------------|----------------|----------------|
| Multiple wallets per user | N/A — Wallet is 1:1 with User | Low |
| Multi-plan (e.g. Plan A / Plan B) | No; single tree, single referredBy | High — tree structure is single-plan |
| Multi-leg (left/right) | No; single parent | Very high — would require new tree model |
| Stored rank/designation | No | Medium — add fields; backfill or compute |
| Multi-country tax fields | No | Low — add optional fields |
| KYC/verification flags | No | Low — add optional fields |

## 1.10 Missing Extensibility Fields

- **rankCode** / **currentRankCode** — Not stored; rank eligibility is computed on demand with passed-in options.
- **designationCode** / **designations[]** — Not on User; `requiredDesignations` eligibility check is structurally broken (queries non-existent path).
- **planId** / **leg** — None; single-plan, single-parent only.
- **activationDate** — Not stored; activation is inferred from `isPaid` and ACTIVATION tx.
- **countryId** / tax fields — In UserDetails; not on User for quick filters.

---

# SECTION 2 — WALLET SCHEMA & LEDGER ANALYSIS

## 2.1 Wallet Schema

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | ObjectId, unique | 1:1 with User |
| `balance` | Decimal128 | MAIN wallet balance |
| `clubBalances` | Map<String, Decimal128> | Named club wallets (e.g. RANK_1, CLUB_X) |
| `totalBalance` | Decimal128 | balance + sum(clubBalances); denormalized |
| `totalClubBalance` | Decimal128 | sum(clubBalances); denormalized |
| `lastTransactionAt` | Date | Last activity timestamp |

- **Precision:** Decimal128; walletService uses `toFixed(2)` and rejects non-positive amounts for credits.
- **Recalc:** `totalBalance` and `totalClubBalance` recomputed on every credit/debit.

## 2.2 WalletTransaction Schema

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | ObjectId | Owner of tx |
| `requestId` | String, unique (sparse) | Idempotency key |
| `type` | enum | LEVEL_INCOME, RANK_INCOME, CLUB_INCOME, ACTIVATION, TRANSFER, ADMIN_*, etc. |
| `direction` | CREDIT/DEBIT | |
| `walletKey` | String | MAIN or club key |
| `amount` | Decimal128 | |
| `description` | String | Human-readable |
| `adminId` | ObjectId | For admin ops |

- **Immutability:** Pre-hooks block update, delete, remove.
- **sparse: true on requestId:** Allows legacy docs with null requestId; uniqueness enforced for non-null.

## 2.3 Idempotency Strategy (requestId)

- **Format:** UUID or `<engine>:<eventId>:<userId>:<walletKey>` (and `:credit` suffix for transfer credit).
- **Max length:** 120 chars.
- **Duplicate handling:** On duplicate key error, returns existing tx if same userId; otherwise throws.
- **Idempotent flows:** Level, rank, club, activation, transfer (debit+credit pair).

## 2.4 Decimal Precision Handling

- **Storage:** Decimal128 throughout.
- **Conversion:** `toCents` / `computeCommissionCents` for commission math (integer cents); `Math.floor`; back to Decimal via `(cents/100).toFixed(2)`.
- **Rounding:** 2 decimals enforced in walletService and financialMath.

## 2.5 Multi-Wallet Support

- **Current:** MAIN + dynamic club keys (Map). Club keys come from WalletSettings (levels, ranks, clubs, designations).
- **Adding new wallet types:** New keys in WalletSettings → new keys in clubBalances; no schema change. **Extensible.**

## 2.6 Cross-Wallet Transfer Extensibility

- **Current:** `transferMainToMain`, `transferClubToMain`, `adminTransferUserToUser`.
- **Club→Club:** Not implemented; would need new transfer type and requestId convention.
- **System wallet:** Not present; no global sink/source.

## 2.7 Ledger Immutability Guarantees

- **Strong:** Update/delete pre-hooks prevent modification. Append-only.
- **No counterparty link:** Transfer pairs (debit/credit) not linked by shared id; only by requestId convention (`debitReq`, `debitReq:credit`).

## 2.8 Reconciliation Capability

- **Balance vs sum(tx):** No built-in reconciliation job. Wallet balance is maintained by application logic; no periodic sum(tx) check.
- **Transfer pairing:** Debit and credit have related requestIds but no `counterpartyTxId` or `transferGroupId`.

## 2.9 Index Design

**WalletTransaction:**
- `userId`, `requestId` (unique sparse), `type`, `direction`, `adminId`
- `{ userId, createdAt: -1 }`, `{ userId, type, createdAt: -1 }`, `{ userId, walletKey }`, `{ userId, direction, createdAt: -1 }`

**Wallet:**
- `userId` unique
- `totalBalance`, `totalClubBalance`, `balance`, `lastTransactionAt`

## 2.10 Growth at 500K Users

- **Wallet:** 500K docs; small; `userId` unique index sufficient.
- **WalletTransaction:** Grows unbounded; time-based partitioning not in schema. Queries by `userId` + time are indexed; pagination used.

## 2.11 Financial Safety / Structural Limitations

| Aspect | Assessment |
|-------|------------|
| Idempotency | Solid; requestId-based; duplicate returns existing |
| No negative balance | Enforced via `$gte` check before debit |
| Decimal128 | Appropriate for money |
| Immutability | Strong; hooks prevent edits |
| Reconciliation | Manual; no tx sum vs balance job |
| Multi-currency | Not supported; single currency assumed |
| Transfer traceability | By requestId convention; no formal link field |

---

# SECTION 3 — LEVEL COMMISSION SYSTEM

## 3.1 Upline Chain Derivation

- **Source:** `getEligibleUplineChain(activatedUserId, maxLevels)` walks **referredBy** chain.
- **Does NOT use** `user_hierarchy`.
- **Stops when:** `referredBy` is null, or sponsor has `status !== 1` or `isPaid !== true`.

## 3.2 Dependency: referredBy vs Closure Table

| Use Case | Uses |
|----------|------|
| Level commission (income) | referredBy chain |
| Downline queries (team, rank eligibility) | user_hierarchy |
| directCount / totalDownlineCount | user_hierarchy (via services) |

- **Dual source:** Tree shape = referredBy; downline enumeration = closure. Services keep both in sync.

## 3.3 Commission Config from WalletSettings

- `levels[]`: `levelNumber`, `walletKey`, `commissionPercent`
- Level N → Nth sponsor in upline chain gets `commissionPercent` of registration fee.
- `remainingAmountCentsRef` ensures total distributed ≤ fee (no over-allocation).

## 3.4 Max Depth Scalability

- Limited by `levels.length` in WalletSettings.
- Upline walk is O(depth) DB round-trips; depth typically ≤ 20.
- No recursion; linear chain walk.

## 3.5 Plan Change Later

- **Config change:** Editing `levels` in WalletSettings affects only **future** activations.
- **Historical:** Past activations used config at time of execution; no stored plan version on activation.
- **Audit:** Cannot deterministically recompute "what config was used" for old activations — no planVersionId or snapshot.

## 3.6 Multiple Income Types

- **Current:** LEVEL_INCOME, RANK_INCOME, CLUB_INCOME, ACTIVATION, TRANSFER, ADMIN_*.
- **Adding new type:** Requires:
  1. New entry in WalletTransaction `type` enum
  2. New requestId convention if idempotent
  3. New engine in incomeService or equivalent
- **Schema impact:** WalletTransaction type enum is hardcoded; adding type = code change + deploy.

## 3.7 Percentage Logic Scaling

- `computeCommissionCents`: `Math.floor((amountCents * percent) / 100)`.
- Integer cents; remainder stays in pool (`remainingAmountCentsRef` for level income).
- No rounding accumulator; remainder effectively drops or stays with pool.

## 3.8 Rounding & Remainder Handling

- Level income: remainder stays in `remainingAmountCentsRef` (not distributed). No explicit "remainder handling" policy.
- Floor-based; no banker's rounding.

## 3.9 Missing Abstraction Points

- **Plan versioning:** No stored version at commission time.
- **Income event schema:** No generic "income event" with type + params; each engine is custom.
- **Multi-plan commission:** Single plan; no planId on User or activation.

---

# SECTION 4 — WALLET SETTINGS SCHEMA ANALYSIS

## 4.1 registrationFee Handling

- Number; min 0; validated and rounded to 2 decimals in pre-save.
- Used by levelCommissionService for activation debit and level distribution.
- Editable via admin; no version history.

## 4.2 levels[] Commission Config

- `levelNumber` (1,2,3…), `walletKey`, `commissionPercent`
- Sequential, no gaps.
- `walletKey` unique across levels, ranks, clubs, designations.
- Total commission across levels+ranks+clubs+designations ≤ 100%.

## 4.3 Withdrawal Limits

- **WalletSettings:** `mainMinWithdrawal`, `mainMaxWithdrawal` (MAIN wallet).
- **CommonSettings:** `minWithdrawalAmount`, `maxWithdrawalAmount` — used for **donation/UI** flows, not wallet transfers.
- **transferService** uses WalletSettings for transfer limits.
- **Split config:** Two sources for "withdrawal"; potential confusion.

## 4.4 Singleton Pattern Risks

- **singletonKey: "GLOBAL"** — single document.
- **Risk:** No multi-tenant or multi-plan support. All users share same config.
- **Concurrent update:** Standard find-modify-save; no optimistic locking beyond Mongoose.

## 4.5 Plan Versioning Possibility

- `configVersion` exists (default 1) but is **not used** in commission or audit logic.
- No snapshot/version stored when commission runs.
- **Plan versioning:** Would require storing configVersion or snapshot at activation time.

## 4.6 Multi-Plan Support

- **Current:** Single plan only. One levels[], ranks[], clubs[], designations[].
- **To support multi-plan:** Would need planId on User, planId in WalletSettings or separate config collection, and plan-aware commission engines.

## 4.7 Historical Config Tracking

- No history collection. Edits overwrite.
- Cannot answer "what was level 3 commission on 2024-01-15?" without backups/audit logs.

---

# SECTION 5 — HIERARCHY STRUCTURE (CLOSURE TABLE)

## 5.1 user_hierarchy Schema

| Field | Type | Meaning |
|-------|------|---------|
| `user` | ObjectId | Descendant |
| `ancestor` | ObjectId | Upline |
| `level` | Number | Distance (1 = direct sponsor) |

- No timestamps on schema (timestamps: false).

## 5.2 Ancestor/Level Model

- `(user, ancestor, level)` = user is `level` steps below ancestor.
- For new user U under sponsor S: insert (U,S,1) plus (U, A, L+1) for each (S,A,L).
- Level = tree distance; correct for single-parent model.

## 5.3 Indexing

- `{ user: 1 }`, `{ ancestor: 1 }`, `{ ancestor: 1, level: 1 }`, `{ user: 1, ancestor: 1 }` unique.
- Supports: ancestors of user, downline of user, level-wise downline.

## 5.4 Sponsor Change Cost

- **sponsorChangeService:** Deletes all rows for moved user + descendants; inserts new rows under new sponsor chain.
- **Cost:** O(|subtree| × (1 + |newSponsorAncestors|)) writes.
- For large subtrees (e.g. 10K users), significant write load.

## 5.5 Scaling to 500K Users

- **Rows:** ~500K × avg(ancestor depth). For depth 15: ~7.5M rows. Document size small.
- **Indexes:** ancestor, user — standard. Document growth is the main concern; no partitioning.
- **Corruption risk:** If referredBy and hierarchy diverge, downline queries return wrong set. sponsorChangeService and teamRegistrationService are the only writers; no stray direct updates observed.

## 5.6 Tree Coupling to Business Logic

- **Income:** Does NOT use hierarchy; uses referredBy.
- **Team/rank:** Uses hierarchy for downline.
- **Decoupled for income;** hierarchy is for reads (team, eligibility). Tree shape is referredBy.

---

# SECTION 6 — FUTURE EXPANSION PRESSURE TEST

| Scenario | Current Support | New Fields Easy? | Migration Required? | Structural Rigidity |
|----------|----------------|-----------------|---------------------|----------------------|
| **Multiple wallet types** | MAIN + clubBalances Map | Yes — add keys | No | Low |
| **Multiple compensation plans** | No | No — singleton config | Yes — planId, multi-config | High |
| **Dynamic commission slabs** | Fixed percent per level | Medium — config change | No | Low |
| **Global rank system** | Ranks in WalletSettings; no User.rankCode | Add User.rankCode | Backfill or compute | Medium |
| **Multi-country tax fields** | No | Add optional fields | No | Low |
| **Multi-currency wallet** | No | No — balance is single Decimal128 | Yes — currency per wallet or new structure | High |
| **Auto pool / club income** | Club income exists | Extend engine | No | Low |
| **System wallet** | No | New collection + service | Yes | Medium |
| **Historical audit compliance** | Ledger immutable; no config snapshot | Add planVersion/configSnapshot at commission time | Backfill not possible for past | Medium |

---

# FINAL OUTPUT

## 1. System Strength Score: **7/10**

- Solid: Immutable ledger, idempotency, Decimal128, closure table, sponsor change cascade, level income engine.
- Gaps: No User rank/designation storage, requiredDesignations query broken, dual withdrawal config, no plan versioning.

## 2. Schema Rigidity Score: **6/10**

- Rigid: WalletTransaction type enum, singleton WalletSettings, single-currency, single-plan.
- Flexible: clubBalances Map, walletKey-driven clubs, level config array.

## 3. Financial Safety Score: **8/10**

- Strong: Decimal128, idempotency, no negative balance, immutable ledger.
- Weak: No formal reconciliation job, no counterparty link on transfers, sparse requestId allows legacy nulls.

## 4. Scalability Score (500K users): **7/10**

- Good: Closure table, indexed queries, pagination, sponsor change O(subtree).
- Concerns: Unbounded WalletTransaction growth, hierarchy row growth (~7.5M at 500K users), no partitioning.

## 5. Top 5 Structural Risks

1. **User.designations missing** — `rankEligibilityService` requiredDesignations check queries `User.designations.designationCode`; User has no such field. Eligibility always fails or behaves incorrectly.
2. **Dual withdrawal config** — CommonSettings vs WalletSettings; transferService uses WalletSettings; potential for conflicting limits.
3. **No plan versioning at commission time** — Cannot audit "what config was used" for past activations.
4. **WalletTransaction type enum** — Adding new income types requires code change; not data-driven.
5. **Single-plan singleton** — Multi-plan or multi-tenant would need significant refactor.

## 6. Top 5 Expansion Bottlenecks

1. **Multi-plan** — WalletSettings is singleton; no planId on User; commission engines assume single config.
2. **User rank/designation storage** — Rank eligibility expects userRankCode/designations; not on User.
3. **Multi-currency** — Single balance type; no currency field.
4. **System wallet** — No global wallet; would need new collection and service.
5. **Historical config** — No snapshot; plan changes overwrite; no audit trail for old commissions.

## 7. What Must Be Redesigned BEFORE Scaling

1. **User schema:** Add `rankCode` and/or `designations[]` if rank/designation-based features are required; fix requiredDesignations flow.
2. **Plan versioning:** Store configVersion or configSnapshot at activation/commission time for audit.
3. **Withdrawal config:** Unify CommonSettings and WalletSettings usage or document clear ownership.
4. **WalletTransaction:** Consider `counterpartyTxId` or `transferGroupId` for transfer pairs if reconciliation becomes critical.

## 8. What Is Already Production-Grade

1. **Ledger:** Immutable, Decimal128, idempotency via requestId.
2. **Closure table:** Correct model, good indexes, used for team and rank eligibility.
3. **Sponsor change:** Full cascade (referredBy, hierarchy, counts) in one transaction.
4. **Level commission:** Integer cents, remaining pool, idempotent, uses referredBy chain correctly.
5. **Wallet service:** No negative balance, getOrCreateWallet, credit/debit with session support.
6. **WalletSettings validation:** Total commission ≤ 100%, sequential codes, walletKey uniqueness.
7. **Team service:** Uses closure for downline; paginated; no BFS over referredBy for full team.

---

*End of report. No code modifications suggested. Structural analysis only.*
