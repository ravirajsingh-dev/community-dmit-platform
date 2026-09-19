# Designation System Phase-1 – Implementation Guide

## 1. Final User Schema Modification

```javascript
// Added to server/models/User.js
designations: [
  {
    designationCode: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "REJECTED", "INACTIVE", "DELETED"],
    },
    appliedAt: { type: Date, required: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "admins", default: null },
    remarks: { type: String, default: null },
  },
],
```

**Designation config** (WalletSettings.designations) may include:
- `requiredDesignationCode`: Number | null – if set, user must have this many downline holders of that designation
- `requiredDesignationCount`: Number – minimum count required (0 = skip rule)

**Required designation rule** (when requiredDesignationCode exists and requiredDesignationCount > 0):
- Count ACTIVE downline users (status=1) with designations.designationCode = requiredDesignationCode and status = "APPROVED"
- If count < requiredDesignationCount → eligible = false
- Uses aggregation (closure table + lookup); no large arrays loaded

**Rules:**
- User can hold multiple designations
- Designations are lifetime once APPROVED
- Admin can set INACTIVE; soft delete sets status to DELETED
- User cannot apply if same `designationCode` is already PENDING or APPROVED (REJECTED/INACTIVE/DELETED can re-apply)
- **ACTIVE-only**: directCount, totalDownlineCount, monthly target, team size, and downline listing count ONLY users with `status === 1` (Active)

---

## 2. Migration Plan

### Pre-requisites
- Backup MongoDB
- Maintenance window optional (reads/writes remain safe; new field is additive)

### Steps

1. **Deploy code** (schema, services, routes)
2. **Run migration script:**
   ```bash
   node server/scripts/migrateDesignationSchema.js
   ```
   - Syncs indexes: `designations.designationCode`, `designations.status`
   - Initializes `designations: []` for users missing the field

3. **Indexes-only run:**
   ```bash
   SKIP_INIT=1 node server/scripts/migrateDesignationSchema.js
   ```

4. **Verify:**
   - `User.syncIndexes()` completes without error
   - Sample users have `designations` (array, possibly empty)

### Rollback
- No rollback needed; `designations` is additive
- Existing users without the field: code uses `user.designations || []`

---

## 3. Atomic Apply Query Example

```javascript
const result = await User.findOneAndUpdate(
  {
    _id: uid,
    $nor: [
      {
        designations: {
          $elemMatch: {
            designationCode,
            status: { $in: ["PENDING", "APPROVED"] },
          },
        },
      },
    ],
  },
  {
    $push: {
      designations: {
        designationCode,
        status: "PENDING",
        appliedAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        remarks: null,
      },
    },
  },
  { new: true }
);
// result === null → already PENDING/APPROVED (concurrency-safe)
```

---

## 4. Admin Approval Update Query

```javascript
// Approve or Reject
await User.findOneAndUpdate(
  {
    _id: userId,
    designations: {
      $elemMatch: { designationCode, status: "PENDING" },
    },
  },
  {
    $set: {
      "designations.$.status": newStatus,  // "APPROVED" | "REJECTED"
      "designations.$.approvedAt": new Date(),
      "designations.$.approvedBy": adminId,
      "designations.$.remarks": remarks,
    },
  },
  { new: true }
);
```

---

## 5. Eligibility Service Function

Location: `server/services/designationEligibilityService.js`

Core evaluation (no stored eligibility):

```javascript
function evaluateEligibility(config, user, monthBounds, monthlyDirectCount) {
  // 1) directCount >= selfSaleRequired
  // 2) totalDownlineCount >= teamSizeRequired
  // 3) monthlyDirectCount >= monthlyTarget
  // Returns { eligible: boolean, reason?: string }
}
```

Monthly count query:

```javascript
User.countDocuments({
  referredBy: userId,
  createdAt: { $gte: monthStart, $lte: monthEnd },
});
```

Uses index: `{ referredBy: 1, createdAt: -1 }`.

---

## 6. Downline Designation Query

```javascript
// 1. Get descendant IDs from UserHierarchy (index: { ancestor: 1 })
const descendantIds = await UserHierarchy.distinct("user", { ancestor: userId });

// 2. Query Users with APPROVED designation
const users = await User.find({
  _id: { $in: descendantIds },
  designations: {
    $elemMatch: {
      designationCode,
      status: "APPROVED",
    },
  },
})
  .select("memberId name phone email status directCount totalDownlineCount createdAt")
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
```

---

## 7. Edge Case Handling

| Edge Case | Handling |
|-----------|----------|
| User applies twice (race) | `findOneAndUpdate` with `$nor` blocks duplicate PENDING/APPROVED |
| Designation config removed | Apply fails: "Designation not found or inactive" |
| Inactive designation in WalletSettings | Filtered in eligibility; apply rejected |
| Monthly target = 0 | Treated as met (no minimum) |
| Empty downline for designation query | `distinct` returns []; User.find with `$in: []` returns [] |
| Admin approves non-existent | `findOneAndUpdate` returns null; "Pending designation not found" |
| User has no `designations` field | `user.designations \|\| []` everywhere |
| Timezone for month bounds | Uses server `Date` (monthStart/monthEnd per spec) |

