# Task 2 Report — `materialize-asm.ts` + Mulde Dauerstufen Sweep

## Summary

Implemented the pure materialize wrapper module (`src/lib/eval/materialize-asm.ts`) and comprehensive test suite (`src/lib/eval/__tests__/materialize-asm.test.ts`). The implementation correctly materializes A_S,m (mean infiltration area) per the active determination method:

- **A-1 (Soil Estimate):** Direct Tab.13 Bodenart → soil factor lookup (0.10 or 0.20) applied to A_C. No k_f threshold or source hunt.
- **A-2 (Mulde Geometry):** Iterative Gl.16 sweep over Dauerstufen using `iterateGoverningDuration`. Returns the maximum required area across all (D, r_D) pairs.

## TDD Evidence

### RED: Test Failure
```
pnpm vitest run src/lib/eval/__tests__/materialize-asm.test.ts
→ Error: Failed to resolve import "../materialize-asm"
```
Module not found, as expected (pre-implementation).

### GREEN: All Tests Pass
```
pnpm vitest run src/lib/eval/__tests__/materialize-asm.test.ts src/lib/eval/__tests__/asm-source.test.ts

 Test Files  2 passed (2)
      Tests  16 passed (16)
   Start at  16:03:20
   Duration  707ms
```

All 16 tests pass (8 new materialize tests + 8 existing asm-source tests).

## Implementation Details

### `computeMuldeGeometrySweep`
- Delegates to `iterateGoverningDuration(rows, sizing)` with Gl.16 formula: `(A_C·1e-7·r_D) / (h_M/(D·60·f_Z) + k_i)`
- Maps result fields: `governingValue` → `A_S_m`, `governingD` → `governingD`, `boundaryLimited` → `boundaryLimited`
- Returns `null` when no valid rows or all inputs missing (handled by `iterateGoverningDuration`)

### `materializeAsm`
- Discriminates on `AsmProducer` (resolved from method + facilityType via `resolveAsmProducer`)
- **unresolved:** returns null + indeterminate state
- **manual:** requires non-empty `manualProvenance`; otherwise returns null + indeterminate
- **direct:** calls `computeDirect(A_S_min, A_S_max)` → (A_S_min + A_S_max)/2
- **soil_estimate:** calls `computeSoilEstimate(A_C, bodenart)` → factor × A_C
- **geometry:** validates `geometryValue` is finite; caller pre-computes facility geometry

All paths return `{ A_S_m, state: AsmState }` with proper discriminated status.

### Type: `AsmMaterializeInput`
- Includes all 10 scalar/selector fields required by the materialization logic
- `geometryValue` is already-resolved (Rigole one-shot or Mulde sweep result) — not computed here

## Verified Signature of `iterateGoverningDuration`

```typescript
function iterateGoverningDuration(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  sizing: (D: number, r_D: number) => number | null,
): GoverningResult {
  // Returns: { governingD, r_D_at_governing, governingValue, perDuration, boundaryLimited }
}
```

**Confirmed match to brief expectation:** sizing function maps (D, r_D) → number|null, result includes `governingValue` (max over sweep), `governingD` (duration at max), and `boundaryLimited` flag.

## Files Changed

| File | Status | Lines |
|------|--------|-------|
| `src/lib/eval/materialize-asm.ts` | Created | 78 |
| `src/lib/eval/__tests__/materialize-asm.test.ts` | Created | 56 |

## Git Commit

```
commit 25a9351
Author: Alvaro <alvaro.burgos@ekowai.com>
Date:   Wed Jul 8 16:03:25 2026 +0200

    feat(a138): materialize A_S,m per method (pure) — Bodenart soil (A-1) + Mulde Dauerstufen sweep (A-2)

 src/lib/eval/__tests__/materialize-asm.test.ts | 56 ++++++++++++++++++
 src/lib/eval/materialize-asm.ts                | 78 ++++++++++++++++++++++++++
 2 files changed, 134 insertions(+)
```

## Test Coverage

| Test Case | Validates |
|-----------|-----------|
| `direct: PLT-HS-01 baseline 45/45` | Gl.7 average computation |
| `geometry: uses resolved facility value` | Passthrough of pre-resolved value |
| `geometry unresolved (becken)` | Null return for invalid facility types |
| `soil_estimate: 0,20·A_C for schluffig` | Tab.13 Bodenart-keyed factor (0.20 for schluffig) |
| `manual: passthrough + provenance` | Manual state with source attribution |
| `manual without provenance` | Indeterminate when provenance missing |
| `Mulde Gl.16 sweep: MAX over Dauerstufen` | Iterative max confirmed via formula check |
| `Mulde sweep: null when rows empty` | Graceful handling of no data |

## Self-Review Findings

1. ✅ **No extra interfaces:** Only the three public exports (two functions, one type) as specified in the brief.
2. ✅ **Pure module:** No Next.js, DB, or React dependencies; only imports from `asm-source` and `governing-duration`.
3. ✅ **Mulde sweep logic:** Correct Gl.16 formula and integration with `iterateGoverningDuration`.
4. ✅ **Bodenart keyed:** `computeSoilEstimate` uses `bodenart` selector, not k_f.
5. ✅ **German error strings:** All error reasons match brief verbatim (e.g., "Herkunftsangabe (Datenblatt/Quelle) für manuellen A_S,m erforderlich.").
6. ✅ **sourceWorksheet fallback:** Defaults to 'A138-12' when null.
7. ✅ **Manual provenance guard:** Empty or null provenance → indeterminate (not passthrough).

## Status: READY

- All tests pass (16/16)
- Code follows brief exactly
- Commit ready for review
- No warnings or linter issues
