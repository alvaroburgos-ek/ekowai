# Task P3-4 Report: Backfill Script + Planner

## Planner test counts
- Test file: `src/lib/eval/__tests__/backfill-surface-plan.test.ts`
- Tests written: 4
- Tests passed: 4 (all green)
  1. one project complete carrier → 4 rows with correct numbers (A_C≈4826.43, C_m≈0.9, A_E_ba≈5362.7, A_E_nba=0)
  2. empty carrier → 4 rows all null
  3. null carrier → 4 rows all null
  4. multiple projects → 4 rows per project, values correct per carrier

## DB connection pattern
Copied from: `scripts/smoke-plan4.ts`

Pattern used:
```ts
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
// ... use tagged template literals for queries
// ... call sql.end() in .finally()
```

The script uses raw `postgres` tagged-template SQL (not Drizzle ORM) — same as `smoke-plan4.ts`. The UPSERTs use `ON CONFLICT (project_id, field_id) DO UPDATE SET value_number = EXCLUDED.value_number, source_type = 'derived'`.

## Typecheck result
`pnpm typecheck` → exit 0, no output, no errors. Both new modules (`backfill-surface-plan.ts`, `backfill-a138-surface-materialization.ts`) typecheck cleanly. The script imports from `../src/lib/eval/backfill-surface-plan` which is included in the tsconfig glob (`**/*.ts`).

## Script NOT run
The backfill script `scripts/backfill-a138-surface-materialization.ts` was created but NOT executed. It is reserved for Runbook step 5 (prod deploy). No DB was touched.

## Commit
- Hash: `9baac6f`
- Subject: `feat(138): backfill script + planner to materialize A_C/C_m for existing projects (run at deploy)`
- Files: `scripts/backfill-a138-surface-materialization.ts`, `src/lib/eval/backfill-surface-plan.ts`, `src/lib/eval/__tests__/backfill-surface-plan.test.ts`

## Fix: entered_by NOT NULL stamping (2026-06-25)

**Problem:** `project_parameters.entered_by` is `uuid NOT NULL` with no default. The original INSERT omitted it, which would cause a NOT NULL constraint violation when inserting NEW derived rows (A_C / C_m / A_E_ba / A_E_nba are new rows for A138-07 projects).

**Approach chosen:** Handled entirely in the script — planner (`planSurfaceBackfill`) kept pure (no changes to it or its test).

**Changes made to `scripts/backfill-a138-surface-materialization.ts` only:**
1. Carrier SELECT now also fetches `entered_by`: `SELECT project_id, value_json, entered_by FROM project_parameters WHERE field_id = ${carrierId}`.
2. A `Map<string, string>` (`enteredByByProject`) is built from `projectId → entered_by` immediately after loading carrier rows.
3. Dry-run summary now prints `| entered_by=<uuid>` per project.
4. UPSERT INSERT column list extended to include `entered_by` (value: `${enteredBy}::uuid`); the DO UPDATE SET also refreshes `entered_by = EXCLUDED.entered_by` (idempotent — same user, same value).
5. A defensive `if (!enteredBy) { warn; continue; }` guard is in place (logically unreachable — every carrier row has a NOT NULL `entered_by` — but guards against future schema surprises).

**Planner / test:** No changes. `planSurfaceBackfill` and its 4-test suite are untouched.

**Typecheck:** `pnpm typecheck` → exit 0, no errors.

**Commit:** See below.

## Concerns / notes
- The `project_parameters` table has a unique constraint on `(project_id, field_id)` (confirmed via schema `uniqProjectParam` in the Drizzle definition). The UPSERT targets that constraint — idempotent on re-run.
- The script loops and issues one UPSERT per row for clarity/debuggability. For large project counts a bulk INSERT with `UNNEST` would be faster, but for the ~2-user app this is fine.
- `valueNumber` in `BackfillOutputRow` is typed `number | null`. The `postgres` driver accepts `null` directly in tagged-template literals and passes it as SQL NULL. When the carrier is empty/incomplete, `materializeSurfaceOutputs` returns null, which clears stale derived rows.
- No concern about the `numeric` vs `float8` column type: the `postgres` driver serialises JS numbers to the wire correctly for Postgres `numeric` columns.
