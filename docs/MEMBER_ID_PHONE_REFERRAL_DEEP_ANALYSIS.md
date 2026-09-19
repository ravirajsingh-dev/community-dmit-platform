# Member ID, Phone, aur Referral — Deep Technical Report

**Scope:** `server/models/User.js` fields `memberId`, `phone`, `referredBy`, `referredByMemberId`; unka generation, validation, lifecycle; aur agar format badalna ho to kahan-kahan touch karna padega.

**Codebase snapshot:** branch `feature/member-id`, `ROOT_MEMBER_ID` = `9999999999-99` (`server/constants/system.js`).

---

## 1. Terminology (ReferralId vs database)

| User / API term | Database fields |
|-----------------|-----------------|
| **Referral ID** (registration / admin body: `referralId`) | **Nahi** — yeh alag column nahi hai. Server isko resolve karke `referredBy` (ObjectId) aur `referredByMemberId` (string) set karta hai. |

Yani **“ReferralId”** practically **sponsor ka Member ID** hai jo client bhejta hai; store **`referredBy` + `referredByMemberId`** me hota hai.

---

## 2. `memberId`

### 2.1 Schema (`User.js`)

- **Type:** `String`, **unique**, **required**, **`immutable: true`** (Mongoose default updates me is field ko change hone se rokta hai).
- **Length:** `minlength` / `maxlength` **13** — yeh **exactly 13 character** string enforce karta hai (10 digit phone + `-` + 2 digit sequence).

```11:19:server/models/User.js
    memberId: {
      type: String,
      unique: true,
      required: true,
      immutable: true,
      index: true,
      minlength: 13,
      maxlength: 13,
    },
```

### 2.2 Canonical format (business rule)

- **Pattern:** `<10-digit-phone>-<2-digit-sequence>`  
  Example: `9876543210-01`, `9876543210-02`, … `9876543210-99`.
- **Sequence:** `01` se `99` tak; **00 use nahi** (frontend validators `00` ko `01` me badal dete hain).
- **Ek phone par max 99 accounts** — `generateMemberIdFromPhone` pehli khali sequence dhoondhta hai (gap-fill), max 99.

### 2.3 Generation (`server/utils/helper.js`)

`generateMemberIdFromPhone(phone, session?)`:

1. Phone ko string trim; agar length **10** nahi to `throw new Error("Invalid phone number format")`.
2. Usi `phone` wale saare users ka `memberId` fetch; regex `/-(\d{2})$/` se sequence nikaalta hai.
3. `1..99` me se pehla unused sequence leta hai; `memberId = `${phone}-${pad2(seq)}``.
4. Collision par dubara try (race safety).

```88:132:server/utils/helper.js
module.exports.generateMemberIdFromPhone = async (phone, session = null) => {
  const User = require("../models/User");

  // Ensure phone is a string
  const phoneStr = String(phone).trim();

  if (!phoneStr || phoneStr.length !== 10) {
    throw new Error("Invalid phone number format");
  }
  // ... existing users, sequences 01-99, gap fill ...
  const sequenceStr = String(nextSequence).padStart(2, "0");
  const memberId = `${phoneStr}-${sequenceStr}`;
```

**Call sites (primary):**

- User registration: `server/routes/user/auth/Controllers/RegisterController.js` (transaction ke andar).
- Admin user create: `server/routes/admin/Controllers/AdminUserController.js` → `createUser`.
- Admin user **phone change**: `updateUserById` → naya `memberId` phir se `generateMemberIdFromPhone(newPhone)` se.

### 2.4 Kab change hota hai?

| Path | `memberId` change? |
|------|-------------------|
| Normal user profile update (`ProfileController`) | **Nahi** — body me `memberId` / `phone` aane par reject. |
| Public registration | **Set once** at create. |
| Admin edit user — **phone change** | **Haan** — naya phone → naya `memberId`; `findByIdAndUpdate` **`overwriteImmutable: true`** se immutable override. |
| Direct DB / script | Possible (schema se bahar). |

**Downstream propagation (admin phone change):** jin users ka `referredBy` is user ki `_id` hai, unka **`referredByMemberId`** bulk update se naye sponsor memberId par set hota hai (`User.updateMany({ referredBy: user._id }, { $set: { referredByMemberId: newMemberId } })`). **`referredBy` ObjectId same rehta hai** (sponsor user wahi hai, sirf unka public id string badla).

### 2.5 Validation layers

