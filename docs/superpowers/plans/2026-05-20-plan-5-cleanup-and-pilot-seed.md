# Plan 5: Cleanup + Pilot Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Note on execution order:** The spec ordered this as Plan 6 (after Reattachment). We swapped to do Cleanup first (so the build goes green earlier) and Reattachment second. The Reattachment plan becomes Plan 6.

**Goal:** Delete every A-201-specific module that the new schema made obsolete; stub out Plan-6-derived code (PDF builder, citations action, inputs-reader) so the build compiles green; seed the pilot project PLT-HS-01 with realistic Paula data so the engineer can drive the new worksheet renderer in a browser. End state: `pnpm typecheck` exits 0, `pnpm test` passes, `pnpm build` succeeds, Vercel preview can deploy.

**Architecture:** Aggressive surgical deletion of A-201 modules (engine, bundled JSONs, calculator routes + components, old server actions, old RLS tests, old scripts). For Plan-6-derived modules that depend on dropped tables (PDF loader, citations action, inputs-reader), replace the broken bodies with stubs that throw `Plan 6 reattachment pending` at runtime — the imports compile, the deferred features fail at runtime if invoked. A new `scripts/seed-pilot-project.ts` creates the canonical PLT-HS-01 project with org membership, applicable standards, and worksheet_instances ready for data entry.

**Tech Stack:** No new dependencies. Heavy use of `git rm`, edits to a handful of files, and one new seed script.

**Companion Spec:** `docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md` (Section 8 — Migration + Plan-6 Reattachment, Section 10 — MVP Done)

**Predecessors:** Plans 1–4. Same branch `feat/db-driven-schema`.

---

## Audit: What Touches Dropped Tables

A `grep` for imports of `calculations`, `decisions`, `approvals`, `calculationHistory`, `crossReferences`, `calculationMetrics` on this branch turned up 16 files. They fall into 3 categories:

### A. Delete entirely (A-201-specific, no rescue value)

```
src/lib/engine/                          (5 files: validate, evaluate, compliance, decisions, index)
src/lib/worksheets/DWA-A-201/            (entire tree — 30+ JSON files)
src/lib/state/calculator-store.ts
src/lib/actions/approval.ts
src/lib/actions/calculation.ts
src/lib/actions/decision.ts              (if present)
src/components/calculator/               (entire tree — 14 files)
src/app/[locale]/(app)/projects/[id]/calc/  (entire route tree)
scripts/import-from-ekowai-agent.ts
scripts/extract-regulation-knowledge.ts
scripts/seed-demo.ts
scripts/seed-multi-project.ts
scripts/wipe-test-data.ts
tests/rls/calculations.test.ts
tests/rls/decisions.test.ts
tests/rls/approvals.test.ts
```

### B. Stub for Plan 6 to retarget (Plan-6-derived, will come back)

```
src/lib/pdf/load-data.ts                 (stub: throw 'Plan 6 reattachment pending')
src/lib/pdf/__tests__/load-data.test.ts  (delete — will be rewritten in Plan 6)
src/lib/pdf/__tests__/build-report.test.tsx (delete)
src/lib/pdf/__tests__/document.snapshot.test.tsx (delete)
src/lib/actions/citations.ts             (stub)
src/lib/actions/__tests__/citations.test.ts (delete)
src/lib/engine/inputs-reader.ts          (stub or relocate — Plan 6 retargets)
src/lib/engine/__tests__/inputs-reader.test.ts (delete)
src/app/api/calculations/[id]/pdf/route.ts (stub: 410 Gone)
src/lib/db/queries/report-archives.ts    (stub query)
src/components/projects/reports-history.tsx (compiles but data-empty)
src/app/[locale]/(app)/projects/[id]/reports/page.tsx (compiles but empty)
```

### C. Edit in place (light cleanup)

```
src/components/layout/nav.tsx            (remove links to /calc/ if any)
src/app/api/draft-rationale/route.ts     (rip out calcId/calc context)
src/app/[locale]/(app)/projects/[id]/calc/new/page.tsx (deleted with rest of /calc/)
```

