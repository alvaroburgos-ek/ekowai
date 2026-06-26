# A138-07 Area Single-Source Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make A138-07 the single source for the connected-area totals (`A_E_ba`/`A_E_nba`) and the reduced-area split (`A_C_sealed`/`A_C_unsealed`), so A138-10 inherits them by reference instead of holding independent duplicate fields.

**Architecture:** Mirror the proven A_C consolidation (migration `20260625170000`). The math already exists in `summarizeSurfaces()` (it returns `A_C_sealed`/`A_C_unsealed`/`A_E_ba`/`A_E_nba`). So the code work is: expose two new producer aggregators (Gl. 2f/2g) for the reduced-area split, whitelist + plumb them into both engine paths, materialize + withhold them like the existing derived symbols. The area totals (`A_E_ba`/`A_E_nba`) are already produced + materialized — for them the work is migration-only (register A138-10 as consumer, deactivate A138-10's duplicates). A DB migration (written, NOT applied here) does the data-layer consolidation; cutover happens later under explicit user approval.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Drizzle, Supabase Postgres, Vitest 4 + happy-dom, pnpm.

## Global Constraints

- **138-only.** Work exclusively in worktree `C:/Users/Ekowai/_wt-a138-area` on branch `feat/a138-area-singlesource` (off `main` `f50217c`). NEVER touch `main` or any VSME branch. Do NOT deploy to prod — the migration is written, not applied; cutover pauses for explicit user approval.
- **Do NOT touch A138-26.** Its `A_E_b_a_flood` is a distinct flood-event quantity computed from its own `sub_areas_A138_26` carrier; wiring it to A138-07 would be a correctness bug. Out of scope.
- **Do NOT alter the existing surface math.** `summarizeSurfaces()` (`src/lib/eval/surface-inventory.ts`) is the single source of the Gl. 2 sums and already returns every value needed. Read from it; do not re-derive.
- **Single-source invariant** (`[[single-source-derivation-invariant]]`): one producer per symbol; consumers inherit by reference (never re-enter); a derived value is produced once and declares its consumers.
- **Hardened playbook lessons (apply all):** (1) withholding gates by `field.inheritedFromWorksheet === ownerCode` AND symbol ∈ `SURFACE_DERIVED_SYMBOLS`; (2) json-carrier presence via `jsonConditionValue` (already in place — no regression); (3) when repointing an equation output, retire the orphaned old-output field — N/A here since no equation output is repointed and the deactivated A138-10 fields have no producing equation (verified); (4) materialize EVERY derived value a gate/consumer reads — the two new reduced-area symbols must be materialized + backfilled.
- **Canonical symbols:** the producer (A138-07) symbols win. `A_E_ba`/`A_E_nba` stay as-is; the reduced-area split keeps the existing symbol names `A_C_sealed`/`A_C_unsealed` (no consumer references them today, so reuse is safe and continuity-preserving). A138-10's local duplicates (`A_E_b_a_total`, `A_E_nb_a_total`, `A_C_sealed`, `A_C_unsealed`) are deactivated.
- **New UUIDs** (continue the existing scheme): equations Gl. 2f = `a1380702-0000-4000-8000-000000000005`, Gl. 2g = `a1380702-0000-4000-8000-000000000006`; A138-07 producer fields A_C_sealed = `a1380700-0000-4000-8000-000000000005`, A_C_unsealed = `a1380700-0000-4000-8000-000000000006`.
- **Run tests from the worktree** (`cd C:/Users/Ekowai/_wt-a138-area`; node_modules is junctioned). `pnpm test <file>` for one file; `pnpm test` + `pnpm typecheck` for the full gate.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/eval/surface-inventory.ts` | `summarizeSurfaces` (single source of sums) | **none** — already returns `A_C_sealed`/`A_C_unsealed` |
| `src/lib/eval/aggregators.ts` | producer aggregators + registry | add 2 aggregators (Gl. 2f/2g) + 2 registry entries |
| `src/lib/eval/engine-whitelist.ts` | whitelisted equation keys | add `A138-07:2f`, `A138-07:2g` |
| `src/lib/eval/use-equation-engine.ts` | client engine wiring | add 2 ID consts + extend `A138_07_SURFACE_IDS` |
| `src/lib/eval/evaluate-for-report.ts` | server/report + snapshot engine path | add 2 ID consts + extend `A138_07_SURFACE_IDS` |
| `src/lib/eval/materialize-surfaces.ts` | persist derived outputs on save | add `A_C_sealed`/`A_C_unsealed` to outputs |
| `src/lib/eval/surface-source-state.ts` | `SURFACE_DERIVED_SYMBOLS` + withholding | add the 2 new symbols |
| `src/lib/eval/backfill-surface-plan.ts` | backfill planner for existing projects | include the 2 new symbols |
| `supabase/migrations/20260626140000_a138_area_singlesource.sql` | DB consolidation | **create** (written, not applied) |
| `scripts/rollback-20260626140000-a138-area-singlesource.sql` | rollback | **create** |

---

## Task 1: Expose the reduced-area-split producer aggregators (Gl. 2f / 2g)

**Files:**
- Modify: `src/lib/eval/aggregators.ts` (after the `a138_07_A_E_nba` definition and in the `aggregators` registry export)
- Test: `src/lib/eval/__tests__/surface-aggregators.test.ts`

**Interfaces:**
- Consumes: `makeSurfaceAggregator(pick, formulaEvaluated)` (existing factory); `summarizeSurfaces` returns `{ A_C, A_C_sealed, A_C_unsealed, A_E_ba, A_E_nba, C_m, complete, total }`.
- Produces: two aggregators registered under `a1380702-0000-4000-8000-000000000005` (output `A_C_sealed`) and `a1380702-0000-4000-8000-000000000006` (output `A_C_unsealed`).

- [ ] **Step 1: Write failing tests** — append to `src/lib/eval/__tests__/surface-aggregators.test.ts`:

```ts
import { aggregators } from '../aggregators';

const GL2F = 'a1380702-0000-4000-8000-000000000005';
const GL2G = 'a1380702-0000-4000-8000-000000000006';

// Two complete rows: one paved (befestigt) C_i=0.9, one unpaved C_i=0.3.
const carrier = {
  surfaceInventory: {
    rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: false },
    ],
  },
};

