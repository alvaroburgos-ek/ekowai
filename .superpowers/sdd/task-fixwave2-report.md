# Fix-wave 2 — mis-keyed Finding-E fix corrected (V_M blocked on A138-17)

## Root cause (controller-verified, trusted)
On A138-17, `A_S_m` is an INJECTED inherited field from A138-12
(`inheritedFromWorksheet='A138-12'`) that ALSO has a `project_parameters` row by
field-id (943.43). The page's initialValues loop resolves it via STEP 1 (local
param), so `inheritedFromBySymbol['A_S_m']` is NEVER set. Both home-boundary
helpers (`composeEngineSuppressedSymbols`, `computeComputedSymbols`) were keyed
on `inheritedFromBySymbol` → the suppress set was ∅ for A_S_m → the Gl.16
server-only null write-back (use-equation-engine.ts:540-541) CLOBBERED the
inherited 943.43 → Gl.15 read null → "Fehlt: A_S_m" → V_M blocked. The prior
Finding-E fix (2fdbe12) was a NO-OP: wrong signal.

## The reproduction test (RED on current code — REAL symptom)
`src/components/worksheet/__tests__/render-a138-17-asm-inherited-prod-signal.test.tsx`
renders the REAL `WorksheetForm`+`DynamicField`+`useEquationEngine` with the REAL
prod topology: A_S_m injected-inherited field (`inheritedFromWorksheet='A138-12'`,
value 943.43), local Gl.16 outputSymbol A_S_m with client-unresolvable inputs
(state ≠ 'computed' → desired=null), local Gl.15 V_M=A_S_m·h_M (h_M=0.30), and
the CRUX `inheritedFromBySymbol = {}`.

RED on current code (verbatim):
```
 × the inherited A_S_m store value survives (NOT clobbered to null by Gl.16)
   AssertionError: expected null to be 943.43 // Object.is equality
   - Expected: 943.43   + Received: null
 × Gl.15 / V_M computes from the inherited A_S_m (≈ 943.43 · 0.30 = 283.03)
   AssertionError: expected null to be close to 283.029, received difference is 283.029
```
Proves the live symptom reproduces through the real component: A_S_m clobbered
to null, V_M blocked.

## The signal fix (worksheet-form.tsx)
Build a field-derived home map and UNION it over `inheritedFromBySymbol`, feed to
BOTH helpers (helper internals unchanged):
```ts
const inheritedHomeBySymbol = useMemo<Record<string, string>>(() => {
  const m: Record<string, string> = { ...inheritedFromBySymbol };
  for (const f of fields) {
    if (f.inheritedFromWorksheet) m[f.symbol] = f.inheritedFromWorksheet;
  }
  return m;
}, [inheritedFromBySymbol, fields]);
```
- `composeEngineSuppressedSymbols(asmMethod, worksheet.template.code, inheritedHomeBySymbol)` (PRIMARY: puts A_S_m in suppressWriteBackSymbols on A138-17 → use-equation-engine.ts:533 `continue` → Gl.16 null write-back skipped → 943.43 survives → Gl.15 computes V_M).
- `computeComputedSymbols(sortedEquations, inheritedHomeBySymbol, {...})` (hardening, re-keyed).

Regression safety: A138-12 → A_S_m own field (`inheritedFromWorksheet` unset) →
NOT suppressed → Gl.7 writes normally. A138-20/22 → A_S_m inherited but no local
producer → suppression harmless. Other inherited scalars → no local producer →
no-op.

## GREEN output
```
render-a138-17-asm-inherited-prod-signal.test.tsx  Test Files 1 passed  Tests 2 passed
```
Full `pnpm vitest run --project unit`: **125 files, 1177 passed | 1 expected-fail**.

## Prior E-tests updated to the corrected signal
- `render-a138-17-asm-inherited.test.tsx`: dropped the crutch
  `inheritedFromBySymbol: { A_S_m: 'A138-12' }` → `{}`, now relies on the
  injected field's `inheritedFromWorksheet`. Still green.
- `render-computed-symbols-isComputed.test.tsx` / `computed-symbols.test.ts`:
  unchanged — they feed the map directly; the union honors their
  `inheritedFromBySymbol` entries. Still green.

## By-file tsc (baseline 28, unchanged; touched files contribute 0)
```
14 src/lib/state/__tests__/worksheet-store-derived-apply.test.ts
10 src/lib/export/__tests__/build-vsme-xlsx.test.ts
 2 scripts/__tests__/pass3c-validate.test.ts
 1 src/app/api/projects/[id]/vsme/__tests__/export-route.integration.test.ts
 1 scripts/vsme/__tests__/build-workbook.test.ts
```

## Kept (not reverted)
- Finding A (184bbe2): facility_type_dimensioned writes the TYPE ('mulde').
- Finding B regression test.
