# Verification Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the verification data model across all six content tables, fix the data bugs, and make the per-standard "%verified" gauge honest and complete via one canonical computation.

**Architecture:** A single source-of-truth TS module defines the canonical `verification_status` vocabulary. An additive Postgres migration brings all six content tables to the same engineer-column shape, repairs the `regulation_tables` column-shift bug, and adds CHECK constraints that pin the status enum (also permanently preventing the column-shift class of bug). A DB view `standard_verification_rollup` computes per-table / per-standard verified counts; the app's library queries and verify actions are rewired to the canonical vocabulary so gauges reflect reality.

**Tech Stack:** Next.js 16, drizzle-orm 0.45, Postgres (Supabase prod `vadsmshzebefjreqcicl`), vitest 4, TypeScript 5.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-22-verification-foundation-design.md` — read it before starting.
- **Canonical done-states:** `verified_against_standard`, `verified_via_cross_reference`. Nothing else counts toward "verified."
- **Full status enum:** `verified_against_standard`, `verified_via_cross_reference`, `needs_engineer_review`, `imported_unverified`, `derived_from_structural_mapping`, `inferred_from_worksheet`. `engineer_verified` is **retired** (0 rows use it).
- **Default/initial status:** `imported_unverified`.
- **`audit_*` columns are untouched** — separate machine dimension, ignored by the rollup.
- **DB changes apply via Supabase MCP `apply_migration`** (role `postgres`, bypasses RLS). The repo's `DATABASE_URL` password is not present, so do **not** rely on `drizzle-kit migrate`. After applying, mirror column changes in `src/lib/db/schema.ts` by hand so app types stay correct.
- **Live prod safety:** every DDL step is additive (nullable/defaulted) or a guarded remap with a backup table. CHECK constraints are added only **after** the column-shift cleanup. No column drops, no type changes to existing data.
- **`verified_by_user_id` shape:** `uuid` with FK to `profiles(id) ON DELETE SET NULL` (matches `fields`/`equations`).
- **Gauge scopes:** in-worksheet gauge = `fields` + `equations` + `validation_rules` + `compliance_requirements` (worksheet-scoped); standard-level badge = all six tables.
- **Test command:** `pnpm test` (vitest `--project unit`). Pure logic is unit-tested; DB changes are verified with SQL assertion queries (run via the Supabase MCP `execute_sql`).
- **Git identity:** author every commit as Alvaro — `git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit ...`. Do **not** change repo config. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** work on the current branch `fix/pass3c-validator-manual-eval` unless told otherwise; stage only files this plan touches.

## File Structure

- `src/lib/verification/status.ts` — **new.** Canonical status vocabulary + helpers. Single import site for all status literals.
- `src/lib/verification/__tests__/status.test.ts` — **new.** Unit tests for the module.
- `src/lib/db/migrations/2026-06-22_verification-foundation.sql` — **new.** Hand-written DDL/DML for repo history (mirrors what is applied via MCP).
- `src/lib/db/schema.ts` — **modify.** Add the new columns to `complianceRequirements`, `regulationTables`, `masterPerType`.
- `src/lib/db/queries/library.ts` — **modify.** Rewire both rollup functions to canonical states; add `loadStandardCertification` + pure `summarizeCertification` helper.
- `src/lib/db/queries/__tests__/certification.test.ts` — **new.** Unit test for `summarizeCertification`.
- `src/lib/actions/verification.ts` — **modify.** Use canonical constants.
- `src/components/worksheet/verify-button.tsx` — **modify.** Use `isDone()` instead of the `engineer_verified` literal.
- `src/app/[locale]/(app)/standards/page.tsx` — **modify.** Render the standard-level certification badge.

The view `standard_verification_rollup` lives only in the DB (queried via raw SQL); it is not added to `schema.ts`.

---

### Task 1: Canonical status module

**Files:**
- Create: `src/lib/verification/status.ts`
- Test: `src/lib/verification/__tests__/status.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `VERIFICATION_STATUSES: readonly string[]` — the full enum.
  - `type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]`
  - `DONE_STATES: ReadonlySet<VerificationStatus>` — `{verified_against_standard, verified_via_cross_reference}`.
  - `DEFAULT_STATUS = 'imported_unverified'`
  - `VERIFIED = 'verified_against_standard'` (value written when an engineer confirms).
  - `isDone(status: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/verification/__tests__/status.test.ts
import { describe, it, expect } from 'vitest';
import {
  VERIFICATION_STATUSES,
  DONE_STATES,
  DEFAULT_STATUS,
  VERIFIED,
  isDone,
} from '../status';

describe('verification status vocabulary', () => {
  it('enumerates exactly the six canonical states', () => {
    expect([...VERIFICATION_STATUSES].sort()).toEqual(
      [
        'derived_from_structural_mapping',
        'imported_unverified',
        'inferred_from_worksheet',
        'needs_engineer_review',
        'verified_against_standard',
        'verified_via_cross_reference',
      ].sort(),
    );
  });

  it('does not contain the retired engineer_verified value', () => {
    expect(VERIFICATION_STATUSES).not.toContain('engineer_verified');
  });

  it('counts only the two verified_* states as done', () => {
    expect(isDone('verified_against_standard')).toBe(true);
    expect(isDone('verified_via_cross_reference')).toBe(true);
    expect(isDone('needs_engineer_review')).toBe(false);
    expect(isDone('imported_unverified')).toBe(false);
    expect(isDone('derived_from_structural_mapping')).toBe(false);
    expect(isDone('inferred_from_worksheet')).toBe(false);
    expect(isDone('engineer_verified')).toBe(false);
  });

  it('exposes sane defaults', () => {
    expect(DEFAULT_STATUS).toBe('imported_unverified');
    expect(VERIFIED).toBe('verified_against_standard');
    expect(DONE_STATES.has(VERIFIED)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/verification`