describe('A138-07 reduced-area split producers (Gl. 2f/2g)', () => {
  it('A_C_sealed = Σ(A_E·C_i) over befestigt rows', () => {
    const r = aggregators[GL2F].run({ aggregator: carrier } as never);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(90, 6); // 100*0.9
  });
  it('A_C_unsealed = Σ(A_E·C_i) over unbefestigt rows', () => {
    const r = aggregators[GL2G].run({ aggregator: carrier } as never);
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(60, 6); // 200*0.3
  });
  it('both return manual_required when no row is complete', () => {
    const empty = { surfaceInventory: { rows: [] } };
    expect(aggregators[GL2F].run({ aggregator: empty } as never).kind).toBe('manual_required');
    expect(aggregators[GL2G].run({ aggregator: empty } as never).kind).toBe('manual_required');
  });
});
```

> Note: the `paved` vs `unpaved` split is decided by `rowKind()` → `lookupTab9(tab9_value).kind`. `schwarzdecke_asphalt` is paved; `park_flach` is unpaved. Confirm these two Tab. 9 keys exist and have the expected `kind` by reading `src/lib/eval/tab9.ts`; if a key differs, pick a paved + an unpaved key from that file and keep the same C_i math.

- [ ] **Step 2: Run to verify it fails** — `pnpm test src/lib/eval/__tests__/surface-aggregators.test.ts`
  Expected: FAIL (`aggregators[GL2F]` is `undefined`).

- [ ] **Step 3: Add the two aggregators** in `src/lib/eval/aggregators.ts`, immediately after the line `const a138_07_A_E_nba = makeSurfaceAggregator((s) => s.A_E_nba, 'A_E,nb,a = Σ A_E,i (unbefestigt)');`:

```ts
const a138_07_A_C_sealed = makeSurfaceAggregator((s) => s.A_C_sealed, 'A_C,b = Σ(A_E,b,a,i · C_i)   (reduzierte Fläche, befestigt)');
const a138_07_A_C_unsealed = makeSurfaceAggregator((s) => s.A_C_unsealed, 'A_C,nb = Σ(A_E,nb,a,i · C_i)   (reduzierte Fläche, unbefestigt)');
```

- [ ] **Step 4: Register them** in the `aggregators` export, after the `a1380702-0000-4000-8000-000000000004': a138_07_A_E_nba,` line:

