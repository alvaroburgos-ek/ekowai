# Task 4 Report — Server + Snapshot Paths Resolve the 2D Grid per Facility T_n

## Commit

Branch: `feat/rainfall-2d-grid`
Message: `feat(eval): server + snapshot paths resolve the 2D grid per facility T_n (client parity)`

## Test Summary

All 697 unit tests pass (pnpm vitest run --project unit).
TypeScript: no errors in the 4 modified modules (rainfall-tables, use-equation-engine, evaluate-for-report, payload.ts).

New parity tests (7 total in `report-divergence.test.ts`, 3 new Task-4 cases):
- Native 2D carrier, T_n=5 column, n=0.2 → V_VA = 18.684 m³ at D=30 (parity with client): PASS
- Native 2D grid, only T_n=10 present, facility needs T_n=5 → manual_required (withhold): PASS
- Legacy {rows} carrier + n=0.2 → still computes 18.684 (back-compat, never withheld): PASS

18.684 witnesses (formula-Gl8, governing-duration-basin, engine-wiring-A138-13): all green.

## How facilityReturnPeriod was extracted (Part A)

`facilityReturnPeriod`, `FACILITY_FREQUENCY_SYMBOL`, and `snapToReturnPeriod` were moved from
`use-equation-engine.ts` (a `'use client'` file) to `src/lib/eval/rainfall-tables.ts` as
exported pure functions. The new signature is:

```ts
facilityReturnPeriod(worksheetCode: string, pickNumberBySymbol: (sym: string) => number | null): ReturnPeriod | null
```

The caller builds the `pickNumberBySymbol` closure from whatever data source it has
(React store values in the client hook, numByField map in the server path, paramByFieldId in
the snapshot path). `use-equation-engine.ts` now imports `facilityReturnPeriodPure` and
constructs its closure there; the three local copies (FACILITY_FREQUENCY_SYMBOL, snapToReturnPeriod,
facilityReturnPeriod) were deleted from the hook file.

## manual_required wiring — evaluate-for-report.ts (Part B)

1. Imports extended with `resolveColumn` and `facilityReturnPeriod` from `rainfall-tables.ts`.
2. The old `__legacyValue` bridge was replaced by a `kostraResolution` IIFE that:
   - Calls `facilityReturnPeriod(worksheetCode, pickNum)` to get T_n.
   - Calls `resolveColumn(selected, T_n)` on the normalized+selected table.
   - On `ok`/`legacy`: sets `kostraCarrier = { rows: col.rows }` (the sliced rows feed the aggregator).
   - On `missing`: stores the reason string in `kostraResolution`.
3. In the per-equation loop, before building the aggregator for A138-13 Gl.8:
   - If `kostraResolution.status === 'missing'` → push a `manual_required` EquationReportResult
     with `reason = "Regenspende r_D für T_n = {T_n} a nicht in der Niederschlagstabelle erfasst"`
     and `continue` (skip the aggregator call entirely).
4. The A138-26 flood branch was NOT touched (its `__legacyValue` bridge is not present in this
   file anyway — Task 5 scope).

## manual_required wiring — payload.ts (Part C)

Same pattern mirrored:
1. Imports extended with `resolveColumn` and `facilityReturnPeriod`.
2. The old `__legacyValue` bridge replaced by `kostraSnapshotResolution` IIFE (same logic as
   server path but using `paramByFieldId` + `readNumber` for the pickNumberBySymbol closure).
3. In the per-equation loop, before `evaluateFormula` for A138-13 Gl.8:
   - If `kostraSnapshotResolution.status === 'missing'` → `toSnapshotOutput({ kind: 'manual_required',
     reason }, eq.formula)` stored in `equationOutputs` and `continue`.

## Concerns

1. The `pickNum`/`pickBool` helper in `evaluate-for-report.ts` was declared inline before the
   `kostraResolution` block (moved from after the carrier block where they originally lived).
   The duplicate declarations were removed. No functional issue but the reorder should be noted
   for reviewers.
2. The `kostraResolution` useMemo dep array in `use-equation-engine.ts` was updated from `fields`
   to `fieldBySymbol` (the memoized Map derived from fields) since the inner closure now reads
   `fieldBySymbol` directly. React semantics are unchanged (fieldBySymbol updates whenever fields
   does via its own useMemo).
3. Pre-existing TypeScript errors in unrelated files (vsme export tests, scripts/pass3c tests —
   Buffer type + missing `owner` field) are unchanged by this task.
4. The A138-26 flood path in `evaluate-for-report.ts` and `payload.ts` never had a `__legacyValue`
   bridge to begin with (it reads `r_D_30` as a scalar, not the KOSTRA carrier). Task 5 owns
   the flood 2D column wiring — left as-is per constraints.
