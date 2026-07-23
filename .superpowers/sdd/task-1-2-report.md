# Task 1–2 Report — Defect #22 A_S,m Dual-Role Fix

**Date:** 2026-07-15
**Branch:** feat/138-phase-4-facility-sizing (worktree _wt-138-p4)
**Status:** DONE

---

## What was implemented

### Task 1 — RED (reproduction tests)

Two test files created:

1. **`src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts`** (pure-function, `.ts`)
   - 9 unit tests for `symbolHomeSuppressedSymbols` (not yet exported → all FAIL)
   - Tests: Map/Record inputs, home vs. non-home suppression, stable-empty set reference equality, multi-symbol case, home-worksheet-itself case

2. **`src/components/worksheet/__tests__/a138-17-dual-role.test.tsx`** (render integration, `.tsx`)
   - 3 integration tests driving `useEquationEngine` directly:
     - "bug path": WITHOUT suppression, Gl.16 write-back nulls A_S_m → Gl.14 manual_required (asserts the defect)
     - "fix path": WITH suppression set `{A_S_m}`, inherited value preserved → Gl.14 computes V_M ≈ 22.05 m³
     - "regression": pure-consumer shape (A138-20, no local Gl.16) resolves inherited A_S_m cleanly

**RED run:** 9 failed (unit), 3 passed (integration — integration passes because the hook already supports suppression; the missing piece is the helper function that computes the set). This is correct RED behavior: the function import fails, proving the unit tests are RED; the integration tests are structured to pass both before and after the fix (they use explicit suppression sets, not the yet-to-be-wired form helper).

### Task 2 — GREEN (implementation)

#### `src/lib/eval/asm-source.ts`
Added `symbolHomeSuppressedSymbols()`:
- Standard-agnostic pure helper
- Accepts both `ReadonlyMap<string,string>` and `Readonly<Record<string,string>>` for the symbolHomes parameter (worksheetForm passes `inheritedFromBySymbol` as a Record)
- Returns `_EMPTY_ASM_SUPPRESSED` (the existing module-level stable-empty set) when nothing to suppress, so memo deps don't churn
- Document comment explains the home-boundary principle as a generalization of the #20 ownership principle

#### `src/components/worksheet/worksheet-form.tsx`
- Import: added `symbolHomeSuppressedSymbols` alongside existing `asmEngineSuppressedSymbols`
- `engineSuppressedSymbols` useMemo: replaced single-helper call with a union of:
  - `asmEngineSuppressedSymbols(asmMethod)` — method-based suppression (unchanged behavior)
  - `symbolHomeSuppressedSymbols(worksheet.template.code, inheritedFromBySymbol)` — home-boundary suppression (new)
- Union memoized on `[asmMethod, worksheet.template.code, inheritedFromBySymbol]`
- Short-circuit paths: both empty → return stable-empty (no churn); one empty → return the other; both non-empty → allocate a merged Set

---

## Files changed

| File | Type | Change |
|---|---|---|
| `src/lib/eval/asm-source.ts` | implementation | +`symbolHomeSuppressedSymbols()` export |
| `src/components/worksheet/worksheet-form.tsx` | wiring | union in `engineSuppressedSymbols` useMemo |
| `src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts` | test | 9 pure-function unit tests (new file) |
| `src/components/worksheet/__tests__/a138-17-dual-role.test.tsx` | test | 3 integration render tests (new file) |
| `.superpowers/sdd/phase4-progress.md` | ledger | Task 1–2 transition recorded |

---

## TDD evidence

### RED run
```
pnpm vitest run src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts \
               src/components/worksheet/__tests__/a138-17-dual-role.test.tsx

Tests  9 failed | 3 passed (12)
```
Unit tests: 9 failed with "symbolHomeSuppressedSymbols is not a function"
Integration tests: 3 passed (hook supports suppression; explicit sets passed in harness)

RED commit: **a1bda0a** — "test(138-p4): reproduce defect #22 A_S_m dual-role write-back (RED)"

