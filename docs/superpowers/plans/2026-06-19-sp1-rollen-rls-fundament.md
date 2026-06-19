# SP-1 — Rollen-Fundament + RLS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-scoped `client` and `designer` roles and enforce — at the database level — that no external participant can read EKOWAI's questions (`fields`) or formulas (`equations`), while engineers keep full access.

**Architecture:** External participants live in a new `project_members` table (project-scoped); internal staff stay in `org_members` (org-scoped). "Staff" = has an `org_members` row. The only RLS leak today is the standards library being `USING(true)`; we tighten it to staff-only. Externals are already denied by every org-based policy. Clients consume an IP-stripped payload through curated server actions (service role) — never a direct table read. RLS hard-deny makes the IP invariant trivially provable.

**Tech Stack:** Next.js 16 (App Router, RSC), Supabase (Postgres + RLS + PostgREST), Drizzle ORM (hand-synced schema), raw SQL migrations under `supabase/migrations/` applied via `scripts/_apply-supabase-sql.ts`, Vitest (`unit` + `rls` projects).

**Spec:** `docs/superpowers/specs/2026-06-19-sp1-rollen-rls-fundament-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `supabase/migrations/20260619120000_external_roles_enum.sql` | Add `client`/`designer` to `member_role` enum (own file — must commit before any CHECK uses the values) | Create |
| `supabase/migrations/20260619120100_project_members_and_ip_rls.sql` | `project_members` table + grants + RLS; swap standards-library SELECT to staff-only | Create |
| `src/lib/db/schema.ts` | Mirror enum + `project_members` for the ORM/types | Modify |
| `tests/rls/helpers.ts` | Add `makeExternal()` helper | Modify |
| `tests/rls/external-roles.test.ts` | The IP-boundary invariant tests | Create |
| `src/lib/auth/membership-resolve.ts` | Pure `resolveMembership()` + `Membership` type (no IO — unit-testable) | Create |
| `src/lib/auth/__tests__/membership-resolve.test.ts` | Unit test for staff-first precedence | Create |
| `src/lib/auth/membership.ts` | `getMembership` / `getCurrentMembership` / `requireStaff` / `requireExternal` (server-only, service-role lookup) | Create |
| `src/lib/actions/client-view.ts` | Pure `buildClientProjectView()` — curation logic (no IO) | Create |
| `src/lib/actions/__tests__/client-view.test.ts` | Unit test: only computed/derived, no question text leak | Create |
| `src/lib/actions/client-portal.ts` | Server actions `getClientProjectView` / `getDesignerTasks` (auth + fetch + curate) | Create |
| `src/app/[locale]/(app)/layout.tsx` | Redirect external members to `/portal` | Modify |
| `src/app/[locale]/(portal)/layout.tsx` | Portal shell; deny staff (send to `/projects`) | Create |
| `src/app/[locale]/(portal)/portal/page.tsx` | Client outcome stub / designer task stub | Create |
| `scripts/add-project-member.ts` | CLI to add a user as `client`/`designer` on a project (done-when) | Create |

---

## Task 1: RLS invariant tests + `makeExternal` helper (write the failing tests first)

**Files:**
- Modify: `tests/rls/helpers.ts`
- Test: `tests/rls/external-roles.test.ts`

- [ ] **Step 1: Add `makeExternal` to the RLS helpers**

Append to `tests/rls/helpers.ts`:

```ts
export async function makeExternal(
  projectId: string,
  userId: string,
  role: 'client' | 'designer',
  invitedBy: string,
): Promise<void> {
  const a = admin();
  const { error } = await a.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role,
    invited_by: invitedBy,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Write the invariant tests**

Create `tests/rls/external-roles.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, makeExternal, cleanup } from './helpers';

const ts = Date.now();
const staffEmail = `rls-ext-staff-${ts}@test.local`;
const clientEmail = `rls-ext-client-${ts}@test.local`;
const designerEmail = `rls-ext-designer-${ts}@test.local`;
const foreignEmail = `rls-ext-foreign-${ts}@test.local`;

describe('external roles (client/designer) — IP boundary RLS', () => {
  afterAll(async () => cleanup([staffEmail, clientEmail, designerEmail, foreignEmail]));

  async function seedProjectWithLibrary() {
    const ad = admin();
    const staff = await makeUser(staffEmail);
    const org = await makeOrg(staff.client, staff.id, 'IP Boundary Org');
    const { data: proj } = await ad.from('projects')
      .insert({ org_id: org, name: 'P', created_by: staff.id }).select('id').single();
    const { data: std } = await ad.from('standards')
      .insert({ code: `IP-${ts}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'IP-01', title_de: 'W' }).select('id').single();
    const { data: field } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl!.id, symbol: 'x', label_de: 'Geheime Frage?', data_type: 'number' })
      .select('id').single();
    await ad.from('equations')
      .insert({ worksheet_template_id: tmpl!.id, equation_number: 'Gl1', formula: 'a*b' });
    const { data: inst } = await ad.from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();
    await ad.from('project_parameters').insert({
      project_id: proj!.id, field_id: field!.id, value_number: 42,
      source_type: 'computed', entered_by: staff.id,
    });
    return { staff, projectId: proj!.id };
  }

  it('client cannot read fields or equations; staff still can', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await makeUser(clientEmail);
    await makeExternal(projectId, client.id, 'client', staff.id);

    const cf = await client.client.from('fields').select('id');
    expect(cf.data ?? []).toHaveLength(0);
    const ce = await client.client.from('equations').select('id');
    expect(ce.data ?? []).toHaveLength(0);

    const sf = await staff.client.from('fields').select('id');
    expect((sf.data ?? []).length).toBeGreaterThan(0);
  });

  it('client cannot read project_parameters directly (curated path only)', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await makeUser(`rls-ext-client2-${ts}@test.local`);
    await makeExternal(projectId, client.id, 'client', staff.id);
    const pp = await client.client.from('project_parameters').select('id');
    expect(pp.data ?? []).toHaveLength(0);
    await cleanup([`rls-ext-client2-${ts}@test.local`]);
  });

  it('designer cannot read worksheet_instances or project_parameters', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const designer = await makeUser(designerEmail);
    await makeExternal(projectId, designer.id, 'designer', staff.id);
    const wi = await designer.client.from('worksheet_instances').select('id');
    expect(wi.data ?? []).toHaveLength(0);
    const pp = await designer.client.from('project_parameters').select('id');
    expect(pp.data ?? []).toHaveLength(0);
  });

  it('external reads only its own project_members row', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await makeUser(`rls-ext-self-${ts}@test.local`);
    await makeExternal(projectId, client.id, 'client', staff.id);
    const own = await client.client.from('project_members').select('user_id');
    expect((own.data ?? []).every((r) => r.user_id === client.id)).toBe(true);
    expect((own.data ?? []).length).toBe(1);
    await cleanup([`rls-ext-self-${ts}@test.local`]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:rls -- external-roles`
Expected: FAIL — `project_members` table does not exist / inserts error (relation "project_members" does not exist). This proves the tests exercise the not-yet-built schema.

- [ ] **Step 4: Commit**

```bash
git add tests/rls/helpers.ts tests/rls/external-roles.test.ts
git commit -m "test(rls): external-role IP-boundary invariants (failing)"
```

---

## Task 2: Migration — `member_role` enum values

**Files:**
- Create: `supabase/migrations/20260619120000_external_roles_enum.sql`

- [ ] **Step 1: Write the enum migration**

`ALTER TYPE ... ADD VALUE` is additive and the new value cannot be used by a CHECK constraint until its transaction commits — so it lives in its own file (each file is applied as a separate transaction by `_apply-supabase-sql.ts`). No `BEGIN/COMMIT` wrapper.

```sql
-- Add external participant roles to the member_role enum.
-- Own migration file: the new values must be committed before
-- 20260619120100 references them in a CHECK constraint.
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'designer';
```

- [ ] **Step 2: Commit (apply happens in Task 4)**

```bash
git add supabase/migrations/20260619120000_external_roles_enum.sql
git commit -m "feat(db): add client/designer to member_role enum"
```

---

## Task 3: Migration — `project_members` table + IP-Layer-2 RLS fix

**Files:**
- Create: `supabase/migrations/20260619120100_project_members_and_ip_rls.sql`

- [ ] **Step 1: Write the table + RLS migration**

```sql
BEGIN;

-- ----- project_members: project-scoped external participants -----------------
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       member_role NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT project_members_external_role CHECK (role IN ('client','designer'))
);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);

