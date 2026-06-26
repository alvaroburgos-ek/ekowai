# Access-Control Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `project_collaborators` (external client/designer per project) and harden authorization — RLS *and* a shared app-level guard — so no non-engineer can ever read questions (`fields`) or formulas (`equations`), and only internal engineers can write project data.

**Architecture:** Defense-in-depth (Approach A from the spec). RLS is the boundary for the Supabase Data API path; an app-level guard (`resolveProjectAccess` / `assertInternal`) is the boundary for the Drizzle server-action path, which bypasses RLS. Internal staff stay on `org_members`; external parties attach via the new `project_collaborators` table and are default-denied everywhere in this sub-project.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Drizzle ORM 0.45, Supabase Postgres (`@supabase/supabase-js` 2.x), Vitest 4 (projects: `unit`, `integration`, `rls`), pnpm.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-26-access-control-foundation-design.md`. This plan implements Sub-Project 1 only.
- **Two migration systems:** table DDL via Drizzle (`drizzle-kit generate` → `src/lib/db/migrations/`); RLS/policy SQL hand-written in `supabase/migrations/` with a `YYYYMMDDHHMMSS_name.sql` filename. Follow both.
- **Migrations are written, NOT auto-applied to prod.** Prod = Supabase project `vadsmshzebefjreqcicl`. Apply only to the test/local DB for the test cycle; prod cutover pauses for explicit user approval (repo cutover discipline).
- **RLS tests** live in `tests/rls/**`, run with `pnpm test:rls`, use the harness in `tests/rls/helpers.ts` (`admin()`, `makeUser()`, `makeOrg()`, `cleanup()`). They run against the Supabase project in `.env.local` (or `CI_SUPABASE_*`).
- **Append-only invariant:** never add UPDATE/DELETE policies to `approval_events` or `audit_log`.
- **Role values:** internal = `org_members.role` ∈ {owner, admin, engineer, viewer}; external = `project_collaborators.role` ∈ {client, designer}. The `member_role` enum is NOT modified.
- **Commit identity:** `Alvaro <alvaro.burgos@ekowai.com>` (repo default). Verify with `git log -1 --format='%an <%ae>'` after each commit.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/db/schema.ts` | Drizzle table definitions | add `projectCollaborators` |
| `src/lib/db/migrations/*` | generated table DDL | `drizzle-kit generate` output |
| `src/lib/db/__tests__/project-collaborators-schema.test.ts` | schema round-trip test | create |
| `src/lib/auth/project-access.ts` | `resolveProjectAccess` + `assertInternal` guard | create |
| `src/lib/auth/__tests__/project-access.integration.test.ts` | guard integration test | create |
| `src/lib/actions/worksheet.ts` | internal write action | add `assertInternal` gate |
| `supabase/migrations/20260626180000_access_control_foundation.sql` | RLS hardening + `project_collaborators` RLS | create |
| `scripts/rollback-20260626180000-access-control-foundation.sql` | rollback | create |
| `tests/rls/project-collaborators.test.ts` | collaborator deny + IP-lock RLS tests | create |
| `tests/rls/standards-library-read.test.ts` | existing — update for org-member gate | modify |
| `tests/rls/project-parameters-write.test.ts` | viewer-cannot-write test | create |
| `src/app/[locale]/(app)/layout.tsx` (or nearest app-shell layout) | redirect externals out of internal UI | modify |
| `src/app/[locale]/(portal)/page.tsx` | placeholder external portal landing | create |

---

## Task 1: `project_collaborators` table

**Files:**
- Modify: `src/lib/db/schema.ts` (after `projects`, before `standards`)
- Create: `src/lib/db/__tests__/project-collaborators-schema.test.ts`
- Generated: `src/lib/db/migrations/<drizzle-hash>_*.sql`

**Interfaces:**
- Produces: Drizzle table `projectCollaborators` with columns `{ id, projectId, userId, role, invitedBy, createdAt }` and `UNIQUE(projectId, userId)`.

- [ ] **Step 1: Add the Drizzle table** to `src/lib/db/schema.ts` immediately after the `projects` table definition:

```ts
export const projectCollaborators = pgTable(
  'project_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // references auth.users(id) in DB; kept as plain uuid like project_parameters.entered_by
    userId: uuid('user_id').notNull(),
    role: text('role').notNull(), // 'client' | 'designer' — CHECK enforced in SQL migration
    invitedBy: uuid('invited_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqProjectUser: unique().on(t.projectId, t.userId) }),
);
```

(`pgTable`, `uuid`, `text`, `timestamp`, `unique` are already imported at the top of `schema.ts`.)

- [ ] **Step 2: Generate the table migration**

Run: `pnpm db:generate`
Expected: a new file under `src/lib/db/migrations/` containing `CREATE TABLE "project_collaborators"` with the unique constraint and FK to `projects`.

- [ ] **Step 3: Write the schema round-trip test** — create `src/lib/db/__tests__/project-collaborators-schema.test.ts` (mirror `src/lib/db/__tests__/emission-factors-schema.test.ts` for env/import style; it is an `integration`-project test):

```ts
import { describe, it, expect, afterAll } from 'vitest';
import './_setup-env';
import { db } from '@/lib/db';
import { projectCollaborators } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

describe('project_collaborators schema', () => {
  it('table exists with expected columns', async () => {
    const rows = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'project_collaborators' ORDER BY column_name
    `);
    const cols = rows.map((r) => r.column_name as string);
    expect(cols).toEqual(
      ['created_at', 'id', 'invited_by', 'project_id', 'role', 'user_id'].sort(),
    );
  });

  afterAll(async () => {
    // no-op: read-only test
  });
});
```

- [ ] **Step 4: Register the test** — add `'src/lib/db/__tests__/project-collaborators-schema.test.ts'` to BOTH the `unit` project's `exclude` array and the `integration` project's `include` array in `vitest.config.ts` (mirroring how `emission-factors-schema.test.ts` is listed in both).

- [ ] **Step 5: Apply the table migration to the test DB**

Run: `pnpm db:migrate`
Expected: migration applies; `project_collaborators` now exists in the configured DB.

- [ ] **Step 6: Run the schema test**

Run: `pnpm test -- --project integration project-collaborators-schema`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/ src/lib/db/__tests__/project-collaborators-schema.test.ts vitest.config.ts
git commit -m "feat(access-control): add project_collaborators table"
```

---

## Task 2: App-level authorization guard

**Files:**
- Create: `src/lib/auth/project-access.ts`
- Create: `src/lib/auth/__tests__/project-access.integration.test.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `orgMembers`, `projects`, `projectCollaborators` (`@/lib/db/schema`).
- Produces:
  - `type AccessScope = 'internal' | 'client' | 'designer' | 'none'`
  - `interface ProjectAccess { scope: AccessScope; role: string | null; orgId: string | null }`
  - `async function resolveProjectAccess(userId: string, projectId: string): Promise<ProjectAccess>`
  - `class AccessDeniedError extends Error`
  - `function assertInternal(access: ProjectAccess): void` (throws `AccessDeniedError` unless `scope === 'internal'`)

- [ ] **Step 1: Write the failing integration test** — create `src/lib/auth/__tests__/project-access.integration.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../../db/__tests__/_setup-env';
import { admin } from '../../../../tests/rls/helpers';
import { resolveProjectAccess, assertInternal, AccessDeniedError } from '../project-access';

const ad = admin();
let orgId: string;
let projectId: string;
let engineerId: string;
let clientId: string;
let outsiderId: string;

beforeAll(async () => {
  const eng = await ad.auth.admin.createUser({ email: `pa-eng-${Date.now()}@t.local`, email_confirm: true, password: 'x' });
  const cli = await ad.auth.admin.createUser({ email: `pa-cli-${Date.now()}@t.local`, email_confirm: true, password: 'x' });
  const out = await ad.auth.admin.createUser({ email: `pa-out-${Date.now()}@t.local`, email_confirm: true, password: 'x' });
  engineerId = eng.data.user!.id; clientId = cli.data.user!.id; outsiderId = out.data.user!.id;

  const { data: org } = await ad.from('orgs').insert({ name: 'PA', slug: `pa-${Date.now()}` }).select('id').single();
  orgId = org!.id;
  await ad.from('org_members').insert({ org_id: orgId, user_id: engineerId, role: 'engineer' });
  const { data: proj } = await ad.from('projects').insert({ org_id: orgId, name: 'PA-P', created_by: engineerId }).select('id').single();
  projectId = proj!.id;
  await ad.from('project_collaborators').insert({ project_id: projectId, user_id: clientId, role: 'client', invited_by: engineerId });
});

afterAll(async () => {
  for (const id of [engineerId, clientId, outsiderId]) await ad.auth.admin.deleteUser(id);
});

describe('resolveProjectAccess', () => {
  it('org member → internal with role', async () => {
    const a = await resolveProjectAccess(engineerId, projectId);
    expect(a.scope).toBe('internal');
    expect(a.role).toBe('engineer');
    expect(a.orgId).toBe(orgId);
  });
  it('project collaborator → client', async () => {
    const a = await resolveProjectAccess(clientId, projectId);
    expect(a.scope).toBe('client');
  });
  it('unrelated user → none', async () => {
    const a = await resolveProjectAccess(outsiderId, projectId);
    expect(a.scope).toBe('none');
  });
});

describe('assertInternal', () => {
  it('passes for internal', async () => {
    const a = await resolveProjectAccess(engineerId, projectId);
    expect(() => assertInternal(a)).not.toThrow();
  });
  it('throws AccessDeniedError for client', async () => {
    const a = await resolveProjectAccess(clientId, projectId);
    expect(() => assertInternal(a)).toThrow(AccessDeniedError);
  });
});
```

- [ ] **Step 2: Register the test** — add its path to the `unit` project's `exclude` and the `integration` project's `include` in `vitest.config.ts`.

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test -- --project integration project-access`
Expected: FAIL — `Cannot find module '../project-access'`.

- [ ] **Step 4: Implement the guard** — create `src/lib/auth/project-access.ts`:

```ts
import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orgMembers, projects, projectCollaborators } from '@/lib/db/schema';

export type AccessScope = 'internal' | 'client' | 'designer' | 'none';

export interface ProjectAccess {
  scope: AccessScope;
  role: string | null; // org_members.role (internal) or collaborator role (external)
  orgId: string | null;
}

/**
 * Resolve the caller's effective access to a project. Internal staff are
 * identified via org_members on the project's org; external parties via
 * project_collaborators. Returns scope 'none' when neither matches.
 * Reads no IP — only membership rows.
 */
