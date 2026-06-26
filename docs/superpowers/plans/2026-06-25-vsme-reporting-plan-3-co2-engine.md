# VSME Reporting — Plan 3: CO₂ Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute B3 Scope 1 & 2 GHG totals from per-line activity data × UBA emission factors, and **persist them to `project_parameters` with per-figure provenance** — closing the engine-output materialization gap (spec Condition C1).

**Architecture:** A KOSTRA-style split — a pure calc module (`amount × factor ÷ 1000`) with no `src/lib/eval/` imports, a DB factor resolver, a new `co2_activity_lines` working table, and a server action that aggregates per scope and **upserts the VSME GHG output fields into `project_parameters`** (`sourceType='computed'`, citations in the existing `citation_sources` jsonb). Each persisted total is provable by reading `project_parameters` back.

**Tech Stack:** TypeScript, Drizzle, Postgres (local), vitest (`unit` + `integration` projects), `tsx`, pnpm.

**Source spec:** `docs/superpowers/specs/2026-06-25-vsme-reporting-design.md` §5 (CO₂ engine) + §11 condition C1. Plan 1 + Plan 2 are on this branch (`feat/vsme-seeders`): `emission_factors` seeded (281 factors on local), VSME standard + 143 fields seeded.

## Global Constraints

- **Worktree:** all work in `C:\Users\Ekowai\_wt-vsme` (branch `feat/vsme-seeders`). Never the hub or `_wt-a138`.
- **Target DB = LOCAL ONLY.** `.env.local` `DATABASE_URL` → local (`127.0.0.1:54322`); prod parked as `DATABASE_URL_PROD`. The local stack runs in WSL (`supabase start` if down).
- **🚩 PROD STEPS ARE HELD — do NOT apply to prod.** Any migration or DDL is applied to **local only**. Each is tagged **🚩PROD-PROMOTE** in the plan; the human runs the prod promotion when coordinating both tracks. This includes the **`emission_factors` RLS policy** (Task #10) which must reach prod before the engine runs against prod — flagged, not applied here.
- **Package manager:** `pnpm`. Migrations: apply to local only via a `supabase/migrations` SQL file + the local DB (the implementer applies with a one-off `tsx` script that loads `.env.local`, mirroring how Plan 1 applied locally; do NOT run `drizzle-kit migrate`).
- **CO₂ math:** `tCO₂e = activity_amount × kg_co2e ÷ 1000`. `kg_co2e` and amounts are `numeric` (Drizzle returns string) — parse with `Number()` at the calc boundary; never lose precision in the DB (store `numeric`).
- **Persistence target = `project_parameters`** keyed by `(project_id, field_id)`, value in `value_number`, `source_type='computed'`, provenance in `citation_sources` (jsonb array). Mirror the upsert in `src/lib/actions/worksheet.ts`.
- **Output field symbols (persistence targets, confirmed seeded on local):** `GrossScope1GreenhouseGasEmissions`, `GrossLocationBasedScope2GreenhouseGasEmissions`, `TotalGrossLocationBasedScope1AndScope2GHGEmissions`. (Market-based Scope 2 needs supplier-specific factors → **deferred**, flagged.)
- **KOSTRA discipline:** the pure calc module must NOT import from `src/lib/eval/` (mirror `src/lib/site-profile/kostra.ts`).
- **🚩 Plan-2 follow-up (flag, not fixed here):** the GHG output fields are in `VSME-C03.000` tagged `general` (should be B03/`ekowai_env`). Re-mapping is a Plan-2 verify-pass item; Task 4 targets fields by symbol so it's unaffected.

---

### Task 1: `co2_activity_lines` table (working layer)

**Files:**
- Modify: `src/lib/db/schema.ts` (new table)
- Create: `supabase/migrations/<UTC>_co2_activity_lines.sql`
- Create (apply-local helper): `scripts/co2/_apply-local-migration.ts`
- Test: `src/lib/db/__tests__/co2-activity-lines-schema.test.ts`

**Interfaces:**
- Produces: `co2ActivityLines` Drizzle table — `id, project_id, worksheet_instance_id, scope ('Scope 1'|'Scope 2'), category, subcategory, amount numeric, unit, factor_uba_id, factor_source_version, computed_tco2e numeric (nullable), created_by, created_at`. Consumed by Tasks 3–4.

- [ ] **Step 1: Add the table to `schema.ts`**

```typescript
export const co2ActivityLines = pgTable(
  'co2_activity_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    worksheetInstanceId: uuid('worksheet_instance_id').references(() => worksheetInstances.id, { onDelete: 'set null' }),
    scope: text('scope').notNull(),               // 'Scope 1' | 'Scope 2'
    category: text('category').notNull(),         // matches emission_factors.category
    subcategory: text('subcategory'),
    amount: numeric('amount').notNull(),
    unit: text('unit').notNull(),
    factorUbaId: text('factor_uba_id').notNull(),
    factorSourceVersion: text('factor_source_version').notNull(),
    computedTco2e: numeric('computed_tco2e'),      // last computed result (cache)
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);
```

- [ ] **Step 2: Write the migration SQL** (`supabase/migrations/<UTC>_co2_activity_lines.sql`)

```sql
-- 🚩PROD-PROMOTE: apply to local now; human promotes to prod when coordinating tracks.
CREATE TABLE IF NOT EXISTS co2_activity_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worksheet_instance_id uuid REFERENCES worksheet_instances(id) ON DELETE SET NULL,
  scope text NOT NULL,
  category text NOT NULL,
  subcategory text,
  amount numeric NOT NULL,
  unit text NOT NULL,
  factor_uba_id text NOT NULL,
  factor_source_version text NOT NULL,
  computed_tco2e numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE co2_activity_lines ENABLE ROW LEVEL SECURITY;
-- Org-scoped via project; mirror project_parameters policy pattern.
DROP POLICY IF EXISTS "co2_activity_lines_all_org" ON co2_activity_lines;
CREATE POLICY "co2_activity_lines_all_org" ON co2_activity_lines
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM projects))
  WITH CHECK (project_id IN (SELECT id FROM projects));
```
(Implementer: confirm the exact `project_parameters` RLS policy in `supabase/migrations/*rls*.sql` and mirror its org-scoping expression precisely.)

- [ ] **Step 3: Write the apply-local helper** (`scripts/co2/_apply-local-migration.ts`)

```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const url = process.env.DATABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url)) { console.error('SAFETY: not local — refusing'); process.exit(1); }
const file = process.argv[2];
const sql = postgres(url, { prepare: false });
await sql.unsafe(readFileSync(file, 'utf8'));
console.log('applied locally:', file);
await sql.end();
```

- [ ] **Step 4: Write the failing smoke test** (`src/lib/db/__tests__/co2-activity-lines-schema.test.ts`)

```typescript
// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { co2ActivityLines } from '@/lib/db/schema';

describe('co2_activity_lines schema', () => {
  it('is queryable with the expected columns', async () => {
    const rows = await db.select({
      id: co2ActivityLines.id, projectId: co2ActivityLines.projectId,
      scope: co2ActivityLines.scope, amount: co2ActivityLines.amount,
      factorUbaId: co2ActivityLines.factorUbaId, computedTco2e: co2ActivityLines.computedTco2e,
    }).from(co2ActivityLines).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
```

- [ ] **Step 5: Run RED → apply local → run GREEN**

RED: `pnpm vitest run --project integration src/lib/db/__tests__/co2-activity-lines-schema.test.ts` (fails — table/export missing).
Apply: register the test in `vitest.config.ts` (`integration.include` + `unit.exclude`); then `pnpm tsx scripts/co2/_apply-local-migration.ts supabase/migrations/<UTC>_co2_activity_lines.sql` (ensure local stack up first: `wsl -d Ubuntu supabase start`).
GREEN: re-run the test → PASS.

- [ ] **Step 6: Commit** (targeted: schema.ts, migration sql, helper, test, vitest.config.ts)

```bash
git add src/lib/db/schema.ts supabase/migrations/*_co2_activity_lines.sql scripts/co2/_apply-local-migration.ts src/lib/db/__tests__/co2-activity-lines-schema.test.ts vitest.config.ts
git commit -m "feat(co2): co2_activity_lines working table (local; prod-promote flagged)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Pure CO₂ calc module

**Files:**
- Create: `src/lib/co2/calc.ts`
- Test: `src/lib/co2/__tests__/calc.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type Co2Line = { scope: string; amount: number; kgCo2ePerUnit: number };
  export function lineCo2eTonnes(amount: number, kgCo2ePerUnit: number): number; // amount*factor/1000
  export function sumByScope(lines: Array<{ scope: string; tco2e: number }>): Record<string, number>;
  ```
  Pure — NO imports from `src/lib/eval/` or DB. Consumed by Task 4.

- [ ] **Step 1: Write failing test** (`src/lib/co2/__tests__/calc.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { lineCo2eTonnes, sumByScope } from '../calc';

describe('lineCo2eTonnes', () => {
  it('amount × factor ÷ 1000', () => {
    expect(lineCo2eTonnes(10000, 0.3716)).toBeCloseTo(3.716, 6); // 10 MWh grid elec
  });
  it('0 amount → 0', () => { expect(lineCo2eTonnes(0, 0.5)).toBe(0); });
});
describe('sumByScope', () => {
  it('groups and sums by scope', () => {
    const r = sumByScope([
      { scope: 'Scope 1', tco2e: 2 }, { scope: 'Scope 1', tco2e: 3 }, { scope: 'Scope 2', tco2e: 5 },
    ]);
    expect(r['Scope 1']).toBeCloseTo(5, 9);
    expect(r['Scope 2']).toBeCloseTo(5, 9);
  });
});
```

- [ ] **Step 2: Run RED**

`pnpm vitest run --project unit src/lib/co2/__tests__/calc.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `calc.ts`**

```typescript
/** Pure CO₂ math. KOSTRA discipline: no imports from src/lib/eval/ and no DB. */
export type Co2Line = { scope: string; amount: number; kgCo2ePerUnit: number };

export function lineCo2eTonnes(amount: number, kgCo2ePerUnit: number): number {
  return (amount * kgCo2ePerUnit) / 1000;
}

export function sumByScope(lines: Array<{ scope: string; tco2e: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) out[l.scope] = (out[l.scope] ?? 0) + l.tco2e;
  return out;
}
```

- [ ] **Step 4: Run GREEN**

`pnpm vitest run --project unit src/lib/co2/__tests__/calc.test.ts` → PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/co2/calc.ts src/lib/co2/__tests__/calc.test.ts
git commit -m "feat(co2): pure CO2 calc (amount*factor/1000, sum by scope)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Emission-factor resolver

**Files:**
- Create: `src/lib/co2/emission-factors.ts`
- Test: `src/lib/co2/__tests__/emission-factors.integration.test.ts`

**Interfaces:**
- Consumes: `emissionFactors` table (Plan 1, seeded).
- Produces:
  ```typescript
  export type ResolvedFactor = { ubaId: string; sourceVersion: string; scope: string; category: string; unit: string; kgCo2e: number };
  export async function resolveFactor(db: Database, ubaId: string, sourceVersion: string): Promise<ResolvedFactor | null>;
  ```
  `kgCo2e` parsed to `number`. Consumed by Task 4.

- [ ] **Step 1: Write failing integration test**

```typescript
// @vitest-environment node
import '../../db/__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { resolveFactor } from '../emission-factors';

describe('resolveFactor (local seeded factors)', () => {
  it('resolves the German grid electricity factor', async () => {
    const f = await resolveFactor(db, '05_20_01_001_01', 'v2.1');
    expect(f).not.toBeNull();
    expect(f!.scope).toContain('Scope 2');
    expect(f!.unit).toBe('kWh');
    expect(f!.kgCo2e).toBeGreaterThan(0.3);
    expect(f!.kgCo2e).toBeLessThan(0.5);
    expect(typeof f!.kgCo2e).toBe('number');
  });
  it('returns null for an unknown factor', async () => {
    expect(await resolveFactor(db, 'NOPE', 'v2.1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run RED**, then implement `emission-factors.ts`:

```typescript
import { and, eq } from 'drizzle-orm';
import type { Database } from '@/lib/db';
import { emissionFactors } from '@/lib/db/schema';

export type ResolvedFactor = { ubaId: string; sourceVersion: string; scope: string; category: string; unit: string; kgCo2e: number };

export async function resolveFactor(db: Database, ubaId: string, sourceVersion: string): Promise<ResolvedFactor | null> {
  const rows = await db.select().from(emissionFactors)
    .where(and(eq(emissionFactors.ubaId, ubaId), eq(emissionFactors.sourceVersion, sourceVersion))).limit(1);
  const r = rows[0];
  if (!r) return null;
  return { ubaId: r.ubaId, sourceVersion: r.sourceVersion, scope: r.scope, category: r.category, unit: r.unit, kgCo2e: Number(r.kgCo2e) };
}
```
Register the test in `vitest.config.ts` (integration include + unit exclude).

- [ ] **Step 3: Run GREEN** → PASS (2).

- [ ] **Step 4: Commit** (targeted: emission-factors.ts, test, vitest.config.ts)

```bash
git commit -m "feat(co2): emission-factor resolver against seeded emission_factors

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `recomputeB3Co2` server action — persist totals to `project_parameters` (Condition C1)

**Files:**
- Create: `src/lib/actions/co2.ts`
- Test: `src/lib/actions/__tests__/co2.integration.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3, `project_parameters` upsert pattern from `src/lib/actions/worksheet.ts`.
- Produces:
  ```typescript
  export type Co2Totals = { scope1: number; scope2Location: number; totalLocation: number; lineCount: number };
  export async function recomputeB3Co2(projectId: string, worksheetInstanceId: string, userId: string): Promise<Co2Totals>;
  ```
  Reads `co2_activity_lines` for the project, resolves each factor, computes per-line tCO₂e (caches into `computed_tco2e`), sums per scope, and **upserts** the output fields into `project_parameters` (`value_number`, `source_type='computed'`, `citation_sources` = per-line `{ubaId, sourceVersion, kgCo2e, amount, unit, tco2e}`).

- [ ] **Step 1: Write the failing integration test (THIS proves Condition C1)**

```typescript
// @vitest-environment node
import '../../db/__tests__/_setup-env';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { recomputeB3Co2 } from '../co2';
// Helper: create a throwaway org/project/worksheet_instance + 2 activity lines, return ids.
import { seedCo2Fixture, cleanupCo2Fixture } from './_co2-fixture';

describe('recomputeB3Co2 persists B3 totals to project_parameters (C1)', () => {
  let ctx: Awaited<ReturnType<typeof seedCo2Fixture>>;
  beforeAll(async () => { ctx = await seedCo2Fixture(db); });
  it('computes and PERSISTS Scope 1 total with provenance', async () => {
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);
    expect(totals.scope1).toBeGreaterThan(0);
    // READ BACK from the DB — proves persistence, not in-memory.
    const r = await db.execute(sql`
      select pp.value_number, pp.source_type, pp.citation_sources
      from project_parameters pp join fields f on pp.field_id = f.id
      where pp.project_id = ${ctx.projectId} and f.symbol = 'GrossScope1GreenhouseGasEmissions'`);
    const row = (r as any)[0];
    expect(Number(row.value_number)).toBeCloseTo(totals.scope1, 6);
    expect(row.source_type).toBe('computed');
    expect(Array.isArray(row.citation_sources)).toBe(true);
    expect(row.citation_sources.length).toBeGreaterThan(0);
    expect(row.citation_sources[0]).toHaveProperty('ubaId');
  });
  // (cleanup in afterAll via cleanupCo2Fixture)
});
```
The fixture helper `_co2-fixture.ts` inserts a throwaway org, project, the VSME standard link, a worksheet_instance for the GHG worksheet, and two `co2_activity_lines` (one Scope 1 `Stationäre Verbrennung`, one Scope 2 `Strom` with `factor_uba_id='05_20_01_001_01', factor_source_version='v2.1'`), and cleans them up after. (Implementer: write it to insert the minimal rows the action needs, resolving the `GrossScope1GreenhouseGasEmissions` field id by symbol; delete all inserted rows in cleanup.)

- [ ] **Step 2: Run RED** → FAIL (`recomputeB3Co2` missing).

- [ ] **Step 3: Implement `co2.ts`**

Read activity lines → for each, `resolveFactor` → `lineCo2eTonnes` → update `computed_tco2e`. `sumByScope`. Map scope totals to output field symbols (resolve field ids by symbol within the VSME standard): `GrossScope1GreenhouseGasEmissions ← scope1`, `GrossLocationBasedScope2GreenhouseGasEmissions ← scope2`, `TotalGrossLocationBasedScope1AndScope2GHGEmissions ← scope1+scope2`. Upsert each into `project_parameters` in one transaction, mirroring `saveWorksheet`'s `onConflictDoUpdate` on `(project_id, field_id)` but with `source_type: 'computed'` and `citation_sources: <per-line citations json>`. Return `Co2Totals`. (Full code: the implementer follows the `saveWorksheet` upsert shape in `src/lib/actions/worksheet.ts` lines ~180–226 — value in `value_number`, plus the two new columns.)

- [ ] **Step 4: Run GREEN** → PASS (the read-back assertions prove C1).

- [ ] **Step 5: Commit** (targeted: co2.ts, test, fixture, vitest.config.ts)

```bash
git commit -m "feat(co2): recomputeB3Co2 persists Scope 1&2 totals to project_parameters with provenance (C1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 🚩 Held prod items (human runs, not the agent)