-- Table-level grants (RLS governs rows; PostgREST needs the table grant first)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- External participant reads only its own membership row(s)
CREATE POLICY "project_members_select_self"
  ON project_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff (org members of the project's org) read + manage memberships
CREATE POLICY "project_members_all_staff"
  ON project_members FOR ALL TO authenticated
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

-- ----- IP-Layer-2 fix: standards library readable by STAFF ONLY --------------
-- Was USING(true) → any authenticated user (incl. external client/designer)
-- could read every question and formula. Now gated on "is staff" (has an
-- org_members row). Externals get zero rows. service_role bypasses RLS, so the
-- curated server actions can still read the library to build outcomes.
DROP POLICY IF EXISTS "standards_read_authenticated"               ON standards;
DROP POLICY IF EXISTS "worksheet_templates_read_authenticated"     ON worksheet_templates;
DROP POLICY IF EXISTS "worksheet_sections_read_authenticated"      ON worksheet_sections;
DROP POLICY IF EXISTS "fields_read_authenticated"                  ON fields;
DROP POLICY IF EXISTS "equations_read_authenticated"               ON equations;
DROP POLICY IF EXISTS "compliance_requirements_read_authenticated" ON compliance_requirements;

CREATE POLICY "standards_read_staff" ON standards
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "worksheet_templates_read_staff" ON worksheet_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "worksheet_sections_read_staff" ON worksheet_sections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "fields_read_staff" ON fields
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "equations_read_staff" ON equations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "compliance_requirements_read_staff" ON compliance_requirements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));

