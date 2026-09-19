# Appointment Slot System – Structural Upgrade Analysis

**Document Version:** 1.0  
**Date:** March 2025  
**Status:** Production-Audit Ready

---

## 1. Previous Flaws

### 1.1 Date-Only Booking Model
- **Problem:** Capacity enforced at date level via `maxSessionsPerDay` per designation.
- **Impact:** A holder could book N sessions per day regardless of time; no control over which time blocks were used.
- **Consequence:** Inefficient use of holder time; no granular availability.

### 1.2 No Per-User Per-Date Uniqueness
- **Problem:** Users could create multiple active bookings (PENDING/ACCEPTED) for the same designation and date.
- **Impact:** Double-booking risk; confusion when multiple requests existed for the same slot.
- **Consequence:** Business rule violation; potential over-commitment.

### 1.3 Race Conditions
- **Problem:** Count-then-create pattern without transactional protection for capacity checks.
- **Impact:** Concurrent requests could exceed slot capacity.
- **Consequence:** Overbooking under load.

### 1.4 Coarse Availability
- **Problem:** "Next available" was date-only; no awareness of specific time slots.
- **Impact:** Users could not discover when slots would be free.
- **Consequence:** Poor UX; manual date scanning.

---

## 2. Structural Changes

| Area | Before | After |
|------|--------|-------|
| Capacity | `maxSessionsPerDay` per holder per date | Per-slot capacity per holder per date |
| User rule | None | One active booking per user per designation per date |
| Time model | Single `sessionStartTime` | `slotId` → SlotDefinition (label, startTime, endTime, capacity) |
| Availability | Date-level next available | Slot-aware (date + slot) |
| Transaction | Partial | Full transactional booking flow |

---

## 3. Slot-Based Architecture (Text)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WALLET SETTINGS                                  │
│  designations[] (designationCode, name, ...)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SLOT DEFINITION (NEW)                               │
│  designationCode, label, startTime, endTime, capacity, active           │
│  Indexes: { designationCode: 1 }, { active: 1 }                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPOINTMENT                                      │
│  requesterId, designationCode, assignedTo, slotId, dateKey, status      │
│  Compound index: { assignedTo, dateKey, slotId, status }                  │
└─────────────────────────────────────────────────────────────────────────┘

Booking Flow:
1. User selects designation → holders listed (ACTIVE + APPROVED)
2. User selects holder → date picker
3. User selects date → slots fetched with (booked/capacity) per holder+date
4. User selects available slot → book(holderId, designationCode, dateKey, slotId)
5. Service: check user unique rule → transactional capacity check → create
```

---

## 4. New Booking Flow

1. **Select designation** – Active designations from eligibility.
2. **Select holder** – Online holders with APPROVED designation.
3. **Select date** – Date picker (min: today).
4. **Fetch slots** – `GET /api/users/appointments/slots-availability?holderId=&designationCode=&dateKey=`
   - Returns slots with `booked`, `capacity`, `available`, `remaining`.
5. **Show time blocks** – e.g. "10:00 - 12:00 (2/3 booked)".
6. **Disable if full** – `available: false` → button disabled.
7. **Book with slotId** – `POST /api/users/appointments/book` with `{ holderId, designationCode, dateKey, slotId }`.

---

## 5. Concurrency Protection

### 5.1 User Unique Booking Rule
- **Check:** `countDocuments({ requesterId, designationCode, dateKey, status: { $in: ["PENDING","ACCEPTED"] } })`
- **If > 0:** Reject with `APPOINTMENT_ONE_BOOKING_PER_DATE`.
- **Placement:** Before transaction (pre-validation).

### 5.2 Slot Capacity
- **Inside transaction:**
  - `countSlotBookings(holderId, slotId, dateKey, session)` for ACCEPTED+COMPLETED.
  - If `count >= slot.capacity` → throw, abort.
  - Create appointment with `slotId`.
- **Mechanism:** `runWithTransactionRetry` ensures atomic read-check-write.

### 5.3 No Duplicate Slot Bookings
- User rule prevents multiple active bookings per date.
- Slot capacity prevents overbooking per holder+slot+date.

### 5.4 Self-Booking Block
- Unchanged: `requesterId !== assignedTo`.

---

## 6. Index Strategy

| Collection | Index | Purpose |
|------------|-------|---------|
| slotdefinitions | `{ designationCode: 1 }` | List slots by designation |
| slotdefinitions | `{ active: 1 }` | Filter active slots |
| appointments | `{ assignedTo: 1, dateKey: 1, slotId: 1, status: 1 }` | Slot capacity count |
| appointments | `{ requesterId: 1, designationCode: 1, dateKey: 1, status: 1 }` | User unique rule check (existing indexes) |

---

## 7. Scalability Notes

- **Slot definitions:** Small set per designation; cached if needed.
- **Slot availability:** One aggregation per holder+date; bounded by slot count.
- **Next available:** Iterates dates + slots; capped at 30 days; can add early-exit.
- **Indexes:** Compound index supports efficient capacity and user-rule queries.
- **Transactions:** MongoDB transactions; replica set required.

---

## 8. Migration Steps

### 8.1 Pre-Migration
1. Backup MongoDB.
2. Deploy code with `slotId` required on Appointment schema.

### 8.2 Schema Migration
1. **Create SlotDefinition collection** – model and indexes.
2. **Seed default slots** – For each active designation in WalletSettings, create at least one slot (e.g. "Default 09:00-12:00", capacity from `maxSessionsPerDay` or default 5).
3. **Backfill appointments** – For existing appointments without `slotId`:
   - Option A: Assign default slot for that designation.
   - Option B: Run migration script:
     ```javascript
     // Pseudocode: for each appointment without slotId, find/create default slot, set slotId
     ```
4. **Sync indexes** – `Appointment.syncIndexes()`, `SlotDefinition.syncIndexes()`.

### 8.3 Post-Migration
1. Verify no appointments have null `slotId`.
2. Add slot definitions via Admin Slot Management for all designations.
3. Remove or deprecate `maxSessionsPerDay` from designation config (optional; can remain for legacy display).

### 8.4 Rollback
- Reverting code without reverting data: old code will fail on `slotId` required.
- Full rollback: restore DB backup; redeploy previous code.

---

## 9. API Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/appointments/slots/:designationCode` | List slots for designation |
| GET | `/api/users/appointments/slots-availability` | Slots with booked count (holder, designation, date) |
| GET | `/api/users/appointments/next-available/:holderId/:designationCode` | Slot-aware next available |
| POST | `/api/users/appointments/book` | Book with `holderId`, `designationCode`, `dateKey`, `slotId` |
| GET | `/api/admin/slots` | Admin list slots |
| POST | `/api/admin/slots` | Admin create slot |
| PUT | `/api/admin/slots/:id` | Admin update slot |
| PATCH | `/api/admin/slots/:id/toggle` | Admin toggle active |

---

## 10. Constraints Preserved

- **Commission engine:** Not modified.
- **ACTIVE-only universe:** Holder/requester filters unchanged.
- **Transactional safety:** Booking uses `runWithTransactionRetry`.
- **No self-booking:** Enforced.
- **No double booking per user per day:** New `APPOINTMENT_ONE_BOOKING_PER_DATE` rule.
