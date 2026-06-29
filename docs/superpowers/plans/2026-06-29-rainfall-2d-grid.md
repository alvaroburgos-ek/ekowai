# Rainfall 2D KOSTRA Grid (Model A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make each location's rainfall data a single 2D KOSTRA grid (rows = duration D, columns = return period T_n); a case reads the column for its inherited T_n, the governing-duration iteration sweeps D, r_D derives — and the flood path reads the T_n=30 column of the same grid.

**Architecture:** Extend Piece 2's per-location carrier from a 1D `{D_min, r_D_n}` curve to a 2D `{D_min, r:{T_n→r_D}}` grid. A new pure `resolveColumn(table, T_n)` slices the grid back to the 1D rows the **unchanged** Gl.8 aggregator / `iterateGoverningDuration` already consume. T_n comes from A138-08 (inherited); the flood case uses T_n=30. Back-compat: a legacy 1D curve is served as the design column for any T_n until the real grid is filled.

**Tech Stack:** TypeScript, Next.js, Drizzle, Vitest, Supabase.

## Global Constraints

- **Base branch = the union `integration/rainfall-govdur` (`7b4510a`)**, branch `feat/rainfall-2d-grid`, worktree `C:/Users/Ekowai/_wt-2dgrid`. NOT bare origin/main (it lacks Piece 2/Piece 1). **Confirm before build** (design §0).
- Selection is the TABLE (location, Piece 2) + the COLUMN comes from the inherited **T_n** — **`r_D` is never free-picked** (no return of the cancelled picker).
- Aggregator + `iterateGoverningDuration` math/signatures are **UNCHANGED**; the only new step is the 2D→1D column slice at the resolution boundary.
- KOSTRA columns: **T_n ∈ {1,2,3,5,10,30,50,100} a** (`RETURN_PERIODS`). `n = 1/T_n`; use `T_n` as the column key directly.
- **The 18.684 @ D=30 witness must stay green** (`formula-Gl8.test.ts`, `governing-duration-basin.test.ts`, `engine-wiring-A138-13.test.tsx`).
- Migrations WRITTEN-NOT-APPLIED until cutover; rollback authored; no blind data UPDATE (A138-07 precedent). Tests: `pnpm vitest run <path>` (worktree needs a `node_modules` junction like the others).
- Out of scope: geometry-coupled facility profiles (Piece 1 Task 6 remainder); Becken stays inert; Tabelle-12 Nachweisverfahren.

---

### Task 1: 2D carrier types + legacy-tolerant normalizer (DB-free)

**Files:** Modify `src/lib/eval/rainfall-tables.ts`; Test `src/lib/eval/__tests__/rainfall-2d.test.ts`.

**Interfaces / Produces:**
- `RETURN_PERIODS = [1,2,3,5,10,30,50,100] as const`; `type ReturnPeriod`; `type TnKey = \`${ReturnPeriod}\``.
- `type RainfallGridRow = { D_min: number | null; r: Partial<Record<TnKey, number | null>> }`.
- `RainfallTable` gains `columns: ReturnPeriod[]` + `rows: RainfallGridRow[]` + `legacyDesignColumn?: boolean`.
- `normalizeRainfallCarrier(raw)` now returns 2D tables, accepting: legacy `{rows:[{D_min,r_D_n}]}`, Piece-2 `{tables:[{…rows:[{D_min,r_D_n}]}]}` (both → `legacyDesignColumn:true`, curve carried under a private `__legacy` slot), and native 2D `{tables:[{columns,rows:[{D_min,r}]}]}`.

