# DMIT Phases 2–7 Implementation Summary

**Date:** March 4, 2025

## Phase 2: Block Designation 1
- Already done in Phase 1 (early check + backend validation)

## Phase 3: Booking For Others (Beneficiary)
- **Appointment model:** `beneficiaryType`, `beneficiaryName`, `beneficiaryPhone`, `beneficiaryRef`
- **DMITSession model:** `requesterId`, `beneficiaryType`, `beneficiaryName`, `beneficiaryPhone`; `userId` optional for OTHER
- **Lock:** `isBeneficiaryPhoneDmitLocked(phone)` – child without phone uses parent phone
- **Validation:** Name + Phone mandatory for OTHER
- **Report:** Booker (requester) gets all reports; booker verifies for both SELF and OTHER

## Phase 4: Batch Booking
- **API:** `POST /api/users/appointments/book-batch`
- **Body:** `{ holderId, designationCode, dateKey, slotId, beneficiaries: [{ type, name?, phone? }, ...] }`
- Same date, same slot, same trainer – multiple appointments in one request
- Max 10 beneficiaries per batch
- **UI:** "For whom" section with Add person (name + phone), batch support

## Phase 5: Free Session Expiry
- **WalletSettings:** `freeSessionExpiryMonths` (default 12)
- **Eligibility API:** Returns `freeSessionInfo: { remaining, total, used, expiryDate }`
- **UI:** "Aapke paas X free sessions hain, use DD/MM/YYYY tak"
- Expiry = `user.createdAt + freeSessionExpiryMonths`

## Phase 6: Geographic / Downline
- **Geographic:** Skip (no location data in project)
- **Downline:** Already supported via `sameDownlineFirst` – all levels (direct + descendants)

## Phase 7: Admin Bypass
- **API:** `POST /api/admin/appointments/create-sbi-pro-override`
- **Body:** `{ requesterId, holderId, dateKey, slotId, beneficiary? }`
- Bypasses fingerprint lock; unlimited use; logged
- **Admin UI:** "Create DMIT (Override Lock)" button in Appointments page

## Migration Required
Run before deploying:
```bash
cd server && node scripts/migrateAppointmentBeneficiary.js
```
- Backfills `beneficiaryRef` for existing appointments
- Drops old 3-field unique index

## Admin: WalletSettings
Add `freeSessionExpiryMonths` (e.g. 2, 6, 12) via admin panel or DB.