COMMIT;
```

- [ ] **Step 2: Commit (apply happens in Task 4)**

```bash
git add supabase/migrations/20260619120100_project_members_and_ip_rls.sql
git commit -m "feat(db): project_members table + staff-only standards-library RLS"
```

---

## Task 4: Apply migrations, run the RLS tests green

**Files:** none (DB action)

> **Execution gate:** `DATABASE_URL` in `.env.local` points at a live Supabase project (prod = `vadsmshzebefjreqcicl`). Confirm the target before applying. Migrations are additive (new enum values, new table, swapped read policies) and idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`), but applying to prod is still a real action — get explicit go-ahead.

- [ ] **Step 1: Apply the two migrations in order**

Run:
```bash
pnpm tsx scripts/_apply-supabase-sql.ts \
  supabase/migrations/20260619120000_external_roles_enum.sql \
  supabase/migrations/20260619120100_project_members_and_ip_rls.sql
```
Expected: `Applying ...enum.sql...` then `Applying ...ip_rls.sql...` then `Done.` with no error.

(Alternative if the importer can't run: apply each file's SQL via the Supabase MCP `apply_migration` tool, same order.)

- [ ] **Step 2: Run the RLS invariant tests**

Run: `pnpm test:rls -- external-roles`
Expected: PASS — all four tests green.

- [ ] **Step 3: Run the full RLS suite (no regression)**

Run: `pnpm test:rls`
Expected: PASS — existing org/approval/audit RLS tests still green (engineers unaffected; the standards-library policy still admits staff).

- [ ] **Step 4: Commit (test snapshot only — code already committed)**

No code change here; if `.env`/lockfiles changed, do not commit them. Skip commit if nothing changed.