1. **Mongoose:** length 13, required, unique, immutable (except explicit overwrite).
2. **Generator:** phone must be 10 chars; sequence 01–99 implicit.
3. **Client / Admin UI:** `client/src/utils/memberIdFormatter.js` aur `admin/src/utils/memberIdFormatter.js` — `MEMBER_ID_REGEX = /^[0-9]{10}-[0-9]{2}$/`, sequence 1–99.
4. **Referral lookup:** `referralService.validateReferralId` — DB me `memberId` **trim + `.toUpperCase()`** se match (digits/dash par asar kam, future alphanumeric ke liye relevant).

### 2.6 Root user exception

`ROOT_MEMBER_ID` (`9999999999-99`) ke liye schema `referredBy` / `referredByMemberId` **required nahi**; pre-save hook referral skip karta hai.

```154:159:server/models/User.js
UserSchema.pre("save", async function () {
  if (this.memberId !== ROOT_MEMBER_ID) {
    if (!this.referredBy || !this.referredByMemberId) {
      throw new Error("Referral is mandatory");
    }
  }
});
```

---

## 3. `phone`

### 3.1 Schema (`User.js`)

```26:32:server/models/User.js
    phone: {
      type: String,
      required: true,
      index: true,
      minlength: 10,
      maxlength: 10,
    },
```

- **Exactly 10 characters** (string), indexed.
- **Unique constraint schema par nahi** — isliye **ek hi phone par multiple users** ho sakte hain (alag `memberId` sequence ke saath). Yehi design `generateMemberIdFromPhone` aur registration comment se match karti hai.

### 3.2 Kab change hota hai?

| Path | Behavior |
|------|----------|
| **User profile API** | **Phone change blocked** — explicitly error. |
| **Admin `updateUserById`** | Phone change **allowed**; uniqueness check: koi **dusra** user same phone na ho; phir **memberId regenerate** (upar 2.4). |
| **Registration / Admin create** | Pehli baar set. |

### 3.3 Validation (high level)

- **RegisterController:** `phoneStr.length === 10` (digits assumption implicit — sirf length).
- **Admin createUser:** digits-only `/^\d+$/`; **explicit 10-digit check yahi par har jagah nahi** — agar length galat ho to `generateMemberIdFromPhone` ya Mongoose save par fail.
- **Admin phone update:** digits-only; **length 10 ka explicit check update path me nahi** — phir bhi `generateMemberIdFromPhone` 10 digit maangta hai.
- **Utility:** `server/utils/inputValidation.js` → `validatePhone` = exactly 10 digits (strip non-digits). **Admin create currently is helper se phone validate nahi karta** (inconsistency note).

### 3.4 `alternatePhone`

Same **10-digit** length rule (optional field); profile/admin me alag validation — main `phone` se different hona chahiye where enforced.

---

## 4. Referral: `referredBy` + `referredByMemberId`

### 4.1 Schema

```64:80:server/models/User.js
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: function () {
        return this.memberId !== ROOT_MEMBER_ID;
      },
      index: true,
    },
    referredByMemberId: {
      type: String,
      required: function () {
        return this.memberId !== ROOT_MEMBER_ID;
      },
      index: true,
      minlength: 13,
      maxlength: 13,
    },
```

- **`referredBy`:** sponsor user ka Mongo `_id` — **canonical graph edge** (team hierarchy, `populate`, indexes).
- **`referredByMemberId`:** sponsor ka **`memberId` string denormalized** — UI / reports / queries bina populate ke.

Dono non-root users ke liye required; **length 13** `referredByMemberId` par bhi (same family as `memberId`).

### 4.2 API: `referralId` → fields

- **RegisterController:** body `referralId` → `validateReferralId` → `referredBy = sponsor._id`, `referredByMemberId = sponsor.memberId`.
- **AdminUserController `createUser`:** same mapping; `referralId` allowed field list me inject.
- **AdminUserController `updateUser`:** naya `referralId` → same validation; sponsor change par `processSponsorChange` (counts/hierarchy); **empty `referralId` non-root par error** (“Referral cannot be removed”).

### 4.3 `validateReferralId` (`server/services/referralService.js`)

1. Non-empty string.
2. `normalizedMemberId = trim().toUpperCase()`.
3. `User.findOne({ memberId: normalizedMemberId })`.
4. Referrer `status` in `[1, 4]` (Active ya New) — warna “not allowed to refer” class messages.

**Note:** RegisterController kuch extra messages map karta hai (“not active”, “not completed payment”) — agar `referralService` me ye checks baad me add hon to wahi source of truth hoga.

### 4.4 Referral remove / update guards

- **pre("save"):** non-root par `referredBy` / `referredByMemberId` missing → `"Referral is mandatory"`.
- **pre("findOneAndUpdate"):** non-root user par referral **null / $unset** → `"Referral cannot be removed"`.

