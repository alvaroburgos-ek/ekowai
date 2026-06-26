# Access-Control Foundation — Design Spec

- **Date:** 2026-06-26
- **Status:** DRAFT (pending user review)
- **Author:** Hannes + Claude (Opus 4.8)
- **Repo:** `ekowai-wizard` (Next.js 16 + Supabase + Drizzle)
- **Parent work package:** "EKOWAI Wizard — Roles, Access Control & Dashboard" (Alvaro, Engineer of Record) — this spec is **Sub-Project 1 of 5**.

---

## 1. Context & goal

The platform needs real access control before more people touch a project. The parent
work package defines four roles (Engineer, Designer, Client, Admin) and seven tasks
(T1–T7). Exploration of the actual codebase showed the package assumes a more mature
system than exists today — several "we reuse it" prerequisites are not implemented.
This sub-project builds the **foundation** that every later feature inherits:

1. A way to attach **external** parties (client, designer) to a project.
2. **IP protection** that holds at the database level *and* at the application level,
   so no non-engineer can ever read the questions (`fields`) or the calculation logic
   (`equations`).
3. Write access restricted to internal engineers.

**Goal:** establish `project_collaborators` + harden authorization (RLS *and* an
app-level guard) so external parties are **default-denied everywhere** and can **never**
read IP. This is the *negative space* of access control — security-complete on its own.
The *positive* visibility rules (what a client/designer may see) are deferred to the
sub-projects that build the phase model and Task Briefs.

## 2. Scope

