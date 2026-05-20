# Plan 1: Schema Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wizard's DWA-A-201-specific DB schema with the 17-table multi-standard DB-driven schema from the 2026-05-20 spec, with RLS-enforced immutability on `approval_events` and `audit_log`.

**Architecture:** One hand-written SQL migration applied via the existing `scripts/_apply-supabase-sql.ts` helper. Drizzle schema is then re-synced for app-side type safety. RLS smoke tests (vitest `rls` project) verify that immutable tables actually reject UPDATE/DELETE, that org isolation works, and that the standards library is read-only for authenticated users. App code is **intentionally left broken** at the end of this plan — it still references dropped tables. Plans 2–6 progressively rewire the app to the new schema.

**Tech Stack:** Supabase Postgres (Frankfurt EU), Drizzle ORM, `postgres` npm package (used by the apply-sql helper), pnpm + tsx, vitest with named projects (`unit` and `rls`).

**Companion Spec:** `docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md`

**Companion Plans (later):**
- Plan 2: xlsx Importer
- Plan 3: Dynamic Form Renderer
- Plan 4: Approval State Machine + Audit
- Plan 5: Plan-6 Reattachment
- Plan 6: Pilot Seed + Cleanup + E2E

---

## File Structure

**Create:**
- `supabase/migrations/20260520120000_db_driven_rebuild.sql` — atomic migration (drops + creates + restructures + RLS)
- `tests/rls/standards-library-read.test.ts` — verifies authenticated SELECT, anon denial
- `tests/rls/approval-events-immutable.test.ts` — verifies INSERT works, UPDATE/DELETE rejected
- `tests/rls/audit-log-immutable.test.ts` — same pattern for audit_log
- `tests/rls/worksheet-instances-org-scope.test.ts` — verifies cross-org isolation
- `tests/rls/project-parameters-org-scope.test.ts` — verifies cross-org isolation
- `scripts/wipe-all-data.ts` — idempotent wipe of project data (requires `--yes`)
- `scripts/snapshot-prod-db.sh` — pg_dump helper for the Phase 0 safety snapshot

**Modify:**
- `src/lib/db/schema.ts` — drop old table definitions (`calculations`, `calculationHistory`, `decisions`, `approvals`, `crossReferences`, `calculationMetrics`), add the 11 new tables, ALTER `projects` and `reportArchives` definitions
- (none of the Plan-6 test files are touched here — Plan 5 handles their reattachment)

**Untouched in this plan (handled by Plan 6 and others):**
- `src/lib/engine/*` (calls dropped tables — fails to compile, intentional)
- `src/lib/actions/{approval,calculation,citations,documents,org-settings}.ts` (same)
- `src/lib/pdf/*` (same)
- `src/components/calculator/*` (same)
- `src/app/[locale]/(app)/projects/[id]/calc/*` (same)

---

## Environment Prerequisites

These must be set in `.env.local` (read by the apply-sql helper) and in your shell environment for RLS tests:

- `DATABASE_URL` — pooler URL for the dev Supabase project, e.g. `postgresql://postgres.<ref>:<pw>@aws-1-eu-central-2.pooler.supabase.com:6543/postgres`
- `CI_SUPABASE_URL` — REST URL of the dev project (e.g. `https://<ref>.supabase.co`)
- `CI_SUPABASE_ANON_KEY` — anon JWT
- `CI_SUPABASE_SERVICE_ROLE_KEY` — service-role JWT (for test fixture setup)

Verify before starting Task 1:

```bash
grep -E "^(DATABASE_URL|CI_SUPABASE)" .env.local
```

If any are missing, stop and ask. Do NOT use prod Supabase for these RLS tests — use a separate dev project.

---

## Task 1: Branch + Safety Snapshot

**Files:**
- Create: `scripts/snapshot-prod-db.sh`

- [ ] **Step 1: Create feature branch off latest main**

Run:
```bash
git checkout main
git pull
git checkout -b feat/db-driven-schema
```

Expected: switched to `feat/db-driven-schema`, status clean.

- [ ] **Step 2: Write the snapshot helper script**

Create `scripts/snapshot-prod-db.sh`:

```bash
#!/usr/bin/env bash
# Snapshot the current Supabase DB to a timestamped .sql file in /tmp.
# Reads DATABASE_URL from .env.local. Requires `pg_dump` in PATH.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set and not found in .env.local" >&2
  exit 1
fi

OUT="/tmp/ekowai-snapshot-$(date -u +%Y%m%dT%H%M%SZ).sql"
echo "Snapshotting to $OUT..."
pg_dump --no-owner --no-acl --clean --if-exists "$DATABASE_URL" > "$OUT"
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
ls -lh "$OUT"
```

- [ ] **Step 3: Make executable + run**

```bash
chmod +x scripts/snapshot-prod-db.sh
./scripts/snapshot-prod-db.sh
```

Expected: a `/tmp/ekowai-snapshot-*.sql` file is created, several MB in size.

- [ ] **Step 4: Verify snapshot is loadable (syntax check)**

```bash
head -50 /tmp/ekowai-snapshot-*.sql
```

Expected: SQL header with `SET`, `DROP TABLE IF EXISTS`, etc. — confirms `pg_dump` produced valid output.

- [ ] **Step 5: Commit the snapshot script (not the dump)**

```bash
git add scripts/snapshot-prod-db.sh
git commit -m "chore(scripts): pg_dump helper for safety snapshots"
```

The `.sql` dump itself is in `/tmp/`, outside the repo. Do not commit it (it contains data and credentials in connection strings).

---

## Task 2: Write Failing RLS Tests

