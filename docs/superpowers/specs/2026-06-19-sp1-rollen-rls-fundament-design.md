# SP-1 — Rollen-Fundament + RLS — design spec

- **Date:** 2026-06-19
- **Status:** Approved (design, decisions made this session); pending spec review → implementation plan
- **Work package:** "EKOWAI Wizard — Roles, Access Control & Dashboard" (Author: Alvaro, Engineer of Record). This spec covers **T1 (designer role) + T2 (RLS per role)** as the first of six sub-projects. The remaining sub-projects (attestation, phase approval, task brief, lab referral, dashboard) get their own spec → plan → implementation cycle.
- **Target project (test data):** PLT-HS-01

## Problem

The platform needs real access control before more people touch a project. Two external participant types must be added — **client** (attests data, approves phases, sees outcomes only) and **designer** (cuts drawings from a sealed task brief) — without ever exposing EKOWAI's IP: the **questions** (`fields`) and the **calculation logic** (`equations`).

The work package was written against an assumed role model (`user_profiles.role` = engineer/client/admin) that **does not exist in the code**. Reality:

- Roles live in **`org_members.role`** (pgEnum `member_role` = `owner | admin | engineer | viewer`). There is **no** client/designer role and **no** `user_profiles` table (only `profiles`, an auth mirror with no role column).
- RLS is **purely org-scoped**: every member of an org can read/write everything in that org's projects. There is no per-role boundary inside an org.
- The standards library (`standards`, `worksheet_templates`, `worksheet_sections`, `fields`, `equations`, `compliance_requirements`) is `FOR SELECT TO authenticated USING (true)` — i.e. readable by **any** logged-in user. This is the IP-Layer-2 leak: a client/designer is "authenticated" and could read every question and formula of every standard.

## Decisions (made this session)

