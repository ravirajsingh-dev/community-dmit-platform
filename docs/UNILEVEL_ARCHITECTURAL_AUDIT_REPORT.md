# Unilevel Architectural Audit Report

**Document Version:** 1.0  
**Audit Date:** 2025-03-01  
**Scope:** Referral hierarchy system vs. pure Unilevel MLM architecture  
**Assumed Scale:** 1M+ users, production-grade financial system  

---

# 1. Current System Classification

## Is this technically already Unilevel?

**Yes — structurally.** The tree model, parent pointer, and depth-based income logic match a textbook Unilevel design. The system is conceptually Unilevel with operational gaps and one critical performance deviation.

## Why it qualifies as Unilevel (core structure)

| Unilevel Characteristic | Implementation | Status |
|-------------------------|----------------|--------|
| Single parent per node | `User.referredBy` (ObjectId), required for non-root | ✅ Correct |
| Unlimited width (direct referrals) | No `directCount` limit; no leg/position fields | ✅ Correct |
| Depth-based levels (1–N) | `UserHierarchy.level` = distance from ancestor | ✅ Correct |
| No left/right legs | No `left`, `right`, `leg`, or `position` fields | ✅ Correct |
| Upline = parent chain | `getEligibleUplineChain` walks `referredBy` upward | ✅ Correct |
| Downline = transitive closure | Closure table `(user, ancestor, level)` | ✅ Correct |
| Income by depth only | `WalletSettings.levels[].commissionPercent` per level | ✅ Correct |

## Where it deviates (operational/performance)

1. **rankEligibilityService.getDownlineIds** uses BFS over `User.find({ referredBy: { $in: currentLevel } })` instead of closure table — not a structural Unilevel break, but a major scalability issue.
2. **Admin sponsor change** updates `referredBy` without hierarchy/count sync — violates Unilevel invariants (tree shape vs. stored closure).
3. **Closure table vs. parent pointer** are kept in sync only during registration; sponsor change breaks this.

## Architecture Comparison Summary Table

| Component | Textbook Unilevel | Current System | Alignment |
|-----------|-------------------|----------------|-----------|
| Parent pointer | Single `sponsor` or `parentId` | `referredBy` (ObjectId) | ✅ 100% |
| Width constraint | Unlimited | Unlimited (`directCount` unbounded) | ✅ 100% |
| Depth definition | Shortest path from root/sponsor | `user_hierarchy.level` = distance | ✅ 100% |
| Downline query | Closure table or recursive CTE | Closure table (`ancestor = userId`) | ✅ 100% |
| Upline query | Parent chain traversal | `referredBy` chain (O(depth)) | ✅ 100% |
| Income engine | Level 1→N commission on activation | `getEligibleUplineChain` + `WalletSettings.levels` | ✅ 100% |
| Rank downline | Closure table or equivalent | BFS over `referredBy` (not closure) | ⚠️ Correct but inefficient |
| Sponsor change | Full subtree move + hierarchy update | `referredBy` update only; no hierarchy sync | ❌ Inconsistent |

**Conclusion:** Structurally **90%+ Unilevel**. The model is Unilevel; the main gaps are sponsor-change integrity and rank-eligibility performance.

---

# 2. Structural Analysis

## Parent pointer logic validation

- **Single parent:** `User.referredBy` is a single ObjectId; no second parent field.
- **Root exception:** Root user (`memberId === ROOT_MEMBER_ID`) has `referredBy = null` by schema.
- **Required for non-root:** `required: function() { return this.memberId !== ROOT_MEMBER_ID }` ensures every non-root user has a sponsor.
- **Prevention of nulling:** `findOneAndUpdate` pre-hook rejects `$unset` of `referredBy` for non-root.
- **Index:** `referredBy` indexed for direct team and upline traversal.

**Validation:** Parent pointer logic is correct and consistent with Unilevel.

## Closure table usage validation

