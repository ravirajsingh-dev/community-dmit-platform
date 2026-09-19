# Phase 2.2 – Advanced Slot Engine Readiness

**Document Version:** 1.0  
**Date:** March 2025  
**Scope:** Structural analysis only. No implementation.

---

## Section 1: Feature-by-Feature Status Table

| Feature | A) Schema Support | B) Structural Changes | C) Logic Blocks | Status |
|---------|------------------|------------------------|-----------------|--------|
| 1. Per-holder availability calendar | No holder-specific availability schema | New collection or User subdocument (HolderAvailability) | getSlotsWithAvailability uses designation-level slots; no per-holder unavailable dates | **MINOR CHANGE NEEDED** |
| 2. Precomputed availability matrix | N/A (optional) | Optional collection or cache layer | None | **READY** |
| 3. Rescheduling support | dateKey + slotId mutable | None | No reschedule API; needs transactional un-reserve + reserve; partial unique index permits in-place update | **MINOR CHANGE NEEDED** |
| 4. Blackout dates / holidays | None exist | New collection (e.g. BlackoutDate) | getSlotsWithAvailability, getNextAvailableSlot do not filter blackout | **MINOR CHANGE NEEDED** |
| 5. Bulk slot override | SlotDefinition is designation-level only | Override collection or SlotDefinition extension | No per-holder override; no bulk admin APIs | **MINOR CHANGE NEEDED** |
| 6. Emergency admin override | N/A | None | adminCancelAppointment exists; no force-book when slot full | **MINOR CHANGE NEEDED** |
| 7. Timezone safety | dateKey is YYYY-MM-DD (timezone-ambiguous) | None or tz field | buildSessionStartDate uses UTC; getCurrentMonthBounds uses server local; inconsistent | **MINOR CHANGE NEEDED** |
| 8. Advanced load distribution | Aggregation-capable | None | getHoldersForBooking has rating/sameDownlineFirst; no load-based sort; schema supports aggregation | **READY** |

---

## Section 2: Structural Blockers

| Blocker | Impact |
|---------|--------|
| No per-holder availability/blackout schema | Per-holder calendar and blackout require new structure (HolderAvailability or equivalent) |
| SlotDefinition lacks holderId | Slots are designation-wide; per-holder override needs separate structure |
| dateKey + sessionStartTime timezone convention undocumented | Calendar features may misinterpret dates across timezones |
| No reschedule transaction flow | Cancel+rebook possible but no atomic reschedule; schema permits it |

No **MAJOR ARCHITECTURE CHANGE** required for any feature. All gaps are additive (new collections, new service flows, convention alignment).

---

## Section 3: Answers to Specific Questions

1. **Does SlotDefinition + Appointment support per-holder calendar safely?**  
   **PARTIAL.** Appointment has `assignedTo` (holder); capacity is per holder+slot+date. No schema for holder-specific unavailable dates or overrides. Need HolderAvailability or similar for full per-holder calendar.

2. **Is booking engine flexible enough to support rescheduling?**  
   **YES (with new flow).** Schema allows in-place update of dateKey/slotId. Partial unique index `{ requesterId, designationCode, dateKey }` permits update (old tuple removed, new tuple applied). No reschedule service exists; needs transactional capacity release + acquire.

3. **Are there timezone inconsistencies that would break calendar features?**  
   **YES.** `buildSessionStartDate` treats dateKey+time as UTC (`…T${hh}:${mm}:00.000Z`). `getCurrentMonthBounds` uses `getFullYear()`/`getMonth()` (server local). dateKey YYYY-MM-DD is ambiguous. Risk of off-by-one day at boundaries.

4. **Does current capacity model support advanced load distribution?**  
   **YES.** Appointment aggregation by assignedTo + designationCode + status yields per-holder booking counts. getHoldersForBooking can add load-based sort (e.g. least-booked-first) without schema change.

5. **Is any frozen business rule conflicting with Phase 2.2?**  
   **NO.** Partial unique (one PENDING/ACCEPTED per requester+designation+date), self-booking block, progression rule, holder-online check, freeAppointmentsPerUser, ACTIVE-only—none conflict with Phase 2.2.

---

## Section 4: Verdict

**Can we safely move to Phase 3 after 2.2 implementation?**

**YES**, with the condition that Phase 2.2 work includes:
- New HolderAvailability/Blackout structure for per-holder calendar and blackout
- Reschedule service (transactional)
- Timezone convention (UTC or configurable) and alignment of getCurrentMonthBounds/buildSessionStartDate

No schema migration that breaks existing data. No removal or rewrite of core models. Additive changes only.

---

*End of Phase 2.2 Readiness Report*
