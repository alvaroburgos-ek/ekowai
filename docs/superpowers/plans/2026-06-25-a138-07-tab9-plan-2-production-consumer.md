# A138-07 Production + A138-10 Consumer (Plan 2 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make A138-07 the single producer of `A_C`, `C_m`, `A_E_ba`, `A_E_nba` from its `surface_inventory` carrier; make A138-10 a pure consumer (inherits `A_C`/`C_m`, mirrors the surface table read-only, retires `sub_areas_A138_10`); blank downstream derived values with a 3-state upstream-cause message.

**Architecture:** A pure `summarizeSurfaces()` helper is the single place the Gl. 2 sums live. Four engine aggregators (one per output) read the `surface_inventory` carrier and delegate to it, keyed to four A138-07 equations. A DB migration repurposes A138-07's existing Gl. 2 (`A_C_preliminary` → `A_C`), adds the three new A138-07 fields/equations, moves the 9 `A_C` consumers onto A138-07, and retires A138-10's Gl. 2/2a/2b/2c + `sub_areas_A138_10`. A new cross-worksheet query feeds A138-10 the source's status + carrier so a `surfaceSourceState()` helper can render the cause message.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Drizzle ORM, Supabase Postgres, Vitest 4 + RTL + happy-dom.

## Global Constraints