- **Schema:** `UserHierarchy(user, ancestor, level)` with `user` = descendant, `ancestor` = upline user, `level` = distance.
- **Insert rule:** For new user U under sponsor S:
  1. Insert `(U, S, 1)`.
  2. For each `(S, A, L)` in hierarchy, insert `(U, A, L+1)`.
- **Level semantics:** Level = shortest path (tree) distance; with single parent, there is only one path, so it matches Unilevel depth.
- **Indexes:** `{ user: 1 }`, `{ ancestor: 1 }`, `{ ancestor: 1, level: 1 }`, `{ user: 1, ancestor: 1 }` unique.
- **Team queries:** `getAllTeam`, `getTeamByLevel` use `$match: { ancestor: userId }` (+ level filter when needed) — O(1) by ancestor, no graph traversal.

**Validation:** Closure table design and usage are correct for Unilevel.

## Unlimited width validation

- **Schema:** No max on `directCount`; no constraint on number of users with same `referredBy`.
- **Registration:** No limit on how many users can register under the same sponsor.
- **Stress test:** `WIDTH=100` in stress test; no enforced cap.
- **Direct team:** `User.find({ referredBy: userId })` returns all direct referrals.

**Validation:** Width is unlimited as in Unilevel.

## Depth behavior validation

- **Level stored:** `user_hierarchy.level` set at registration.
- **Depth limit:** None in schema; `teamValidation` allows level 1–1000 for queries; deeper trees possible.
- **Income depth cap:** `WalletSettings.levels.length` limits upline chain in `getEligibleUplineChain`; deeper upline exists but gets no commission beyond configured levels.
- **Level definition:** Level N = N steps from ancestor; aligns with Unilevel “Level N” commission.

**Validation:** Depth behavior is correct for Unilevel.

## Any hidden binary assumptions

- **Grep results:** No `left`, `right`, `leg`, or `position` in hierarchy/team/income code.
- **TEAM_MODULES_DEEP_TECHNICAL_ANALYSIS.md:** States “The team structure is not a binary tree” and “No left/right, leg, or position logic.”
- **Structure view:** Children ordered by `createdAt`; no positional placement.
- **Family module:** Separate from referral hierarchy; uses marriages/children; not MLM.

**Validation:** No binary assumptions; structure is general tree (Unilevel).

---

# 3. Income Engine Compatibility

## Does income follow Unilevel logic?

Yes.

- **Level income:** Triggered on user activation; commission distributed to upline by depth.
- **Traversal:** `getEligibleUplineChain(activatedUserId, maxLevels)` walks `referredBy` upward.
- **Level mapping:** Level 1 = direct sponsor, Level 2 = sponsor’s sponsor, etc.
- **Config:** `WalletSettings.levels[]` has `levelNumber`, `commissionPercent`, `walletKey`.
- **Distribution:** `distributeLevelIncome` iterates `chain` from `getEligibleUplineChain` and pays each level per `commissionPercent`.
- **Break conditions:** Stops at inactive (`status !== 1`) or unpaid (`isPaid !== true`) sponsor.
- **Fraction handling:** Integer cents; `computeCommissionCents` used; remainder not minted.

This matches Unilevel: commission by depth, single sponsor chain, configurable percent per level.

## Does upline traversal correctly match depth-based payout?

Yes.

- `getEligibleUplineChain` returns `[{ levelNumber: 1, sponsorId }, { levelNumber: 2, sponsorId }, …]`.
- Level 1 = direct sponsor; Level 2 = sponsor’s sponsor; etc.
- `distributeLevelIncome` uses `levelNumber` directly with `levels[levelNumber - 1]`.
- Order and numbering match Unilevel depth.

**Validation:** Upline traversal and payout mapping are correct.

## Are there any hybrid or conflicting rules?

No structural hybrid.

- **Rank income:** Paid to the user; not based on tree structure.
- **Club income:** Per-club logic; not hierarchy-based.
- **Designation income:** Per-designation; not hierarchy-based.
- **Level income:** Only hierarchy-based income; uses `referredBy` chain only.