---

## File Structure (after Plan 5)

**Kept + working:**
```
src/app/[locale]/(app)/projects/[id]/
  page.tsx
  standards/                         (Plan 3)
  audit/                             (Plan 4)
  documents/                         (Plan 6 from main, kept)
  reports/                           (stub for now — Plan 6 rebuilds)
src/components/
  worksheet/                         (Plan 3 + 4)
  documents/                         (kept from Plan 6 merge)
  org/letterhead-form.tsx            (kept)
  projects/reports-history.tsx       (stub for Plan 6)
src/lib/actions/
  org.ts, project.ts, org-settings.ts, documents.ts (kept)
  project-standards.ts, worksheet.ts, worksheet-transition.ts (Plan 3+4)
  citations.ts                       (STUBBED in Plan 5, Plan 6 reattaches)
src/lib/engine/
  inputs-reader.ts                   (STUBBED in Plan 5)
src/lib/pdf/
  document.tsx, sections/*, fonts.ts, styles.ts, format.ts, build-report.tsx (kept — JSX is decoupled)
  load-data.ts                       (STUBBED in Plan 5)
src/lib/db/queries/
  documents.ts (kept), report-archives.ts (STUBBED), worksheet.ts, standards.ts, audit.ts
src/lib/state/
  worksheet-store.ts                 (Plan 3, replaces calculator-store)
scripts/
  _apply-supabase-sql.ts, _inspect-pass3c.ts, _pass3c-*.ts, _verify-pdf-fonts.ts
  import-pass3c.ts, snapshot-prod-db.sh, smoke-plan4.ts, wipe-all-data.ts
  seed-pilot-project.ts              (NEW in Plan 5)
```

---

## Task 1: Delete A-201 Engine + Bundled JSONs

**Files to delete (Category A — engine + worksheets):**

```bash
git rm -r src/lib/engine/validate.ts
git rm -r src/lib/engine/evaluate.ts
git rm -r src/lib/engine/compliance.ts
git rm -r src/lib/engine/decisions.ts
git rm -r src/lib/engine/index.ts
git rm -r src/lib/worksheets/DWA-A-201/
```

- [ ] **Step 1: Verify directory contents before delete**

```bash
ls src/lib/engine/
ls src/lib/worksheets/DWA-A-201/
```

Note: `src/lib/engine/inputs-reader.ts` and `src/lib/engine/__tests__/` are NOT deleted here — they're handled in Task 3 (stub) and Task 4 (delete tests).

- [ ] **Step 2: Delete via `git rm`**

```bash
git rm src/lib/engine/validate.ts \
       src/lib/engine/evaluate.ts \
       src/lib/engine/compliance.ts \
       src/lib/engine/decisions.ts \
       src/lib/engine/index.ts
git rm -r src/lib/worksheets/DWA-A-201/
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(cleanup): delete A-201-specific engine + bundled worksheet JSONs

src/lib/engine/{validate,evaluate,compliance,decisions,index}.ts and
all of src/lib/worksheets/DWA-A-201/. These were the runtime engine
for the 22 hand-bundled A-201 worksheets, made obsolete by the
DB-driven renderer in Plan 3.

inputs-reader.ts is kept temporarily (stubbed in Task 3) for Plan 6
reattachment of the citation-aware value reader."
```

---

## Task 2: Delete Old Calculator Routes, Components, State, Actions

**Files (Category A — calculator):**

```bash
git rm -r src/app/[locale]/\(app\)/projects/[id]/calc/
git rm -r src/components/calculator/
git rm src/lib/state/calculator-store.ts
git rm src/lib/actions/calculation.ts
git rm src/lib/actions/approval.ts
git rm src/lib/actions/decision.ts 2>/dev/null || true  # may not exist
```

- [ ] **Step 1: Verify contents before delete**

```bash
ls src/components/calculator/
ls src/app/[locale]/\(app\)/projects/[id]/calc/
```

- [ ] **Step 2: Delete via `git rm`**

