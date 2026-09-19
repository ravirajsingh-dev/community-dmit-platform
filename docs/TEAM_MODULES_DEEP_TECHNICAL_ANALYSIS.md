# Team Modules — Deep Technical Analysis

**Document Version:** 1.0  
**Analysis Date:** 2025-03-01  
**Scope:** Direct Team, My Team, Level-Wise Team, Team Structure (Tree)  
**Purpose:** Extract and document all behavior necessary to safely modify hierarchy logic, income distribution, and traversal strategy.

---

# 1. System Overview

## 1.1 High-Level Architecture

The team system implements an **MLM-style referral hierarchy** with:

- **Adjacency List (primary):** `User.referredBy` and `User.referredByMemberId` — single parent pointer per user
- **Closure Table:** `user_hierarchy` collection — pre-computed ancestor–descendant paths for fast downline queries
- **Denormalized Counts:** `User.directCount` and `User.totalDownlineCount` — cached counts to avoid aggregation on read

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Model    │     │ UserHierarchy   │     │  teamService    │
│ referredBy      │────▶│ ancestor, user, │────▶│ getDirectTeam   │
│ directCount     │     │ level           │     │ getAllTeam      │
│ totalDownline   │     └──────────────────┘     │ getTeamByLevel │
└─────────────────┘                             │ getStructure*  │
        │                                       └─────────────────┘
        │                                                │
        ▼                                                ▼
┌─────────────────┐                             ┌─────────────────┐
│ Register /      │                             │ REST API        │
│ teamRegistration│                             │ /api/users/team │
│ setupHierarchy  │                             │ /api/admin/team │
└─────────────────┘                             └─────────────────┘
```

## 1.2 Data Model Relationships

| Entity | Key Fields | Purpose |
|--------|------------|---------|
| **User** | `referredBy`, `referredByMemberId`, `directCount`, `totalDownlineCount` | Parent pointer; cached counts |
| **user_hierarchy** | `user` (descendant), `ancestor`, `level` | Closure table: (U, A, L) = U is L levels under A |

**Invariants:**

1. Every non-root user has exactly one `referredBy` (ObjectId) and `referredByMemberId` (13-char string).
2. Root user (`memberId === ROOT_MEMBER_ID`: `"9999999999-99"`) has `referredBy = null`.
3. For user U under sponsor S: `UserHierarchy` contains `(user: U, ancestor: S, level: 1)` plus `(user: U, ancestor: A, level: L+1)` for each ancestor A of S.

## 1.3 Hierarchy Logic Explanation

- **Sponsor (Level 1):** The user who directly referred you. Stored in `User.referredBy`.
- **Parent:** Same as sponsor in this system (single parent, no binary/position logic).
- **Downline:** All users reachable by following `referredBy` in reverse — i.e., users who have you in their ancestor chain.
- **Level N:** Distance from you. Level 1 = direct referrals; Level 2 = referrals of referrals; etc.

**Closure table rule:** For new user U under sponsor S:

1. Insert `(U, S, 1)`.
2. For each row `(S, A, L)` in `user_hierarchy`, insert `(U, A, L+1)`.

This yields all ancestor paths for U in one write, enabling O(1) downline queries by `ancestor`.

## 1.4 Sponsor / Parent / Downline Relationships

- **Upline chain:** Follow `User.referredBy` from any user until root. Used by `incomeService.getEligibleUplineChain`.
- **Downline (full):** All rows in `user_hierarchy` where `ancestor = userId`. Used by team views and rank eligibility.
- **Direct team:** `User.find({ referredBy: userId })`. Level 1 only.
- **Level-wise:** `UserHierarchy.find({ ancestor: userId, level: N })` with join to `users`.

---

# 2. Direct Team — Deep Analysis

## 2.1 Definition

**Direct Team** = users you directly referred (Level 1). No recursion, no closure table.

## 2.2 Query Logic

**Source:** `server/services/teamService.js` → `getDirectTeam(userId, options)`

```javascript
User.find({ referredBy: userId })
  .select(USER_SELECT)
  .sort(sortBy)
  .skip(skip)
  .limit(limit)
  .lean()