**Potential edge:** If `referredBy` is changed via admin without hierarchy sync, future commission will use the new chain, but closure table and counts will be wrong. That is a data integrity issue, not a hybrid commission rule.

## Risk analysis if scaling to 100K–1M users

| Risk | Severity | Description |
|------|----------|-------------|
| **getDownlineIds (rank eligibility)** | High | BFS does O(downline) queries in waves; 100K downline → ~100K queries. Should use closure table. |
| **getEligibleUplineChain** | Medium | O(depth) reads; depth ~1000 → ~1000 reads per activation. Acceptable but not optimal. |
| **getAllTeam sort** | Medium | Large downline → big in-memory sort; consider `allowDiskUse`. |
| **Closure table size** | Medium | ~N × avg_depth rows; 1M users × 50 avg depth → ~50M rows. Indexes and disk matter. |
| **Concurrent registration** | Low | Uses transactions; `$inc` atomic; unique index on `(user, ancestor)` prevents duplicates. |
| **Sponsor change corruption** | High | Admin can change `referredBy`; hierarchy/counts not updated → wrong teams, wrong commission eligibility. |

---

# 4. Rank / Eligibility / Downline Logic Review

## Does rank calculation rely on adjacency BFS or closure table?

**BFS over adjacency list.**

```javascript
// rankEligibilityService.getDownlineIds
let currentLevel = [userId];
while (currentLevel.length > 0) {
  const children = await User.find({ referredBy: { $in: currentLevel } })
    .select("_id").lean();
  // ... accumulate ids, set currentLevel = newIds
}
```

- Uses `User.find({ referredBy: { $in: currentLevel } })` in a loop.
- Does **not** use `UserHierarchy`.
- Downline IDs are used for:
  - `teamSizeRequired`
  - `requiredDesignations` (count of designation users in downline)

## Does that align with Unilevel best practices?

**Logic: yes. Performance: no.**

- Unilevel downline = transitive closure under a node.
- Closure table (`user_hierarchy`) is the standard way to compute it.
- BFS produces the same set but via many queries instead of a single indexed lookup.
- Semantically correct; operationally poor at scale.

## Performance comparison with ideal Unilevel design

| Approach | Query pattern | 100K downline | 1M downline |
|----------|---------------|---------------|-------------|
| **Current (BFS)** | `User.find({ referredBy: { $in: level } })` per wave | O(downline) queries, ~100K+ | Prohibitive |
| **Ideal (closure)** | `UserHierarchy.find({ ancestor: userId }).distinct("user")` | 1 indexed query + distinct | Feasible |
| **Ideal (count only)** | `UserHierarchy.countDocuments({ ancestor: userId })` | 1 count query | Feasible |

**Recommendation:** Switch `getDownlineIds` to closure table:

```javascript
const rows = await UserHierarchy.find({ ancestor: userId }).select("user").lean();
return [...new Set(rows.map(r => r.user.toString()))].map(id => new mongoose.Types.ObjectId(id));
```

Or `UserHierarchy.distinct("user", { ancestor: userId })` for IDs only.

---

# 5. Sponsor Change & Integrity Risks

## Would sponsor change break Unilevel assumptions?

Yes. In Unilevel, sponsor = single parent; tree shape is defined by parent pointers.

- **Current:** Admin can set `userUpdateFields.referredBy` and `referredByMemberId`; `User.findByIdAndUpdate` runs with no hierarchy or count update.
- **Effects:**
  1. **user_hierarchy:** Old ancestor relationships remain; new ancestor relationships are missing. Closure table no longer reflects the tree.
  2. **directCount / totalDownlineCount:** Old sponsor chain still has inflated counts; new sponsor chain has correct counts only for new joins.
  3. **Income:** `getEligibleUplineChain` uses `referredBy`, so commission follows the new chain. But Team/Level-Wise views use the closure table, so they show wrong data.
  4. **Rank eligibility:** `getDownlineIds` uses `referredBy`, so it follows the new tree. If it were switched to closure table without a fix, it would still see old relationships until hierarchy is rebuilt.