- **Role model:** extend the existing `member_role` enum with `client` + `designer` (chosen over building a new `user_profiles` model or deferring to Alvaro). Additive, non-breaking.
- **Membership location:** external participants live in a **new `project_members` table** (project-scoped), internal staff stay in `org_members` (org-scoped). Clean separation; engineer RLS stays untouched → no regression risk.
- **Client data access:** **server-action-curated + RLS hard-deny**. The client portal never reads IP tables directly; curated server actions (service role) return an IP-stripped payload. The client JWT gets **no** read policy on `fields`/`equations`/internal `project_parameters` → direct API access returns empty. The invariant is trivially provable in `tests/rls`.
- **Staff vs. external is one condition:** *does the user have an `org_members` row?* Staff → yes → full org-scoped rights (today's behaviour). External → only a `project_members` row → already denied by every existing org-based policy. The **only** RLS change required for the IP invariant is tightening the standards-library SELECT from `USING(true)` to staff-only.

## Scope

### In SP-1
1. Extend `member_role` enum: `+ client, + designer`.
2. New `project_members` table (project-bound external membership).
3. RLS: standards-library SELECT `USING(true)` → **staff-only** (the IP-Layer-2 fix); `project_members` policies.
4. Curated server-action layer as the **only** client data path (outcome-reader skeleton).
5. Portal-routing skeleton: external → client/designer portal stub; staff → existing app unchanged.
6. The invariant tests (`pnpm test:rls`): client JWT on `fields`/`equations` = empty.

### Deliberately deferred (own later slices)
- **`decisions` table (Type-1/2/3) + client write-paths** → own slice (couples tightly to SP-3). Note: the old `decisions` table was dropped in `20260520120000_db_driven_rebuild.sql`; it must be built from scratch when that slice runs.
- **`sent_to_customer` status / client read threshold** → arrives with phases (SP-3). No such status exists today (statuses: `draft | submitted_for_review | engineer_approved | final | deactivated`).
- **Per-parameter `internal` / `client_visible` flag** → the curation action exposes only `computed`/`derived` outcomes, never `entered`. The explicit flag is a later refinement.
- **Full designer data path** → Task Brief (SP-4). In SP-1 the designer is simply "deny all, portal stub" (`getDesignerTasks` returns `[]`).

## Architecture / data flow

```
member_role enum  →  + 'client'  + 'designer'   (ALTER TYPE ... ADD VALUE — additive)

project_members (NEW table — project-bound external membership)
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  role       member_role NOT NULL          -- only 'client' | 'designer'
  invited_by uuid NOT NULL REFERENCES profiles(id)
  invited_at timestamptz NOT NULL DEFAULT now()
  PRIMARY KEY (project_id, user_id)
  CONSTRAINT project_members_external_role CHECK (role IN ('client','designer'))
        │
        ▼
RLS  (staff = EXISTS org_members row; external = only project_members row)
  C1  standards/worksheet_templates/worksheet_sections/fields/equations/compliance_requirements:
        DROP "..._read_authenticated";
        CREATE "..._read_staff" FOR SELECT TO authenticated
          USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));
        → external roles get EMPTY. This is IP-Layer 2.
  C2  project_members:
        ENABLE RLS;
        "project_members_select_self"  FOR SELECT  USING (user_id = auth.uid());
        "project_members_all_staff"    FOR ALL
          USING/ WITH CHECK (project_id IN
            (SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
             WHERE om.user_id = auth.uid()));
  C3  project_standards / worksheet_instances / project_parameters / approval_events /
        audit_log: NO CHANGE — org-based policies already deny externals.
        profiles: unchanged — "own row" lets an external read their own profile. Correct.
        ▼
src/lib/auth/membership.ts  (service-role lookup; staff resolved FIRST — a user with
                             both rows counts as staff, so an engineer can never be
                             downgraded into a portal by a stray project_members row)
  getMembership(userId) → {kind:'staff', orgRole} | {kind:'external', projectId, role} | null
  requireStaff()    → redirect if external
  requireExternal() → for client/designer portals
        ▼
src/lib/actions/client-portal.ts  (the ONLY client data path; runs as service role
                                   but self-checks requireExternal() + project_members match)
  getClientProjectView(projectId) → {
    project:  { name, code, location },                 // identity, no internal fields
    outcomes: Array<{ label, value, unit }>,            // ONLY source_type ∈ {computed, derived}
    progress: { phasesTotal, phasesDone, percent }
  }                                                      // never raw fields.labelDe / formulas / entered
  getDesignerTasks(projectId) → []                       // real path = Task Brief (SP-4)
        ▼
src/app/[locale]/(app)/layout.tsx        → kind='external' ⇒ redirect /portal
src/app/[locale]/(portal)/layout.tsx (NEW) → requireExternal(); role selects sub-view
  /portal → client: outcome/progress stub | designer: task stub
  (staff sees existing app unchanged; externals never reach /projects/...)
```

## Tests (the invariants — `tests/rls`, `pnpm test:rls`)

New helper `makeExternal(client, projectId, role)` alongside the existing `makeUser`/`makeOrg`.

| Test | Invariant proven |
|---|---|
| Client-JWT `SELECT * FROM fields` → **0 rows** | #1 IP-Layer 2 (question text) |
| Client-JWT `SELECT * FROM equations` → **0 rows** | #1 (formulas) |
| Client-JWT `SELECT` on `worksheet_templates`/`worksheet_sections`/`compliance_requirements` → **0** | #1 |
| Client-JWT `SELECT * FROM project_parameters` (own project) → **0** | #5 (no direct access, curated only) |
| Designer-JWT on all project tables → **0** | #3 (designer only via brief) |
| Staff-JWT `SELECT FROM fields` → **> 0** | no regression: engineer still reads the library |
| Client reads own `project_members` row → **1**, foreign → **0** | scoping correct |
| `getClientProjectView` as client returns only computed/derived, no `entered`/formulas | curation tight |

Plus a unit test for `getMembership` (staff / external / null disambiguation).

## Done-when (SP-1 overall)

- A user with role `designer` / `client` can be created (via `project_members`) and lands on the portal stub.
- All RLS tests above are green.
- Existing `test:rls` and unit suites stay green (no engineer regression).

## Invariants this sub-project must uphold (from the work package §3)

1. No non-engineer endpoint ever returns question text or equation formulas. ← C1 + curation
2. `approval_events` and `audit_log` stay append-only (no UPDATE/DELETE RLS). ← unchanged here
3. A designer can only ever read data inside a Task Brief for a task assigned to them. ← deny-all in SP-1; brief in SP-4
5. Every value a designer or client sees traces to a `computed_from_equation_id` or a recorded source. ← curation exposes only computed/derived

(Invariant #4 — client cannot approve a phase without attestation — belongs to SP-2/SP-3.)

## Out of scope for SP-1

Attestation columns (SP-2), phase approvals (SP-3), task-brief generation (SP-4), lab referral (SP-5), engineer dashboard (SP-6), and everything in the work package §5 (payments, signatures, wrapped-report renderer).
