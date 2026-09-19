# Phase 3 – DMIT Workflow Engine Implementation Summary

Designation_1 (Trainer) only. Lean implementation.

> **Complete step-by-step guide:** See [DMIT_WORKFLOW_COMPLETE_GUIDE.md](./DMIT_WORKFLOW_COMPLETE_GUIDE.md)

---

## 1. New Files Created

| File | Purpose |
|------|---------|
| `server/models/DMITSession.js` | Mongoose schema |
| `server/services/dmitSessionService.js` | All business logic |
| `server/routes/user/dmitSessionRoutes.js` | User/Trainer routes |
| `server/routes/user/Controllers/DMITSessionController.js` | User controller |
| `server/routes/admin/dmitSessionRoutes.js` | Admin routes |
| `server/routes/admin/Controllers/DMITSessionController.js` | Admin controller |
| `server/scripts/dmitCron.js` | 24h auto-verification cron |
| `docs/PHASE_3_DMIT_FRONTEND_OUTLINE.md` | Frontend structure |

---

## 2. Modified Files

| File | Change |
|------|--------|
| `server/services/appointmentService.js` | Create DMIT session when appointment ACCEPTED + designationCode 1 |
| `server/routes/index.js` | Registered `/api/users/dmit-sessions` and `/api/admin/dmit-sessions` |

---

## 3. API Reference

### User / Trainer

| Method | Path | Body/Params | Purpose |
|--------|------|-------------|---------|
| GET | `/api/users/dmit-sessions/assigned` | `?page=&limit=&status=` | List trainer's assigned sessions |
| GET | `/api/users/dmit-sessions/my-reports` | - | List user's completed reports (CLOSED with reportUrl) |
| GET | `/api/users/dmit-sessions/pending-verification` | - | List user's pending verifications |
| POST | `/api/users/dmit-sessions/upload` | FormData: `appointmentId`, `fingerType`, `image` | Upload finger image |
| POST | `/api/users/dmit-sessions/submit` | `{ appointmentId }` | Submit session (10 images) |
| POST | `/api/users/dmit-sessions/verify` | `{ appointmentId, confirm }` | User confirm/reject |
| GET | `/api/users/dmit-sessions/:appointmentId` | - | Get single session |

### Admin

| Method | Path | Body/Params | Purpose |
|--------|------|-------------|---------|
| GET | `/api/admin/dmit-sessions` | `?page=&limit=&status=` | List all sessions |
| POST | `/api/admin/dmit-sessions/upload-report` | FormData: `appointmentId`, `file` (PDF) | Upload report → CLOSED |
| POST | `/api/admin/dmit-sessions/complete` | `{ appointmentId }` | Mark done → CLOSED |
| GET | `/api/admin/dmit-sessions/analysis/:appointmentId` | - | Get finger analysis |
| PUT | `/api/admin/dmit-sessions/analysis` | `{ appointmentId, fingers }` | Save finger analysis |
| GET | `/api/admin/dmit-sessions/image` | `?appointmentId=&fingerType=` | Proxy finger image |
| DELETE | `/api/admin/dmit-sessions/image` | `?appointmentId=&fingerType=` | Delete finger image |

---

## 4. Cron Setup

Add to crontab (run hourly):

```
0 * * * * cd /path/to/godjee && node server/scripts/dmitCron.js
```

---

## 5. State Transitions

```
CREATED → UPLOADING
UPLOADING → UPLOADED
UPLOADED → VERIFICATION_PENDING
VERIFICATION_PENDING → VERIFIED → ANALYSIS_PENDING
VERIFICATION_PENDING → REOPENED → UPLOADING
ANALYSIS_PENDING → ANALYSIS_DONE → CLOSED
```

---

## 6. Finger Types

`LEFT_THUMB`, `LEFT_INDEX`, `LEFT_MIDDLE`, `LEFT_RING`, `LEFT_LITTLE`,  
`RIGHT_THUMB`, `RIGHT_INDEX`, `RIGHT_MIDDLE`, `RIGHT_RING`, `RIGHT_LITTLE`

---

## 7. Access Control

- **Trainer**: Only sessions where `trainerId` matches. APIs enforce via service.
- **User**: Only verify own sessions (`userId`).
- **Admin**: Full list and mark-analysis-done. No extra permission check (AdminAuth only).