## Is closure table fully aligned with parent pointer?

**No — only when sponsor change is avoided or repaired.**

- **Registration:** `setupHierarchyForNewUser` keeps them in sync.
- **Sponsor change:** No sync logic; they diverge.
- **Migration:** `migrateClosureTable.js` rebuilds hierarchy from `referredBy`; run after sponsor changes to realign.

## Data corruption risk analysis

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Admin changes referredBy | Closure table stale; counts wrong | Disable sponsor change, or implement full hierarchy + count update |
| Manual DB edit of referredBy | Same as above | Run `migrateClosureTable.js` + `reconcileTeamCounts.js` |
| Concurrent sponsor change + registration | Race; partial updates | Use transaction; lock user during change |
| Orphan (referredBy → deleted user) | Migration skips; no hierarchy rows | Prevent deletion of users with downline, or soft-delete |

**Critical:** Until sponsor change is either disabled or properly implemented, the system can enter an inconsistent state that violates Unilevel invariants.

---

# 6. What Must Change to Make It 100% Clean Unilevel

## Critical structural fixes

### 1. Admin sponsor change must sync hierarchy and counts

**Current:** `AdminUserController` updates `referredBy` only.

**Required:** When `referredBy` changes for user U:

1. Delete all `UserHierarchy` rows where `user = U` or where `user` is a descendant of U (need to identify subtree).
2. For U and each descendant, re-insert hierarchy rows based on new `referredBy` chain.
3. Decrement `directCount` for old sponsor and `totalDownlineCount` for old sponsor chain.
4. Increment `directCount` for new sponsor and `totalDownlineCount` for new sponsor chain.

**Alternative:** Disable sponsor change for non-root users until this is implemented.

### 2. rankEligibilityService.getDownlineIds must use closure table

**Current:** BFS over `User.find({ referredBy: { $in: currentLevel } })`.

**Required:** Replace with:

```javascript
const ids = await UserHierarchy.find({ ancestor: userId }).distinct("user");
return ids;
```

Or equivalent to avoid loading full documents and to stay consistent with closure table.

---

## Medium architectural improvements

### 3. reconcileTeamCounts --fix option

**Current:** Logs mismatches only.

**Required:** Optional `--fix` to overwrite `directCount` and `totalDownlineCount` from actual DB counts (with confirmation and safeguards).

### 4. getAllTeam memory handling for large downline

**Current:** Aggregation can hold full result set in memory before `$skip`/`$limit`.

**Required:** Add `allowDiskUse: true` when result size exceeds a threshold (e.g. 50K rows).

### 5. Transaction wrapper for sponsor change

**Current:** No transaction around user update.

**Required:** Wrap sponsor change (when implemented) in a transaction so hierarchy and count updates are atomic.

---

## Optional refinements

### 6. Covering index for level-wise count

Add `{ ancestor: 1, level: 1, user: 1 }` for count-only queries.

### 7. getTeamByLevel sort params

**Current:** Always sorts by `createdAt: -1`. Add `orderBy`/`ascending` like `getAllTeam`.

### 8. Structure expansion depth limit

Consider max expand depth or “load more” to avoid hundreds of sequential API calls on very deep trees.

---

# 7. Migration Plan (If Required)

## Assessment

No structural migration of the tree model is needed. The model is Unilevel; gaps are operational. The plan below addresses sponsor-change support and closure-table alignment.

## Step-by-step safe migration strategy

### Phase 1: Fix rankEligibilityService (low risk)

1. Add `getDownlineIdsFromClosure(userId)` in `rankEligibilityService` using closure table.
2. Use it in `checkRankEligibility` instead of BFS `getDownlineIds`.
3. Keep old `getDownlineIds` as fallback behind a feature flag or config.
4. Validate: compare BFS vs closure results on a sample of users.
5. Remove BFS version after validation.

**Data migration:** None.

