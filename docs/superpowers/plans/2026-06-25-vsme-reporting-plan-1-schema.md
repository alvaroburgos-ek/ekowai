# VSME Reporting — Plan 1: Schema Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three data-model changes VSME needs (`fields.owner`, `fields.xbrl_element_id`, and the `emission_factors` reference table) plus the `isVsmeReport` detection helper — the foundation every later plan builds on.

**Architecture:** Approach C — reuse the existing engine, add only what VSME requires. Schema changes go through Drizzle (`src/lib/db/schema.ts` → `drizzle-kit generate` → `drizzle-kit migrate`). Each change is proven by a node-env integration smoke test mirroring `calculation-snapshots-schema.test.ts`.

**Tech Stack:** TypeScript, Drizzle ORM, drizzle-kit, Postgres (Supabase), vitest (projects: `unit` happy-dom, `integration` node/DB-backed), pnpm.

**Source spec:** `docs/superpowers/specs/2026-06-25-vsme-reporting-design.md` (APPROVED, conditions C1–C3 in §11).

## Global Constraints

- **Package manager:** `pnpm` (do not use npm/yarn).
- **Migration workflow:** edit `src/lib/db/schema.ts`, then `pnpm db:generate` (writes to `src/lib/db/migrations`), then `pnpm db:migrate`. **Task 1, Step 0 first confirms** whether this repo applies schema via drizzle-kit migrations OR via `supabase/migrations` raw SQL; if the latter is authoritative, mirror each generated statement into a new timestamped `supabase/migrations/*.sql` file as the existing tables do.
- **Verification status convention:** new rows default `verification_status='imported_unverified'`; only the verify action flips to `engineer_verified`.
- **Schema smoke tests:** node env, live in `src/lib/db/__tests__/`, import `./_setup-env`, run under the `integration` project, gated on a real `DATABASE_URL`.
- **Test command (integration):** `pnpm vitest run --project integration <file>`.
- **Drizzle camelCase ↔ snake_case:** TS property camelCase, DB column snake_case (e.g. `xbrlElementId` → `xbrl_element_id`), matching existing schema.ts style.
- **Git (condition C2):** before the first commit, set `git config user.email "alvaro.burgos@ekowai.com"` and `git config user.name "Alvaro"`, and create a feature branch off `main` (`git switch -c feat/vsme-schema-foundation`). Never commit under `gmx.net`.

---

### Task 1: Add `owner` and `xbrl_element_id` to `fields`

**Files:**
- Modify: `src/lib/db/schema.ts` (the `fields` pgTable, around line 148–178)
- Generate: `src/lib/db/migrations/<new>.sql` (via `pnpm db:generate`)
- Test: `src/lib/db/__tests__/fields-vsme-columns-schema.test.ts`

**Interfaces:**
- Consumes: existing `fields` table.
- Produces: `fields.owner` (text, nullable, values `ekowai_env | client_supplied | general`), `fields.xbrlElementId` (`xbrl_element_id` text, nullable). Later plans (seeders, Worklist UI) read/write these.

- [ ] **Step 0: Confirm migration authority**

Run: `pnpm db:migrate --help` and inspect `ls src/lib/db/migrations` vs `ls supabase/migrations`. Determine which directory holds the applied migrations. Record the answer in the commit message. (If `supabase/migrations` is authoritative, every generate step below is followed by mirroring the SQL into a new `supabase/migrations/<timestamp>_<name>.sql`.)

- [ ] **Step 1: Write the failing smoke test**

```typescript
// src/lib/db/__tests__/fields-vsme-columns-schema.test.ts
// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { fields } from '@/lib/db/schema';

describe('fields VSME columns', () => {
  it('exposes owner and xbrlElementId columns', async () => {
    const rows = await db
      .select({
        id: fields.id,
        owner: fields.owner,
        xbrlElementId: fields.xbrlElementId,
      })
      .from(fields)
      .limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/fields-vsme-columns-schema.test.ts`
Expected: FAIL — `fields.owner` / `fields.xbrlElementId` do not exist on the Drizzle object (TS error or runtime column-missing).

- [ ] **Step 3: Add the columns to schema.ts**

In the `fields` pgTable object, after the `active` column, add:

```typescript
    /** VSME owner boundary: which side produces this datapoint.
     * Seeded by module default (B3–B7 → ekowai_env, B8–B11 → client_supplied,
     * B1/B2 → general) and editable per-field in the Worklist. Nullable so
     * non-VSME engineering fields stay untouched. */
    owner: text('owner'),
    /** VSME XBRL element id from the EFRAG taxonomy, used by the export
     * mapping. Nullable; only populated for VSME fields. */
    xbrlElementId: text('xbrl_element_id'),
```