export async function resolveProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccess> {
  const proj = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (proj.length === 0) return { scope: 'none', role: null, orgId: null };
  const orgId = proj[0].orgId;

  const mem = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);
  if (mem.length > 0) return { scope: 'internal', role: mem[0].role, orgId };

  const collab = await db
    .select({ role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
      ),
    )
    .limit(1);
  if (collab.length > 0) {
    const role = collab[0].role;
    return { scope: role === 'designer' ? 'designer' : 'client', role, orgId };
  }

  return { scope: 'none', role: null, orgId };
}

export class AccessDeniedError extends Error {
  constructor(message = 'internal role required') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

/** Throws AccessDeniedError unless the caller is internal (an org member). */
export function assertInternal(access: ProjectAccess): void {
  if (access.scope !== 'internal') throw new AccessDeniedError();
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test -- --project integration project-access`
Expected: PASS (5 assertions).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/project-access.ts src/lib/auth/__tests__/project-access.integration.test.ts vitest.config.ts
git commit -m "feat(access-control): add resolveProjectAccess + assertInternal guard"
```

---

## Task 3: Gate `saveWorksheet` with `assertInternal`

**Files:**
- Modify: `src/lib/actions/worksheet.ts` (auth block near the top, ~L44–L60)
- Modify: `src/lib/actions/__tests__/worksheet.test.ts` (add a rejection test)

**Interfaces:**
- Consumes: `resolveProjectAccess`, `assertInternal`, `AccessDeniedError` from `@/lib/auth/project-access`.

- [ ] **Step 1: Read the current auth block** in `src/lib/actions/worksheet.ts` — find where it calls `supabase.auth.getUser()` and resolves the worksheet instance's `project_id`. Note the exact variable names (`auth.user.id`, the loaded instance, its `projectId`).

- [ ] **Step 2: Write the failing test** — append to `src/lib/actions/__tests__/worksheet.test.ts` a case that seeds a `project_collaborators` client for the project and asserts `saveWorksheet` rejects them. Mirror the file's existing setup (it seeds org/members via the admin client and stubs `auth.getUser`). Concretely, after the existing setup that yields `projectId` and a worksheet `instanceId`:

```ts
it('rejects a project collaborator (non-internal) caller', async () => {
  const ad = adminClient(); // the file's existing service-role client helper
  const { data: cli } = await ad.auth.admin.createUser({
    email: `ws-cli-${Date.now()}@t.local`, email_confirm: true, password: 'x',
  });
  await ad.from('project_collaborators').insert({
    project_id: projectId, user_id: cli!.user!.id, role: 'client', invited_by: userId,
  });
  stubAuthUser(cli!.user!.id); // the file's existing helper that makes auth.getUser return this id

  await expect(saveWorksheet(/* same args shape the other tests use */)).rejects.toThrow(/internal role required|access/i);

  await ad.auth.admin.deleteUser(cli!.user!.id);
});
```
> Use the EXACT helper names the test file already defines for the admin client, the auth stub, and the `saveWorksheet` argument shape — read them in Step 1 and match them; do not invent new helpers.

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test -- --project integration worksheet`
Expected: FAIL — the collaborator save currently succeeds (no gate).

- [ ] **Step 4: Add the gate** — in `src/lib/actions/worksheet.ts`, right after the user id and the worksheet instance's `projectId` are known (and before any write), insert:

```ts
import { resolveProjectAccess, assertInternal } from '@/lib/auth/project-access';

// ...inside saveWorksheet, after resolving auth.user.id and the instance's projectId:
const access = await resolveProjectAccess(auth.user.id, projectId);
assertInternal(access);
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test -- --project integration worksheet`
Expected: PASS (the new rejection test plus all pre-existing worksheet tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/worksheet.ts src/lib/actions/__tests__/worksheet.test.ts
git commit -m "feat(access-control): gate saveWorksheet with assertInternal"
```

---

## Task 4: RLS hardening migration + RLS tests

**Files:**
- Create: `supabase/migrations/20260626180000_access_control_foundation.sql`
- Create: `scripts/rollback-20260626180000-access-control-foundation.sql`
- Create: `tests/rls/project-collaborators.test.ts`
- Create: `tests/rls/project-parameters-write.test.ts`
- Modify: `tests/rls/standards-library-read.test.ts`

**Interfaces:**
- Consumes: `tests/rls/helpers.ts` (`admin`, `makeUser`, `makeOrg`, `cleanup`).

- [ ] **Step 1: Write the RLS migration** — create `supabase/migrations/20260626180000_access_control_foundation.sql`:

```sql
-- Access-Control Foundation (Sub-Project 1).
-- (A) Lock the standards library (questions + formulas) to internal org members.
-- (B) Restrict project-table writes to engineer+; reads stay org-scoped.
-- (C) RLS for project_collaborators.
-- Externals (never org_members) are default-denied on project tables in this sub-project.

-- (A) Library tables: replace USING(true) with an org-membership gate.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['standards','worksheet_templates','worksheet_sections','fields','equations','compliance_requirements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_authenticated', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()))
    $f$, t || '_read_internal', t);
  END LOOP;
END $$;

-- (B) Project workflow tables: split FOR ALL into org-scoped read + engineer-only write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_standards','worksheet_instances','project_parameters']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_all_org', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid()))
    $f$, t || '_select_internal', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_insert_engineer', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_update_engineer', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR DELETE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_delete_engineer', t);
  END LOOP;
END $$;

-- (C) project_collaborators RLS.
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_manage_internal ON project_collaborators;
CREATE POLICY pc_manage_internal ON project_collaborators FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')));

DROP POLICY IF EXISTS pc_read_own ON project_collaborators;
CREATE POLICY pc_read_own ON project_collaborators FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- CHECK constraint on role (the Drizzle column is plain text).
ALTER TABLE project_collaborators
  DROP CONSTRAINT IF EXISTS project_collaborators_role_check;
ALTER TABLE project_collaborators
  ADD CONSTRAINT project_collaborators_role_check CHECK (role IN ('client','designer'));
```

- [ ] **Step 2: Write the rollback** — create `scripts/rollback-20260626180000-access-control-foundation.sql`:

```sql
-- Rollback for 20260626180000_access_control_foundation.sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['standards','worksheet_templates','worksheet_sections','fields','equations','compliance_requirements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_internal', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read_authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['project_standards','worksheet_instances','project_parameters']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_engineer', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR ALL TO authenticated
      USING (project_id IN (SELECT p.id FROM projects p JOIN org_members om ON om.org_id=p.org_id WHERE om.user_id=auth.uid()))
      WITH CHECK (project_id IN (SELECT p.id FROM projects p JOIN org_members om ON om.org_id=p.org_id WHERE om.user_id=auth.uid()))
    $f$, t || '_all_org', t);
  END LOOP;
END $$;
-- project_collaborators dropped by Drizzle rollback; its policies go with it.
```

- [ ] **Step 3: Apply the migration to the test DB**

Apply `supabase/migrations/20260626180000_access_control_foundation.sql` to the configured test DB (same mechanism the existing `supabase/migrations/*rls*` files were applied with — Supabase CLI `db push`, or psql against `DATABASE_URL`). Confirm no error.

- [ ] **Step 4: Update the existing library-read test** — in `tests/rls/standards-library-read.test.ts`, the "authenticated user can SELECT from standards" case currently makes a bare user with no org; under the new gate that user must be an org member. Change it to attach the user to an org first:

```ts
import { admin, makeUser, makeOrg, cleanup } from './helpers';
// ...
it('internal org member can SELECT from standards', async () => {
  const u = await makeUser(e1);
  await makeOrg(u.client, u.id, 'Std Reader'); // <-- now required
  const ad = admin();
  const code = `TEST-${Date.now()}`;
  await ad.from('standards').insert({ code, title_de: 'Test Standard', version: 'Pass3c' });
  const { data, error } = await u.client.from('standards').select('*').eq('code', code);
  expect(error).toBeNull();
  expect(data?.length).toBe(1);
  await ad.from('standards').delete().eq('code', code);
});
```
Keep the existing "cannot INSERT" and "anonymous cannot SELECT" cases as-is.

- [ ] **Step 5: Write the collaborator IP-lock test** — create `tests/rls/project-collaborators.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_collaborators RLS — external parties are IP-locked', () => {
  const eng = `rls-pc-eng-${Date.now()}@t.local`;
  const cli = `rls-pc-cli-${Date.now()}@t.local`;
  afterAll(async () => cleanup([eng, cli]));

  it('a collaborator cannot read fields or equations, and cannot read project_parameters', async () => {
    const ad = admin();
    const e = await makeUser(eng);
    const orgId = await makeOrg(e.client, e.id, 'PC Org');
    const c = await makeUser(cli); // NOT an org member

    const { data: proj } = await ad.from('projects').insert({ org_id: orgId, name: 'PC-P', created_by: e.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `PC-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'PC-01', title_de: 'W' }).select('id').single();
    const { data: field } = await ad.from('fields').insert({ worksheet_template_id: tmpl!.id, symbol: 'X', label_de: 'Frage', data_type: 'number' }).select('id').single();
    await ad.from('equations').insert({ worksheet_template_id: tmpl!.id, equation_number: '1', formula: 'X = 1', output_symbol: 'X' });
    await ad.from('project_parameters').insert({ project_id: proj!.id, field_id: field!.id, value_number: 7, source_type: 'entered', entered_by: e.id });
    await ad.from('project_collaborators').insert({ project_id: proj!.id, user_id: c.id, role: 'client', invited_by: e.id });

    const fields = await c.client.from('fields').select('*').eq('id', field!.id);
    expect(fields.data ?? []).toEqual([]); // IP Layer 2: no question text

    const eqs = await c.client.from('equations').select('*').eq('worksheet_template_id', tmpl!.id);
    expect(eqs.data ?? []).toEqual([]); // no formulas

    const pp = await c.client.from('project_parameters').select('*').eq('project_id', proj!.id);
    expect(pp.data ?? []).toEqual([]); // default-deny on project data

    const own = await c.client.from('project_collaborators').select('*').eq('user_id', c.id);
    expect(own.data?.length).toBe(1); // may read only their own row
  });
});
```

- [ ] **Step 6: Write the write-restriction test** — create `tests/rls/project-parameters-write.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, cleanup } from './helpers';