---

## Task 5: Drizzle schema mirror

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Extend the enum literal**

In `src/lib/db/schema.ts`, change `memberRoleEnum`:

```ts
export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'engineer',
  'viewer',
  'client',
  'designer',
]);
```

- [ ] **Step 2: Add the `projectMembers` table (after `orgMembers`, around line 75)**

```ts
export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    // Only 'client' | 'designer' are ever stored here (DB CHECK enforces it);
    // internal staff live in org_members.
    role: memberRoleEnum('role').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
    userIdx: index('project_members_user_idx').on(t.userId),
  }),
);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no type errors introduced).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): mirror project_members + external roles in Drizzle schema"
```

---

## Task 6: Membership resolution (pure logic, TDD)

**Files:**
- Create: `src/lib/auth/membership-resolve.ts`
- Test: `src/lib/auth/__tests__/membership-resolve.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/auth/__tests__/membership-resolve.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveMembership } from '../membership-resolve';

describe('resolveMembership', () => {
  it('returns staff when an org_members row exists', () => {
    expect(resolveMembership({ role: 'engineer' }, null)).toEqual({
      kind: 'staff',
      orgRole: 'engineer',
    });
  });

  it('returns external when only a project_members row exists', () => {
    expect(resolveMembership(null, { project_id: 'p1', role: 'client' })).toEqual({
      kind: 'external',
      projectId: 'p1',
      role: 'client',
    });
  });

  it('prefers staff when both rows exist (no portal downgrade)', () => {
    expect(
      resolveMembership({ role: 'owner' }, { project_id: 'p1', role: 'designer' }),
    ).toEqual({ kind: 'staff', orgRole: 'owner' });
  });

  it('returns null when neither row exists', () => {
    expect(resolveMembership(null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- membership-resolve`
Expected: FAIL — cannot find module `../membership-resolve`.

- [ ] **Step 3: Implement the pure resolver**

Create `src/lib/auth/membership-resolve.ts`:

```ts
export type OrgRole = 'owner' | 'admin' | 'engineer' | 'viewer';
export type ExternalRole = 'client' | 'designer';

export type Membership =
  | { kind: 'staff'; orgRole: OrgRole }
  | { kind: 'external'; projectId: string; role: ExternalRole }
  | null;

/** Pure precedence rule. Staff (org_members) wins over external
 * (project_members): a user with both rows counts as staff, so an engineer can
 * never be downgraded into a portal by a stray project_members row. */
export function resolveMembership(
  orgRow: { role: OrgRole } | null,
  pmRow: { project_id: string; role: ExternalRole } | null,
): Membership {
  if (orgRow) return { kind: 'staff', orgRole: orgRow.role };
  if (pmRow) return { kind: 'external', projectId: pmRow.project_id, role: pmRow.role };
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- membership-resolve`
Expected: PASS — all four cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/membership-resolve.ts src/lib/auth/__tests__/membership-resolve.test.ts
git commit -m "feat(auth): pure resolveMembership with staff-first precedence"
```

---

## Task 7: Membership server helpers (service-role lookup + guards)

**Files:**
- Create: `src/lib/auth/membership.ts`

- [ ] **Step 1: Implement the server helpers**

Create `src/lib/auth/membership.ts`:

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolveMembership,
  type Membership,
  type OrgRole,
  type ExternalRole,
} from './membership-resolve';

export type { Membership, OrgRole, ExternalRole };

/** Resolve a user's membership using the service-role client (not subject to
 * RLS, so the lookup itself never leaks/limits). Staff resolved first. */
export async function getMembership(userId: string): Promise<Membership> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const { data: pm } = org
    ? { data: null }
    : await admin
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
  return resolveMembership(
    org ? { role: org.role as OrgRole } : null,
    pm ? { project_id: pm.project_id as string, role: pm.role as ExternalRole } : null,
  );
}

/** Current authenticated user + their membership, or null when unauthenticated. */
export async function getCurrentMembership(): Promise<
  { userId: string; membership: Membership } | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, membership: await getMembership(user.id) };
}

/** For staff-only routes: redirect external members to their portal. */
export async function requireStaff(locale: string): Promise<void> {
  const ctx = await getCurrentMembership();
  if (ctx?.membership?.kind === 'external') redirect(`/${locale}/portal`);
}

/** For portal routes: redirect staff to the app, unauthenticated to login. */
export async function requireExternal(
  locale: string,
): Promise<{ projectId: string; role: ExternalRole }> {
  const ctx = await getCurrentMembership();
  if (!ctx) redirect(`/${locale}/login`);
  if (ctx!.membership?.kind !== 'external') redirect(`/${locale}/projects`);
  const m = ctx!.membership;
  return { projectId: m.projectId, role: m.role };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/membership.ts
git commit -m "feat(auth): getMembership + requireStaff/requireExternal guards"
```

