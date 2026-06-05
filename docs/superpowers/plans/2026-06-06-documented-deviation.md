# Documented-Deviation Capability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the engineer of record mark a block-severity compliance requirement as satisfied via an auditable **documented deviation** — a distinct "erfüllt mit dokumentierter Abweichung" verdict (justification + citation basis, edit/withdraw, freeze-on-approval) that stops the gate blocking, never a silent green.

**Architecture:** A dedicated `compliance_deviations` table (current state, gate-consulted) + an `audit_log` event per change. A pure resolver moves a failing block condition with an active deviation out of `failingBlockConditions` into a new `deviatedConditions[]`. The panel + PDF render a distinct verdict; the project verdict gains a third state; the approval snapshot freezes active deviations.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), React, Zustand, Drizzle/Postgres (Supabase), Vitest. Build on branch `integration/preview-138-plus-leads` (worktree `C:/Users/Ekowai/_work-merge`); deploy to the **preview** project.

**Spec:** `docs/superpowers/specs/2026-06-06-documented-deviation-design.md`

**Conventions (from this codebase):**
- Server actions follow `src/lib/actions/overrides.ts`: `'use server'` → `requireUser()` → org-membership ownership check → requirement-belongs-to-project check → write → `audit_log` event → `revalidateTag`. Zod-validated.
- Migrations: ad-hoc SQL applied via the project's own path — `C:/Users/Ekowai/projects/ekowai-wizard/.env.local` (prod `DATABASE_URL`) + `pnpm tsx scripts/_apply-supabase-sql.ts <file>` OR `scripts/apply-migration.mjs`. The Supabase MCP is read-only; never harvest tokens.
- Identity for commits: `git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit …`.
- Run a single test: `pnpm test -- <path>`; full suite `pnpm test`; types `pnpm typecheck`.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/db/migrations/0004_compliance_deviations.sql` | NEW table + indexes (applied to prod DB) | 1 |
| `src/lib/db/schema.ts` | + `complianceDeviations` Drizzle table | 1 |
| `src/lib/actions/approval-gate.ts` | `deviatedConditions` on result + `applyDeviations` pure step | 2 |
| `src/lib/db/queries/deviations.ts` | NEW — `loadActiveDeviations(projectId)` | 3 |
| `src/lib/actions/deviations.ts` | NEW — `setDeviation` / `editDeviation` / `withdrawDeviation` | 3 |
| `src/lib/compliance/project-verdict.ts` | NEW — pure `computeProjectVerdict(...)` | 4 |
| `src/components/worksheet/compliance-block.tsx` | deviation verdict badge + affordance | 5 |
| `src/components/worksheet/deviation-form.tsx` | NEW — inline create/edit/withdraw form | 5 |
| `src/lib/pdf/sections/compliance.tsx` | distinct third-state render | 6 |
| `src/lib/snapshots/capture.ts` | freeze active deviations into snapshot | 7 |

---

## Task 1: `compliance_deviations` table + Drizzle schema

**Files:**
- Create: `src/lib/db/migrations/0004_compliance_deviations.sql`
- Modify: `src/lib/db/schema.ts` (append a `pgTable`)
- Test: `src/lib/db/__tests__/deviations-schema.test.ts`

- [ ] **Step 1: Write the migration SQL** (`0004_compliance_deviations.sql`):

```sql
CREATE TABLE IF NOT EXISTS compliance_deviations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id        uuid NOT NULL REFERENCES compliance_requirements(id) ON DELETE RESTRICT,
  worksheet_instance_id uuid REFERENCES worksheet_instances(id) ON DELETE SET NULL,
  justification         text NOT NULL,
  basis_citations       jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_ref         text,
  status                text NOT NULL DEFAULT 'active',
  created_by            uuid NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  withdrawn_by          uuid,
  withdrawn_at          timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS compliance_deviations_active_uniq
  ON compliance_deviations (project_id, requirement_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS compliance_deviations_project_idx
  ON compliance_deviations (project_id) WHERE status = 'active';
```

- [ ] **Step 2: Write the failing schema test** (`deviations-schema.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { complianceDeviations } from '../schema';

describe('complianceDeviations schema', () => {
  it('exposes the expected columns', () => {
    const cols = Object.keys(complianceDeviations);
    for (const c of ['id','projectId','requirementId','worksheetInstanceId','justification','basisCitations','authorityRef','status','createdBy','createdAt','withdrawnBy','withdrawnAt']) {
      expect(cols).toContain(c);
    }
  });
});
```

- [ ] **Step 3: Run, verify fail** — `pnpm test -- src/lib/db/__tests__/deviations-schema.test.ts` → FAIL (`complianceDeviations` not exported).

- [ ] **Step 4: Add the Drizzle table** to `src/lib/db/schema.ts` (append, mirroring the existing `pgTable` style; reuse imported `uuid,text,jsonb,timestamp,pgTable,sql,index`):

```ts
export const complianceDeviations = pgTable(
  'compliance_deviations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    requirementId: uuid('requirement_id').notNull().references(() => complianceRequirements.id, { onDelete: 'restrict' }),
    worksheetInstanceId: uuid('worksheet_instance_id').references(() => worksheetInstances.id, { onDelete: 'set null' }),
    justification: text('justification').notNull(),
    basisCitations: jsonb('basis_citations').notNull().default(sql`'[]'::jsonb`),
    authorityRef: text('authority_ref'),
    status: text('status').notNull().default('active'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    withdrawnBy: uuid('withdrawn_by'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (t) => ({ projectIdx: index('compliance_deviations_project_idx').on(t.projectId) }),
);
```

- [ ] **Step 5: Run test + typecheck** → PASS; `pnpm typecheck` clean.

- [ ] **Step 6: Commit** (do NOT apply the migration yet — application is a gated prod step in Task 8):

```bash
git add src/lib/db/migrations/0004_compliance_deviations.sql src/lib/db/schema.ts src/lib/db/__tests__/deviations-schema.test.ts
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(db): compliance_deviations table + schema"
```

---

## Task 2: Gate resolver — `deviatedConditions`

**Files:**
- Modify: `src/lib/actions/approval-gate.ts`
- Test: `src/lib/actions/__tests__/approval-gate-deviations.test.ts`

Current `ApprovalGateResult` (from `approval-gate.ts`): `{ ok, failingBlockConditions, missingRequiredFields }`. `resolveApprovalGate(ownFields, inheritedFields, params, blockRequirements)` produces `failingBlockConditions`. We add a pure post-step that subtracts deviated requirements.

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { applyDeviations } from '../approval-gate';

const base = {
  ok: false,
  failingBlockConditions: [
    { code: 'A138-REQ-03', titleDe: 'Permeability', condition: 'k_f IS NOT NULL' },
    { code: 'A138-REQ-04', titleDe: 'GW clearance', condition: 'gw_clearance >= 1.0' },
  ],
  missingRequiredFields: [] as Array<{ symbol: string; labelDe: string }>,
};

describe('applyDeviations', () => {
  it('moves a deviated failing condition into deviatedConditions and unblocks if all clear', () => {
    const r = applyDeviations(base, [{ requirementCode: 'A138-REQ-03', deviationId: 'dev-1' }]);
    expect(r.failingBlockConditions.map((c) => c.code)).toEqual(['A138-REQ-04']);
    expect(r.deviatedConditions).toEqual([{ code: 'A138-REQ-03', titleDe: 'Permeability', deviationId: 'dev-1' }]);
    expect(r.ok).toBe(false); // REQ-04 still blocks
  });
  it('ok=true when every failing condition is deviated and no missing required', () => {
    const r = applyDeviations(base, [
      { requirementCode: 'A138-REQ-03', deviationId: 'd1' },
      { requirementCode: 'A138-REQ-04', deviationId: 'd2' },
    ]);
    expect(r.failingBlockConditions).toEqual([]);
    expect(r.deviatedConditions.map((c) => c.code).sort()).toEqual(['A138-REQ-03','A138-REQ-04']);
    expect(r.ok).toBe(true);
  });
  it('ignores deviations for codes that are not failing', () => {
    const r = applyDeviations(base, [{ requirementCode: 'A138-REQ-99', deviationId: 'x' }]);
    expect(r.failingBlockConditions.length).toBe(2);
    expect(r.deviatedConditions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail** → FAIL (`applyDeviations` not exported).

- [ ] **Step 3: Implement** in `approval-gate.ts`. Extend the result type and add the pure function:

```ts
export type ApprovalGateResult = {
  ok: boolean;
  failingBlockConditions: Array<{ code: string; titleDe: string; condition: string }>;
  deviatedConditions: Array<{ code: string; titleDe: string; deviationId: string }>;
  missingRequiredFields: Array<{ symbol: string; labelDe: string }>;
};

export type ActiveDeviationRef = { requirementCode: string; deviationId: string };

/** Pure: subtract deviated requirements from the failing set. A failing block
 * condition whose code has an active deviation moves into `deviatedConditions`
 * and no longer blocks. Missing-required-field arm is untouched. */
export function applyDeviations(
  result: Omit<ApprovalGateResult, 'deviatedConditions' | 'ok'> & { ok?: boolean },
  deviations: ActiveDeviationRef[],
): ApprovalGateResult {
  const byCode = new Map(deviations.map((d) => [d.requirementCode, d.deviationId]));
  const failing: ApprovalGateResult['failingBlockConditions'] = [];
  const deviated: ApprovalGateResult['deviatedConditions'] = [];
  for (const c of result.failingBlockConditions) {
    const id = byCode.get(c.code);
    if (id) deviated.push({ code: c.code, titleDe: c.titleDe, deviationId: id });
    else failing.push(c);
  }
  const ok = failing.length === 0 && result.missingRequiredFields.length === 0;
  return { ok, failingBlockConditions: failing, deviatedConditions: deviated, missingRequiredFields: result.missingRequiredFields };
}
```

Update `resolveApprovalGate`'s return to include `deviatedConditions: []` (no deviations at the pure-eval layer), and update `formatApprovalGateError` to ignore `deviatedConditions` (only `failingBlockConditions` + `missingRequiredFields` produce the error string — unchanged). Fix the existing `approval-gate-inheritance.test.ts` expectations to include `deviatedConditions: []` where it asserts the full result shape.

- [ ] **Step 4: Run** the new test + the existing `approval-gate*.test.ts` + `pnpm typecheck` → all PASS.

- [ ] **Step 5: Commit:**

```bash
git add src/lib/actions/approval-gate.ts src/lib/actions/__tests__/approval-gate-deviations.test.ts src/lib/actions/__tests__/approval-gate-inheritance.test.ts
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(approval-gate): applyDeviations — deviated block reqs stop blocking"
```

---

## Task 3: Load query + server actions

**Files:**
- Create: `src/lib/db/queries/deviations.ts`
- Create: `src/lib/actions/deviations.ts`
- Modify: `src/lib/actions/approval-gate.ts` (`checkApprovalGate` consumes deviations)
- Test: `src/lib/actions/__tests__/deviations-action.test.ts`

- [ ] **Step 1: `loadActiveDeviations`** (`queries/deviations.ts`):

```ts
import 'server-only';
import { db } from '@/lib/db';
import { complianceDeviations, complianceRequirements } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export type ActiveDeviation = { id: string; requirementId: string; requirementCode: string; justification: string };

/** All active deviations for a project, joined to the requirement code. */
export async function loadActiveDeviations(projectId: string): Promise<ActiveDeviation[]> {
  const rows = await db
    .select({
      id: complianceDeviations.id,
      requirementId: complianceDeviations.requirementId,
      requirementCode: complianceRequirements.code,
      justification: complianceDeviations.justification,
    })
    .from(complianceDeviations)
    .innerJoin(complianceRequirements, eq(complianceRequirements.id, complianceDeviations.requirementId))
    .where(and(eq(complianceDeviations.projectId, projectId), eq(complianceDeviations.status, 'active')));
  return rows;
}
```

- [ ] **Step 2: Wire into `checkApprovalGate`** — after building the pure result, load deviations and apply:

```ts
import { loadActiveDeviations } from '@/lib/db/queries/deviations';
// … inside checkApprovalGate, replace `return resolveApprovalGate(...)` with:
const pure = resolveApprovalGate(ownFields, inheritedFields, params, blockRequirements);
const deviations = await loadActiveDeviations(instance.projectId);
return applyDeviations(pure, deviations.map((d) => ({ requirementCode: d.requirementCode, deviationId: d.id })));
```

- [ ] **Step 3: Server actions** (`actions/deviations.ts`) — model on `overrides.ts`. Write the failing test first:

```ts
import { describe, it, expect } from 'vitest';
import { DeviationInputSchema } from '../deviations';

describe('DeviationInputSchema', () => {
  it('rejects blank justification', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: '', basisCitations: [] });
    expect(r.success).toBe(false);
  });
  it('requires a non-empty basis', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: 'literature k_f accepted; FLL §4.10', basisCitations: [] });
    expect(r.success).toBe(false);
  });
  it('accepts a justification + at least one basis citation', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: 'literature k_f accepted; FLL §4.10', basisCitations: [{ id: '1', docId: 'label:§4.10', page: null, note: null }] });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 4: Run, verify fail** → FAIL (`DeviationInputSchema` not exported).