describe('project_parameters RLS — viewer cannot write', () => {
  const v = `rls-ppw-${Date.now()}@t.local`;
  afterAll(async () => cleanup([v]));

  it('a viewer org member cannot INSERT project_parameters', async () => {
    const ad = admin();
    const u = await makeUser(v);
    const { data: org } = await ad.from('orgs').insert({ name: 'VW', slug: `vw-${Date.now()}` }).select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: u.id, role: 'viewer' });
    const { data: proj } = await ad.from('projects').insert({ org_id: org!.id, name: 'VW-P', created_by: u.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `VW-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'VW-01', title_de: 'W' }).select('id').single();
    const { data: field } = await ad.from('fields').insert({ worksheet_template_id: tmpl!.id, symbol: 'Y', label_de: 'Y', data_type: 'number' }).select('id').single();

    const { error } = await u.client.from('project_parameters').insert({
      project_id: proj!.id, field_id: field!.id, value_number: 1, source_type: 'entered', entered_by: u.id,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security|permission denied/i);
  });
});
```

- [ ] **Step 7: Run the RLS suite**

Run: `pnpm test:rls`
Expected: PASS — new `project-collaborators` + `project-parameters-write` tests green, updated `standards-library-read` green, and all other `tests/rls/**` still green (the org-scoped read tests already attach users to orgs, so they remain valid).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260626180000_access_control_foundation.sql scripts/rollback-20260626180000-access-control-foundation.sql tests/rls/
git commit -m "feat(access-control): RLS — lock library to internal, engineer-only writes, collaborator deny"
```

---

## Task 5: Route external users to a placeholder portal

**Files:**
- Create: `src/app/[locale]/(portal)/page.tsx`
- Modify: the internal app-shell layout (read `src/app/[locale]/(app)/layout.tsx`; if absent, the nearest layout wrapping `(app)/projects`).

**Interfaces:**
- Consumes: the existing server-side Supabase client (`@/lib/supabase/server` `createClient`) and `db` + `orgMembers` to check internal membership.

- [ ] **Step 1: Read the app-shell layout** to learn the existing auth pattern (how the current user is fetched server-side, how redirects are done — `redirect()` from `next/navigation`). Match it.

- [ ] **Step 2: Add the membership redirect** — in the internal app-shell layout, after the user is resolved, redirect non-org-members to the portal:

```ts
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// after `const { data: { user } } = await supabase.auth.getUser()` and the existing
// "not signed in" redirect:
const membership = await db
  .select({ userId: orgMembers.userId })
  .from(orgMembers)
  .where(eq(orgMembers.userId, user.id))
  .limit(1);
if (membership.length === 0) redirect(`/${locale}/portal`);
```
(Use the layout's existing `locale` param; match its import style.)

- [ ] **Step 3: Create the placeholder portal** — create `src/app/[locale]/(portal)/page.tsx`:

```tsx
export default function PortalLanding() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>EKOWAI</h1>
      <p>Ihr Zugang ist eingerichtet. Sobald Inhalte für Sie freigegeben sind, erscheinen sie hier.</p>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 5: Build smoke (routes compile)**

Run: `pnpm build`
Expected: build succeeds; `(portal)` route present.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/
git commit -m "feat(access-control): route external users to placeholder portal"
```

---

## Final gate

- [ ] Run `pnpm test` (unit), `pnpm test -- --project integration`, `pnpm test:rls`, `pnpm typecheck` — all green.
- [ ] Confirm the migration is NOT applied to prod (`vadsmshzebefjreqcicl`); cutover pauses for explicit user approval.
- [ ] Confirm every commit author reads `Alvaro <alvaro.burgos@ekowai.com>`.

---

## Self-Review

- **Spec coverage:** §4.2 table → Task 1; §4.3 guard → Task 2 + wiring Task 3; §4.4 RLS (library gate, engineer-only writes, collaborator policies, role CHECK) → Task 4; §4.5 routing → Task 5; §5 tests (both paths + append-only regression) → Tasks 2/3/4 (the append-only `tests/rls/*immutable*` tests already exist and stay green — no policy added to them). Deferred items (§2) carry no tasks by design.
- **Placeholder scan:** every code step carries real code; the two "read the existing file first" steps (Task 3 Step 1, Task 5 Step 1) name exact files and the exact symbols to match, because the precise helper/arg shapes live in files the implementer must not diverge from — these are match-the-pattern instructions, not placeholders.
- **Type consistency:** `resolveProjectAccess` / `assertInternal` / `AccessDeniedError` / `ProjectAccess` / `AccessScope` are defined once (Task 2) and consumed with the same names in Tasks 2, 3. Table name `project_collaborators` and columns are identical across Tasks 1, 2, 4. Policy names in the migration (Task 4 Step 1) match those dropped in the rollback (Step 2).