The point of TDD here is **specifying behavior before writing schema**. If a test passes against the empty DB, the test is wrong.

**Files:**
- Create: `tests/rls/standards-library-read.test.ts`
- Create: `tests/rls/approval-events-immutable.test.ts`
- Create: `tests/rls/audit-log-immutable.test.ts`
- Create: `tests/rls/worksheet-instances-org-scope.test.ts`
- Create: `tests/rls/project-parameters-org-scope.test.ts`

- [ ] **Step 1: Write `tests/rls/standards-library-read.test.ts`**

Create the file with:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, cleanup } from './helpers';
import { createClient } from '@supabase/supabase-js';

describe('standards library RLS — read-only for authenticated', () => {
  const e1 = `rls-std-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1]));

  it('authenticated user can SELECT from standards', async () => {
    const u = await makeUser(e1);
    const ad = admin();

    // Seed one standard via service-role
    const code = `TEST-${Date.now()}`;
    await ad.from('standards').insert({
      code,
      title_de: 'Test Standard',
      version: 'Pass3c',
    });

    const { data, error } = await u.client.from('standards').select('*').eq('code', code);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].title_de).toBe('Test Standard');

    await ad.from('standards').delete().eq('code', code);
  });

  it('authenticated user cannot INSERT into standards', async () => {
    const u = await makeUser(`rls-std-ins-${Date.now()}@test.local`);

    const { error } = await u.client.from('standards').insert({
      code: `BAD-${Date.now()}`,
      title_de: 'Should fail',
      version: 'Pass3c',
    });
    expect(error).not.toBeNull();
    // Postgres returns "new row violates row-level security policy" or similar
    expect(error?.message).toMatch(/row-level security|permission denied/i);
  });

  it('anonymous (no JWT) cannot SELECT from standards', async () => {
    const anon = createClient(
      process.env.CI_SUPABASE_URL!,
      process.env.CI_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await anon.from('standards').select('*').limit(1);
    // Either error or empty data — anon must not see standards
    if (!error) expect(data).toEqual([]);
  });
});
```

- [ ] **Step 2: Write `tests/rls/approval-events-immutable.test.ts`**

Create:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('approval_events RLS — INSERT+SELECT only, no UPDATE, no DELETE', () => {
  const e1 = `rls-appe-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1]));

  it('UPDATE on approval_events is rejected even by service role due to missing policy (anon path)', async () => {
    const u = await makeUser(e1);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Alpha Approval Test');

    // Seed: project, standard, worksheet_template, worksheet_instance, then one approval_event
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
      .select('id')
      .single();

    const { data: std } = await ad
      .from('standards')
      .insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();

    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();

    const { data: inst } = await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id })
      .select('id')
      .single();

    const { data: evt, error: insErr } = await u.client
      .from('approval_events')
      .insert({
        worksheet_instance_id: inst!.id,
        event_type: 'submit',
        from_status: 'draft',
        to_status: 'submitted_for_review',
        actor_id: u.id,
        actor_role: 'engineer',
        comment: 'initial submit',
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(evt).toBeDefined();

    // UPDATE should fail (no UPDATE policy)
    const { error: updErr } = await u.client
      .from('approval_events')
      .update({ comment: 'tampered' })
      .eq('id', evt!.id);
    expect(updErr).not.toBeNull();

    // DELETE should fail (no DELETE policy)
    const { error: delErr } = await u.client
      .from('approval_events')
      .delete()
      .eq('id', evt!.id);
    expect(delErr).not.toBeNull();

    // SELECT still works
    const { data: read } = await u.client
      .from('approval_events')
      .select('comment')
      .eq('id', evt!.id);
    expect(read?.[0]?.comment).toBe('initial submit');
  });

  it('INSERT with empty comment is rejected by CHECK constraint', async () => {
    const u = await makeUser(`rls-appe-empty-${Date.now()}@test.local`);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Beta No-Comment');
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: inst } = await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id })
      .select('id')
      .single();

    const { error } = await u.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: u.id,
      actor_role: 'engineer',
      comment: '   ',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/check|constraint/i);
  });
});
```

- [ ] **Step 3: Write `tests/rls/audit-log-immutable.test.ts`**

Create:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('audit_log RLS — INSERT+SELECT only', () => {
  const e1 = `rls-audit-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1]));

  it('user can INSERT and SELECT but cannot UPDATE or DELETE own audit rows', async () => {
    const u = await makeUser(e1);
    const orgId = await makeOrg(u.client, u.id, 'Alpha Audit Test');

    const { data: row, error: insErr } = await u.client
      .from('audit_log')
      .insert({
        actor_id: u.id,
        actor_role: 'engineer',
        org_id: orgId,
        table_name: 'standards',
        action: 'insert',
        changes: { after: { code: 'X' } },
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();

    const { error: updErr } = await u.client
      .from('audit_log')
      .update({ action: 'update' })
      .eq('id', row!.id);
    expect(updErr).not.toBeNull();

    const { error: delErr } = await u.client
      .from('audit_log')
      .delete()
      .eq('id', row!.id);
    expect(delErr).not.toBeNull();
  });

  it('user cannot SELECT audit rows from a foreign org', async () => {
    const ad = admin();
    const u1 = await makeUser(`rls-audit-a-${Date.now()}@test.local`);
    const u2 = await makeUser(`rls-audit-b-${Date.now()}@test.local`);
    const org2 = await makeOrg(u2.client, u2.id, 'Bravo Audit');

    await ad.from('audit_log').insert({
      actor_id: u2.id,
      actor_role: 'engineer',
      org_id: org2,
      table_name: 'standards',
      action: 'insert',
      changes: { after: { code: 'Y' } },
    });

    const { data, error } = await u1.client
      .from('audit_log')
      .select('*')
      .eq('org_id', org2);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 4: Write `tests/rls/worksheet-instances-org-scope.test.ts`**

Create:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('worksheet_instances RLS — org-scoped', () => {
  const e1 = `rls-wi-a-${Date.now()}@test.local`;
  const e2 = `rls-wi-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read worksheet_instances from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo WI');

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgB, name: 'B', created_by: b.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    await ad.from('worksheet_instances').insert({
      project_id: proj!.id,
      worksheet_template_id: tmpl!.id,
    });

    const { data, error } = await a.client
      .from('worksheet_instances')
      .select('*')
      .eq('project_id', proj!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 5: Write `tests/rls/project-parameters-org-scope.test.ts`**

Create:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_parameters RLS — org-scoped', () => {
  const e1 = `rls-pp-a-${Date.now()}@test.local`;
  const e2 = `rls-pp-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read project_parameters from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo PP');

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgB, name: 'B', created_by: b.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: field } = await ad
      .from('fields')
      .insert({
        worksheet_template_id: tmpl!.id,
        symbol: 'X',
        label_de: 'X',
        data_type: 'number',
      })
      .select('id')
      .single();

    await ad.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 42,
      source_type: 'entered',
      entered_by: b.id,
    });

    const { data, error } = await a.client
      .from('project_parameters')
      .select('*')
      .eq('project_id', proj!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 6: Run RLS tests to verify they all fail**

```bash
pnpm test:rls
```

Expected: ALL 5 new test files fail. The errors will mention missing tables like `relation "standards" does not exist`, `relation "approval_events" does not exist`, etc. If any test passes, the test is wrong — fix the test before continuing.

The existing RLS tests (`approvals.test.ts`, `calculations.test.ts`, `decisions.test.ts`, `orgs.test.ts`, `projects.test.ts`, `project-documents.test.ts`, `report-archives.test.ts`) will likely also fail in Task 8 once we drop the underlying tables; that's expected and they will be removed/rewritten in Plans 5 and 6. For now, leave them in place.

- [ ] **Step 7: Commit the failing tests**

```bash
git add tests/rls/standards-library-read.test.ts \
        tests/rls/approval-events-immutable.test.ts \
        tests/rls/audit-log-immutable.test.ts \
        tests/rls/worksheet-instances-org-scope.test.ts \
        tests/rls/project-parameters-org-scope.test.ts
git commit -m "test(rls): specify RLS for standards lib + immutable audit + org isolation

These tests fail today (the referenced tables do not exist yet) and
become green after the schema migration in the next task."
```

---

## Task 3: SQL Migration — Drops + Existing Table Restructure

**Files:**
- Create: `supabase/migrations/20260520120000_db_driven_rebuild.sql`

This task and Tasks 4–7 build up one file in five segments. We write the file incrementally but do not apply it until Task 8.

- [ ] **Step 1: Create the migration file with header + Phase 1 (Drops)**

Create `supabase/migrations/20260520120000_db_driven_rebuild.sql`:

```sql
-- =============================================================================
-- DB-driven Multi-Standard Rebuild — 2026-05-20
-- Spec: docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md
-- Plan: docs/superpowers/plans/2026-05-20-plan-1-schema-migration.md
-- Atomic: ROLLBACK on any error.
-- =============================================================================
BEGIN;

-- ----- PHASE 1: DROP OLD TABLES ---------------------------------------------
-- These are replaced by worksheet_instances + project_parameters + approval_events.
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS calculation_history CASCADE;
DROP TABLE IF EXISTS calculation_metrics CASCADE;
DROP TABLE IF EXISTS cross_references CASCADE;
DROP TABLE IF EXISTS calculations CASCADE;

-- ----- PHASE 2: RESTRUCTURE EXISTING TABLES ---------------------------------
-- projects: drop A-201-specific columns if present, ensure site_location +
-- project_code exist.
ALTER TABLE projects DROP COLUMN IF EXISTS standard_code;
ALTER TABLE projects DROP COLUMN IF EXISTS standard_version;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_location text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code text;
```

Do not yet append the CREATEs. Save the file. We continue in Task 4.

---

## Task 4: SQL Migration — Standards Library Tables

- [ ] **Step 1: Append Phase 3 (Standards Library) to the migration file**

Append to `supabase/migrations/20260520120000_db_driven_rebuild.sql`:

```sql

-- ----- PHASE 3: STANDARDS LIBRARY (6 NEW TABLES) ----------------------------

-- One row per regulatory standard
CREATE TABLE standards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  title_de     text NOT NULL,
  title_en     text,
  version      text NOT NULL,
  issued_year  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE worksheet_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id            uuid NOT NULL REFERENCES standards ON DELETE CASCADE,
  code                   text NOT NULL,
  title_de               text NOT NULL,
  title_en               text,
  phase                  int,
  archetype              text CHECK (archetype IN
    ('registration','data_collection','calculation','summary','verification')),
  order_index            int NOT NULL DEFAULT 0,
  description            text,
  UNIQUE (standard_id, code)
);

CREATE TABLE worksheet_sections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  parent_section_id      uuid REFERENCES worksheet_sections,
  code                   text,
  title_de               text NOT NULL,
  title_en               text,
  order_index            int NOT NULL DEFAULT 0
);

CREATE TABLE fields (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  section_id             uuid REFERENCES worksheet_sections,
  symbol                 text NOT NULL,
  label_de               text NOT NULL,
  label_en               text,
  data_type              text NOT NULL CHECK (data_type IN
    ('number','text','enum','date','boolean','json')),
  unit                   text,
  is_required            boolean NOT NULL DEFAULT false,
  enum_values            jsonb,
  validation_rules       jsonb,
  clause_reference       text,
  description            text,
  consumer_worksheets    text[],
  order_index            int NOT NULL DEFAULT 0,
  verification_status    text NOT NULL DEFAULT 'imported_unverified'
    CHECK (verification_status IN ('imported_unverified','engineer_verified')),
  UNIQUE (worksheet_template_id, symbol)
);

CREATE TABLE equations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  equation_number        text NOT NULL,
  formula                text NOT NULL,
  formula_latex          text,
  input_symbols          text[],
  output_symbol          text,
  output_unit            text,
  clause_reference       text,
  description            text,
  verification_status    text NOT NULL DEFAULT 'imported_unverified'
    CHECK (verification_status IN ('imported_unverified','engineer_verified')),
  UNIQUE (worksheet_template_id, equation_number)
);

CREATE TABLE compliance_requirements (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  code                   text NOT NULL,
  title_de               text NOT NULL,
  title_en               text,
  condition              text NOT NULL,
  clause_reference       text,
  severity               text NOT NULL CHECK (severity IN ('block','warn','info')),
  UNIQUE (worksheet_template_id, code)
);
```

Save. Do not apply yet.

---

## Task 5: SQL Migration — Project Workflow Tables

- [ ] **Step 1: Append Phase 4 (Project Workflow) to the migration file**

Append:

```sql

-- ----- PHASE 4: PROJECT WORKFLOW (5 NEW TABLES) -----------------------------

CREATE TABLE project_standards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  standard_id     uuid NOT NULL REFERENCES standards,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  added_at        timestamptz NOT NULL DEFAULT now(),
  added_by        uuid REFERENCES auth.users,
  removed_at      timestamptz,
  removed_by      uuid REFERENCES auth.users,
  removal_reason  text,
  UNIQUE (project_id, standard_id)
);

CREATE TABLE worksheet_instances (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates,
  status                 text NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft','submitted_for_review','engineer_approved','final','deactivated')),
  is_stale               boolean NOT NULL DEFAULT false,
  staleness_reason       text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, worksheet_template_id)
);

CREATE TABLE project_parameters (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                    uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  field_id                      uuid NOT NULL REFERENCES fields,
  source_worksheet_instance_id  uuid REFERENCES worksheet_instances,
  value_number                  numeric,
  value_text                    text,
  value_enum                    text,
  value_date                    date,
  value_boolean                 boolean,
  value_json                    jsonb,
  source_type                   text NOT NULL DEFAULT 'entered' CHECK (source_type IN
    ('entered','calculated','computed','derived')),
  citation_source               jsonb,
  entered_by                    uuid NOT NULL REFERENCES auth.users,
  entered_at                    timestamptz NOT NULL DEFAULT now(),
  is_stale                      boolean NOT NULL DEFAULT false,
  UNIQUE (project_id, field_id)
);

CREATE TABLE approval_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_instance_id  uuid NOT NULL REFERENCES worksheet_instances ON DELETE RESTRICT,
  event_type             text NOT NULL CHECK (event_type IN
    ('submit','engineer_approve','engineer_reject','finalize','reopen',
     'deactivate','reactivate')),
  from_status            text NOT NULL,
  to_status              text NOT NULL,
  actor_id               uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role             text NOT NULL CHECK (actor_role IN ('engineer','customer','system')),
  comment                text NOT NULL CHECK (length(trim(comment)) > 0),
  occurred_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid REFERENCES auth.users ON DELETE RESTRICT,
  actor_role   text CHECK (actor_role IN ('engineer','customer','system')),
  project_id   uuid REFERENCES projects ON DELETE RESTRICT,
  org_id       uuid REFERENCES orgs ON DELETE RESTRICT,
  table_name   text NOT NULL,
  record_id    uuid,
  action       text NOT NULL CHECK (action IN ('insert','update','delete','transition')),
  changes      jsonb NOT NULL
);

-- ----- PHASE 5: RE-ANCHOR PLAN-6 TABLES -------------------------------------
-- report_archives: drop FK to dropped approvals.id, add FKs to new workflow.
ALTER TABLE report_archives DROP COLUMN IF EXISTS approval_id;
ALTER TABLE report_archives
  ADD COLUMN approval_event_id uuid REFERENCES approval_events ON DELETE RESTRICT,
  ADD COLUMN worksheet_instance_id uuid REFERENCES worksheet_instances ON DELETE RESTRICT;
```

Save. Do not apply yet.

---

## Task 6: SQL Migration — Indices

- [ ] **Step 1: Append Phase 6 (Indices) to the migration file**

Append:

```sql

-- ----- PHASE 6: INDICES -----------------------------------------------------
CREATE INDEX idx_fields_worksheet              ON fields(worksheet_template_id, order_index);
CREATE INDEX idx_fields_symbol                 ON fields(symbol);
CREATE INDEX idx_equations_worksheet           ON equations(worksheet_template_id);
CREATE INDEX idx_compliance_worksheet          ON compliance_requirements(worksheet_template_id);
CREATE INDEX idx_worksheet_instances_project   ON worksheet_instances(project_id, status);
CREATE INDEX idx_project_parameters_pf         ON project_parameters(project_id, field_id);
CREATE INDEX idx_project_parameters_source     ON project_parameters(source_worksheet_instance_id);
CREATE INDEX idx_approval_events_instance      ON approval_events(worksheet_instance_id);
CREATE INDEX idx_approval_events_actor         ON approval_events(actor_id);
CREATE INDEX idx_audit_log_project             ON audit_log(project_id, occurred_at DESC);
CREATE INDEX idx_audit_log_actor               ON audit_log(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_log_table               ON audit_log(table_name, record_id);
CREATE INDEX idx_project_standards_project     ON project_standards(project_id);
CREATE INDEX idx_project_standards_active      ON project_standards(project_id) WHERE status = 'active';
CREATE INDEX idx_worksheet_sections_template   ON worksheet_sections(worksheet_template_id, order_index);
CREATE INDEX idx_worksheet_sections_parent     ON worksheet_sections(parent_section_id);
CREATE INDEX idx_report_archives_instance      ON report_archives(worksheet_instance_id);
CREATE INDEX idx_report_archives_event         ON report_archives(approval_event_id);
```

Save.

---

## Task 7: SQL Migration — RLS Policies

- [ ] **Step 1: Append Phase 7 (RLS Policies) to the migration file**

Append:

```sql

-- ----- PHASE 7: ROW-LEVEL SECURITY ------------------------------------------

-- Standards Library: read for authenticated, write only via service role
ALTER TABLE standards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE equations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standards_read_authenticated"
  ON standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "worksheet_templates_read_authenticated"
  ON worksheet_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "worksheet_sections_read_authenticated"
  ON worksheet_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "fields_read_authenticated"
  ON fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "equations_read_authenticated"
  ON equations FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_requirements_read_authenticated"
  ON compliance_requirements FOR SELECT TO authenticated USING (true);

-- Project workflow: scoped per org via org_members lookup
ALTER TABLE project_standards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_parameters  ENABLE ROW LEVEL SECURITY;

-- helper: is current user a member of the org owning this project?
-- We inline the check in each policy rather than use a function, for clarity
-- under audit.

CREATE POLICY "project_standards_all_org"
  ON project_standards FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "worksheet_instances_all_org"
  ON worksheet_instances FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "project_parameters_all_org"
  ON project_parameters FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- Immutable tables: INSERT + SELECT only, NO UPDATE, NO DELETE
ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_events_insert_org"
  ON approval_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND worksheet_instance_id IN (
      SELECT wi.id FROM worksheet_instances wi
      JOIN projects p ON p.id = wi.project_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "approval_events_select_org"
  ON approval_events FOR SELECT TO authenticated
  USING (
    worksheet_instance_id IN (
      SELECT wi.id FROM worksheet_instances wi
      JOIN projects p ON p.id = wi.project_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );
-- Deliberately NO update / delete policies. RLS blocks both.

CREATE POLICY "audit_log_insert_self"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (
    (actor_id = auth.uid() OR actor_id IS NULL)
    AND (
      org_id IS NULL
      OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "audit_log_select_org"
  ON audit_log FOR SELECT TO authenticated
  USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
-- Deliberately NO update / delete policies.

COMMIT;
```

This closes the BEGIN at the top of the file. Save.

- [ ] **Step 2: Validate the SQL syntax with a dry-run parse**

```bash
# psql --dry-run isn't available, but we can compile-check via postgres-meta:
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; import { readFileSync } from 'node:fs'; const sql = postgres(process.env.DATABASE_URL!, {prepare:false}); sql.unsafe('EXPLAIN '+readFileSync('supabase/migrations/20260520120000_db_driven_rebuild.sql','utf8')).then(()=>console.log('parse ok')).catch(e=>{console.error(e.message);process.exit(1)}).finally(()=>sql.end());"
```

If this errors with a parse error, fix the SQL. Note: this only catches syntax errors, not semantic errors like missing FK targets — those surface in Task 8.

- [ ] **Step 3: Commit the migration file (not applied yet)**

```bash
git add supabase/migrations/20260520120000_db_driven_rebuild.sql
git commit -m "feat(db): hand-written migration for DB-driven multi-standard schema

Drops calculations/decisions/approvals/calculation_history/calculation_metrics/
cross_references. Adds standards library (6 tables), project workflow (5 tables),
indices, and RLS policies. approval_events and audit_log have INSERT+SELECT
policies only (no UPDATE, no DELETE) — enforces immutability at the DB level.

Not yet applied. Apply in the next task and verify via RLS smoke tests."
```

---

## Task 8: Apply Migration + Verify RLS Tests Pass

- [ ] **Step 1: Apply the migration to the dev DB**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx scripts/_apply-supabase-sql.ts \
  supabase/migrations/20260520120000_db_driven_rebuild.sql
```

Expected output: `Applying supabase/migrations/...sql...` then `Done.`

If you see an error like `ERROR: column "approval_id" does not exist of relation "report_archives"`, the dev DB doesn't have the Plan-6 baseline. Apply the Plan-6 migrations first:

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx scripts/_apply-supabase-sql.ts \
  supabase/migrations/20260503120000_documents_and_archives.sql \
  supabase/migrations/20260503130000_report_archives_org_consistency.sql
```

then retry the new migration.

- [ ] **Step 2: Sanity-check that tables exist**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL!, {prepare:false}); sql\`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('standards','worksheet_templates','worksheet_sections','fields','equations','compliance_requirements','project_standards','worksheet_instances','project_parameters','approval_events','audit_log') ORDER BY tablename\`.then(rows=>{console.log('Found:',rows.map(r=>r.tablename).join(', '));process.exit(rows.length===11?0:1)}).finally(()=>sql.end());"
```

Expected: `Found: approval_events, audit_log, compliance_requirements, equations, fields, project_parameters, project_standards, standards, worksheet_instances, worksheet_sections, worksheet_templates`

- [ ] **Step 3: Run the new RLS tests**

```bash
pnpm test:rls -- tests/rls/standards-library-read.test.ts \
                 tests/rls/approval-events-immutable.test.ts \
                 tests/rls/audit-log-immutable.test.ts \
                 tests/rls/worksheet-instances-org-scope.test.ts \
                 tests/rls/project-parameters-org-scope.test.ts
```

Expected: all 5 files pass.

If any fails with `error: row violates row-level security policy` on an INSERT that should have succeeded, the WITH CHECK clause is too restrictive — re-read the policy in Task 7, fix the SQL, drop+recreate the policy via a small follow-up file, re-apply.

If any fails with `expected error to not be null` on UPDATE/DELETE, that means UPDATE or DELETE worked when it shouldn't. Verify in psql:

```bash
DATABASE_URL=... pnpm tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL!,{prepare:false}); sql\`SELECT polname,polcmd FROM pg_policy WHERE polrelid='approval_events'::regclass\`.then(rows=>{console.log(rows);process.exit(0)}).finally(()=>sql.end());"
```

You should see only `polcmd='r'` (SELECT) and `polcmd='a'` (INSERT). If you see `'w'` (UPDATE) or `'d'` (DELETE), something added them — fix.

- [ ] **Step 4: Confirm immutable tables have no UPDATE/DELETE policies**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL!,{prepare:false}); Promise.all([sql\`SELECT polcmd FROM pg_policy WHERE polrelid='approval_events'::regclass\`,sql\`SELECT polcmd FROM pg_policy WHERE polrelid='audit_log'::regclass\`]).then(([a,b])=>{const aCmds=a.map(r=>r.polcmd).sort().join(',');const bCmds=b.map(r=>r.polcmd).sort().join(',');console.log('approval_events:',aCmds);console.log('audit_log:',bCmds);if(aCmds!=='a,r'||bCmds!=='a,r')process.exit(1)}).finally(()=>sql.end());"
```

Expected: both tables show `a,r` — INSERT (a = append) and SELECT (r = read) only.

- [ ] **Step 5: Commit verification evidence (no code change yet)**

This is a checkpoint commit so the migration-applied state is on the branch:

```bash
git commit --allow-empty -m "chore(db): apply DB-driven rebuild migration, RLS tests green

Verified via pg_policy that approval_events and audit_log have only
INSERT and SELECT policies — no UPDATE, no DELETE, ever."
```

---

## Task 9: Update Drizzle Schema

The Drizzle schema (`src/lib/db/schema.ts`) is the app-side type contract. After this task, the app **will not compile** — all callers of dropped tables now have invalid imports. That is expected and fixed in Plans 3–6.

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Read the current schema and identify what to remove**

```bash
grep -nE "^export const" src/lib/db/schema.ts
```

You should see exports for: `memberRoleEnum`, `calcStatusEnum`, `complianceStatusEnum`, `profiles`, `orgs`, `orgMembers`, `projects`, `calculations`, `calculationHistory`, `decisions`, `approvals`, `crossReferences`, `calculationMetrics`, `projectDocuments`, `reportArchives`.

- [ ] **Step 2: Replace the dropped-table exports with new-table exports**

Open `src/lib/db/schema.ts`. Remove these exports entirely:
- `calcStatusEnum` (replaced by `worksheet_instances.status` text+CHECK)
- `complianceStatusEnum` (no compliance evaluation in MVP)
- `calculations`
- `calculationHistory`
- `decisions`
- `approvals`
- `crossReferences`
- `calculationMetrics`

Add the following exports (replace the order such that all new tables go after `projects`):

```typescript
// =============================================================================
// STANDARDS LIBRARY (6 tables, read-only after import)
// =============================================================================
export const standards = pgTable('standards', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  titleDe: text('title_de').notNull(),
  titleEn: text('title_en'),
  version: text('version').notNull(),
  issuedYear: integer('issued_year'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worksheetTemplates = pgTable(
  'worksheet_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    standardId: uuid('standard_id').notNull().references(() => standards.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    phase: integer('phase'),
    archetype: text('archetype'),
    orderIndex: integer('order_index').notNull().default(0),
    description: text('description'),
  },
  (t) => ({ uniqStandardCode: unique().on(t.standardId, t.code) }),
);

export const worksheetSections = pgTable('worksheet_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  worksheetTemplateId: uuid('worksheet_template_id')
    .notNull()
    .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
  parentSectionId: uuid('parent_section_id'),
  code: text('code'),
  titleDe: text('title_de').notNull(),
  titleEn: text('title_en'),
  orderIndex: integer('order_index').notNull().default(0),
});

export const fields = pgTable(
  'fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => worksheetSections.id),
    symbol: text('symbol').notNull(),
    labelDe: text('label_de').notNull(),
    labelEn: text('label_en'),
    dataType: text('data_type').notNull(),
    unit: text('unit'),
    isRequired: boolean('is_required').notNull().default(false),
    enumValues: jsonb('enum_values'),
    validationRules: jsonb('validation_rules'),
    clauseReference: text('clause_reference'),
    description: text('description'),
    consumerWorksheets: text('consumer_worksheets').array(),
    orderIndex: integer('order_index').notNull().default(0),
    verificationStatus: text('verification_status').notNull().default('imported_unverified'),
  },
  (t) => ({ uniqWorksheetSymbol: unique().on(t.worksheetTemplateId, t.symbol) }),
);

export const equations = pgTable(
  'equations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    equationNumber: text('equation_number').notNull(),
    formula: text('formula').notNull(),
    formulaLatex: text('formula_latex'),
    inputSymbols: text('input_symbols').array(),
    outputSymbol: text('output_symbol'),
    outputUnit: text('output_unit'),
    clauseReference: text('clause_reference'),
    description: text('description'),
    verificationStatus: text('verification_status').notNull().default('imported_unverified'),
  },
  (t) => ({ uniqWorksheetEqn: unique().on(t.worksheetTemplateId, t.equationNumber) }),
);

export const complianceRequirements = pgTable(
  'compliance_requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    condition: text('condition').notNull(),
    clauseReference: text('clause_reference'),
    severity: text('severity').notNull(),
  },
  (t) => ({ uniqWorksheetCr: unique().on(t.worksheetTemplateId, t.code) }),
);

// =============================================================================
// PROJECT WORKFLOW (5 tables)
// =============================================================================
export const projectStandards = pgTable(
  'project_standards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    standardId: uuid('standard_id').notNull().references(() => standards.id),
    status: text('status').notNull().default('active'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    addedBy: uuid('added_by'),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedBy: uuid('removed_by'),
    removalReason: text('removal_reason'),
  },
  (t) => ({ uniqProjectStd: unique().on(t.projectId, t.standardId) }),
);

export const worksheetInstances = pgTable(
  'worksheet_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id),
    status: text('status').notNull().default('draft'),
    isStale: boolean('is_stale').notNull().default(false),
    stalenessReason: text('staleness_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqProjectTmpl: unique().on(t.projectId, t.worksheetTemplateId) }),
);

export const projectParameters = pgTable(
  'project_parameters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => fields.id),
    sourceWorksheetInstanceId: uuid('source_worksheet_instance_id').references(() => worksheetInstances.id),
    valueNumber: numeric('value_number'),
    valueText: text('value_text'),
    valueEnum: text('value_enum'),
    valueDate: date('value_date'),
    valueBoolean: boolean('value_boolean'),
    valueJson: jsonb('value_json'),
    sourceType: text('source_type').notNull().default('entered'),
    citationSource: jsonb('citation_source'),
    enteredBy: uuid('entered_by').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow(),
    isStale: boolean('is_stale').notNull().default(false),
  },
  (t) => ({ uniqProjectField: unique().on(t.projectId, t.fieldId) }),
);

export const approvalEvents = pgTable('approval_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  worksheetInstanceId: uuid('worksheet_instance_id')
    .notNull()
    .references(() => worksheetInstances.id, { onDelete: 'restrict' }),
  eventType: text('event_type').notNull(),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  actorId: uuid('actor_id').notNull(),
  actorRole: text('actor_role').notNull(),
  comment: text('comment').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid('actor_id'),
  actorRole: text('actor_role'),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'restrict' }),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'restrict' }),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id'),
  action: text('action').notNull(),
  changes: jsonb('changes').notNull(),
});
```

Make sure to add any missing imports at the top of the file (the existing `pg-core` import already brings in `pgTable`, `uuid`, `text`, `timestamp`, `boolean`, `integer`, `jsonb`, `pgEnum`, `unique`, `numeric`, `date`, `bigserial` — if any are missing, add them).

- [ ] **Step 3: Restructure the `projects` table definition**

In the `projects` pgTable call, ensure these columns exist (add if missing, the SQL migration also adds them as nullable):

```typescript
siteLocation: text('site_location'),
projectCode: text('project_code'),
```

And remove any columns named `standardCode` or `standardVersion` if present.

- [ ] **Step 4: Restructure the `reportArchives` table definition**

In the `reportArchives` pgTable call, remove the `approvalId` field and add:

```typescript
approvalEventId: uuid('approval_event_id').references(() => approvalEvents.id, { onDelete: 'restrict' }),
worksheetInstanceId: uuid('worksheet_instance_id').references(() => worksheetInstances.id, { onDelete: 'restrict' }),
```

- [ ] **Step 5: Run `drizzle-kit pull` to confirm schema matches DB**

```bash
pnpm drizzle-kit pull
```

This introspects the actual Postgres DB and generates a snapshot. Compare against your hand-written schema.ts — they should be semantically identical (table names, column names, types). If `drizzle-kit pull` shows a different shape, your `schema.ts` is wrong; fix it. Discard the generated files (`drizzle.ts` etc. that pull creates) unless you want to keep them.

- [ ] **Step 6: Verify typecheck still works on the changed file**

```bash
pnpm typecheck 2>&1 | grep -E "src/lib/db/schema.ts" | head -10
```

Expected: no errors in `schema.ts` itself. Errors in other files that import from `schema.ts` (e.g. `src/lib/actions/calculation.ts` calling `db.from(calculations)` which no longer exists) are EXPECTED — those are fixed in Plans 3–6.

- [ ] **Step 7: Commit the Drizzle schema update**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): drizzle schema for DB-driven multi-standard rebuild

Adds standards, worksheet_templates, worksheet_sections, fields, equations,
compliance_requirements, project_standards, worksheet_instances,
project_parameters, approval_events, audit_log. Drops calculations,
calculation_history, decisions, approvals, cross_references,
calculation_metrics.

Restructures projects (drops standard_code/version, adds site_location +
project_code) and report_archives (drops approval_id, adds
approval_event_id + worksheet_instance_id).

Note: app code that depended on the dropped tables (engine, actions, PDF
loaders, calculator routes) now fails to compile. That code is rewritten
in Plans 3–6."
```

---

## Task 10: Wipe Utility + Final Sanity + Push

**Files:**
- Create: `scripts/wipe-all-data.ts`

- [ ] **Step 1: Write the wipe script**

Create `scripts/wipe-all-data.ts`:

```typescript
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('Refusing to wipe without --yes flag.');
  console.error('Usage: pnpm tsx scripts/wipe-all-data.ts --yes');
  process.exit(1);
}

async function main() {
  const sql = postgres(url!, { prepare: false });
  try {
    console.log('Wiping project + library data (auth.users, orgs, org_members untouched)...');
    // Order matters because of FK restrict.
    await sql`DELETE FROM audit_log`;
    await sql`DELETE FROM approval_events`;
    await sql`DELETE FROM report_archives`;
    await sql`DELETE FROM project_documents`;
    await sql`DELETE FROM project_parameters`;
    await sql`DELETE FROM worksheet_instances`;
    await sql`DELETE FROM project_standards`;
    await sql`DELETE FROM projects`;
    // Standards library can be safely re-imported, so wipe it too:
    await sql`DELETE FROM compliance_requirements`;
    await sql`DELETE FROM equations`;
    await sql`DELETE FROM fields`;
    await sql`DELETE FROM worksheet_sections`;
    await sql`DELETE FROM worksheet_templates`;
    await sql`DELETE FROM standards`;
    console.log('Done.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run wipe (it's a no-op on an empty DB but exercises the script)**

```bash
pnpm tsx scripts/wipe-all-data.ts --yes
```

Expected: `Wiping project + library data...` then `Done.`. No errors.

- [ ] **Step 3: Re-run the new RLS tests to confirm wipe didn't break anything**

```bash
pnpm test:rls -- tests/rls/standards-library-read.test.ts \
                 tests/rls/approval-events-immutable.test.ts \
                 tests/rls/audit-log-immutable.test.ts \
                 tests/rls/worksheet-instances-org-scope.test.ts \
                 tests/rls/project-parameters-org-scope.test.ts
```

Expected: all 5 files still pass. (They each set up their own fixtures and clean up, so they're insensitive to global state.)

- [ ] **Step 4: Confirm the old RLS tests now fail with "table not found" or are explicitly skipped**

```bash
pnpm test:rls -- tests/rls/calculations.test.ts \
                 tests/rls/decisions.test.ts \
                 tests/rls/approvals.test.ts 2>&1 | tail -20
```

These tests reference dropped tables. They are EXPECTED to fail right now with errors like `relation "calculations" does not exist`. Plan 6 will delete these test files together with the old engine code. Do not delete them in Plan 1 — keep the failure visible so it's obvious what still needs cleaning up.

- [ ] **Step 5: Final commit + push**

```bash
git add scripts/wipe-all-data.ts
git commit -m "feat(scripts): wipe-all-data.ts for clean re-seeding

Deletes all rows from project + standards-library tables in FK-safe
order. Keeps auth.users, orgs, org_members. Requires --yes flag.

Used between Pass3c-importer runs and pilot-project re-seeds."

git push -u origin feat/db-driven-schema
```

- [ ] **Step 6: Open Draft PR**

```bash
gh pr create --draft --base main \
  --title "feat(db): schema migration for DB-driven multi-standard rebuild (Plan 1/6)" \
  --body "$(cat <<'EOF'
## Summary

Plan 1 of 6 from the 2026-05-20 DB-driven multi-standard rebuild spec.

- Drops `calculations`, `calculation_history`, `decisions`, `approvals`,
  `cross_references`, `calculation_metrics`
- Adds 11 new tables across two groups: standards library (6) and project
  workflow (5)
- Restructures `projects` (drops A-201 columns, adds `site_location` +
  `project_code`) and `report_archives` (drops `approval_id`, adds
  `approval_event_id` + `worksheet_instance_id`)
- Hand-written SQL migration applied via existing
  `scripts/_apply-supabase-sql.ts`; Drizzle schema re-synced after for
  app-side types
- RLS smoke tests verify (a) standards library is read-only for
  authenticated users, (b) `approval_events` and `audit_log` reject
  UPDATE/DELETE at the DB level (no policies exist), (c) workflow tables
  are org-scoped via `org_members`

## App is broken after this PR

Intentional. Engine code, server actions, PDF loaders, and calculator
routes still reference the dropped tables. Plans 2–6 progressively
rewire the app:

- Plan 2: xlsx Importer
- Plan 3: Dynamic Form Renderer
- Plan 4: Approval State Machine + Audit
- Plan 5: Plan-6 Reattachment
- Plan 6: Pilot Seed + Cleanup + End-to-End

## Test plan

- [x] `pnpm test:rls` for the 5 new test files green
- [x] `pg_policy` shows no UPDATE/DELETE policies on
  `approval_events` / `audit_log`
- [ ] (Reviewer) Skim the migration SQL for FK targets and CHECK
  constraints
- [ ] (Reviewer) Skim the Drizzle schema diff for column name + type
  parity with the SQL

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: `gh` opens the PR in draft mode, prints the URL. Branch protection should NOT require green CI on draft PRs (because `pnpm typecheck` and `pnpm build` will fail until Plans 3–6 land). If branch protection blocks the draft, ask the user to relax it for the duration of the rebuild.

---

## Done Criteria for Plan 1

All seven of these must be true before declaring Plan 1 done:

1. Branch `feat/db-driven-schema` pushed to origin
2. Draft PR open against `main`
3. `pnpm test:rls -- tests/rls/standards-library-read.test.ts ...` (5 new files) all pass
4. `pg_policy` shows `approval_events` and `audit_log` have only INSERT + SELECT policies
5. The 11 new tables exist in dev Supabase (verified by the script in Task 8 Step 2)
6. `src/lib/db/schema.ts` exports the 11 new pgTable definitions; `pnpm drizzle-kit pull` reports no schema diff
7. `scripts/wipe-all-data.ts --yes` runs without error

Then proceed to write Plan 2 (xlsx Importer).
