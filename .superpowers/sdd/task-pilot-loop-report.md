# Task Pilot-Loop report — FULL 138 Mulde pilot as embedded-Postgres integration tests

Branch `feat/138-phase-4-facility-sizing` (base 992f15d). Work dir `C:\Users\Ekowai\_wt-138-p4`.
All four pilot steps drive the REAL `saveWorksheet` / real compliance evaluator against a
self-provided embedded Postgres (no proxies, no prod, no credentials). New file:
`tests/harness/pilot-script.integration.test.ts` (runs in the `integration` project via the
existing `tests/harness/*.integration.test.ts` glob). Seed extended in
`tests/harness/seed-plt-hs01.ts`; harness infra hardened in `tests/harness/embedded-pg.ts`.

Guideline is ground truth. Citations used:
- **Gl.9 §5.3.3.7** (verbatim from source md line 1451): `q_S,AC = (k_i·A_S,m·1000 + Q_Dr)/A_C · 10⁴ ≥ 2 l/(s·ha)`
- **Gl.15 §6.3.2**: `V_M = A_S,m · h_M`
- **Gl.16**: Mulde geometry sweep (governing Dauerstufe)
- **Gl.7**: `A_S,m = (A_S,min + A_S,max)/2` (direct method)
- **Tab.14 §6.3.2**: `t_E ≤ 84 h`
- **REQ-19 §6/Tab.14**: `phase_4_gate_result IN {PASS, CONDITIONAL}` (block)

---

## Step 1 — Summary GREEN (post-Finding-H)
After the h_M nudge (asm producer fire → geometry sweep A_S,m + step-6b V_M + summary chain-fire),
the DB summary is asserted per value-column (standing rule):
- `facility_type_dimensioned` (text) = `'mulde'`
- `facility_footprint_m2` (number) ≈ `943.4339` (Gl.16 sweep)
- `facility_specific_volume_m3` (number) ≈ `283.0302` (Gl.15)
- `facility_specific_dimensioning_complete` (boolean) = `true`
- `facility_meets_qsac` (boolean) = `false` (q_S,AC ≈ 0.1557 < 2, Gl.9)
- `recommended_phase_4_gate` (enum) = `'FAIL'`
- reasons contain `q_S,AC … < 2 l/(s·ha)` and do NOT contain `unvollständig` / `V_M` / `fehlende`
  (proves the Finding-H V_M persistence holds — no "fehlende V_M" clause)
- all rows `source_type='derived'`

GREEN: `✓ Step 1 — summary GREEN: mulde/943.43/283.03/complete + qSac-only FAIL (no fehlende-V_M clause) 2ms`

## Step 2 — Verdict engineer-entry + REQ-19 gate
Engineer writes A138-23 `phase_4_gate_result`='FAIL' via real `saveWorksheet` → persists as
`value_enum='FAIL'`, `source_type='entered'`. REQ-19 (block) evaluated through the REAL
`checkApprovalGate` (the same path `worksheet-transition.ts` uses on `engineer_approve`):
- FAIL → `gate.ok=false`, `failingBlockConditions` contains `A138-REQ-19` → BLOCKS engineer_approve.
- PASS → REQ-19 not failing, `gate.ok=true` → transition allowed.
- CONDITIONAL → REQ-19 not failing → allowed.
Verdict restored to FAIL afterwards.

GREEN: `✓ Step 2 — engineer FAIL persists + REQ-19 blocks engineer_approve; PASS/CONDITIONAL allow 95ms`

## Step 3 — Verdict flip (PASS / CONDITIONAL demonstrable) — with a FINDING
Verdict-flip fixture math (Gl.9, Q_Dr=0): fixture `q_S,AC = k_i·A_S,m·1000/A_C·10⁴`
`= 7.98e-8·943.4338711·1000/4836.43·10⁴ = 0.15566… < 2` → FAIL driver.
Threshold `A_C* (q_S,AC=2) = k_i·A_S,m·1000·10⁴ / 2 = 376.43`. Shrink to `A_C = 0.8·A_C*` →
`q_S,AC = 2.5 ≥ 2` (a clear margin; my first attempt at "exactly 2" landed on the FP ULP
`1.9999999999999998 < 2`, correctly failing the `≥ 2` predicate — fixed by using 2.5).
- Persist `q_S,AC=2.5` (∈ PHASE4_SUMMARY_INPUT_SYMBOLS → summary re-fires) → `meetsQsac=true`,
  no Tab.14 flag → `recommended_phase_4_gate='PASS'`.
- Set `t_E=92` (>84 h, Tab.14 §6.3.2) → `recommended_phase_4_gate='CONDITIONAL'`, reason contains
  `t_E = 92 h > 84 h`.
- Restore (clear t_E, restore fixture q_S,AC) → `meetsQsac=false`, verdict back to `FAIL`.

GREEN: `✓ Step 3 — q_S,AC≥2 flips recommendation to PASS; t_E=92>84 → CONDITIONAL; restore → FAIL 51ms`