- Package manager **pnpm**; single test file: `pnpm test <path>`; full suite: `pnpm test`; types: `pnpm typecheck`.
- UI strings **German**.
- **Single-source invariant (binding):** every derived value produced by exactly ONE active field/equation; consumers inherit by reference; `kind`/pairs/`complete` derived, never stored. A symbol must have exactly ONE active producing field in the standard (else the engine's ambiguity guard blanks it).
- Do **not** change the verified `A_C = Σ(A_E,i · C_i)` arithmetic.
- Tab. 9 values only via `getTab9Entries()`/`lookupTab9()`; surface carrier parsed only via `normalizeSurfaceCarrier()`.
- The engine's three-state contract: aggregators return `EvalState` = `{kind:'computed', value, substituted, formulaEvaluated}` | `{kind:'manual_required', reason}` | `{kind:'error', message}`. Never a bare number hiding a problem.
- Work on branch `feat/a138-07-surface-singlesource` in worktree `C:\Users\Ekowai\_wt-a138`. Git identity Alvaro (already set).
- Prod DB = Supabase `vadsmshzebefjreqcicl`. Migrations are written as `supabase/migrations/*.sql` and **applied via the Supabase MCP / Management API** (DB password not in repo); they must be idempotent (`IF EXISTS`/`ON CONFLICT`/`WHERE` guards) and must **never** overwrite `verification_status`.

## Fixed identifiers (use verbatim)

Existing (from DB, verified 2026-06-25):
- A138-07 Gl. 2 equation: `b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0` (currently outputs `A_C_preliminary`; repurpose → `A_C`).
- A138-10 equations to delete: Gl. 2 `1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3`, Gl. 2a `d1a38110-0000-0000-0000-000000000001`, Gl. 2b `d1a38110-0000-0000-0000-000000000002`, Gl. 2c `d1a38110-0000-0000-0000-000000000003`.
- A138-10 Gl. 3 (Q_zu, KEEP): `b39dda00-9a90-46cc-a045-543047ec6498`.
- 9 `A_C` consumers (currently on A138-10's `A_C` field): A138-10, A138-13, A138-16, A138-17, A138-18, A138-19, A138-20, A138-21, A138-22, A138-26.

New (mint with these literal UUIDs):
- A138-07 fields: `A_C` = `a1380700-0000-4000-8000-000000000001`, `C_m` = `…0002`, `A_E_ba` = `…0003`, `A_E_nba` = `…0004` (prefix `a1380700-0000-4000-8000-0000000000NN`).
- A138-07 equations (new): `C_m` (Gl `2c`) = `a1380702-0000-4000-8000-000000000002`, `A_E_ba` (Gl `2d`) = `…0003`, `A_E_nba` (Gl `2e`) = `…0004`.

---

### Task 1: `summarizeSurfaces` helper

**Files:**
- Modify: `src/lib/eval/surface-inventory.ts` (append helper + `SurfaceSummary` type)
- Test: `src/lib/eval/__tests__/surface-inventory-summary.test.ts`

**Interfaces:**
- Consumes: `SurfaceRow`, `SurfaceInventoryCarrier`, `rowKind`, `rowComplete` (Plan 1).
- Produces:
  - `type SurfaceSummary = { A_C: number|null; A_C_sealed: number|null; A_C_unsealed: number|null; A_E_ba: number|null; A_E_nba: number|null; C_m: number|null; complete: number; total: number }`
  - `summarizeSurfaces(carrier: SurfaceInventoryCarrier): SurfaceSummary`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/surface-inventory-summary.test.ts
import { describe, it, expect } from 'vitest';
import { summarizeSurfaces, normalizeSurfaceCarrier } from '../surface-inventory';

describe('summarizeSurfaces', () => {
  it('sums A_C/C_m and paved/unpaved splits over complete rows only', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(4826.43, 2);
    expect(s.A_C_sealed).toBeCloseTo(4826.43, 2);
    expect(s.A_C_unsealed).toBe(0);
    expect(s.A_E_ba).toBeCloseTo(5362.7, 4);
    expect(s.A_E_nba).toBe(0);
    expect(s.C_m).toBeCloseTo(0.9, 6);
    expect(s).toMatchObject({ complete: 2, total: 2 });
  });

  it('counts an unpaved complete row in the unsealed split and A_E_nba', () => {
    const c = normalizeSurfaceCarrier({
      rows: [{ id: 't', label: 'Rasen', tab9_value: 'park_flach', area_m2: 100, c_i: 0.1, c_s: 0.2, coeff_override: false }],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(10, 6);
    expect(s.A_C_unsealed).toBeCloseTo(10, 6);
    expect(s.A_C_sealed).toBe(0);
    expect(s.A_E_nba).toBe(100);
    expect(s.A_E_ba).toBe(0);
    expect(s.C_m).toBeCloseTo(0.1, 6);
  });

  it('excludes incomplete rows from every sum and counts them in total only', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: 'ok', label: 'Dach', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: 'bad', label: 'Unbestimmt', tab9_value: null, area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C).toBeCloseTo(90, 6);     // 200-row excluded (tab9_value null ⇒ incomplete)
    expect(s.A_E_ba).toBe(100);
    expect(s).toMatchObject({ complete: 1, total: 2 });
  });

  it('returns nulls when there are no complete rows (ΣA=0 ⇒ C_m null, not divide-by-zero)', () => {
    const s = summarizeSurfaces({ rows: [] });
    expect(s).toMatchObject({ A_C: null, A_C_sealed: null, A_C_unsealed: null, A_E_ba: null, A_E_nba: null, C_m: null, complete: 0, total: 0 });
  });

  it('invariant: A_C === A_C_sealed + A_C_unsealed when computed', () => {
    const c = normalizeSurfaceCarrier({
      rows: [
        { id: 'p', label: 'P', tab9_value: 'beton', area_m2: 50, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: 'u', label: 'U', tab9_value: 'park_flach', area_m2: 30, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ],
    });
    const s = summarizeSurfaces(c);
    expect(s.A_C!).toBeCloseTo(s.A_C_sealed! + s.A_C_unsealed!, 6);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`summarizeSurfaces` not exported)

Run: `pnpm test src/lib/eval/__tests__/surface-inventory-summary.test.ts`

- [ ] **Step 3: Append the helper to `src/lib/eval/surface-inventory.ts`**

```ts
// --- append to src/lib/eval/surface-inventory.ts ---

export type SurfaceSummary = {
  A_C: number | null;
  A_C_sealed: number | null;
  A_C_unsealed: number | null;
  A_E_ba: number | null;
  A_E_nba: number | null;
  C_m: number | null;
  complete: number;
  total: number;
};

/** Single source of the Gl. 2 sums. Operates only on COMPLETE rows. When no
 * row is complete every sum is null (C_m guards ΣA=0). */
export function summarizeSurfaces(carrier: SurfaceInventoryCarrier): SurfaceSummary {
  let sealed = 0;        // Σ(area·c_i) paved
  let unsealed = 0;      // Σ(area·c_i) unpaved
  let areaPaved = 0;     // Σ area paved
  let areaUnpaved = 0;   // Σ area unpaved
  let complete = 0;
  for (const r of carrier.rows) {
    if (!rowComplete(r)) continue;
    complete++;
    const area = r.area_m2 as number;
    const contrib = area * (r.c_i as number);
    if (rowKind(r) === 'paved') { sealed += contrib; areaPaved += area; }
    else { unsealed += contrib; areaUnpaved += area; }
  }
  if (complete === 0) {
    return { A_C: null, A_C_sealed: null, A_C_unsealed: null, A_E_ba: null, A_E_nba: null, C_m: null, complete: 0, total: carrier.rows.length };
  }
  const A_C = sealed + unsealed;
  const areaTotal = areaPaved + areaUnpaved;
  const C_m = areaTotal > 0 ? A_C / areaTotal : null;
  return { A_C, A_C_sealed: sealed, A_C_unsealed: unsealed, A_E_ba: areaPaved, A_E_nba: areaUnpaved, C_m, complete, total: carrier.rows.length };
}
```

- [ ] **Step 4: Run test — expect PASS** (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/surface-inventory.ts src/lib/eval/__tests__/surface-inventory-summary.test.ts
git commit -m "feat(138): summarizeSurfaces helper (single source of Gl. 2 sums)"
```

---

### Task 2: Surface aggregators + engine wiring

**Files:**
- Modify: `src/lib/eval/aggregators.ts` (add `surfaceInventory` to `AggregatorContext`, a factory, 4 registry entries)
- Modify: `src/lib/eval/use-equation-engine.ts` (read `surface_inventory` carrier; build context for the 4 A138-07 equation ids; remove the dead `sub_areas`/`A138_10_GL2_ID` path)
- Test: `src/lib/eval/__tests__/surface-aggregators.test.ts`

**Interfaces:**
- Consumes: `summarizeSurfaces`, `normalizeSurfaceCarrier`, `SurfaceInventoryCarrier` (Tasks 1 / Plan 1); `EvalState` (`./formula`).
- Produces: registry entries in `aggregators` keyed by the four A138-07 equation ids (`b3f8c2e0…`=A_C, `a1380702…0002`=C_m, `…0003`=A_E_ba, `…0004`=A_E_nba); `AggregatorContext.surfaceInventory?: SurfaceInventoryCarrier | null`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/surface-aggregators.test.ts
import { describe, it, expect } from 'vitest';
import { aggregators } from '../aggregators';
import { normalizeSurfaceCarrier } from '../surface-inventory';

const A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const C_M_ID = 'a1380702-0000-4000-8000-000000000002';
const BA_ID = 'a1380702-0000-4000-8000-000000000003';
const NBA_ID = 'a1380702-0000-4000-8000-000000000004';

const carrier = normalizeSurfaceCarrier({
  rows: [
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
});
const req = (equationId: string) => ({ equationId, formula: '', inputSymbols: [], outputSymbol: '', expectedUnits: {}, inputs: [], aggregator: { surfaceInventory: carrier } });

describe('surface aggregators (A138-07 producers)', () => {
  it('A_C aggregator computes 4826.43 with paved/unpaved split in substituted', () => {
    const s = aggregators[A_C_ID].run(req(A_C_ID));
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') {
      expect(s.value).toBeCloseTo(4826.43, 2);
      expect(s.substituted['Σ befestigt']).toBeCloseTo(4826.43, 2);
      expect(s.substituted['Σ unbefestigt']).toBe(0);
    }
  });
  it('C_m aggregator computes 0.9', () => {
    const s = aggregators[C_M_ID].run(req(C_M_ID));
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(0.9, 6);
  });
  it('A_E_ba / A_E_nba aggregators compute the paved/unpaved area totals', () => {
    const ba = aggregators[BA_ID].run(req(BA_ID));
    const nba = aggregators[NBA_ID].run(req(NBA_ID));
    expect(ba.kind).toBe('computed'); if (ba.kind === 'computed') expect(ba.value).toBeCloseTo(5362.7, 4);
    expect(nba.kind).toBe('computed'); if (nba.kind === 'computed') expect(nba.value).toBe(0);
  });
  it('returns manual_required (not a bare 0) when no complete rows', () => {
    const empty = { surfaceInventory: { rows: [] } };
    const s = aggregators[A_C_ID].run({ equationId: A_C_ID, formula: '', inputSymbols: [], outputSymbol: '', expectedUnits: {}, inputs: [], aggregator: empty });
    expect(s.kind).toBe('manual_required');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (no registry entries / no `surfaceInventory` context)

Run: `pnpm test src/lib/eval/__tests__/surface-aggregators.test.ts`

- [ ] **Step 3: Edit `src/lib/eval/aggregators.ts`**

Add the import and context field, the factory, and register the four ids. (a) Add to imports at top:

```ts
import { summarizeSurfaces, type SurfaceInventoryCarrier } from './surface-inventory';
```

(b) Add to `AggregatorContext` (inside the existing type literal):

```ts
  /** Carrier for the A138-07 surface-inventory producers (Gl. 2 + C_m + area totals). */
  surfaceInventory?: SurfaceInventoryCarrier | null;
```

(c) Add the factory + registry entries (place the factory near the other aggregators; add the four keys to the existing `export const aggregators` object):

```ts
/** A138-07 producers: each reads the surface_inventory carrier and returns one
 * scalar from the shared summarizeSurfaces(). manual_required when no complete
 * row exists, so downstream blanks with a cause rather than showing 0. */
function makeSurfaceAggregator(
  pick: (s: ReturnType<typeof summarizeSurfaces>) => number | null,
  formulaEvaluated: string,
): Aggregator {
  return {
    run: (req) => {
      const carrier = req.aggregator?.surfaceInventory;
      if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
        return { kind: 'manual_required', reason: 'Keine Flächen im Flächenverzeichnis (A138-07) erfasst.' };
      }
      const sum = summarizeSurfaces(carrier);
      if (sum.complete === 0) {
        return { kind: 'manual_required', reason: `Keine vollständigen Flächen-Zeilen (0/${sum.total}). Oberflächentyp, Fläche und C_i je Zeile erforderlich.` };
      }
      const value = pick(sum);
      if (value == null || !Number.isFinite(value)) {
        return { kind: 'manual_required', reason: 'Wert nicht berechenbar (Σ Fläche = 0).' };
      }
      const substituted: Record<string, number> = {
        'Σ befestigt': sum.A_C_sealed ?? 0,
        'Σ unbefestigt': sum.A_C_unsealed ?? 0,
        'Σ A·C_i': sum.A_C ?? 0,
      };
      return { kind: 'computed', value, substituted, formulaEvaluated };
    },
  };
}

const a138_07_A_C = makeSurfaceAggregator((s) => s.A_C, 'A_C = Σ(A_E,i · C_i)   (Flächenverzeichnis, Tab. 9)');
const a138_07_C_m = makeSurfaceAggregator((s) => s.C_m, 'C_m = A_C / Σ A_E,i');
const a138_07_A_E_ba = makeSurfaceAggregator((s) => s.A_E_ba, 'A_E,b,a = Σ A_E,i (befestigt)');
const a138_07_A_E_nba = makeSurfaceAggregator((s) => s.A_E_nba, 'A_E,nb,a = Σ A_E,i (unbefestigt)');
```

In the `export const aggregators` object, **remove** the `'1a48af79-…': a138_10_gl2,` line and **add**:

```ts
  'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0': a138_07_A_C,
  'a1380702-0000-4000-8000-000000000002': a138_07_C_m,
  'a1380702-0000-4000-8000-000000000003': a138_07_A_E_ba,
  'a1380702-0000-4000-8000-000000000004': a138_07_A_E_nba,
```

Then delete the now-unused `a138_10_gl2` aggregator definition and the `SubArea`/`SubAreasCarrier`/`isComplete`/`rowLabel` helpers **only if** nothing else references them (grep first; the Gl. 8/10 aggregators use their own carriers, not `SubArea`). If `SubArea` is still imported elsewhere, leave the type and delete only `a138_10_gl2`.

- [ ] **Step 4: Edit `src/lib/eval/use-equation-engine.ts`**

(a) Replace the `A138_10_GL2_ID` constant block with the four A138-07 ids:

```ts
const A138_07_A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const A138_07_C_M_ID = 'a1380702-0000-4000-8000-000000000002';
const A138_07_A_E_BA_ID = 'a1380702-0000-4000-8000-000000000003';
const A138_07_A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';
const A138_07_SURFACE_IDS = new Set([A138_07_A_C_ID, A138_07_C_M_ID, A138_07_A_E_BA_ID, A138_07_A_E_NBA_ID]);
```

(b) In `consumedSymbolsFor`, replace the `A138_10_GL2_ID` branch with:

```ts
  if (A138_07_SURFACE_IDS.has(eq.id)) {
    return [...(eq.inputSymbols ?? []), 'surface_inventory'];
  }
```

(c) Replace the `subAreasField`/`subAreasCarrier` memos with a surface-carrier memo (import `normalizeSurfaceCarrier` from `./surface-inventory`):

```ts
import { normalizeSurfaceCarrier, type SurfaceInventoryCarrier } from './surface-inventory';
// …
const surfaceField = useMemo(() => fields.find((f) => f.symbol === 'surface_inventory'), [fields]);
const surfaceCarrier = useMemo<SurfaceInventoryCarrier | null>(() => {
  if (!surfaceField) return null;
  const v = values[surfaceField.id];
  if (v?.type !== 'json') return null;
  return normalizeSurfaceCarrier(v.value);
}, [values, surfaceField]);
```

(d) In the aggregator-context `if/else` chain, replace the `A138_10_GL2_ID` branch with:

```ts
      if (A138_07_SURFACE_IDS.has(eq.id)) {
        aggregator = surfaceCarrier ? { surfaceInventory: surfaceCarrier } : undefined;
      } else if (eq.id === A138_13_GL8_ID) {
```

(e) Update the `engineStates` useMemo dependency array: remove `subAreasCarrier`, add `surfaceCarrier`.

- [ ] **Step 5: Run the new test — expect PASS** (4 tests)

Run: `pnpm test src/lib/eval/__tests__/surface-aggregators.test.ts`

- [ ] **Step 6: Run full suite — expect PASS** (the old `sub_areas` engine test, if any, must be updated/removed)

Run: `pnpm test`
Expected: green. If a test exercised `A138-10:2` via `sub_areas_A138_10`, delete or rewrite it to target A138-07 (the producer moved). Name any such file in the report.

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/aggregators.ts src/lib/eval/use-equation-engine.ts src/lib/eval/__tests__/surface-aggregators.test.ts
git commit -m "feat(138): A138-07 surface aggregators produce A_C/C_m/A_E_ba/A_E_nba; drop sub_areas Gl.2 path"
```

---

### Task 3: DB migration + whitelist (consolidate producer, retire A138-10 duplicates)

**Files:**
- Create: `supabase/migrations/20260625170000_a138_singlesource_consolidation.sql`
- Modify: `src/lib/eval/whitelist.ts` and `src/lib/eval/engine-whitelist.ts`
- Test: `src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`

**Interfaces:**
- Consumes: the fixed identifiers above.
- Produces: A138-07 fields `A_C`/`C_m`/`A_E_ba`/`A_E_nba` (with `A_C`/`C_m` consumer arrays = the 9 consumers); A138-07 equations `2`(repointed)/`2c`/`2d`/`2e`; A138-10 Gl. 2/2a/2b/2c deleted; `A_C`/`C_m` fields on A138-10 + `sub_areas_A138_10` set `active=false`.

- [ ] **Step 1: Write the failing whitelist test**

```ts
// src/lib/eval/__tests__/whitelist-138-singlesource.test.ts
import { describe, it, expect } from 'vitest';
import { FORMULA_ENGINE_WHITELIST } from '../whitelist';

describe('engine whitelist — A138-07 single-source', () => {
  it('whitelists the four A138-07 producers', () => {
    for (const k of ['A138-07:2', 'A138-07:2c', 'A138-07:2d', 'A138-07:2e']) {
      expect(FORMULA_ENGINE_WHITELIST.has(k)).toBe(true);
    }
  });
  it('no longer whitelists A138-10:2 (production moved off A138-10)', () => {
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:2')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`

- [ ] **Step 3: Edit both whitelist files**

In `src/lib/eval/whitelist.ts` (the file `worksheet-form.tsx` imports) and `src/lib/eval/engine-whitelist.ts`: **remove** `'A138-10:2'` and **add**:

```ts
  'A138-07:2',   // A_C = Σ(A_E·C_i) from surface_inventory (producer)
  'A138-07:2c',  // C_m
  'A138-07:2d',  // A_E_ba (Σ befestigt area)
  'A138-07:2e',  // A_E_nba (Σ unbefestigt area)
```

- [ ] **Step 4: Run — expect PASS**, then commit the whitelist:

```bash
git add src/lib/eval/whitelist.ts src/lib/eval/engine-whitelist.ts src/lib/eval/__tests__/whitelist-138-singlesource.test.ts
git commit -m "feat(138): whitelist A138-07 producers, drop A138-10:2"
```

- [ ] **Step 5: Write the migration SQL**

```sql
-- supabase/migrations/20260625170000_a138_singlesource_consolidation.sql
-- A138-07 becomes the single producer of A_C/C_m/A_E_ba/A_E_nba; A138-10 retires
-- its Gl.2/2a/2b/2c + sub_areas. Idempotent. Never touches verification_status.
DO $$
DECLARE
  ws07 uuid;
  ws10 uuid;
  sec07 uuid;
  consumers text[] := ARRAY['A138-10','A138-13','A138-16','A138-17','A138-18','A138-19','A138-20','A138-21','A138-22','A138-26'];
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  SELECT section_id INTO sec07 FROM fields WHERE worksheet_template_id=ws07 AND symbol='surface_inventory';

  -- 1. Repoint A138-07 Gl.2 output A_C_preliminary -> A_C.
  UPDATE equations SET output_symbol='A_C', output_unit='m²'
    WHERE id='b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

  -- 2. New A138-07 producer fields (number). A_C/C_m carry the 9 consumers.
  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('a1380700-0000-4000-8000-000000000001', ws07, sec07, 'A_C',     'Befestigte, abflusswirksame Fläche A_C', 'Effective area A_C', 'number', 'm²', false, consumers, 90, true),
    ('a1380700-0000-4000-8000-000000000002', ws07, sec07, 'C_m',     'Mittlerer Abflussbeiwert C_m',          'Mean runoff coeff C_m', 'number', '-', false, consumers, 91, true),
    ('a1380700-0000-4000-8000-000000000003', ws07, sec07, 'A_E_ba',  'Σ befestigte Fläche A_E,b,a',           'Σ paved area',  'number', 'm²', false, NULL, 92, true),
    ('a1380700-0000-4000-8000-000000000004', ws07, sec07, 'A_E_nba', 'Σ unbefestigte Fläche A_E,nb,a',        'Σ unpaved area','number', 'm²', false, NULL, 93, true)
  ON CONFLICT (id) DO UPDATE SET consumer_worksheets=EXCLUDED.consumer_worksheets, active=true;

  -- 3. New A138-07 equations for C_m / A_E_ba / A_E_nba (Gl.2 already exists).
  INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
  VALUES
    ('a1380702-0000-4000-8000-000000000002', ws07, '2c', 'C_m = A_C / A_E', ARRAY['surface_inventory'], 'C_m', '-', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000003', ws07, '2d', 'A_E_ba = Σ A_E,i (befestigt)', ARRAY['surface_inventory'], 'A_E_ba', 'm²', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000004', ws07, '2e', 'A_E_nba = Σ A_E,i (unbefestigt)', ARRAY['surface_inventory'], 'A_E_nba', 'm²', '§5.3.3.5')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Retire A138-10 duplicate producers: delete Gl.2/2a/2b/2c equations.
  DELETE FROM equations WHERE id IN (
    '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3',
    'd1a38110-0000-0000-0000-000000000001',
    'd1a38110-0000-0000-0000-000000000002',
    'd1a38110-0000-0000-0000-000000000003');

  -- 5. Deactivate A138-10's A_C/C_m/sub_areas fields (so A_C/C_m are produced once;
  --    A138-10 inherits A_C/C_m from A138-07). Preserves any stored values.
  UPDATE fields SET active=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('A_C','C_m','sub_areas_A138_10');
END $$;
```

- [ ] **Step 6: Commit the migration FILE — do NOT apply to prod yet**

```bash
git add supabase/migrations/20260625170000_a138_singlesource_consolidation.sql
git commit -m "db(138): migration to consolidate A_C/C_m on A138-07 (apply on deploy, not before)"
```

**DO NOT apply this migration to prod (`vadsmshzebefjreqcicl`) while the branch is unmerged.** It deletes A138-10's Gl. 2 + deactivates A138-10's `A_C` field; the currently-deployed code computes A_C via the whitelisted `A138-10:2`, so applying early would leave prod with **no** A_C producer (A138-07's new equations aren't whitelisted in deployed code) and break A_C for all 138 projects. The migration and this branch's code must ship **together** at merge/deploy time (handled in Plan 3 / finishing). Verification of the migration runs against a **Supabase dev branch** (or at deploy), per the controller's choice — see "Risks / notes". The pure-logic of this plan (Tasks 1, 2, 4, 5) is fully validated by the unit/engine tests, which do not touch the DB.

---

### Task 4: Cross-worksheet source query + `surfaceSourceState`

**Files:**
- Modify: `src/lib/db/queries/worksheet.ts` (add `loadSurfaceSource`)
- Create: `src/lib/eval/surface-source-state.ts`
- Test: `src/lib/eval/__tests__/surface-source-state.test.ts`

**Interfaces:**
- Produces:
  - `loadSurfaceSource(projectId: string, standardId: string, currentWorksheetCode: string): Promise<{ status: string; carrier: unknown } | null>` — looks up the A138-07 (or whichever worksheet owns `surface_inventory`) instance status + the `project_parameters.value_json` for its `surface_inventory` field. Returns null when the current worksheet IS the owner or no source exists.
  - `surfaceSourceState(carrierRaw: unknown, sourceStatus: string | null): { state: 'missing'|'incomplete'|'ok'; complete: number; total: number; message: string | null }` — uses `normalizeSurfaceCarrier` + `summarizeSurfaces`; `ok` only when every row complete AND status ∈ {engineer_approved, final}.

- [ ] **Step 1: Write the failing test** (pure helper only; the DB query is integration-covered)

```ts
// src/lib/eval/__tests__/surface-source-state.test.ts
import { describe, it, expect } from 'vitest';
import { surfaceSourceState } from '../surface-source-state';

const full = { rows: [{ id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] };
const partial = { rows: [
  { id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
  { id: '2', tab9_value: null, area_m2: 50, c_i: null, c_s: null, coeff_override: false },
] };

describe('surfaceSourceState', () => {
  it('missing when no carrier / zero rows', () => {
    expect(surfaceSourceState(null, 'final').state).toBe('missing');
    expect(surfaceSourceState({ rows: [] }, 'final').state).toBe('missing');
    expect(surfaceSourceState(null, 'final').message).toMatch(/nicht erfasst/);
  });
  it('incomplete when rows not all complete (even if final)', () => {
    const r = surfaceSourceState(partial, 'final');
    expect(r.state).toBe('incomplete');
    expect(r.message).toContain('1/2');
    expect(r.message).toMatch(/nicht final/);
  });
  it('incomplete when complete rows but source still draft', () => {
    expect(surfaceSourceState(full, 'draft').state).toBe('incomplete');
  });
  it('ok when all rows complete AND status engineer_approved/final', () => {
    expect(surfaceSourceState(full, 'engineer_approved').state).toBe('ok');
    expect(surfaceSourceState(full, 'final').state).toBe('ok');
    expect(surfaceSourceState(full, 'final').message).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test src/lib/eval/__tests__/surface-source-state.test.ts`

- [ ] **Step 3: Write `src/lib/eval/surface-source-state.ts`**

```ts
import { normalizeSurfaceCarrier, summarizeSurfaces } from './surface-inventory';

const READY_STATUSES = new Set(['engineer_approved', 'final']);

export type SurfaceSourceState = {
  state: 'missing' | 'incomplete' | 'ok';
  complete: number;
  total: number;
  message: string | null;
};

/** Decide whether A138-10's inherited A_C/C_m should render or blank-with-cause.
 * `ok` requires every row complete AND the source instance approved/final. */
export function surfaceSourceState(carrierRaw: unknown, sourceStatus: string | null): SurfaceSourceState {
  const carrier = normalizeSurfaceCarrier(carrierRaw);
  const sum = summarizeSurfaces(carrier);
  if (sum.total === 0) {
    return { state: 'missing', complete: 0, total: 0, message: 'Quelle A138-07 nicht erfasst — abgeleitete Werte ausgeblendet.' };
  }
  const allComplete = sum.complete === sum.total;
  const ready = allComplete && sourceStatus != null && READY_STATUSES.has(sourceStatus);
  if (ready) return { state: 'ok', complete: sum.complete, total: sum.total, message: null };
  return {
    state: 'incomplete',
    complete: sum.complete,
    total: sum.total,
    message: `Quelle A138-07 nicht final (${sum.complete}/${sum.total} Zeilen vollständig) — abgeleitete Werte ausgeblendet.`,
  };
}
```

- [ ] **Step 4: Run — expect PASS** (4 tests)

- [ ] **Step 5: Add `loadSurfaceSource` to `src/lib/db/queries/worksheet.ts`**

```ts
/** Load the surface-inventory SOURCE (A138-07) instance status + carrier value
 * for a consumer worksheet render. Returns null when the current worksheet is
 * itself the owner of `surface_inventory`, or no source row exists. */
export async function loadSurfaceSource(
  projectId: string,
  standardId: string,
  currentWorksheetCode: string,
): Promise<{ status: string; carrier: unknown } | null> {
  const ownerField = await db
    .select({ fieldId: fields.id, ownerCode: worksheetTemplates.code, templateId: worksheetTemplates.id })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(
      eq(worksheetTemplates.standardId, standardId),
      eq(fields.symbol, 'surface_inventory'),
      eq(fields.active, true),
    ))
    .limit(1);
  if (ownerField.length === 0) return null;
  const owner = ownerField[0];
  if (owner.ownerCode === currentWorksheetCode) return null; // current sheet IS the source

  const inst = await db
    .select({ status: worksheetInstances.status })
    .from(worksheetInstances)
    .where(and(eq(worksheetInstances.projectId, projectId), eq(worksheetInstances.worksheetTemplateId, owner.templateId)))
    .limit(1);
  const param = await db
    .select({ value: projectParameters.valueJson })
    .from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), eq(projectParameters.fieldId, owner.fieldId)))
    .limit(1);
  return { status: inst[0]?.status ?? 'draft', carrier: param[0]?.value ?? null };
}
```

Ensure `worksheetInstances` and `projectParameters` are imported in this file (they are part of the schema import block).

- [ ] **Step 6: Commit**

```bash
git add src/lib/eval/surface-source-state.ts src/lib/eval/__tests__/surface-source-state.test.ts src/lib/db/queries/worksheet.ts
git commit -m "feat(138): cross-worksheet surface source loader + surfaceSourceState"
```

---

### Task 5: A138-10 UI — read-only mirror, retire sub-areas editor, upstream-cause message

**Files:**
- Modify: `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx` (call `loadSurfaceSource`, pass to form)
- Modify: `src/components/worksheet/worksheet-form.tsx` (drop SubAreasEditor; render read-only surface mirror + upstream-cause banner when a source state is passed)
- Create: `src/components/worksheet/surface-source-banner.tsx`
- Test: `src/components/worksheet/__tests__/surface-source-banner.test.tsx`

**Interfaces:**
- Consumes: `loadSurfaceSource` (Task 4), `surfaceSourceState` + `SurfaceSourceState` (Task 4), `SurfaceInventoryEditor` (Plan 1).
- Produces: `<SurfaceSourceBanner state={SurfaceSourceState} />`; a new optional prop `surfaceSource?: { status: string; carrier: unknown } | null` on `WorksheetForm`.

- [ ] **Step 1: Write the failing banner test**

```tsx
// src/components/worksheet/__tests__/surface-source-banner.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurfaceSourceBanner } from '../surface-source-banner';
import { surfaceSourceState } from '@/lib/eval/surface-source-state';

describe('SurfaceSourceBanner', () => {
  it('renders nothing when source is ok', () => {
    const { container } = render(<SurfaceSourceBanner state={surfaceSourceState({ rows: [{ id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] }, 'final')} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('shows the incomplete cause with n/m', () => {
    render(<SurfaceSourceBanner state={surfaceSourceState({ rows: [
      { id: '1', tab9_value: 'beton', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false },
    ] }, 'final')} />);
    expect(screen.getByText(/Quelle A138-07 nicht final \(1\/2/)).toBeInTheDocument();
  });
  it('shows the missing cause', () => {
    render(<SurfaceSourceBanner state={surfaceSourceState(null, 'final')} />);
    expect(screen.getByText(/nicht erfasst/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test src/components/worksheet/__tests__/surface-source-banner.test.tsx`

- [ ] **Step 3: Create `src/components/worksheet/surface-source-banner.tsx`**

```tsx
import type { SurfaceSourceState } from '@/lib/eval/surface-source-state';

export function SurfaceSourceBanner({ state }: { state: SurfaceSourceState }) {
  if (state.state === 'ok' || !state.message) return null;
  return (
    <div
      data-testid="surface-source-banner"
      role="status"
      className="border border-warning/40 bg-warning/10 text-ink rounded px-3 py-2 text-sm"
    >
      {state.message}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS** (3 tests), then wire the page + form.

- [ ] **Step 5: Edit the worksheet page** (`…/[worksheetCode]/page.tsx`)

After the existing inherited-fields load, add (using the worksheet's `standardId` and `template.code` already in scope; if `standardId` isn't in scope, read it from the loaded standard/template):

```ts
import { loadSurfaceSource } from '@/lib/db/queries/worksheet';
// … after loadWorksheet/loadInheritedFields:
const surfaceSource = await loadSurfaceSource(projectId, template.standardId, template.code);
```

Pass it to the form: `<WorksheetForm … surfaceSource={surfaceSource} />`.

- [ ] **Step 6: Edit `worksheet-form.tsx`**

(a) Add the prop to `Props`: `surfaceSource?: { status: string; carrier: unknown } | null;` and destructure it.

(b) Compute the state near the top of the component body:

```ts
import { surfaceSourceState } from '@/lib/eval/surface-source-state';
import { SurfaceSourceBanner } from './surface-source-banner';
// …
const srcState = surfaceSource ? surfaceSourceState(surfaceSource.carrier, surfaceSource.status) : null;
```

(c) Render the banner just above the "Vorgelagerte Werte" panel:

```tsx
{srcState && <SurfaceSourceBanner state={srcState} />}
```

(d) **Retire the sub-areas editor:** delete the `subAreasField` lookup and the entire `{subAreasField && ( … <SubAreasEditor/> … )}` section (lines ~521–528). Remove the now-unused `SubAreasEditor` import.

(e) **Read-only surface mirror on consumers:** when `surfaceSource` is present (i.e., this worksheet consumes, e.g. A138-10), render a read-only table of the source carrier below the inherited panel:

```tsx
{surfaceSource && srcState && srcState.state !== 'missing' && (
  <section className="border-t border-hairline pt-6 mt-8 space-y-2">
    <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
      Flächenverzeichnis (aus A138-07 — schreibgeschützt)
    </h2>
    <ReadOnlySurfaceTable carrier={surfaceSource.carrier} />
  </section>
)}
```

Add a small local `ReadOnlySurfaceTable` (in this file or a sibling) that calls `normalizeSurfaceCarrier(carrier)` and renders label · Oberflächentyp (via `lookupTab9(...).label`) · A · C_i · C_s · A·C_i, with NO inputs. (Reuse the formatting from the editor; no store writes.)

- [ ] **Step 7: Run full suite + typecheck — expect PASS**

Run: `pnpm test && pnpm typecheck`
Expected: green. Update/remove any prior test that rendered the SubAreasEditor on A138-10 (it's retired); name it in the report.

- [ ] **Step 8: Commit**

```bash
git add src/app/**/worksheets/[worksheetCode]/page.tsx src/components/worksheet/worksheet-form.tsx src/components/worksheet/surface-source-banner.tsx src/components/worksheet/__tests__/surface-source-banner.test.tsx
git commit -m "feat(138): A138-10 consumes A138-07 — read-only mirror, retire sub-areas, upstream-cause banner"
```

---

## Self-Review (against the spec)

- §4 produce-on-A138-07 → Tasks 1–3 (`summarizeSurfaces`, aggregators, migration repoint + new fields/equations + whitelist). ✓
- §5 A138-10 pure consumer (inherit A_C/C_m, retire Gl.2/2a/2b/2c + sub_areas, read-only mirror, Q_zu unchanged) → Tasks 3 + 5. ✓ (Q_zu Gl.3 untouched; it now resolves `A_C` via inheritance.)
- §6 3-state upstream-cause message → Task 4 (`surfaceSourceState`) + Task 5 (banner + wiring). ✓
- §4 `A_C_sealed`/`A_C_unsealed` as card-display → Task 2 (`substituted['Σ befestigt'/'Σ unbefestigt']`). ✓
- Single-producer/ambiguity: Task 3 deactivates A138-10's `A_C`/`C_m` fields so each symbol has exactly one active producer. ✓
- Consumer re-pointing of the 9 `A_C` consumers + materialization → **Plan 3** (this plan moves the consumer ARRAY onto A138-07's field; verifying the values actually resolve on all 9 downstream sheets, and persisting derived outputs, is Plan 3).

**Placeholder scan:** none — every code/SQL step is complete. **Type consistency:** the four equation ids and four field symbols are identical across Tasks 2/3; `SurfaceSummary`/`SurfaceSourceState` names match across tasks.

## Risks / notes for the executor

- **Ambiguity guard:** if both A138-07 and A138-10 have an active `A_C` field, the engine blanks A_C everywhere. Task 3 step 5 (deactivate A138-10 `A_C`/`C_m`) is essential — verify it applied before testing the engine end-to-end.
- **Two whitelist files** exist (`whitelist.ts` is what the form imports; `engine-whitelist.ts` is the newer superset). Update BOTH (Task 3 step 3).
- **Migration timing is load-bearing:** the migration must NOT hit prod until this branch's code is deployed (it removes the deployed A_C producer). Apply it together with the code at merge/deploy (Plan 3 / finishing). For end-to-end verification before then, apply to a **Supabase dev branch** (`create_branch` via MCP) rather than prod; keep it idempotent and re-runnable.
- Cross-worksheet value delivery to the 9 consumers depends on the engine-output-materialization gap — **Plan 3**. This plan wires the producer and the A138-10 consumer UI; it does not yet guarantee A_C resolves on A138-13…26.