```184:208:server/models/User.js
UserSchema.pre("findOneAndUpdate", async function (next) {
  // ...
  if (doc.memberId !== ROOT_MEMBER_ID) {
    const newReferredBy = update?.referredBy ?? update?.$set?.referredBy;
    // ... unset checks ...
    if (
      newReferredBy === null ||
      newReferredByMemberId === null ||
      unsetReferredBy ||
      unsetReferredByMemberId
    ) {
      const err = new Error("Referral cannot be removed");
```

### 4.5 Sponsor change + `referredByMemberId` sync

- Admin sponsor change: `processSponsorChange` referral graph fix karta hai; `referredBy` / `referredByMemberId` update flow me special-case.
- Jab **edited user ka khud ka `memberId`** badle (phone change): unke **direct referrals** ka sirf **`referredByMemberId` string** update (upar 2.4).

---

## 5. Agar format change karna ho — checklist

Neeche assume karte hain: naya format alag length, alag separator, ya phone part 10 digit se alag ho.

### 5.1 Database / model

- `server/models/User.js`: `memberId`, `referredByMemberId` ke **`minlength` / `maxlength`** naye format ke mutabiq.
- **`ROOT_MEMBER_ID`** (`server/constants/system.js`) — naye format me root constant + **migration** jo purane root ko map/update kare.
- Har jagah **hardcoded “13”** / `9999999999-99` assumptions grep karke update (tests, scripts).

### 5.2 Generation / server logic

- **`server/utils/helper.js`** — `generateMemberIdFromPhone` (ya naya naming): phone width, separator, sequence width, max accounts per phone, regex `/-(\d{2})$/` → naye pattern ke regex.
- **Registration + Admin create/update** — `RegisterController.js`, `AdminUserController.js`.
- **`referralService.js`** — normalize / lookup keys agar format case-sensitive ya alphanumeric ho.

### 5.3 Frontend

- **`client/src/utils/memberIdFormatter.js`** aur **`admin/src/utils/memberIdFormatter.js`** — `MEMBER_ID_REGEX`, `formatMemberIdInput`, cursor logic (dash position), paste handlers (admin vs client thoda different hai — dono sync karein).

### 5.4 Seeds / stress tests / scripts

- `server/scripts/fullResetRealistic300Test.js` — `memberIdFromPhone`
- `server/scripts/sponsorEligibilityLevelCommissionStressTest.js` — `makeMemberIdByPhone`
- `server/tests/*.js` fixtures
- Koi bhi **display** jo `toUpperCase()` / fixed length maan le

### 5.5 Services / routes (partial list — grep se poora set nikalein)

- Regex / exact match: `appointmentService`, `designationService`, `counsellingSessionService`, `sbiProSessionService`, `RankController`, `ReferralController`, `WalletManagementController`, `withdrawalService`, `teamService`, `LevelCommissionController` (`trim().toUpperCase()` on sponsor memberId), etc.
- **Snapshots / PDFs / exports** jo memberId dikhate hon.

### 5.6 Data migration

- Existing users: **purane `memberId`** ko naye format me map karna, **unique index**, saare **`referredByMemberId`** jo purane memberId store karte hain unko update, external systems / printed cards agar ho to compatibility window.

### 5.7 Behavioral notes (format change ke waqt)

- **`immutable: true`** ab bhi hai — sirf jahan **`overwriteImmutable: true`** use ho wahi programmatic change.
- **Denormalization:** `referredByMemberId` hamesha sponsor ke current `memberId` se sync nahi rehta agar sponsor ka id badle — **partial sync** sirf documented flows me (e.g. admin phone change propagation). Format change migration me **full recompute** sochna padega.

---

## 6. Short summary (हिंदी / Roman Urdu)

- **`memberId`:** `phone` + `-` + 2 digit; **13 char**; **unique**; zyada tar **immutable**; **ban’ta** `generateMemberIdFromPhone` se; **user apna change nahi** kar sakta; **admin phone badle to naya `memberId`** + **downline ke `referredByMemberId` update**.
- **`phone`:** **10 digit string**; **multiple users same phone** allowed; user API se **lock**; admin se **change** + **memberId dubara generate**.
- **Referral:** API me **`referralId`** = sponsor ka member id; DB me **`referredBy`** (ObjectId) + **`referredByMemberId`** (string); **root** (`9999999999-99`) **bina referral**; referral **hataana** hooks se **mana**.
- **Format badalna:** schema lengths, `ROOT_MEMBER_ID`, helper generator, **dono** `memberIdFormatter` files, **saari** search/regex/admin/client flows, scripts/tests, **migration**.

---

*Document generated from repository analysis; line references stable until referenced files change.*