```ts
  // DWA-A 138-1 · A138-07 · Gl. (2f) A_C_sealed producer (reduced area, befestigt)
  'a1380702-0000-4000-8000-000000000005': a138_07_A_C_sealed,
  // DWA-A 138-1 · A138-07 · Gl. (2g) A_C_unsealed producer (reduced area, unbefestigt)
  'a1380702-0000-4000-8000-000000000006': a138_07_A_C_unsealed,
```

- [ ] **Step 5: Run to verify pass** — `pnpm test src/lib/eval/__tests__/surface-aggregators.test.ts`
  Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/eval/aggregators.ts src/lib/eval/__tests__/surface-aggregators.test.ts
git commit -m "feat(138): add A_C_sealed/A_C_unsealed reduced-area-split producers (Gl. 2f/2g)"
```

---

## Task 2: Whitelist + plumb Gl. 2f/2g into both engine paths

**Files:**
- Modify: `src/lib/eval/engine-whitelist.ts`
- Modify: `src/lib/eval/use-equation-engine.ts:36-40`
- Modify: `src/lib/eval/evaluate-for-report.ts:30-39`
- Test: `src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`

**Interfaces:**
- Consumes: the equation UUIDs from Task 1.
- Produces: `A138-07:2f`/`A138-07:2g` in `FORMULA_ENGINE_WHITELIST`; both new UUIDs in each `A138_07_SURFACE_IDS` set so the carrier (`{ surfaceInventory }`) is plumbed to them in client + server eval.

- [ ] **Step 1: Extend the whitelist test** — in `src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`, add assertions that the two new keys are present:

```ts
it('whitelists the reduced-area-split producers Gl. 2f/2g', () => {
  expect(FORMULA_ENGINE_WHITELIST.has('A138-07:2f')).toBe(true);
  expect(FORMULA_ENGINE_WHITELIST.has('A138-07:2g')).toBe(true);
});
```

> Read the file first for the exact import name of the whitelist set; if it imports `engineWhitelist`/`FORMULA_ENGINE_WHITELIST` under a different name, match it.

- [ ] **Step 2: Run to verify it fails** — `pnpm test src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Add the whitelist keys** in `src/lib/eval/engine-whitelist.ts`, after the `'A138-07:2e',` entry:

```ts
  'A138-07:2f',  // A_C_sealed (reduced area, befestigt)
  'A138-07:2g',  // A_C_unsealed (reduced area, unbefestigt)
```

- [ ] **Step 4: Plumb into the client engine** — in `src/lib/eval/use-equation-engine.ts`, replace lines 38-40:

```ts
const A138_07_A_E_BA_ID = 'a1380702-0000-4000-8000-000000000003';
const A138_07_A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';
const A138_07_A_C_SEALED_ID = 'a1380702-0000-4000-8000-000000000005';
const A138_07_A_C_UNSEALED_ID = 'a1380702-0000-4000-8000-000000000006';
const A138_07_SURFACE_IDS = new Set([A138_07_A_C_ID, A138_07_C_M_ID, A138_07_A_E_BA_ID, A138_07_A_E_NBA_ID, A138_07_A_C_SEALED_ID, A138_07_A_C_UNSEALED_ID]);
```

- [ ] **Step 5: Plumb into the server/report path** — in `src/lib/eval/evaluate-for-report.ts`, replace lines 32-39:

```ts
const A138_07_A_E_BA_ID = 'a1380702-0000-4000-8000-000000000003';
const A138_07_A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';
const A138_07_A_C_SEALED_ID = 'a1380702-0000-4000-8000-000000000005';
const A138_07_A_C_UNSEALED_ID = 'a1380702-0000-4000-8000-000000000006';
const A138_07_SURFACE_IDS = new Set([
  A138_07_A_C_ID,
  A138_07_C_M_ID,
  A138_07_A_E_BA_ID,
  A138_07_A_E_NBA_ID,
  A138_07_A_C_SEALED_ID,
  A138_07_A_C_UNSEALED_ID,
]);
```

