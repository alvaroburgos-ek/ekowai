# Task 3 Report: Per-facility T_n column resolution + withhold

## Commits

| Hash | Message |
|---|---|
| `511c74c` | `refactor(eval): resolveColumn returns tagged status (ok/legacy/missing), guards legacy to design T_n` |
| `2a846c1` | `feat(eval): basin selects its T_n column per facilityReturnPeriod; withholds when the column is absent` |

## What was done

### (A) `resolveColumn` — tagged + guarded (`src/lib/eval/rainfall-tables.ts`)

`resolveColumn` now returns `ColumnResolution`:
- `{status:'ok', rows}` — exact native T_n column present.
- `{status:'legacy', rows}` — `legacyDesignColumn` table AND `opts.designReturnPeriod === T_n` (guard tightened from Task 2's "serves any T_n").
- `{status:'missing', rows:[]}` — native column absent, or legacy table for a different T_n, or no `designReturnPeriod` provided.

`rainfall-2d-resolve.test.ts` updated to test all branches: ok, legacy-when-matches, missing-when-different-Tn, missing-when-no-opts. `rainfall-2d.test.ts` unchanged and green.

### (B) `facilityReturnPeriod` + `snapToReturnPeriod` (`src/lib/eval/use-equation-engine.ts`)

New module-level helpers:
- `FACILITY_FREQUENCY_SYMBOL` map: `A138-17→n_M_Bemessung`, `A138-18→n_R_Bemessung`, `A138-19→n_R`, `A138-20→n_R_MRS`, `A138-22→n_B_Bemessung`.
- `snapToReturnPeriod(raw)` — nearest value in `RETURN_PERIODS`.
- `facilityReturnPeriod(worksheetCode, fields, values)`: local `n_*` → project `T_n` → project `n` → `1/n` → snap → `ReturnPeriod | null`.

### (C) Basin wiring in `use-equation-engine.ts`

Replaced the Task-1 `__legacyValue ?? null` bridge inside `kostraCarrier` useMemo with a `KostraResolution` tagged union. The memoized `kostraResolution`:
1. Calls `facilityReturnPeriod` for the per-facility T_n.
2. Computes `designReturnPeriod` from project `n` or project `T_n` (snapped).
3. Calls `resolveColumn(selected, T_n, {designReturnPeriod})`.
4. On `ok`/`legacy` → returns `{status, carrier: {rows: col.rows}}`.
5. On `missing` or null T_n → returns `{status:'missing', reason: "Regenspende r_D für T_n = {T_n} a nicht in der Niederschlagstabelle erfasst"}`.

In `engineStates` useMemo, for `A138_13_GL8_ID`:
- If `kostraResolution.status === 'missing'` → set `next[eq.id] = {kind:'manual_required', reason}` and `continue` (aggregator NOT called).
- Else → pass `kostraCarrier` (derived from resolution) to the aggregator as before.

The ambiguity guard runs before the withhold check (no change to order).

### Test summary

- **New test file**: `engine-wiring-A138-13-2d.test.tsx` — 3 cases all pass:
  1. `n=0.2` + 2D grid with T_n=5 Heinsberg column → computed, V_VA=18,684 m³, D=30.
  2. Grid has only T_n=10 (no T_n=5) → manual_required, reason names `T_n = 5`, store cleared.
  3. Legacy `{rows}` carrier + `n=0.2` → computed, V_VA=18,684 m³ (back-compat).

- **Updated tests** (added `n=0.2` field to legacy fixtures):
  - `engine-wiring-A138-13.test.tsx` — `n` field + `setNumber(FIELD_IDS.n, 0.2)` in `loadScalars`.
  - `engine-wiring-A138-13-multitable.test.tsx` — same.
  - `inheritance-A138-13.test.tsx` — added `{id:'a08.n', symbol:'n', ...}` to `INHERITED_ROWS`; set `a08.n = 0.2` in each test that uses `HEINSBERG_KOSTRA`.

- **Full suite**: 84 test files, 693 tests — all green.
- **Typecheck**: `rainfall-tables.ts` and `use-equation-engine.ts` clean (fixed `nearest: ReturnPeriod` explicit type annotation).

## How the withhold integrates with `engineStates`

The withhold follows the same shape used by the ambiguity guard:
```ts
next[eq.id] = { kind: 'manual_required', reason: '...' };
continue;
```
This is set in the `engineStates` useMemo before the aggregator is reached. The `useEffect` write-back reads `state?.kind === 'computed' ? state.value : null` — on `manual_required`, it sets the output field to `null` (clears the store). The `EquationEngineCard` renders the red `manual_required` badge with the reason string. No new state shape introduced.

## Existing tests changed + why

Three pre-existing integration tests (`engine-wiring-A138-13.test.tsx`, `engine-wiring-A138-13-multitable.test.tsx`, `inheritance-A138-13.test.tsx`) broke because they passed legacy `{rows: [{id, D_min, r_D_n}]}` KOSTRA carriers but had no `n` field in the fixture. Under Task 3's guard, `facilityReturnPeriod` returns null when no `n` is present → withhold → `manual_required`. Fix: added `n` field (symbol `n`, unit `1/a`) to each fixture and set `n=0.2` (→ T_n=5 = design T_n) in the store, so the legacy design column matches and the aggregator receives rows as before. The tested behavior (18.684 at D=30, missing-Q_S reason, unit guard) is unchanged; only the precondition (n must be present) is now explicit.

## Concerns

1. **The `fieldBySymbol` dependency in `kostraResolution`**: `facilityReturnPeriod` accepts raw `fields` + `values` and builds its own local field-by-symbol map internally. The `kostraResolution` useMemo already lists `fieldBySymbol` as a dependency (via the designReturnPeriod sub-computation). This is correct — any field change invalidates the memo.

2. **A138-26 flood path not touched**: The existing `__legacyValue` bridge inside `A138_26_GL10_ID` (via the `floodCarrier` path, not `kostraCarrier`) is untouched as per spec. The flood path uses a completely separate carrier (`sub_areas_A138_26`), not `r_D_n_table`, so no collision.

3. **No `T_n` field in current test fixtures**: The `T_n` direct-value branch in `facilityReturnPeriod` (step 2) is implemented but not yet exercised by a dedicated test. It would be triggered if a project stored a direct `T_n` value (rather than `n`). Consider adding a unit test for that branch in a follow-up.

4. **Server/snapshot paths (Task 4)**: `evaluate-for-report.ts` and `payload.ts` still use the old 1D carrier shape and do not call `resolveColumn`. Task 4 wires those paths; until then, server-side V_VA will diverge from the client for 2D grid carriers. Legacy carriers are unaffected (server path reads `r_D_n` directly, which normalizes from `__legacyValue` there too — but that path was also the Task-1 bridge, not yet updated on the server side).

---

## CONTRACT CORRECTION (2026-06-29)

Commits 511c74c + 2a846c1 implemented the WRONG contract for legacy tables:
`resolveColumn` only returned `{status:'legacy'}` when `opts.designReturnPeriod === T_n`,
causing `{status:'missing'}` for any facility whose T_n differed from the project design T_n.
This would break existing projects on their first load if a facility inherits a T_n that doesn't
match the design RP stored in opts.

### Fix applied

**`src/lib/eval/rainfall-tables.ts`** — `resolveColumn` rewritten:
- Signature changed to `(table, T_n: number | null)` — `opts` param removed entirely.
- Branch on `table.legacyDesignColumn` FIRST: if true → always `{status:'legacy', rows}` (any T_n including null).
- Native 2D path: `T_n === null` → `{status:'missing'}`; else check column presence as before.

**`src/lib/eval/use-equation-engine.ts`** — call site updated:
- Removed `designReturnPeriod` computation (nProject + T_n_direct sub-blocks deleted).
- `resolveColumn(selected, T_n)` — no opts arg.
- Missing reason now branches: `T_n !== null` → names the T_n; `T_n === null` → says T_n cannot be determined.
- The `T_n === null` early-return withhold (that existed before the resolveColumn call) is removed — resolveColumn itself handles null per table type.

**`src/lib/eval/__tests__/rainfall-2d-resolve.test.ts`** — tests replaced:
- Removed: "legacy + designReturnPeriod===T_n → legacy", "legacy + different T_n → missing", "legacy + no opts → missing".
- Added: "legacy + matching T_n → legacy", "legacy + DIFFERENT T_n → legacy (never withheld)", "legacy + T_n=null → legacy (never withheld)", "native + T_n=null → missing".

**`src/components/worksheet/__tests__/engine-wiring-A138-13-2d.test.tsx`** — case (c) corrected:
- Previous case (3): `setNumber(FIELD_IDS.n, 0.2)` present → facilityReturnPeriod returned T_n=5 = design T_n, masked the bug.
- Corrected case (c): uses `fieldsWithoutN` (n field absent from form) → facilityReturnPeriod returns null → proves legacy serves T_n=null and computes V_VA=18,684 m³.

### Must-pass results

| Test | Result |
|---|---|
| `engine-wiring-A138-13.test.tsx` (legacy 18.684 witness) | PASS — 8/8 |
| `formula-Gl8.test.ts` (18.684 witness) | PASS |
| `governing-duration-basin.test.ts` (18.684 witness) | PASS |
| `engine-wiring-A138-13-2d.test.tsx` case (b) native-missing-withhold | PASS — manual_required, reason names T_n=5 |
| `engine-wiring-A138-13-2d.test.tsx` case (c) legacy T_n=null serves | PASS — computed, V_VA=18.684 |

**Full unit suite**: 84 test files, 694 tests — all green.
**TypeScript**: `rainfall-tables.ts` + `use-equation-engine.ts` — clean.

### Concerns

- `fieldBySymbol` dependency removed from `kostraResolution` useMemo deps — `facilityReturnPeriod` no longer uses it; `fields` and `values` remain, which is correct.
- Server/snapshot paths (Task 4) still not touched per scope constraint.
