# Clean Room Validation — Full Fintech Activation Engine Audit

A comprehensive institutional-grade validation script for the activation and level commission engine.

## Safety

- **Runs ONLY on non-production database.** Aborts if `NODE_ENV === "production"` or DB name contains `"prod"`.
- **Full data reset:** Deletes ALL users (except SYSTEM ROOT), wallets, transactions, level records, epins, sessions.
- **Test database required.** Do not run against production.

## Usage

```bash
cd server
npm run test:clean-room
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLEANROOM_SEQUENTIAL_PARALLEL=1` | Run Scenario 8 (parallel activation) sequentially. Use when MongoDB has transaction contention (e.g. Atlas replicas). |
| `CLEANROOM_ALLOW_SYSTEM_LEVEL_CREDIT=1` | Allow SYSTEM_ACCOUNT (Root) to receive level commission. By default, the script reports a violation if Root is paid as a sponsor. Set to `1` if your design intentionally pays Root. |
| `RUN_FAILURE_SIM=0` | Skip Scenario 9 (crash simulation). |

## Sections

0. **Safety Check** — NODE_ENV, DB name, abort if prod  
1. **Full Data Reset** — Delete all data, recreate SYSTEM_ACCOUNT MAIN wallet  
2. **Verify Config** — WalletSettings: registrationFee > 0, levels, commission ≤ 100%  
3. **Create 100 Users** — Group A (30 deep), B (30 wide), C (30 random), D (10 edge)  
4. **Activation Scenarios** — 9 scenarios (normal, partial upline, inactive sponsor, etc.)  
5. **Per-Activation Validation** — Debit, system credit, level credits, records  
6. **Global Reconciliation** — A=B, ledger balanced  
7. **Running Balance Simulation** — SYSTEM_ACCOUNT never negative  
8. **Duplicate & Integrity Check** — Idempotency, no duplicates  
9. **Edge Corruption Check** — Orphan detection, negative balances  
10. **Final Forensic Report** — Pass/Fail  
11. **Activation Determinism Check** — Recompute level commission from user graph + WalletSettings, compare to ledger; per-activation and global sponsor income validation  

## Success Criteria

- `STATUS: CLEAN ROOM VALIDATION PASSED`
- `ENGINE IS FINANCIALLY SOUND`

All invariants must pass.