### FINDING H2 — summary `facility_meets_qsac` self-reference pin (fixed, in-layer)
RED-first: Step 3 failed (`meetsQsac` stayed `false` after persisting q_S,AC≥2). Root cause: the
summary DERIVES `facility_meets_qsac` and writes it back with `source_type='derived'`; the summary
branch's `readScopedBool('facility_meets_qsac')` then read that derived self-write as the
`meetsQsacFlag` INPUT on the next run. `assemblePhase4Summary` prefers an explicit flag over the
q_S,AC derivation, so the first materialized value (false) pinned `meetsQsac` forever — the Gl.9
value could never flip it. This contradicts the documented "explicit flag if set, else derive from
q_S,AC" intent (a derived self-write is NOT an engineer override).

Diagnostic (before fix): persist `q_S_AC=2` → `facility_meets_qsac` stayed `{value_boolean:false,
source_type:'derived'}`. RED-first confirmed by reverting the guard (Step 3 goes red), then restored
(green).

Fix (WITHIN the summary layer — `worksheet.ts` summary producer branch, `readScopedBool`): honour
ONLY an engineer-entered override (`source_type='entered'`); ignore the summary's own derived
self-write → `meetsQsac` correctly falls through to the Gl.9 derivation. `assemblePhase4Summary`
(pure) is UNCHANGED. Confirmed: with q_S,AC=2 the derived flag now flips to true / PASS. Stays
within the approved Finding-H summary-layer scope (single read-helper, no design change, no touch
outside the summary layer).

## Step 4 — Baseline restore byte-identical (A138-12 Tab.6 regression reference)
Restore facility mulde→flaeche (A138-15) + method geometry→direct with `A_S_min=A_S_max=45`
(Gl.7 → A_S_m=45) via real `saveWorksheet` on A138-12. Asserted:
- `A_S_m` re-derives to `45`, `source_type='derived'` (Gl.7).
- Tab.6 loading check re-derives `ac_as_ratio = A_C/A_S_m = 4836.43/45 = 107.47622…`,
  `ac_as_ratio_check='fail'` (fixture V2→tier2, bbz=0.2 m thin band → limit 30; 107.476 > 30).
(V_VA basin restore is out of the mulde harness scope — browser-only step, noted.)

GREEN: `✓ Step 4 — restore geometry→direct (A_S_m=45) + mulde→flaeche: A138-12 ratio=107.476, check=fail 48ms`

---

## Harness infra fixes (self-provided PG, no prod)
1. **UTF-8 cluster** (`embedded-pg.ts`): embedded PG defaulted to WIN1252 on this Windows box; the
   loading-check reason string `'A_S,m ≤ 0.'` failed with `22P05 report_untranslatable_char` on the
   `≤`. Added `initdbFlags: ['--encoding=UTF8','--locale=C']`.
2. **Port collision** (`embedded-pg.ts`): a 2nd harness file runs in its own vitest worker; both used
   the fixed start port 55432 → EADDRINUSE. Now seed the port counter from the PID
   (`50000 + pid%12000`) + retry adjacent ports on bind failure. Verified stable across 3 back-to-back
   runs of both harness files together (2 files / 5 tests green each time).

## Guards
- **Full pilot**: `Test Files 1 passed (1) · Tests 4 passed (4)`; both harness files together:
  `Test Files 2 passed (2) · Tests 5 passed (5)` (×3 stable).
- **#22 regression guard GREEN** (5 files): `computed-symbols`, `render-a138-17-asm-inherited-prod-signal`,
  `engine-wiring-suppress-a138-17`, `asm-source`, `a138-17-dual-role` →
  `Test Files 5 passed (5) · Tests 38 passed | 1 expected fail (39)`.
- **Unit project**: `Test Files 128 passed (128) · Tests 1195 passed | 1 expected fail (1196)`.
- **Integration project**: the 2 self-provided-PG harness files pass. The other 23 integration files
  fail ONLY on missing external env (`SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` unset in this
  sandbox) — pre-existing environmental requirement, unrelated to this change (they need an external
  Postgres + Supabase config).
- **by-file tsc** (baseline 28, matched EXACTLY, touched files add 0):
  - `worksheet-store-derived-apply.test.ts` 14
  - `build-vsme-xlsx.test.ts` 10
  - `pass3c-validate.test.ts` 2
  - `export-route.integration.test.ts` 1
  - `build-workbook.test.ts` 1

## Files touched
- `tests/harness/pilot-script.integration.test.ts` (new — 4 pilot steps)
- `tests/harness/seed-plt-hs01.ts` (extended fixture: q_S_AC, t_E, A_S_min/max, flaechengruppe,
  bbz_thickness, ac_as_ratio* outputs, REQ-19 compliance row, exposed field/instance ids)
- `tests/harness/embedded-pg.ts` (UTF-8 cluster + PID-seeded port + bind-retry)
- `src/lib/actions/worksheet.ts` (FINDING H2 fix: `readScopedBool` entered-only for the summary
  self-reference guard — summary layer)

## Concerns / open items
- Integration project cannot run its external-DB files here (no `DATABASE_URL`/Supabase env). Only
  the self-provided-PG harness files are runnable in this sandbox; both green.
- FINDING H2 fix narrows `facility_meets_qsac` to engineer-entered overrides. If a future flow
  writes an engineer override with a different `source_type`, revisit — but derived is the only
  self-write today.