Expected: FAIL — cannot resolve `../status`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/verification/status.ts
/**
 * Canonical verification vocabulary — the single source of truth for the
 * `verification_status` column on all six content tables. The DB enforces the
 * same set via CHECK constraints (see 2026-06-22 verification-foundation migration).
 *
 * `audit_status` is a SEPARATE machine-check dimension and is intentionally not
 * modelled here.
 */
export const VERIFICATION_STATUSES = [
  'verified_against_standard',
  'verified_via_cross_reference',
  'needs_engineer_review',
  'imported_unverified',
  'derived_from_structural_mapping',
  'inferred_from_worksheet',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** States that count toward "verified" for the 100% badge. */
export const DONE_STATES: ReadonlySet<VerificationStatus> = new Set([
  'verified_against_standard',
  'verified_via_cross_reference',
]);

/** Status a freshly-imported, untouched row carries. */
export const DEFAULT_STATUS: VerificationStatus = 'imported_unverified';

/** Value written when an engineer confirms a row against the source norm. */
export const VERIFIED: VerificationStatus = 'verified_against_standard';

export function isDone(status: string): boolean {
  return DONE_STATES.has(status as VerificationStatus);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/verification`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/verification/status.ts src/lib/verification/__tests__/status.test.ts
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "feat(verification): canonical status vocabulary module

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Additive schema migration — columns + backfill

Brings `compliance_requirements`, `regulation_tables`, `master_per_type` to the same engineer-column shape and pulls `compliance_requirements` into the verification scheme. No CHECK constraints yet (Task 3 adds them after the column-shift cleanup).

**Files:**
- Create: `src/lib/db/migrations/2026-06-22_verification-foundation.sql`
- Modify: `src/lib/db/schema.ts` (the `complianceRequirements`, `regulationTables`, `masterPerType` table definitions)

**Interfaces:**
- Consumes: nothing.
- Produces: columns `verification_status`/`verified_by_user_id`/`verified_at`/`verification_note` present on all six content tables; `compliance_requirements.verification_status` backfilled to `needs_engineer_review`.

- [ ] **Step 1: Write the assertion query (the "failing test")**

Run this via Supabase MCP `execute_sql` and record the result — it documents the pre-state:

```sql
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name='compliance_requirements' AND column_name='verification_status') AS cr_has_status,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name='regulation_tables' AND column_name='verified_by_user_id') AS rt_has_verifier,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name='master_per_type' AND column_name='verified_at') AS mpt_has_verified_at;
```

Expected (pre): `0, 0, 0`.

- [ ] **Step 2: Write the migration SQL file**

```sql
-- src/lib/db/migrations/2026-06-22_verification-foundation.sql
-- Verification Foundation. Applied to prod via Supabase MCP apply_migration.
-- Part A: additive columns + backfill (Task 2). Parts B/C below in Task 3/4.