```

- **Index:** `User.referredBy` has `index: true` → uses `referredBy_1`.
- **Pagination:** `page`, `limit` (default 20, max 100) from `parsePaginationParams()`.
- **Sort:** `orderBy` ∈ `["name","memberId","createdAt","status","directCount","totalDownlineCount"]`, `ascending` ∈ `["asc","desc"]`.

## 2.3 Filtering Rules

- **No status filter:** All referred users are returned regardless of `status` or `isPaid`.
- **No level filter:** Direct team is implicitly Level 1.

## 2.4 Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| User has 0 direct | Returns `{ users: [], pagination: { totalCount: 0 } }` |
| Root user | Same query; root typically has no `referredBy` so no direct team under them via this path |
| Invalid `userId` | `User.find` with non-existent ObjectId returns empty; no 404 from service |

## 2.5 Performance Considerations

- **Time:** O(1) per query with index; O(limit) for scan.
- **Width:** A sponsor with 10K direct would need large `skip` for high page numbers; `skip` is O(n) in MongoDB.

## 2.6 Possible Failure Scenarios

1. **Index missing:** COLLSCAN; mitigated by schema index (validated by `explainTeamQueries.js`).
2. **Pagination overflow:** `skip` very large on wide trees; acceptable for typical page sizes.

## 2.7 Dependency Mapping

- **Reads:** `User` only.
- **Writes:** None from this module.
- **Downstream:** Level commission uses `referredBy` chain, not direct team query.

---

# 3. My Team — Deep Analysis

## 3.1 How Full Downline Is Calculated

**My Team** = full downline (all levels) from `user_hierarchy` where `ancestor = userId`, joined to `users` for profile data.

**Source:** `server/services/teamService.js` → `getAllTeam(userId, options)`

**Query logic:**

```javascript
UserHierarchy.aggregate([
  { $match: { ancestor: userId } },
  { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
  { $unwind: "$userDoc" },
  { $project: { _id, memberId, name, phone, email, status, isPaid, createdAt, directCount, totalDownlineCount, level } },
  { $sort: sortStage },
  { $skip: skip },
  { $limit: limit },
])
```

## 3.2 Traversal Method

**No BFS/DFS at query time.** The closure table stores all ancestor relationships; `$match: { ancestor: userId }` fetches all downline rows in one indexed lookup.

- **Index used:** `{ ancestor: 1 }` or `{ ancestor: 1, level: 1 }` (for level filter in level-wise).
- **Traversal:** Pre-computed at insert via `setupHierarchyForNewUser`; read path is pure index scan + lookup.

## 3.3 Time Complexity

- **Per query:** O(downline_size) for match + O(limit) for sort/skip/limit. With index: O(log N + K) for match, then sort/skip/limit on result set.
- **Worst case:** User with 100K downline — match returns 100K rows, then sort, skip, limit. Sort can be expensive; consider `allowDiskUse` for very large result sets.

## 3.4 Memory Considerations

- **Server:** Aggregation pipeline holds all matching hierarchy rows in memory before `$skip`/`$limit`. For 100K+ downline, memory usage can spike.
- **Frontend:** Paginated; only one page in memory.

## 3.5 Query Optimization Notes

- `$lookup` on `users` is efficient with `_id` (indexed).
- Sort by `level`, `name`, `memberId`, `status`, or `createdAt`; compound sort used where needed.
- Count query runs in parallel: `UserHierarchy.aggregate([{ $match }, { $count: "total" }])`.

## 3.6 Potential Scaling Risks

1. **Wide + deep tree:** User with 50K downline → 50K rows in `$match` → sort + skip before limit.
2. **No `allowDiskUse`:** Large sorts may fail if exceeding memory limit.
3. **Frontend:** My Team can show "All Levels" or filter by specific level; filter switches between `getAllTeam` and `getTeamByLevel`.

---

# 4. Level-Wise Team — Deep Analysis

## 4.1 Level Calculation Logic

**Level** = shortest path distance from ancestor to descendant in the referral tree.

- **Stored:** In `user_hierarchy.level` at insert time.
- **Derived:** No runtime derivation; level is written when `setupHierarchyForNewUser` runs.

**Formula:** For new user U under sponsor S:  
- `(U, S, 1)` — level 1  
- For each `(S, A, L)` in hierarchy: `(U, A, L+1)` — level = parent’s level to that ancestor + 1.

## 4.2 How Levels Are Stored vs Derived

| Storage | Location | When Set |
|---------|----------|----------|
| Level | `user_hierarchy.level` | On registration in `setupHierarchyForNewUser` |
| Not stored on User | — | User has no `level` field; level is contextual (relative to viewer) |

## 4.3 Level Upgrade Triggers

**There are no "level upgrades" in the team module.** Level is structural (depth in tree), not a rank or status. It does not change after registration unless the tree structure changes (e.g., sponsor change — which is not fully supported for hierarchy sync).

## 4.4 Data Integrity Risks

1. **Stale hierarchy:** If `User.referredBy` is changed (e.g., via admin) without updating `user_hierarchy` and counts, levels and counts become inconsistent.
2. **Migration gaps:** `migrateClosureTable.js` rebuilds hierarchy from `referredBy`; if run after manual DB edits, it can correct inconsistencies.

## 4.5 Boundary Conditions

- **Level param:** Validated 1–1000 in `teamValidation.validateLevelParam`.
- **Level 0:** Treated as invalid; `getTeamByLevel` uses `Math.max(1, parseInt(level, 10))`.
- **Missing level rows:** User at depth > 1000 would not have rows beyond level 1000; queries for such levels return empty.

---

# 5. Team Structure (Tree Model)

## 5.1 Binary Tree Logic Explanation

**The team structure is not a binary tree.** It is a general tree (one parent, many children). Each user can have an arbitrary number of direct referrals.

**Naming note:** "Structure" in the UI means the referral tree, not a binary MLM placement tree.

## 5.2 Left/Right Placement Rules

**None.** No left/right, leg, or position logic. Children are ordered by `createdAt` (or default sort) when fetched; there is no positional field.

## 5.3 Node Insertion Rules

1. New user U registers with sponsor S.
2. `User` created with `referredBy: S._id`, `referredByMemberId: S.memberId`.
3. `setupHierarchyForNewUser(U._id, S._id, session)` runs in same transaction:
   - Insert `(U, S, 1)` into `user_hierarchy`.
   - For each `(S, A, L)` in hierarchy, insert `(U, A, L+1)`.
   - `$inc` S’s `directCount` and `totalDownlineCount` by 1.
   - `$inc` `totalDownlineCount` by 1 for each ancestor of S.

## 5.4 Tree Balancing

**None.** No balancing or rebalancing. Tree shape is determined solely by registration order and sponsor choice.

## 5.5 Recursive Expansion Logic

**Lazy loading.** No full tree load.

**Source:** `server/services/teamService.js` → `getStructureChildren(nodeId)`

```javascript
User.find({ referredBy: nodeId })
  .select(STRUCTURE_SELECT)  // memberId, name, status, directCount
  .lean()
```

Returns direct children only. Frontend calls this when user expands a node.

**Recursive expansion:** Handled by frontend (`StructureView.jsx`, `TreeNode`). Each expand triggers `GET /api/users/team/structure/:nodeId` for that node’s children.

## 5.6 Visualization Mapping Logic

- **Root:** Current user (or admin-selected user). Fetched via `getStructure` with no `nodeId` → returns `root` + `children`.
- **Children:** Each node has `hasChildren: (directCount ?? 0) > 0`. Used to show +/- expand button.
- **Depth:** No server-side depth limit for structure; client renders recursively.

## 5.7 Large Depth Handling

- **Server:** Each `getStructureChildren` returns only direct children; one query per expanded level. No depth limit.
- **Client:** No explicit depth cap; very deep trees may cause many sequential API calls if user expands deeply.
- **Risk:** User with long chain (e.g., depth 500) could trigger 500 expand calls if fully expanded.

---

# 6. Database Layer Analysis

## 6.1 Schema Structure Assumptions

**User:**
- `referredBy`: ObjectId, indexed, required for non-root
- `referredByMemberId`: String, indexed
- `directCount`: Number, default 0
- `totalDownlineCount`: Number, default 0

**user_hierarchy:**
- `user`: ObjectId (descendant)
- `ancestor`: ObjectId
- `level`: Number, min 1
- Unique index: `{ user: 1, ancestor: 1 }`
- Indexes: `{ user: 1 }`, `{ ancestor: 1 }`, `{ ancestor: 1, level: 1 }`

## 6.2 Index Requirements

| Collection | Index | Purpose |
|------------|-------|---------|
| users | `referredBy_1` | Direct team, structure children |
| users | `referredBy_1, createdAt_-1` | Pagination + sort |
| users | `status_1` | Filter (if added later) |
| user_hierarchy | `ancestor_1` | Full downline |
| user_hierarchy | `ancestor_1, level_1` | Level-wise |
| user_hierarchy | `user_1` | Ancestors of user |
| user_hierarchy | `user_1, ancestor_1` unique | Duplicate prevention |

## 6.3 Aggregation Logic

- **getAllTeam:** Match on `ancestor` → `$lookup` users → project → sort → skip → limit.
- **getTeamByLevel:** Same, with `level` in match.
- **Count:** Separate `$match` + `$count` pipelines run in parallel with main query.

## 6.4 Query Optimization Suggestions

1. **getAllTeam at scale:** Consider `allowDiskUse: true` for sort stage if downline > 100K.
2. **getTeamByLevel:** Sort currently fixed to `createdAt: -1`; frontend passes `orderBy`/`ascending` but they are ignored for level endpoint.
3. **Covering index:** `{ ancestor: 1, level: 1, user: 1 }` could support level-wise queries without full document fetch for count.

## 6.5 Risk of N+1 Queries

- **Structure view:** One request per expanded node. Not N+1 in DB sense, but O(expanded nodes) in API calls.
- **teamService:** No N+1; uses aggregation and bulk lookups.

## 6.6 Locking / Concurrency Risks

- **Registration:** Uses MongoDB transaction; `setupHierarchyForNewUser` runs inside same transaction as user creation.
- **Concurrent registrations under same sponsor:** `$inc` on directCount/totalDownlineCount is atomic; closure inserts are per-user, so no lock contention between different new users.
- **Same sponsor, concurrent:** Multiple `insertMany` for hierarchy rows; unique index prevents duplicates; retries via `runWithTransactionRetry` handle transient failures.

---

# 7. Performance & Scalability

## 7.1 Behavior at 1K, 10K, 100K Users

| User Count | Direct Team | My Team (full) | Level-Wise | Structure (per node) |
|------------|-------------|----------------|------------|----------------------|
| 1K | Fast | Fast | Fast | Fast |
| 10K | Fast | Moderate (sort 10K rows) | Fast | Fast per node |
| 100K | Fast for single sponsor | Slow if user has 100K downline | Fast per level | Fast per node |

## 7.2 Worst-Case Traversal Cost

- **rankEligibilityService.getDownlineIds:** Uses BFS over `User.find({ referredBy: { $in: currentLevel } })` — **not** closure table. For user with 100K downline: up to 100K queries in waves. **Critical bottleneck.**
- **incomeService.getEligibleUplineChain:** Walks `referredBy` upline; O(depth) single-doc reads. Depth ~1000 → 1000 reads per activation. Moderate cost.

## 7.3 Bottleneck Areas

1. **getDownlineIds (rankEligibilityService):** BFS over adjacency list; should use `user_hierarchy` instead.
2. **getAllTeam for huge downline:** Memory and sort cost before skip/limit.
3. **Admin sponsor change:** No hierarchy/count update; not a performance bottleneck but a correctness one.

## 7.4 Caching Possibilities

- **directCount / totalDownlineCount:** Already cached on User; used for dashboard and `hasChildren`.
- **Full downline:** Cache per user with TTL; invalidate on new registration under that user.
- **Level-wise:** Cache per (userId, level) with invalidation on new join in that subtree.

## 7.5 Denormalization Suggestions

- **Level on User:** Not recommended; level is viewer-relative.
- **Ancestor path array:** e.g. `ancestorIds: [root, L1, L2, …]` — redundant with closure table.
- **downlineSize by level:** Could store `downlineByLevel: { 1: n1, 2: n2, … }` for dashboard; would need update on every registration in subtree.

---

# 8. Security & Integrity

## 8.1 Access Control Logic

- **User routes:** `UserAuth`; `userId = req.user.id`. User sees only own team.
- **Structure nodeId:** `isNodeAccessibleByUser(nodeId, currentUserId)` — nodeId must be self or in downline. Prevents viewing other users’ trees.
- **Admin routes:** `AdminAuth`; `userId` from params. Admin can view any user’s team. No check that `nodeId` is under `userId` when fetching structure for `nodeId`.

## 8.2 Data Exposure Risks

- **Admin structure/:nodeId:** Admin can request `structure/ANY_NODE_ID` and get that node’s direct children even if node is not under the target user. May be acceptable for super-admin.
- **PII in team APIs:** name, phone, email returned; ensure only authorized roles can access.

## 8.3 Hierarchy Manipulation Risks

- **Sponsor change via admin:** `AdminUserController` can update `referredBy`/`referredByMemberId`. No corresponding update to `user_hierarchy` or `directCount`/`totalDownlineCount`. **Leads to inconsistency.**
- **Direct DB edits:** Would require running `migrateClosureTable.js` or `reconcileTeamCounts.js` to realign.

## 8.4 Validation Gaps

- **Circular reference:** Prevented at registration (sponsor validated before create); no check if admin somehow created a loop via direct update.
- **teamValidation:** Validates ObjectId and level range; does not enforce hierarchy rules.

---

# 9. Edge Cases & Failure Scenarios

## 9.1 Circular References

- **Prevention:** Registration validates sponsor before create; `setupHierarchyForNewUser` throws if `newUserId === sponsorId`.
- **Closure table:** With valid DAG, closure table cannot have cycles.
- **Risk:** Direct DB or admin update creating `referredBy` cycle would break upline walk and could produce wrong hierarchy if migrated.

## 9.2 Orphan Users

- **Definition:** User with `referredBy` pointing to non-existent or deleted user.
- **Current:** No user deletion found; `referredBy` cannot be removed for non-root (schema middleware).
- **Migration:** `migrateClosureTable` skips users without `referredBy`; orphans would have no hierarchy rows.

## 9.3 Missing Parent Nodes

- **Root:** Must exist (`ROOT_MEMBER_ID`); seeds create it.
- **Sponsor missing:** Registration validates sponsor; would fail before create.
- **After migration:** If sponsor document deleted outside app, hierarchy rows would reference non-existent ancestor; join would drop those rows.

## 9.4 Partial Tree Corruption

- **Mismatched counts:** `reconcileTeamCounts.js` detects `directCount`/`totalDownlineCount` vs actual; logs but does not auto-fix.
- **Missing hierarchy rows:** Would cause undercount in My Team / Level-Wise; run `migrateClosureTable.js` to repair.

## 9.5 Inconsistent Level States

- **Stale level in user_hierarchy:** If `referredBy` changed without hierarchy update, levels would be wrong. No automatic fix.

---

# 10. What I Must Know Before Making Changes

## 10.1 Change Impact Checklist

### Before Changing Placement Logic

- [ ] Placement is currently **sponsor-only** (no binary legs). Any new placement rules require schema and registration flow changes.
- [ ] `referredBy` is single parent; closure table and counts assume one parent.
- [ ] `setupHierarchyForNewUser` must stay in sync with new placement logic.

### Before Changing Level Rules

- [ ] Level = distance in tree from ancestor; stored in `user_hierarchy.level`.
- [ ] Income distribution uses `referredBy` chain via `getEligibleUplineChain`, **not** `user_hierarchy`. Level in hierarchy is for display/filtering only.
- [ ] Changing “level” for income (e.g., level cap, depth cap) affects `incomeService` and `WalletSettings.levels`, not team module directly.

### Before Changing Income Distribution Logic

- [ ] `getEligibleUplineChain` walks `User.referredBy`; stops at first inactive (`status !== 1`) or unpaid (`isPaid !== true`) sponsor.
- [ ] `user_hierarchy` is **not** used for income. Upline for commission is purely `referredBy`.
- [ ] `WalletSettings.levels` defines `levelNumber`, `commissionPercent`, `walletKey`; `levels.length` caps upline depth for commission.

### Before Changing Traversal Strategy

- [ ] **Team module:** Uses closure table; no graph traversal at query time.
- [ ] **rankEligibilityService.getDownlineIds:** Uses BFS over `referredBy`; does not use closure table. Changing traversal here affects rank eligibility performance.
- [ ] **incomeService:** Uses iterative upline walk; no traversal change needed unless income rules change.

### Before Changing Tree Depth Rules

- [ ] No enforced max depth in team module; structure and level-wise support arbitrary depth.
- [ ] `teamValidation` allows level 1–1000; deeper trees would need validation and/or schema change.
- [ ] Stress test uses `DEPTH=100` by default; `WIDTH=100` for width test.

### Before Changing Count Logic

- [ ] `directCount` = count of `User.find({ referredBy: userId })`; updated in `setupHierarchyForNewUser`.
- [ ] `totalDownlineCount` = count of `UserHierarchy.find({ ancestor: userId })`; updated in `setupHierarchyForNewUser` for sponsor and all ancestors.
- [ ] Any flow that changes `referredBy` (e.g., sponsor change) must update hierarchy and both counts.

---

# 11. Critical vs Optional Improvements

## 🔴 Critical Architectural Risks

1. **Admin sponsor change does not update hierarchy or counts**  
   Changing `referredBy` via admin leaves `user_hierarchy` and `directCount`/`totalDownlineCount` inconsistent. Either disable sponsor change for non-root or implement full hierarchy + count update (remove from old subtree, add to new).

2. **getDownlineIds (rankEligibilityService) ignores closure table**  
   BFS over `referredBy` is O(downline) queries for large teams. Should query `UserHierarchy.find({ ancestor: userId }).distinct('user')` instead.

3. **No hierarchy/count update on sponsor change**  
   Any code path that changes `referredBy` must:
   - Delete old hierarchy rows for that user and descendants (if any),
   - Insert new hierarchy rows,
   - Decrement old sponsor chain counts,
   - Increment new sponsor chain counts.  
   Currently missing.

4. **reconcileTeamCounts does not fix mismatches**  
   Only logs. Consider adding `--fix` to overwrite stored counts from actual DB counts (with safeguards).

## 🟡 Medium Improvements

1. **getTeamByLevel ignores sort params**  
   Always sorts by `createdAt: -1`. Add `orderBy`/`ascending` support like `getAllTeam`.

2. **getAllTeam memory for large downline**  
   Add `allowDiskUse: true` for aggregation when result set exceeds a threshold.

3. **Structure expansion depth**  
   Consider max expand depth or “load more” to avoid 100s of sequential API calls on very deep trees.

4. **Admin structure nodeId scope**  
   Consider validating that `nodeId` is under target `userId` for admin structure endpoint, unless full-tree access is desired.

## 🟢 Optional Optimizations

1. **Cache team counts**  
   Redis/Memory cache for `directCount`/`totalDownlineCount` with invalidation on registration.

2. **Covering index for level-wise count**  
   `{ ancestor: 1, level: 1, user: 1 }` for count-only queries.

3. **Batch structure loading**  
   API to return multiple levels in one call to reduce round-trips (e.g., root + 2 levels).

4. **Read replica**  
   Team reads are heavy; route to secondary for reporting if replica set exists.

---

*End of report. For implementation details, see:*
- *`server/services/teamService.js`*
- *`server/services/teamRegistrationService.js`*
- *`server/models/UserHierarchy.js`*
- *`server/services/incomeService.js` (getEligibleUplineChain)*
- *`server/services/rankEligibilityService.js` (getDownlineIds)*
