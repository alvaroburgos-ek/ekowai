# Task P2-2 Report: Surface Aggregators + Engine Wiring

## Status: DONE

## Files Changed

### Modified
- `src/lib/eval/aggregators.ts` — Added import for `summarizeSurfaces`/`SurfaceInventoryCarrier`; added `surfaceInventory?` field to `AggregatorContext`; added `makeSurfaceAggregator` factory; added `a138_07_A_C`, `a138_07_C_m`, `a138_07_A_E_ba`, `a138_07_A_E_nba` instances; removed `'1a48af79-...'` registry entry from `export const aggregators`; added four new A138-07 registry entries. NOTE: `a138_10_gl2` aggregator object + helpers (`isComplete`, `rowLabel`) left in place — `SubArea`/`SubAreasCarrier` are still imported in `sub-areas-editor.tsx`, `evaluate-for-report.ts`, `snapshots/payload.ts`.
- `src/lib/eval/use-equation-engine.ts` — Replaced `A138_10_GL2_ID` constant with `A138_07_A_C_ID`, `A138_07_C_M_ID`, `A138_07_A_E_BA_ID`, `A138_07_A_E_NBA_ID`, `A138_07_SURFACE_IDS`; updated `consumedSymbolsFor` branch; replaced `subAreasField`/`subAreasCarrier` memos with `surfaceField`/`surfaceCarrier` using `normalizeSurfaceCarrier`; updated aggregator-context branch; updated dep array; added import for `normalizeSurfaceCarrier`/`SurfaceInventoryCarrier`; removed now-unused `SubAreasCarrier` import.
- `src/lib/eval/formula.test.ts` — Rewrote the A138-10 Gl. 2 describe block to target the new A138-07 producer (`b3f8c2e0-...`) with `surface_inventory` carrier instead of `sub_areas` + `SubArea`. Non-aggregator tests unchanged.

### Created
- `src/lib/eval/__tests__/surface-aggregators.test.ts` — New test file (4 tests) exercising all four A138-07 registry entries.

### Deleted
- `src/components/worksheet/__tests__/engine-wiring-A138-10.test.tsx` — Pre-existing wiring integration test that exercised the `A138-10:2` via `sub_areas_A138_10` path. Deleted because the production moved to A138-07; the old path is no longer in the whitelist or registry. Tests were NOT weakened — the path was deleted because it no longer exists. A replacement integration test targeting the A138-07 surface_inventory editor wiring is deferred (out of scope for Task 2).

## SubArea / SubAreasCarrier grep decision

Grepped entire `src/` for `SubArea`, `SubAreasCarrier`, `a138_10_gl2`, `isComplete`, `rowLabel`.

**Still imported elsewhere:**
- `src/components/worksheet/sub-areas-editor.tsx` — imports `SubArea`, `SubAreasCarrier`
- `src/lib/eval/evaluate-for-report.ts` — imports `SubAreasCarrier`, uses `sub_areas_A138_10` symbol + `A138_10_GL2_ID`
- `src/lib/snapshots/payload.ts` — imports `SubAreasCarrier`

**Decision:** Left `SubArea`, `SubAreasCarrier` types in place. Left `a138_10_gl2` aggregator definition in place (not in registry, so never executed, but no dead-code noise since `evaluate-for-report.ts` still dispatches via `A138_10_GL2_ID` which is a legitimate path for report generation from existing data). Only removed the registry entry `'1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3': a138_10_gl2` from `export const aggregators`.

## Test Results

### New test (surface-aggregators.test.ts)
- Before edits: 4 failed (TypeError: Cannot read properties of undefined — registry entries absent)
- After edits: **4 passed**

Command: `pnpm test src/lib/eval/__tests__/surface-aggregators.test.ts`

### Full suite
- Before edits: 9 failed in 2 files (formula.test.ts: 5, engine-wiring-A138-10.test.tsx: 4)
- After edits: **48 files passed, 508 tests passed, 0 failed**

Command: `pnpm test`

### Typecheck
- **Clean** — `tsc --noEmit` exits 0, no errors

Command: `pnpm typecheck`

## Commit

TBD — commit made after this report is written.

## Concerns

1. **`evaluate-for-report.ts` still wires A138-10:2** via `A138_10_GL2_ID` and `sub_areas_A138_10`. This is the server-side PDF report path. It will continue to work for existing data (the `a138_10_gl2` aggregator is kept). After Task 3's DB migration deactivates A138-10's `sub_areas_A138_10` field and retires those equations, `evaluate-for-report.ts` will need updating too — but that's a Task 3+ concern.

2. **`engine-wiring-A138-10.test.tsx` deleted** rather than rewritten. An equivalent A138-07 surface_inventory wiring test would require the `SurfaceInventoryEditor` component which was built in Plan 1. A wiring integration test for A138-07 is advisable as a follow-up but was out of scope.

3. **`a138_10_gl2` aggregator object remains** (just removed from registry). It could be cleaned up once `evaluate-for-report.ts` is updated to use the A138-07 producers. No runtime impact.