- [ ] **Step 6: Run to verify pass** — `pnpm test src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`
  Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/engine-whitelist.ts src/lib/eval/use-equation-engine.ts src/lib/eval/evaluate-for-report.ts src/lib/eval/__tests__/whitelist-138-singlesource.test.ts
git commit -m "feat(138): whitelist + plumb Gl. 2f/2g into client + server engine paths"
```

---

## Task 3: Materialize + withhold the reduced-area split

**Files:**
- Modify: `src/lib/eval/materialize-surfaces.ts`
- Modify: `src/lib/eval/surface-source-state.ts:35`
- Modify: `src/lib/eval/backfill-surface-plan.ts`
- Test: `src/lib/eval/__tests__/materialize-surfaces.test.ts`, `src/lib/eval/__tests__/surface-source-state.test.ts`

**Interfaces:**
- Consumes: `summarizeSurfaces` (`A_C_sealed`/`A_C_unsealed`); `SURFACE_DERIVED_SYMBOLS`.
- Produces: `materializeSurfaceOutputs()` returns `A_C_sealed`/`A_C_unsealed` in addition to the existing four; `SURFACE_DERIVED_SYMBOLS` includes both new symbols so withholding + the backfill planner cover them.

- [ ] **Step 1: Write failing tests** — in `src/lib/eval/__tests__/materialize-surfaces.test.ts`, extend the carrier→outputs test to assert the new keys (use the same 2-row carrier as Task 1; expected `A_C_sealed=90`, `A_C_unsealed=60`):

```ts
it('materializes A_C_sealed and A_C_unsealed', () => {
  const out = materializeSurfaceOutputs({ rows: [
    { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: false },
  ]});
  expect(out.A_C_sealed).toBeCloseTo(90, 6);
  expect(out.A_C_unsealed).toBeCloseTo(60, 6);
});
```

  And in `src/lib/eval/__tests__/surface-source-state.test.ts` add:

```ts
import { SURFACE_DERIVED_SYMBOLS } from '../surface-source-state';
it('SURFACE_DERIVED_SYMBOLS includes the reduced-area split', () => {
  expect(SURFACE_DERIVED_SYMBOLS).toContain('A_C_sealed');
  expect(SURFACE_DERIVED_SYMBOLS).toContain('A_C_unsealed');
});
```

- [ ] **Step 2: Run to verify they fail** — `pnpm test src/lib/eval/__tests__/materialize-surfaces.test.ts src/lib/eval/__tests__/surface-source-state.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Extend materialization** — in `src/lib/eval/materialize-surfaces.ts`, extend `SurfaceOutputs` and the return of `materializeSurfaceOutputs`:

```ts
export type SurfaceOutputs = Record<'A_C' | 'C_m' | 'A_E_ba' | 'A_E_nba' | 'A_C_sealed' | 'A_C_unsealed', number | null>;

export function materializeSurfaceOutputs(carrierRaw: unknown): SurfaceOutputs {
  const s = summarizeSurfaces(normalizeSurfaceCarrier(carrierRaw));
  return { A_C: s.A_C, C_m: s.C_m, A_E_ba: s.A_E_ba, A_E_nba: s.A_E_nba, A_C_sealed: s.A_C_sealed, A_C_unsealed: s.A_C_unsealed };
}
```

> Read the actual file first — match its existing import of `summarizeSurfaces`/`normalizeSurfaceCarrier` and its exact return-object style.

- [ ] **Step 4: Add to SURFACE_DERIVED_SYMBOLS** — in `src/lib/eval/surface-source-state.ts`, line 35:

```ts
export const SURFACE_DERIVED_SYMBOLS = ['A_C', 'C_m', 'A_E_ba', 'A_E_nba', 'A_C_sealed', 'A_C_unsealed'] as const;
```