-- compliance_requirements: bring into the verification scheme.
ALTER TABLE public.compliance_requirements
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'imported_unverified',
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text;

-- All current compliance rows are unreviewed engineer work → route to the queue.
UPDATE public.compliance_requirements
  SET verification_status = 'needs_engineer_review'
  WHERE verification_status = 'imported_unverified';

-- regulation_tables: add the missing engineer columns (status already exists).
ALTER TABLE public.regulation_tables
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text;

-- master_per_type: add the missing engineer columns (status already exists).
ALTER TABLE public.master_per_type
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text;
```

- [ ] **Step 3: Apply Part A via Supabase MCP**

Apply the three `ALTER TABLE` blocks + the `UPDATE` above using `apply_migration` with name `verification_foundation_columns`. (Send the SQL exactly as written above.)

- [ ] **Step 4: Run the assertion query to verify it passes**

Re-run the Step 1 query. Expected (post): `1, 1, 1`.
Then verify the backfill:

```sql
SELECT verification_status, count(*) FROM compliance_requirements GROUP BY 1 ORDER BY 1;
```

Expected: a single row `needs_engineer_review | 1456`.

- [ ] **Step 5: Mirror the columns in `schema.ts`**

In `src/lib/db/schema.ts`, add to the `complianceRequirements` table definition:

```ts
    verificationStatus: text('verification_status').notNull().default('imported_unverified'),
    verifiedByUserId: uuid('verified_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
```

Add to the `regulationTables` table definition (it already has `verificationStatus`):

```ts
    verifiedByUserId: uuid('verified_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
```

Add to the `masterPerType` table definition (it already has `verificationStatus`):

```ts
    verifiedByUserId: uuid('verified_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/migrations/2026-06-22_verification-foundation.sql src/lib/db/schema.ts
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "feat(db): add unified verification columns to remaining content tables

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Column-shift fix + CHECK constraints

Repairs the 28 `regulation_tables` rows where a verbatim quote leaked into `verification_status`, then locks every content table's status to the enum.

**Files:**
- Modify: `src/lib/db/migrations/2026-06-22_verification-foundation.sql` (append Part B)

**Interfaces:**
- Consumes: the columns from Task 2.
- Produces: zero leaked-quote rows; CHECK constraint `*_verification_status_check` on all six tables.

- [ ] **Step 1: Write the assertion query (pre-state)**

Run via MCP `execute_sql`:

```sql
SELECT count(*) AS leaked
FROM regulation_tables
WHERE verification_status NOT IN (
  'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
  'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet');
```

Expected (pre): `28`.

- [ ] **Step 2: Append the fix SQL to the migration file**

```sql
-- Part B: regulation_tables column-shift fix + CHECK constraints (Task 3).

-- Back up the affected rows before touching them.
CREATE TABLE IF NOT EXISTS public._backup_regtables_colshift_20260622 AS
SELECT * FROM public.regulation_tables
WHERE verification_status NOT IN (
  'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
  'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet');

-- Move the leaked verbatim string into source_quote when that column is empty,
-- then reset the status to the review queue.
UPDATE public.regulation_tables
SET source_quote = COALESCE(NULLIF(source_quote, ''), verification_status),
    verification_status = 'needs_engineer_review'
WHERE verification_status NOT IN (
  'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
  'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet');

-- Lock every content table's status to the canonical enum. Added only after the
-- cleanup above so no existing row violates the constraint.
ALTER TABLE public.fields
  ADD CONSTRAINT fields_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
ALTER TABLE public.equations
  ADD CONSTRAINT equations_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
ALTER TABLE public.validation_rules
  ADD CONSTRAINT validation_rules_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
ALTER TABLE public.regulation_tables
  ADD CONSTRAINT regulation_tables_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
ALTER TABLE public.master_per_type
  ADD CONSTRAINT master_per_type_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
ALTER TABLE public.compliance_requirements
  ADD CONSTRAINT compliance_requirements_verification_status_check CHECK (verification_status IN (
    'verified_against_standard','verified_via_cross_reference','needs_engineer_review',
    'imported_unverified','derived_from_structural_mapping','inferred_from_worksheet'));
```

- [ ] **Step 3: Apply Part B via Supabase MCP**

Apply the Part B SQL using `apply_migration` name `verification_foundation_colshift_and_checks`.

- [ ] **Step 4: Run assertions to verify it passes**

Re-run the Step 1 leaked-count query. Expected (post): `0`.
Confirm the backup captured 28 rows:

```sql
SELECT count(*) FROM _backup_regtables_colshift_20260622;
```

Expected: `28`.
Confirm the constraint rejects a bad value (this should ERROR):

```sql
UPDATE master_per_type SET verification_status = 'engineer_verified'
WHERE id = (SELECT id FROM master_per_type LIMIT 1);
```

Expected: ERROR `violates check constraint "master_per_type_verification_status_check"`. (No row is changed.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/migrations/2026-06-22_verification-foundation.sql
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "fix(db): repair regulation_tables column-shift + enforce status enum

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `standard_verification_rollup` view

The single canonical computation of per-table / per-standard verified counts.

**Files:**
- Modify: `src/lib/db/migrations/2026-06-22_verification-foundation.sql` (append Part C)

**Interfaces:**
- Consumes: all six tables with the canonical status enum.
- Produces: view `standard_verification_rollup` with columns
  `standard_id uuid, version text, content_table text, total int, verified int`.
  One row per (standard, version, content_table). Consumers compute pct / aggregates / `is_certified` in SQL or TS.

- [ ] **Step 1: Write the reconciliation assertion (pre-state)**

Run via MCP `execute_sql` — capture the ground-truth verified count for A-138-1 fields under the canonical definition:

```sql
SELECT count(*) FILTER (WHERE f.active AND f.verification_status IN
         ('verified_against_standard','verified_via_cross_reference')) AS field_verified,
       count(*) FILTER (WHERE f.active) AS field_total
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1';
```

Record the numbers (expected ≈ `105 / 245`).

- [ ] **Step 2: Append the view SQL to the migration file**

```sql
-- Part C: canonical rollup view (Task 4).
CREATE OR REPLACE VIEW public.standard_verification_rollup AS
WITH done AS (
  SELECT unnest(ARRAY['verified_against_standard','verified_via_cross_reference']) AS s
)
SELECT s.id AS standard_id, s.version, 'fields'::text AS content_table,
       count(f.*) FILTER (WHERE f.active)::int AS total,
       count(f.*) FILTER (WHERE f.active AND f.verification_status IN (SELECT s FROM done))::int AS verified
FROM standards s
LEFT JOIN worksheet_templates wt ON wt.standard_id = s.id
LEFT JOIN fields f ON f.worksheet_template_id = wt.id
GROUP BY s.id, s.version
UNION ALL
SELECT s.id, s.version, 'equations',
       count(eq.*)::int,
       count(eq.*) FILTER (WHERE eq.verification_status IN (SELECT s FROM done))::int
FROM standards s
LEFT JOIN worksheet_templates wt ON wt.standard_id = s.id
LEFT JOIN equations eq ON eq.worksheet_template_id = wt.id
GROUP BY s.id, s.version
UNION ALL
SELECT s.id, s.version, 'validation_rules',
       count(vr.*)::int,
       count(vr.*) FILTER (WHERE vr.verification_status IN (SELECT s FROM done))::int
FROM standards s
LEFT JOIN validation_rules vr ON vr.standard_id = s.id
GROUP BY s.id, s.version
UNION ALL
SELECT s.id, s.version, 'compliance_requirements',
       count(cr.*)::int,
       count(cr.*) FILTER (WHERE cr.verification_status IN (SELECT s FROM done))::int
FROM standards s
LEFT JOIN worksheet_templates wt ON wt.standard_id = s.id
LEFT JOIN compliance_requirements cr ON cr.worksheet_template_id = wt.id
GROUP BY s.id, s.version
UNION ALL
SELECT s.id, s.version, 'regulation_tables',
       count(rt.*)::int,
       count(rt.*) FILTER (WHERE rt.verification_status IN (SELECT s FROM done))::int
FROM standards s
LEFT JOIN regulation_tables rt ON rt.standard_id = s.id
GROUP BY s.id, s.version
UNION ALL
SELECT s.id, s.version, 'master_per_type',
       count(mpt.*)::int,
       count(mpt.*) FILTER (WHERE mpt.verification_status IN (SELECT s FROM done))::int
FROM standards s
LEFT JOIN master_per_type mpt ON mpt.standard_id = s.id
GROUP BY s.id, s.version;
```

- [ ] **Step 3: Apply Part C via Supabase MCP**

Apply using `apply_migration` name `verification_foundation_rollup_view`.

- [ ] **Step 4: Reconcile to verify it passes**

```sql
SELECT content_table, total, verified
FROM standard_verification_rollup r
JOIN standards s ON s.id = r.standard_id
WHERE s.code = 'DWA-A-138-1'
ORDER BY content_table;
```

Expected: the `fields` row's `total`/`verified` match the Step 1 numbers exactly; six rows returned (one per table).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/migrations/2026-06-22_verification-foundation.sql
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "feat(db): standard_verification_rollup view (six-table canonical %verified)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Rewire `library.ts` to canonical states + certification query

Makes the existing gauges honest (canonical done-states, worksheet-scoped four tables) and adds a standard-level certification summary from the view.

**Files:**
- Modify: `src/lib/db/queries/library.ts`
- Test: `src/lib/db/queries/__tests__/certification.test.ts` (new)

**Interfaces:**
- Consumes: `isDone`/`DONE_STATES` from `@/lib/verification/status`; the `standard_verification_rollup` view.
- Produces:
  - `summarizeCertification(rows: RollupRow[]): { byTable: Record<string, {total:number;verified:number;pct:number}>; total: number; verified: number; pct: number; isCertified: boolean }` (pure).
  - `loadStandardCertification(standardId: string): Promise<ReturnType<typeof summarizeCertification>>`.
  - `StandardProgress` gains `certifiedPct: number` and `isCertified: boolean`.

- [ ] **Step 1: Write the failing test for the pure summarizer**

```ts
// src/lib/db/queries/__tests__/certification.test.ts
import { describe, it, expect } from 'vitest';
import { summarizeCertification, type RollupRow } from '../library';

const rows: RollupRow[] = [
  { content_table: 'fields', total: 10, verified: 10 },
  { content_table: 'equations', total: 4, verified: 4 },
  { content_table: 'validation_rules', total: 2, verified: 1 },
  { content_table: 'compliance_requirements', total: 0, verified: 0 },
  { content_table: 'regulation_tables', total: 5, verified: 5 },
  { content_table: 'master_per_type', total: 3, verified: 3 },
];

describe('summarizeCertification', () => {
  it('aggregates totals and computes pct', () => {
    const r = summarizeCertification(rows);
    expect(r.total).toBe(24);
    expect(r.verified).toBe(23);
    expect(r.pct).toBe(96); // round(23/24*100)
  });

  it('is certified only when every non-empty table is 100%', () => {
    expect(summarizeCertification(rows).isCertified).toBe(false); // validation_rules 1/2
    const allDone = rows.map((x) => ({ ...x, verified: x.total }));
    expect(summarizeCertification(allDone).isCertified).toBe(true);
  });

  it('treats an empty table (total 0) as vacuously complete', () => {
    const onlyEmpty: RollupRow[] = [{ content_table: 'fields', total: 0, verified: 0 }];
    const r = summarizeCertification(onlyEmpty);
    expect(r.pct).toBe(100);
    expect(r.isCertified).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/db/queries`
Expected: FAIL — `summarizeCertification` / `RollupRow` not exported.

- [ ] **Step 3: Implement the summarizer + query, and rewire the rollups**

In `src/lib/db/queries/library.ts`:

(a) Add the import at the top:

```ts
import { DONE_STATES } from '@/lib/verification/status';
```

(b) Replace the two occurrences of the literal filter
`verification_status = 'engineer_verified'` (lines ~44, ~46, ~132, ~134) so both
`field_verified` and `equation_verified` use the canonical done-states. The done-state
list is interpolated as a SQL fragment built from `DONE_STATES`:

```ts
// Build once near the top of the module (after imports):
const DONE_SQL = sql.join(
  [...DONE_STATES].map((s) => sql`${s}`),
  sql`, `,
);
```

Then in `loadStandardsProgress` the two FILTER lines become:

```ts
      COUNT(DISTINCT f.id) FILTER (WHERE f.active AND f.verification_status IN (${DONE_SQL}))::int AS field_verified,
      ...
      COUNT(DISTINCT eq.id) FILTER (WHERE eq.verification_status IN (${DONE_SQL}))::int           AS equation_verified,
```

Apply the identical replacement to the two FILTER lines in `loadWorksheetsProgress`.

(c) Add the pure summarizer + the loader at the end of the file:

```ts
export type RollupRow = { content_table: string; total: number; verified: number };

export type CertificationSummary = {
  byTable: Record<string, { total: number; verified: number; pct: number }>;
  total: number;
  verified: number;
  pct: number;
  isCertified: boolean;
};

function pct(verified: number, total: number): number {
  return total === 0 ? 100 : Math.round((verified / total) * 100);
}

/** Pure aggregation of rollup rows into a certification summary. A table with
 * total 0 is vacuously complete; isCertified requires every table at 100%. */
export function summarizeCertification(rows: RollupRow[]): CertificationSummary {
  const byTable: CertificationSummary['byTable'] = {};
  let total = 0;
  let verified = 0;
  let isCertified = true;
  for (const r of rows) {
    byTable[r.content_table] = { total: r.total, verified: r.verified, pct: pct(r.verified, r.total) };
    total += r.total;
    verified += r.verified;
    if (r.total > 0 && r.verified < r.total) isCertified = false;
  }
  return { byTable, total, verified, pct: pct(verified, total), isCertified };
}

/** Six-table certification summary for one standard, from the canonical view. */
export async function loadStandardCertification(standardId: string): Promise<CertificationSummary> {
  const rows = await db.execute<RollupRow>(sql`
    SELECT content_table, total, verified
    FROM standard_verification_rollup
    WHERE standard_id = ${standardId}
  `);
  const arr: RollupRow[] = Array.isArray(rows)
    ? (rows as RollupRow[])
    : ((rows as { rows?: RollupRow[] }).rows ?? []);
  return summarizeCertification(arr.map((r) => ({
    content_table: r.content_table,
    total: Number(r.total),
    verified: Number(r.verified),
  })));
}
```

(d) Extend `loadStandardsProgress` to include the six-table badge fields. Replace its
single SQL query with one that LEFT JOINs the view aggregate, and add `certifiedPct` +
`isCertified` to the `StandardProgress` type and the mapped return object:

```ts
// Add to the StandardProgress type:
  certifiedPct: number;
  isCertified: boolean;
```

```ts
// Add this CTE-join to the SELECT in loadStandardsProgress (after the existing
// FROM/JOIN block, before GROUP BY is not possible with the view aggregate, so
// compute it in a subselect per standard):
      , COALESCE((
          SELECT bool_and(r.verified >= r.total)
          FROM standard_verification_rollup r WHERE r.standard_id = s.id
        ), true) AS is_certified
      , COALESCE((
          SELECT round(100.0 * sum(r.verified) / NULLIF(sum(r.total), 0))
          FROM standard_verification_rollup r WHERE r.standard_id = s.id
        ), 100) AS certified_pct
```

Map them in the returned object:

```ts
    certifiedPct: Number(r.certified_pct),
    isCertified: r.is_certified === true || r.is_certified === 't',
```

(and add `is_certified` / `certified_pct` to the inline row types in the function).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/db/queries`
Expected: PASS (3 tests).
Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 5: Reconcile the live gauge against the view**

Via MCP `execute_sql`, confirm `loadStandardsProgress`'s field/equation counts now match the
view for one standard (e.g. compare A-138-1 `field_verified` to the view's `fields.verified`).
Expected: equal.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/queries/library.ts src/lib/db/queries/__tests__/certification.test.ts
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "feat(library): canonical done-states + six-table certification summary

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Rewire verify actions, button, and standards badge

Switches the write path to the canonical value and surfaces the honest standard-level badge.

**Files:**
- Modify: `src/lib/actions/verification.ts`
- Modify: `src/components/worksheet/verify-button.tsx`
- Modify: `src/app/[locale]/(app)/standards/page.tsx`

**Interfaces:**
- Consumes: `VERIFIED`, `DEFAULT_STATUS`, `isDone` from `@/lib/verification/status`; `StandardProgress.certifiedPct`/`isCertified`.
- Produces: verify actions write `verified_against_standard`; button reflects any done-state; standards list shows a certification badge.

- [ ] **Step 1: Rewire `verification.ts` constants**

Replace lines 15-16:

```ts
import { VERIFIED, DEFAULT_STATUS } from '@/lib/verification/status';
```

and delete the local `const VERIFIED = 'engineer_verified';` / `const UNVERIFIED = 'imported_unverified';`. Replace every later use of `UNVERIFIED` with `DEFAULT_STATUS`. (The `VERIFIED` references already match the imported name; the bulk action's `ne(fields.verificationStatus, VERIFIED)` is correct as-is.)

- [ ] **Step 2: Rewire `verify-button.tsx`**

Replace line 39:

```ts
import { isDone } from '@/lib/verification/status';
// ...
  const isVerified = isDone(status);
```

- [ ] **Step 3: Add the certification badge to `standards/page.tsx`**

After the existing field/equation/compliance cells (around line 103), the page already maps
`standards`. Render a badge using the new fields. Add a header cell `Zertifiziert` to the
`<thead>` row, and this cell to the `<tbody>` row:

```tsx
                    <td className="py-3.5 px-4 text-right">
                      {s.isCertified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          ✓ 100% ({s.version})
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono tabular-nums text-subtext">
                          {s.certifiedPct}%
                        </span>
                      )}
                    </td>
```

- [ ] **Step 4: Verify the whole build**

Run: `pnpm test`
Expected: all unit tests pass.
Run: `pnpm typecheck && pnpm lint`
Expected: clean.
Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run `pnpm dev`, open `/standards` as a platform engineer. Confirm: field/equation gauges show
the honest (lower) numbers; the new `Zertifiziert` column shows per-standard % / 100% badge;
verifying a single field still works and its gauge updates.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/verification.ts src/components/worksheet/verify-button.tsx "src/app/[locale]/(app)/standards/page.tsx"
git -c user.name="Alvaro" -c user.email="alvaro.burgos@ekowai.com" commit -m "feat(verification): write canonical status + standards certification badge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §Component A (canonical enum + CHECK) → Task 1 (module) + Task 3 (CHECK constraints). ✓
- §Component B (audit_* untouched) → enforced as a Global Constraint; no task modifies audit_*. ✓
- §Component C (schema completion) → Task 2. ✓
- §Component D (column-shift fix) → Task 3. ✓
- §Component E (rollup view + two gauge scopes) → Task 4 (view) + Task 5 (worksheet-scoped counts, standard aggregate). ✓
- §Component F (wire app) → Task 5 (library) + Task 6 (actions/button/page). ✓
- §Testing (reconcile A-138-1, enum assertions, no engineer_verified) → Task 2/3/4/5 assertion steps. ✓

**Placeholder scan:** No TBD/TODO; all code/SQL is concrete. The optional manual smoke (Task 6 Step 5) is explicitly optional, not a gap.

**Type consistency:** `RollupRow`, `CertificationSummary`, `summarizeCertification`, `loadStandardCertification`, `VERIFIED`, `DEFAULT_STATUS`, `DONE_STATES`, `isDone` are defined once and referenced with the same names/shapes across Tasks 1/5/6. `StandardProgress` additions (`certifiedPct`, `isCertified`) are produced in Task 5 and consumed in Task 6.

**Note for the implementer:** Drizzle's `db.execute` return shape varies (array vs `{rows}`) — the existing `library.ts` already normalizes this; reuse that pattern (shown in `loadStandardCertification`).