**In scope (this sub-project):**
- New `project_collaborators` table (external `client` / `designer` per project).
- RLS hardening on the standards library + project workflow tables.
- A shared **application-level authorization guard** used by server actions and data
  loaders (required because the app's primary data path bypasses RLS — see §4).
- Minimal role routing: an authenticated external user is kept out of internal views
  and routed to a placeholder portal landing.
- Tests proving the IP invariant on **both** access paths.

**Out of scope (deferred — named, not silent):**
- Positive client visibility (what a client *can* see) → **Sub-Project 2** (needs the
  phase model + a "sent to client" state).
- `decisions` table + `type_1/2/3` read/write rules → **Sub-Project 2**.
- `phase_approvals`, attestation, `sent_to_customer` status → **Sub-Project 2**.
- Task Brief generation + the designer's actual project-data access → **Sub-Project 3**.
- Lab/test referral (T6) → **Sub-Project 4**.
- Engineer dashboard (T7) → **Sub-Project 5**.
- Migrating the app's Drizzle data path to run under RLS (Approach C) → not now.

## 3. Codebase reality (verified 2026-06-26)

The parent package's assumptions were checked against `src/lib/db/schema.ts`,
`src/lib/state-machine.ts`, `src/lib/db/index.ts`, the server actions, and the RLS
migrations. Findings that shape this design:

| Package assumed | Actual code |
|---|---|
| `user_profiles.role` = engineer/client/admin | No `user_profiles`. Roles live on `org_members.role`, enum `member_role` = **owner/admin/engineer/viewer**, scoped per org. No `client`, no `designer`. |
| `project_parameters.computed_from_equation_id` | Does not exist. Present: `source_type`, `source_worksheet_instance_id`, `citation_sources` (jsonb). |
| `worksheet_instances` status ≥ `sent_to_customer` | Status enum = draft / submitted_for_review / engineer_approved / final. No `sent_to_customer`. |
| `decisions` table (`decision_class` type_1/2/3) | No such table (the old Plan-3 `decisions` table was dropped in the `20260520120000_db_driven_rebuild` pivot). |
| Phases P0…P8 | `phase` is an `integer` column on `worksheet_templates`. No named phases, no `phase_approvals`. |

**Current RLS** (`supabase/migrations/20260520120000_db_driven_rebuild.sql`):
- Library tables (`standards, worksheet_templates, worksheet_sections, fields,
  equations, compliance_requirements`): `FOR SELECT TO authenticated USING (true)` —
  **any authenticated user reads all question text and all formulas.** Today harmless
  (all authenticated users are internal); the moment a client/designer login exists,
  this violates the IP invariant by default.
- Project tables (`project_standards, worksheet_instances, project_parameters`):
  `FOR ALL TO authenticated` scoped by org membership — no role differentiation, so a
  `viewer` currently has full **write** too.
- Immutable tables (`approval_events, audit_log`): INSERT + SELECT only, no
  UPDATE/DELETE. Already matches the append-only invariant.

**Critical architecture finding — the app bypasses RLS:**
- `src/lib/db/index.ts` connects via `postgres(env.DATABASE_URL)` (Drizzle) as a
  privileged DB role → **RLS does not apply** to the app's own queries.
- `saveWorksheet` (`src/lib/actions/worksheet.ts`) uses the Supabase `authenticated`
  client **only** for `auth.getUser()` (identity); all reads/writes go through
  `db.transaction(...)` (Drizzle) → **RLS bypassed**.
- A privileged admin client also exists (`src/lib/supabase/admin.ts`, service-role key).

⇒ **RLS protects only the Supabase Data API path** (PostgREST via anon/authenticated
key — e.g. any future client-side Supabase query). The app's server actions/loaders are
the *primary* data path and they bypass RLS. Therefore authorization must be enforced in
**two layers**, and the app-level guard (§4.3) is the load-bearing one for the app
itself.

## 4. Design

### 4.1 Approach (chosen: A — Defense-in-Depth)

- **A (chosen):** RLS hardening (DB-level boundary for the Supabase API path) **plus** a
  shared app-level authorization guard in server actions/loaders (boundary for the
  Drizzle path). Both layers enforce the same IP invariant.
- **B (rejected):** RLS only — gives a false sense of security; the app's main data path
  bypasses it.
- **C (rejected, deferred):** rework the Drizzle path to run as `authenticated` with
  `set role` / request-scoped JWT so RLS applies uniformly. A large, risky architectural
  change; revisit later, not in the foundation.

### 4.2 Data model — `project_collaborators`

```sql
CREATE TABLE project_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,              -- references auth.users(id); profiles row mirrors it
  role        text NOT NULL CHECK (role IN ('client','designer')),
  invited_by  uuid NOT NULL,              -- internal engineer who attached them
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
```

- **Internal** staff stay on `org_members` (unchanged). **External** parties attach here,
  per project. The `member_role` enum is **not** modified.
- Mirrors the Drizzle schema style in `src/lib/db/schema.ts` (`uuid` PKs, `text` + CHECK
  for small enums, `user_id` kept as plain uuid like `project_parameters.entered_by`).
- Added to `schema.ts` as `projectCollaborators` + a Drizzle migration.

### 4.3 Application-level guard (the load-bearing layer)

A small module, e.g. `src/lib/auth/project-access.ts`:

```ts
type AccessScope = 'internal' | 'client' | 'designer' | 'none';

interface ProjectAccess {
  scope: AccessScope;
  role: string | null;        // org_members.role for internal; collaborator.role for external
  orgId: string | null;
}

// Resolves the caller's effective access to a project (internal via org_members,
// external via project_collaborators). One query each; no IP leaked.
async function resolveProjectAccess(userId: string, projectId: string): Promise<ProjectAccess>;

// Throws (or returns a typed error) when the caller is not internal.
function assertInternal(access: ProjectAccess): asserts access is { scope: 'internal' } & ProjectAccess;
```

- **IP gate:** any server action or loader that reads `fields` question text, `equations`
  formulas, or internal `project_parameters` calls `assertInternal()` first. External
  scopes get nothing — there is no foundation code path that returns IP to a non-internal
  caller.
- Existing internal server actions (e.g. `saveWorksheet`) gain an `assertInternal()` check
  at the top, replacing/augmenting the current ad-hoc auth + org-membership check.
- The guard is the boundary for the **Drizzle path**; RLS (§4.4) is the boundary for the
  **Supabase API path**. They state the same rule twice on purpose.

### 4.4 RLS hardening

Library tables — restrict reads to internal org members:
```sql
-- repeat for standards, worksheet_templates, worksheet_sections,
-- fields, equations, compliance_requirements
DROP POLICY "fields_read_authenticated" ON fields;
CREATE POLICY "fields_read_internal" ON fields
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
```
Externals are never `org_members`, so they are denied all IP at the DB level.

Project workflow tables — keep org-scoped reads, restrict writes to engineer+:
```sql
-- project_parameters, worksheet_instances, project_standards
DROP POLICY "project_parameters_all_org" ON project_parameters;

CREATE POLICY "project_parameters_select_internal" ON project_parameters
  FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "project_parameters_write_engineer" ON project_parameters
  FOR INSERT TO authenticated  -- + matching UPDATE and DELETE policies
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')
  ));
```
Externals get no policy on these tables → default-deny (foundation). Their positive read
access arrives in later sub-projects.

`project_collaborators` — internal engineers manage rows; a collaborator may read only
their own row:
```sql
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_manage_internal" ON project_collaborators
  FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')
  ));

CREATE POLICY "pc_read_own" ON project_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

`approval_events` / `audit_log` — unchanged (append-only).

### 4.5 Role routing (minimal)

- After login, resolve whether the user is internal (`org_members`) or external
  (`project_collaborators`). An external user hitting an internal route under
  `(app)/projects/...` is redirected to a placeholder portal landing (e.g.
  `(portal)/` route group) that simply confirms the role and shows "nothing to do yet".
- The full client and designer portals are later sub-projects. The foundation only needs
  the **guard + redirect** so an external login cannot reach internal UI.
- **Done-when (T1, adapted):** a user attached as `designer` (or `client`) lands on the
  placeholder portal, not on any internal project view.

### 4.6 Components & boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `project_collaborators` table + Drizzle model | Persist external party ↔ project ↔ role | `projects`, auth.users |
| `src/lib/auth/project-access.ts` | Resolve effective access; `assertInternal` guard | `db`, `org_members`, `project_collaborators` |
| RLS migration | DB-level deny for externals; engineer-only writes | existing policies |
| Route guard / portal landing | Keep externals out of internal UI | `project-access` |
| Tests | Prove invariants on both paths | all of the above |

## 5. Testing & invariants

Add tests (Vitest, mirroring `src/lib/actions/__tests__/worksheet.test.ts` which seeds
`org_members` via the admin client) covering **both** paths:

**Supabase API path (RLS):**
1. A `project_collaborators` user querying `fields` → 0 rows.
2. Same user querying `equations` → 0 rows.
3. Same user querying `project_parameters` / `worksheet_instances` of their project → 0 rows (foundation: default-deny).
4. An internal engineer still reads library + project rows.
5. A `viewer` cannot INSERT/UPDATE `project_parameters`.

**Drizzle / server-action path (app guard):**
6. `resolveProjectAccess` returns `scope:'designer'`/`'client'` for a collaborator and `'internal'` for an org member.
7. A server action guarded by `assertInternal()` rejects a collaborator caller.
8. The IP invariant asserted explicitly: **no non-internal caller obtains question text or equation formulas through any tested endpoint.**

**Append-only invariants (regression):**
9. `approval_events` / `audit_log` still reject UPDATE/DELETE.

## 6. Migration & rollback

- Forward: one Drizzle/SQL migration (a) creates `project_collaborators` + its RLS, and
  (b) replaces the library `*_read_authenticated` policies and the project-table
  `*_all_org` policies per §4.4. Idempotent guards (`DROP POLICY IF EXISTS`).
- Rollback script: recreate the original `USING (true)` library policies and the
  `FOR ALL` project policies, and `DROP TABLE project_collaborators`. Captured alongside
  the migration (mirrors the project's existing pre-cutover rollback practice).
- Not applied to prod by this sub-project's implementation step without explicit
  approval (follows the repo's cutover discipline).

## 7. Self-review

- **Spec-vs-reality:** every prerequisite the parent package assumed was verified; the
  missing ones are explicitly deferred (§2), not silently relied upon.
- **Defense-in-depth rationale:** §3 documents *why* RLS alone is insufficient (Drizzle
  bypass); §4.3/§4.4 implement both layers; §5 tests both paths.
- **Invariant coverage:** the IP invariant is asserted on both the RLS path and the guard
  path (§5.1/§5.8).
- **Scope:** focused on the negative-space foundation; no positive-visibility, phase, or
  brief logic leaks in.