- [ ] **Step 5: Implement** `actions/deviations.ts`:

```ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { complianceDeviations, complianceRequirements, projects, orgMembers, worksheetInstances, worksheetTemplates, auditLog } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const CitationSchema = z.object({ id: z.string(), docId: z.string(), page: z.number().nullable().optional(), note: z.string().nullable().optional() });
export const DeviationInputSchema = z.object({
  projectId: z.string().uuid(),
  requirementId: z.string().uuid(),
  justification: z.string().trim().min(10).max(2000),
  basisCitations: z.array(CitationSchema).min(1),
  authorityRef: z.string().trim().max(500).optional(),
});
export type DeviationInput = z.infer<typeof DeviationInputSchema>;
type Result = { ok: true; id: string } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

/** Ownership: project belongs to a user's org AND the requirement belongs to a
 * worksheet template that this project has instantiated. Returns orgId. */
async function authorize(userId: string, projectId: string, requirementId: string): Promise<string | null> {
  const [proj] = await db.select({ orgId: projects.orgId }).from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId))).limit(1);
  if (!proj) return null;
  const [req] = await db.select({ id: complianceRequirements.id }).from(complianceRequirements)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, complianceRequirements.worksheetTemplateId))
    .innerJoin(worksheetInstances, eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id))
    .where(and(eq(complianceRequirements.id, requirementId), eq(worksheetInstances.projectId, projectId))).limit(1);
  if (!req) return null;
  return proj.orgId;
}

export async function setDeviation(input: DeviationInput): Promise<Result> {
  let user; try { user = await requireUser(); } catch { return { ok: false, error: 'unauthorized' }; }
  const parsed = DeviationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
  const { projectId, requirementId, justification, basisCitations, authorityRef } = parsed.data;
  const orgId = await authorize(user.id, projectId, requirementId);
  if (!orgId) return { ok: false, error: 'not_found' };
  const [row] = await db.insert(complianceDeviations)
    .values({ projectId, requirementId, justification, basisCitations, authorityRef: authorityRef ?? null, createdBy: user.id })
    .onConflictDoUpdate({
      target: [complianceDeviations.projectId, complianceDeviations.requirementId],
      targetWhere: eq(complianceDeviations.status, 'active'),
      set: { justification, basisCitations, authorityRef: authorityRef ?? null, updatedBy: user.id, updatedAt: new Date() },
    })
    .returning({ id: complianceDeviations.id });
  await db.insert(auditLog).values({ actorId: user.id, actorRole: 'engineer', projectId, orgId, tableName: 'compliance_deviations', recordId: row.id, action: 'deviation_set', changes: { requirementId, justification, basisCitations, authorityRef: authorityRef ?? null } });
  revalidateTag('project-sidebar', 'max');
  return { ok: true, id: row.id };
}

export async function withdrawDeviation(input: { projectId: string; requirementId: string }): Promise<Result> {
  let user; try { user = await requireUser(); } catch { return { ok: false, error: 'unauthorized' }; }
  const orgId = await authorize(user.id, input.projectId, input.requirementId);
  if (!orgId) return { ok: false, error: 'not_found' };
  const [row] = await db.update(complianceDeviations)
    .set({ status: 'withdrawn', withdrawnBy: user.id, withdrawnAt: new Date() })
    .where(and(eq(complianceDeviations.projectId, input.projectId), eq(complianceDeviations.requirementId, input.requirementId), eq(complianceDeviations.status, 'active')))
    .returning({ id: complianceDeviations.id });
  if (!row) return { ok: false, error: 'no_active_deviation' };
  await db.insert(auditLog).values({ actorId: user.id, actorRole: 'engineer', projectId: input.projectId, orgId, tableName: 'compliance_deviations', recordId: row.id, action: 'deviation_withdraw', changes: { requirementId: input.requirementId } });
  revalidateTag('project-sidebar', 'max');
  return { ok: true, id: row.id };
}
```