---

## Task 8: Client view curation (pure logic, TDD)

**Files:**
- Create: `src/lib/actions/client-view.ts`
- Test: `src/lib/actions/__tests__/client-view.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/actions/__tests__/client-view.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildClientProjectView } from '../client-view';

const project = { name: 'PLT-HS-01', project_code: 'HS-01', location: 'Hamburg' };

describe('buildClientProjectView', () => {
  it('exposes only computed/derived outcomes, never entered', () => {
    const view = buildClientProjectView({
      project,
      params: [
        { field_id: 'f1', source_type: 'computed', value_number: 42, value_text: null, value_enum: null },
        { field_id: 'f2', source_type: 'entered', value_number: 7, value_text: null, value_enum: null },
        { field_id: 'f3', source_type: 'derived', value_number: null, value_text: 'OK', value_enum: null },
      ],
      fieldsById: {
        f1: { symbol: 'Q_S', unit: 'l/s', label_de: 'GEHEIME FRAGE' },
        f2: { symbol: 'k_f', unit: 'm/s', label_de: 'GEHEIME FRAGE' },
        f3: { symbol: 'Status', unit: null, label_de: 'GEHEIME FRAGE' },
      },
      instances: [{ status: 'final' }, { status: 'engineer_approved' }, { status: 'draft' }],
    });

    const labels = view.outcomes.map((o) => o.label);
    expect(labels).toContain('Q_S');
    expect(labels).toContain('Status');
    expect(labels).not.toContain('k_f'); // entered → excluded
  });

  it('never leaks the field question text (label_de) into any outcome field', () => {
    const view = buildClientProjectView({
      project,
      params: [{ field_id: 'f1', source_type: 'computed', value_number: 1, value_text: null, value_enum: null }],
      fieldsById: { f1: { symbol: 'Q_S', unit: 'l/s', label_de: 'GEHEIME FRAGE' } },
      instances: [],
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('GEHEIME FRAGE');
  });

  it('computes progress as approved/final over total worksheets', () => {
    const view = buildClientProjectView({
      project,
      params: [],
      fieldsById: {},
      instances: [{ status: 'final' }, { status: 'engineer_approved' }, { status: 'draft' }, { status: 'submitted_for_review' }],
    });
    expect(view.progress).toEqual({ worksheetsTotal: 4, worksheetsApproved: 2, percent: 50 });
  });

  it('progress is 0% with no worksheets (no divide-by-zero)', () => {
    const view = buildClientProjectView({ project, params: [], fieldsById: {}, instances: [] });
    expect(view.progress.percent).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- client-view`
Expected: FAIL — cannot find module `../client-view`.

- [ ] **Step 3: Implement the pure curation**

Create `src/lib/actions/client-view.ts`:

```ts
const CLIENT_VISIBLE_SOURCE_TYPES = new Set(['computed', 'derived']);
const APPROVED_STATUSES = new Set(['engineer_approved', 'final']);

export type CurationParam = {
  field_id: string;
  source_type: string;
  value_number: number | null;
  value_text: string | null;
  value_enum: string | null;
};
export type CurationField = { symbol: string; unit: string | null; label_de: string };
export type CurationInstance = { status: string };

export type ClientProjectView = {
  project: { name: string; code: string | null; location: string | null };
  outcomes: Array<{ label: string; value: string; unit: string | null }>;
  progress: { worksheetsTotal: number; worksheetsApproved: number; percent: number };
};

function paramValue(p: CurationParam): string | null {
  if (p.value_number !== null) return String(p.value_number);
  if (p.value_text !== null) return p.value_text;
  if (p.value_enum !== null) return p.value_enum;
  return null;
}

/** Curate a client-safe view. Outcomes are ONLY computed/derived parameters,
 * labelled by the neutral field SYMBOL (never label_de / the question text and
 * never a formula). Pure — all IO happens in the calling server action. */
export function buildClientProjectView(input: {
  project: { name: string; project_code: string | null; location: string | null };
  params: CurationParam[];
  fieldsById: Record<string, CurationField>;
  instances: CurationInstance[];
}): ClientProjectView {
  const outcomes = input.params
    .filter((p) => CLIENT_VISIBLE_SOURCE_TYPES.has(p.source_type))
    .map((p) => {
      const field = input.fieldsById[p.field_id];
      const value = paramValue(p);
      if (!field || value === null) return null;
      return { label: field.symbol, value, unit: field.unit };
    })
    .filter((o): o is { label: string; value: string; unit: string | null } => o !== null);

  const total = input.instances.length;
  const approved = input.instances.filter((i) => APPROVED_STATUSES.has(i.status)).length;
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100);

  return {
    project: {
      name: input.project.name,
      code: input.project.project_code,
      location: input.project.location,
    },
    outcomes,
    progress: { worksheetsTotal: total, worksheetsApproved: approved, percent },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- client-view`
Expected: PASS — all four cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/client-view.ts src/lib/actions/__tests__/client-view.test.ts
git commit -m "feat(portal): pure buildClientProjectView curation (IP-stripped)"
```

---

## Task 9: Client-portal server actions (auth + fetch + curate)

**Files:**
- Create: `src/lib/actions/client-portal.ts`

- [ ] **Step 1: Implement the server actions**

Create `src/lib/actions/client-portal.ts`:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMembership } from '@/lib/auth/membership';
import {
  buildClientProjectView,
  type ClientProjectView,
  type CurationField,
} from './client-view';

/** The ONLY client data path. Runs as service role (bypasses RLS) but
 * self-checks that the caller is the client of exactly this project, so it can
 * never be used to read a foreign project. Returns null on any failure. */
export async function getClientProjectView(
  projectId: string,
): Promise<ClientProjectView | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await getMembership(user.id);
  if (
    !membership ||
    membership.kind !== 'external' ||
    membership.role !== 'client' ||
    membership.projectId !== projectId
  ) {
    return null;
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('name, project_code, location')
    .eq('id', projectId)
    .single();
  if (!project) return null;

  const { data: params } = await admin
    .from('project_parameters')
    .select('field_id, source_type, value_number, value_text, value_enum')
    .eq('project_id', projectId)
    .in('source_type', ['computed', 'derived']);

  const fieldIds = [...new Set((params ?? []).map((p) => p.field_id))];
  const fieldsById: Record<string, CurationField> = {};
  if (fieldIds.length > 0) {
    const { data: fields } = await admin
      .from('fields')
      .select('id, symbol, unit, label_de')
      .in('id', fieldIds);
    for (const f of fields ?? []) {
      fieldsById[f.id] = { symbol: f.symbol, unit: f.unit, label_de: f.label_de };
    }
  }

  const { data: instances } = await admin
    .from('worksheet_instances')
    .select('status')
    .eq('project_id', projectId);

  return buildClientProjectView({
    project,
    params: params ?? [],
    fieldsById,
    instances: instances ?? [],
  });
}

/** Designer hand-off is delivered via the Task Brief (SP-4). In SP-1 there is
 * no designer data path yet — return an empty list. */
export async function getDesignerTasks(_projectId: string): Promise<never[]> {
  return [];
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/client-portal.ts
git commit -m "feat(portal): getClientProjectView server action (curated, self-checked)"
```