- [ ] **Step 4: Generate and apply the migration**

Run: `pnpm db:generate` then `pnpm db:migrate`
Expected: a new migration adds two nullable text columns; migrate succeeds. (If `supabase/migrations` is authoritative per Step 0, mirror the two `ALTER TABLE fields ADD COLUMN ...` statements into a new timestamped SQL file and apply it the way the repo applies those.)

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/fields-vsme-columns-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git config user.email "alvaro.burgos@ekowai.com" && git config user.name "Alvaro"
git switch -c feat/vsme-schema-foundation 2>/dev/null || git switch feat/vsme-schema-foundation
git add src/lib/db/schema.ts src/lib/db/migrations src/lib/db/__tests__/fields-vsme-columns-schema.test.ts
git commit -m "feat(vsme): add owner + xbrl_element_id columns to fields

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Create the `emission_factors` reference table

**Files:**
- Modify: `src/lib/db/schema.ts` (add new pgTable, near other reference tables)
- Generate: `src/lib/db/migrations/<new>.sql`
- Test: `src/lib/db/__tests__/emission-factors-schema.test.ts`

**Interfaces:**
- Produces: `emissionFactors` Drizzle table with columns `id, ubaId, scope, category, subcategory, unit, kgCo2e, kgCo2, kgCh4, kgN2o, source, sourceVersion, datasetYear, sheet`, and a `UNIQUE(uba_id, source_version)` constraint. Seeder B (Plan 2) inserts rows; the CO₂ resolver (Plan 3) reads them.

- [ ] **Step 1: Write the failing smoke test**

```typescript
// src/lib/db/__tests__/emission-factors-schema.test.ts
// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { emissionFactors } from '@/lib/db/schema';

describe('emission_factors schema', () => {
  it('is queryable and exposes the citation + value columns', async () => {
    const rows = await db
      .select({
        id: emissionFactors.id,
        ubaId: emissionFactors.ubaId,
        scope: emissionFactors.scope,
        category: emissionFactors.category,
        subcategory: emissionFactors.subcategory,
        unit: emissionFactors.unit,
        kgCo2e: emissionFactors.kgCo2e,
        sourceVersion: emissionFactors.sourceVersion,
        datasetYear: emissionFactors.datasetYear,
      })
      .from(emissionFactors)
      .limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/emission-factors-schema.test.ts`
Expected: FAIL — `emissionFactors` is not exported from schema.

- [ ] **Step 3: Add the table to schema.ts**

```typescript
export const emissionFactors = pgTable(
  'emission_factors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** UBA factor id, e.g. "05_20_01_001_01" — the citation key. */
    ubaId: text('uba_id').notNull(),
    scope: text('scope').notNull(),
    category: text('category').notNull(), // UBA Level 1, e.g. "Strom"
    subcategory: text('subcategory'), // UBA Level 2, e.g. "Deutscher Strommix"
    unit: text('unit').notNull(), // e.g. "kWh"
    kgCo2e: numeric('kg_co2e').notNull(),
    kgCo2: numeric('kg_co2'),
    kgCh4: numeric('kg_ch4'),
    kgN2o: numeric('kg_n2o'),
    source: text('source').notNull().default('UBA'),
    sourceVersion: text('source_version').notNull(),
    datasetYear: integer('dataset_year').notNull(),
    sheet: text('sheet'), // provenance: which UBA sheet
  },
  (t) => ({
    ubaIdVersionUnique: unique('emission_factors_uba_id_version_unique').on(
      t.ubaId,
      t.sourceVersion,
    ),
  }),
);
```

Ensure `numeric` and `unique` are in the `drizzle-orm/pg-core` import at the top of schema.ts (add if missing).

- [ ] **Step 4: Generate and apply the migration**

Run: `pnpm db:generate` then `pnpm db:migrate`
Expected: creates `emission_factors` with the unique constraint. (Mirror to `supabase/migrations` if authoritative, per Task 1 Step 0.)

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/emission-factors-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Add a unique-constraint test**

```typescript
// append to emission-factors-schema.test.ts
import { emissionFactors as ef } from '@/lib/db/schema';

it('rejects duplicate (uba_id, source_version)', async () => {
  const row = {
    ubaId: 'TEST_DUP_01', scope: 'Scope 2', category: 'Test', unit: 'kWh',
    kgCo2e: '0.1', sourceVersion: 'vtest', datasetYear: 2026,
  };
  await db.insert(ef).values(row);
  await expect(db.insert(ef).values(row)).rejects.toThrow();
  // cleanup
  await db.delete(ef).where(eq(ef.ubaId, 'TEST_DUP_01'));
});
```

