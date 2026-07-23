# Task 3b1 Report — M1/M2 minor fixes to phase4-summary.ts

**Date:** 2026-07-17
**Branch:** feat/138-phase-4-facility-sizing

## Changes

### M1 — !meetsQsac reason cites the measured q_S,AC value
- Added optional field `q_S_AC?: number | null` to `Phase4GateInput` with JSDoc (describes purpose + backward-compat guarantee).
- In `recommendationReasons`: when `!meetsQsac` and `q_S_AC != null && isFinite(q_S_AC)`, emits `q_S,AC = <value>.toFixed(2) l/(s·ha) < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)`; otherwise falls back to the static string. Verdict logic (`recommendedPhase4Gate`) is unchanged.

### M2 — JSDoc @remarks on missingOutputs
- Added `@remarks` note to `missingOutputs?` in `Phase4GateInput`: "Should be supplied whenever `complete` is false; omitting it yields the generic '(keine Angabe)' notice." No logic change.

## Tests added (phase4-summary.test.ts)

New describe block "recommendationReasons — !meetsQsac with q_S_AC (M1)", 4 tests:
1. `!meetsQsac` WITH `q_S_AC: 1.3` — reason contains `"1.30"`, `"2"`, `"REQ-15"`.
2. `!meetsQsac` WITHOUT `q_S_AC` (omitted) — static fallback string, exact match.
3. `!meetsQsac` WITH `q_S_AC: null` — static fallback string (backward-compat).
4. Verdict with `q_S_AC` supplied — still FAIL (logic untouched).

## Test results
- `pnpm vitest run src/lib/eval/__tests__/phase4-summary.test.ts`: **46/46 passed** (42 existing + 4 new).
- `pnpm vitest run --project unit`: **1149 passed, 1 expected fail** (119 test files) — full green.

## tsc by-file audit
`pnpm tsc --noEmit` errors confined to **5 pre-existing files** (baseline 28 errors):
- `scripts/__tests__/pass3c-validate.test.ts` (2 errors)
- `scripts/vsme/__tests__/build-workbook.test.ts` (1 error)
- `src/app/api/projects/[id]/vsme/__tests__/export-route.integration.test.ts` (1 error)
- `src/lib/export/__tests__/build-vsme-xlsx.test.ts` (10 errors)
- `src/lib/state/__tests__/worksheet-store-derived-apply.test.ts` (14 errors)

`src/lib/eval/phase4-summary.ts` — **ZERO errors**. No new files added to the error list.

## Concerns
None. Changes are additive and backward-compatible; predicate logic is untouched.
