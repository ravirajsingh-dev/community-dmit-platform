# Activation Integrity Test

Large-scale integrity testing of the Activation + Level Commission engine.

## Run

```bash
cd server
npm run test:activation-integrity
```

Or:

```bash
cd server
node scripts/activationIntegrityTest.js
```

## Requirements

- MongoDB connected (MONGO_URI in .env or environment)
- Root user (isSystemRoot=true) must exist
- WalletSettings with registrationFee > 0 and levels.length > 0

## Known Issues

### User Model: `next is not a function` (REQUIRED FIX)

If you see `TypeError: next is not a function` during activation, the User model's `findOneAndUpdate` pre-hook is incompatible with Mongoose 9. **This fix is required for the integrity test to complete.**

In `server/models/User.js`, around line 161 and 179, replace:
- `return next();` → `if (typeof next === "function") next(); return;`
- `return next(new Error(...));` → `if (typeof next === "function") return next(new Error(...)); throw new Error(...);`
- `next();` → `if (typeof next === "function") next();`

Or wrap all `next` calls: `if (typeof next === "function") next();`

### TransientTransactionError

MongoDB Atlas may occasionally return transient transaction errors. The test includes retry logic for activations.

### Duplicate memberId

Each run uses a unique timestamp-based prefix. If re-running immediately, wait a second or ensure prior test users were cleaned up.

## Sections

1. **Load Real Config** — WalletSettings.getOrCreateSettings()
2. **Create 75 Users** — Groups A (deep chain), B (wide tree), C (random), D (concurrency)
3. **Activate** — Bottom-first, mid-level, random, parallel
4. **Expectation** — Dynamic commission per level
5. **Validate** — Per-activation ledger checks
6. **Global Invariants** — SUM(credits)=SUM(debits), fee conservation
7. **Idempotency** — Re-activate 10 users, no duplicates
8. **Concurrency** — 10 parallel activations
9. **Failure Sim** — Force error, verify rollback (set RUN_FAILURE_SIM=0 to skip)
10. **Report** — FINANCIALLY SOUND or UNSAFE

## Output

The script prints a final report with:

- registrationFee used
- levels count
- total users activated
- totalDistributed / totalRetained
- ledger mismatch count
- idempotency / race-condition findings
- invariant violations

Exit code 0 = FINANCIALLY SOUND, 1 = UNSAFE.