- [ ] **Step 1: Failing test** — `src/lib/eval/__tests__/rainfall-2d.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, RETURN_PERIODS } from '../rainfall-tables';

describe('normalizeRainfallCarrier (2D)', () => {
  it('wraps a legacy {rows} curve as one design-column 2D table', () => {
    const out = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] });
    expect(out.tables).toHaveLength(1);
    const t = out.tables[0];
    expect(t.legacyDesignColumn).toBe(true);
    expect(t.columns).toEqual([...RETURN_PERIODS]);
    expect(t.rows[0].D_min).toBe(30);
  });
  it('wraps a Piece-2 {tables:[{rows}]} curve as design-column 2D tables', () => {
    const out = normalizeRainfallCarrier({ tables: [{ id: 'k1', name: 'A', source: 'KOSTRA-DWD-2020', rows: [{ D_min: 30, r_D_n: 130 }] }] });
    expect(out.tables[0].legacyDesignColumn).toBe(true);
    expect(out.tables[0].id).toBe('k1');
  });
  it('passes a native 2D grid through', () => {
    const out = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [{ D_min: 30, r: { '5': 130, '30': 200 } }] }] });
    expect(out.tables[0].legacyDesignColumn).toBeFalsy();
    expect(out.tables[0].rows[0].r['30']).toBe(200);
  });
  it('malformed → {tables: []}', () => {
    expect(normalizeRainfallCarrier(null)).toEqual({ tables: [] });
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/lib/eval/__tests__/rainfall-2d.test.ts` → FAIL.
- [ ] **Step 3: Implement** the 2D types + `RETURN_PERIODS` and rewrite `normalizeRainfallCarrier`: detect native 2D (`row.r` object present) vs legacy (`row.r_D_n`/top-level `rows`); for legacy, set `columns=[...RETURN_PERIODS]`, `legacyDesignColumn=true`, and carry each legacy `{D_min,r_D_n}` as `{D_min, r:{}, __legacyValue:r_D_n}` (a non-enumerated back-compat slot read only by `resolveColumn`). Keep `resolveSelectedTable` as-is.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): 2D KOSTRA grid carrier + legacy-tolerant normalizer`.

---

### Task 2: `resolveColumn` (DB-free)

**Files:** Modify `src/lib/eval/rainfall-tables.ts`; Test `src/lib/eval/__tests__/rainfall-2d-resolve.test.ts`.

**Produces:** `resolveColumn(table: RainfallTable, T_n: number): Array<{ id: string; D_min: number|null; r_D_n: number|null }>` — exact column `r[String(T_n)]` when present; else if `legacyDesignColumn` → the carried legacy curve for ANY T_n; else null `r_D_n` cells.

- [ ] **Step 1: Failing test**:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, resolveColumn } from '../rainfall-tables';

const grid = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [
  { D_min: 15, r: { '5': 195, '30': 260 } }, { D_min: 30, r: { '5': 130, '30': 180 } } ] }] }).tables[0];

describe('resolveColumn', () => {
  it('slices the requested T_n column to 1D rows', () => {
    expect(resolveColumn(grid, 5).map(r => [r.D_min, r.r_D_n])).toEqual([[15,195],[30,130]]);
    expect(resolveColumn(grid, 30).map(r => r.r_D_n)).toEqual([260,180]);
  });
  it('missing column → null r_D_n cells', () => {
    expect(resolveColumn(grid, 100).every(r => r.r_D_n === null)).toBe(true);
  });
  it('legacy design column serves any T_n', () => {
    const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }] }).tables[0];
    expect(resolveColumn(legacy, 5)[0].r_D_n).toBe(130);
    expect(resolveColumn(legacy, 30)[0].r_D_n).toBe(130);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `resolveColumn`. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): resolveColumn (2D grid → T_n column slice)`.

---

### Task 3: client engine column-resolution + 2D witness (DB-free)

**Files:** Modify `src/lib/eval/use-equation-engine.ts`; Test `src/components/worksheet/__tests__/engine-wiring-A138-13-2d.test.tsx`.

**Consumes:** `resolveSelectedTable`, `resolveColumn`. **Produces:** the basin reads `resolveColumn(resolveSelectedTable(carrier, ref), T_n)` where `T_n` = the value of the inherited `T_n` field; feeds the **unchanged** `KostraCarrier`.