1. **`co2_activity_lines` migration** → promote to prod (Task 1 SQL).
2. **`emission_factors` RLS policy** (`supabase/migrations/20260625161000_...`) → promote to prod before the engine runs against prod (existing Task #10).
3. **Plan-2 remediation:** re-map `GrossScope*GreenhouseGasEmissions` from C03 → B03 + retag `ekowai_env` (verify pass).
4. **Market-based Scope 2 + energy-total aggregation** → deferred (need supplier-specific factors / a formula equation).

## Self-Review

- **Spec §5 coverage:** lookup-not-formula resolver = Task 3; `tCO₂e = amount×factor÷1000` = Task 2; per-figure citation + persistence to `project_parameters` = Task 4 (Condition C1 proven by DB read-back); KOSTRA discipline (no eval import) = Task 2 constraint; activity working layer = Task 1. Scope handling (Scope 1 + 2 location) covered; market-based + energy-aggregation flagged as deferred. ✅
- **Condition C1:** Task 4's test reads `project_parameters` back and asserts `value_number` + `source_type='computed'` + non-empty `citation_sources` — it cannot pass on an in-memory-only write. ✅
- **Prod safety:** every DDL is local-only via the safety-guarded `_apply-local-migration.ts` (refuses non-local URL); all prod promotions are flagged for the human. ✅
- **Placeholders:** calc + resolver + schema + migration + safety helper are complete code; Task 4's action body references the exact `saveWorksheet` upsert lines to mirror (not a placeholder — a concrete pattern with the two added columns) and the fixture is specified by its inserts/cleanup. ✅
- **Type consistency:** `Co2Line`, `ResolvedFactor`, `Co2Totals`, `resolveFactor`, `recomputeB3Co2` signatures consistent across tasks; output field symbols match the seeded names verbatim. ✅