- [ ] **Step 5: Cover the backfill planner** — read `src/lib/eval/backfill-surface-plan.ts`. It plans UPSERTs for the derived symbols. If it iterates `SURFACE_DERIVED_SYMBOLS` (or reads `materializeSurfaceOutputs` keys), it already covers the new symbols — confirm with a quick test assertion that a plan for a complete carrier includes `A_C_sealed`/`A_C_unsealed` rows. If it hardcodes the four symbols, replace that list with `SURFACE_DERIVED_SYMBOLS` (or add the two). Add/extend a test in `src/lib/eval/__tests__/backfill-surface-plan.test.ts` asserting the plan contains the two new symbols for a complete carrier.

- [ ] **Step 6: Run to verify pass** — `pnpm test src/lib/eval/__tests__/materialize-surfaces.test.ts src/lib/eval/__tests__/surface-source-state.test.ts src/lib/eval/__tests__/backfill-surface-plan.test.ts`
  Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/materialize-surfaces.ts src/lib/eval/surface-source-state.ts src/lib/eval/backfill-surface-plan.ts src/lib/eval/__tests__/
git commit -m "feat(138): materialize + withhold + backfill A_C_sealed/A_C_unsealed"
```

---

## Task 4: DB migration + rollback (written, NOT applied)

**Files:**
- Create: `supabase/migrations/20260626140000_a138_area_singlesource.sql`
- Create: `scripts/rollback-20260626140000-a138-area-singlesource.sql`

**Interfaces:**
- Consumes: the proven structure of `supabase/migrations/20260625170000_a138_singlesource_consolidation.sql` (read it first to mirror exact column lists + the `ws07`/`sec07` lookup CTE pattern).
- Produces: A138-07 gains 2 producer fields + 2 equations and registers A138-10 as consumer of all four area symbols; A138-10's four duplicate fields are deactivated.

- [ ] **Step 1: Read the reference migration** `supabase/migrations/20260625170000_a138_singlesource_consolidation.sql` and `scripts/rollback-20260625170000-a138-singlesource.sql` end-to-end. Match its `DO $$ ... $$` block style, the `worksheet_templates`/`standards` lookup, the `fields` and `equations` column lists, and the `ON CONFLICT` handling.

- [ ] **Step 2: Write the forward migration** `supabase/migrations/20260626140000_a138_area_singlesource.sql` (idempotent):

```sql
-- A138-07 area single-source consolidation.
-- (1) Register A138-10 as consumer of A138-07's existing area totals A_E_ba/A_E_nba.
-- (2) Add A138-07 producer fields + equations for the reduced-area split A_C_sealed/A_C_unsealed.
-- (3) Deactivate A138-10's four duplicate fields (no producing eq, no consumer — verified).
-- Mirrors 20260625170000. Idempotent. Does NOT touch A138-26 (flood-event A_E_b_a_flood is a distinct quantity).
DO $$
DECLARE ws07 uuid; ws10 uuid; sec07 uuid;
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws07 IS NULL OR ws10 IS NULL THEN RAISE EXCEPTION 'A138-07/10 templates not found'; END IF;
  -- Section to attach the new producer fields to: reuse the section of the existing A_E_ba field.
  SELECT section_id INTO sec07 FROM fields WHERE worksheet_template_id=ws07 AND symbol='A_E_ba' LIMIT 1;

  -- (1) Register A138-10 as consumer of the existing area totals (currently consumer_worksheets=null).
  UPDATE fields SET consumer_worksheets = ARRAY['A138-10']
    WHERE worksheet_template_id=ws07 AND symbol IN ('A_E_ba','A_E_nba');

  -- (2) Producer fields for the reduced-area split (A138-07 owns them; A138-10 consumes).
  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('a1380700-0000-4000-8000-000000000005', ws07, sec07, 'A_C_sealed',   'Reduzierte Fläche befestigt Σ(A_E,b·C)',   'Reduced sealed area Σ(A_E,b·C)',   'number', 'm²', false, ARRAY['A138-10'], 95, true),
    ('a1380700-0000-4000-8000-000000000006', ws07, sec07, 'A_C_unsealed', 'Reduzierte Fläche unbefestigt Σ(A_E,nb·C)', 'Reduced unsealed area Σ(A_E,nb·C)', 'number', 'm²', false, ARRAY['A138-10'], 96, true)
  ON CONFLICT (id) DO UPDATE SET consumer_worksheets=EXCLUDED.consumer_worksheets, active=true, label_de=EXCLUDED.label_de;

  -- (2b) Equations Gl. 2f / 2g producing the split from surface_inventory.
  INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
  VALUES
    ('a1380702-0000-4000-8000-000000000005', ws07, '2f', 'A_C_sealed = Σ_i (A_E,b,a,i · C_i)',   ARRAY['surface_inventory'], 'A_C_sealed',   'm²', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000006', ws07, '2g', 'A_C_unsealed = Σ_i (A_E,nb,a,i · C_i)', ARRAY['surface_inventory'], 'A_C_unsealed', 'm²', '§5.3.3.5')
  ON CONFLICT (id) DO NOTHING;

  -- (3) Deactivate A138-10's duplicate local fields (now inherited from A138-07).
  UPDATE fields SET active=false, is_required=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('A_E_b_a_total','A_E_nb_a_total','A_C_sealed','A_C_unsealed');
END $$;
```

> Verify the `equations` column names against the reference migration (the live table uses `equation_number`, `formula`, `input_symbols`, `output_symbol`, `output_unit`, `clause_reference`). Adjust if the reference used different names.

- [ ] **Step 3: Write the rollback** `scripts/rollback-20260626140000-a138-area-singlesource.sql`: re-activate A138-10's four fields (`active=true`; restore `is_required` to its pre-migration value — `false` for all four per the read-only audit); delete the two new equations by id; deactivate the two new A138-07 producer fields by id; reset `A_E_ba`/`A_E_nba` `consumer_worksheets` back to `NULL`. Add a header note: the matching CODE rollback removes the two whitelist keys + the two ID consts from `A138_07_SURFACE_IDS` in both engine files + the two registry entries + the `SURFACE_DERIVED_SYMBOLS`/materialize entries.

- [ ] **Step 4: Validate SQL syntax locally** (no DB write) — confirm both files parse by reviewing against the reference; do NOT apply. Commit.

```bash
git add supabase/migrations/20260626140000_a138_area_singlesource.sql scripts/rollback-20260626140000-a138-area-singlesource.sql
git commit -m "feat(138): area single-source migration + rollback (written, not applied)"
```

---

## Task 5: Integration wiring test + full green gate

**Files:**
- Test: the existing A138-07 engine wiring integration test (find it: `grep -rl "A138-07" src/lib/eval/__tests__/`, likely `engine-138-07*.test.ts` or `formula.test.ts`)

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: an integration assertion that, given a populated `surface_inventory` on A138-07, the engine produces `A_C_sealed`/`A_C_unsealed` and writes them back to their output fields (mirrors the existing A_C/A_E_ba assertions).

- [ ] **Step 1: Locate the existing wiring test** and read how it asserts `A_C`/`A_E_ba` are computed + written back through `useEquationEngine` (or the report path). Mirror that exactly for `A_C_sealed`/`A_C_unsealed` with the 2-row carrier (expected 90 / 60).

- [ ] **Step 2: Add the integration assertions** following the existing test's structure (same harness, same field/equation fixtures — add the two Gl. 2f/2g equation rows + the two producer fields to the fixture so the engine wires them).

- [ ] **Step 3: Run the integration test** — `pnpm test <that file>`
  Expected: PASS.

- [ ] **Step 4: Full gate** — `pnpm test` then `pnpm typecheck`
  Expected: all tests pass (≥ 541 + the new ones); typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/__tests__/
git commit -m "test(138): integration wiring for A_C_sealed/A_C_unsealed producers"
```

---

## Cutover (DO NOT run without explicit user approval — pause here and report)

After Tasks 1–5 are green and reviewed, STOP and report "ready to deploy." Cutover, when approved, follows the proven runbook:
1. Merge `feat/a138-area-singlesource` → `main` (138-only; VSME untouched).
2. Apply `20260626140000_a138_area_singlesource.sql` to prod (`vadsmshzebefjreqcicl`) via the Management-API PAT.
3. **Verify B2 (read-only) — all must pass, incl. the explicit orphaned-field gate:**
   - **B2.1 producers exist:** A138-07 has the 2 new producer fields (`A_C_sealed`,`A_C_unsealed`, active) + 2 equations (Gl. 2f/2g).
   - **B2.2 consumers registered:** A138-07's `A_E_ba`/`A_E_nba`/`A_C_sealed`/`A_C_unsealed` each list `A138-10` in `consumer_worksheets`.
   - **B2.3 duplicates deactivated:** A138-10's `A_E_b_a_total`,`A_E_nb_a_total`,`A_C_sealed`,`A_C_unsealed` are all `active=false`.
   - **B2.4 ORPHANED-FIELD GATE (must return ZERO rows):** no *active* A138 equation input/formula or compliance condition references any deactivated A138-10 symbol. Run:
     ```sql
     WITH a138 AS (SELECT wt.id wtid, wt.code FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1'),
          syms AS (SELECT unnest(ARRAY['A_E_b_a_total','A_E_nb_a_total']) sym)
     SELECT 'eq-input' src, a.code, e.equation_number, e.input_symbols::text FROM equations e JOIN a138 a ON e.worksheet_template_id=a.wtid, syms WHERE e.input_symbols::text ILIKE '%'||syms.sym||'%'
     UNION ALL SELECT 'eq-formula', a.code, e.equation_number, e.formula FROM equations e JOIN a138 a ON e.worksheet_template_id=a.wtid, syms WHERE e.formula ILIKE '%'||syms.sym||'%'
     UNION ALL SELECT 'condition', a.code, cr.code, cr.condition FROM compliance_requirements cr JOIN a138 a ON cr.worksheet_template_id=a.wtid, syms WHERE cr.condition ILIKE '%'||syms.sym||'%';
     ```
     (Note: `A_C_sealed`/`A_C_unsealed` are intentionally re-used as A138-07 producer *outputs* post-migration, so the gate targets only the two area-total symbols, which must have zero references anywhere.) Confirmed empty pre-migration on 2026-06-26.
4. `vercel --prod` + re-point the `-hannesoster-` alias ([[reference_ekowai_wizard_deploy]]).
5. Run the surface backfill for existing projects so A138-10 consumers resolve the new split immediately (or save A138-07 once in-browser per project).
6. **Materialization SMOKE-TEST (mandatory — proves the DB round-trip the local tests could not):** in-browser, open a project's A138-07, ensure `surface_inventory` has ≥1 paved + ≥1 unpaved complete row, **save**, then read back from prod:
   ```sql
   SELECT f.symbol, pp.value_number, pp.source_type
   FROM project_parameters pp JOIN fields f ON f.id=pp.field_id
   JOIN worksheet_templates wt ON wt.id=f.worksheet_template_id JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-A-138-1' AND wt.code='A138-07' AND f.symbol IN ('A_C_sealed','A_C_unsealed')
     AND pp.project_id = '<project-id>';
   ```
   Both rows must be present with `source_type='derived'` and finite values (sealed = Σ paved A_E·C, unsealed = Σ unpaved A_E·C). Then open A138-10 and confirm both inherit/display (withheld with cause if A138-07 not yet engineer_approved/final — that is correct, not a failure).
7. Rollback ready: `scripts/rollback-20260626140000-a138-area-singlesource.sql` + the code-rollback note + previous build/alias.

---

## Self-Review

- **Spec coverage:** Item 1 (area totals inherit) = migration Task 4 step (1)+(3); Item 2 (reduced-area split produced by A138-07) = Tasks 1–3 + migration (2). A138-26 explicitly out of scope (Global Constraints). ✓
- **Placeholder scan:** Tasks 1–4 carry complete code. Task 5 + Task 3 step 5 + Task 4 step 3 reference reading an existing file before mirroring — these are "match the existing pattern" instructions with exact targets, not placeholders, because the precise fixture/return-shape lives in files the implementer must not diverge from. ✓
- **Type consistency:** UUIDs, symbols (`A_C_sealed`/`A_C_unsealed`), and `A138_07_SURFACE_IDS` membership are identical across Tasks 1, 2, 3, 5 and the migration. ✓
- **Hardened lessons:** withholding (Task 3 step 4), materialize-every-value (Task 3 + backfill), no orphaned output (Task 4 deactivates non-producer fields; no equation output repointed), json-carrier untouched. ✓
