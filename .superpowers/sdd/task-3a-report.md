# Task 3a Report — Phase 4 Summary Pure Module

**Date:** 2026-07-15
**Branch:** feat/138-phase-4-facility-sizing
**Worktree:** _wt-138-p4

## Module

`src/lib/eval/phase4-summary.ts` — pure, DB-free, no imports from DB or action layers.

Exports:
- `FacilityType` union (7 members: flaeche / mulde / rigole / mre / mrs / schacht / becken)
- `facilitySummaryInputs(facilityType)` → `{ volumeSymbol: string | null; footprintSymbol: string }`
- `Phase4GateInput` type (complete / meetsQsac / blockGateFailed / blockGateReasons / missingOutputs / tab14)
- `Phase4Recommendation` union (PASS / CONDITIONAL / FAIL)
- `recommendedPhase4Gate(input)` — ratified predicate
- `recommendationReasons(input)` — D3 companion reasons with values

## Predicate encoding

FAIL branch first: `!complete || blockGateFailed || !meetsQsac`.
CONDITIONAL branch next: `t_E_hours != null && t_E_hours > 84`, OR `freeboardOk === false`, OR `slopeOk === false`.
PASS: fallthrough (all prerequisites met).

Boundary: `t_E === 84` → PASS (strictly greater-than, `> 84`).

## Reasons (D3 addition)

- FAIL reasons collected for all failing conditions simultaneously (all-array, not first-only).
- CONDITIONAL reasons collected for all Tab.14 flags simultaneously.
- FAIL reasons suppress CONDITIONAL reasons (early return after FAIL array non-empty).
- PASS → single sentence "Alle anwendbaren Bemessungsvorgaben erfüllt (§6/Tab. 14)."
- t_E reason embeds the actual `t_E_hours` value and the limit 84 h + citation (Tab. 14, §6.3.2).
- blockGateReasons carried verbatim into the FAIL reason array.
- Guard for `blockGateFailed=true` with empty `blockGateReasons`: generic notice added (no silent omission).

## Tests

File: `src/lib/eval/__tests__/phase4-summary.test.ts`

42 tests across 10 `describe` blocks:

| Block | Count | What is covered |
|---|---|---|
| facilitySummaryInputs — verbatim | 4 | All 7 rows; null/non-null check; exhaustive loop |
| PASS | 3 | All green; within-limits Tab.14; t_E exactly 84 |
| CONDITIONAL (Tab.14) | 5 | t_E=92, t_E=85, freeboard, slope, all three simultaneously |
| FAIL | 7 | !complete, blockGateFailed, !meetsQsac, FAIL beats CONDITIONAL (3 variants), all-three |
| Tab.14 all-null | 2 | null t_E + null flags → not CONDITIONAL |
| Reasons — PASS | 1 | Single "all satisfied" sentence |
| Reasons — CONDITIONAL values | 5 | 92 in string, 84 in string, freeboard, slope, all three = 3 reasons |
| Reasons — FAIL | 7 | missingOutputs listed, no outputs, blockGateReasons verbatim, multiple, !meetsQsac, all-three, FAIL+Tab14 precedence |
| Verdict-reasons consistency | 3 | Each verdict branch: correct cross-check |

TDD evidence: module was written from spec only; tests run immediately after first write → 42/42 green.

## Suite count

```
targeted : 42 / 42 pass  (phase4-summary.test.ts)
full unit: 1142 / 1142 pass | 1 expected-fail  (119 test files)
```

Previous unit suite count (pre-task): 1100 pass. Net addition: +42.

## TypeScript (tsc --noEmit)

31 errors — identical file set as the pre-task baseline (scripts/__tests__, src/lib/export/, src/lib/state/, src/components/worksheet/__tests__/); 0 errors in phase4-summary.ts or its test.

Note: spec cited 28 pre-existing errors; measured count is 31. All 31 are pre-existing in files touched by earlier tasks (worksheet-store-derived-apply.test.ts gained ~10 errors in a prior task, pass3c-validate and build-vsme-xlsx have pre-existing Buffer<ArrayBufferLike> TS 5.x errors). Zero new errors introduced by this task.

## Concerns

None. Predicate + reasons spec was unambiguous; encoding is exact and tested. The 31 vs 28 tsc discrepancy is pre-existing, not introduced here.