---

## Task 10: Portal routing skeleton + external redirect

**Files:**
- Modify: `src/app/[locale]/(app)/layout.tsx`
- Create: `src/app/[locale]/(portal)/layout.tsx`
- Create: `src/app/[locale]/(portal)/portal/page.tsx`

- [ ] **Step 1: Redirect external members out of the staff app**

In `src/app/[locale]/(app)/layout.tsx`, add the membership check after the `if (!user)` block (before the `return`). New imports + logic:

```ts
import { getMembership } from '@/lib/auth/membership';
```

```ts
  // External participants (client/designer) never see the staff app.
  const membership = await getMembership(user.id);
  if (membership?.kind === 'external') {
    redirect(`/${locale}/portal`);
  }
```

- [ ] **Step 2: Create the portal layout (deny staff)**

Create `src/app/[locale]/(portal)/layout.tsx`:

```tsx
import { requireExternal } from '@/lib/auth/membership';
import type { Locale } from '@/lib/i18n/config';
import { Footer } from '@/components/layout/footer';

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Redirects staff → /projects, unauthenticated → /login.
  await requireExternal(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4 text-sm font-medium">EKOWAI — Portal</header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-12 pb-24">{children}</main>
      <Footer locale={locale as Locale} />
    </div>
  );
}
```

- [ ] **Step 3: Create the portal page (client outcome stub / designer task stub)**

Create `src/app/[locale]/(portal)/portal/page.tsx`:

```tsx
import { requireExternal } from '@/lib/auth/membership';
import { getClientProjectView } from '@/lib/actions/client-portal';

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { projectId, role } = await requireExternal(locale);

  if (role === 'designer') {
    return (
      <section>
        <h1 className="text-xl font-semibold">Aufgaben</h1>
        <p className="mt-4 text-sm text-gray-600">
          Noch keine Aufgaben. Sobald der Ingenieur einen Task Brief freigibt, erscheint er hier.
        </p>
      </section>
    );
  }

  const view = await getClientProjectView(projectId);
  if (!view) {
    return <p className="text-sm text-gray-600">Projekt nicht verfügbar.</p>;
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">{view.project.name}</h1>
        {view.project.location && (
          <p className="text-sm text-gray-600">{view.project.location}</p>
        )}
      </header>

      <div>
        <h2 className="text-sm font-medium">Fortschritt</h2>
        <p className="mt-1 text-2xl font-semibold">{view.progress.percent}%</p>
        <p className="text-xs text-gray-500">
          {view.progress.worksheetsApproved} / {view.progress.worksheetsTotal} Arbeitsblätter freigegeben
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Ergebnisse</h2>
        <ul className="mt-2 divide-y text-sm">
          {view.outcomes.map((o) => (
            <li key={o.label} className="flex justify-between py-2">
              <span className="text-gray-600">{o.label}</span>
              <span className="font-medium">
                {o.value}
                {o.unit ? ` ${o.unit}` : ''}
              </span>
            </li>
          ))}
          {view.outcomes.length === 0 && (
            <li className="py-2 text-gray-500">Noch keine Ergebnisse verfügbar.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/layout.tsx" "src/app/[locale]/(portal)/layout.tsx" "src/app/[locale]/(portal)/portal/page.tsx"
git commit -m "feat(portal): route external members to /portal with client/designer stubs"
```

---

## Task 11: CLI — add a project member (done-when)

**Files:**
- Create: `scripts/add-project-member.ts`

- [ ] **Step 1: Implement the CLI**

Create `scripts/add-project-member.ts` (mirrors `create-user.ts` conventions — `--email`, optional `--password` to create, `--project`, `--role`):