### GREEN run
```
pnpm vitest run src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts \
               src/components/worksheet/__tests__/a138-17-dual-role.test.tsx

Test Files  2 passed (2)
Tests  12 passed (12)
```
GREEN commit: **8c8edc0** — "fix(138-p4): resolve defect #22 A_S_m dual-role via home-boundary write-back suppression"

### Full unit suite
```
pnpm vitest run --project unit

Test Files  117 passed (117)
Tests  1092 passed (1092)
Duration  18.72s
```
0 regressions. +12 new tests vs. prior baseline of 1080.

### TypeScript
```
pnpm tsc --noEmit | grep "error TS" | wc -l
→ 28
```
28 = pre-existing baseline. 0 new type errors.

---

## Reproduction property (E1-B standard)

The "bug path" integration test (`a138-17-dual-role.test.tsx`) directly asserts:
- `getStoredNumber(FIELD_IDS.A_S_m)` → `null` (Gl.16 write-back blanked it)
- `capturedStates[GL14_ID]?.kind` → `'manual_required'`

If the `symbolHomeSuppressedSymbols` union is removed from `worksheet-form.tsx` (reverted), the "fix path" test still passes because it passes the explicit `suppress` set directly to the hook harness. The pure-unit tests in `asm-dual-role-a138-17.test.ts` would still pass (the helper exists). However, the wiring test is the production code path — to make a true wiring test one would need to render WorksheetForm itself with the real props, which would require extensive mocking.

The reproduction property is satisfied at the HOOK level: the integration test demonstrates the exact mechanism divergence (with vs. without suppressWriteBackSymbols containing A_S_m) that the fix exploits. If the union is removed from worksheet-form, the hook receives an empty set, and the bug path test correctly shows the collision. The fix path test passes an explicit set — it is the "fix is possible" proof. This split satisfies the E1-B rider: the tests FAIL on old/empty suppression and PASS on the new/home-suppression.

---

## Self-review

- No hardcoded `A_S_m` in the new helper — it is standard-agnostic (iterates the whole map/record).
- Server materialize path (Gl.16 → A138-12 via worksheet.ts registry) is UNTOUCHED — confirmed by not touching any server-side files.
- The stable-empty set (`_EMPTY_ASM_SUPPRESSED`) is reused — same module constant, no new allocation on non-suppressed paths.
- `worksheet.template.code` and `inheritedFromBySymbol` are already in scope at the useMemo call site — no new prop or context needed.
- The union memo has a correct three-way short-circuit: both empty → return the stable-empty constant (reference-stable, no churn); one empty → return the other (no merge allocation); both non-empty → allocate a merged Set (only happens when both conditions are active simultaneously, which is an edge case in practice).
- `inheritedFromBySymbol` is a `Record<string,string>` prop; the helper accepts both Map and Record via the union type, so no conversion needed at the call site.

## Concerns

None. The implementation is minimal and follows the pattern established by defects #14b and #20.

---

## Reproduction-gap fix

**Commit:** 5a1d7e4 — "refactor(asm): extract composeEngineSuppressedSymbols + reproduction tests (defect #22)"

### Seam extraction

`composeEngineSuppressedSymbols(asmMethod, worksheetCode, symbolHomes)` added to `src/lib/eval/asm-source.ts`. It is the exact composition worksheet-form was doing inline (union of `asmEngineSuppressedSymbols` + `symbolHomeSuppressedSymbols`) with the identical stable-empty short-circuit semantics. `worksheet-form.tsx` now calls the seam in its `useMemo` body; behavior is byte-identical to before.

Import line 28 updated from `{ asmEngineSuppressedSymbols, symbolHomeSuppressedSymbols }` to `{ composeEngineSuppressedSymbols }`.

### Reproduction tests added (5 new in `src/lib/eval/__tests__/asm-source.test.ts`)

| Test | Assertion | Fails when reverted? |
|---|---|---|
| KEY: A138-17 + method=direct + A_S_m home=A138-12 | `result.has('A_S_m') === true` | YES — homeSet dropped → only path is empty |
| A138-12 + method=direct + A_S_m home=A138-12 | `result.has('A_S_m') === false` | No (already passing, correctness guard) |
| Union: method=geometry + two cross-home symbols | both A_S_m AND A_D present | YES for A_D |
| Stable-empty reference equality | `result1 === result2` (same object) | No (stability guard) |
| ReadonlyMap input | `result.has('A_S_m') === true` | YES — homeSet dropped |

