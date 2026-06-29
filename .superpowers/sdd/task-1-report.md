# Task 1 Report — Basin Gl.8 result exposes governing D + r_D (derivedExtras)

## Status
DONE — all tests green, typecheck clean.

## Result shape added

### Type definition
`src/lib/eval/formula.ts` — added `AggregatorDerivedExtras` type (lines before `EvalState`) and extended the `computed` variant of `EvalState`:

```ts
export type AggregatorDerivedExtras = {
  /** Governing duration [min] — the duration that maximises V_VA. */
  D_gov: number;
  /** Design rainfall intensity at the governing duration [l/(s·ha)]. */
  r_D_gov: number;
};

// On the computed variant of EvalState:
derivedExtras?: AggregatorDerivedExtras;
```

### Population site
`src/lib/eval/aggregators.ts` — `a138_13_gl8` success return (after the cistern-credit branch, at the final `return { kind: 'computed', ... }`):

```ts
derivedExtras: {
  D_gov: governingD,                            // = governing.governingD (number, guaranteed non-null here)
  r_D_gov: governing.r_D_at_governing as number, // = GoverningResult.r_D_at_governing
},
```

**Only populated on the computed (non-`manual_required`) path**, after all guards (scalar check, carrier check, unit guard, row-completeness, null-governing check). The cistern-credit branch does NOT affect these values — they reflect the governing duration pre-credit, which is correct (credit is on volume, not on the D/r_D selection).

## Test summary

File: `src/lib/eval/__tests__/governing-duration-basin.test.ts`

- New test suite: `a138_13_gl8 aggregator result exposes derivedExtras`
  - `derivedExtras.D_gov === 30` ✓
  - `derivedExtras.r_D_gov === 130` ✓
  - `result.value ≈ 18.684` (existing witness, still green) ✓
- Existing suite: `basin V_VA profile via the shared engine`
  - `governingD === 30`, `governingValue ≈ 18.684`, `r_D_at_governing === 130` ✓

Full unit suite: **742 tests / 86 test files — all passed**.
TypeScript (`--noEmit`): **clean** (no errors in aggregators or governing-duration or formula).

## Concerns / notes for Task 2

1. **`derivedExtras` is `optional`** on `EvalState.computed`. Task 2's write-back must guard against `undefined` (i.e. only write `D_gov`/`r_D_gov` when `derivedExtras` is present — which mirrors the `manual_required` withhold requirement).
2. The `r_D_at_governing` cast `as number` is safe because we already checked `governing.governingD !== null` and `iterateGoverningDuration` always sets both to non-null or both to null together (see `governing-duration.ts` lines 55-60). No runtime risk.
3. The cistern-credit (`V_Zisterne` / `zwangsentleerung`) branch is NOT affected — `D_gov`/`r_D_gov` are read from `governing.*` which is computed before the credit branch. This is intentional: the governing D selection is independent of the cistern credit.
4. The `AggregatorDerivedExtras` type lives in `formula.ts` (next to `EvalState`) so it is importable by `use-equation-engine.ts`, `evaluate-for-report.ts`, and `payload.ts` in Task 2 without a new file.