### Phase 2: Sponsor change — disable or implement

**Option A: Disable sponsor change**

1. In AdminUserController, reject `referralId` changes for non-root users.
2. Return a clear error.
3. Document that sponsor change is not supported.

**Option B: Implement full sponsor change**

1. Implement `updateSponsorWithHierarchySync(userId, newSponsorId, session)`:
   - In transaction:
     - Validate new sponsor (not self, not descendant, no cycle).
     - Fetch user and current sponsor.
     - Get all descendant IDs via closure: `UserHierarchy.find({ ancestor: userId }).distinct("user")` plus userId.
     - Delete `UserHierarchy` rows where `user` in {userId, ...descendants}.
     - Decrement counts for old sponsor chain.
     - For each moved user, insert new hierarchy rows (same logic as `setupHierarchyForNewUser`).
     - Increment counts for new sponsor chain.
     - Update `User.referredBy` and `referredByMemberId`.
2. Call this from AdminUserController when `referralId` changes, inside a transaction.
3. Add integration tests for sponsor change.
4. Run `reconcileTeamCounts` before and after in staging.

### Phase 3: Repair existing inconsistencies (if sponsor changes occurred)

1. Run `migrateClosureTable.js` to rebuild hierarchy from `referredBy`.
2. Run `reconcileTeamCounts.js` to log mismatches.
3. If `--fix` exists, run it; otherwise fix counts manually or via script.
4. Re-validate with stress tests.

## Data migration logic

- **Closure table rebuild:** `migrateClosureTable.js` already does this; source of truth is `referredBy`.
- **Count reconciliation:** `reconcileTeamCounts.js`; add `--fix` to overwrite from actual counts.
- **No schema changes** required for Unilevel alignment.

## Count reconciliation strategy

1. `directCount` = `User.countDocuments({ referredBy: userId })`.
2. `totalDownlineCount` = `UserHierarchy.countDocuments({ ancestor: userId })`.
3. Batch users; for each, compare stored vs actual; update if `--fix`.
4. Run during low traffic; consider read replica for counting.

## Income safety during migration

- **Phase 1 (getDownlineIds):** No impact on income; only rank eligibility and performance.
- **Phase 2 (sponsor change):** Income uses `referredBy`; if hierarchy is updated in same transaction as `referredBy`, commission stays consistent.
- **Phase 3 (repair):** Closure table is rebuilt from `referredBy`; income logic unchanged. No double payment; idempotency keys prevent duplicate credits.

---

# 8. Final Verdict

## Verdict: 90% Unilevel (minor cleanup needed)

## Reasoning

1. **Tree structure:** Single parent (`referredBy`), unlimited width, depth-based levels — matches Unilevel.
2. **Closure table:** Correct design and usage for downline queries.
3. **Income:** Depth-based commission via `referredBy` chain; configurable levels; no binary/leg logic.
4. **Remaining 10%:**
   - `rankEligibilityService.getDownlineIds` uses BFS instead of closure table (performance, not structure).
   - Admin sponsor change updates `referredBy` without hierarchy/count sync (integrity).
   - No transaction or repair around sponsor change.

## Summary table

| Aspect | Status | Action |
|--------|--------|--------|
| Parent pointer | Pure Unilevel | None |
| Unlimited width | Pure Unilevel | None |
| Closure table design | Pure Unilevel | None |
| Income engine | Pure Unilevel | None |
| Team queries | Pure Unilevel | None |
| Rank downline source | Correct, inefficient | Use closure table |
| Sponsor change | Breaks invariants | Implement sync or disable |

**Conclusion:** The system is structurally Unilevel. Two changes are needed for a clean, production-grade implementation: (1) switch rank downline to closure table, and (2) either implement correct sponsor change or disable it.

---

*End of report. Reference: TEAM_MODULES_DEEP_TECHNICAL_ANALYSIS.md, server/services/incomeService.js, server/services/rankEligibilityService.js, server/services/teamRegistrationService.js, server/models/UserHierarchy.js*