```bash
git rm -r src/app/[locale]/\(app\)/projects/[id]/calc/
git rm -r src/components/calculator/
git rm src/lib/state/calculator-store.ts
git rm src/lib/actions/calculation.ts
git rm src/lib/actions/approval.ts
# Check for decision.ts:
ls src/lib/actions/decision.ts 2>/dev/null && git rm src/lib/actions/decision.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(cleanup): delete old calculator routes + components + actions

- src/app/[locale]/(app)/projects/[id]/calc/ — old /calc/[calcId] routes
- src/components/calculator/ — 14 components (calculator-shell, input-field,
  calculations-list, decision-modal, compliance-badge, results-panel,
  status-banner, save-status, submit-button, worksheet-picker, etc.)
- src/lib/state/calculator-store.ts — replaced by worksheet-store
- src/lib/actions/{calculation,approval,decision}.ts — replaced by
  worksheet-transition + saveWorksheet + project-standards actions

Replaced by the new worksheet routes and components from Plans 3+4."
```

---

## Task 3: Delete Old Scripts + Stub Plan-6-Derived Modules

**Files to delete (Category A — scripts):**

```bash
git rm scripts/import-from-ekowai-agent.ts
git rm scripts/extract-regulation-knowledge.ts
git rm scripts/seed-demo.ts
git rm scripts/seed-multi-project.ts 2>/dev/null || true  # may have been part of design-overhaul on main
git rm scripts/wipe-test-data.ts
```

**Files to stub (Category B — Plan 6 will retarget):**

- [ ] **Step 1: Delete old scripts**

```bash
git rm scripts/import-from-ekowai-agent.ts
git rm scripts/extract-regulation-knowledge.ts
git rm scripts/seed-demo.ts
git rm scripts/wipe-test-data.ts
ls scripts/seed-multi-project.ts 2>/dev/null && git rm scripts/seed-multi-project.ts
```

- [ ] **Step 2: Stub `src/lib/pdf/load-data.ts`**

Overwrite the file:

```typescript
/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * In Plans 1-4 the old calculations/decisions/approvals tables were
 * dropped. This loader needs to be rewritten against the new schema:
 *   worksheet_instances + project_parameters + approval_events.
 *
 * Until Plan 6 retargets it, calling loadProjectReportData throws.
 * The PDF JSX components in src/lib/pdf/document.tsx and sections/*
 * are kept intact because they only consume the shape this loader
 * returns — they don't reference dropped tables directly.
 */

export type ReportData = {
  // Plan 6 fills in the real shape — for now keep an empty placeholder
  // so build-report.tsx still typechecks.
  project: { id: string; name: string };
  parameters: Array<unknown>;
  approvals: Array<unknown>;
};

export async function loadCalculationData(_calcId: string): Promise<ReportData> {
  throw new Error('PDF generation pending Plan 6 reattachment to new schema');
}

export async function loadProjectReportData(_projectId: string): Promise<ReportData> {
  throw new Error('PDF generation pending Plan 6 reattachment to new schema');
}
```

- [ ] **Step 3: Stub `src/lib/actions/citations.ts`**

Overwrite:

```typescript
'use server';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * The citation flow originally attached source pointers to
 * calculations.inputs[symbol].source (JSONB on the now-dropped
 * calculations table). Plan 6 retargets to
 * project_parameters.citation_source.
 *
 * Until then, the UI (<SourceBadge>, <CitationPicker>) still renders
 * but its server actions are no-ops that return an error.
 */

export type CitationSource = {
  docId: string;
  page?: number;
  note?: string;
};

export async function attachCitation(
  _input: { calcId: string; symbol: string; source: CitationSource },
): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Citations pending Plan 6 reattachment' };
}

export async function detachCitation(
  _input: { calcId: string; symbol: string },
): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Citations pending Plan 6 reattachment' };
}
```

- [ ] **Step 4: Stub `src/lib/engine/inputs-reader.ts`**

If the file currently references `calculations`, replace its body:

```typescript
/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * Originally read inputs + citation sources from calculations.inputs JSONB.
 * Plan 6 retargets to project_parameters rows (one per field_id, with
 * citation_source as a sibling column).
 */

export type FieldValue =
  | number
  | string
  | boolean
  | null
  | { value: unknown; source?: { docId: string; page?: number; note?: string } };

export async function readInputsWithSources(
  _calcId: string,
): Promise<Record<string, FieldValue>> {
  throw new Error('Inputs reader pending Plan 6 reattachment to new schema');
}
```

- [ ] **Step 5: Stub `src/lib/db/queries/report-archives.ts`**

Overwrite:

```typescript
import 'server-only';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * report_archives schema was modified in Plan 1 (dropped approval_id,
 * added approval_event_id + worksheet_instance_id). Plan 6 implements
 * the new queries.
 */

export async function listReportArchivesForProject(
  _projectId: string,
): Promise<Array<unknown>> {
  return [];
}
```

- [ ] **Step 6: Stub `src/app/api/calculations/[id]/pdf/route.ts`**

Replace the body with a 410 Gone:

```typescript
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'PDF generation pending Plan 6 reattachment' },
    { status: 410 },
  );
}
```

- [ ] **Step 7: Delete the Plan-6-derived tests that fail because of stubs**

```bash
git rm src/lib/pdf/__tests__/load-data.test.ts
git rm src/lib/pdf/__tests__/build-report.test.tsx
git rm src/lib/pdf/__tests__/document.snapshot.test.tsx
git rm src/lib/actions/__tests__/citations.test.ts
git rm src/lib/engine/__tests__/inputs-reader.test.ts 2>/dev/null || true
```

If the `__tests__` directories now empty, `git rm` them too:
```bash
rmdir src/lib/pdf/__tests__/ 2>/dev/null || true
rmdir src/lib/engine/__tests__/ 2>/dev/null || true
rmdir src/lib/engine/ 2>/dev/null || true
```

- [ ] **Step 8: Commit**

```bash
git add scripts/ src/lib/pdf/load-data.ts src/lib/actions/citations.ts \
        src/lib/engine/inputs-reader.ts src/lib/db/queries/report-archives.ts \
        src/app/api/calculations/[id]/pdf/route.ts
git commit -m "chore(cleanup): delete old scripts + stub Plan-6-derived modules

Deleted scripts: import-from-ekowai-agent, extract-regulation-knowledge,
seed-demo, seed-multi-project, wipe-test-data — all A-201 era.

Stubbed (Plan 6 reattaches against new schema):
- src/lib/pdf/load-data.ts (throws at runtime, type shape preserved)
- src/lib/actions/citations.ts (returns { ok: false, error })
- src/lib/engine/inputs-reader.ts (throws)
- src/lib/db/queries/report-archives.ts (returns [])
- src/app/api/calculations/[id]/pdf/route.ts (410 Gone)

Deleted Plan-6-derived tests that exercise the stubbed modules — they
will come back when Plan 6 reattaches."
```

---

## Task 4: Delete Old RLS Tests

The Plan-1 schema migration dropped `calculations`, `decisions`, `approvals` tables. The corresponding RLS tests now fail because the tables don't exist.

- [ ] **Step 1: Delete**

```bash
git rm tests/rls/calculations.test.ts
git rm tests/rls/decisions.test.ts
git rm tests/rls/approvals.test.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore(cleanup): delete RLS tests for dropped tables

calculations.test.ts, decisions.test.ts, approvals.test.ts —
all reference tables removed in Plan 1's migration. The new tables
(approval_events, project_parameters, worksheet_instances,
project_standards, audit_log) already have their own RLS tests from
Plans 1, 3, and 4."
```

---

## Task 5: Light Cleanup of Nav + Rationale Route

**Files:**
- Modify: `src/components/layout/nav.tsx`
- Modify: `src/app/api/draft-rationale/route.ts`

- [ ] **Step 1: Audit `nav.tsx`**

```bash
grep -nE "calc|calculation" src/components/layout/nav.tsx
```

Remove any links pointing to `/calc/` routes. Keep links to `/projects`, `/inbox`, `/org`.