Add `import { eq } from 'drizzle-orm';` at the top.

- [ ] **Step 7: Run both tests, verify pass**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/emission-factors-schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations src/lib/db/__tests__/emission-factors-schema.test.ts
git commit -m "feat(vsme): add emission_factors reference table with versioned unique key

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `isVsmeReport` detection helper

**Files:**
- Create: `src/lib/db/queries/is-vsme-report.ts`
- Test: `src/lib/db/__tests__/is-vsme-report.test.ts`

**Interfaces:**
- Consumes: `projectStandards` / `standards` tables (existing).
- Produces: `export async function isVsmeReport(projectId: string): Promise<boolean>` — true iff the project links the standard with code `VSME`. Used by the project shell (Plan 4) to branch the six-tab layout.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/db/__tests__/is-vsme-report.test.ts
// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { isVsmeReport } from '@/lib/db/queries/is-vsme-report';

describe('isVsmeReport', () => {
  it('returns false for a random non-existent project id', async () => {
    const result = await isVsmeReport('00000000-0000-0000-0000-000000000000');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/is-vsme-report.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```typescript
// src/lib/db/queries/is-vsme-report.ts
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectStandards, standards } from '@/lib/db/schema';

/** True iff the project links the VSME standard (code 'VSME'). */
export async function isVsmeReport(projectId: string): Promise<boolean> {
  const rows = await db
    .select({ id: projectStandards.id })
    .from(projectStandards)
    .innerJoin(standards, eq(projectStandards.standardId, standards.id))
    .where(and(eq(projectStandards.projectId, projectId), eq(standards.code, 'VSME')))
    .limit(1);
  return rows.length > 0;
}
```

Note: confirm the exact `projectStandards` column names (`standardId`, `projectId`, `standards.code`) against `schema.ts` and adjust if they differ (e.g. `standardCode`).

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm vitest run --project integration src/lib/db/__tests__/is-vsme-report.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/is-vsme-report.ts src/lib/db/__tests__/is-vsme-report.test.ts
git commit -m "feat(vsme): add isVsmeReport detection helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Roadmap — Plans 2–6 (written when Plan 1 is green)

Each is its own plan doc, each independently testable:

- **Plan 2 — Seeders.** (A) Taxonomy parser → Pass3c workbook (modules, ~140 tagged fields w/ owner + xbrl id, NACE/waste enums, completeness CRs) → extend `import-pass3c.ts` to carry `owner`+`xbrl_element_id`. (B) UBA xlsx → `emission_factors` importer. Verify count/labels against the VSME PDF. **Condition C3 note:** seeding sets `imported_unverified`.
- **Plan 3 — CO₂ engine.** Pure resolver `src/lib/co2/emission-factors.ts` (KOSTRA pattern, outside `src/lib/eval`), `tCO₂e = amount × kg_co2e ÷ 1000`, per-line citation snapshot. **Condition C1 (must-fix): a test proves B3 totals persist to `project_parameters`** before Plan 6 builds export on them.
- **Plan 4 — UX surfaces (opens with `frontend-design`/`ui-ux-pro-max` agent).** Report Overview, Worklist (owner override control), CO₂ activity table; six-tab branch via `isVsmeReport`; 2 routes + tab-branch.
- **Plan 5 — Verification.** Module-level bulk verify wired to `verification_audit`. **Condition C3 (must-fix): guard so a bulk-verify cannot flip a computed B3 figure while its factor is unverified.**
- **Plan 6 — Export.** PDF report (per-figure citations + methodology annex) + filled VSME Digital Template (xlsx), via existing `report_archives`/`pdf`. iXBRL deferred.

## Self-Review (Plan 1)

- **Spec coverage:** Plan 1 implements spec §4 additions 1–3 (owner, xbrl_element_id, emission_factors) + D2 detection helper. Remaining spec sections map to Plans 2–6 above. No §4 gap.
- **Placeholders:** none — every code/test/command step is concrete. The two "confirm against schema.ts" notes (migration authority, exact `projectStandards` column names) are explicit verification steps, not deferred work.
- **Type consistency:** `emissionFactors` column names used identically in schema (Task 2) and tests; `isVsmeReport(projectId: string): Promise<boolean>` signature consistent between Task 3 definition and the Plan 4 consumer note.