```ts
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error('Missing env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL)');
  process.exit(1);
}

const args = process.argv.slice(2);
const get = (k: string) => args.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1);
const email = get('--email');
const password = get('--password');
const projectId = get('--project');
const role = (get('--role') ?? 'client') as 'client' | 'designer';
const invitedBy = get('--invited-by'); // optional profiles.id of the inviting engineer

if (!email || !projectId || (role !== 'client' && role !== 'designer')) {
  console.error(
    'Usage: pnpm tsx scripts/add-project-member.ts --email=foo@bar.tld --project=<projectId> --role=client|designer [--password=Secret123] [--invited-by=<profileId>]',
  );
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find or create the auth user.
  const { data: list } = await admin.auth.admin.listUsers();
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    if (!password) {
      console.error('User does not exist — pass --password to create them.');
      process.exit(1);
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: email!,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('createUser failed');
    userId = data.user.id;
    console.log(`✓ User created: ${userId}`);
  } else {
    console.log(`ℹ User exists: ${userId}`);
  }

  const sql = postgres(DATABASE_URL!, { prepare: false });
  try {
    // Ensure a profile row exists (the auth trigger usually creates it).
    await sql`INSERT INTO profiles (id, email) VALUES (${userId}, ${email})
              ON CONFLICT (id) DO NOTHING`;

    const inviter = invitedBy ?? userId; // fall back to self when not given
    await sql`
      INSERT INTO project_members (project_id, user_id, role, invited_by)
      VALUES (${projectId}, ${userId}, ${role}, ${inviter})
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = ${role}
    `;
    console.log(`✓ ${email} added to project ${projectId} as ${role}`);
  } finally {
    await sql.end();
  }
  console.log('Done. They can log in at /de/login and will land on /de/portal.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/add-project-member.ts
git commit -m "feat(scripts): add-project-member CLI for client/designer onboarding"
```

---

## Task 12: Full verification

**Files:** none

- [ ] **Step 1: Run unit + rls suites**

Run: `pnpm test && pnpm test:rls`
Expected: PASS — including `membership-resolve`, `client-view`, and `external-roles`. No regressions.

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual done-when smoke (optional, needs a real project id)**

```bash
pnpm tsx scripts/add-project-member.ts --email=client-demo@test.local --password=Secret123 --project=<PLT-HS-01 id> --role=client
```
Then log in as that user at `/de/login` → expect to land on `/de/portal` showing the outcome/progress stub, with no access to `/de/projects`.

- [ ] **Step 4: Final no-op commit check**

```bash
git status   # working tree clean; all tasks committed
```

---

## Self-Review

**Spec coverage:**
- Enum extension (T1) → Tasks 2, 5. ✓
- `project_members` table → Tasks 3, 5. ✓
- Standards-library staff-only RLS (the IP fix) → Task 3, proven by Task 1/4 tests. ✓
- Server-action-curated client access + RLS hard-deny → Tasks 8, 9; deny proven by Task 1. ✓
- Staff-first membership resolution → Tasks 6, 7. ✓
- Portal routing skeleton (external → portal; staff unaffected) → Task 10. ✓
- Invariant tests (client `fields`/`equations` empty; designer denied; own membership only) → Task 1. ✓
- Done-when (create a client/designer user, land on portal) → Task 11 + Task 12 Step 3. ✓
- Deferred items (decisions table, `sent_to_customer`, per-param internal flag, full designer path) → intentionally absent; `getDesignerTasks` returns `[]`. ✓

**Placeholder scan:** No TBD/TODO; every code and SQL step is complete.

**Type consistency:** `Membership`/`OrgRole`/`ExternalRole` defined in `membership-resolve.ts`, re-exported from `membership.ts`, consumed in layouts/actions. `ClientProjectView`/`CurationField` defined in `client-view.ts`, consumed in `client-portal.ts`. `buildClientProjectView` signature matches its caller. `getClientProjectView`/`getDesignerTasks` names consistent across Tasks 9–10.