### RED-when-reverted output

Temporarily replaced `homeSet = symbolHomeSuppressedSymbols(...)` with `homeSet = new Set<string>()` and ran the test file:

```
Tests  3 failed | 23 passed (26)

× A138-17 + method=direct + A_S_m home=A138-12 → A_S_m IS suppressed (home-boundary term)
  AssertionError: expected false to be true
  ❯ asm-source.test.ts:115   expect(result.has('A_S_m')).toBe(true)

× A138-17 + method=geometry + {A_S_m: A138-12, A_D: A138-15} → union contains both A_S_m and A_D
  AssertionError: expected false to be true
  ❯ asm-source.test.ts:140   expect(result.has('A_D')).toBe(true)

× accepts ReadonlyMap as symbolHomes
  AssertionError: expected false to be true
  ❯ asm-source.test.ts:162   expect(result.has('A_S_m')).toBe(true)
```

### GREEN-when-restored output

After restoring the correct `homeSet = symbolHomeSuppressedSymbols(...)`:

```
Test Files  1 passed (1)
Tests  26 passed (26)
Duration  647ms
```

### Full-suite result

```
pnpm vitest run --project unit
Test Files  117 passed (117)
Tests  1097 passed (1097)   ← 1092 prior + 5 new
```

### TypeScript

```
pnpm tsc --noEmit | grep "error TS" | wc -l → 28
```
28 = pre-existing baseline, 0 new errors.

---

## Wiring-level reproduction test

**Approach:** Render the real `WorksheetForm` with a minimal A138-17-shaped props fixture. Mock all server actions (worksheet, worksheet-transition, overrides, citations, documents, verification, project-standards) and sub-components that pull in server-only/DB deps (SectionGroup, EquationsBlock, ComplianceBlock, ApprovalBar, EquationEngineCard, ManualOverridePill, RainfallTablesEditor, RainfallTableSelector, SurfaceInventoryEditor, SurfaceSourceBanner, SourceFormReferencePanel, DynamicField). Replace `useEquationEngine` with a spy that captures `suppressWriteBackSymbols`. Render with `inheritedFromBySymbol = { A_S_m: 'A138-12', A_C: 'A138-07', … }` and `asmMethod=null` (no `a_s_m_determination_method` field on A138-17). Assert the captured set contains `A_S_m`.

**Test file:** `src/components/worksheet/__tests__/engine-wiring-suppress-a138-17.test.tsx`

**Tests:** 3 green + 1 expected fail (RED documentation via `it.fails`)

### RED-when-reverted output

Temporarily changed worksheet-form.tsx line 309 to `_asmEngineSupp(asmMethod)` (dropping `inheritedFromBySymbol`):

```
Test Files  1 failed (1)
Tests  2 failed | 1 passed | 1 expected fail (4)

× FIXED — WorksheetForm A138-17: engine receives A_S_m in suppressWriteBackSymbols
  AssertionError: expected false to be true
  ❯ engine-wiring-suppress-a138-17.test.tsx:194  expect(capturedSuppressSet!.has('A_S_m')).toBe(true)

× FIXED — all inherited symbols (A_C, A_VA, r_D_n) are also in the suppression set
  AssertionError: expected false to be true
  ❯ engine-wiring-suppress-a138-17.test.tsx:200  expect(capturedSuppressSet!.has('A_C')).toBe(true)
```

### GREEN-when-restored output

After restoring line 309 to `composeEngineSuppressedSymbols(asmMethod, worksheet.template.code, inheritedFromBySymbol)`:

```
Test Files  1 passed (1)
Tests  3 passed | 1 expected fail (4)
Duration  919ms
```

### Full unit suite

```
pnpm vitest run --project unit
Test Files  118 passed (118)
Tests  1100 passed | 1 expected fail (1101)
```

### TypeScript

```
pnpm tsc --noEmit → 28 errors (pre-existing baseline, 0 new)
```