- [ ] **Step 1: Failing test** — render `EquationEngineCard` via `useEquationEngine` for A138-13 with fields incl. `T_n`, a 2D `r_D_n_table` carrier whose **T_n=5 column** = the Heinsberg curve, scalars loaded, `T_n=5` → assert `V_VA = 18,684 m³` @ D=30. (Mirror `engine-wiring-A138-13-multitable.test.tsx`.)
- [ ] **Step 2: Run** → FAIL (engine still reads the flat carrier).
- [ ] **Step 3: Implement** — in `use-equation-engine.ts`, read the `T_n` field value (number) and replace the `selected.rows.map(...)` slice with `resolveColumn(selected, T_n).map(...)` into `KostraCarrier`. When `T_n` is missing, fall back to the legacy design column (resolveColumn already does this for legacy tables; for native 2D with no T_n, emit no rows → aggregator manual_required).
- [ ] **Step 4: Run** → PASS. Also run `engine-wiring-A138-13.test.tsx` + `formula-Gl8.test.ts` + `governing-duration-basin.test.ts` → **all green (18.684 preserved)**.
- [ ] **Step 5: Commit** `feat(eval): basin reads the inherited-T_n column of the 2D grid`.

---

### Task 4: server + snapshot column-resolution (DB-free)

**Files:** Modify `src/lib/eval/evaluate-for-report.ts`, `src/lib/snapshots/payload.ts`; Test extend `src/lib/eval/__tests__/report-divergence.test.ts`.

- [ ] **Step 1: Failing test** — feed a 2D carrier + `T_n=5` through `evaluateWorksheetEquations` for A138-13; assert V_VA computes (governing D=30, 18.684) and matches the client path.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the same `resolveColumn(resolveSelectedTable(...), T_n)` slice in both server read paths (`T_n` from `bySymbol`/params). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): report + snapshot paths slice the 2D grid by T_n`.

---

### Task 5: flood unification — A138-26 as a governing-duration PROFILE on the T_n=30 column (DB-free code)

> **Source-corrected (§5.3.4 L1876):** the flood D is **iterated**, not fixed. The flood case sweeps all D at the 30-column via the SHARED `iterateGoverningDuration` engine. C_s + paved `A_E,b,a` (NOT C_i); V_Rück floors at 0.

**Files:** Modify `src/lib/eval/governing-duration.ts` (add the flood profile) + `src/lib/eval/aggregators.ts` (A138-26 Gl.10 delegates to it) + `use-equation-engine.ts`/`evaluate-for-report.ts`/`payload.ts` (feed the 30-column + flood scalars); Test `src/lib/eval/__tests__/governing-duration-flood.test.ts` + `__tests__/flood-from-grid.test.ts`.

**Produces:** a `FacilityGoverningProfile` `{ facility:'A138-26', maximizes:'V_Rueck', sizing }` consuming the 30-column rows; `V_Rueck = max(0, governingValue)`; `r_D_30` derived (the 30-column value at the governing D), not free-typed.

- [ ] **Step 1: Failing unit test** — `governing-duration-flood.test.ts`: feed the 30-column rows + flood scalars `{ A_E_b_a_Cs_sum, A_VA, Q_S, Q_Dr, V_VA }` to `iterateGoverningDuration(rows, floodProfile.sizing)`; assert the governing D + a hand-computed `V_Rueck`; and a second case where every duration yields negative → `max(0, …) === 0`.

```ts
// sizing per duration (Gl.10):
//   ((r_D·(ΣA_E_b_a·C_S + A_VA)/10000) − (Q_S + Q_Dr))·D·60/1000 − V_VA
// floor the GOVERNING result at 0.
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the flood profile in `governing-duration.ts` (sizing uses `s.AcS_paved` = Σ(A_E_b_a·C_S), `s.A_VA`, `s.Q_S`, `s.Q_Dr`, `s.V_VA`); apply `max(0, governingValue)` at the call site. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): flood (A138-26 Gl.10) as a governing-duration profile (iterated D, C_s, V_Rück≥0)`.
- [ ] **Step 6: Wire** the A138-26 Gl.10 aggregator to delegate to the flood profile over `resolveColumn(grid, 30)`; thread the C_s/paved-area + V_VA scalars (client + server + snapshot). Add `flood-from-grid.test.ts` (A138-26 + inherited 2D grid, NO `r_D_30` typed → `V_Rueck` computes from the 30-column; governing D surfaced). Run → PASS; full eval suite green.
- [ ] **Step 7: Commit** `feat(eval): A138-26 Gl.10 iterates the shared grid's T_n=30 column`.