If nav.tsx imports anything from `@/components/calculator/*` (deleted in Task 2), remove those imports too.

- [ ] **Step 2: Audit `draft-rationale/route.ts`**

```bash
grep -nE "calc|calculations|decisions" src/app/api/draft-rationale/route.ts
```

The original route takes a `calcId` and looks up `calculations.id`. Adapt:
- If the route is purely AI-rationale generation (POST a draft, return text), drop any DB context lookup of calculations entirely. Keep just the AI generation logic.
- Document the change in the commit message.

If the route is heavily dependent on the dropped tables and you can't easily refactor in <10 lines, stub it to return 410 Gone like the PDF route did, and let Plan 6 retarget.

- [ ] **Step 3: Verify typecheck on these two files**

```bash
pnpm typecheck 2>&1 | grep -E "(nav|draft-rationale)" | head -10
```

Expected: no errors in these files.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/nav.tsx src/app/api/draft-rationale/route.ts
git commit -m "chore(cleanup): nav + draft-rationale stripped of dropped-table refs

nav.tsx: removed /calc/* links and broken calculator/* imports.
draft-rationale: refactored to drop calculations-table context lookup
(or stubbed to 410, depending on complexity)."
```

---

## Task 6: Full Typecheck + Test + Build Pass

This is the gate that proves Plan 5 cleaned up enough.

- [ ] **Step 1: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -10
```

Expected: exit 0. If errors remain, identify the file and either delete it (Category A — A-201) or stub it (Category B — Plan-6-derived).

- [ ] **Step 2: Run unit tests**

```bash
pnpm test 2>&1 | tail -10
```

Expected: all green.

- [ ] **Step 3: Run RLS tests**

```bash
pnpm test:rls 2>&1 | tail -10
```

Expected: all green. (We deleted the dropped-table RLS tests in Task 4; the remaining ones are for the new tables.)

- [ ] **Step 4: Build**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds. If a route fails to compile, that route still imports from dropped/stub modules — fix the imports or delete the route.

- [ ] **Step 5: Empty checkpoint commit**

```bash
git commit --allow-empty -m "chore(cleanup): typecheck + tests + build green after Plan 5 cleanup"
```

---

## Task 7: Pilot Seed Script

**Files:**
- Create: `scripts/seed-pilot-project.ts`

- [ ] **Step 1: Write the seed script**

```typescript
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const DB_URL = process.env.DATABASE_URL;
const ENGINEER_EMAIL = process.env.DEV_AUTOLOGIN_EMAIL ?? 'leadership@ekowai.com';

if (!DB_URL) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const PILOT_PROJECT_CODE = 'PLT-HS-01';
const PILOT_PROJECT_NAME = 'PLT-HS-01 — Blumen Forscheln Naturteich';
const PILOT_SITE = 'Flurstück 72/16, Kempen, 52525 Heinsberg NRW';
const PILOT_STANDARDS = ['DWA-A-138-1', 'DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'];

const sql = postgres(DB_URL, { prepare: false });

async function main() {
  console.log(`Seeding pilot project for ${ENGINEER_EMAIL}...`);

  // 1. Find engineer + their org
  const [user] = await sql`SELECT id FROM auth.users WHERE email = ${ENGINEER_EMAIL} LIMIT 1`;
  if (!user) throw new Error(`User ${ENGINEER_EMAIL} not found`);

  const [member] = await sql`SELECT org_id FROM org_members WHERE user_id = ${user.id} LIMIT 1`;
  if (!member) throw new Error(`User has no org membership — create one first`);
  const orgId = member.org_id;
  console.log(`✓ User ${user.id} in org ${orgId}`);

  // 2. Upsert pilot project
  const [proj] = await sql`
    INSERT INTO projects (org_id, name, project_code, site_location, created_by)
    VALUES (${orgId}, ${PILOT_PROJECT_NAME}, ${PILOT_PROJECT_CODE}, ${PILOT_SITE}, ${user.id})
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  let projectId: string;
  if (proj) {
    projectId = proj.id;
    console.log(`✓ Pilot project created: ${projectId}`);
  } else {
    const [existing] = await sql`
      SELECT id FROM projects WHERE org_id = ${orgId} AND project_code = ${PILOT_PROJECT_CODE} LIMIT 1
    `;
    if (!existing) throw new Error('Project insert did nothing and no existing row found');
    projectId = existing.id;
    console.log(`✓ Pilot project already exists: ${projectId}`);
  }

  // 3. Attach standards + instantiate worksheet_instances
  let totalInstances = 0;
  for (const code of PILOT_STANDARDS) {
    const [std] = await sql`SELECT id FROM standards WHERE code = ${code} LIMIT 1`;
    if (!std) {
      console.warn(`⚠ Standard ${code} not imported — skipping (run import-pass3c first)`);
      continue;
    }

    await sql`
      INSERT INTO project_standards (project_id, standard_id, status, added_by)
      VALUES (${projectId}, ${std.id}, 'active', ${user.id})
      ON CONFLICT (project_id, standard_id) DO UPDATE
        SET status = 'active', removed_at = NULL, removed_by = NULL, removal_reason = NULL
    `;

    const templates = await sql<{ id: string }[]>`
      SELECT id FROM worksheet_templates WHERE standard_id = ${std.id}
    `;
    for (const t of templates) {
      await sql`
        INSERT INTO worksheet_instances (project_id, worksheet_template_id)
        VALUES (${projectId}, ${t.id})
        ON CONFLICT (project_id, worksheet_template_id) DO NOTHING
      `;
    }
    totalInstances += templates.length;
    console.log(`✓ ${code}: ${templates.length} worksheet_instances`);
  }

  console.log(`\nProject ID: ${projectId}`);
  console.log(`Total worksheet_instances: ${totalInstances}`);
  console.log(`Visit: http://localhost:3000/de/projects/${projectId}/standards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
```

- [ ] **Step 2: Run the seed**

```bash
pnpm tsx scripts/seed-pilot-project.ts
```

Expected:
- `✓ User ... in org ...`
- `✓ Pilot project created/already exists: <UUID>`
- `✓ DWA-A-138-1: 28 worksheet_instances`
- `✓ DWA-M-820-1: 25 worksheet_instances`
- `✓ DWA-M-820-2: 28 worksheet_instances`
- `✓ DWA-M-820-3: 24 worksheet_instances`
- Total: 105 worksheet_instances
- Project ID printed
- URL printed

If any standard is missing in the DB, the script logs a warning and continues. To populate them all, run `import-pass3c.ts` first (already done in Plan 2).

- [ ] **Step 3: Verify DB**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, {prepare:false});
sql\`SELECT p.project_code, COUNT(wi.id)::int AS instances, COUNT(DISTINCT ps.standard_id)::int AS standards
    FROM projects p
    LEFT JOIN project_standards ps ON ps.project_id = p.id AND ps.status = 'active'
    LEFT JOIN worksheet_instances wi ON wi.project_id = p.id
    WHERE p.project_code = 'PLT-HS-01'
    GROUP BY p.id, p.project_code\`
  .then(r => console.log(r))
  .finally(() => sql.end());
"
```

Expected: `{ project_code: 'PLT-HS-01', instances: 105, standards: 4 }`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-pilot-project.ts
git commit -m "feat(scripts): seed-pilot-project.ts for PLT-HS-01 (Paula / Heinsberg)

Creates the canonical pilot project with org_members lookup,
project_standards rows for the 4 active standards (138-1 + 820-1/2/3),
and lazy-instantiates ~105 worksheet_instances. Idempotent — re-running
preserves existing rows via ON CONFLICT clauses."
```

---

## Task 8: Browser Smoke Test + Push + PR

- [ ] **Step 1: Start dev server**

```bash
pnpm dev > /tmp/devserver-plan5.log 2>&1 &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"

# Wait for ready
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/de 2>/dev/null)
  if echo "$CODE" | grep -qE "200|307|302"; then
    echo "Dev server ready after ${i}s (HTTP $CODE)"
    break
  fi
  sleep 2
done
```

- [ ] **Step 2: Fetch key routes**

Get the pilot project ID from the previous task's output. Then:

```bash
# Substitute <PROJECT_ID> with the pilot ID
echo "=== /standards ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/de/projects/<PROJECT_ID>/standards"

echo "=== /audit ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/de/projects/<PROJECT_ID>/audit"

echo "=== /standards/DWA-A-138-1/worksheets/A138-01 ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/de/projects/<PROJECT_ID>/standards/DWA-A-138-1/worksheets/A138-01"

echo "=== /projects (list) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/de/projects"
```

All should return 200 or 307 (auth redirect), NOT 500.

- [ ] **Step 3: Stop dev server**

```bash
kill $DEV_PID 2>/dev/null || true
wait 2>/dev/null || true
```

- [ ] **Step 4: Empty checkpoint commit**

```bash
git commit --allow-empty -m "chore(smoke): Plan 5 routes return 200/307 — build is green"
```

- [ ] **Step 5: Push + Update PR #1**

```bash
git push origin feat/db-driven-schema
```

```bash
gh pr edit 1 --body "$(cat <<'EOF'
## Summary

Plans 1, 2, 3, 4, 5 of the 2026-05-20 DB-driven multi-standard rebuild
spec. (Note: Plan 5 here is the cleanup pass, executed before the
Plan-6 reattachment for build hygiene.)

### Plan 1 — Schema Migration
17-table schema, RLS-enforced immutability.

### Plan 2 — Pass3c xlsx Importer
5 standards imported (135 ws / 627 fields / 71 eqs / 174 reqs).

### Plan 3 — Dynamic Form Renderer
Generic worksheet routes + DynamicField + auto-save + audit_log writes.

### Plan 4 — Approval State Machine + Audit
transitionWorksheet action, StatusPill, TransitionModal, ApprovalBar
functional, /projects/[id]/audit timeline route.

### Plan 5 — Cleanup + Pilot Seed
- Deleted A-201 engine, bundled JSONs, old calc routes + components,
  old server actions, old RLS tests, old import/seed scripts
- Stubbed Plan-6-derived modules (PDF loader, citations action,
  inputs-reader, report-archives query, /api/calculations PDF route)
  so the build compiles. Plan 6 retargets these against the new schema.
- New seed script `scripts/seed-pilot-project.ts` creates the canonical
  PLT-HS-01 with org membership + 4 active standards + ~105
  worksheet_instances
- `pnpm typecheck`, `pnpm test`, `pnpm test:rls`, `pnpm build` — all green
- Vercel preview deploy should now succeed

### Plan 6 — Plan-6 Reattachment (still TODO)
Retarget the stubs to project_parameters + worksheet_instances +
approval_events. Replaces error-throwing stubs with working
implementations. Rebuilds the PDF document for the new data shape.

## Test plan

- [x] Plan 1: 5 RLS tests green
- [x] Plan 2: 17 unit + 5 standards imported
- [x] Plan 3: 2 RLS + smoke routes
- [x] Plan 4: 3 RLS + SQL state-machine smoke
- [x] Plan 5: typecheck + test + test:rls + build all exit 0
- [x] Plan 5: pilot project seed runs cleanly, creates ~105 instances
- [ ] (Human) Browser test: navigate the pilot project, fill a worksheet,
  transition through the approval states, view audit log
- [ ] Plan 6: retarget stubs, PDF generation working again

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Done Criteria for Plan 5

1. `pnpm typecheck` exits 0
2. `pnpm test` and `pnpm test:rls` both green (the deleted dropped-table tests are gone)
3. `pnpm build` exits 0 — Vercel can deploy
4. `pnpm tsx scripts/seed-pilot-project.ts` produces a project with ~105 worksheet_instances
5. Dev server's `/standards`, `/audit`, and `/worksheets/A138-01` routes return 200/307 (not 500)
6. PR #1 description reflects Plans 1+2+3+4+5

Then proceed to write Plan 6 (the actual Plan-6 reattachment of citations/docs/archives/PDF).
