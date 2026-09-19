# Production Architecture Audit Report

**Project:** Godjee  
**Scope:** Designation System (Phase-1) + Appointment & Slot System (Phase-2)  
**Audit Type:** Deep Structural Analysis (Non-Implementation)  
**Target Scale:** 500K+ users, high concurrency  
**Date:** March 2025

---

## 1. System Overview (High-Level Architecture)

### Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENT (React)                    ADMIN (React)                            │
└────────────────┬────────────────────────────┬──────────────────────────────┘
                 │                            │
                 ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXPRESS API (Node.js)                                                       │
│  - User routes (/api/users/*)                                                │
│  - Admin routes (/api/admin/*)                                               │
└────────────────┬───────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SERVICES                                                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐│
│  │ designationService  │  │ designationEligibility│  │ userStatusTransition ││
│  │ designationEligibility│  │ Service              │  │ Service              ││
│  └─────────────────────┘  └─────────────────────┘  └──────────────────────┘│
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐│
│  │ appointmentService  │  │ slotService          │  │ WalletSettings       ││
│  └─────────────────────┘  └─────────────────────┘  │ (singleton)          ││
│                                                      └──────────────────────┘│
└────────────────┬───────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MONGODB (Replica Set required for transactions)                              │
│  Collections: users, user_hierarchy, appointments, slotdefinitions,          │
│              wallet_settings, wallet_transactions, ...                        │
└─────────────────────────────────────────────────────────────────────────────┘

CRON (standalone): appointmentCron.js → expirePendingAppointments() (hourly)
```

### Key Design Decisions

- **Designation:** Eligibility evaluated at apply-time only; no stored eligibility flag. WalletSettings.designations is source of truth.
- **Appointment:** Slot-based capacity; one active booking per user per designation per date; transactional booking.
- **Counts:** directCount and totalDownlineCount are ACTIVE-only; updated via userStatusTransitionService on status change.

---

## 2. Designation Engine Audit

### Strengths

| Area | Assessment |
|------|------------|
| **Eligibility Engine** | Clear rule order (directCount → teamSize → monthlyTarget → requiredDesignation). No stored eligibility; recomputed on demand. |
| **ACTIVE-Only Counting** | Consistently enforced: getMonthlyDirectCount, getRequiredDesignationHolderCount, userStatusTransitionService all filter `status === 1`. |
| **State Machine** | Well-defined PENDING→{APPROVED,REJECTED,DELETED}, APPROVED→{INACTIVE,DELETED}, etc. REJECTED/DELETED require remarks. |
| **Apply Atomicity** | `findOneAndUpdate` with `$nor` prevents double-apply when PENDING/APPROVED exists. E11000-style duplicate is impossible. |
| **Status Transition** | `findOneAndUpdate` uses `status: fromStatus` in query; concurrent transitions fail safely (no match). |
| **User Status + Counts** | Admin status change runs inside `runWithTransactionRetry`; User update + `handleStatusTransition` are atomic. |
| **Negative Floor** | `$max(0, count - 1)` prevents counters going negative on decrement. |

### Structural Flaws

| # | Flaw | Details |
|---|------|---------|
| 1 | **TOCTOU in Apply** | Eligibility is computed (directCount, monthlyDirectCount, requiredDesignationCount), then a separate `findOneAndUpdate` runs. Between check and update, another user could have become inactive, reducing counts. User could apply based on stale eligibility. Low severity but integrity risk. |
| 2 | **No Re-Validation at Approval** | Admin approves PENDING without re-checking current eligibility. User could have lost qualification between apply and approve. |
| 3 | **Designation Transition Not Transactional** | `transitionDesignationStatus` is a single-document update; no transaction. If admin action were ever composed with downstream effects (e.g., notification, audit), partial failure is possible. Currently minimal impact. |
| 4 | **designationStats Not Synced on Designation Change** | When designation goes INACTIVE/DELETED, holder’s `designationStats` entry remains. Holder is excluded from getHoldersForBooking (query filters APPROVED), but stale stats linger. Cosmetic/consistency issue. |

### Risk Zones

| Zone | Risk | Severity |
|------|------|----------|
| **getRequiredDesignationHolderCount** | Aggregation: `$match` ancestor → `$lookup` users → filter status+designations. For 100K+ downline, 100K `$lookup` rows + filter. High memory, slow. | **High** |
| **getDownlineWithDesignation** | `UserHierarchy.distinct("user", { ancestor })` loads all descendant IDs into memory. Then `User.find({ _id: { $in: descendantIds } })` with $in of 100K+ IDs. MongoDB $in limit ~16MB; ~100K ObjectIds ≈ 1.2MB. Works but inefficient; pagination is applied after full distinct. | **High** |
| **WalletSettings Hotspot** | `getOrCreateSettings()` is called on every designation/appointment request. No caching. Singleton doc; MongoDB will cache, but every request still does `findOne`. At scale, this is a read hotspot. | **Medium** |
| **getEligibilityForAll N+1** | For each config with requiredDesignationCode, `getRequiredDesignationHolderCount` runs separately. Multiple designations with same requiredDesignationCode share count (via Map), but still O(configs) aggregations. | **Medium** |

### Scalability Concerns (500K+ Users)

- **UserHierarchy volume:** ~500K users × avg depth → millions of hierarchy rows. Closure table is correct; indexes are adequate. Watch for `$lookup` and `distinct` on large ancestors.
- **getRequiredDesignationHolderCount:** O(downline) per call. Consider materialized counts or pre-aggregation for heavy designations.
- **Apply flow:** User read + multiple count queries + findOneAndUpdate. Latency acceptable but not optimized for high QPS.

### Suggested Improvements (Architectural Only)

1. Add eligibility re-check at admin approval time.
2. Introduce WalletSettings read-through cache (short TTL) for high-traffic paths.
3. Paginate or cursor `getDownlineWithDesignation` at DB level; avoid loading full descendant set.
4. Consider pre-computed/cached requiredDesignationCount for popular ancestors.

---

## 3. Appointment Engine Audit

### Strengths

| Area | Assessment |
|------|------------|
| **User Unique Booking** | Partial unique index `{ requesterId, designationCode, dateKey }` with `partialFilterExpression: { status: { $in: ["PENDING","ACCEPTED"] } }`. DB-level enforcement; E11000 on duplicate. |
| **Slot Capacity** | `countSlotBookings` (PENDING+ACCEPTED+COMPLETED) inside transaction; create only if count &lt; capacity. Atomic. |
| **Transaction Usage** | `bookAppointment` uses `runWithTransactionRetry`; capacity check + create in one transaction. |
| **State Transitions** | Accept/Reject/Complete/RequestCancel use `findOneAndUpdate` with status in query; atomic conditional updates. |
| **Offline Enforcement** | `toggleHolderOnline` blocks if PENDING/ACCEPTED exist. Holder must clear before going offline. |
| **Slot Overlap** | createSlot/updateSlot reject overlaps via `timesOverlap()`; no DB constraint but logic is correct. |
| **Cancellation Rules** | User cancel only PENDING; holder cancel request only ACCEPTED; both check `isSessionInFuture`. |

### Structural Flaws

| # | Flaw | Details |
|---|------|---------|
| 1 | **rateAppointment No Retry** | Uses manual `session.startTransaction()` / commit / abort. No `runWithTransactionRetry`. TransientTransactionError will fail permanently instead of retrying. |
| 2 | **getNextAvailableSlot in Error Path** | When capacity full, `getNextAvailableSlot` is called inside the transaction catch block. It does up to 14×N `countSlotBookings` calls (14 days × N slots). Not inside transaction; acceptable. But expensive for user-facing error response. |
| 3 | **Slot Overlap Race** | `createSlot` / `updateSlot` do read-then-insert/update. Two admins creating overlapping slots concurrently can both pass `timesOverlap` and both succeed. No DB unique constraint on (designationCode, startTime, endTime). |
| 4 | **Designation INACTIVE and Pending Appointments** | When admin sets holder designation to INACTIVE, existing PENDING/ACCEPTED appointments are not cancelled. Holder is excluded from getHoldersForBooking but can still accept/complete. Business decision vs. consistency. |
| 5 | **sessionStartTime Timezone** | `buildSessionStartDate` uses `${dateKey}T${hh}:${mm}:00.000Z` (UTC). Designation uses `getCurrentMonthBounds` with server local time. Potential timezone inconsistency. |

### Race Conditions

| Scenario | Current Mitigation | Residual Risk |
|---------|-------------------|----------------|
| Concurrent booking same slot | Transaction + count + create | **None** – transactional |
| Concurrent user double-book same date | Partial unique index | **None** – DB enforces |
| Two holders accept same appointment | findOneAndUpdate with status:PENDING | **None** – only one match |
| Slot create overlap | Read existing slots, then create | **Yes** – TOCTOU; two creates can overlap |
| Cron + user cancel same PENDING | updateMany vs updateOne | **Low** – both set cancelled; idempotent |

### Index Gaps

| Query Pattern | Index | Status |
|---------------|-------|--------|
| countSlotBookings(assignedTo, slotId, dateKey, status) | `{ assignedTo, dateKey, slotId, status }` | ✓ Covered |
| User unique (requesterId, designationCode, dateKey) partial | Exists | ✓ |
| getAdminAppointments (status, designationCode, dateKey range) | `{ status, designationCode, requestedAt }`, `{ dateKey }` | ✓ |
| expirePendingAppointments (status, requestedAt) | `{ status }`, `{ requestedAt }` | ✓ |
| getSlotsWithAvailability aggregation | `{ assignedTo, slotId, dateKey, status }` | ✓ |

No critical index gaps identified. `{ assignedTo, slotId, dateKey, status }` could be reordered to `{ assignedTo, dateKey, slotId, status }` to match exact query order; current index is sufficient.

### Governance Gaps

| Gap | Description |
|-----|-------------|
| **Admin Force Cancel** | `adminCancelAppointment` can cancel any status. No guard for COMPLETED (e.g., post-facto audit trail). |
| **Cancel Request Workflow** | CANCEL_REQUESTED requires admin approval. No SLA; holder can be stuck. |
| **No Bulk Operations** | No admin bulk cancel, bulk expire, or bulk slot deactivation. |

### Admin Control Gaps

| Gap | Description |
|-----|-------------|
| **Slot Deactivation + Appointments** | Toggling slot inactive does not affect existing appointments. User could book, then admin deactivates slot; appointment remains. |
| **Holder Revocation** | Setting holder designation INACTIVE does not cancel future appointments or force offline. |
| **Cron Single-Instance** | Cron runs as standalone process. Multiple instances (e.g., multiple pods) would both run updateMany; idempotent but redundant. |

### UX Architecture Gaps

| Gap | Description |
|-----|-------------|
| **Next-Available Cost** | Up to 14×N queries when slot full; can delay error response. |
| **No Real-Time Availability** | Slots availability is point-in-time; no push/WebSocket for changes. |
| **Holder Online Toggle** | No TTL; holder can stay “online” indefinitely without activity. |

---

## 4. Data Integrity & Concurrency Analysis

### Where Race Conditions Can Still Occur

| Location | Race | Mitigation |
|----------|------|------------|
| **Slot create/update overlap** | Two admins create overlapping slots | Add unique compound index or transaction-wrapped create |
| **Designation apply** | Stale eligibility between check and apply | Soft: user applies with outdated counts. Re-check at approval recommended |
| **Rating update** | Two ratings for same appointment (update vs insert) | Only COMPLETED allows rating; one rating per appointment. Logic allows update. No double-count if both run: second overwrites; first read may be stale. Consider unique constraint or idempotency key. |
| **WalletSettings create** | Two processes create singleton | getOrCreateSettings handles E11000; one wins. ✓ |

### Where Duplicate States May Appear

| Scenario | Risk |
|----------|------|
| **Duplicate designation entries** | Blocked by findOneAndUpdate $nor. Only one PENDING/APPROVED per code per user. |
| **Duplicate active bookings** | Blocked by partial unique index. |
| **Duplicate status transition** | findOneAndUpdate with fromStatus; second attempt gets no match. |
| **designationStats multiple entries per code** | Schema allows multiple; logic uses first match. No unique constraint on (userId, designationCode) in designationStats. Potential for duplicates if logic bug. |

### Where Transactions Are Required But Missing

| Operation | Current | Recommendation |
|-----------|---------|----------------|
| **bookAppointment** | ✓ runWithTransactionRetry | Correct |
| **rateAppointment** | Manual session, no retry | Use runWithTransactionRetry |
| **cancelByUser / accept / complete / reject** | Single-doc updates | Acceptable – atomic |
| **Designation transition** | Single-doc update | Acceptable |
| **Slot create** | No transaction | Add if overlap check + create must be atomic |
| **expirePendingAppointments** | updateMany | Acceptable – single collection |
| **Admin status change + handleStatusTransition** | ✓ runWithTransactionRetry | Correct |

---

## 5. Index & Performance Audit

### Missing Compound Indexes

| Collection | Query | Current | Recommendation |
|------------|-------|---------|----------------|
| **User** | getMonthlyDirectCount(referredBy, status, createdAt range) | `{ referredBy, status, createdAt }` | ✓ Exists |
| **User** | getRequiredDesignationHolderCount (via aggregation) | User.designations compound | ✓ Exists |
| **Appointment** | countSlotBookings | `{ assignedTo, dateKey, slotId, status }` | ✓ Exists |
| **SlotDefinition** | Overlap check (designationCode, active) | `{ designationCode }, { active }` | Consider `{ designationCode, active: 1 }` for overlap queries |

### Over-Indexing Risks

| Collection | Indexes | Risk |
|------------|---------|------|
| **Appointment** | 9 indexes including single-field status, requestedAt, dateKey | Write-heavy collections pay index maintenance cost. Single-field indexes may duplicate compound prefix. Low impact for now. |
| **User** | 7+ indexes on user, designations, designationStats | Acceptable for read-heavy user entity. |

### Query Pattern Mismatch

| Pattern | Issue |
|---------|-------|
| **getRequiredDesignationHolderCount** | Uses $lookup then $match. For large downline, $lookup materializes many docs. Consider $lookup with pipeline (MongoDB 3.6+) or separate aggregation optimized for count. |
| **getDownlineWithDesignation** | distinct() then find($in). distinct returns all IDs; pagination applied to find. Cannot efficiently paginate “descendants with designation” without cursor or range-based strategy. |
| **getNextAvailableSlot** | 14 × N sequential countSlotBookings. Could use single aggregation with $group across dates/slots. |

---

## 6. Production Readiness Score

| Component | Score | Rationale |
|----------|-------|-----------|
| **Designation System** | **7/10** | Strong state machine and ACTIVE-only logic. Apply and status transitions are safe. Scalability limits in getRequiredDesignationHolderCount and getDownlineWithDesignation. No eligibility re-check at approval. WalletSettings hotspot. |
| **Appointment System** | **7.5/10** | Solid transactional booking, partial unique index, capacity enforcement. rateAppointment lacks retry. Slot overlap race. getNextAvailableSlot costly. Cron and admin tooling adequate. |
| **Overall Architecture** | **7/10** | Coherent design; transactions used where critical. Gaps in retry, slot overlap, downline/hierarchy scaling, and config caching. Suitable for early production with identified mitigations. |

---

## 7. Critical Fix List (Ordered by Severity)

### Must Fix Before Production

| # | Item | System | Reason |
|---|------|--------|--------|
| 1 | **rateAppointment: Use runWithTransactionRetry** | Appointment | Prevents permanent failures on transient transaction errors. |
| 2 | **Slot overlap: Atomic create** | Appointment | Prevent concurrent overlapping slots; use transaction or unique constraint. |
| 3 | **Cron: Single-instance guarantee** | Appointment | Ensure only one expirePendingAppointments run per schedule (e.g., distributed lock or single cron runner). |

### Should Fix Soon

| # | Item | System | Reason |
|---|------|--------|--------|
| 4 | **WalletSettings caching** | Both | Reduce read load; short TTL cache. |
| 5 | **getRequiredDesignationHolderCount optimization** | Designation | Avoid O(downline) $lookup for large trees; consider aggregation pipeline or materialized count. |
| 6 | **getDownlineWithDesignation pagination** | Designation | Avoid loading full descendant set; paginate at DB level. |
| 7 | **Re-validate eligibility at designation approval** | Designation | Ensure user still qualifies when admin approves. |
| 8 | **Admin cancel COMPLETED: Add guard or audit** | Appointment | Clarify policy for cancelling completed appointments. |

### Can Improve Later

| # | Item | System | Reason |
|---|------|--------|--------|
| 9 | **getNextAvailableSlot: Single aggregation** | Appointment | Reduce 14×N queries to one. |
| 10 | **SlotDefinition compound index** | Appointment | `{ designationCode, active: 1 }` for overlap queries. |
| 11 | **Timezone consistency** | Both | Align sessionStartTime and month bounds (UTC vs local). |
| 12 | **designationStats cleanup on designation INACTIVE** | Designation | Remove or archive stale stats. |
| 13 | **Holder INACTIVE → cancel future appointments policy** | Appointment | Define behavior when holder loses designation. |

---

## 8. Future Phase Planning Advice

### Phase 2.2 Focus

1. **Appointment robustness**
   - rateAppointment retry and transaction hardening.
   - Slot overlap enforcement (DB constraint or transactional create).
   - Cron single-instance and observability.
2. **Admin tooling**
   - Bulk cancel, bulk expire.
   - Clear policy for COMPLETED cancellation and INACTIVE holder handling.
3. **Performance**
   - WalletSettings cache.
   - getNextAvailableSlot aggregation.

### Phase 3 Focus

1. **Designation scalability**
   - Pre-computed or cached requiredDesignationCount.
   - Paginated/cursor-based getDownlineWithDesignation.
   - Optional materialized eligibility for hot paths.
2. **Appointment UX**
   - Real-time or near-real-time slot availability.
   - Holder online TTL or activity-based status.
3. **Operational**
   - Distributed cron/lock for scheduled jobs.
   - Monitoring for count drift, designation approval lag, booking latency.

### Architecture Evolution (Longer Term)

- **Read replicas:** WalletSettings and read-heavy designation queries can use secondaries.
- **Caching layer:** Redis for WalletSettings, hot designation configs, and possibly slot availability.
- **Event-driven updates:** Consider events for user status change → count updates to support eventual consistency if needed.
- **Sharding:** users and user_hierarchy are primary candidates if hierarchy grows beyond single-node comfort.

---

*End of Audit Report*