---

### Task 6: 2D matrix editor UI (DB-free)

**Files:** Modify `src/components/worksheet/rainfall-tables-editor.tsx`; Test extend `__tests__/rainfall-tables-editor.test.tsx`.

**Behavior:** per location, render a **matrix**: a row per D (add/remove), a column per `RETURN_PERIODS` entry; each cell edits `r[Tn]`. Name/source/gridCell stay. The **selector is unchanged** (table-id only; T_n is never picked here). Legacy `legacyDesignColumn` tables render the single curve under a clearly-labeled "design column" until the grid is filled.

- [ ] Steps 1–5: failing render test (matrix has the 8 T_n column headers; editing a cell writes `r[Tn]`; legacy table shows the design-column note) → implement → pass → commit `feat(worksheet): 2D KOSTRA grid matrix editor`.

---

### Task 7 (GATED — needs Alvaro's go + MCP write path): migrations

**Files:** Create `supabase/migrations/2026XXXX_a138_2d_grid.sql` + `scripts/rollback-…sql`.

- [ ] Extend `T_n.consumer_worksheets` (A138-08) to add A138-13/16/17/18/19/20/21/22 (so facilities inherit the column key). Idempotent (`array` union, re-runnable).
- [ ] Retire/repoint A138-26 `r_D_30` to **derived** (no producer-less required input): set `is_required=false`; it is produced by the grid at read time (mirror A138-07 `A_C_preliminary` retirement). Document that Gl.10 now reads the grid column.
- [ ] Validate read-only against prod (targets resolve, no collision); WRITTEN-NOT-APPLIED; author rollback (restore `T_n` consumers + `r_D_30` required flag).
- [ ] No carrier data UPDATE — legacy curves canonicalize on next 2D-editor save (back-compat at read time meanwhile).

---

### Task 8 (GATED): verify + cutover

- [ ] Full unit suite + typecheck green; **18.684 witness green** (legacy + 2D). Per-path parity (client/report/snapshot) checked.
- [ ] Apply migration to prod (Management-API PAT, MCP is read-only) → deploy `--prod --skip-domain` from the worktree → smoke-test the deploy's **own direct URL** (A138-04 2D matrix editor; basin column resolves from inherited T_n; A138-26 flood reads the 30-column; Piece 2 location selector intact; legacy PLT-HS-01 curve still computes) → **PAUSE → report → re-point aliases only on Alvaro's go**. Rollback = re-point aliases to the prior build + run the rollback SQL.

---

## Self-Review

- **Spec coverage:** 2D carrier (T1), column slice (T2), basin column read (T3), server/snapshot parity (T4), flood unification (T5), 2D editor (T6), T_n-inheritance + r_D_30 retirement migrations (T7), verify/cutover (T8). Single-source (one grid/location, derive-not-pick), back-compat (legacy design column), and the 18.684 witness are explicit acceptance gates.
- **Type consistency:** `RainfallGridRow.r: Partial<Record<TnKey, …>>`, `resolveColumn(table, T_n) → {id,D_min,r_D_n}[]`, `RETURN_PERIODS` used in T1/T2/T6 identically.
- **Placeholders:** none — test + impl shapes given for the DB-free core; T5/T7 carry the exact source-grounded behavior (T_n=30 column at D_flood_min; T_n consumer extension + r_D_30 retirement).
- **Decisions (resolved by Alvaro 2026-06-29):** (a) base = union ✓; (b) legacy re-keying = read-time-tolerant + app-canonicalization, NO bulk data migration ✓; (c) flood D is **iterated** per §5.3.4 L1876 (a governing-duration profile on the 30-column, C_s + paved areas, V_Rück≥0) — NOT a fixed `D_flood_min` ✓ (Task 5 rewritten).

## Playbook capture (after this lands)
Record the **2D predefined-grid** as a variant of the multi-table/source pattern in §10 of the consolidation playbook: a key-by-(stepped-row × selected-column) accessor where the column is an inherited classification (T_n via Tab.8) and the value derives via the governing iteration — never free-picked.
