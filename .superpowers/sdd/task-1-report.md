# Task 1 Report: `asm-source.ts` — pure resolver + per-method compute

## Execution Summary

Implemented Task 1 per the brief's TDD specification. Created two files following pure TypeScript methodology (zero DB dependencies, zero Next.js APIs).

### Files Created

1. **`src/lib/eval/asm-source.ts`** (87 lines)
   - Type exports: `AsmMethod`, `FacilityType`, `Tab13Bodenart`, `AsmState`, `AsmProducer`
   - Equation ID constants: `ASM_GL7_EQUATION_ID`, `ASM_GL16_EQUATION_ID`, `ASM_GL17_EQUATION_ID`
   - Facility-type → worksheet mapping: `FACILITY_TYPE_TO_WORKSHEET`
   - Three export functions:
     - `resolveAsmProducer(method, facilityType): AsmProducer` — maps active method to sole producer; geometry resolves only for mulde/rigole
     - `computeDirect(aSmin, aSmax): number | null` — Gl.7 average formula with finite checks
     - `computeSoilEstimate(aC, bodenart): number | null` — Tab.13 Bodenart-keyed factors (0.10 for mittel_feinsand, 0.20 for schluffig)

2. **`src/lib/eval/__tests__/asm-source.test.ts`** (48 lines)
   - 4 test suites, 8 total test cases
   - Covers all three functions + constants

## TDD Evidence

### RED (Step 2)
```
pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts
[FAIL] Error: Failed to resolve import "../asm-source" from "src/lib/eval/__tests__/asm-source.test.ts". Does the file exist?
```

### GREEN (Step 4)
```
pnpm vitest run src/lib/eval/__tests__/asm-source.test.ts

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Implementation Notes

### Constraint Adherence (Global Constraints)

- **Equation IDs** — used verbatim as specified:
  - `ASM_GL7_EQUATION_ID = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac'`
  - `ASM_GL16_EQUATION_ID = '14999c2a-cdeb-42c1-98fd-fcdec65123da'` (Mulde)
  - `ASM_GL17_EQUATION_ID = '8afdb49a-7bb1-4f07-a64e-43009b8b6be1'` (Rigole)

- **Geometry restriction (D-1)** — `resolveAsmProducer('geometry', ...)` returns:
  - `{ kind: 'geometry', worksheetCode: 'A138-17', equationId: ASM_GL16_EQUATION_ID }` for `mulde`
  - `{ kind: 'geometry', worksheetCode: 'A138-18', equationId: ASM_GL17_EQUATION_ID }` for `rigole`
  - `{ kind: 'unresolved', reason: '...' }` for all other types (flaeche, schacht, becken, null)

- **Soil estimate factors (Tab.13, A-1)** — no k_f heuristic; Bodenart selector is authoritative:
  - `mittel_feinsand` → 0.10·A_C
  - `schluffig` → 0.20·A_C

### Code Quality

- All exports are minimal and required by the brief; no extras (YAGNI adhered).
- German error string is verbatim from brief: `"geometry-Methode nur für Mulde/Rigole; Typ=${...}."`
- Comments document design decisions (e.g., why `soilFavourabilityFromKf` is omitted).
- Finite checks in `computeDirect` and `computeSoilEstimate` prevent silent failures on NaN/Infinity.

## Commit

```
[feat/a138-asm-single-source 428f25d] feat(a138): A_S,m determination-method resolver + direct/soil compute (pure)
 2 files changed, 135 insertions(+)
 create mode 100644 src/lib/eval/__tests__/asm-source.test.ts
 create mode 100644 src/lib/eval/asm-source.ts
```

Git identity: `alvaro.burgos@ekowai.com` ✓

## Test Coverage

All 8 test cases pass (8/8 execution):
- `resolveAsmProducer`: 3 cases (direct/soil/manual, geometry-mulde/rigole, geometry-unresolved)
- `computeDirect`: 2 cases (averaging, null checks)
- `computeSoilEstimate`: 2 cases (factors, null checks)
- Constants: 1 case (FACILITY_TYPE_TO_WORKSHEET)

## Known Observations

- The module is pure and standalone; it depends only on TypeScript types, no external imports.
- Task 2 onwards will consume these pure functions in worksheet evaluation logic.
- No deploy/verification needed for this pure module; tests are the sole correctness signal.
