# Phase 3 – DMIT Frontend Structure Outline

React-level pseudo-components and API usage.

---

## Trainer Panel

### 1. DMIT Sessions List (`DmitSessionsList.jsx`)

- **API**: `GET /api/users/dmit-sessions/assigned?page=1&limit=20&status=`
- **Shows**: Table/cards of assigned DMIT sessions
- **Columns**: appointmentId, userId, status, uploadedCount/10, createdAt
- **Filter**: Optional dropdown for status (CREATED, UPLOADING, UPLOADED, VERIFICATION_PENDING, REOPENED, etc.)
- **Actions**: Click row → go to upload page

### 2. DMIT Upload Page (`DmitUploadPage.jsx`)

- **API**: `GET /api/users/dmit-sessions/:appointmentId` (single session)
- **Shows**: 10 upload slots in a grid (LEFT_THUMB, LEFT_INDEX, … RIGHT_LITTLE)
- **Each slot**:
  - Label (e.g. "Left Thumb")
  - `DONE` indicator if `session.images[fingerType]` exists
  - Upload button (opens file input) – disabled if already done
- **Upload API**: `POST /api/users/dmit-sessions/upload`
  - `FormData`: `appointmentId`, `fingerType`, `image` (file)
- **Submit button**:
  - Enabled only when `uploadedCount === 10`
  - `POST /api/users/dmit-sessions/submit` with `{ appointmentId }`

---

## User Panel

### 3. DMIT Verification Banner (`DmitVerificationBanner.jsx`)

- **API**: `GET /api/users/dmit-sessions/pending-verification`
- **Shows**: Banner at top if `sessions.length > 0`
- **Content**: "You have N DMIT session(s) pending verification"
- **Click** → go to verification page

### 4. DMIT Verification Page (`DmitVerifyPage.jsx`)

- **Shows**: List of pending sessions (or single if from banner)
- **Per session**: appointment info (no image preview per spec)
- **Buttons**: Confirm | Reject
- **API**: `POST /api/users/dmit-sessions/verify`
  - Body: `{ appointmentId, confirm: true }` or `{ appointmentId, confirm: false }`

---

## Admin Panel

### 5. DMIT Sessions Admin List (`AdminDmitSessionsList.jsx`)

- **API**: `GET /api/admin/dmit-sessions?page=1&limit=20&status=`
- **Shows**: Table of all sessions
- **Columns**: appointmentId, userId, trainerId, status, uploadedCount, createdAt
- **Filter**: Dropdown by status (especially ANALYSIS_PENDING)
- **Action**: "Mark Analysis Done" button per row (only if `status === "ANALYSIS_PENDING"`)
- **API**: `POST /api/admin/dmit-sessions/mark-analysis-done`
  - Body: `{ appointmentId }`

---

## FINGER_TYPES Constant (Frontend)

```js
const FINGER_TYPES = [
  "LEFT_THUMB", "LEFT_INDEX", "LEFT_MIDDLE", "LEFT_RING", "LEFT_LITTLE",
  "RIGHT_THUMB", "RIGHT_INDEX", "RIGHT_MIDDLE", "RIGHT_RING", "RIGHT_LITTLE",
];
```

---

## Status Display Mapping

| Status               | Trainer View       | User View  | Admin View      |
|----------------------|--------------------|-----------|------------------|
| CREATED              | Can upload         | –         | List             |
| UPLOADING            | Can upload         | –         | List             |
| UPLOADED             | Can submit         | –         | List             |
| VERIFICATION_PENDING | Waiting user       | Verify    | List             |
| REOPENED             | Can re-upload      | –         | List             |
| ANALYSIS_PENDING     | Waiting backend    | –         | Mark Done        |
| CLOSED               | Done               | –         | List             |