---

## 8. Performance Considerations for 500K Users

| Aspect | Strategy |
|--------|----------|
| Eligibility | Single `countDocuments` for monthly direct; parallel with config fetch |
| Apply | Single atomic `findOneAndUpdate`; no transactions |
| Pending list | Aggregation with `$facet` for count + items; indexed on `designations.status` |
| Downline by designation | `UserHierarchy.distinct` + `User.find` with `$in`; both indexed |
| Indexes | `designations.designationCode`, `designations.status`, `referredBy`+`createdAt` |
| Pagination | Max 100 per page; `parsePaginationParams` |
| Closure table | No BFS; single indexed query for descendants |

---

## 9. Folder Structure

```
server/
├── models/
│   └── User.js                    # + designations field, indexes
├── services/
│   ├── designationEligibilityService.js   # getEligibilityForAll, evaluateEligibility
│   ├── designationService.js             # apply, decision, getDownlineWithDesignation, getPendingApplications
│   └── rankEligibilityService.js        # + elemMatch status: APPROVED for designation count
├── routes/
│   ├── user/
│   │   ├── designationRoutes.js          # /api/users/designations/*
│   │   └── Controllers/
│   │       └── DesignationController.js
│   └── admin/
│       ├── designationRoutes.js          # /api/admin/designations/*
│       └── Controllers/
│           └── DesignationController.js
├── scripts/
│   └── migrateDesignationSchema.js
└── config/
    └── teamIndexes.js             # User.syncIndexes (includes designation indexes)
```

---

## API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/designations/eligibility` | User | Eligibility for all designations |
| POST | `/api/users/designations/apply` | User | Apply for designation (body: `designationCode`) |
| GET | `/api/users/designations/downline/:designationCode` | User | Paginated downline with APPROVED designation (ACTIVE users only) |
| GET | `/api/admin/designations?status=&designationCode=&page=&limit=` | Admin | Unified listing; status: PENDING, APPROVED, REJECTED, INACTIVE, DELETED, ALL |
| POST | `/api/admin/designations/decision` | Admin | Approve/reject from PENDING |
| POST | `/api/admin/designations/inactive` | Admin | Set APPROVED designation to INACTIVE |
| POST | `/api/admin/designations/delete` | Admin | Soft delete (body: `userId`, `designationCode`, `remarks`) |
| POST | `/api/admin/designations/transition` | Admin | Transition status (e.g. REJECTED→APPROVED, INACTIVE→APPROVED) |

**Admin routes** use `checkPermission("designations")`. Sub-admins require `designations` in their permissions.

---

## 10. Example Response Payloads

### GET /api/users/designations/eligibility
```json
{
  "status": true,
  "message": "Eligibility retrieved",
  "response": {
    "designations": [
      {
        "designationCode": 1,
        "name": "SENIOR EXECUTIVE",
        "selfSaleRequired": 5,
        "teamSizeRequired": 50,
        "monthlyTarget": 2,
        "requiredDesignationCode": null,
        "requiredDesignationCount": null,
        "currentRequiredDesignationCount": null,
        "requirementMet": null,
        "eligible": true,
        "reason": null,
        "alreadyApplied": false,
        "currentStatus": null,
        "remarks": null
      },
      {
        "designationCode": 2,
        "name": "DIRECTOR",
        "requiredDesignationCode": 1,
        "requiredDesignationCount": 5,
        "currentRequiredDesignationCount": 3,
        "requirementMet": false,
        "eligible": false,
        "reason": "Required designation holders not met"
      }
    ],
    "directCount": 8,
    "totalDownlineCount": 120,
    "monthlyDirectCount": 3
  }
}
```

### POST /api/users/designations/apply (success)
```json
{
  "status": true,
  "message": "Designation application submitted",
  "response": {}
}
```

### GET /api/admin/designations/pending
```json
{
  "status": true,
  "message": "pending applications retrieved",
  "response": {
    "applications": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "memberId": "9999999999012",
        "name": "John Doe",
        "phone": "9876543210",
        "email": "john@example.com",
        "directCount": 8,
        "totalDownlineCount": 120,
        "designationCode": 1,
        "designationName": "SENIOR EXECUTIVE",
        "appliedAt": "2025-03-03T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 5,
      "totalPages": 1
    }
  }
}
```

---

## 11. Scalability Notes (500K+ users)

- **Closure table**: `UserHierarchy.distinct("user", { ancestor })` uses indexed `{ ancestor: 1 }`; no BFS.
- **Monthly direct count**: Single `User.countDocuments` with `{ referredBy, createdAt }` range; index `{ referredBy: 1, createdAt: -1 }`.
- **Apply**: Single atomic `findOneAndUpdate`; no transactions.
- **Admin lists**: Aggregation with `$facet` for count + items; indexed on `designations.status` and `designations.designationCode`.
- **Pagination**: Max 100 per page enforced via `parsePaginationParams`.
- **No cron**: Eligibility computed on-demand at apply time; no background jobs.