(`editDeviation` = `setDeviation` re-called; the upsert handles it, and the audit `action` is still `deviation_set` — acceptable, or branch to `deviation_edit` when a row already exists. Keep it as the upsert for now; note in the PR.)

- [ ] **Step 6: Run** the schema test + full suite + typecheck → PASS.

- [ ] **Step 7: Commit:**

```bash
git add src/lib/db/queries/deviations.ts src/lib/actions/deviations.ts src/lib/actions/approval-gate.ts src/lib/actions/__tests__/deviations-action.test.ts
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(deviations): load query + set/withdraw server actions + gate wiring"
```

---

## Task 4: Project-level verdict (pure)

**Files:**
- Create: `src/lib/compliance/project-verdict.ts`
- Test: `src/lib/compliance/__tests__/project-verdict.test.ts`

- [ ] **Step 1: Failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { computeProjectVerdict } from '../project-verdict';

describe('computeProjectVerdict', () => {
  it('compliant when all block reqs pass and no deviations', () => {
    expect(computeProjectVerdict({ blockFailingCodes: [], deviatedCodes: [] })).toBe('compliant');
  });
  it('compliant_with_documented_deviations when every failing block is deviated and ≥1 deviation', () => {
    expect(computeProjectVerdict({ blockFailingCodes: ['REQ-03'], deviatedCodes: ['REQ-03'] })).toBe('compliant_with_documented_deviations');
  });
  it('non_compliant when a failing block has no deviation', () => {
    expect(computeProjectVerdict({ blockFailingCodes: ['REQ-03','REQ-04'], deviatedCodes: ['REQ-03'] })).toBe('non_compliant');
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `project-verdict.ts`:

```ts
export type ProjectVerdict = 'compliant' | 'compliant_with_documented_deviations' | 'non_compliant';

/** `blockFailingCodes` = codes of block reqs currently failing across the project;
 * `deviatedCodes` = codes with an active deviation. */
export function computeProjectVerdict(input: { blockFailingCodes: string[]; deviatedCodes: string[] }): ProjectVerdict {
  const deviated = new Set(input.deviatedCodes);
  const uncovered = input.blockFailingCodes.filter((c) => !deviated.has(c));
  if (uncovered.length > 0) return 'non_compliant';
  return input.deviatedCodes.length > 0 ? 'compliant_with_documented_deviations' : 'compliant';
}

export const PROJECT_VERDICT_LABEL_DE: Record<ProjectVerdict, string> = {
  compliant: 'Konform',
  compliant_with_documented_deviations: 'Konform mit dokumentierten Abweichungen',
  non_compliant: 'Nicht konform',
};
```

- [ ] **Step 4: Run test → PASS. Commit:**

```bash
git add src/lib/compliance/project-verdict.ts src/lib/compliance/__tests__/project-verdict.test.ts
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(compliance): computeProjectVerdict — three-state project verdict"
```

---

## Task 5: Panel — distinct verdict badge + deviation form

**Files:**
- Modify: `src/components/worksheet/compliance-block.tsx`
- Create: `src/components/worksheet/deviation-form.tsx`

This task is UI; follow the existing `StatusBadge` pattern in `compliance-block.tsx` and the existing citation picker used by `dynamic-field.tsx`. The controller will read those files before dispatching.

- [ ] **Step 1:** Extend `ComplianceBlock` props with `projectId` (already present), the worksheet `instanceId`, and `activeDeviationsByReqCode: Record<string, { id: string; justification: string }>` (passed from the page via `loadActiveDeviations`). For each requirement row whose `result.kind !== 'pass'` AND severity is `block`, if an active deviation exists render the **distinct badge** (new `StatusBadge` branch); else render an **"Abweichung dokumentieren"** button that toggles `<DeviationForm>`.

- [ ] **Step 2:** Add a `deviation` branch to `StatusBadge` (distinct token + glyph, NOT the green ✓):

```tsx
// new badge — render when an active deviation covers this req
<span
  aria-label="Erfüllt mit dokumentierter Abweichung"
  title="Erfüllt mit dokumentierter Abweichung"
  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/15 text-accent text-xs font-semibold shrink-0"
>
  ≈
</span>
```

- [ ] **Step 3:** Create `deviation-form.tsx` — a client component with a required `justification` textarea (min 10 chars, disable submit until valid AND ≥1 citation), the existing citation picker writing `basisCitations`, an optional `authorityRef` input, and **Speichern / Zurückziehen** buttons calling `setDeviation` / `withdrawDeviation` from `@/lib/actions/deviations` inside a `useTransition`, then `router.refresh()`. Mirror the citation-picker usage in `dynamic-field.tsx`.

- [ ] **Step 4:** Wire the page (`…/worksheets/[worksheetCode]/page.tsx`) to call `loadActiveDeviations(projectId)` and pass `activeDeviationsByReqCode` + `instanceId` into `<ComplianceBlock>`.

- [ ] **Step 5: Typecheck + full suite + manual note.** Run `pnpm typecheck && pnpm test`. (No new unit test for the React form here; it's covered by the action tests + the e2e visual gate. Add a `compliance-block` render test only if a pure helper is extracted.)

- [ ] **Step 6: Commit:**

```bash
git add src/components/worksheet/compliance-block.tsx src/components/worksheet/deviation-form.tsx "src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx"
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(panel): documented-deviation verdict badge + inline form"
```

---

## Task 6: PDF — distinct third-state render

**Files:**
- Modify: `src/lib/pdf/sections/compliance.tsx`

- [ ] **Step 1:** Read `sections/compliance.tsx` + `src/components/pdf/engine-verdict.tsx` for the existing colored 3-state frame contract. The compliance section already loads requirements + their evaluated state; extend the per-requirement render: if the requirement has an active deviation (passed in via the report's data load), render a **third frame style** (outlined/amber, distinct from green-pass and red-fail) with the label **"Erfüllt mit dokumentierter Abweichung"** + the justification + the resolved basis citation(s) + `authorityRef` if present.

- [ ] **Step 2:** Extend the report data loader feeding the compliance section to include the project's active deviations keyed by requirement code (reuse `loadActiveDeviations`), plus the resolved citation labels (reuse the project-documents lookup the report already uses).

- [ ] **Step 3:** Run `pnpm typecheck && pnpm test` (incl. the PDF render tests in `src/lib/pdf/__tests__/`); update any snapshot that now shows a deviated requirement. Commit:

```bash
git add src/lib/pdf/sections/compliance.tsx
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(pdf): documented-deviation distinct verdict in compliance section"
```

---

## Task 7: Freeze deviations into the approval snapshot

**Files:**
- Modify: `src/lib/snapshots/capture.ts`

- [ ] **Step 1:** Read `capture.ts` (`captureSnapshot`) + `src/lib/snapshots/payload.ts`. On the `approve` trigger, include the project's active deviations (id, requirementCode, justification, basisCitations, authorityRef) in the snapshot payload so the stamped record reproduces exactly which deviations applied.

- [ ] **Step 2:** Add/extend a `capture` test in `src/lib/snapshots/__tests__/capture.test.ts` asserting the snapshot payload contains the active deviations for an instance's project. Run it (fail → implement → pass).

- [ ] **Step 3: Commit:**

```bash
git add src/lib/snapshots/capture.ts src/lib/snapshots/payload.ts src/lib/snapshots/__tests__/capture.test.ts
git -c user.email="johannes.osterkamp@gmx.net" -c user.name="Johannes Osterkamp" commit -m "feat(snapshots): freeze active deviations into the approval snapshot"
```

---

## Task 8: Apply migration + deploy + verify (gated)

**Files:** none (ops)

- [ ] **Step 1:** Full suite + typecheck green on the branch: `pnpm test && pnpm typecheck`.
- [ ] **Step 2:** **Apply `0004_compliance_deviations.sql` to the prod DB** via the documented path (`projects/ekowai-wizard/.env.local` `DATABASE_URL` + `pnpm tsx scripts/_apply-supabase-sql.ts` or `scripts/apply-migration.mjs`). Verify via the read-only MCP: `SELECT to_regclass('public.compliance_deviations');` → non-null; confirm the partial unique index exists.
- [ ] **Step 3:** Deploy the branch to the **preview** project: `vercel deploy --prod --cwd <worktree> --scope hannesosters-projects --yes`. Confirm READY + alias `ekowai-wizard-preview.vercel.app`.
- [ ] **Step 4 (HUMAN — Johannes):** On `ekowai-wizard-preview.vercel.app`, Flurstück 133, A138-04: document a deviation on REQ-03 (justification + basis citation) → REQ-03 shows **"Erfüllt mit dokumentierter Abweichung"** (distinct, not green) → Genehmigen no longer refuses on REQ-03 → project verdict "Konform mit dokumentierten Abweichungen" → PDF prints the distinct verdict + justification → withdraw works. Only Johannes ticks this.

---

## Self-review

- **Spec coverage:** data model (T1) ✓; distinct verdict badge (T5) ✓; required justification+citation, can't save blank (T3 schema + T5 form) ✓; auditable event (T3 audit_log writes) ✓; project verdict three-state (T4) ✓; per-requirement not blanket (T2 by-code) ✓; gate stops blocking (T2/T3) ✓; PDF distinct (T6) ✓; freeze-on-approval (T7) ✓; edit/withdraw (T3 + T5) ✓; not-a-bug-cover (REQ-03 honesty fix is a separate track, noted) ✓.
- **Placeholder scan:** UI (T5) and PDF (T6) describe behavior + give the key code/badge but defer mechanical wiring to "follow the existing pattern in <named file>" — flagged as the two read-existing-pattern tasks; all testable-core tasks (T1–T4, T7) have full code + tests.
- **Type consistency:** `ApprovalGateResult` gains `deviatedConditions` (T2) and every caller/test updated (T2 step 3); `ActiveDeviationRef`/`ActiveDeviation` shapes match between query (T3) and `applyDeviations` (T2); `basisCitations` uses the citationSources `{id,docId,page,note}` shape consistently (T1 schema, T3 Zod, T5 form).
