# What-if Cases (Fälle) — Phase A1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engineers can define up to six what-if cases per project (overlay values on input fields), see every A 138 result per case next to the real record, step through the governing-duration iterations (Gl. 8, Gl. 10 at T = 30/100 a, Gl. 16) as a chart and a per-D table, and drive the same cases through MCP — without any change to the real record, approvals, gates, progress, conformity or audit.

**Architecture:** Two staged tables hold the cases and their overrides (plus a one-row-per-project settings table for „Fälle aktiv"). A pure in-memory chain runner (`src/lib/eval/scenario-chain.ts`) loads what the report path loads, applies overrides on top of the stored values, walks the standard's sheets in phase order with the existing `evaluateWorksheetEquations` / `evaluateWorksheetCompliance`, repeats to a fixpoint, mirrors the A 138 server materialisations the record depends on (A_S,m, Mulde sweep, V_M) by calling the same pure functions the save path calls, and extracts per-duration iteration series from `iterateGoverningDuration`. Nothing is persisted; server actions compute on request. UI is additive: a project tab „Fälle", a sheet panel behind the switch „Fälle anzeigen", an SVG iteration chart and a step-through.

**Tech Stack:** Next.js 16 app router (server actions), drizzle-orm 0.45 + postgres.js, Supabase (RLS migrations staged under `supabase/migrations/_STAGED_*`), vitest (unit project = happy-dom, integration project = embedded Postgres harness), @testing-library/react, zod 4, `@modelcontextprotocol/server` via `mcp-handler`.

**Spec:** `docs/superpowers/specs/2026-10-14-what-if-cases-design.md` (read it before Task 1; this plan argues from it).

## Global Constraints

- Two new case tables `project_scenarios` + `project_scenario_overrides`; **no existing table changes**. The project setting „Fälle aktiv" lives in a third additive table `project_scenario_settings` (spec gap G-1 below — the spec names the setting but no storage; adding a column to `projects` would violate „no existing table changes").
- Migration is **STAGED, never applied** by this plan: `supabase/migrations/_STAGED_20261014120000_project_scenarios.sql` + `_STAGED_rollback-…`. Do not touch any database except the disposable embedded-Postgres harness. Do not push.
- **Code tolerates the tables being absent** (Postgres `42P01`): reads return „not available", writes return a German error, the sheet switch is not rendered.
- Only **input** fields can be overridden — never an equation output (`derivedOutputSymbols`), never a server-materialised symbol (`SERVER_MATERIALISED_SYMBOLS`), never a `lookup_fill` field, never a field whose stored row is `derived`/`computed`. Validation on save: data type, enum values (unless `validationRules.extensible`), `validationRules.min/max/maxLength`, register column keys.
- **Maximum 6 active cases** per project, plus the implicit „Real". Enforced in the action AND by the DB (slot check 1–6 + partial unique index on active slots).
- A case keeps its colour slot (`sort_order` 1–6) for life: **colour follows the case, never its rank**.
- `base_value_at_creation` is written once (insert) and never updated; drift = current real value ≠ base.
- Cases are **never** read by approvals, gates, conformity, progress, sidebar counts or the audit of the real record. No scenario code writes to `project_parameters`, `worksheet_instances`, `approval_events` or `audit_log`.
- Nothing computed is persisted; per-request memoisation only.
- The runner uses `evaluateWorksheetEquations` / `evaluateWorksheetCompliance` (no second engine). Server materialisations are mirrored only by calling the existing pure functions from `src/lib/eval/materialize-asm.ts` / `governing-duration.ts`; A1 mirrors the Mulde path only (spec gap G-2).
- Approval-based withholding of inherited values is bypassed inside the runner via the explicit option `approvalWithholding: 'bypass'` (required literal); the real save/approval path never passes it.
- Visibility = the record's rules: own `visible_when` (`reportVisibility`) ∪ hidden-at-source (`sourceHiddenSymbolsByTemplate` via `gateHiddenSymbols`), inherited rows hidden at source dropped (`dropHiddenAtSource` / `hiddenAtSourceFieldIds`).
- Chart: categorical colours in this fixed order — light `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300`, dark `#3987e5 #d95926 #199e70 #c98500 #d55181 #008300`; „Real" in ink; one y-axis; log x axis 5 min … 7 d; peak marker; „kein eindeutiges Maximum" marker when boundary-limited; crosshair tooltip with every visible case; legend always (≥ 2 series); T = 100 a dashed, T = 30 a solid; table view (step-through table) always available. Validator result (run 2026-10-14): light PASS with contrast WARN for slots 3/4/5 ⇒ direct labels at the peak + table view are mandatory; dark PASS.
- DE/EN through the `locale: 'de' | 'en'` prop pattern of the worksheet components (no new next-intl keys except the tab label `projects.tabs.scenarios`).
- Client data (test case C4) appears only in test fixtures, never in UI code.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Verify `git config user.email` before the first commit (identity is configured in the worktree; do not change it).
- Run commands from `C:\Users\Ekowai\_wt-m820` (branch `feat/what-if-cases`). Unit: `pnpm vitest run --project unit <path>`; harness: `pnpm vitest run --project integration <path>`; types: `pnpm typecheck`.

## Review Focus

1. **An override whose field no longer belongs to the chain** (field deactivated, other standard, template not instantiated) — expected: the case still runs, the override is listed in `skippedOverrides` with a reason, other overrides apply. Pinned in Task 7 (`skips overrides on unknown fields`).
2. **Archived or foreign case ids passed to `getScenarioResults` / `get_scenario_results`** — expected: ignored and returned in `ignoredScenarioIds`, never computed. Pinned in Task 10 (`archived ids are ignored`).
3. **A case switches a driver that hides an overridden or inherited input** — expected: the hidden value is absent in that case (same as the record would do), the dependent equations show „nicht berechnet", the override is not silently used. Pinned in Task 7 (`visibility: case hides A_VA at source`).
4. **Two „Neuer Fall" clicks racing at 5 active cases** — expected: exactly one succeeds, never 7 active. Pinned in Task 10 (`concurrent create at the limit`).
5. **A chain that does not settle** (backward dependency or cycle) — expected: the run stops after `MAX_PASSES`, returns `converged: false`, the UI shows a warning instead of a number that looks final. Pinned in Task 7 (`non-converging chain`).

## Spec gaps and risks (found while planning — owner decides; the plan takes the stated default)

- **G-1 Setting storage.** Spec: „project setting ‚Fälle aktiv' gates the UI" + „migration adds the two tables only". Default: third additive table `project_scenario_settings` in the same staged migration.
- **G-2 Save-path materialisations are not in the report evaluator.** Many A 138 values are written by `saveWorksheet`'s inline producer blocks (A_S,m geometry/soil, Mulde/Rigole/Schacht/Becken sweeps, V_M/V_R/V_MR/V_S/V_B, Phase-4 summary, Tab. 6 loading check), not by `evaluateWorksheetEquations`. A1 mirrors the Mulde path (A_S,m via `materializeAsm` + `computeMuldeGeometrySweep`, `k_i_Mulde`, `V_M_erf`, `D_used_M`, `r_D_n_used_M`, `V_M`). Every other stored derived value is **carried from the record and flagged** (`notRecomputed`, UI marker „Realwert übernommen — im Fall nicht nachgerechnet"). Extending the mirror is A2.
- **G-3 Cases phrased in derived values.** The spec's K5/K6 are „k_i = 1·10⁻⁵ / 1·10⁻⁶"; k_i is Gl. 5 output and cannot be overridden. In A1 a field-test case is expressed as `k_f` (A138-05) + `f_methode` (A138-03) + `f_ort` (A138-08) overrides. Likewise the prototype's Gl. 10 cases set V_VA/Q_S/A_VA of the facility directly, but in the encoding A138-26 inherits V_VA from A138-13 Gl. 8 (derived). The six Gl. 10 hand values are therefore pinned at the iteration-series level (Task 4); the chain pins the record state (T 30 a 31.6401 m³ / T 100 a 55.3057 m³).
- **G-4 F-A7 interaction.** `evaluate-for-report.ts` and the Gl. 10 aggregator always read the T = 30 a column (F-A7, fix dispatched on `fix/flood-check-t100`). The runner exposes both T 30 and T 100 series independently of that fix; the record's `V_Rueck` value (and the Real-equals-record test) follows whatever the aggregator does. If `fix/flood-check-t100` lands first, Task 10's expected Real `V_Rueck` becomes 55.3057 — the test reads the expectation from the T_n_Ue column for that reason.
- **G-5 Compliance cross-sheet symbols.** `evaluateWorksheetCompliance` sees only the fields it is given; the report path passes own fields only, so a gate like REQ-15 (on A138-10, reading q_S_AC from A138-13) stays pending there. The runner passes own + inherited + the gate's standard-scoped project-wide fallback, matching `checkApprovalGate`. Report output itself is unchanged.
- **G-6 Badges.** „Overridden inputs get a badge" is implemented in the case panel above the form (per sheet: „im Fall K5: k_f = 1·10⁻⁵ (Real 1·10⁻⁶)"), not inside each `DynamicField` row — keeps the form byte-identical when the switch is off.
- **G-7 `manual` A_S,m method.** A_S,m is server-materialised, so it is not overridable even when the record uses the manual method; the case uses A_S,min/A_S,max (direct) instead.
- **G-8 Conformity PDF byte-identity** is proven indirectly: the isolation test asserts the md5 of the four record tables and `loadProjectReportData` deep-equal before/after; no PDF is rendered in A1.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/_STAGED_20261014120000_project_scenarios.sql` (create) | 3 tables, indexes, slot check, RLS like `project_parameters`, grants |
| `supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql` (create) | drop policies + tables |
| `src/lib/db/schema.ts` (modify) | drizzle models `projectScenarios`, `projectScenarioOverrides`, `projectScenarioSettings` |
| `src/lib/eval/field-value-coerce.ts` (create) | `toFieldValue` moved out of the MCP module (re-exported there) |
| `src/lib/mcp/tools/fields.ts` (modify) | re-export `toFieldValue` from the new module |
| `src/lib/scenarios/types.ts` (create) | serialisable shared types, slot helper, limits |
| `src/lib/scenarios/format.ts` (create) | `fmtNum` (DE/EN, superscript powers of ten) |
| `src/lib/scenarios/values.ts` (create) | FieldValue ⇄ parameter conversion, equality, display text |
| `src/lib/scenarios/missing-table.ts` (create) | `isMissingRelationError`, unavailable messages |
| `src/lib/scenarios/validate-override.ts` (create) | overridable-field rule + value coercion/validation |
| `src/lib/eval/materialize-asm.ts` (modify) | `computeMuldeGeometrySweep` also returns `perDuration`, `r_D_at_governing` (additive) |
| `src/lib/scenarios/iteration-series.ts` (create) | Gl. 8 / Gl. 10 (T 30/100) / Gl. 16 per-duration series |
| `src/lib/scenarios/a138-mirror.ts` (create) | Mulde-path mirror of the save-path materialisations |
| `src/lib/scenarios/sheet-series.ts` (create) | which series a sheet carries, from a value accessor |
| `src/lib/scenarios/__fixtures__/c4-a138-chain.ts` (create) | anonymised C4-shaped A 138 chain (test-only) + baseline builder |
| `src/lib/eval/scenario-chain.ts` (create) | `runScenarioChain` (pure) |
| `src/lib/scenarios/load-baseline.ts` (create) | `loadScenarioBaseline`, `loadScenariosEnabled` (server-only DB reads) |
| `src/lib/actions/scenarios.ts` (create) | server actions: CRUD, overrides, settings, field search, `getScenarioResults` |
| `tests/harness/seed-scenarios.ts`, `tests/harness/_harness-env-scenarios.ts`, `tests/harness/scenarios.integration.test.ts` (create) | real-save-path proof: Real-equals-record, limits, refusals, drift, isolation, absent tables |
| `src/lib/mcp/tools/scenarios.ts` (create), `src/app/api/mcp/route.ts` (modify) | 5 MCP tools |
| `src/components/projects/project-tabs.tsx` (modify), `src/lib/i18n/messages/{de,en}.json` (modify) | „Fälle" tab |
| `src/app/[locale]/(app)/projects/[id]/(overview)/scenarios/page.tsx` (create), `src/components/scenarios/scenarios-panel.tsx` (create) | project tab content |
| `src/app/globals.css` (modify) | `--scn-1…6` light/dark tokens |
| `src/components/scenarios/chart-geometry.ts`, `src/components/scenarios/scenario-iteration-chart.tsx` (create) | SVG iteration chart |
| `src/lib/scenarios/step-text.ts`, `src/components/scenarios/scenario-step-through.tsx` (create) | substituted-formula step-through + per-D table |
| `src/lib/scenarios/sheet-view.ts`, `src/components/scenarios/scenario-sheet-panel.tsx` (create), worksheet `page.tsx` (modify) | „Fälle anzeigen" switch, columns, per-case compliance, badges |

---

### Task 1: Tables (drizzle model + staged migration)

**Files:**
- Modify: `src/lib/db/schema.ts` (imports at top; new block directly after `projectParameters`, ~line 437)
- Create: `supabase/migrations/_STAGED_20261014120000_project_scenarios.sql`
- Create: `supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql`
- Test: `src/lib/db/__tests__/scenarios-schema.test.ts`

**Interfaces:**
- Produces: `projectScenarios`, `projectScenarioOverrides`, `projectScenarioSettings` (drizzle tables) with columns exactly as below. The embedded harness builds its DDL from `schema.ts`, so these tables exist in every harness run.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/__tests__/scenarios-schema.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { projectScenarios, projectScenarioOverrides, projectScenarioSettings } from '../schema';

const MIG = resolve(__dirname, '../../../../supabase/migrations/_STAGED_20261014120000_project_scenarios.sql');
const RB = resolve(__dirname, '../../../../supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql');

describe('what-if case tables', () => {
  it('project_scenarios carries the spec columns, a slot check and an active-slot unique index', () => {
    const c = getTableConfig(projectScenarios);
    expect(c.name).toBe('project_scenarios');
    expect(c.columns.map((x) => x.name).sort()).toEqual(
      ['archived_at', 'created_at', 'created_by', 'id', 'include_in_report', 'name', 'project_id', 'reason', 'sort_order', 'updated_at'],
    );
    expect(c.checks.map((x) => x.name)).toContain('project_scenarios_slot_range');
    expect(c.indexes.map((x) => x.config.name)).toContain('project_scenarios_active_slot_unique');
  });
  it('project_scenario_overrides is unique per (scenario, field) and stores FieldValue json', () => {
    const c = getTableConfig(projectScenarioOverrides);
    expect(c.columns.map((x) => x.name).sort()).toEqual(
      ['base_value_at_creation', 'created_at', 'field_id', 'id', 'note', 'scenario_id', 'updated_at', 'value'],
    );
    expect(c.uniqueConstraints.map((u) => u.columns.map((x) => x.name))).toContainEqual(['scenario_id', 'field_id']);
  });
  it('project_scenario_settings is one row per project', () => {
    const c = getTableConfig(projectScenarioSettings);
    expect(c.columns.map((x) => x.name).sort()).toEqual(['enabled', 'project_id', 'updated_at', 'updated_by']);
  });
  it('the staged migration creates the three tables, enables RLS and never alters an existing table', () => {
    const sql = readFileSync(MIG, 'utf-8');
    for (const t of ['project_scenarios', 'project_scenario_overrides', 'project_scenario_settings']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${t}`);
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).not.toMatch(/ALTER TABLE public\.(projects|project_parameters|fields|worksheet_instances)\b/);
    expect(sql).toContain('sort_order BETWEEN 1 AND 6');
    expect(sql).toContain("om.role IN ('owner','admin','engineer')");
    const rb = readFileSync(RB, 'utf-8');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenario_overrides');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenarios');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenario_settings');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/db/__tests__/scenarios-schema.test.ts`
Expected: FAIL — `projectScenarios` is not exported from `../schema`.

- [ ] **Step 3: Add the drizzle model**

In `src/lib/db/schema.ts` extend the pg-core import list with `check,` and `uniqueIndex,`. Insert directly after the `projectParameters` table:

```ts
// =============================================================================
// WHAT-IF CASES („Fälle") — spec docs/superpowers/specs/2026-10-14-what-if-cases-design.md
// Overlay values on the same project. Never read by approvals, gates, conformity,
// progress or the audit of the real record. Migration:
// supabase/migrations/_STAGED_20261014120000_project_scenarios.sql (staged).
// =============================================================================
export const projectScenarios = pgTable(
  'project_scenarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    reason: text('reason'),
    /** Colour slot 1..6, fixed for the life of the case (colour follows the case, never its rank). */
    sortOrder: integer('sort_order').notNull(),
    includeInReport: boolean('include_in_report').notNull().default(false),
    // references auth.users(id) in DB; plain uuid like project_parameters.entered_by
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => ({
    projectIdx: index('project_scenarios_project_idx').on(t.projectId),
    activeSlotUnique: uniqueIndex('project_scenarios_active_slot_unique')
      .on(t.projectId, t.sortOrder)
      .where(sql`archived_at IS NULL`),
    slotRange: check('project_scenarios_slot_range', sql`sort_order BETWEEN 1 AND 6`),
  }),
);

export const projectScenarioOverrides = pgTable(
  'project_scenario_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id').notNull().references(() => projectScenarios.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => fields.id),
    /** FieldValue shape `{ type, value }` (src/lib/state/worksheet-store.ts) — the save path's own value representation. */
    value: jsonb('value').notNull(),
    /** The real value (FieldValue or null) when the override was created — written once, drives the drift warning. */
    baseValueAtCreation: jsonb('base_value_at_creation'),
    note: text('note').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqScenarioField: unique().on(t.scenarioId, t.fieldId) }),
);

export const projectScenarioSettings = pgTable('project_scenario_settings', {
  projectId: uuid('project_id').primaryKey().references(() => projects.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Write the staged migration and rollback**

`supabase/migrations/_STAGED_20261014120000_project_scenarios.sql`:

```sql
-- What-if cases („Fälle") — Phase A1 (spec docs/superpowers/specs/2026-10-14-what-if-cases-design.md).
-- Additive only: three NEW tables; no existing table is altered. Safe to apply before or after the code deploy —
-- the code treats a missing table (42P01) as "Fälle nicht eingerichtet".
-- RLS mirrors project_parameters (supabase/migrations/20260626193000_access_control_foundation.sql):
-- org members read, owner/admin/engineer write. The app's `db` (postgres role) bypasses RLS; the server actions
-- check resolveProjectAccess (internal) like saveWorksheet does.
-- STAGED — not applied (the _STAGED_ prefix keeps `supabase db push` / drizzle away from it; rename on the owner's go).
-- Apply: node scripts/apply-migration.mjs supabase/migrations/_STAGED_20261014120000_project_scenarios.sql
-- Rollback: supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql
CREATE TABLE IF NOT EXISTS public.project_scenarios (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  reason            text,
  sort_order        integer NOT NULL,
  include_in_report boolean NOT NULL DEFAULT false,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,
  CONSTRAINT project_scenarios_slot_range CHECK (sort_order BETWEEN 1 AND 6)
);
CREATE INDEX IF NOT EXISTS project_scenarios_project_idx ON public.project_scenarios (project_id);
-- At most one ACTIVE case per slot ⇒ with the slot range at most 6 active cases (race-safe).
CREATE UNIQUE INDEX IF NOT EXISTS project_scenarios_active_slot_unique
  ON public.project_scenarios (project_id, sort_order) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_scenario_overrides (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES public.project_scenarios(id) ON DELETE CASCADE,
  field_id               uuid NOT NULL REFERENCES public.fields(id),
  value                  jsonb NOT NULL,
  base_value_at_creation jsonb,
  note                   text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_scenario_overrides_scenario_field_unique UNIQUE (scenario_id, field_id)
);

CREATE TABLE IF NOT EXISTS public.project_scenario_settings (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scenario_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scenario_settings ENABLE ROW LEVEL SECURITY;

-- project_scenarios + project_scenario_settings: same four policies as project_parameters.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_scenarios','project_scenario_settings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_engineer', t);
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

-- project_scenario_overrides: scoped through its case's project.
DROP POLICY IF EXISTS project_scenario_overrides_select_internal ON public.project_scenario_overrides;
CREATE POLICY project_scenario_overrides_select_internal ON public.project_scenario_overrides FOR SELECT TO authenticated
  USING (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS project_scenario_overrides_write_engineer ON public.project_scenario_overrides;
CREATE POLICY project_scenario_overrides_write_engineer ON public.project_scenario_overrides FOR ALL TO authenticated
  USING (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
  WITH CHECK (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenarios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_overrides TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_settings TO service_role;
```

`supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql`:

```sql
-- ROLLBACK for _STAGED_20261014120000_project_scenarios.sql — drops the three case tables (all cases are lost;
-- the real record is untouched because no other table references them). STAGED — not applied.
DROP TABLE IF EXISTS public.project_scenario_overrides;
DROP TABLE IF EXISTS public.project_scenarios;
DROP TABLE IF EXISTS public.project_scenario_settings;
```

- [ ] **Step 5: Run test to verify it passes, then typecheck**

Run: `pnpm vitest run --project unit src/lib/db/__tests__/scenarios-schema.test.ts` → Expected: 4 passed.
Run: `pnpm typecheck` → Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git config user.email   # must print the configured identity; do not change it
git add src/lib/db/schema.ts src/lib/db/__tests__/scenarios-schema.test.ts supabase/migrations/_STAGED_20261014120000_project_scenarios.sql supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql
git commit -m "feat(scenarios): staged tables for what-if cases (cases, overrides, settings)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared types, values, formatting, missing-table helper

**Files:**
- Create: `src/lib/eval/field-value-coerce.ts`
- Modify: `src/lib/mcp/tools/fields.ts` (replace the `toFieldValue` body by a re-export)
- Create: `src/lib/scenarios/types.ts`, `src/lib/scenarios/format.ts`, `src/lib/scenarios/values.ts`, `src/lib/scenarios/missing-table.ts`
- Test: `src/lib/scenarios/__tests__/values.test.ts`

**Interfaces:**
- Consumes: `FieldValue` (`src/lib/state/worksheet-store.ts`, type-only), `ReportParameter` (`src/lib/eval/evaluate-for-report.ts`).
- Produces:
  - `toFieldValue(dataType: string, raw: unknown): FieldValue` (throws `Error` with a German message on bad input)
  - `type ScenarioValue = FieldValue`; `MAX_ACTIVE_SCENARIOS = 6`; `firstFreeSlot(active: readonly number[]): number | null`
  - all result types listed in Step 3 (`ScenarioSummary`, `OverrideSummary`, `IterationSeries`, `ScenarioRun`, `SheetRun`, `RunCell`, `StoredMismatch`, `ScenarioResultsPayload`)
  - `fmtNum(x: number, locale: 'de' | 'en'): string`
  - `paramToFieldValue(dataType, p): ScenarioValue | null`, `fieldValueToParameter(fieldId, v): ReportParameter`, `fieldValueEqual(a, b): boolean`, `scalarOfParameter(dataType, p): number | string | boolean | null`, `formatScenarioValue(v, locale): string`
  - `isMissingRelationError(err: unknown): boolean`, `SCENARIOS_UNAVAILABLE: Record<'de'|'en', string>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scenarios/__tests__/values.test.ts
import { describe, it, expect } from 'vitest';
import { firstFreeSlot, MAX_ACTIVE_SCENARIOS } from '../types';
import { fmtNum } from '../format';
import { paramToFieldValue, fieldValueToParameter, fieldValueEqual, formatScenarioValue } from '../values';
import { isMissingRelationError } from '../missing-table';
import { toFieldValue } from '@/lib/eval/field-value-coerce';
import { toFieldValue as reexported } from '@/lib/mcp/tools/fields';

describe('slots', () => {
  it('takes the lowest free slot 1..6 and refuses the 7th', () => {
    expect(MAX_ACTIVE_SCENARIOS).toBe(6);
    expect(firstFreeSlot([])).toBe(1);
    expect(firstFreeSlot([1, 2, 4])).toBe(3);
    expect(firstFreeSlot([1, 2, 3, 4, 5, 6])).toBeNull();
  });
});

describe('fmtNum', () => {
  it('formats DE/EN without grouping and small values as powers of ten', () => {
    expect(fmtNum(70.0037505216, 'de')).toBe('70,0038');
    expect(fmtNum(70.0037505216, 'en')).toBe('70.0038');
    expect(fmtNum(10080, 'de')).toBe('10080');
    expect(fmtNum(3e-8, 'de')).toBe('3·10⁻⁸');
    expect(fmtNum(1.5e-5, 'en')).toBe('1.5·10⁻⁵');
    expect(fmtNum(0.0015, 'de')).toBe('0,0015');
    expect(fmtNum(0, 'de')).toBe('0');
    expect(fmtNum(Number.NaN, 'de')).toBe('—');
  });
});

describe('values', () => {
  it('round-trips a number through parameter columns (numeric arrives as string from drizzle)', () => {
    expect(paramToFieldValue('number', { valueNumber: '1e-6', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }))
      .toEqual({ type: 'number', value: 1e-6 });
    const p = fieldValueToParameter('f1', { type: 'enum', value: 'geometry' });
    expect(p).toEqual({ fieldId: 'f1', valueNumber: null, valueText: null, valueEnum: 'geometry', valueBoolean: null, valueDate: null, valueJson: null });
  });
  it('compares values with a relative tolerance and null-safety', () => {
    expect(fieldValueEqual({ type: 'number', value: 3e-8 }, { type: 'number', value: 3.0000000000000004e-8 })).toBe(true);
    expect(fieldValueEqual({ type: 'number', value: 1e-6 }, { type: 'number', value: 2e-6 })).toBe(false);
    expect(fieldValueEqual(null, null)).toBe(true);
    expect(fieldValueEqual(null, { type: 'number', value: 1 })).toBe(false);
    expect(fieldValueEqual({ type: 'json', value: { rows: [1] } }, { type: 'json', value: { rows: [1] } })).toBe(true);
  });
  it('formats a case value for badges', () => {
    expect(formatScenarioValue({ type: 'number', value: 1e-5 }, 'de')).toBe('1·10⁻⁵');
    expect(formatScenarioValue({ type: 'boolean', value: true }, 'de')).toBe('Ja');
    expect(formatScenarioValue({ type: 'boolean', value: false }, 'en')).toBe('No');
    expect(formatScenarioValue(null, 'de')).toBe('—');
  });
});

describe('isMissingRelationError', () => {
  it('detects 42P01 directly and through drizzle cause chains', () => {
    expect(isMissingRelationError({ code: '42P01' })).toBe(true);
    expect(isMissingRelationError(Object.assign(new Error('wrapped'), { cause: { code: '42P01' } }))).toBe(true);
    expect(isMissingRelationError({ code: '23505' })).toBe(false);
    expect(isMissingRelationError(null)).toBe(false);
  });
});

describe('toFieldValue move', () => {
  it('is the same function from both paths and parses decimal commas', () => {
    expect(reexported).toBe(toFieldValue);
    expect(toFieldValue('number', '0,3')).toEqual({ type: 'number', value: 0.3 });
    expect(() => toFieldValue('number', 'abc')).toThrow(/keine Zahl/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/values.test.ts`
Expected: FAIL — cannot resolve `../types`.

- [ ] **Step 3: Implement**

`src/lib/eval/field-value-coerce.ts`: move the complete `toFieldValue` function body from `src/lib/mcp/tools/fields.ts` (lines 14–74 at plan time, including its doc comment) unchanged, prefixed with `export`. In `src/lib/mcp/tools/fields.ts` delete the function and add near the imports:

```ts
import { toFieldValue } from '@/lib/eval/field-value-coerce';
export { toFieldValue };
```

`src/lib/scenarios/types.ts`:

```ts
/**
 * What-if cases („Fälle") — shared, serialisable types (server actions ⇄ client components ⇄ MCP).
 * Spec: docs/superpowers/specs/2026-10-14-what-if-cases-design.md
 */
import type { FieldValue } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';
import type { EvalResult } from '@/lib/compliance/evaluate';

export type ScenarioValue = FieldValue;

/** Spec §2: at most 6 active cases per project (plus the implicit „Real"). */
export const MAX_ACTIVE_SCENARIOS = 6;

/** Lowest colour slot (1..6) not held by an active case; null at the limit. */
export function firstFreeSlot(activeSlots: readonly number[]): number | null {
  for (let s = 1; s <= MAX_ACTIVE_SCENARIOS; s++) if (!activeSlots.includes(s)) return s;
  return null;
}

export type OverrideSummary = {
  fieldId: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: string;
  worksheetCode: string;
  standardCode: string;
  value: ScenarioValue;
  baseValueAtCreation: ScenarioValue | null;
  currentReal: ScenarioValue | null;
  /** Spec §2: current real value ≠ base_value_at_creation ⇒ „Realwert geändert: alt → neu". */
  drift: boolean;
  note: string;
};

export type ScenarioSummary = {
  id: string;
  name: string;
  reason: string | null;
  /** Colour slot 1..6 (= sort_order). */
  slot: number;
  includeInReport: boolean;
  archivedAt: string | null;
  createdAt: string;
  overrides: OverrideSummary[];
};

export type IterationKind = 'gl8' | 'gl10' | 'gl16';
export type IterationPoint = { D: number; r_D: number; value: number };

/** One governing-duration iteration of one equation in one run (spec §3 step 5). */
export type IterationSeries = {
  /** 'A138-13:Gl8' | 'A138-26:Gl10:T30' | 'A138-26:Gl10:T100' | 'A138-17:Gl16' */
  key: string;
  kind: IterationKind;
  worksheetCode: string;
  equationLabel: string;
  outputSymbol: string;
  unit: string;
  /** Return period of the rain column used (a). */
  returnPeriod: number | null;
  /** The scalar inputs substituted at every D (for the step-through). */
  scalars: Record<string, number>;
  perDuration: IterationPoint[];
  governingD: number | null;
  r_D_at_governing: number | null;
  /** Raw maximum (before any floor). */
  governingValue: number | null;
  boundaryLimited: boolean;
  /** Gl. 10: a negative V_Rück is displayed as 0 (§ 5.3.4). */
  floorAtZero: boolean;
};

export type ValueOrigin = 'entered' | 'override' | 'computed' | 'carried';

export type RunCell = {
  worksheetCode: string;
  symbol: string;
  dataType: string;
  value: number | string | boolean | null;
  origin: ValueOrigin;
};

export type SheetRun = {
  code: string;
  equations: Array<{ equationId: string; equationNumber: string; outputSymbol: string | null; state: EvalState }>;
  compliance: Array<{ code: string; titleDe: string; severity: string; result: EvalResult }>;
  hiddenSymbols: string[];
};

export type StoredMismatch = {
  fieldId: string;
  worksheetCode: string;
  symbol: string;
  stored: number | string | boolean | null;
  computed: number | string | boolean | null;
};

export type ScenarioRun = {
  /** 'real' or the scenario id. */
  caseId: string;
  converged: boolean;
  passes: number;
  /** Non-json fields only, keyed by field id. */
  values: Record<string, RunCell>;
  sheets: Record<string, SheetRun>;
  iterations: IterationSeries[];
  /** Real run only: stored derived values that differ from this run (spec §3 step 6). */
  mismatches: StoredMismatch[];
  /** Stored derived values no equation/mirror of A1 recomputes — carried from the record (spec gap G-2). */
  notRecomputed: Array<{ worksheetCode: string; symbol: string }>;
  skippedOverrides: Array<{ fieldId: string; reason: string }>;
};

export type ScenarioResultsPayload = {
  /** false while the staged tables are absent. */
  available: boolean;
  standardCode: string;
  real: ScenarioRun | null;
  cases: Array<{ scenario: ScenarioSummary; run: ScenarioRun }>;
  ignoredScenarioIds: string[];
};
```

`src/lib/scenarios/format.ts`:

```ts
/** Number display for cases, chart and step-through: no grouping, 6 significant digits, |x| < 10⁻³ as m·10ⁿ. */
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

export function fmtNum(x: number, locale: 'de' | 'en'): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const tag = locale === 'en' ? 'en-GB' : 'de-DE';
  if (Math.abs(x) < 1e-3) {
    const [m, e] = x.toExponential(3).split('e');
    const mant = new Intl.NumberFormat(tag, { maximumFractionDigits: 3, useGrouping: false }).format(Number(m));
    const exp = String(Number(e)).split('').map((c) => SUP[c] ?? c).join('');
    return `${mant}·10${exp}`;
  }
  return new Intl.NumberFormat(tag, { maximumSignificantDigits: 6, useGrouping: false }).format(x);
}
```

`src/lib/scenarios/values.ts`:

```ts
import type { ReportParameter } from '@/lib/eval/evaluate-for-report';
import type { ScenarioValue } from './types';
import { fmtNum } from './format';

type ParamCols = {
  valueNumber: unknown; valueText: string | null; valueEnum: string | null;
  valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown;
};

export function paramToFieldValue(dataType: string, p: ParamCols | null | undefined): ScenarioValue | null {
  if (!p) return null;
  switch (dataType) {
    case 'number': return p.valueNumber == null ? null : { type: 'number', value: Number(p.valueNumber) };
    case 'text': return p.valueText == null ? null : { type: 'text', value: p.valueText };
    case 'enum': return p.valueEnum == null ? null : { type: 'enum', value: p.valueEnum };
    case 'boolean': return p.valueBoolean == null ? null : { type: 'boolean', value: p.valueBoolean };
    case 'date': return p.valueDate == null ? null : { type: 'date', value: p.valueDate };
    case 'json': return p.valueJson == null ? null : { type: 'json', value: p.valueJson };
    default: return null;
  }
}

export function fieldValueToParameter(fieldId: string, v: ScenarioValue): ReportParameter {
  const p: ReportParameter = { fieldId, valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
  switch (v.type) {
    case 'number': p.valueNumber = v.value; break;
    case 'text': p.valueText = v.value; break;
    case 'enum': p.valueEnum = v.value; break;
    case 'boolean': p.valueBoolean = v.value; break;
    case 'date': p.valueDate = v.value; break;
    case 'json': p.valueJson = v.value ?? null; break;
  }
  return p;
}

export function scalarOfParameter(dataType: string, p: ReportParameter | undefined): number | string | boolean | null {
  if (!p) return null;
  switch (dataType) {
    case 'number': return p.valueNumber == null ? null : Number(p.valueNumber);
    case 'text': return p.valueText;
    case 'enum': return p.valueEnum;
    case 'boolean': return p.valueBoolean;
    case 'date': return p.valueDate;
    default: return null;
  }
}

export function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b)) || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
}

export function fieldValueEqual(a: ScenarioValue | null, b: ScenarioValue | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (a.type !== b.type) return false;
  if (a.type === 'number' && b.type === 'number') {
    if (a.value == null || b.value == null) return a.value == null && b.value == null;
    return numbersEqual(a.value, b.value);
  }
  if (a.type === 'json') return JSON.stringify(a.value ?? null) === JSON.stringify(b.value ?? null);
  return a.value === b.value;
}

export function formatScenarioValue(v: ScenarioValue | null, locale: 'de' | 'en'): string {
  if (v == null || v.value == null) return '—';
  switch (v.type) {
    case 'number': return fmtNum(v.value, locale);
    case 'boolean': return v.value ? (locale === 'en' ? 'Yes' : 'Ja') : (locale === 'en' ? 'No' : 'Nein');
    case 'json': {
      const rows = (v.value as { rows?: unknown[] })?.rows;
      return Array.isArray(rows) ? (locale === 'en' ? `${rows.length} rows` : `${rows.length} Zeilen`) : 'JSON';
    }
    default: return String(v.value);
  }
}
```

`src/lib/scenarios/missing-table.ts`:

```ts
/** Postgres `undefined_table` (42P01) — the staged case tables are not applied on this database yet. */
export function isMissingRelationError(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e != null && typeof e === 'object'; i++) {
    if ((e as { code?: unknown }).code === '42P01') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export const SCENARIOS_UNAVAILABLE: Record<'de' | 'en', string> = {
  de: 'Fälle sind auf dieser Datenbank noch nicht eingerichtet (Migration 20261014120000 fehlt).',
  en: 'Cases are not set up on this database yet (migration 20261014120000 missing).',
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/values.test.ts src/lib/mcp/__tests__/to-field-value.test.ts` → Expected: PASS (both files).
Run: `pnpm typecheck` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/field-value-coerce.ts src/lib/mcp/tools/fields.ts src/lib/scenarios/types.ts src/lib/scenarios/format.ts src/lib/scenarios/values.ts src/lib/scenarios/missing-table.ts src/lib/scenarios/__tests__/values.test.ts
git commit -m "feat(scenarios): shared case types, value helpers, number format, missing-table guard

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Override validation (input fields only)

**Files:**
- Create: `src/lib/scenarios/validate-override.ts`
- Test: `src/lib/scenarios/__tests__/validate-override.test.ts`

**Interfaces:**
- Consumes: `toFieldValue` (Task 2), `derivedOutputSymbols` (`src/lib/eval/derived-output-symbols.ts`), `resolveRegisterConfig` (`src/lib/eval/register-configs.ts`).
- Produces:
  - `SERVER_MATERIALISED_SYMBOLS: readonly string[]`
  - `type OverrideFieldMeta = { id: string; symbol: string; labelDe: string; dataType: string; active: boolean; widget: string | null; uiConfig: unknown; enumValues: Array<{ value: string }> | null; validationRules: { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null }`
  - `overrideRefusal(field: OverrideFieldMeta, templateEquations: ReadonlyArray<{ id: string; outputSymbol: string | null }>, storedSourceType: string | null): string | null`
  - `coerceOverrideValue(field: OverrideFieldMeta, raw: unknown): { ok: true; value: ScenarioValue } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scenarios/__tests__/validate-override.test.ts
import { describe, it, expect } from 'vitest';
import { overrideRefusal, coerceOverrideValue, SERVER_MATERIALISED_SYMBOLS, type OverrideFieldMeta } from '../validate-override';

const base = (over: Partial<OverrideFieldMeta>): OverrideFieldMeta => ({
  id: 'f', symbol: 'k_f', labelDe: 'Durchlässigkeitsbeiwert', dataType: 'number', active: true,
  widget: null, uiConfig: null, enumValues: null, validationRules: null, ...over,
});
const A138_11_EQS = [{ id: 'gl6', outputSymbol: 'f_K' }, { id: 'gl5', outputSymbol: 'k_i' }];

describe('overrideRefusal (spec §2: only input fields)', () => {
  it('accepts an engineer input', () => {
    expect(overrideRefusal(base({}), A138_11_EQS, 'entered')).toBeNull();
    expect(overrideRefusal(base({}), A138_11_EQS, null)).toBeNull();
  });
  it('refuses an equation output (k_i = Gl. 5)', () => {
    expect(overrideRefusal(base({ symbol: 'k_i' }), A138_11_EQS, 'derived')).toMatch(/wird berechnet/);
    expect(overrideRefusal(base({ symbol: 'k_i' }), A138_11_EQS, null)).toMatch(/wird berechnet/);
  });
  it('refuses a server-materialised symbol (V_M) and a stored derived row', () => {
    expect(SERVER_MATERIALISED_SYMBOLS).toContain('V_M');
    expect(SERVER_MATERIALISED_SYMBOLS).toContain('A_S_m');
    expect(overrideRefusal(base({ symbol: 'V_M' }), [], null)).toMatch(/vom Werkzeug berechnet/);
    expect(overrideRefusal(base({ symbol: 'q_any' }), [], 'derived')).toMatch(/abgeleiteter Wert/);
  });
  it('refuses lookup_fill and inactive fields', () => {
    expect(overrideRefusal(base({ widget: 'lookup_fill' }), [], null)).toMatch(/Tabelle/);
    expect(overrideRefusal(base({ active: false }), [], null)).toMatch(/deaktiviert/);
  });
});

describe('coerceOverrideValue', () => {
  it('parses numbers incl. exponent and decimal comma, refuses text and empty', () => {
    expect(coerceOverrideValue(base({}), '1e-5')).toEqual({ ok: true, value: { type: 'number', value: 1e-5 } });
    expect(coerceOverrideValue(base({}), '0,3')).toEqual({ ok: true, value: { type: 'number', value: 0.3 } });
    expect(coerceOverrideValue(base({}), 'abc').ok).toBe(false);
    expect(coerceOverrideValue(base({}), '').ok).toBe(false);
    expect(coerceOverrideValue(base({}), null).ok).toBe(false);
  });
  it('applies validation_rules min/max', () => {
    const f = base({ validationRules: { min: 0, max: 1 } });
    expect(coerceOverrideValue(f, 1.5)).toEqual({ ok: false, error: expect.stringMatching(/Maximum 1/) });
    expect(coerceOverrideValue(f, -1)).toEqual({ ok: false, error: expect.stringMatching(/Minimum 0/) });
  });
  it('refuses an invalid enum value and accepts a listed one', () => {
    const f = base({ symbol: 'a_s_m_determination_method', dataType: 'enum', enumValues: [{ value: 'direct' }, { value: 'geometry' }] });
    expect(coerceOverrideValue(f, 'geometry')).toEqual({ ok: true, value: { type: 'enum', value: 'geometry' } });
    const bad = coerceOverrideValue(f, 'magic');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/keine zulässige Auswahl \(direct, geometry\)/);
  });
  it('accepts an extensible enum value outside the list', () => {
    const f = base({ dataType: 'enum', enumValues: [{ value: 'a' }], validationRules: { extensible: true } });
    expect(coerceOverrideValue(f, 'custom').ok).toBe(true);
  });
  it('checks register column keys (surface_inventory TS fallback config)', () => {
    const f = base({ symbol: 'surface_inventory', dataType: 'json' });
    expect(coerceOverrideValue(f, { rows: [{ id: 'r1', label: 'Dach', area_m2: 326.2, c_i: 0.9, kind: 'paved' }] }).ok).toBe(true);
    const bad = coerceOverrideValue(f, { rows: [{ area: 1 }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/unbekannte Spalte\(n\) area/);
    expect(coerceOverrideValue(f, '[{"label":"x"}]').ok).toBe(true); // bare array wrapped by toFieldValue
    expect(coerceOverrideValue(f, { notRows: 1 }).ok).toBe(false);
  });
  it('validates dates and text length', () => {
    expect(coerceOverrideValue(base({ dataType: 'date' }), '2026-10-14').ok).toBe(true);
    expect(coerceOverrideValue(base({ dataType: 'date' }), '14.10.2026').ok).toBe(false);
    expect(coerceOverrideValue(base({ dataType: 'text', validationRules: { maxLength: 3 } }), 'abcd').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/validate-override.test.ts`
Expected: FAIL — cannot resolve `../validate-override`.

- [ ] **Step 3: Implement**

```ts
// src/lib/scenarios/validate-override.ts
/**
 * Spec §2: only INPUT fields can be overridden; the value is validated with the field's own rules
 * (data type, enum values, register column keys, validation_rules). Pure.
 */
import { toFieldValue } from '@/lib/eval/field-value-coerce';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import type { ScenarioValue } from './types';

/** Symbols written by saveWorksheet's server materialisations (worksheet.ts producer blocks), not by an equation. */
export const SERVER_MATERIALISED_SYMBOLS: readonly string[] = [
  // basin Gl. 8 governing pair (materialize-basin-governing.ts)
  'r_D_n', 'D_min',
  // A_S,m single source + Tab. 6 loading check (asm / loading blocks)
  'A_S_m', 'a_s_m_needs_reconfirmation', 'ac_as_ratio', 'ac_as_ratio_limit', 'ac_as_ratio_check', 'ac_as_ratio_check_reason',
  // facility governing volumes + swale/trench/shaft sweeps (materialize-asm.ts)
  'V_M', 'V_R', 'V_MR', 'V_S', 'V_B', 'k_i_Mulde', 'k_i_BBZ', 'V_M_erf', 'D_used_M', 'r_D_n_used_M',
  'D_used_R', 'r_D_n_used_R', 'h_S', 'V_MUE', 'Q_MUE', 'r_MUE',
  // Phase-4 summary (A138-23)
  'facility_type_dimensioned', 'facility_specific_volume_m3', 'facility_footprint_m2', 'facility_meets_qsac',
  'facility_specific_dimensioning_complete', 'recommended_phase_4_gate', 'phase_4_recommendation_reasons',
];

export type OverrideFieldMeta = {
  id: string;
  symbol: string;
  labelDe: string;
  dataType: string;
  active: boolean;
  widget: string | null;
  uiConfig: unknown;
  enumValues: Array<{ value: string }> | null;
  validationRules: { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null;
};

export function overrideRefusal(
  field: OverrideFieldMeta,
  templateEquations: ReadonlyArray<{ id: string; outputSymbol: string | null }>,
  storedSourceType: string | null,
): string | null {
  const name = `${field.labelDe} (${field.symbol})`;
  if (!field.active) return `${name} ist deaktiviert.`;
  if (field.widget === 'lookup_fill') return `${name} wird aus einer Tabelle des Regelwerks gesetzt — kein Eingabewert.`;
  if (derivedOutputSymbols(templateEquations).has(field.symbol)) {
    return `${name} wird berechnet (Gleichungsergebnis) — ein Fall ändert nur Eingabewerte.`;
  }
  if (SERVER_MATERIALISED_SYMBOLS.includes(field.symbol)) {
    return `${name} wird vom Werkzeug berechnet — ein Fall ändert nur Eingabewerte.`;
  }
  if (storedSourceType === 'derived' || storedSourceType === 'computed') {
    return `${name} ist ein abgeleiteter Wert — ein Fall ändert nur Eingabewerte.`;
  }
  return null;
}

type Result = { ok: true; value: ScenarioValue } | { ok: false; error: string };

export function coerceOverrideValue(field: OverrideFieldMeta, raw: unknown): Result {
  const name = `${field.labelDe} (${field.symbol})`;
  if (raw === null || raw === undefined || raw === '') return { ok: false, error: `${name}: ein Fall braucht einen Wert.` };
  let v: ScenarioValue;
  try {
    v = toFieldValue(field.dataType, raw) as ScenarioValue;
  } catch (e) {
    return { ok: false, error: `${name}: ${e instanceof Error ? e.message : String(e)}` };
  }
  const rules = field.validationRules ?? {};
  switch (v.type) {
    case 'number': {
      if (v.value == null || !Number.isFinite(v.value)) return { ok: false, error: `${name}: keine gültige Zahl.` };
      if (typeof rules.min === 'number' && v.value < rules.min) return { ok: false, error: `${name}: ${v.value} liegt unter dem zulässigen Minimum ${rules.min}.` };
      if (typeof rules.max === 'number' && v.value > rules.max) return { ok: false, error: `${name}: ${v.value} liegt über dem zulässigen Maximum ${rules.max}.` };
      break;
    }
    case 'enum': {
      const allowed = (field.enumValues ?? []).map((o) => o.value);
      if (allowed.length > 0 && !allowed.includes(String(v.value)) && rules.extensible !== true) {
        return { ok: false, error: `${name}: „${v.value}" ist keine zulässige Auswahl (${allowed.join(', ')}).` };
      }
      break;
    }
    case 'text': {
      if (typeof rules.maxLength === 'number' && String(v.value ?? '').length > rules.maxLength) {
        return { ok: false, error: `${name}: höchstens ${rules.maxLength} Zeichen.` };
      }
      break;
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.value ?? ''))) return { ok: false, error: `${name}: Datum im Format JJJJ-MM-TT erwartet.` };
      break;
    }
    case 'json': {
      const cfg = resolveRegisterConfig({ symbol: field.symbol, dataType: field.dataType, widget: field.widget, uiConfig: field.uiConfig });
      if (cfg) {
        const rows = (v.value as { rows?: unknown } | null)?.rows;
        if (!Array.isArray(rows)) return { ok: false, error: `${name}: Register erwartet {"rows":[…]}.` };
        const keys = new Set(['id', ...cfg.columns.map((c) => c.key)]);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row == null || typeof row !== 'object' || Array.isArray(row)) return { ok: false, error: `${name}: Zeile ${i + 1} ist kein Objekt.` };
          const bad = Object.keys(row as object).filter((k) => !keys.has(k));
          if (bad.length > 0) {
            return { ok: false, error: `${name}: Zeile ${i + 1}: unbekannte Spalte(n) ${bad.join(', ')} — erlaubt: ${[...keys].join(', ')}.` };
          }
        }
      } else if (v.value == null || typeof v.value !== 'object') {
        return { ok: false, error: `${name}: JSON-Objekt erwartet.` };
      }
      break;
    }
    case 'boolean':
      break;
  }
  return { ok: true, value: v };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/validate-override.test.ts` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scenarios/validate-override.ts src/lib/scenarios/__tests__/validate-override.test.ts
git commit -m "feat(scenarios): override validation — input fields only, field rules reused

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Iteration series (Gl. 8, Gl. 10 at T 30/100, Gl. 16)

**Files:**
- Modify: `src/lib/eval/materialize-asm.ts` (`computeMuldeGeometrySweep` return type, additive)
- Create: `src/lib/scenarios/iteration-series.ts`
- Test: `src/lib/scenarios/__tests__/iteration-series.test.ts`

**Interfaces:**
- Consumes: `iterateGoverningDuration`, `GOVERNING_PROFILES` (`src/lib/eval/governing-duration.ts`); `computeMuldeGeometrySweep`; `evaluateFormula` + `floodCarrierFromSum` (test cross-check only).
- Produces:
  - `computeMuldeGeometrySweep(rows, scalars): { A_S_m; governingD; boundaryLimited; perDuration: Array<{D;r_D;value}>; r_D_at_governing: number | null }`
  - `type RainRow = { D_min: number | null; r_D_n: number | null }`
  - `gl8Series(rows: readonly RainRow[], s: { A_C; A_VA; Q_S; Q_Dr; f_Z; f_A }, T_n: number | null): IterationSeries`
  - `gl10Series(rows: readonly RainRow[], s: { AcS_paved; A_VA; Q_S; Q_Dr; V_VA }, T: 30 | 100): IterationSeries`
  - `gl16Series(rows: readonly RainRow[], s: { A_C; h_M; f_Z; k_i }, T_n: number | null): IterationSeries`
  - `displayValue(series: IterationSeries, v: number): number` (floors Gl. 10 at 0)

- [ ] **Step 1: Write the failing test** (hand values from spec §6 and the C4 ledger 2026-10-14; KOSTRA-DWD-2020 cell 151093 exact DWD values — test data only)

```ts
// src/lib/scenarios/__tests__/iteration-series.test.ts
import { describe, it, expect } from 'vitest';
import { gl8Series, gl10Series, gl16Series, displayValue } from '../iteration-series';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { evaluateFormula } from '@/lib/eval/formula';
import { floodCarrierFromSum } from '@/lib/eval/aggregators';
import { KOSTRA_151093, rows } from '../__fixtures__/c4-a138-chain';

const close = (a: number | null, b: number, rel = 1e-9) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
};
const AC = 526.2105;
const SUM_CS = 602.161;

describe('Gl. 8 (A138-13) — record state, T = 5 a', () => {
  it('V_VA = 70.0038 m³ at D = 10080 min, boundary-limited (spec §6)', () => {
    const s = gl8Series(rows(5), { A_C: AC, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, 5);
    close(s.governingValue, 70.0037505216, 1e-9);
    expect(s.governingD).toBe(10080);
    expect(s.r_D_at_governing).toBe(1.7);
    expect(s.boundaryLimited).toBe(true);
    expect(s.perDuration).toHaveLength(22);
    expect(s.key).toBe('A138-13:Gl8');
  });
  it('equals the real Gl. 8 aggregator (same governing value)', () => {
    const r = rows(5).map((x, i) => ({ id: `r${i}`, ...x }));
    const state = evaluateFormula({
      equationId: '69f31e6e-a755-4246-af10-ae46668b5c86', formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3',
      inputSymbols: [], outputSymbol: 'V_VA', inputs: [],
      aggregator: { kostraTable: { rows: r }, gl8Scalars: { A_C: AC, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, kostraUnit: null },
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') close(state.value, 70.0037505216);
  });
});

describe('Gl. 10 (A138-26) — prototype cases F0/K5/K6 × T 30/100 (spec §6)', () => {
  const cases = [
    { n: 'F0', A_VA: 0, Q_S: 0, V_VA: 0, t30: [94.688612928, 10080], t100: [116.539831296, 10080] },
    { n: 'K5', A_VA: 48.58, Q_S: 0.4858, V_VA: 14.57, t30: [13.5907354, 360], t100: [24.50850184, 540] },
    { n: 'K6', A_VA: 105.2, Q_S: 0.1052, V_VA: 31.56, t30: [27.345706464, 4320], t100: [49.425581568, 5760] },
  ] as const;
  for (const c of cases) {
    it(`${c.n}: T 30 a ${c.t30[0].toFixed(2)} m³ @ ${c.t30[1]} min · T 100 a ${c.t100[0].toFixed(2)} m³ @ ${c.t100[1]} min`, () => {
      const s30 = gl10Series(rows(30), { AcS_paved: SUM_CS, A_VA: c.A_VA, Q_S: c.Q_S, Q_Dr: 0, V_VA: c.V_VA }, 30);
      const s100 = gl10Series(rows(100), { AcS_paved: SUM_CS, A_VA: c.A_VA, Q_S: c.Q_S, Q_Dr: 0, V_VA: c.V_VA }, 100);
      close(s30.governingValue, c.t30[0], 1e-8);
      expect(s30.governingD).toBe(c.t30[1]);
      close(s100.governingValue, c.t100[0], 1e-8);
      expect(s100.governingD).toBe(c.t100[1]);
      expect(s30.key).toBe('A138-26:Gl10:T30');
      expect(s100.key).toBe('A138-26:Gl10:T100');
      expect(s30.floorAtZero).toBe(true);
    });
  }
  it('record state T 30 a = 31.6401 m³ and T 100 a = 55.3057 m³ at D 10080 (ledger, F-A7)', () => {
    const sc = { AcS_paved: SUM_CS, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216 };
    close(gl10Series(rows(30), sc, 30).governingValue, 31.640062406400006, 1e-9);
    close(gl10Series(rows(100), sc, 100).governingValue, 55.30568077439999, 1e-9);
  });
  it('the T 30 series equals the real Gl. 10 aggregator (max(0, governing))', () => {
    const sc = { A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216, D: null, r_D_T_n_Ue: null };
    const state = evaluateFormula({
      equationId: '8e3c7e22-e3c7-449a-b267-928332c89306', formula: 'V_Rueck = 0', inputSymbols: [], outputSymbol: 'V_Rueck', inputs: [],
      aggregator: {
        floodSubAreas: floodCarrierFromSum(SUM_CS), gl10Scalars: sc, kostraUnit: null,
        floodKostra30Col: { rows: rows(30).map((x, i) => ({ id: `r${i}`, ...x })) }, missingFlood30Reason: null,
      },
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') close(state.value, 31.640062406400006);
  });
  it('displays a negative V_Rück as 0', () => {
    const s = gl10Series(rows(30), { AcS_paved: SUM_CS, A_VA: 0, Q_S: 0, Q_Dr: 0, V_VA: 1e6 }, 30);
    expect(displayValue(s, -5)).toBe(0);
  });
});

describe('Gl. 16 (A138-17) — swale area per case', () => {
  it('K5 k_i 1·10⁻⁵ → A_S,m 48.58 m² at D 180 min (spec §6)', () => {
    const s = gl16Series(rows(5), { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, 5);
    close(s.governingValue, 48.57599051396648);
    expect(s.governingD).toBe(180);
    expect(s.boundaryLimited).toBe(false);
  });
  it('K6 k_i 1·10⁻⁶ → A_S,m 93.25 m² at D 1440 min; Gl. 9 minimum 105.2 m²', () => {
    const s = gl16Series(rows(5), { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-6 }, 5);
    close(s.governingValue, 93.2537609036861);
    expect(s.governingD).toBe(1440);
    // Gl. 9 inverted at q_S,AC = 2 l/(s·ha): A_S,m ≥ 2·A_C / (k_i·10⁷)
    close((2 * AC) / (1e-6 * 1e7), 105.2421);
  });
  it('is the same iteration as the save path sweep', () => {
    const sc = { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 };
    const sweep = computeMuldeGeometrySweep(rows(5), sc);
    expect(sweep.perDuration).toHaveLength(22);
    expect(gl16Series(rows(5), sc, 5).governingValue).toBe(sweep.A_S_m);
    expect(sweep.r_D_at_governing).toBe(30.6);
  });
  it('fixture grid is the 22 × 3 DWD column set', () => {
    expect(KOSTRA_151093.D).toHaveLength(22);
  });
});
```

(The fixture module with `KOSTRA_151093` and `rows(T)` is created in this task's Step 3 as its first section; Task 7 extends it.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/iteration-series.test.ts`
Expected: FAIL — cannot resolve `../iteration-series`.

- [ ] **Step 3: Implement**

In `src/lib/eval/materialize-asm.ts` replace `computeMuldeGeometrySweep` with (behaviour unchanged, two extra fields):

```ts
export function computeMuldeGeometrySweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; h_M: number; f_Z: number; k_i: number },
): {
  A_S_m: number | null; governingD: number | null; boundaryLimited: boolean;
  /** What-if cases (2026-10-14): the per-duration rows of the same sweep, for the iteration chart. */
  perDuration: Array<{ D: number; r_D: number; value: number }>;
  r_D_at_governing: number | null;
} {
  const gov = iterateGoverningDuration(rows, (D, r_D) =>
    (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i),
  );
  return {
    A_S_m: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited,
    perDuration: gov.perDuration, r_D_at_governing: gov.r_D_at_governing,
  };
}
```

Create the first section of `src/lib/scenarios/__fixtures__/c4-a138-chain.ts`:

```ts
/**
 * TEST FIXTURE ONLY — anonymised A 138 chain shaped like case C4 (TEST-M820-C4, ledger 2026-10-14).
 * KOSTRA-DWD-2020 cell 151093, exact DWD rN values (l/(s·ha)), columns T = 5 / 30 / 100 a.
 * Never import from app/UI code.
 */
export const KOSTRA_151093 = {
  D: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080],
  T5: [340, 221.7, 171.1, 140.8, 107.2, 81.1, 66.1, 49.8, 40.7, 30.6, 24.9, 18.7, 14.0, 11.4, 8.5, 6.9, 4.2, 3.2, 2.6, 2.2, 1.9, 1.7],
  T30: [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6],
  T100: [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2],
} as const;

/** 1-D column as the iteration consumes it. */
export function rows(T: 5 | 30 | 100): Array<{ D_min: number; r_D_n: number }> {
  const col = T === 5 ? KOSTRA_151093.T5 : T === 30 ? KOSTRA_151093.T30 : KOSTRA_151093.T100;
  return KOSTRA_151093.D.map((d, i) => ({ D_min: d, r_D_n: col[i] }));
}

/** Native 2-D rainfall carrier (rainfall-tables.ts) as stored on A138-04 r_D_n_table. */
export function rainfallCarrier() {
  return {
    tables: [{
      id: 'kostra-151093', name: 'KOSTRA-DWD-2020 151093', source: 'KOSTRA-DWD-2020', gridCell: '151093',
      columns: [5, 30, 100],
      rows: KOSTRA_151093.D.map((d, i) => ({ D_min: d, r: { '5': KOSTRA_151093.T5[i], '30': KOSTRA_151093.T30[i], '100': KOSTRA_151093.T100[i] } })),
    }],
  };
}
```

`src/lib/scenarios/iteration-series.ts`:

```ts
/**
 * Per-duration iteration series for the case chart and step-through (spec §3 step 5, §4.3/4.4).
 * The sizing functions are the REGISTERED ones (GOVERNING_PROFILES / computeMuldeGeometrySweep) — no second formula.
 */
import { GOVERNING_PROFILES, iterateGoverningDuration } from '@/lib/eval/governing-duration';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import type { IterationSeries } from './types';

export type RainRow = { D_min: number | null; r_D_n: number | null };

const profile = (facility: string) => {
  const p = GOVERNING_PROFILES.find((x) => x.facility === facility);
  if (!p) throw new Error(`governing profile ${facility} missing`);
  return p;
};

export function gl8Series(
  rows: readonly RainRow[],
  s: { A_C: number; A_VA: number; Q_S: number; Q_Dr: number; f_Z: number; f_A: number },
  T_n: number | null,
): IterationSeries {
  const p = profile('A138-13');
  const g = iterateGoverningDuration(rows, (D, r) => p.sizing(D, r, s));
  return {
    key: 'A138-13:Gl8', kind: 'gl8', worksheetCode: 'A138-13', equationLabel: 'Gl. 8', outputSymbol: 'V_VA', unit: 'm³',
    returnPeriod: T_n, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.governingValue, boundaryLimited: g.boundaryLimited, floorAtZero: false,
  };
}

export function gl10Series(
  rows: readonly RainRow[],
  s: { AcS_paved: number; A_VA: number; Q_S: number; Q_Dr: number; V_VA: number },
  T: 30 | 100,
): IterationSeries {
  const p = profile('A138-26');
  const g = iterateGoverningDuration(rows, (D, r) => p.sizing(D, r, s));
  return {
    key: `A138-26:Gl10:T${T}`, kind: 'gl10', worksheetCode: 'A138-26', equationLabel: 'Gl. 10', outputSymbol: 'V_Rueck', unit: 'm³',
    returnPeriod: T, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.governingValue, boundaryLimited: g.boundaryLimited, floorAtZero: true,
  };
}

export function gl16Series(
  rows: readonly RainRow[],
  s: { A_C: number; h_M: number; f_Z: number; k_i: number },
  T_n: number | null,
): IterationSeries {
  const g = computeMuldeGeometrySweep(rows, s);
  return {
    key: 'A138-17:Gl16', kind: 'gl16', worksheetCode: 'A138-17', equationLabel: 'Gl. 16', outputSymbol: 'A_S_m', unit: 'm²',
    returnPeriod: T_n, scalars: { ...s }, perDuration: g.perDuration, governingD: g.governingD,
    r_D_at_governing: g.r_D_at_governing, governingValue: g.A_S_m, boundaryLimited: g.boundaryLimited, floorAtZero: false,
  };
}

export function displayValue(series: Pick<IterationSeries, 'floorAtZero'>, v: number): number {
  return series.floorAtZero ? Math.max(0, v) : v;
}
```

- [ ] **Step 4: Run tests (new + existing sweep tests)**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/iteration-series.test.ts src/lib/eval/__tests__/materialize-asm.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/materialize-asm.ts src/lib/scenarios/iteration-series.ts src/lib/scenarios/__fixtures__/c4-a138-chain.ts src/lib/scenarios/__tests__/iteration-series.test.ts
git commit -m "feat(scenarios): per-duration iteration series for Gl. 8, Gl. 10 (T 30/100), Gl. 16

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: A 138 Mulde mirror + per-sheet series selection

**Files:**
- Create: `src/lib/scenarios/a138-mirror.ts`
- Create: `src/lib/scenarios/sheet-series.ts`
- Test: `src/lib/scenarios/__tests__/a138-mirror.test.ts`

**Interfaces:**
- Consumes: `materializeAsm`, `computeMuldeGeometrySweep`, `computeMuldeRequiredVolumeSweep`, `swaleDesignInfiltrationRate`, `facilityGoverningVolume` (`src/lib/eval/materialize-asm.ts`); `normalizeRainfallCarrier`, `resolveSelectedTable`, `resolveColumn`, `facilityReturnPeriod` (`src/lib/eval/rainfall-tables.ts`); `gl8Series`, `gl10Series`, `gl16Series` (Task 4); `BASIN_GL8_EQUATION_ID` (`governing-duration.ts`); `ASM_GL16_EQUATION_ID` (`asm-source.ts`); `rainfallCarrier` (fixture, Task 4).
- Produces:
  - `A138_STANDARD_CODE = 'DWA-A-138-1'`, `A138_GL10_EQUATION_ID = '8e3c7e22-e3c7-449a-b267-928332c89306'`
  - `type MirrorAccessor = { num(sym: string): number | null; str(sym: string): string | null; json(sym: string): unknown }`
  - `type MirrorWrite = { worksheetCode: string; symbol: string; value: number | null }`
  - `normaliseFacility(raw: string | null): FacilityType | null` (lower-cases `MRE`/`MRS`)
  - `facilityRainRows(sheetCode: string, acc: MirrorAccessor, forceT?: number): { rows: Array<{ D_min: number | null; r_D_n: number | null }>; T: number | null } | null`
  - `mirrorA138(sheetCode: string, acc: MirrorAccessor): MirrorWrite[]` — `'A138-12'`: A_S,m for `geometry` (Mulde/MRE/MRS swale sweep) and `soil_estimate`; `[]` for `direct`/`manual` (the Gl. 7 equation or the engineer owns it) and for a non-swale geometry (not mirrored in A1 ⇒ carried). `'A138-17'` (plain `mulde` only): `k_i_Mulde`, `V_M_erf`, `D_used_M`, `r_D_n_used_M`, `V_M`. Anything else: `[]`.
  - `seriesForSheet(sheetCode: string, equationIds: readonly string[], acc: MirrorAccessor): IterationSeries[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scenarios/__tests__/a138-mirror.test.ts
import { describe, it, expect } from 'vitest';
import { mirrorA138, facilityRainRows, type MirrorAccessor } from '../a138-mirror';
import { seriesForSheet } from '../sheet-series';
import { rainfallCarrier } from '../__fixtures__/c4-a138-chain';

function acc(nums: Record<string, number>, strs: Record<string, string> = {}): MirrorAccessor {
  const carrier = rainfallCarrier();
  return {
    num: (s) => (s in nums ? nums[s] : null),
    str: (s) => (s in strs ? strs[s] : null),
    json: (s) => (s === 'r_D_n_table' ? carrier : undefined),
  };
}
const close = (a: number | null | undefined, b: number) => expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
const w = (ws: ReturnType<typeof mirrorA138>, sym: string) => ws.find((x) => x.symbol === sym)?.value;

describe('facilityRainRows', () => {
  it('A138-17 uses the project n = 0.2 ⇒ T = 5 a column', () => {
    const r = facilityRainRows('A138-17', acc({ n: 0.2 }));
    expect(r?.T).toBe(5);
    expect(r?.rows[21]).toMatchObject({ D_min: 10080, r_D_n: 1.7 });
  });
  it('forceT selects the flood column', () => {
    expect(facilityRainRows('A138-26', acc({}), 100)?.rows[0].r_D_n).toBe(630);
  });
});

describe('mirrorA138 A138-12 (A_S,m single source)', () => {
  it('direct ⇒ no write (Gl. 7 equation owns it)', () => {
    expect(mirrorA138('A138-12', acc({ A_S_min: 40, A_S_max: 50 }, { a_s_m_determination_method: 'direct' }))).toEqual([]);
  });
  it('geometry + mulde ⇒ Gl. 16 sweep, K5 48.58 m²', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'mulde' }));
    close(w(ws, 'A_S_m'), 48.57599051396648);
  });
  it('geometry + MRE (uppercase token) uses k_i_Mulde when present', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-6, k_i_Mulde: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'MRE' }));
    close(w(ws, 'A_S_m'), 48.57599051396648);
  });
  it('geometry + rigole is not mirrored in A1 ⇒ no write (carried)', () => {
    expect(mirrorA138('A138-12', acc({}, { a_s_m_determination_method: 'geometry', facility_type_selected: 'rigole' }))).toEqual([]);
  });
  it('geometry + mulde with a missing input ⇒ A_S_m null (cleared, never stale)', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, f_Z: 1.2, k_i: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'mulde' }));
    expect(w(ws, 'A_S_m')).toBeNull();
  });
});

describe('mirrorA138 A138-17 (plain swale)', () => {
  it('record state: k_i_Mulde 3e-8, V_M 13.5, V_M,erf 70.1126 @ D 10080', () => {
    const ws = mirrorA138('A138-17', acc({ n: 0.2, A_C: 526.2105, A_S_m: 45, h_M: 0.3, f_Z: 1.2, k_i: 3e-8, A_VA: 50 }, { facility_type_selected: 'mulde' }));
    close(w(ws, 'k_i_Mulde'), 3e-8);
    close(w(ws, 'V_M'), 13.5);
    close(w(ws, 'V_M_erf'), 70.1126145216);
    expect(w(ws, 'D_used_M')).toBe(10080);
    expect(w(ws, 'r_D_n_used_M')).toBe(1.7);
  });
  it('composite facility ⇒ not mirrored in A1', () => {
    expect(mirrorA138('A138-17', acc({}, { facility_type_selected: 'MRS' }))).toEqual([]);
  });
});

describe('seriesForSheet', () => {
  const GL8 = '69f31e6e-a755-4246-af10-ae46668b5c86';
  const GL10 = '8e3c7e22-e3c7-449a-b267-928332c89306';
  const GL16 = '14999c2a-cdeb-42c1-98fd-fcdec65123da';
  it('A138-13 Gl. 8 from the visible scalars (Q_Dr absent ⇒ 0)', () => {
    const s = seriesForSheet('A138-13', [GL8], acc({ n: 0.2, A_C: 526.2105, A_VA: 50, Q_S: 0.0015, f_Z: 1.2, f_A: 1 }));
    expect(s.map((x) => x.key)).toEqual(['A138-13:Gl8']);
    close(s[0].governingValue, 70.0037505216);
  });
  it('A138-26 Gl. 10 at T 30 and T 100', () => {
    const s = seriesForSheet('A138-26', [GL10], acc({ A_C_s_flood: 602.161, A_VA: 50, Q_S: 0.0015, V_VA: 70.0037505216 }));
    expect(s.map((x) => x.key)).toEqual(['A138-26:Gl10:T30', 'A138-26:Gl10:T100']);
    close(s[1].governingValue, 55.30568077439999);
  });
  it('A138-17 Gl. 16 only for a swale facility', () => {
    const a = { n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-6 };
    expect(seriesForSheet('A138-17', [GL16], acc(a, { facility_type_selected: 'mulde' }))[0].governingD).toBe(1440);
    expect(seriesForSheet('A138-17', [GL16], acc(a, { facility_type_selected: 'rigole' }))).toEqual([]);
  });
  it('a missing scalar ⇒ no series (the equation card names what is missing)', () => {
    expect(seriesForSheet('A138-13', [GL8], acc({ n: 0.2, A_C: 526.2105, Q_S: 0.0015, f_Z: 1.2, f_A: 1 }))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/a138-mirror.test.ts`
Expected: FAIL — cannot resolve `../a138-mirror`.

- [ ] **Step 3: Implement**

```ts
// src/lib/scenarios/a138-mirror.ts
/**
 * DWA-A 138-1 — the save-path materialisations the case runner reproduces in memory (spec gap G-2).
 * Mirrors worksheet.ts (asm producer branch ≈ L1741–L1990 and the swale block ≈ L2945–L2995 at plan time) by calling the
 * SAME pure functions with the same inputs. A1 scope: the Mulde path. Everything else returns [] ⇒ the runner carries
 * the stored value and flags it `notRecomputed`.
 */
import {
  materializeAsm, computeMuldeGeometrySweep, computeMuldeRequiredVolumeSweep, swaleDesignInfiltrationRate, facilityGoverningVolume,
} from '@/lib/eval/materialize-asm';
import type { AsmMethod, FacilityType, Tab13Bodenart } from '@/lib/eval/asm-source';
import { normalizeRainfallCarrier, resolveSelectedTable, resolveColumn, facilityReturnPeriod } from '@/lib/eval/rainfall-tables';

export const A138_STANDARD_CODE = 'DWA-A-138-1';
export const A138_GL10_EQUATION_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

export type MirrorAccessor = {
  num(sym: string): number | null;
  str(sym: string): string | null;
  json(sym: string): unknown;
};
export type MirrorWrite = { worksheetCode: string; symbol: string; value: number | null };

const finite = (x: number | null): x is number => x != null && Number.isFinite(x);

export function normaliseFacility(raw: string | null): FacilityType | null {
  const v = raw?.toLowerCase() ?? null;
  return v === 'flaeche' || v === 'mulde' || v === 'rigole' || v === 'mre' || v === 'mrs' || v === 'schacht' || v === 'becken' ? v : null;
}
function normaliseMethod(raw: string | null): AsmMethod {
  return raw === 'geometry' || raw === 'soil_estimate' || raw === 'manual' ? raw : 'direct';
}
function bodenart(raw: string | null): Tab13Bodenart | null {
  return raw === 'mittel_feinsand' || raw === 'schluffig' ? raw : null;
}

/** The facility's rain column, resolved like the save path (table ref, then the facility's return period). */
export function facilityRainRows(
  sheetCode: string,
  acc: MirrorAccessor,
  forceT?: number,
): { rows: Array<{ D_min: number | null; r_D_n: number | null }>; T: number | null } | null {
  const table = resolveSelectedTable(normalizeRainfallCarrier(acc.json('r_D_n_table')), acc.str('rainfall_table_ref'));
  if (!table) return null;
  const T = forceT ?? facilityReturnPeriod(sheetCode, (s) => acc.num(s));
  const col = resolveColumn(table, T);
  if (col.status === 'missing' || col.rows.length === 0) return null;
  return { rows: col.rows, T };
}

export function mirrorA138(sheetCode: string, acc: MirrorAccessor): MirrorWrite[] {
  if (sheetCode === 'A138-12') {
    const method = normaliseMethod(acc.str('a_s_m_determination_method'));
    if (method === 'direct' || method === 'manual') return [];
    const facility = normaliseFacility(acc.str('facility_type_selected'));
    let geometryValue: number | null = null;
    if (method === 'geometry') {
      if (facility !== 'mulde' && facility !== 'mre' && facility !== 'mrs') return []; // Rigole one-shot etc.: A2
      const rain = facilityRainRows('A138-17', acc);
      const A_C = acc.num('A_C'); const h_M = acc.num('h_M'); const f_Z = acc.num('f_Z');
      const k_i = acc.num('k_i_Mulde') ?? acc.num('k_i');
      if (rain && finite(A_C) && finite(h_M) && finite(f_Z) && finite(k_i)) {
        geometryValue = computeMuldeGeometrySweep(rain.rows, { A_C, h_M, f_Z, k_i }).A_S_m;
      }
    }
    const r = materializeAsm({
      method, A_S_min: acc.num('A_S_min'), A_S_max: acc.num('A_S_max'), A_C: acc.num('A_C'),
      bodenart: bodenart(acc.str('soil_bodenart_tab13')), geometryValue, manualValue: null, manualProvenance: null,
      facilityType: facility, sourceWorksheet: null,
    });
    return [{ worksheetCode: 'A138-12', symbol: 'A_S_m', value: r.A_S_m }];
  }

  if (sheetCode === 'A138-17') {
    if (normaliseFacility(acc.str('facility_type_selected')) !== 'mulde') return []; // composites (mre/mrs): A2
    const out: MirrorWrite[] = [];
    const k_i_M = swaleDesignInfiltrationRate(null, acc.num('k_i'), null);
    out.push({ worksheetCode: 'A138-17', symbol: 'k_i_Mulde', value: k_i_M });
    const A_C = acc.num('A_C'); const A_S_m = acc.num('A_S_m'); const f_Z = acc.num('f_Z'); const h_M = acc.num('h_M');
    const A_VA = acc.num('A_VA_Mulde') ?? acc.num('A_VA') ?? A_S_m;
    const rain = facilityRainRows('A138-17', acc);
    if (rain && finite(A_C) && finite(A_S_m) && finite(f_Z) && finite(A_VA) && finite(k_i_M)) {
      const req = computeMuldeRequiredVolumeSweep(rain.rows, { A_C, A_VA, A_S_m, k_i: k_i_M, f_Z });
      out.push({ worksheetCode: 'A138-17', symbol: 'V_M_erf', value: req.V_M_erf });
      out.push({ worksheetCode: 'A138-17', symbol: 'D_used_M', value: req.governingD });
      out.push({ worksheetCode: 'A138-17', symbol: 'r_D_n_used_M', value: req.r_D_at_governing });
    } else {
      for (const s of ['V_M_erf', 'D_used_M', 'r_D_n_used_M']) out.push({ worksheetCode: 'A138-17', symbol: s, value: null });
    }
    out.push({ worksheetCode: 'A138-17', symbol: 'V_M', value: facilityGoverningVolume('mulde', { A_S_m, h_M }) });
    return out;
  }
  return [];
}
```

```ts
// src/lib/scenarios/sheet-series.ts
/** Which iteration series a sheet carries in one run, read from the run's visible values (hidden ⇒ null). */
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';
import { ASM_GL16_EQUATION_ID } from '@/lib/eval/asm-source';
import { A138_GL10_EQUATION_ID, facilityRainRows, normaliseFacility, type MirrorAccessor } from './a138-mirror';
import { gl8Series, gl10Series, gl16Series } from './iteration-series';
import type { IterationSeries } from './types';

const finite = (x: number | null): x is number => x != null && Number.isFinite(x);

export function seriesForSheet(sheetCode: string, equationIds: readonly string[], acc: MirrorAccessor): IterationSeries[] {
  const out: IterationSeries[] = [];
  if (equationIds.includes(BASIN_GL8_EQUATION_ID)) {
    const rain = facilityRainRows(sheetCode, acc);
    const A_C = acc.num('A_C'); const A_VA = acc.num('A_VA'); const Q_S = acc.num('Q_S');
    const f_Z = acc.num('f_Z'); const f_A = acc.num('f_A'); const Q_Dr = acc.num('Q_Dr') ?? 0;
    if (rain && finite(A_C) && finite(A_VA) && finite(Q_S) && finite(f_Z) && finite(f_A)) {
      out.push(gl8Series(rain.rows, { A_C, A_VA, Q_S, Q_Dr, f_Z, f_A }, rain.T));
    }
  }
  if (equationIds.includes(A138_GL10_EQUATION_ID)) {
    let AcS = acc.num('A_C_s_flood');
    if (!finite(AcS)) {
      const sub = acc.json('sub_areas_A138_26') as { rows?: Array<{ area_m2?: unknown; c_S?: unknown }> } | undefined;
      if (sub && Array.isArray(sub.rows) && sub.rows.length > 0 && sub.rows.every((r) => typeof r.area_m2 === 'number' && typeof r.c_S === 'number')) {
        AcS = sub.rows.reduce((t, r) => t + (r.area_m2 as number) * (r.c_S as number), 0);
      }
    }
    const A_VA = acc.num('A_VA'); const Q_S = acc.num('Q_S'); const V_VA = acc.num('V_VA'); const Q_Dr = acc.num('Q_Dr') ?? 0;
    if (finite(AcS) && finite(A_VA) && finite(Q_S) && finite(V_VA)) {
      for (const T of [30, 100] as const) {
        const rain = facilityRainRows(sheetCode, acc, T);
        if (rain) out.push(gl10Series(rain.rows, { AcS_paved: AcS, A_VA, Q_S, Q_Dr, V_VA }, T));
      }
    }
  }
  if (equationIds.includes(ASM_GL16_EQUATION_ID)) {
    const f = normaliseFacility(acc.str('facility_type_selected'));
    if (f === 'mulde' || f === 'mre' || f === 'mrs') {
      const rain = facilityRainRows(sheetCode, acc);
      const A_C = acc.num('A_C'); const h_M = acc.num('h_M'); const f_Z = acc.num('f_Z');
      const k_i = acc.num('k_i_Mulde') ?? acc.num('k_i');
      if (rain && finite(A_C) && finite(h_M) && finite(f_Z) && finite(k_i)) out.push(gl16Series(rain.rows, { A_C, h_M, f_Z, k_i }, rain.T));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/a138-mirror.test.ts` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scenarios/a138-mirror.ts src/lib/scenarios/sheet-series.ts src/lib/scenarios/__tests__/a138-mirror.test.ts
git commit -m "feat(scenarios): A 138 Mulde mirror of the save-path materialisations + per-sheet series

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Baseline types + C4-shaped fixture chain

**Files:**
- Create: `src/lib/scenarios/baseline.ts`
- Modify: `src/lib/scenarios/__fixtures__/c4-a138-chain.ts` (add imports at the top, append the chain)
- Test: `src/lib/scenarios/__tests__/fixture.test.ts`

**Interfaces:**
- Consumes: `ReportEquation`, `ReportComplianceRow`, `ReportParameter` (types); `ScenarioValue`; `fieldValueToParameter` (Task 2).
- Produces (`baseline.ts`):
  - `type BaselineField = { id; templateId; templateCode; symbol; labelDe; labelEn: string | null; unit: string | null; dataType; isRequired: boolean; sectionId: string | null; visibleWhen: string | null; widget: string | null; uiConfig: unknown; consumerWorksheets: string[] | null; enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null; validationRules: { min?; max?; maxLength?; extensible? } | null }` (all ids/strings `string`)
  - `type BaselineSection = { id; templateId; parentSectionId: string | null; visibleWhen: string | null }`
  - `type BaselineSheet = { instanceId; templateId; code; titleDe; titleEn: string | null; phase: number | null; orderIndex: number; equations: ReportEquation[]; compliance: ReportComplianceRow[] }`
  - `type StoredParameter = ReportParameter & { sourceType: string }`
  - `type ScenarioBaseline = { projectId; standardId; standardCode; sheets: BaselineSheet[]; fields: BaselineField[]; sections: BaselineSection[]; stored: Record<string, StoredParameter> }`
  - `type ScenarioOverrideInput = { fieldId: string; value: ScenarioValue }`
  - `sortSheets(sheets: BaselineSheet[]): BaselineSheet[]`
- Produces (fixture): `EQ`, `FIXTURE_SHEETS: FixtureSheet[]`, `ENTERED`, `K5`, `K6`, `K6_GL9` (`Record<"<code>:<symbol>", ScenarioValue>`), `fid(code, symbol)`, `overridesFor(entries)`, `buildFixtureBaseline(opts?: { entered?; storedDerived? })`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scenarios/__tests__/fixture.test.ts
import { describe, it, expect } from 'vitest';
import { buildFixtureBaseline, FIXTURE_SHEETS, fid, EQ } from '../__fixtures__/c4-a138-chain';
import { sortSheets } from '../baseline';

describe('C4-shaped fixture', () => {
  it('builds a baseline with the A 138 chain in phase order and entered values only', () => {
    const b = buildFixtureBaseline();
    expect(b.standardCode).toBe('DWA-A-138-1');
    expect(sortSheets(b.sheets).map((s) => s.code)).toEqual(
      ['A138-03', 'A138-04', 'A138-05', 'A138-07', 'A138-08', 'A138-10', 'A138-11', 'A138-12', 'A138-13', 'A138-15', 'A138-17', 'A138-26'],
    );
    expect(b.stored[fid('A138-05', 'k_f')]).toMatchObject({ valueNumber: 1e-6, sourceType: 'entered' });
    expect(b.stored[fid('A138-11', 'k_i')]).toBeUndefined();
    expect(FIXTURE_SHEETS.find((s) => s.code === 'A138-13')?.equations.map((e) => e.id)).toContain(EQ.GL8);
  });
  it('stores derived seeds with sourceType derived', () => {
    const b = buildFixtureBaseline({ storedDerived: { 'A138-11:k_i': { type: 'number', value: 4e-8 } } });
    expect(b.stored[fid('A138-11', 'k_i')]).toMatchObject({ valueNumber: 4e-8, sourceType: 'derived' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/fixture.test.ts`
Expected: FAIL — cannot resolve `../baseline`.

- [ ] **Step 3: Implement `baseline.ts`**

```ts
// src/lib/scenarios/baseline.ts
/** What the chain runner reads — the report path's inputs for ONE standard of ONE project (spec §3). */
import type { ReportComplianceRow, ReportEquation, ReportParameter } from '@/lib/eval/evaluate-for-report';
import type { ScenarioValue } from './types';

export type BaselineField = {
  id: string; templateId: string; templateCode: string; symbol: string; labelDe: string; labelEn: string | null;
  unit: string | null; dataType: string; isRequired: boolean; sectionId: string | null; visibleWhen: string | null;
  widget: string | null; uiConfig: unknown; consumerWorksheets: string[] | null;
  enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null;
  validationRules: { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null;
};
export type BaselineSection = { id: string; templateId: string; parentSectionId: string | null; visibleWhen: string | null };
export type BaselineSheet = {
  instanceId: string; templateId: string; code: string; titleDe: string; titleEn: string | null;
  phase: number | null; orderIndex: number; equations: ReportEquation[]; compliance: ReportComplianceRow[];
};
export type StoredParameter = ReportParameter & { sourceType: string };
export type ScenarioBaseline = {
  projectId: string; standardId: string; standardCode: string;
  sheets: BaselineSheet[]; fields: BaselineField[]; sections: BaselineSection[];
  /** Every saved project_parameters row of the standard's fields, keyed by field id. */
  stored: Record<string, StoredParameter>;
};
export type ScenarioOverrideInput = { fieldId: string; value: ScenarioValue };

/** Phase order (spec §3 step 2): phase ASC (nulls last), order_index ASC, code ASC. */
export function sortSheets(sheets: BaselineSheet[]): BaselineSheet[] {
  return [...sheets].sort((a, b) =>
    (a.phase ?? Number.MAX_SAFE_INTEGER) - (b.phase ?? Number.MAX_SAFE_INTEGER)
    || a.orderIndex - b.orderIndex
    || a.code.localeCompare(b.code));
}
```

- [ ] **Step 4: Extend the fixture**

At the top of `src/lib/scenarios/__fixtures__/c4-a138-chain.ts` add:

```ts
import type { ScenarioBaseline, BaselineField, BaselineSheet, BaselineSection, StoredParameter, ScenarioOverrideInput } from '../baseline';
import type { ScenarioValue } from '../types';
import { fieldValueToParameter } from '../values';
```

Append at the end:

```ts
/** Equation ids: the prod UUIDs where an aggregator / profile / suppression is keyed by id, synthetic otherwise. */
export const EQ = {
  GL6: 'a1380000-0000-4000-8000-000000001106',
  GL5: 'a1380000-0000-4000-8000-000000001105',
  GL7: '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac',
  GL4: 'a1380000-0000-4000-8000-000000001204',
  GL8: '69f31e6e-a755-4246-af10-ae46668b5c86',
  GL9: 'a1380000-0000-4000-8000-000000001309',
  GL16: '14999c2a-cdeb-42c1-98fd-fcdec65123da',
  GL15: '44fd56a8-b473-441a-be21-297d9f501226',
  GL10: '8e3c7e22-e3c7-449a-b267-928332c89306',
} as const;

export type FixtureField = {
  symbol: string; dataType: 'number' | 'enum' | 'json' | 'text' | 'boolean'; unit?: string;
  consumers?: string[]; visibleWhen?: string; enumValues?: string[];
};
export type FixtureSheet = {
  code: string; phase: number; order: number; fields: FixtureField[];
  equations: Array<{ id: string; number: string; formula: string; inputs: string[]; output: string }>;
  compliance: Array<{ code: string; condition: string; severity: 'block' | 'warn' }>;
};

export const FIXTURE_SHEETS: FixtureSheet[] = [
  { code: 'A138-03', phase: 2, order: 3, fields: [{ symbol: 'f_methode', dataType: 'number', consumers: ['A138-11'] }], equations: [], compliance: [] },
  { code: 'A138-04', phase: 2, order: 4, fields: [{ symbol: 'r_D_n_table', dataType: 'json', consumers: ['A138-12', 'A138-13', 'A138-17', 'A138-26'] }], equations: [], compliance: [] },
  { code: 'A138-05', phase: 2, order: 5, fields: [{ symbol: 'k_f', dataType: 'number', unit: 'm/s', consumers: ['A138-11'] }], equations: [], compliance: [] },
  { code: 'A138-07', phase: 2, order: 7, fields: [{ symbol: 'A_C', dataType: 'number', unit: 'm²', consumers: ['A138-12', 'A138-13', 'A138-17'] }], equations: [], compliance: [] },
  {
    code: 'A138-08', phase: 2, order: 8, equations: [], compliance: [],
    fields: [
      { symbol: 'n', dataType: 'number', consumers: ['A138-12', 'A138-13', 'A138-17'] },
      { symbol: 'f_Z', dataType: 'number', consumers: ['A138-10', 'A138-13', 'A138-17'] },
      { symbol: 'f_A', dataType: 'number', consumers: ['A138-13'] },
      { symbol: 'f_ort', dataType: 'number', consumers: ['A138-11'] },
    ],
  },
  {
    code: 'A138-10', phase: 3, order: 10, equations: [],
    fields: [{ symbol: 'A_VA', dataType: 'number', unit: 'm²', consumers: ['A138-13', 'A138-17', 'A138-26'], visibleWhen: "facility_type_selected != 'flaeche'" }],
    // REQ-15 sits on A138-10 in prod and reads q_S_AC (A138-13) + f_Z (A138-08) cross-sheet (spec gap G-5).
    compliance: [{ code: 'A138-REQ-15', condition: 'q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)', severity: 'block' }],
  },
  {
    code: 'A138-11', phase: 3, order: 11, compliance: [],
    fields: [{ symbol: 'f_K', dataType: 'number' }, { symbol: 'k_i', dataType: 'number', unit: 'm/s', consumers: ['A138-12', 'A138-13', 'A138-17'] }],
    equations: [
      { id: EQ.GL6, number: '6', formula: 'f_K = min(f_ort * f_methode, 1)', inputs: ['f_ort', 'f_methode'], output: 'f_K' },
      { id: EQ.GL5, number: '5', formula: 'k_i = k_f * f_K', inputs: ['k_f', 'f_K'], output: 'k_i' },
    ],
  },
  {
    code: 'A138-12', phase: 3, order: 12, compliance: [],
    fields: [
      { symbol: 'a_s_m_determination_method', dataType: 'enum', enumValues: ['direct', 'geometry', 'soil_estimate', 'manual'] },
      { symbol: 'A_S_min', dataType: 'number', unit: 'm²', visibleWhen: "a_s_m_determination_method == 'direct'" },
      { symbol: 'A_S_max', dataType: 'number', unit: 'm²', visibleWhen: "a_s_m_determination_method == 'direct'" },
      { symbol: 'A_S_m', dataType: 'number', unit: 'm²', consumers: ['A138-13', 'A138-17'] },
      { symbol: 'A_S', dataType: 'number', unit: 'm²' },
      { symbol: 'Q_S', dataType: 'number', unit: 'l/s', consumers: ['A138-13'] },
    ],
    equations: [
      { id: EQ.GL7, number: '7', formula: 'A_S_m = (A_S_min + A_S_max) / 2', inputs: ['A_S_min', 'A_S_max'], output: 'A_S_m' },
      { id: EQ.GL4, number: '4', formula: 'Q_S = k_i * A_S * 10^3', inputs: ['k_i', 'A_S'], output: 'Q_S' },
    ],
  },
  {
    code: 'A138-13', phase: 3, order: 13, compliance: [],
    fields: [
      { symbol: 'V_VA', dataType: 'number', unit: 'm³', consumers: ['A138-26'] },
      { symbol: 'r_D_n', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'D_min', dataType: 'number', unit: 'min' },
      { symbol: 'q_S_AC', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 't_E', dataType: 'number', unit: 'h' },
    ],
    equations: [
      { id: EQ.GL8, number: '8', formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3', inputs: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'], output: 'V_VA' },
      { id: EQ.GL9, number: '9', formula: 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4', inputs: ['k_i', 'A_S_m', 'Q_Dr', 'A_C'], output: 'q_S_AC' },
    ],
  },
  {
    code: 'A138-15', phase: 4, order: 15, equations: [], compliance: [],
    fields: [{ symbol: 'facility_type_selected', dataType: 'enum', consumers: ['A138-10', 'A138-12', 'A138-17'], enumValues: ['flaeche', 'mulde', 'rigole', 'MRE', 'MRS', 'schacht', 'becken'] }],
  },
  {
    code: 'A138-17', phase: 4, order: 17, compliance: [],
    fields: [
      { symbol: 'h_M', dataType: 'number', unit: 'm' },
      { symbol: 'k_i_Mulde', dataType: 'number', unit: 'm/s' },
      { symbol: 'V_M_erf', dataType: 'number', unit: 'm³' },
      { symbol: 'D_used_M', dataType: 'number', unit: 'min' },
      { symbol: 'r_D_n_used_M', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'V_M', dataType: 'number', unit: 'm³' },
    ],
    equations: [
      { id: EQ.GL16, number: '16', formula: 'A_S_m = (A_C * 10^-7 * r_D(n)) / (h_M / (D * 60 * f_Z) + k_i)', inputs: ['A_C', 'r_D_n', 'h_M', 'D', 'f_Z', 'k_i'], output: 'A_S_m' },
      { id: EQ.GL15, number: '15', formula: 'V_M = A_S_m * h_M', inputs: ['A_S_m', 'h_M'], output: 'V_M' },
    ],
  },
  {
    code: 'A138-26', phase: 5, order: 26, compliance: [],
    fields: [
      { symbol: 'A_C_s_flood', dataType: 'number', unit: 'm²' },
      { symbol: 'Q_S', dataType: 'number', unit: 'l/s' },
      { symbol: 'T_n_Ue', dataType: 'number', unit: 'a' },
      { symbol: 'r_D_30', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'V_Rueck', dataType: 'number', unit: 'm³' },
    ],
    equations: [{
      id: EQ.GL10, number: '10',
      formula: 'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA >= 0',
      inputs: ['r_D_T_n_Ue', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'], output: 'V_Rueck',
    }],
  },
];

/** Record state of C4 on 2026-10-14 (entered values only; ledger steps 1–6 + A138-26). */
export const ENTERED: Record<string, ScenarioValue> = {
  'A138-03:f_methode': { type: 'number', value: 0.1 },
  'A138-04:r_D_n_table': { type: 'json', value: rainfallCarrier() },
  'A138-05:k_f': { type: 'number', value: 1e-6 },
  'A138-07:A_C': { type: 'number', value: 526.2105 },
  'A138-08:n': { type: 'number', value: 0.2 },
  'A138-08:f_Z': { type: 'number', value: 1.2 },
  'A138-08:f_A': { type: 'number', value: 1.0 },
  'A138-08:f_ort': { type: 'number', value: 0.3 },
  'A138-10:A_VA': { type: 'number', value: 50 },
  'A138-12:a_s_m_determination_method': { type: 'enum', value: 'direct' },
  'A138-12:A_S_min': { type: 'number', value: 40 },
  'A138-12:A_S_max': { type: 'number', value: 50 },
  'A138-12:A_S': { type: 'number', value: 50 },
  'A138-15:facility_type_selected': { type: 'enum', value: 'mulde' },
  'A138-17:h_M': { type: 'number', value: 0.3 },
  'A138-26:A_C_s_flood': { type: 'number', value: 602.161 },
  'A138-26:Q_S': { type: 'number', value: 0.0015 },
  'A138-26:T_n_Ue': { type: 'number', value: 100 },
};

/** Field-test cases expressed as INPUT overrides (spec gap G-3): k_i = k_f · min(f_Ort · f_Methode, 1). */
export const K5: Record<string, ScenarioValue> = {
  'A138-05:k_f': { type: 'number', value: 1e-5 },
  'A138-03:f_methode': { type: 'number', value: 1 },
  'A138-08:f_ort': { type: 'number', value: 1 },
  'A138-12:a_s_m_determination_method': { type: 'enum', value: 'geometry' },
};
export const K6: Record<string, ScenarioValue> = { ...K5, 'A138-05:k_f': { type: 'number', value: 1e-6 } };
/** K6 sized by Gl. 9 instead of Gl. 16: A_S,m = 2·A_C/(k_i·10⁷) = 105.2421 m² via the direct method. */
export const K6_GL9: Record<string, ScenarioValue> = {
  'A138-05:k_f': { type: 'number', value: 1e-6 },
  'A138-03:f_methode': { type: 'number', value: 1 },
  'A138-08:f_ort': { type: 'number', value: 1 },
  'A138-12:A_S_min': { type: 'number', value: 105.2421 },
  'A138-12:A_S_max': { type: 'number', value: 105.2421 },
};

export const fid = (code: string, symbol: string) => `f:${code}:${symbol}`;

export function overridesFor(entries: Record<string, ScenarioValue>): ScenarioOverrideInput[] {
  return Object.entries(entries).map(([k, value]) => {
    const [code, symbol] = k.split(':');
    return { fieldId: fid(code, symbol), value };
  });
}

export function buildFixtureBaseline(opts?: {
  entered?: Record<string, ScenarioValue>;
  storedDerived?: Record<string, ScenarioValue>;
}): ScenarioBaseline {
  const sheets: BaselineSheet[] = [];
  const fields: BaselineField[] = [];
  const sections: BaselineSection[] = [];
  for (const s of FIXTURE_SHEETS) {
    const templateId = `t:${s.code}`;
    sections.push({ id: `s:${s.code}`, templateId, parentSectionId: null, visibleWhen: null });
    for (const f of s.fields) {
      fields.push({
        id: fid(s.code, f.symbol), templateId, templateCode: s.code, symbol: f.symbol, labelDe: f.symbol, labelEn: null,
        unit: f.unit ?? null, dataType: f.dataType, isRequired: false, sectionId: `s:${s.code}`, visibleWhen: f.visibleWhen ?? null,
        widget: null, uiConfig: null, consumerWorksheets: f.consumers ?? null,
        enumValues: f.enumValues ? f.enumValues.map((v) => ({ value: v, label_de: v, label_en: v })) : null,
        validationRules: null,
      });
    }
    sheets.push({
      instanceId: `i:${s.code}`, templateId, code: s.code, titleDe: s.code, titleEn: null, phase: s.phase, orderIndex: s.order,
      equations: s.equations.map((e) => ({ id: e.id, equationNumber: e.number, formula: e.formula, inputSymbols: e.inputs, outputSymbol: e.output, outputUnit: null })),
      compliance: s.compliance.map((c) => ({ id: `c:${c.code}`, code: c.code, titleDe: c.code, condition: c.condition, severity: c.severity, description: null, requiresAttestation: false })),
    });
  }
  const stored: Record<string, StoredParameter> = {};
  const put = (entries: Record<string, ScenarioValue>, sourceType: string) => {
    for (const [k, v] of Object.entries(entries)) {
      const [code, symbol] = k.split(':');
      const id = fid(code, symbol);
      stored[id] = { ...fieldValueToParameter(id, v), sourceType };
    }
  };
  put(opts?.entered ?? ENTERED, 'entered');
  put(opts?.storedDerived ?? {}, 'derived');
  return { projectId: 'p:c4', standardId: 'std:a138', standardCode: 'DWA-A-138-1', sheets, fields, sections, stored };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/fixture.test.ts src/lib/scenarios/__tests__/iteration-series.test.ts src/lib/scenarios/__tests__/a138-mirror.test.ts` → Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scenarios/baseline.ts src/lib/scenarios/__fixtures__/c4-a138-chain.ts src/lib/scenarios/__tests__/fixture.test.ts
git commit -m "test(scenarios): baseline types + anonymised C4-shaped A 138 fixture chain

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The chain runner `runScenarioChain`

**Files:**
- Create: `src/lib/eval/scenario-chain.ts`
- Test: `src/lib/eval/__tests__/scenario-chain.test.ts`

**Interfaces:**
- Consumes: `evaluateWorksheetEquations`, `evaluateWorksheetCompliance`, `reportVisibility`, `ReportField`, `ReportParameter` (`./evaluate-for-report`); `inheritedFieldsFor` (`@/lib/compliance/visibility`); `buildVisibilityArgs`, `buildStandardScopedFallback`, `StandardVisibilityMeta`, `ProjectFieldRow` (`@/lib/actions/approval-gate`, server-only module, pure functions); `hiddenAtSourceFieldIds`, `sourceHiddenSymbolsByTemplate`, `gateHiddenSymbols`, `dropHiddenAtSource`, `GateValue` (`@/lib/projects/required-field-counts`); `equationProfiles`; `asmEngineSuppressedSymbols`; `BASIN_GL8_EQUATION_ID`; `mirrorA138`, `A138_STANDARD_CODE`, `MirrorAccessor` (Task 5); `seriesForSheet` (Task 5); `sortSheets`, `ScenarioBaseline`, `ScenarioOverrideInput` (Task 6); `fieldValueToParameter`, `scalarOfParameter`, `numbersEqual` (Task 2).
- Produces:
  - `MAX_PASSES = 6`
  - `type RunOptions = { caseId: string; approvalWithholding: 'bypass'; maxPasses?: number }`
  - `runScenarioChain(baseline: ScenarioBaseline, overrides: readonly ScenarioOverrideInput[], opts: RunOptions): ScenarioRun` — pure, deterministic, never mutates `baseline`.

**Algorithm (spec §3):**
1. Start values = every stored row (entered ⇒ origin `entered`; derived/computed ⇒ origin `carried`), then overrides (origin `override`; unknown field or type mismatch ⇒ `skippedOverrides`).
2. Per pass: visibility args from the CURRENT values (`buildVisibilityArgs` over the standard's fields) ⇒ hidden-at-source field ids, source-hidden symbols per template, standard-scoped conflict-free fallback.
3. Walk sheets in phase order. Per sheet: own + inherited (minus hidden-at-source) ⇒ `reportVisibility` ⇒ `hiddenSymbols = gateHiddenSymbols(own, source, local)`; `evaluateWorksheetEquations`; write outputs to the sheet's own numeric fields (displayOnly skipped, A_S,m suppressed unless method direct, computed ⇒ value, otherwise null); Gl. 8 extras ⇒ `r_D_n`, `D_min`; A 138 mirror writes; `evaluateWorksheetCompliance` over own + inherited + fallback (spec gap G-5).
4. Repeat until a pass changes nothing (converged) or `maxPasses` (⇒ `converged: false`).
5. Series from the final values (`seriesForSheet`). Real run (no overrides) ⇒ `mismatches` (stored derived ≠ recomputed); every run ⇒ `notRecomputed` (stored derived the run never targeted — carried).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/scenario-chain.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runScenarioChain, MAX_PASSES } from '../scenario-chain';
import {
  buildFixtureBaseline, overridesFor, fid, ENTERED, K5, K6, K6_GL9,
} from '@/lib/scenarios/__fixtures__/c4-a138-chain';
import type { ScenarioBaseline } from '@/lib/scenarios/baseline';
import type { ScenarioRun } from '@/lib/scenarios/types';

const OPTS = { approvalWithholding: 'bypass' as const };
const run = (b: ScenarioBaseline, o: ReturnType<typeof overridesFor> = [], caseId = 'real') => runScenarioChain(b, o, { caseId, ...OPTS });
const v = (r: ScenarioRun, code: string, sym: string) => r.values[fid(code, sym)]?.value ?? null;
const close = (a: unknown, b: number, rel = 1e-9) => {
  expect(typeof a).toBe('number');
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
};
const verdict = (r: ScenarioRun, code: string, req: string) => r.sheets[code].compliance.find((c) => c.code === req)?.result.kind;
const eqState = (r: ScenarioRun, code: string, number: string) => r.sheets[code].equations.find((e) => e.equationNumber === number)?.state;

describe('Real run (zero overrides) — C4 hand values, spec §6 / ledger 2026-10-14', () => {
  const r = run(buildFixtureBaseline());
  it('converges', () => {
    expect(r.converged).toBe(true);
    expect(r.passes).toBeLessThan(MAX_PASSES);
  });
  it('k_i = 3·10⁻⁸ (Gl. 5/6), Q_S = 0.0015 l/s, A_S,m = 45 m² (Gl. 7)', () => {
    close(v(r, 'A138-11', 'f_K'), 0.03);
    close(v(r, 'A138-11', 'k_i'), 3e-8);
    close(v(r, 'A138-12', 'Q_S'), 0.0015);
    close(v(r, 'A138-12', 'A_S_m'), 45);
  });
  it('V_VA = 70.0038 m³ at D 10080 min, boundary-limited (Gl. 8)', () => {
    close(v(r, 'A138-13', 'V_VA'), 70.0037505216);
    expect(v(r, 'A138-13', 'D_min')).toBe(10080);
    expect(v(r, 'A138-13', 'r_D_n')).toBe(1.7);
    const s = r.iterations.find((x) => x.key === 'A138-13:Gl8');
    expect(s?.boundaryLimited).toBe(true);
  });
  it('q_S,AC = 0.02566 l/(s·ha) ⇒ REQ-15 fails (cross-sheet, via the gate fallback)', () => {
    close(v(r, 'A138-13', 'q_S_AC'), 0.025655132309218457);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('fail');
  });
  it('Mulde mirror: k_i_Mulde, V_M = 13.5 m³, V_M,erf = 70.1126 m³', () => {
    close(v(r, 'A138-17', 'k_i_Mulde'), 3e-8);
    close(v(r, 'A138-17', 'V_M'), 13.5);
    close(v(r, 'A138-17', 'V_M_erf'), 70.1126145216);
    expect(v(r, 'A138-17', 'D_used_M')).toBe(10080);
  });
  it('Gl. 10 record state (T 30 a column per F-A7) and both flood series', () => {
    close(v(r, 'A138-26', 'V_Rueck'), 31.640062406400006);
    close(r.iterations.find((x) => x.key === 'A138-26:Gl10:T30')?.governingValue, 31.640062406400006);
    close(r.iterations.find((x) => x.key === 'A138-26:Gl10:T100')?.governingValue, 55.30568077439999);
  });
  it('has nothing to compare when the record carries no derived rows', () => {
    expect(r.mismatches).toEqual([]);
    expect(r.notRecomputed).toEqual([]);
  });
});

describe('cases — overrides propagate through the whole chain (spec §1, §3)', () => {
  it('K5 (k_f 1·10⁻⁵, f_Methode 1, f_Ort 1, geometry): A_S,m 48.58 m² @ D 180, V_M 14.57 m³, q_S,AC 9.23 ⇒ REQ-15 passes', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K5), 'k5');
    close(v(r, 'A138-11', 'k_i'), 1e-5);
    close(v(r, 'A138-12', 'A_S_m'), 48.57599051396648);
    close(v(r, 'A138-17', 'V_M'), 14.572797154189944);
    close(v(r, 'A138-17', 'V_M_erf'), 16.555677154189944);
    close(v(r, 'A138-13', 'q_S_AC'), 9.231284916201119);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('pass');
    const s = r.iterations.find((x) => x.key === 'A138-17:Gl16');
    expect(s?.governingD).toBe(180);
    expect(v(r, 'A138-12', 'a_s_m_determination_method')).toBe('geometry');
    expect(r.values[fid('A138-05', 'k_f')].origin).toBe('override');
  });
  it('K5: the direct inputs are hidden under geometry and Gl. 7 does not write A_S,m', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K5), 'k5');
    expect(r.sheets['A138-12'].hiddenSymbols).toEqual(expect.arrayContaining(['A_S_min', 'A_S_max']));
    expect(eqState(r, 'A138-12', '7')?.kind).not.toBe('computed');
  });
  it('K6 (k_f 1·10⁻⁶): A_S,m 93.25 m² @ D 1440 by Gl. 16, q_S,AC 1.77 ⇒ REQ-15 fails', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K6), 'k6');
    close(v(r, 'A138-12', 'A_S_m'), 93.2537609036861);
    expect(r.iterations.find((x) => x.key === 'A138-17:Gl16')?.governingD).toBe(1440);
    close(v(r, 'A138-13', 'q_S_AC'), 1.77217598097503);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('fail');
  });
  it('K6 sized by Gl. 9 (A_S,m 105.2 m², direct): q_S,AC = 2 ⇒ REQ-15 passes', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K6_GL9), 'k6gl9');
    close(v(r, 'A138-12', 'A_S_m'), 105.2421);
    close(v(r, 'A138-13', 'q_S_AC'), 2, 1e-9);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('pass');
  });
  it('a case never changes the Real run or the baseline (no shared mutable state)', () => {
    const b = buildFixtureBaseline();
    const before = JSON.stringify(b);
    const real1 = run(b);
    run(b, overridesFor(K5), 'k5');
    expect(JSON.stringify(b)).toBe(before);
    expect(run(b)).toEqual(real1);
  });
});

describe('stored-value consistency (spec §3 step 6) and carried values (spec gap G-2)', () => {
  it('flags a stored derived value that differs from the Real run', () => {
    const r = run(buildFixtureBaseline({ storedDerived: { 'A138-11:k_i': { type: 'number', value: 4e-8 } } }));
    expect(r.mismatches).toEqual([{ fieldId: fid('A138-11', 'k_i'), worksheetCode: 'A138-11', symbol: 'k_i', stored: 4e-8, computed: expect.closeTo(3e-8, 20) }]);
  });
  it('carries a stored derived value nothing recomputes and lists it', () => {
    const r = run(buildFixtureBaseline({ storedDerived: { 'A138-13:t_E': { type: 'number', value: 5 } } }), overridesFor(K5), 'k5');
    expect(r.notRecomputed).toEqual([{ worksheetCode: 'A138-13', symbol: 't_E' }]);
    expect(r.values[fid('A138-13', 't_E')]).toMatchObject({ value: 5, origin: 'carried' });
  });
});

describe('visibility — same rules as the record (spec §3 step 3, R-14…R-16)', () => {
  const FLAECHE = { 'A138-15:facility_type_selected': { type: 'enum' as const, value: 'flaeche' } };
  it('visibility: case hides A_VA at source — own on A138-10, at source on A138-13/-26, Gl. 8 and Gl. 10 not computed', () => {
    const r = run(buildFixtureBaseline(), overridesFor(FLAECHE), 'fl');
    expect(r.sheets['A138-10'].hiddenSymbols).toContain('A_VA');
    expect(r.sheets['A138-13'].hiddenSymbols).toContain('A_VA');
    expect(r.sheets['A138-26'].hiddenSymbols).toContain('A_VA');
    expect(eqState(r, 'A138-13', '8')?.kind).toBe('manual_required');
    expect(v(r, 'A138-13', 'V_VA')).toBeNull();
    expect(eqState(r, 'A138-26', '10')?.kind).toBe('manual_required');
    expect(r.iterations.some((x) => x.key.startsWith('A138-26'))).toBe(false);
  });
  it('a case hides exactly what the record hides with the same driver', () => {
    const asCase = run(buildFixtureBaseline(), overridesFor(FLAECHE), 'fl');
    const asRecord = run(buildFixtureBaseline({ entered: { ...ENTERED, ...FLAECHE } }));
    for (const code of Object.keys(asRecord.sheets)) {
      expect(asCase.sheets[code].hiddenSymbols).toEqual(asRecord.sheets[code].hiddenSymbols);
    }
  });
  it('an override on a field the case hides is not silently used', () => {
    const r = run(buildFixtureBaseline(), overridesFor({ ...FLAECHE, 'A138-10:A_VA': { type: 'number', value: 0 } }), 'fl0');
    expect(eqState(r, 'A138-13', '8')?.kind).toBe('manual_required');
  });
});

describe('robustness', () => {
  it('skips overrides on unknown fields and keeps the others', () => {
    const r = run(buildFixtureBaseline(), [
      { fieldId: 'f:OTHER:x', value: { type: 'number', value: 1 } },
      ...overridesFor({ 'A138-05:k_f': { type: 'number', value: 1e-5 } }),
    ], 'mix');
    expect(r.skippedOverrides).toEqual([{ fieldId: 'f:OTHER:x', reason: expect.stringMatching(/gehört nicht/) }]);
    close(v(r, 'A138-11', 'k_i'), 3e-7);
  });
  it('skips an override whose value type does not match the field', () => {
    const r = run(buildFixtureBaseline(), [{ fieldId: fid('A138-05', 'k_f'), value: { type: 'text', value: 'x' } }], 'bad');
    expect(r.skippedOverrides[0].reason).toMatch(/Datentyp/);
  });
  it('non-converging chain: stops after MAX_PASSES and says so', () => {
    const b: ScenarioBaseline = {
      projectId: 'p', standardId: 's', standardCode: 'TEST-CYCLE',
      sections: [{ id: 's1', templateId: 't1', parentSectionId: null, visibleWhen: null }, { id: 's2', templateId: 't2', parentSectionId: null, visibleWhen: null }],
      fields: [
        { id: 'a', templateId: 't1', templateCode: 'S1', symbol: 'a', labelDe: 'a', labelEn: null, unit: null, dataType: 'number', isRequired: false, sectionId: 's1', visibleWhen: null, widget: null, uiConfig: null, consumerWorksheets: ['S2'], enumValues: null, validationRules: null },
        { id: 'b', templateId: 't2', templateCode: 'S2', symbol: 'b', labelDe: 'b', labelEn: null, unit: null, dataType: 'number', isRequired: false, sectionId: 's2', visibleWhen: null, widget: null, uiConfig: null, consumerWorksheets: ['S1'], enumValues: null, validationRules: null },
      ],
      sheets: [
        { instanceId: 'i1', templateId: 't1', code: 'S1', titleDe: 'S1', titleEn: null, phase: 1, orderIndex: 1, compliance: [], equations: [{ id: 'e1', equationNumber: '1', formula: 'a = b + 1', inputSymbols: ['b'], outputSymbol: 'a', outputUnit: null }] },
        { instanceId: 'i2', templateId: 't2', code: 'S2', titleDe: 'S2', titleEn: null, phase: 2, orderIndex: 2, compliance: [], equations: [{ id: 'e2', equationNumber: '2', formula: 'b = a + 1', inputSymbols: ['a'], outputSymbol: 'b', outputUnit: null }] },
      ],
      stored: { b: { fieldId: 'b', valueNumber: 1, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null, sourceType: 'derived' } },
    };
    const r = run(b);
    expect(r.converged).toBe(false);
    expect(r.passes).toBe(MAX_PASSES);
  });
  it('refuses to run without the explicit approval-withholding bypass', () => {
    expect(() => runScenarioChain(buildFixtureBaseline(), [], { caseId: 'x', approvalWithholding: 'apply' as unknown as 'bypass' })).toThrow(/approvalWithholding/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/eval/__tests__/scenario-chain.test.ts`
Expected: FAIL — cannot resolve `../scenario-chain`.

- [ ] **Step 3: Implement**

```ts
// src/lib/eval/scenario-chain.ts
/**
 * What-if cases — the in-memory chain runner (spec docs/superpowers/specs/2026-10-14-what-if-cases-design.md §3).
 *
 * Pure: no DB, no React, never mutates its inputs, never persists. The SAME evaluator primitives as the report/PDF path
 * (`evaluateWorksheetEquations`, `evaluateWorksheetCompliance`, `reportVisibility`) and the SAME visibility rules as the
 * approval gate (hidden-at-source R-14…R-16). Inherited values come from THIS run's values; the approval-based
 * withholding of inherited produced values (worksheet page, `carrierWithholdFieldIds`) does not exist here — the caller
 * states that explicitly with `approvalWithholding: 'bypass'`, a literal the real save/approval path never passes.
 */
import {
  evaluateWorksheetEquations, evaluateWorksheetCompliance, reportVisibility,
  type ReportField, type ReportParameter,
} from './evaluate-for-report';
import { inheritedFieldsFor } from '@/lib/compliance/visibility';
import {
  buildVisibilityArgs, buildStandardScopedFallback, type StandardVisibilityMeta, type ProjectFieldRow,
} from '@/lib/actions/approval-gate';
import {
  dropHiddenAtSource, gateHiddenSymbols, hiddenAtSourceFieldIds, sourceHiddenSymbolsByTemplate, type GateValue,
} from '@/lib/projects/required-field-counts';
import { equationProfiles } from './equation-profiles';
import { asmEngineSuppressedSymbols } from './asm-source';
import { BASIN_GL8_EQUATION_ID } from './governing-duration';
import { mirrorA138, A138_STANDARD_CODE, type MirrorAccessor } from '@/lib/scenarios/a138-mirror';
import { seriesForSheet } from '@/lib/scenarios/sheet-series';
import { sortSheets, type BaselineField, type ScenarioBaseline, type ScenarioOverrideInput } from '@/lib/scenarios/baseline';
import { fieldValueToParameter, scalarOfParameter, numbersEqual } from '@/lib/scenarios/values';
import type { RunCell, ScenarioRun, SheetRun, StoredMismatch, ValueOrigin } from '@/lib/scenarios/types';

export const MAX_PASSES = 6;

export type RunOptions = {
  caseId: string;
  /** Spec §3 step 2: the runner never withholds inherited values for unapproved sources. Required literal. */
  approvalWithholding: 'bypass';
  maxPasses?: number;
};

const EMPTY = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };

function groupBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) { const k = key(x); const a = m.get(k); if (a) a.push(x); else m.set(k, [x]); }
  return m;
}
const toReportField = (f: BaselineField): ReportField => ({
  id: f.id, symbol: f.symbol, unit: f.unit, dataType: f.dataType, sectionId: f.sectionId, visibleWhen: f.visibleWhen,
  widget: f.widget, uiConfig: f.uiConfig,
});

export function runScenarioChain(
  baseline: ScenarioBaseline,
  overrides: readonly ScenarioOverrideInput[],
  opts: RunOptions,
): ScenarioRun {
  if (opts.approvalWithholding !== 'bypass') throw new Error('runScenarioChain: approvalWithholding must be "bypass"');
  const maxPasses = opts.maxPasses ?? MAX_PASSES;
  const std = baseline.standardCode;
  const fieldById = new Map(baseline.fields.map((f) => [f.id, f]));
  const fieldByCodeSymbol = new Map(baseline.fields.map((f) => [`${f.templateCode}:${f.symbol}`, f]));
  const fieldsByTemplate = groupBy(baseline.fields, (f) => f.templateId);
  const sectionsByTemplate = groupBy(baseline.sections, (s) => s.templateId);
  const fieldsBySymbol = groupBy(baseline.fields, (f) => f.symbol);
  const sheets = sortSheets(baseline.sheets);
  const instantiated = new Set(baseline.sheets.map((s) => s.templateId));

  // ── 1. start values ──────────────────────────────────────────────────────────
  const values = new Map<string, ReportParameter>();
  const origin = new Map<string, ValueOrigin>();
  for (const [id, p] of Object.entries(baseline.stored)) {
    if (!fieldById.has(id)) continue;
    const { sourceType, ...param } = p;
    values.set(id, { ...param });
    origin.set(id, sourceType === 'derived' || sourceType === 'computed' ? 'carried' : 'entered');
  }
  const skippedOverrides: ScenarioRun['skippedOverrides'] = [];
  for (const o of overrides) {
    const f = fieldById.get(o.fieldId);
    if (!f) { skippedOverrides.push({ fieldId: o.fieldId, reason: 'Feld gehört nicht zu dieser Norm oder ist deaktiviert.' }); continue; }
    if (f.dataType !== o.value.type) { skippedOverrides.push({ fieldId: o.fieldId, reason: `Datentyp passt nicht (${f.dataType} ≠ ${o.value.type}).` }); continue; }
    values.set(o.fieldId, fieldValueToParameter(o.fieldId, o.value));
    origin.set(o.fieldId, 'override');
  }

  // ── visibility inputs (the approval gate's shared rule) ──────────────────────
  const meta: StandardVisibilityMeta = {
    standardCode: std,
    templateIds: [...new Set([...baseline.fields.map((f) => f.templateId), ...baseline.sections.map((s) => s.templateId)])],
    fields: baseline.fields.map((f) => ({
      id: f.id, symbol: f.symbol, labelDe: f.labelDe, dataType: f.dataType, isRequired: f.isRequired, templateId: f.templateId,
      templateCode: f.templateCode, sectionId: f.sectionId, visibleWhen: f.visibleWhen, unit: f.unit, widget: f.widget,
      uiConfig: f.uiConfig, consumerWorksheets: f.consumerWorksheets,
    })),
    sections: baseline.sections.map((s) => ({ id: s.id, parentSectionId: s.parentSectionId, visibleWhen: s.visibleWhen, templateId: s.templateId })),
  };
  const projectFields: ProjectFieldRow[] = baseline.fields
    .filter((f) => instantiated.has(f.templateId))
    .map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType, templateId: f.templateId, standardCode: std }));
  const inheritable = baseline.fields.map((f) => ({ ...f, worksheetTemplateId: f.templateId, standardCode: std, active: true }));

  const targeted = new Set<string>();
  const setNumber = (fieldId: string, v: number | null): boolean => {
    if (origin.get(fieldId) === 'override') return false; // spec §3 step 1: the override wins
    targeted.add(fieldId);
    const prev = values.get(fieldId);
    const prevNum = prev?.valueNumber == null ? null : Number(prev.valueNumber);
    const same = (prevNum === null && v === null) || (prevNum !== null && v !== null && numbersEqual(prevNum, v));
    values.set(fieldId, { fieldId, ...EMPTY, valueNumber: v });
    origin.set(fieldId, 'computed');
    return !same;
  };
  const paramsOf = (fs: readonly BaselineField[]) => fs.flatMap((f) => (values.has(f.id) ? [values.get(f.id)!] : []));

  let sheetRuns: Record<string, SheetRun> = {};
  let accessors = new Map<string, { acc: MirrorAccessor; eqIds: string[] }>();
  let passes = 0;
  let converged = false;

  for (let pass = 1; pass <= maxPasses; pass++) {
    passes = pass;
    let changed = false;
    const args = buildVisibilityArgs(meta, projectFields, [...values.values()]);
    const hiddenAtSource = args ? hiddenAtSourceFieldIds(args) : new Set<string>();
    const sourceHidden = args ? sourceHiddenSymbolsByTemplate(args, hiddenAtSource) : new Map<string, Set<string>>();
    const fallback: Map<string, GateValue> = args
      ? buildStandardScopedFallback(dropHiddenAtSource(args.projectEntries, hiddenAtSource), args.ownScope.templateIds, args.ownScope.symbols)
      : new Map();
    const runs: Record<string, SheetRun> = {};
    const accs = new Map<string, { acc: MirrorAccessor; eqIds: string[] }>();

    for (const sheet of sheets) {
      const own = fieldsByTemplate.get(sheet.templateId) ?? [];
      const ownSymbols = new Set(own.map((f) => f.symbol));
      const ownBySymbol = new Map(own.map((f) => [f.symbol, f]));
      const ownFields = own.map(toReportField);
      const inhRows = inheritedFieldsFor(
        { worksheetTemplateId: sheet.templateId, worksheetCode: sheet.code, standardCode: std }, inheritable,
      ).filter((f) => !hiddenAtSource.has(f.id));
      const inherited = { fields: inhRows.map(toReportField), parameters: paramsOf(inhRows) };
      const { hiddenSymbols: ownHidden } = reportVisibility(ownFields, sectionsByTemplate.get(sheet.templateId) ?? [], paramsOf(own), inherited);
      const hiddenSymbols = gateHiddenSymbols(ownHidden, sourceHidden.get(sheet.templateId) ?? [], ownSymbols);

      // Accessor for the mirror and the series: own → inherited → standard-scoped fallback; hidden ⇒ absent.
      const hit = (sym: string): { f: BaselineField; p: ReportParameter } | undefined => {
        if (hiddenSymbols.has(sym)) return undefined;
        const o = ownBySymbol.get(sym);
        if (o && values.has(o.id)) return { f: o, p: values.get(o.id)! };
        if (!ownSymbols.has(sym)) for (const f of inhRows) if (f.symbol === sym && values.has(f.id)) return { f, p: values.get(f.id)! };
        return undefined;
      };
      const acc: MirrorAccessor = {
        num: (sym) => {
          const h = hit(sym);
          if (h) return h.f.dataType === 'number' && h.p.valueNumber != null && Number.isFinite(Number(h.p.valueNumber)) ? Number(h.p.valueNumber) : null;
          if (hiddenSymbols.has(sym)) return null;
          const g = fallback.get(sym);
          return typeof g === 'number' && Number.isFinite(g) ? g : null;
        },
        str: (sym) => {
          const h = hit(sym);
          if (h) return h.p.valueEnum ?? h.p.valueText ?? null;
          if (hiddenSymbols.has(sym)) return null;
          const g = fallback.get(sym);
          return typeof g === 'string' ? g : null;
        },
        json: (sym) => {
          const h = hit(sym);
          if (h) return h.p.valueJson ?? undefined;
          if (hiddenSymbols.has(sym)) return undefined;
          for (const f of fieldsBySymbol.get(sym) ?? []) {
            if (hiddenAtSource.has(f.id)) continue;
            const p = values.get(f.id);
            if (p?.valueJson != null) return p.valueJson;
          }
          return undefined;
        },
      };

      // ── equations ──
      const results = evaluateWorksheetEquations(sheet.code, sheet.equations, ownFields, paramsOf(own), {
        standardCode: std, hiddenSymbols, inherited,
      });
      const method = ownBySymbol.get('a_s_m_determination_method');
      const suppressed = asmEngineSuppressedSymbols(method ? (values.get(method.id)?.valueEnum ?? null) : null);
      const candidates = new Map<string, number | null>();
      for (const r of results) {
        if (r.equationId === BASIN_GL8_EQUATION_ID) {
          const ex = r.state.kind === 'computed' ? r.state.derivedExtras : undefined;
          const rf = ownBySymbol.get('r_D_n');
          if (rf) candidates.set(rf.id, ex ? ex.r_D_gov : null);
          const df = ownBySymbol.get('D_min');
          if (df) candidates.set(df.id, ex ? ex.D_gov : null);
        }
        if (equationProfiles[r.equationId]?.displayOnly) continue;
        const sym = r.outputSymbol;
        if (!sym) continue;
        const target = ownBySymbol.get(sym);
        if (!target || target.dataType !== 'number' || suppressed.has(sym)) continue;
        const val = r.state.kind === 'computed' && Number.isFinite(r.state.value) ? r.state.value : null;
        const prev = candidates.get(target.id);
        if (prev === undefined || (prev === null && val !== null)) candidates.set(target.id, val);
      }
      for (const [id, val] of candidates) changed = setNumber(id, val) || changed;

      // ── A 138 server materialisations (spec gap G-2) ──
      if (std === A138_STANDARD_CODE) {
        for (const w of mirrorA138(sheet.code, acc)) {
          const f = fieldByCodeSymbol.get(`${w.worksheetCode}:${w.symbol}`);
          if (f && f.dataType === 'number') changed = setNumber(f.id, w.value) || changed;
        }
      }

      // ── compliance: own + inherited + the gate's fallback (spec gap G-5) ──
      const readable = [...ownFields, ...inherited.fields.filter((f) => !ownSymbols.has(f.symbol))];
      const readableSymbols = new Set(readable.map((f) => f.symbol));
      const extraFields: ReportField[] = [];
      const extraParams: ReportParameter[] = [];
      for (const [sym, gv] of fallback) {
        if (readableSymbols.has(sym) || gv == null) continue;
        const id = `fallback:${sym}`;
        if (typeof gv === 'number') { extraFields.push({ id, symbol: sym, unit: null, dataType: 'number' }); extraParams.push({ fieldId: id, ...EMPTY, valueNumber: gv }); }
        else if (typeof gv === 'boolean') { extraFields.push({ id, symbol: sym, unit: null, dataType: 'boolean' }); extraParams.push({ fieldId: id, ...EMPTY, valueBoolean: gv }); }
        else { extraFields.push({ id, symbol: sym, unit: null, dataType: 'text' }); extraParams.push({ fieldId: id, ...EMPTY, valueText: String(gv) }); }
      }
      const compliance = evaluateWorksheetCompliance(
        sheet.code, sheet.compliance, [...readable, ...extraFields],
        [...paramsOf(own), ...paramsOf(inhRows), ...extraParams], results, { hiddenSymbols },
      );

      runs[sheet.code] = {
        code: sheet.code,
        equations: results.map((r) => ({ equationId: r.equationId, equationNumber: r.equationNumber, outputSymbol: r.outputSymbol, state: r.state })),
        compliance: compliance.map((c) => ({ code: c.code, titleDe: c.titleDe, severity: c.severity, result: c.result })),
        hiddenSymbols: [...hiddenSymbols].sort(),
      };
      accs.set(sheet.code, { acc, eqIds: sheet.equations.map((e) => e.id) });
    }
    sheetRuns = runs;
    accessors = accs;
    if (!changed) { converged = true; break; }
  }

  // ── output ──
  const iterations = sheets.flatMap((s) => {
    const a = accessors.get(s.code);
    return a ? seriesForSheet(s.code, a.eqIds, a.acc) : [];
  });
  const cells: Record<string, RunCell> = {};
  for (const [id, p] of values) {
    const f = fieldById.get(id)!;
    if (f.dataType === 'json') continue;
    cells[id] = { worksheetCode: f.templateCode, symbol: f.symbol, dataType: f.dataType, value: scalarOfParameter(f.dataType, p), origin: origin.get(id) ?? 'entered' };
  }
  const mismatches: StoredMismatch[] = [];
  const notRecomputed: ScenarioRun['notRecomputed'] = [];
  for (const [id, stored] of Object.entries(baseline.stored)) {
    const f = fieldById.get(id);
    if (!f || (stored.sourceType !== 'derived' && stored.sourceType !== 'computed')) continue;
    if (!targeted.has(id)) { notRecomputed.push({ worksheetCode: f.templateCode, symbol: f.symbol }); continue; }
    if (overrides.length > 0) continue; // the consistency check is the Real run's job
    const a = scalarOfParameter(f.dataType, stored);
    const b = scalarOfParameter(f.dataType, values.get(id));
    const same = typeof a === 'number' && typeof b === 'number' ? numbersEqual(a, b) : a === b;
    if (!same) mismatches.push({ fieldId: id, worksheetCode: f.templateCode, symbol: f.symbol, stored: a, computed: b });
  }
  return { caseId: opts.caseId, converged, passes, values: cells, sheets: sheetRuns, iterations, mismatches, notRecomputed, skippedOverrides };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project unit src/lib/eval/__tests__/scenario-chain.test.ts` → Expected: all pass. If a hand value differs, STOP: re-derive it by hand from the formula (the numbers above were computed 2026-10-14 from the exact DWD rows); never edit an expectation to match output without the derivation.
Run: `pnpm typecheck` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/scenario-chain.ts src/lib/eval/__tests__/scenario-chain.test.ts
git commit -m "feat(scenarios): pure chain runner — overrides over the record, phase-order fixpoint, visibility, series

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Baseline loader (DB → `ScenarioBaseline`)

**Files:**
- Create: `src/lib/scenarios/load-baseline.ts`
- Test: covered by the harness in Task 10 (`loadScenarioBaseline` is DB-only; the unit project stubs `db`).

**Interfaces:**
- Consumes: drizzle tables; `ensureRegulationTablesLoaded` (`@/lib/db/queries/regulation-tables`); `isAttestationCondition` (`@/lib/eval/attestation`); `isMissingRelationError`.
- Produces:
  - `loadScenarioBaseline(projectId: string, standardCode: string): Promise<ScenarioBaseline | null>` (null when the standard is unknown or has no live instance in the project)
  - `loadScenariosEnabled(projectId: string): Promise<boolean>` (false when the table is absent or no row)

- [ ] **Step 1: Implement**

```ts
// src/lib/scenarios/load-baseline.ts
import 'server-only';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  standards, worksheetTemplates, worksheetInstances, fields, worksheetSections, equations, complianceRequirements,
  projectParameters, projectScenarioSettings,
} from '@/lib/db/schema';
import { ensureRegulationTablesLoaded } from '@/lib/db/queries/regulation-tables';
import { isAttestationCondition } from '@/lib/eval/attestation';
import { isMissingRelationError } from './missing-table';
import type { ScenarioBaseline } from './baseline';

/** What the report path loads (src/lib/pdf/load-data.ts), for ONE standard, as the runner's input (spec §3). */
export async function loadScenarioBaseline(projectId: string, standardCode: string): Promise<ScenarioBaseline | null> {
  const [std] = await db.select({ id: standards.id, code: standards.code }).from(standards).where(eq(standards.code, standardCode)).limit(1);
  if (!std) return null;
  await ensureRegulationTablesLoaded(std.code);

  const inst = await db
    .select({
      instanceId: worksheetInstances.id, templateId: worksheetTemplates.id, code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe, titleEn: worksheetTemplates.titleEn, phase: worksheetTemplates.phase,
      orderIndex: worksheetTemplates.orderIndex,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .where(and(eq(worksheetInstances.projectId, projectId), eq(worksheetTemplates.standardId, std.id), ne(worksheetInstances.status, 'deactivated')));
  if (inst.length === 0) return null;
  const templateIds = inst.map((i) => i.templateId);

  const fieldRows = await db
    .select({
      id: fields.id, templateId: fields.worksheetTemplateId, templateCode: worksheetTemplates.code, symbol: fields.symbol,
      labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType, isRequired: fields.isRequired,
      sectionId: fields.sectionId, visibleWhen: fields.visibleWhen, widget: fields.widget, uiConfig: fields.uiConfig,
      consumerWorksheets: fields.consumerWorksheets, enumValues: fields.enumValues, validationRules: fields.validationRules,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(eq(worksheetTemplates.standardId, std.id), eq(fields.active, true)));
  const sectionRows = await db
    .select({ id: worksheetSections.id, templateId: worksheetSections.worksheetTemplateId, parentSectionId: worksheetSections.parentSectionId, visibleWhen: worksheetSections.visibleWhen })
    .from(worksheetSections)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetSections.worksheetTemplateId))
    .where(eq(worksheetTemplates.standardId, std.id));
  const eqRows = await db.select().from(equations).where(inArray(equations.worksheetTemplateId, templateIds));
  const crRows = await db.select().from(complianceRequirements).where(inArray(complianceRequirements.worksheetTemplateId, templateIds));
  const fieldIds = fieldRows.map((f) => f.id);
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));

  return {
    projectId, standardId: std.id, standardCode: std.code,
    sheets: inst.map((i) => ({
      instanceId: i.instanceId, templateId: i.templateId, code: i.code, titleDe: i.titleDe, titleEn: i.titleEn ?? null,
      phase: i.phase ?? null, orderIndex: i.orderIndex,
      equations: eqRows.filter((e) => e.worksheetTemplateId === i.templateId).map((e) => ({
        id: e.id, equationNumber: e.equationNumber, formula: e.formula, inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol, outputUnit: e.outputUnit,
      })),
      compliance: crRows.filter((c) => c.worksheetTemplateId === i.templateId).map((c) => ({
        id: c.id, code: c.code, titleDe: c.titleDe, condition: c.condition, severity: c.severity, description: c.description,
        requiresAttestation: isAttestationCondition(c.condition),
      })),
    })),
    fields: fieldRows.map((f) => ({
      ...f, labelEn: f.labelEn ?? null, unit: f.unit ?? null, sectionId: f.sectionId ?? null, visibleWhen: f.visibleWhen ?? null,
      widget: f.widget ?? null, uiConfig: f.uiConfig ?? null, consumerWorksheets: (f.consumerWorksheets as string[] | null) ?? null,
      enumValues: (f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null) ?? null,
      validationRules: (f.validationRules as { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null) ?? null,
    })),
    sections: sectionRows.map((s) => ({ ...s, parentSectionId: s.parentSectionId ?? null, visibleWhen: s.visibleWhen ?? null })),
    stored: Object.fromEntries(params.map((p) => [p.fieldId, {
      fieldId: p.fieldId, valueNumber: p.valueNumber == null ? null : Number(p.valueNumber), valueText: p.valueText,
      valueEnum: p.valueEnum, valueBoolean: p.valueBoolean, valueDate: p.valueDate, valueJson: p.valueJson, sourceType: p.sourceType,
    }])),
  };
}

/** „Fälle aktiv" (spec §7). Absent table ⇒ false (code tolerates the unapplied migration). */
export async function loadScenariosEnabled(projectId: string): Promise<boolean> {
  try {
    const [row] = await db.select({ enabled: projectScenarioSettings.enabled }).from(projectScenarioSettings)
      .where(eq(projectScenarioSettings.projectId, projectId)).limit(1);
    return row?.enabled === true;
  } catch (e) {
    if (isMissingRelationError(e)) return false;
    throw e;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck` → exit 0. (Behaviour is proven in Task 10.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/scenarios/load-baseline.ts
git commit -m "feat(scenarios): baseline loader (report-path inputs for one standard) + Fälle-aktiv read

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Server actions (CRUD, overrides, settings, field search, results)

**Files:**
- Create: `src/lib/actions/scenarios.ts`
- Test: behaviour proven in Task 10 (harness); unit test of the pure summary helper here: `src/lib/scenarios/__tests__/summaries.test.ts`
- Create: `src/lib/scenarios/summaries.ts` (pure assembly of `ScenarioSummary` from rows — testable without DB)

**Interfaces:**
- Consumes: Tasks 1–8; `createClient` (`@/lib/supabase/server`); `resolveProjectAccess` (`@/lib/auth/project-access`).
- Produces (all `'use server'`, all return `{ ok: true, … } | { ok: false; error: string }` so the MCP `unwrap` works):
  - `listScenarios(projectId: string, opts?: { includeArchived?: boolean }): Promise<{ ok: true; available: boolean; enabled: boolean; scenarios: ScenarioSummary[] } | Fail>`
  - `createScenario(input: { projectId: string; name: string; reason?: string | null; includeInReport?: boolean }): Promise<{ ok: true; scenario: ScenarioSummary } | Fail>`
  - `duplicateScenario(scenarioId: string, name?: string): Promise<{ ok: true; scenario: ScenarioSummary } | Fail>`
  - `updateScenario(scenarioId: string, patch: { name?: string; reason?: string | null; includeInReport?: boolean }): Promise<{ ok: true } | Fail>`
  - `archiveScenario(scenarioId: string): Promise<{ ok: true } | Fail>`
  - `setScenarioOverrides(scenarioId: string, entries: Array<{ fieldId: string; value: unknown; note: string }>): Promise<{ ok: true; scenario: ScenarioSummary } | Fail>` (all-or-nothing)
  - `removeScenarioOverride(scenarioId: string, fieldId: string): Promise<{ ok: true } | Fail>`
  - `setScenariosEnabled(projectId: string, enabled: boolean): Promise<{ ok: true } | Fail>`
  - `searchOverridableFields(projectId: string, query: string): Promise<{ ok: true; fields: OverridableFieldHit[] } | Fail>` with `OverridableFieldHit = { fieldId; symbol; labelDe; labelEn: string | null; unit: string | null; dataType; enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null; worksheetCode; standardCode; realValue: ScenarioValue | null }` (exported type from `src/lib/scenarios/types.ts` — add it there in this task)
  - `getScenarioResults(projectId: string, standardCode: string, scenarioIds?: string[]): Promise<({ ok: true } & ScenarioResultsPayload) | Fail>`
  - pure: `buildSummaries(rows, overrides, paramsByFieldId): ScenarioSummary[]` in `summaries.ts`

- [ ] **Step 1: Write the failing test (pure summary assembly + drift)**

```ts
// src/lib/scenarios/__tests__/summaries.test.ts
import { describe, it, expect } from 'vitest';
import { buildSummaries } from '../summaries';

const at = new Date('2026-10-14T10:00:00Z');
describe('buildSummaries', () => {
  it('maps slot, overrides and drift (real value moved away from base)', () => {
    const s = buildSummaries(
      [{ id: 's1', name: 'K5', reason: 'Feldversuch', sortOrder: 3, includeInReport: false, archivedAt: null, createdAt: at }],
      [{
        scenarioId: 's1', fieldId: 'f1', value: { type: 'number', value: 1e-5 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, note: 'Annahme',
        symbol: 'k_f', labelDe: 'k_f', labelEn: null, unit: 'm/s', dataType: 'number', worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1',
      }],
      new Map([['f1', { valueNumber: '2e-6', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }]]),
    );
    expect(s[0]).toMatchObject({ id: 's1', slot: 3, createdAt: '2026-10-14T10:00:00.000Z', archivedAt: null });
    expect(s[0].overrides[0]).toMatchObject({ drift: true, currentReal: { type: 'number', value: 2e-6 }, baseValueAtCreation: { type: 'number', value: 1e-6 } });
  });
  it('no drift when the real value equals the base, also when both are empty', () => {
    const s = buildSummaries(
      [{ id: 's1', name: 'K', reason: null, sortOrder: 1, includeInReport: true, archivedAt: null, createdAt: at }],
      [
        { scenarioId: 's1', fieldId: 'f1', value: { type: 'number', value: 1 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, note: 'n', symbol: 'k_f', labelDe: 'k_f', labelEn: null, unit: null, dataType: 'number', worksheetCode: 'A138-05', standardCode: 'S' },
        { scenarioId: 's1', fieldId: 'f2', value: { type: 'number', value: 1 }, baseValueAtCreation: null, note: 'n', symbol: 'x', labelDe: 'x', labelEn: null, unit: null, dataType: 'number', worksheetCode: 'A138-05', standardCode: 'S' },
      ],
      new Map([['f1', { valueNumber: '0.000001', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }]]),
    );
    expect(s[0].overrides.map((o) => o.drift)).toEqual([false, false]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/summaries.test.ts`
Expected: FAIL — cannot resolve `../summaries`.

- [ ] **Step 3: Implement `summaries.ts` and add `OverridableFieldHit` to `types.ts`**

Append to `src/lib/scenarios/types.ts`:

```ts
export type OverridableFieldHit = {
  fieldId: string; symbol: string; labelDe: string; labelEn: string | null; unit: string | null; dataType: string;
  enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null;
  worksheetCode: string; standardCode: string; realValue: ScenarioValue | null;
};
```

```ts
// src/lib/scenarios/summaries.ts
import { paramToFieldValue, fieldValueEqual } from './values';
import type { ScenarioSummary, ScenarioValue } from './types';

export type ScenarioRow = { id: string; name: string; reason: string | null; sortOrder: number; includeInReport: boolean; archivedAt: Date | null; createdAt: Date };
export type OverrideRow = {
  scenarioId: string; fieldId: string; value: unknown; baseValueAtCreation: unknown; note: string;
  symbol: string; labelDe: string; labelEn: string | null; unit: string | null; dataType: string; worksheetCode: string; standardCode: string;
};
type ParamCols = { valueNumber: unknown; valueText: string | null; valueEnum: string | null; valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown };

export function buildSummaries(rows: readonly ScenarioRow[], overrides: readonly OverrideRow[], params: ReadonlyMap<string, ParamCols>): ScenarioSummary[] {
  return rows.map((r) => ({
    id: r.id, name: r.name, reason: r.reason, slot: r.sortOrder, includeInReport: r.includeInReport,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null, createdAt: r.createdAt.toISOString(),
    overrides: overrides.filter((o) => o.scenarioId === r.id).map((o) => {
      const base = (o.baseValueAtCreation ?? null) as ScenarioValue | null;
      const current = paramToFieldValue(o.dataType, params.get(o.fieldId));
      return {
        fieldId: o.fieldId, symbol: o.symbol, labelDe: o.labelDe, labelEn: o.labelEn, unit: o.unit, dataType: o.dataType,
        worksheetCode: o.worksheetCode, standardCode: o.standardCode, value: o.value as ScenarioValue,
        baseValueAtCreation: base, currentReal: current, drift: !fieldValueEqual(base, current), note: o.note,
      };
    }),
  }));
}
```

- [ ] **Step 4: Implement the actions**

```ts
// src/lib/actions/scenarios.ts
'use server';
/**
 * What-if cases („Fälle") — server actions (spec §2, §3 step 7, §4). Cases live ONLY in project_scenarios /
 * project_scenario_overrides / project_scenario_settings; nothing here writes project_parameters, worksheet_instances,
 * approval_events or audit_log. Access: internal org members (same boundary as saveWorksheet). Tolerates the staged
 * tables being absent (42P01).
 */
import { and, asc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectScenarios, projectScenarioOverrides, projectScenarioSettings, fields, worksheetTemplates, worksheetInstances,
  standards, equations, projectParameters,
} from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { resolveProjectAccess } from '@/lib/auth/project-access';
import { firstFreeSlot, type OverridableFieldHit, type ScenarioResultsPayload, type ScenarioSummary, type ScenarioValue } from '@/lib/scenarios/types';
import { isMissingRelationError, SCENARIOS_UNAVAILABLE } from '@/lib/scenarios/missing-table';
import { overrideRefusal, coerceOverrideValue, type OverrideFieldMeta } from '@/lib/scenarios/validate-override';
import { paramToFieldValue } from '@/lib/scenarios/values';
import { buildSummaries } from '@/lib/scenarios/summaries';
import { loadScenarioBaseline } from '@/lib/scenarios/load-baseline';
import { runScenarioChain } from '@/lib/eval/scenario-chain';

type Fail = { ok: false; error: string };
const LIMIT_MSG = 'Höchstens 6 aktive Fälle je Projekt — zuerst einen Fall archivieren.';

async function requireInternal(projectId: string): Promise<{ userId: string } | Fail> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: 'Nicht angemeldet.' };
  const access = await resolveProjectAccess(data.user.id, projectId);
  if (access.scope !== 'internal') return { ok: false, error: 'Kein Zugriff auf dieses Projekt.' };
  return { userId: data.user.id };
}
const isFail = (x: unknown): x is Fail => typeof x === 'object' && x !== null && (x as { ok?: unknown }).ok === false;

async function tolerant<T>(fn: () => Promise<T>): Promise<T | Fail> {
  try { return await fn(); } catch (e) {
    if (isMissingRelationError(e)) return { ok: false, error: SCENARIOS_UNAVAILABLE.de };
    throw e;
  }
}

async function scenarioRow(scenarioId: string) {
  const [row] = await db.select().from(projectScenarios).where(eq(projectScenarios.id, scenarioId)).limit(1);
  return row ?? null;
}

async function loadSummaries(projectId: string, includeArchived: boolean, ids?: string[]): Promise<ScenarioSummary[]> {
  const rows = await db.select().from(projectScenarios)
    .where(and(
      eq(projectScenarios.projectId, projectId),
      includeArchived ? undefined : isNull(projectScenarios.archivedAt),
      ids ? inArray(projectScenarios.id, ids) : undefined,
    ))
    .orderBy(asc(projectScenarios.sortOrder), asc(projectScenarios.createdAt));
  if (rows.length === 0) return [];
  const ov = await db
    .select({
      scenarioId: projectScenarioOverrides.scenarioId, fieldId: projectScenarioOverrides.fieldId, value: projectScenarioOverrides.value,
      baseValueAtCreation: projectScenarioOverrides.baseValueAtCreation, note: projectScenarioOverrides.note,
      symbol: fields.symbol, labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType,
      worksheetCode: worksheetTemplates.code, standardCode: standards.code,
    })
    .from(projectScenarioOverrides)
    .innerJoin(fields, eq(fields.id, projectScenarioOverrides.fieldId))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(inArray(projectScenarioOverrides.scenarioId, rows.map((r) => r.id)))
    .orderBy(asc(worksheetTemplates.code), asc(fields.symbol));
  const fieldIds = [...new Set(ov.map((o) => o.fieldId))];
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));
  return buildSummaries(rows, ov, new Map(params.map((p) => [p.fieldId, p])));
}

export async function listScenarios(projectId: string, opts?: { includeArchived?: boolean }):
  Promise<{ ok: true; available: boolean; enabled: boolean; scenarios: ScenarioSummary[] } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  try {
    const scenarios = await loadSummaries(projectId, opts?.includeArchived === true);
    const [s] = await db.select({ enabled: projectScenarioSettings.enabled }).from(projectScenarioSettings)
      .where(eq(projectScenarioSettings.projectId, projectId)).limit(1);
    return { ok: true, available: true, enabled: s?.enabled === true, scenarios };
  } catch (e) {
    if (isMissingRelationError(e)) return { ok: true, available: false, enabled: false, scenarios: [] };
    throw e;
  }
}

async function insertScenario(
  projectId: string, userId: string, values: { name: string; reason: string | null; includeInReport: boolean },
  copyFrom?: string,
): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`);
      const active = await tx.select({ s: projectScenarios.sortOrder }).from(projectScenarios)
        .where(and(eq(projectScenarios.projectId, projectId), isNull(projectScenarios.archivedAt)));
      const slot = firstFreeSlot(active.map((a) => a.s));
      if (slot == null) return null;
      const [row] = await tx.insert(projectScenarios)
        .values({ projectId, name: values.name, reason: values.reason, includeInReport: values.includeInReport, sortOrder: slot, createdBy: userId })
        .returning({ id: projectScenarios.id });
      if (copyFrom) {
        const src = await tx.select().from(projectScenarioOverrides).where(eq(projectScenarioOverrides.scenarioId, copyFrom));
        if (src.length > 0) {
          await tx.insert(projectScenarioOverrides).values(src.map((o) => ({
            scenarioId: row.id, fieldId: o.fieldId, value: o.value, baseValueAtCreation: o.baseValueAtCreation, note: o.note,
          })));
        }
      }
      return row.id;
    });
  } catch (e) {
    // Belt and braces: the partial unique index on active slots refuses a 7th active case even without the lock.
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === '23505' || code === '23514') return null;
    throw e;
  }
}

export async function createScenario(input: { projectId: string; name: string; reason?: string | null; includeInReport?: boolean }):
  Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  const auth = await requireInternal(input.projectId);
  if (isFail(auth)) return auth;
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Name des Falls fehlt.' };
  return tolerant(async () => {
    const id = await insertScenario(input.projectId, auth.userId, { name, reason: input.reason?.trim() || null, includeInReport: input.includeInReport === true });
    if (!id) return { ok: false as const, error: LIMIT_MSG };
    const [scenario] = await loadSummaries(input.projectId, true, [id]);
    return { ok: true as const, scenario };
  });
}

export async function duplicateScenario(scenarioId: string, name?: string): Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  return tolerant(async () => {
    const src = await scenarioRow(scenarioId);
    if (!src) return { ok: false as const, error: 'Fall nicht gefunden.' };
    const auth = await requireInternal(src.projectId);
    if (isFail(auth)) return auth;
    const id = await insertScenario(src.projectId, auth.userId, {
      name: name?.trim() || `${src.name} (Kopie)`, reason: src.reason, includeInReport: false,
    }, src.id);
    if (!id) return { ok: false as const, error: LIMIT_MSG };
    const [scenario] = await loadSummaries(src.projectId, true, [id]);
    return { ok: true as const, scenario };
  });
}

export async function updateScenario(scenarioId: string, patch: { name?: string; reason?: string | null; includeInReport?: boolean }):
  Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const row = await scenarioRow(scenarioId);
    if (!row) return { ok: false as const, error: 'Fall nicht gefunden.' };
    const auth = await requireInternal(row.projectId);
    if (isFail(auth)) return auth;
    if (patch.name !== undefined && !patch.name.trim()) return { ok: false as const, error: 'Name des Falls fehlt.' };
    await db.update(projectScenarios).set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.reason !== undefined ? { reason: patch.reason?.trim() || null } : {}),
      ...(patch.includeInReport !== undefined ? { includeInReport: patch.includeInReport } : {}),
      updatedAt: new Date(),
    }).where(eq(projectScenarios.id, scenarioId));
    return { ok: true as const };
  });
}

export async function archiveScenario(scenarioId: string): Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const row = await scenarioRow(scenarioId);
    if (!row) return { ok: false as const, error: 'Fall nicht gefunden.' };
    const auth = await requireInternal(row.projectId);
    if (isFail(auth)) return auth;
    await db.update(projectScenarios).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(projectScenarios.id, scenarioId));
    return { ok: true as const };
  });
}

/** Field metadata + the overridable rule inputs for a set of field ids, scoped to the project's live sheets. */
async function overridableContext(projectId: string, fieldIds: string[]) {
  const metas = fieldIds.length === 0 ? [] : await db
    .select({
      id: fields.id, symbol: fields.symbol, labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType,
      active: fields.active, widget: fields.widget, uiConfig: fields.uiConfig, enumValues: fields.enumValues, validationRules: fields.validationRules,
      templateId: fields.worksheetTemplateId, worksheetCode: worksheetTemplates.code, standardCode: standards.code,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(inArray(fields.id, fieldIds));
  const templateIds = [...new Set(metas.map((m) => m.templateId))];
  const live = templateIds.length === 0 ? [] : await db.select({ t: worksheetInstances.worksheetTemplateId }).from(worksheetInstances)
    .where(and(eq(worksheetInstances.projectId, projectId), inArray(worksheetInstances.worksheetTemplateId, templateIds), ne(worksheetInstances.status, 'deactivated')));
  const eqs = templateIds.length === 0 ? [] : await db.select({ id: equations.id, outputSymbol: equations.outputSymbol, templateId: equations.worksheetTemplateId })
    .from(equations).where(inArray(equations.worksheetTemplateId, templateIds));
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));
  return {
    metaById: new Map(metas.map((m) => [m.id, m])),
    liveTemplates: new Set(live.map((l) => l.t)),
    eqsByTemplate: (t: string) => eqs.filter((e) => e.templateId === t),
    paramById: new Map(params.map((p) => [p.fieldId, p])),
  };
}
const asMeta = (m: { id: string; symbol: string; labelDe: string; dataType: string; active: boolean; widget: string | null; uiConfig: unknown; enumValues: unknown; validationRules: unknown }): OverrideFieldMeta => ({
  id: m.id, symbol: m.symbol, labelDe: m.labelDe, dataType: m.dataType, active: m.active, widget: m.widget, uiConfig: m.uiConfig,
  enumValues: (m.enumValues as Array<{ value: string }> | null) ?? null,
  validationRules: (m.validationRules as OverrideFieldMeta['validationRules']) ?? null,
});

export async function setScenarioOverrides(scenarioId: string, entries: Array<{ fieldId: string; value: unknown; note: string }>):
  Promise<{ ok: true; scenario: ScenarioSummary } | Fail> {
  return tolerant(async () => {
    const row = await scenarioRow(scenarioId);
    if (!row) return { ok: false as const, error: 'Fall nicht gefunden.' };
    if (row.archivedAt) return { ok: false as const, error: 'Ein archivierter Fall kann nicht geändert werden.' };
    const auth = await requireInternal(row.projectId);
    if (isFail(auth)) return auth;
    if (entries.length === 0) return { ok: false as const, error: 'Keine Werte übergeben.' };
    const ctx = await overridableContext(row.projectId, entries.map((e) => e.fieldId));
    const errors: string[] = [];
    const writes: Array<{ fieldId: string; value: ScenarioValue; base: ScenarioValue | null; note: string }> = [];
    for (const e of entries) {
      const m = ctx.metaById.get(e.fieldId);
      if (!m || !ctx.liveTemplates.has(m.templateId)) { errors.push(`Feld ${e.fieldId} gehört zu keinem Arbeitsblatt dieses Projekts.`); continue; }
      if (!e.note || !e.note.trim()) { errors.push(`${m.labelDe} (${m.symbol}): Notiz zur Herkunft der Annahme fehlt.`); continue; }
      const stored = ctx.paramById.get(m.id);
      const refusal = overrideRefusal(asMeta(m), ctx.eqsByTemplate(m.templateId), stored?.sourceType ?? null);
      if (refusal) { errors.push(refusal); continue; }
      const c = coerceOverrideValue(asMeta(m), e.value);
      if (!c.ok) { errors.push(c.error); continue; }
      writes.push({ fieldId: m.id, value: c.value, base: paramToFieldValue(m.dataType, stored), note: e.note.trim() });
    }
    if (errors.length > 0) return { ok: false as const, error: errors.join(' · ') };
    await db.transaction(async (tx) => {
      for (const w of writes) {
        await tx.insert(projectScenarioOverrides)
          .values({ scenarioId, fieldId: w.fieldId, value: w.value, baseValueAtCreation: w.base, note: w.note })
          .onConflictDoUpdate({
            target: [projectScenarioOverrides.scenarioId, projectScenarioOverrides.fieldId],
            set: { value: w.value, note: w.note, updatedAt: new Date() }, // base_value_at_creation stays (spec §2 drift)
          });
      }
      await tx.update(projectScenarios).set({ updatedAt: new Date() }).where(eq(projectScenarios.id, scenarioId));
    });
    const [scenario] = await loadSummaries(row.projectId, true, [scenarioId]);
    return { ok: true as const, scenario };
  });
}

export async function removeScenarioOverride(scenarioId: string, fieldId: string): Promise<{ ok: true } | Fail> {
  return tolerant(async () => {
    const row = await scenarioRow(scenarioId);
    if (!row) return { ok: false as const, error: 'Fall nicht gefunden.' };
    const auth = await requireInternal(row.projectId);
    if (isFail(auth)) return auth;
    await db.delete(projectScenarioOverrides)
      .where(and(eq(projectScenarioOverrides.scenarioId, scenarioId), eq(projectScenarioOverrides.fieldId, fieldId)));
    return { ok: true as const };
  });
}

export async function setScenariosEnabled(projectId: string, enabled: boolean): Promise<{ ok: true } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  return tolerant(async () => {
    await db.insert(projectScenarioSettings).values({ projectId, enabled, updatedBy: auth.userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: projectScenarioSettings.projectId, set: { enabled, updatedBy: auth.userId, updatedAt: new Date() } });
    return { ok: true as const };
  });
}

export async function searchOverridableFields(projectId: string, query: string): Promise<{ ok: true; fields: OverridableFieldHit[] } | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  const q = query.trim();
  if (q.length < 2) return { ok: true, fields: [] };
  const like = `%${q}%`;
  const hits = await db
    .select({ id: fields.id })
    .from(fields)
    .innerJoin(worksheetInstances, and(eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId), eq(worksheetInstances.projectId, projectId), ne(worksheetInstances.status, 'deactivated')))
    .where(and(eq(fields.active, true), ne(fields.dataType, 'json'), or(ilike(fields.labelDe, like), ilike(fields.labelEn, like), ilike(fields.symbol, like))))
    .limit(60);
  const ctx = await overridableContext(projectId, hits.map((h) => h.id));
  const out: OverridableFieldHit[] = [];
  for (const h of hits) {
    const m = ctx.metaById.get(h.id);
    if (!m) continue;
    const stored = ctx.paramById.get(m.id);
    if (overrideRefusal(asMeta(m), ctx.eqsByTemplate(m.templateId), stored?.sourceType ?? null)) continue;
    out.push({
      fieldId: m.id, symbol: m.symbol, labelDe: m.labelDe, labelEn: m.labelEn ?? null, unit: m.unit ?? null, dataType: m.dataType,
      enumValues: (m.enumValues as OverridableFieldHit['enumValues']) ?? null, worksheetCode: m.worksheetCode, standardCode: m.standardCode,
      realValue: paramToFieldValue(m.dataType, stored),
    });
    if (out.length >= 30) break;
  }
  return { ok: true, fields: out };
}

/** Spec §3 step 7: computed on request, nothing persisted; per-request memoisation (one baseline, one Real run). */
export async function getScenarioResults(projectId: string, standardCode: string, scenarioIds?: string[]):
  Promise<({ ok: true } & ScenarioResultsPayload) | Fail> {
  const auth = await requireInternal(projectId);
  if (isFail(auth)) return auth;
  const baseline = await loadScenarioBaseline(projectId, standardCode);
  if (!baseline) return { ok: false, error: `Norm ${standardCode} hat in diesem Projekt keine Arbeitsblätter.` };
  let available = true;
  let summaries: ScenarioSummary[] = [];
  const ignored: string[] = [];
  try {
    const active = await loadSummaries(projectId, false);
    if (scenarioIds) {
      const ids = [...new Set(scenarioIds)];
      summaries = active.filter((s) => ids.includes(s.id));
      for (const id of ids) if (!summaries.some((s) => s.id === id)) ignored.push(id);
    } else {
      summaries = active;
    }
  } catch (e) {
    if (!isMissingRelationError(e)) throw e;
    available = false;
    if (scenarioIds) ignored.push(...scenarioIds);
  }
  const real = runScenarioChain(baseline, [], { caseId: 'real', approvalWithholding: 'bypass' });
  const cases = summaries.map((scenario) => ({
    scenario,
    run: runScenarioChain(
      baseline,
      scenario.overrides.filter((o) => o.standardCode === standardCode).map((o) => ({ fieldId: o.fieldId, value: o.value })),
      { caseId: scenario.id, approvalWithholding: 'bypass' },
    ),
  }));
  return { ok: true, available, standardCode, real, cases, ignoredScenarioIds: ignored };
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/summaries.test.ts` → PASS.
Run: `pnpm typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/scenarios.ts src/lib/scenarios/summaries.ts src/lib/scenarios/types.ts src/lib/scenarios/__tests__/summaries.test.ts
git commit -m "feat(scenarios): server actions — case CRUD, validated overrides, settings, field search, results

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Real-save-path harness — Real equals record, limits, refusals, drift, isolation, absent tables

**Files:**
- Create: `tests/harness/seed-scenarios.ts`
- Create: `tests/harness/_harness-env-scenarios.ts`
- Create: `tests/harness/scenarios.integration.test.ts`

**Interfaces:**
- Consumes: `FIXTURE_SHEETS`, `ENTERED`, `K5` (Task 6); `startHarness` (`tests/harness/embedded-pg.ts`); real `saveWorksheet`, `recomputeWorksheetEquations`, `checkApprovalGate`, `loadProjectReportData`; all Task 9 actions; `loadScenarioBaseline` (Task 8); `runScenarioChain` (Task 7).
- Produces: `seedScenarios(sql, userId): Promise<ScenarioHarnessFixture>` with `ScenarioHarnessFixture = { projectId: string; userId: string; standardId: string; instances: Record<string, string>; fieldIds: Record<string, string> }` (`fieldIds` keyed `"<code>:<symbol>"`); `getScenarioHarness()`.

- [ ] **Step 1: Seed + env**

```ts
// tests/harness/seed-scenarios.ts
/**
 * What-if cases harness fixture: the anonymised C4-shaped A 138 chain (src/lib/scenarios/__fixtures__/c4-a138-chain.ts)
 * as real rows — templates in phase order, fields with consumer_worksheets / visible_when / enum_values, equations
 * (prod UUIDs where aggregators / profiles key on them), REQ-15 on A138-10. Values are NOT seeded here: the test saves
 * them through the REAL saveWorksheet so the record's derived values come from the real save path.
 */
import type postgres from 'postgres';
import { FIXTURE_SHEETS } from '@/lib/scenarios/__fixtures__/c4-a138-chain';

export type ScenarioHarnessFixture = {
  projectId: string; userId: string; standardId: string;
  instances: Record<string, string>;
  fieldIds: Record<string, string>;
};

export async function seedScenarios(sql: postgres.Sql, userId: string): Promise<ScenarioHarnessFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'scenarios-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('Scenario Harness Org', ${'scn-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'TEST-SCN-C4', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-138-1', 'DWA-A 138-1 (harness)', 'harness') RETURNING id`;
  const instances: Record<string, string> = {};
  const fieldIds: Record<string, string> = {};
  for (const s of FIXTURE_SHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, phase, order_index)
      VALUES (${std.id}, ${s.code}, ${s.code}, ${s.phase}, ${s.order}) RETURNING id`;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + s.code}, ${'S-' + s.code}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[s.code] = inst.id;
    let oi = 1;
    for (const f of s.fields) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, active, is_required, order_index,
                            consumer_worksheets, visible_when, enum_values)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, ${f.unit ?? null}, true, false, ${oi++},
                ${f.consumers ? sql.array(f.consumers) : null}, ${f.visibleWhen ?? null},
                ${f.enumValues ? sql.json(f.enumValues.map((v) => ({ value: v, label_de: v, label_en: v }))) : null})
        RETURNING id`;
      fieldIds[`${s.code}:${f.symbol}`] = row.id;
    }
    for (const e of s.equations) {
      await sql`
        INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol, input_symbols)
        VALUES (${e.id}, ${t.id}, ${e.number}, ${e.formula}, ${e.output}, ${sql.array(e.inputs)})`;
    }
    for (const c of s.compliance) {
      await sql`
        INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
        VALUES (${t.id}, ${c.code}, ${c.code}, ${c.condition}, ${c.severity})`;
    }
  }
  return { projectId: proj.id, userId, standardId: std.id, instances, fieldIds };
}
```

```ts
// tests/harness/_harness-env-scenarios.ts
/** MUST be the first import of scenarios.integration.test.ts (sets DATABASE_URL + BYPASS_AUTH before @/lib/db loads). */
import { startHarness, type Harness } from './embedded-pg';
import { seedScenarios, type ScenarioHarnessFixture } from './seed-scenarios';

const HARNESS_USER_ID = '00000000-0000-4000-8000-00000000c4c4';
const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
const fixture: ScenarioHarnessFixture = await seedScenarios(harness.sql, HARNESS_USER_ID);

declare global {
  // eslint-disable-next-line no-var
  var __ekowaiScenarioHarness__: { harness: Harness; fixture: ScenarioHarnessFixture } | undefined;
}
globalThis.__ekowaiScenarioHarness__ = { harness, fixture };
export function getScenarioHarness() {
  if (!globalThis.__ekowaiScenarioHarness__) throw new Error('scenario harness not initialised');
  return globalThis.__ekowaiScenarioHarness__;
}
```

- [ ] **Step 2: Write the harness test**

```ts
// tests/harness/scenarios.integration.test.ts
// @vitest-environment node
import './_harness-env-scenarios';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getScenarioHarness } from './_harness-env-scenarios';
import { FIXTURE_SHEETS, ENTERED, K5 } from '@/lib/scenarios/__fixtures__/c4-a138-chain';
import type * as Actions from '@/lib/actions/scenarios';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { recomputeWorksheetEquations as Recompute } from '@/lib/actions/recompute-worksheet';
import type { checkApprovalGate as CheckGate } from '@/lib/actions/approval-gate';
import type { loadProjectReportData as LoadReport } from '@/lib/pdf/load-data';
import type { loadScenarioBaseline as LoadBaseline } from '@/lib/scenarios/load-baseline';
import type { runScenarioChain as Run } from '@/lib/eval/scenario-chain';

const { harness, fixture } = getScenarioHarness();
const sql = harness.sql;
let A: typeof Actions;
let saveWorksheet: typeof SaveWorksheet;
let recompute: typeof Recompute;
let checkApprovalGate: typeof CheckGate;
let loadProjectReportData: typeof LoadReport;
let loadScenarioBaseline: typeof LoadBaseline;
let runScenarioChain: typeof Run;

const STD = 'DWA-A-138-1';
const F = (k: string) => fixture.fieldIds[k];
const close = (a: unknown, b: number, rel = 1e-9) => expect(Math.abs(Number(a) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
async function stored(key: string): Promise<number | null> {
  const [r] = await sql<{ v: string | null }[]>`SELECT value_number::text AS v FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${F(key)}`;
  return r?.v == null ? null : Number(r.v);
}
async function save(code: string, values: Record<string, unknown>) {
  const res = await saveWorksheet({ instanceId: fixture.instances[code], values: values as never });
  expect(res.ok, `saveWorksheet(${code}): ${JSON.stringify(res)}`).toBe(true);
}
async function fingerprint() {
  const one = async (t: string) => (await sql.unsafe(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h, count(*)::int AS n FROM ${t} x`))[0];
  return { pp: await one('project_parameters'), wi: await one('worksheet_instances'), ae: await one('approval_events'), al: await one('audit_log') };
}

beforeAll(async () => {
  A = await import('@/lib/actions/scenarios');
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadProjectReportData } = await import('@/lib/pdf/load-data'));
  ({ loadScenarioBaseline } = await import('@/lib/scenarios/load-baseline'));
  ({ runScenarioChain } = await import('@/lib/eval/scenario-chain'));

  // The record, built through the REAL save path: entered values per sheet in phase order …
  for (const s of FIXTURE_SHEETS) {
    const vals: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ENTERED)) if (k.startsWith(`${s.code}:`)) vals[F(k)] = v;
    if (Object.keys(vals).length > 0) await save(s.code, vals);
  }
  // … then the server recompute (MCP path) and the producer re-fires, twice, until the chain has settled.
  for (let i = 0; i < 2; i++) {
    for (const code of ['A138-11', 'A138-12', 'A138-13', 'A138-26']) await recompute(fixture.instances[code]);
    await save('A138-12', {});
    await save('A138-17', { [F('A138-17:h_M')]: { type: 'number', value: 0.3 } });
  }
  for (const code of ['A138-13', 'A138-26']) await recompute(fixture.instances[code]);
}, 120_000);

afterAll(async () => { await harness.stop(); });

describe('the record (real save path) carries the C4 hand values', () => {
  it('k_i, A_S,m, Q_S, V_VA, q_S,AC, V_M', async () => {
    close(await stored('A138-11:k_i'), 3e-8);
    close(await stored('A138-12:A_S_m'), 45);
    close(await stored('A138-12:Q_S'), 0.0015);
    close(await stored('A138-13:V_VA'), 70.0037505216);
    close(await stored('A138-13:q_S_AC'), 0.025655132309218457);
    close(await stored('A138-17:V_M'), 13.5);
  });
});

describe('Real = record (spec §6)', () => {
  it('the zero-override run reproduces every stored derived value it recomputes', async () => {
    const b = await loadScenarioBaseline(fixture.projectId, STD);
    expect(b).not.toBeNull();
    const real = runScenarioChain(b!, [], { caseId: 'real', approvalWithholding: 'bypass' });
    expect(real.mismatches, JSON.stringify(real.mismatches)).toEqual([]);
    expect(real.converged).toBe(true);
    // G-4: V_Rueck follows the aggregator's flood column (T 30 a today; T 100 a once fix/flood-check-t100 lands).
    expect([31.640062406400006, 55.30568077439999].some((x) => Math.abs((Number(real.values[F('A138-26:V_Rueck')]?.value)) - x) < 1e-6)).toBe(true);
  });
});

describe('cases through the actions — isolation (spec §6)', () => {
  let before: Awaited<ReturnType<typeof fingerprint>>;
  let gateBefore: unknown;
  let reportBefore: unknown;
  let k5Id = '';
  beforeAll(async () => {
    before = await fingerprint();
    gateBefore = await checkApprovalGate(fixture.instances['A138-10']);
    reportBefore = await loadProjectReportData(fixture.projectId);
  });

  it('setting + K5 created with validated overrides; base values recorded', async () => {
    expect((await A.setScenariosEnabled(fixture.projectId, true)).ok).toBe(true);
    const c = await A.createScenario({ projectId: fixture.projectId, name: 'K5 – Feldversuch k_f 1e-5', reason: 'Feldversuch ausstehend' });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    k5Id = c.scenario.id;
    expect(c.scenario.slot).toBe(1);
    const raw: Record<string, unknown> = { 'A138-05:k_f': '1e-5', 'A138-03:f_methode': 1, 'A138-08:f_ort': '1', 'A138-12:a_s_m_determination_method': 'geometry' };
    expect(Object.keys(raw).sort()).toEqual(Object.keys(K5).sort());
    const s = await A.setScenarioOverrides(k5Id, Object.entries(raw).map(([k, value]) => ({ fieldId: F(k), value, note: 'Annahme Feldversuch' })));
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (s.ok) expect(s.scenario.overrides.find((o) => o.symbol === 'k_f')).toMatchObject({ baseValueAtCreation: { type: 'number', value: 1e-6 }, drift: false });
  });

  it('getScenarioResults: K5 → A_S,m 48.58 m², REQ-15 passes; Real unchanged', async () => {
    const r = await A.getScenarioResults(fixture.projectId, STD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const k5 = r.cases.find((c) => c.scenario.id === k5Id)!;
    close(k5.run.values[F('A138-12:A_S_m')].value, 48.57599051396648);
    expect(k5.run.sheets['A138-10'].compliance.find((c) => c.code === 'A138-REQ-15')?.result.kind).toBe('pass');
    close(r.real!.values[F('A138-12:A_S_m')].value, 45);
  });

  it('refuses a derived field, a server-materialised field, an invalid enum and a missing note — and writes nothing', async () => {
    const count = async () => (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenario_overrides WHERE scenario_id = ${k5Id}`)[0].n;
    const n0 = await count();
    const ki = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-11:k_i'), value: 1e-5, note: 'x' }]);
    expect(ki).toMatchObject({ ok: false, error: expect.stringMatching(/wird berechnet/) });
    const vm = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-17:V_M'), value: 20, note: 'x' }]);
    expect(vm).toMatchObject({ ok: false, error: expect.stringMatching(/vom Werkzeug berechnet|abgeleiteter Wert/) });
    const en = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-12:a_s_m_determination_method'), value: 'magic', note: 'x' }]);
    expect(en).toMatchObject({ ok: false, error: expect.stringMatching(/keine zulässige Auswahl/) });
    const no = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-05:k_f'), value: 2e-5, note: '  ' }]);
    expect(no).toMatchObject({ ok: false, error: expect.stringMatching(/Notiz/) });
    const mixed = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-05:k_f'), value: 2e-5, note: 'ok' }, { fieldId: F('A138-11:k_i'), value: 1, note: 'x' }]);
    expect(mixed.ok).toBe(false); // all-or-nothing
    expect(await count()).toBe(n0);
  });

  it('limits: 6 active; concurrent create at the limit lets exactly one through; 7th refused; archive frees a slot', async () => {
    for (let i = 2; i <= 5; i++) expect((await A.createScenario({ projectId: fixture.projectId, name: `K${i}` })).ok).toBe(true);
    const race = await Promise.all([A.createScenario({ projectId: fixture.projectId, name: 'R1' }), A.createScenario({ projectId: fixture.projectId, name: 'R2' })]);
    expect(race.filter((x) => x.ok)).toHaveLength(1);
    const seventh = await A.createScenario({ projectId: fixture.projectId, name: 'K7' });
    expect(seventh).toEqual({ ok: false, error: expect.stringMatching(/Höchstens 6 aktive Fälle/) });
    const list = await A.listScenarios(fixture.projectId);
    expect(list.ok && list.scenarios.length).toBe(6);
    const victim = list.ok ? list.scenarios.find((s) => s.name === 'K3')! : null;
    expect((await A.archiveScenario(victim!.id)).ok).toBe(true);
    const again = await A.createScenario({ projectId: fixture.projectId, name: 'K8' });
    expect(again.ok && again.scenario.slot).toBe(victim!.slot);
  });

  it('archived ids are ignored (returned, never computed)', async () => {
    const all = await A.listScenarios(fixture.projectId, { includeArchived: true });
    const archived = all.ok ? all.scenarios.find((s) => s.archivedAt != null)! : null;
    const r = await A.getScenarioResults(fixture.projectId, STD, [archived!.id, k5Id]);
    expect(r.ok && r.ignoredScenarioIds).toEqual([archived!.id]);
    expect(r.ok && r.cases.map((c) => c.scenario.id)).toEqual([k5Id]);
  });

  it('nothing in the record changed: tables, gate, report data', async () => {
    expect(await fingerprint()).toEqual(before);
    expect(await checkApprovalGate(fixture.instances['A138-10'])).toEqual(gateBefore);
    expect(await loadProjectReportData(fixture.projectId)).toEqual(reportBefore);
  });
});

describe('drift (spec §2)', () => {
  it('a later change of the real value shows „Realwert geändert"', async () => {
    const list0 = await A.listScenarios(fixture.projectId);
    const k5 = list0.ok ? list0.scenarios.find((s) => s.name.startsWith('K5'))! : null;
    await save('A138-05', { [F('A138-05:k_f')]: { type: 'number', value: 2e-6 } });
    const list1 = await A.listScenarios(fixture.projectId);
    const o = list1.ok ? list1.scenarios.find((s) => s.id === k5!.id)!.overrides.find((x) => x.symbol === 'k_f')! : null;
    expect(o).toMatchObject({ drift: true, baseValueAtCreation: { type: 'number', value: 1e-6 }, currentReal: { type: 'number', value: 2e-6 } });
    await save('A138-05', { [F('A138-05:k_f')]: { type: 'number', value: 1e-6 } });
  });
});

describe('tables absent (migration not applied) — code tolerates it (spec §7)', () => {
  it('reads say unavailable, writes refuse, results still give the Real run', async () => {
    await sql.unsafe('DROP TABLE project_scenario_overrides, project_scenarios, project_scenario_settings CASCADE');
    expect(await A.listScenarios(fixture.projectId)).toEqual({ ok: true, available: false, enabled: false, scenarios: [] });
    expect(await A.createScenario({ projectId: fixture.projectId, name: 'X' })).toEqual({ ok: false, error: expect.stringMatching(/nicht eingerichtet/) });
    const r = await A.getScenarioResults(fixture.projectId, STD);
    expect(r.ok && r.available).toBe(false);
    expect(r.ok && r.real).toBeTruthy();
    const { loadScenariosEnabled } = await import('@/lib/scenarios/load-baseline');
    expect(await loadScenariosEnabled(fixture.projectId)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the harness**

Run: `pnpm vitest run --project integration tests/harness/scenarios.integration.test.ts`
Expected: all pass. If „the record carries the C4 hand values" or „Real = record" fails, that is a FINDING about the save path or the mirror (spec gap G-2) — stop, record the mismatch list in the ledger, and fix the runner/mirror to match the real save path only when the stored value equals the hand calculation; never edit a hand value.

- [ ] **Step 4: Commit**

```bash
git add tests/harness/seed-scenarios.ts tests/harness/_harness-env-scenarios.ts tests/harness/scenarios.integration.test.ts
git commit -m "test(harness): what-if cases on the real save path — Real = record, limits, refusals, drift, isolation, absent tables

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: MCP tools

**Files:**
- Create: `src/lib/scenarios/compact.ts`
- Create: `src/lib/mcp/tools/scenarios.ts`
- Modify: `src/app/api/mcp/route.ts` (register the tools)
- Test: `src/lib/mcp/__tests__/scenario-tools.test.ts`

**Interfaces:**
- Consumes: Task 9 actions; `defineTool`, `unwrap` (`src/lib/mcp/define-tool.ts`).
- Produces: `registerScenarioTools(server: McpServer): void` registering `list_scenarios`, `create_scenario`, `set_scenario_overrides`, `archive_scenario`, `get_scenario_results`; pure `compactRun(run: ScenarioRun, includePerDuration: boolean)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mcp/__tests__/scenario-tools.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({
  listScenarios: vi.fn(),
  createScenario: vi.fn(),
  setScenarioOverrides: vi.fn(),
  archiveScenario: vi.fn(),
  getScenarioResults: vi.fn(),
}));
vi.mock('@/lib/actions/scenarios', () => actions);

import { registerScenarioTools } from '../tools/scenarios';
import { compactRun } from '@/lib/scenarios/compact';
import type { ScenarioRun } from '@/lib/scenarios/types';

type Cb = (args: unknown, ctx: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
const tools = new Map<string, { cfg: { annotations?: { readOnlyHint?: boolean } }; cb: Cb }>();
registerScenarioTools({ registerTool: (name: string, cfg: never, cb: Cb) => tools.set(name, { cfg, cb }) } as never);
const CTX = { http: { authInfo: { extra: { user: { id: 'u1', email: 'e@x' }, accessToken: 't' } } } };
const call = async (name: string, args: unknown) => tools.get(name)!.cb(args, CTX);

const RUN: ScenarioRun = {
  caseId: 'k5', converged: true, passes: 2, mismatches: [], notRecomputed: [], skippedOverrides: [],
  values: {},
  sheets: { 'A138-12': { code: 'A138-12', hiddenSymbols: [], compliance: [{ code: 'A138-REQ-15', titleDe: 'q', severity: 'block', result: { kind: 'pass' } }],
    equations: [{ equationId: 'e', equationNumber: '7', outputSymbol: 'A_S_m', state: { kind: 'manual_required', reason: 'fehlt A_S_min', missing: ['A_S_min'] } }] } },
  iterations: [{ key: 'A138-17:Gl16', kind: 'gl16', worksheetCode: 'A138-17', equationLabel: 'Gl. 16', outputSymbol: 'A_S_m', unit: 'm²', returnPeriod: 5, scalars: {}, perDuration: [{ D: 180, r_D: 30.6, value: 48.58 }], governingD: 180, r_D_at_governing: 30.6, governingValue: 48.58, boundaryLimited: false, floorAtZero: false }],
};

beforeEach(() => { for (const f of Object.values(actions)) f.mockReset(); });

describe('scenario MCP tools', () => {
  it('registers the five tools; reads are marked read-only', () => {
    expect([...tools.keys()].sort()).toEqual(['archive_scenario', 'create_scenario', 'get_scenario_results', 'list_scenarios', 'set_scenario_overrides']);
    expect(tools.get('list_scenarios')!.cfg.annotations?.readOnlyHint).toBe(true);
    expect(tools.get('get_scenario_results')!.cfg.annotations?.readOnlyHint).toBe(true);
  });
  it('create_scenario creates and then sets the overrides', async () => {
    actions.createScenario.mockResolvedValue({ ok: true, scenario: { id: 's1', overrides: [] } });
    actions.setScenarioOverrides.mockResolvedValue({ ok: true, scenario: { id: 's1', overrides: [{ symbol: 'k_f' }] } });
    const res = await call('create_scenario', { projectId: '00000000-0000-4000-8000-000000000001', name: 'K5', overrides: [{ fieldId: '00000000-0000-4000-8000-000000000002', value: '1e-5', note: 'Feldversuch' }] });
    expect(res.isError).toBeUndefined();
    expect(actions.setScenarioOverrides).toHaveBeenCalledWith('s1', [{ fieldId: '00000000-0000-4000-8000-000000000002', value: '1e-5', note: 'Feldversuch' }]);
  });
  it('a refused override comes back as an MCP error the model acts on', async () => {
    actions.setScenarioOverrides.mockResolvedValue({ ok: false, error: 'k_i (k_i) wird berechnet (Gleichungsergebnis)' });
    const res = await call('set_scenario_overrides', { scenarioId: '00000000-0000-4000-8000-000000000003', overrides: [{ fieldId: '00000000-0000-4000-8000-000000000004', value: 1, note: 'x' }] });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/wird berechnet/);
  });
  it('get_scenario_results is compact by default and can include the per-D rows', async () => {
    actions.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', real: RUN, cases: [], ignoredScenarioIds: [] });
    const res = await call('get_scenario_results', { projectId: '00000000-0000-4000-8000-000000000001', standardCode: 'DWA-A-138-1' });
    const body = JSON.parse(res.content[0].text);
    expect(body.real.iterations[0]).toEqual({ key: 'A138-17:Gl16', governingD: 180, governingValue: 48.58, boundaryLimited: false });
    expect(body.real.sheets['A138-12'].results[0]).toEqual({ equation: 'Gl. 7', output: 'A_S_m', value: null, note: 'fehlt A_S_min' });
    expect(body.real.sheets['A138-12'].compliance).toEqual([{ code: 'A138-REQ-15', verdict: 'pass' }]);
    expect(compactRun(RUN, true).iterations[0].perDuration).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit src/lib/mcp/__tests__/scenario-tools.test.ts`
Expected: FAIL — cannot resolve `../tools/scenarios`.

- [ ] **Step 3: Implement**

```ts
// src/lib/scenarios/compact.ts
import type { ScenarioRun } from './types';

/** A model-sized view of a run: one value or reason per equation, one verdict per gate, governing points per iteration. */
export function compactRun(run: ScenarioRun, includePerDuration: boolean) {
  return {
    caseId: run.caseId,
    converged: run.converged,
    mismatches: run.mismatches,
    notRecomputed: run.notRecomputed,
    skippedOverrides: run.skippedOverrides,
    sheets: Object.fromEntries(Object.entries(run.sheets).map(([code, s]) => [code, {
      hidden: s.hiddenSymbols,
      results: s.equations.map((e) => ({
        equation: `Gl. ${e.equationNumber}`,
        output: e.outputSymbol,
        value: e.state.kind === 'computed' ? e.state.value : null,
        note: e.state.kind === 'computed' ? (e.state.warnings?.join(' ') ?? null) : e.state.kind === 'error' ? e.state.message : e.state.reason,
      })),
      compliance: s.compliance.map((c) => ({ code: c.code, verdict: c.result.kind })),
    }])),
    iterations: run.iterations.map((it) => ({
      key: it.key, governingD: it.governingD, governingValue: it.governingValue, boundaryLimited: it.boundaryLimited,
      ...(includePerDuration ? { perDuration: it.perDuration } : {}),
    })),
  };
}
```

```ts
// src/lib/mcp/tools/scenarios.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { defineTool, unwrap } from '../define-tool';
import {
  listScenarios, createScenario, setScenarioOverrides, archiveScenario, getScenarioResults,
} from '@/lib/actions/scenarios';
import { compactRun } from '@/lib/scenarios/compact';

const overrideSchema = z.object({
  fieldId: z.string().uuid().describe('Eingabefeld aus get_worksheet (keine berechneten Felder)'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Fallwert in der Einheit des Feldes'),
  note: z.string().min(1).describe('Herkunft der Annahme, z. B. „Feldversuch ausstehend, Tabellenwert"'),
});

export function registerScenarioTools(server: McpServer) {
  defineTool(server, 'list_scenarios', {
    title: 'Fälle auflisten', readOnly: true,
    description: 'Listet die Was-wäre-wenn-Fälle eines Projekts (höchstens 6 aktive) mit ihren geänderten Eingabewerten, dem Realwert und einer Drift-Warnung, wenn sich der Realwert seit dem Anlegen geändert hat. Fälle sind Annahmen, nie Teil des Nachweises.',
    inputSchema: z.object({ projectId: z.string().uuid(), includeArchived: z.boolean().optional() }),
  }, async ({ projectId, includeArchived }) => unwrap(await listScenarios(projectId, { includeArchived })));

  defineTool(server, 'create_scenario', {
    title: 'Fall anlegen',
    description: 'Legt einen Was-wäre-wenn-Fall an (z. B. „K5 – Feldversuch k_f 1e-5") und setzt optional sofort Eingabewerte. Nur Eingabefelder sind erlaubt; berechnete Werte (k_i, A_S,m, V_VA …) werden über ihre Eingaben verändert. Höchstens 6 aktive Fälle je Projekt.',
    inputSchema: z.object({
      projectId: z.string().uuid(), name: z.string().min(1), reason: z.string().optional(),
      overrides: z.array(overrideSchema).optional(),
    }),
  }, async ({ projectId, name, reason, overrides }) => {
    const created = unwrap(await createScenario({ projectId, name, reason: reason ?? null }));
    if (!overrides || overrides.length === 0) return created;
    return unwrap(await setScenarioOverrides(created.scenario.id, overrides));
  });

  defineTool(server, 'set_scenario_overrides', {
    title: 'Fallwerte setzen',
    description: 'Setzt oder ändert Eingabewerte eines Falls (alle oder keiner). Abgelehnt werden berechnete Felder, unzulässige Auswahlwerte, Werte außerhalb des Feldbereichs und fehlende Notizen — die Fehlermeldung nennt den Grund.',
    inputSchema: z.object({ scenarioId: z.string().uuid(), overrides: z.array(overrideSchema).min(1) }),
  }, async ({ scenarioId, overrides }) => unwrap(await setScenarioOverrides(scenarioId, overrides)));

  defineTool(server, 'archive_scenario', {
    title: 'Fall archivieren',
    description: 'Archiviert einen Fall (kein Löschen). Danach ist sein Farbplatz für einen neuen Fall frei.',
    inputSchema: z.object({ scenarioId: z.string().uuid() }),
  }, async ({ scenarioId }) => unwrap(await archiveScenario(scenarioId)));

  defineTool(server, 'get_scenario_results', {
    title: 'Fallergebnisse berechnen', readOnly: true,
    description: 'Rechnet Real und die aktiven Fälle einer Norm im Speicher durch (nichts wird gespeichert, Freigaben und Nachweis bleiben unberührt) und liefert je Arbeitsblatt Ergebnis oder „nicht berechnet: Grund", Prüfergebnis je Anforderung und die maßgebende Dauerstufe je Iteration (Gl. 8, Gl. 10 bei T = 30/100 a, Gl. 16).',
    inputSchema: z.object({
      projectId: z.string().uuid(), standardCode: z.string().min(1),
      scenarioIds: z.array(z.string().uuid()).optional(), includePerDuration: z.boolean().optional(),
    }),
  }, async ({ projectId, standardCode, scenarioIds, includePerDuration }) => {
    const r = unwrap(await getScenarioResults(projectId, standardCode, scenarioIds));
    const per = includePerDuration === true;
    return {
      available: r.available, standardCode: r.standardCode, ignoredScenarioIds: r.ignoredScenarioIds,
      real: r.real ? compactRun(r.real, per) : null,
      cases: r.cases.map((c) => ({ id: c.scenario.id, name: c.scenario.name, slot: c.scenario.slot, ...compactRun(c.run, per) })),
    };
  });
}
```

In `src/app/api/mcp/route.ts` add `import { registerScenarioTools } from '@/lib/mcp/tools/scenarios';` and `registerScenarioTools(server);` after `registerResultTools(server);`.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm vitest run --project unit src/lib/mcp/__tests__/scenario-tools.test.ts` → PASS. `pnpm typecheck` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scenarios/compact.ts src/lib/mcp/tools/scenarios.ts src/lib/mcp/__tests__/scenario-tools.test.ts src/app/api/mcp/route.ts
git commit -m "feat(mcp): list/create/set/archive scenarios + get_scenario_results

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Project tab „Fälle" + cases panel + setting „Fälle aktiv"

**Files:**
- Modify: `src/components/projects/project-tabs.tsx` (4th parameter + prop)
- Modify: `src/app/[locale]/(app)/projects/[id]/(overview)/layout.tsx` (pass `showScenarios`)
- Modify: `src/lib/i18n/messages/de.json`, `src/lib/i18n/messages/en.json` (`projects.tabs.scenarios`)
- Create: `src/app/[locale]/(app)/projects/[id]/(overview)/scenarios/page.tsx`
- Create: `src/components/scenarios/scenarios-panel.tsx`
- Test: `src/components/projects/__tests__/project-tabs-scenarios.test.ts`, `src/components/scenarios/__tests__/scenarios-panel.test.tsx`

**Interfaces:**
- Consumes: Task 9 actions (`listScenarios`, `createScenario`, `duplicateScenario`, `updateScenario`, `archiveScenario`, `setScenarioOverrides`, `removeScenarioOverride`, `setScenariosEnabled`, `searchOverridableFields`); `formatScenarioValue`; `SCENARIOS_UNAVAILABLE`; `MAX_ACTIVE_SCENARIOS`.
- Produces: `buildProjectTabs(base, t, isVsme, opts?: { scenarios?: boolean }): Tab[]`; `ProjectTabs({ locale, projectId, isVsme?, showScenarios? })`; `ScenariosPanel({ locale, projectId, initial: { available: boolean; enabled: boolean; scenarios: ScenarioSummary[] }, error?: string | null })`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/projects/__tests__/project-tabs-scenarios.test.ts
import { describe, it, expect } from 'vitest';
import { buildProjectTabs } from '../project-tabs';
const t = (k: string) => k;
describe('Fälle tab', () => {
  it('is absent by default (existing callers unchanged) and present when asked, before the report history', () => {
    expect(buildProjectTabs('/de/projects/X', t, false).some((x) => x.href.endsWith('/scenarios'))).toBe(false);
    const tabs = buildProjectTabs('/de/projects/X', t, false, { scenarios: true });
    const i = tabs.findIndex((x) => x.href === '/de/projects/X/scenarios');
    expect(tabs[i].label).toBe('projects.tabs.scenarios');
    expect(tabs[i + 1].href).toBe('/de/projects/X/reports');
  });
});
```

```tsx
// src/components/scenarios/__tests__/scenarios-panel.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ScenarioSummary } from '@/lib/scenarios/types';

const a = vi.hoisted(() => ({
  listScenarios: vi.fn(), createScenario: vi.fn(), duplicateScenario: vi.fn(), updateScenario: vi.fn(), archiveScenario: vi.fn(),
  setScenarioOverrides: vi.fn(), removeScenarioOverride: vi.fn(), setScenariosEnabled: vi.fn(), searchOverridableFields: vi.fn(),
}));
vi.mock('@/lib/actions/scenarios', () => a);
import { ScenariosPanel } from '../scenarios-panel';

const sc = (over: Partial<ScenarioSummary>): ScenarioSummary => ({
  id: 's1', name: 'K5', reason: 'Feldversuch', slot: 3, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z',
  overrides: [{ fieldId: 'f1', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: 'Permeability', unit: 'm/s', dataType: 'number', worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1',
    value: { type: 'number', value: 1e-5 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, currentReal: { type: 'number', value: 2e-6 }, drift: true, note: 'n' }],
  ...over,
});
beforeEach(() => {
  for (const f of Object.values(a)) f.mockReset();
  a.listScenarios.mockResolvedValue({ ok: true, available: true, enabled: true, scenarios: [sc({})] });
});

describe('ScenariosPanel', () => {
  it('says so when the tables are not set up', () => {
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: false, enabled: false, scenarios: [] }} />);
    expect(screen.getByText(/nicht eingerichtet/)).toBeTruthy();
  });
  it('switching „Fälle aktiv" on calls the setting action', async () => {
    a.setScenariosEnabled.mockResolvedValue({ ok: true });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: false, scenarios: [] }} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Fälle aktiv/ }));
    await waitFor(() => expect(a.setScenariosEnabled).toHaveBeenCalledWith('p', true));
  });
  it('lists a case with its colour slot and the drift warning', () => {
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({})] }} />);
    expect(screen.getByTestId('scenario-swatch-s1').getAttribute('style')).toContain('var(--scn-3)');
    expect(screen.getByText('Realwert geändert: 1·10⁻⁶ → 2·10⁻⁶')).toBeTruthy();
  });
  it('disables „Neuer Fall" at 6 active cases', () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => sc({ id: `s${n}`, slot: n, overrides: [] }));
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: six }} />);
    expect((screen.getByRole('button', { name: 'Neuer Fall' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Höchstens 6 aktive Fälle/)).toBeTruthy();
  });
  it('creates a case with name and reason', async () => {
    a.createScenario.mockResolvedValue({ ok: true, scenario: sc({ id: 's9', name: 'K6' }) });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [] }} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'K6' } });
    fireEvent.change(screen.getByLabelText('Grund'), { target: { value: 'Feldversuch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Fall' }));
    await waitFor(() => expect(a.createScenario).toHaveBeenCalledWith({ projectId: 'p', name: 'K6', reason: 'Feldversuch' }));
  });
  it('adds an override: search, pick (real value shown), value + required note', async () => {
    a.searchOverridableFields.mockResolvedValue({ ok: true, fields: [{ fieldId: 'f9', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: null, unit: 'm/s', dataType: 'number', enumValues: null, worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1', realValue: { type: 'number', value: 1e-6 } }] });
    a.setScenarioOverrides.mockResolvedValue({ ok: true, scenario: sc({}) });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({ overrides: [] })] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wert ändern' }));
    fireEvent.change(screen.getByLabelText('Feld suchen (Bezeichnung oder Symbol)'), { target: { value: 'k_f' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    fireEvent.click(await screen.findByRole('button', { name: /Durchlässigkeit \(k_f\)/ }));
    expect(screen.getByText(/Realwert: 1·10⁻⁶ m\/s/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Fallwert'), { target: { value: '1e-5' } });
    const save = screen.getByRole('button', { name: 'Übernehmen' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Notiz (Herkunft der Annahme)'), { target: { value: 'Feldversuch' } });
    fireEvent.click(save);
    await waitFor(() => expect(a.setScenarioOverrides).toHaveBeenCalledWith('s1', [{ fieldId: 'f9', value: '1e-5', note: 'Feldversuch' }]));
  });
  it('shows a refused override reason', async () => {
    a.searchOverridableFields.mockResolvedValue({ ok: true, fields: [{ fieldId: 'f9', symbol: 'k_f', labelDe: 'Durchlässigkeit', labelEn: null, unit: null, dataType: 'number', enumValues: null, worksheetCode: 'A138-05', standardCode: 'S', realValue: null }] });
    a.setScenarioOverrides.mockResolvedValue({ ok: false, error: 'Durchlässigkeit (k_f): 5 liegt über dem zulässigen Maximum 1.' });
    render(<ScenariosPanel locale="de" projectId="p" initial={{ available: true, enabled: true, scenarios: [sc({ overrides: [] })] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wert ändern' }));
    fireEvent.change(screen.getByLabelText('Feld suchen (Bezeichnung oder Symbol)'), { target: { value: 'k_f' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    fireEvent.click(await screen.findByRole('button', { name: /Durchlässigkeit \(k_f\)/ }));
    fireEvent.change(screen.getByLabelText('Fallwert'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Notiz (Herkunft der Annahme)'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('zulässigen Maximum');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/components/projects/__tests__/project-tabs-scenarios.test.ts src/components/scenarios/__tests__/scenarios-panel.test.tsx`
Expected: FAIL (no 4th parameter / module missing).

- [ ] **Step 3: Implement the tab**

In `project-tabs.tsx`: add `Layers` to the lucide import; change the builder and the component:

```ts
export function buildProjectTabs(
  base: string,
  t: (k: string) => string,
  isVsme: boolean,
  opts: { scenarios?: boolean } = {},
): Tab[] {
  const base_tabs: Tab[] = [
    { href: base, label: t('projects.tabs.overview'), icon: FolderKanban, matchExact: true },
  ];
  if (isVsme) {
    base_tabs.push(
      { href: `${base}/vsme/worklist`, label: t('vsme.tabs.worklist'), icon: ClipboardList },
      { href: `${base}/vsme/emissions`, label: t('vsme.tabs.emissions'), icon: Wind },
    );
  }
  base_tabs.push({ href: `${base}/documents`, label: t('projects.tabs.documents'), icon: FileText });
  if (opts.scenarios) base_tabs.push({ href: `${base}/scenarios`, label: t('projects.tabs.scenarios'), icon: Layers });
  base_tabs.push({ href: `${base}/reports`, label: t('projects.tabs.reports'), icon: History });
  return base_tabs;
}
```

`ProjectTabs` gets `showScenarios = false` in its props and calls `buildProjectTabs(base, t, isVsme, { scenarios: showScenarios })`. In the overview layout: `<ProjectTabs locale={localeTyped} projectId={id} isVsme={isVsme} showScenarios />`. In `de.json` under `projects.tabs` add `"scenarios": "Fälle"`; in `en.json` `"scenarios": "Cases"`.

- [ ] **Step 4: Implement the page and the panel**

```tsx
// src/app/[locale]/(app)/projects/[id]/(overview)/scenarios/page.tsx
import { listScenarios } from '@/lib/actions/scenarios';
import { ScenariosPanel } from '@/components/scenarios/scenarios-panel';

export default async function ScenariosPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const loc = locale === 'en' ? 'en' : 'de';
  const res = await listScenarios(id);
  return (
    <ScenariosPanel
      locale={loc}
      projectId={id}
      initial={res.ok ? { available: res.available, enabled: res.enabled, scenarios: res.scenarios } : { available: true, enabled: false, scenarios: [] }}
      error={res.ok ? null : res.error}
    />
  );
}
```

```tsx
// src/components/scenarios/scenarios-panel.tsx
'use client';
/**
 * Project tab „Fälle" (spec §4.1): list, „Neuer Fall", duplicate, archive, report flag, overrides with the real value
 * beside the input and a required note, drift warnings, the project setting „Fälle aktiv".
 */
import { useState } from 'react';
import {
  listScenarios, createScenario, duplicateScenario, updateScenario, archiveScenario, setScenarioOverrides,
  removeScenarioOverride, setScenariosEnabled, searchOverridableFields,
} from '@/lib/actions/scenarios';
import { MAX_ACTIVE_SCENARIOS, type OverridableFieldHit, type ScenarioSummary } from '@/lib/scenarios/types';
import { formatScenarioValue } from '@/lib/scenarios/values';
import { SCENARIOS_UNAVAILABLE } from '@/lib/scenarios/missing-table';

const L = {
  de: {
    title: 'Fälle (Annahmen, nicht nachgewiesen)', enabled: 'Fälle aktiv', name: 'Name', reason: 'Grund', create: 'Neuer Fall',
    limit: `Höchstens ${MAX_ACTIVE_SCENARIOS} aktive Fälle — zuerst einen Fall archivieren.`, duplicate: 'Fall duplizieren', archive: 'Archivieren',
    report: 'im Bericht anzeigen', overrides: (n: number) => `${n} geänderte ${n === 1 ? 'Eingabe' : 'Eingaben'}`,
    drift: 'Realwert geändert', edit: 'Wert ändern', search: 'Feld suchen (Bezeichnung oder Symbol)', searchBtn: 'Suchen',
    real: 'Realwert', value: 'Fallwert', note: 'Notiz (Herkunft der Annahme)', apply: 'Übernehmen', remove: 'Entfernen',
    hint: 'Ein Fall ändert nur Eingabewerte. Er wird nie freigegeben und ändert weder Nachweis noch Freigaben.',
  },
  en: {
    title: 'Cases (assumptions, not verified)', enabled: 'Cases active', name: 'Name', reason: 'Reason', create: 'New case',
    limit: `At most ${MAX_ACTIVE_SCENARIOS} active cases — archive one first.`, duplicate: 'Duplicate case', archive: 'Archive',
    report: 'show in report', overrides: (n: number) => `${n} changed ${n === 1 ? 'input' : 'inputs'}`,
    drift: 'Real value changed', edit: 'Change value', search: 'Search field (label or symbol)', searchBtn: 'Search',
    real: 'Real value', value: 'Case value', note: 'Note (origin of the assumption)', apply: 'Apply', remove: 'Remove',
    hint: 'A case only changes input values. It is never approved and changes neither the verification nor approvals.',
  },
} as const;

type Initial = { available: boolean; enabled: boolean; scenarios: ScenarioSummary[] };

export function ScenariosPanel({ locale, projectId, initial, error = null }: { locale: 'de' | 'en'; projectId: string; initial: Initial; error?: string | null }) {
  const t = L[locale];
  const [state, setState] = useState<Initial>(initial);
  const [msg, setMsg] = useState<string | null>(error);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const reload = async () => {
    const r = await listScenarios(projectId);
    if (r.ok) setState({ available: r.available, enabled: r.enabled, scenarios: r.scenarios });
    else setMsg(r.error);
  };
  const run = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok) { setMsg(r.error ?? 'Fehler'); return false; }
    setMsg(null);
    await reload();
    return true;
  };

  if (!state.available) return <p className="text-sm text-subtext" role="status">{SCENARIOS_UNAVAILABLE[locale]}</p>;
  const atLimit = state.scenarios.length >= MAX_ACTIVE_SCENARIOS;

  return (
    <section className="space-y-6 max-w-4xl" data-testid="scenarios-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-ink">{t.title}</h2>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.enabled} onChange={(e) => void run(setScenariosEnabled(projectId, e.target.checked))} />
          {t.enabled}
        </label>
      </header>
      <p className="text-xs text-subtext">{t.hint}</p>
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      {state.enabled && (
        <>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await createScenario({ projectId, name, reason: reason || null });
              if (!r.ok) { setMsg(r.error); return; }
              setName(''); setReason(''); setMsg(null); setEditing(r.scenario.id);
              await reload();
            }}
          >
            <label className="text-sm flex flex-col">{t.name}<input aria-label={t.name} value={name} onChange={(e) => setName(e.target.value)} className="border border-hairline rounded px-2 py-1" /></label>
            <label className="text-sm flex flex-col">{t.reason}<input aria-label={t.reason} value={reason} onChange={(e) => setReason(e.target.value)} className="border border-hairline rounded px-2 py-1" /></label>
            <button type="submit" disabled={atLimit || !name.trim()} className="rounded-full border border-hairline px-3 py-1 text-sm">{t.create}</button>
            {atLimit && <span className="text-xs text-subtext">{t.limit}</span>}
          </form>
          <ul className="space-y-3">
            {state.scenarios.map((s) => (
              <li key={s.id} className="rounded-xl border border-hairline bg-paper p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span data-testid={`scenario-swatch-${s.id}`} aria-hidden className="inline-block w-5 h-1 rounded" style={{ background: `var(--scn-${s.slot})` }} />
                  <strong className="text-ink">{s.name}</strong>
                  {s.reason && <span className="text-sm text-subtext">— {s.reason}</span>}
                  <span className="text-xs text-subtext">{t.overrides(s.overrides.length)}</span>
                  <label className="ml-auto inline-flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={s.includeInReport} onChange={(e) => void run(updateScenario(s.id, { includeInReport: e.target.checked }))} />
                    {t.report}
                  </label>
                  <button type="button" className="text-xs underline" disabled={atLimit} onClick={() => void run(duplicateScenario(s.id))}>{t.duplicate}</button>
                  <button type="button" className="text-xs underline" onClick={() => void run(archiveScenario(s.id))}>{t.archive}</button>
                  <button type="button" className="text-xs underline" onClick={() => setEditing(editing === s.id ? null : s.id)}>{t.edit}</button>
                </div>
                <ul className="text-sm space-y-1">
                  {s.overrides.map((o) => (
                    <li key={o.fieldId} className="flex flex-wrap gap-2">
                      <span className="text-subtext">{o.worksheetCode}</span>
                      <span>{(locale === 'en' ? o.labelEn ?? o.labelDe : o.labelDe)} ({o.symbol})</span>
                      <span>= {formatScenarioValue(o.value, locale)}{o.unit ? ` ${o.unit}` : ''}</span>
                      <span className="text-subtext">({t.real} {formatScenarioValue(o.currentReal, locale)})</span>
                      {o.drift && <span className="text-amber-700">{`${t.drift}: ${formatScenarioValue(o.baseValueAtCreation, locale)} → ${formatScenarioValue(o.currentReal, locale)}`}</span>}
                      <span className="text-xs text-subtext">„{o.note}"</span>
                      <button type="button" className="text-xs underline" onClick={() => void run(removeScenarioOverride(s.id, o.fieldId))}>{t.remove}</button>
                    </li>
                  ))}
                </ul>
                {editing === s.id && <OverrideEditor locale={locale} projectId={projectId} scenarioId={s.id} onDone={reload} onError={setMsg} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function OverrideEditor({ locale, projectId, scenarioId, onDone, onError }: {
  locale: 'de' | 'en'; projectId: string; scenarioId: string; onDone: () => Promise<void>; onError: (m: string | null) => void;
}) {
  const t = L[locale];
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<OverridableFieldHit[]>([]);
  const [pick, setPick] = useState<OverridableFieldHit | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="rounded-lg bg-paper-2/60 p-3 space-y-2">
      <div className="flex gap-2 items-end">
        <label className="text-sm flex flex-col grow">{t.search}
          <input aria-label={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="border border-hairline rounded px-2 py-1" />
        </label>
        <button type="button" className="rounded-full border border-hairline px-3 py-1 text-sm"
          onClick={async () => { const r = await searchOverridableFields(projectId, q); if (r.ok) setHits(r.fields); else onError(r.error); }}>
          {t.searchBtn}
        </button>
      </div>
      {!pick && (
        <ul className="text-sm">
          {hits.map((h) => (
            <li key={h.fieldId}>
              <button type="button" className="underline" onClick={() => { setPick(h); setValue(''); }}>
                {(locale === 'en' ? h.labelEn ?? h.labelDe : h.labelDe)} ({h.symbol}) · {h.worksheetCode}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pick && (
        <div className="space-y-2">
          <p className="text-sm">{(locale === 'en' ? pick.labelEn ?? pick.labelDe : pick.labelDe)} ({pick.symbol}) — {t.real}: {formatScenarioValue(pick.realValue, locale)}{pick.unit ? ` ${pick.unit}` : ''}</p>
          {pick.dataType === 'enum' && pick.enumValues ? (
            <select aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1">
              <option value="">—</option>
              {pick.enumValues.map((o) => <option key={o.value} value={o.value}>{(locale === 'en' ? o.label_en : o.label_de) ?? o.value}</option>)}
            </select>
          ) : pick.dataType === 'boolean' ? (
            <select aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1">
              <option value="">—</option><option value="true">{locale === 'en' ? 'Yes' : 'Ja'}</option><option value="false">{locale === 'en' ? 'No' : 'Nein'}</option>
            </select>
          ) : (
            <input aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1" />
          )}
          <input aria-label={t.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} className="border border-hairline rounded px-2 py-1 w-full" />
          <button type="button" disabled={!value || !note.trim()} className="rounded-full border border-hairline px-3 py-1 text-sm"
            onClick={async () => {
              const r = await setScenarioOverrides(scenarioId, [{ fieldId: pick.fieldId, value, note }]);
              if (!r.ok) { onError(r.error); return; }
              onError(null); setPick(null); setValue(''); setNote(''); setHits([]); setQ('');
              await onDone();
            }}>
            {t.apply}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests + i18n + typecheck**

Run: `pnpm vitest run --project unit src/components/projects/__tests__ src/components/scenarios/__tests__/scenarios-panel.test.tsx` → PASS (incl. the untouched `vsme-tabs.test.ts`).
Run: `pnpm i18n:check` → `✓ i18n coverage OK`. `pnpm typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/projects/project-tabs.tsx "src/app/[locale]/(app)/projects/[id]/(overview)/layout.tsx" "src/app/[locale]/(app)/projects/[id]/(overview)/scenarios/page.tsx" src/components/scenarios/scenarios-panel.tsx src/components/projects/__tests__/project-tabs-scenarios.test.ts src/components/scenarios/__tests__/scenarios-panel.test.tsx src/lib/i18n/messages/de.json src/lib/i18n/messages/en.json
git commit -m "feat(scenarios): project tab Fälle — cases, overrides with real value + note, drift, Fälle aktiv

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Iteration chart (SVG, dataviz rules)

**Files:**
- Modify: `src/app/globals.css` (series tokens)
- Create: `src/components/scenarios/chart-geometry.ts`
- Create: `src/components/scenarios/scenario-iteration-chart.tsx`
- Test: `src/components/scenarios/__tests__/chart-geometry.test.ts`, `src/components/scenarios/__tests__/scenario-iteration-chart.test.tsx`

**Interfaces:**
- Consumes: `fmtNum` (Task 2).
- Produces:
  - `CHART = { W: 720, H: 320, M: { l: 56, r: 16, t: 16, b: 44 } }`, `X_TICKS`, `xScale(dMin, dMax): (d: number) => number`, `yDomain(values: number[]): [number, number]`, `yScale(domain): (v: number) => number`, `yTicks(domain): number[]`, `labelDuration(d: number, locale): string`, `nearestIndex(ds: readonly number[], x: number, sx: (d: number) => number): number`, `seriesColor(slot: number): string`
  - `type ChartSeries = { id: string; label: string; slot: number; dashed: boolean; points: Array<{ D: number; r_D: number; value: number }>; governingIndex: number | null; boundaryLimited: boolean }`
  - `ScenarioIterationChart({ locale, title, unit, series }: { locale: 'de' | 'en'; title: string; unit: string; series: ChartSeries[] })`

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/scenarios/__tests__/chart-geometry.test.ts
import { describe, it, expect } from 'vitest';
import { CHART, xScale, yDomain, yTicks, labelDuration, nearestIndex, seriesColor } from '../chart-geometry';

describe('chart geometry', () => {
  it('log x from 5 min to 7 d spans the plot', () => {
    const sx = xScale(5, 10080);
    expect(sx(5)).toBe(CHART.M.l);
    expect(sx(10080)).toBeCloseTo(CHART.W - CHART.M.r, 9);
    expect(sx(Math.sqrt(5 * 10080))).toBeCloseTo((CHART.M.l + CHART.W - CHART.M.r) / 2, 9);
  });
  it('y domain starts at 0, includes negatives, pads the top by 8 %', () => {
    expect(yDomain([10, 100])).toEqual([0, 108]);
    expect(yDomain([-5, 50])).toEqual([-5, 54]);
    expect(yDomain([])).toEqual([0, 1]);
  });
  it('nice ticks', () => {
    expect(yTicks([0, 108])).toEqual([0, 20, 40, 60, 80, 100]);
    expect(yTicks([0, 0.03])).toEqual([0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03]);
  });
  it('duration labels DE/EN', () => {
    expect(labelDuration(5, 'de')).toBe('5 min');
    expect(labelDuration(180, 'de')).toBe('3 h');
    expect(labelDuration(4320, 'en')).toBe('3 d');
  });
  it('nearest tabulated duration to a pointer x', () => {
    const ds = [5, 10, 180, 10080];
    const sx = xScale(5, 10080);
    expect(nearestIndex(ds, sx(170), sx)).toBe(2);
  });
  it('Real is ink, cases keep their slot colour', () => {
    expect(seriesColor(0)).toBe('var(--scn-real)');
    expect(seriesColor(4)).toBe('var(--scn-4)');
  });
});
```

```tsx
// src/components/scenarios/__tests__/scenario-iteration-chart.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioIterationChart } from '../scenario-iteration-chart';
import type { ChartSeries } from '../chart-geometry';
import { xScale } from '../chart-geometry';

const pts = (vals: number[]) => [5, 180, 10080].map((D, i) => ({ D, r_D: 10, value: vals[i] }));
const S: ChartSeries[] = [
  { id: 'real:T30', label: 'Real · T = 30 a', slot: 0, dashed: false, points: pts([1, 5, 9]), governingIndex: 2, boundaryLimited: true },
  { id: 'k5:T100', label: 'K5 · T = 100 a', slot: 2, dashed: true, points: pts([2, 8, 3]), governingIndex: 1, boundaryLimited: false },
];

describe('ScenarioIterationChart', () => {
  it('draws one path per series, dashed for T = 100 a, coloured by slot', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke')).toBe('var(--scn-real)');
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke-dasharray')).toBeNull();
    expect(screen.getByTestId('series-k5:T100').getAttribute('stroke')).toBe('var(--scn-2)');
    expect(screen.getByTestId('series-k5:T100').getAttribute('stroke-dasharray')).toBe('7 5');
  });
  it('marks every peak and flags a boundary-limited one', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    expect(screen.getByTestId('peak-real:T30')).toBeTruthy();
    expect(screen.getByTestId('peak-k5:T100')).toBeTruthy();
    expect(screen.getByTestId('boundary-real:T30').textContent).toMatch(/kein eindeutiges Maximum/);
    expect(screen.queryByTestId('boundary-k5:T100')).toBeNull();
  });
  it('has a legend that hides and shows a series without repainting the others', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    fireEvent.click(screen.getByTestId('legend-k5:T100'));
    expect(screen.queryByTestId('series-k5:T100')).toBeNull();
    expect(screen.getByTestId('series-real:T30').getAttribute('stroke')).toBe('var(--scn-real)');
  });
  it('crosshair tooltip lists every visible case at the hovered duration', () => {
    render(<ScenarioIterationChart locale="de" title="Gl. 10" unit="m³" series={S} />);
    fireEvent.mouseMove(screen.getByTestId('chart-hit'), { clientX: xScale(5, 10080)(180) });
    const tip = screen.getByTestId('chart-tooltip');
    expect(tip.textContent).toContain('D = 180 min');
    expect(tip.textContent).toContain('Real · T = 30 a: 5 m³');
    expect(tip.textContent).toContain('K5 · T = 100 a: 8 m³');
    fireEvent.keyDown(screen.getByTestId('chart-hit'), { key: 'ArrowRight' });
    expect(screen.getByTestId('chart-tooltip').textContent).toContain('D = 10080 min');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/components/scenarios/__tests__/chart-geometry.test.ts src/components/scenarios/__tests__/scenario-iteration-chart.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Tokens**

Append to `src/app/globals.css` (validated 2026-10-14 with the dataviz validator: light PASS, contrast WARN for slots 3–5 ⇒ direct labels + table view are mandatory; dark PASS):

```css
/* What-if case series (fixed categorical order; colour follows the case slot, never its rank). */
:root {
  --scn-real: var(--ink);
  --scn-1: #2a78d6; --scn-2: #eb6834; --scn-3: #1baf7a; --scn-4: #eda100; --scn-5: #e87ba4; --scn-6: #008300;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --scn-1: #3987e5; --scn-2: #d95926; --scn-3: #199e70; --scn-4: #c98500; --scn-5: #d55181; --scn-6: #008300;
  }
}
:root[data-theme="dark"] {
  --scn-1: #3987e5; --scn-2: #d95926; --scn-3: #199e70; --scn-4: #c98500; --scn-5: #d55181; --scn-6: #008300;
}
```

- [ ] **Step 4: Implement geometry + chart**

```ts
// src/components/scenarios/chart-geometry.ts
export const CHART = { W: 720, H: 320, M: { l: 56, r: 16, t: 16, b: 44 } } as const;
export const X_TICKS = [5, 10, 30, 60, 180, 360, 720, 1440, 4320, 10080] as const;

export type ChartSeries = {
  id: string; label: string; slot: number; dashed: boolean;
  points: Array<{ D: number; r_D: number; value: number }>;
  governingIndex: number | null; boundaryLimited: boolean;
};

export function xScale(dMin: number, dMax: number): (d: number) => number {
  const { W, M } = CHART;
  const lo = Math.log10(dMin); const hi = Math.log10(dMax);
  return (d) => (hi === lo ? (M.l + W - M.r) / 2 : M.l + ((Math.log10(d) - lo) / (hi - lo)) * (W - M.l - M.r));
}
export function yDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  const lo = Math.min(0, ...finite);
  const hi = Math.max(...finite);
  if (hi <= lo) return [lo, lo + 1];
  return [lo, Number((hi * 1.08).toPrecision(12))];
}
export function yScale([lo, hi]: [number, number]): (v: number) => number {
  const { H, M } = CHART;
  return (v) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
}
function niceStep(range: number): number {
  const raw = range / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
export function yTicks([lo, hi]: [number, number]): number[] {
  const step = niceStep(hi - lo);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}
export function labelDuration(d: number, _locale: 'de' | 'en'): string {
  if (d < 60) return `${d} min`;
  if (d < 1440) return `${Number((d / 60).toPrecision(4))} h`;
  return `${Number((d / 1440).toPrecision(4))} d`;
}
export function nearestIndex(ds: readonly number[], x: number, sx: (d: number) => number): number {
  let best = 0; let dist = Infinity;
  ds.forEach((d, i) => { const k = Math.abs(sx(d) - x); if (k < dist) { dist = k; best = i; } });
  return best;
}
export function seriesColor(slot: number): string {
  return slot === 0 ? 'var(--scn-real)' : `var(--scn-${slot})`;
}
```

```tsx
// src/components/scenarios/scenario-iteration-chart.tsx
'use client';
/**
 * Iteration chart (spec §4.3): every shown case over the rain duration D (log x 5 min … 7 d), one y-axis, peak marked,
 * „kein eindeutiges Maximum" when the governing D is the last tabulated one, crosshair tooltip with every visible case,
 * legend (also the filter), direct labels at the peaks (≤ 4 series), T = 100 a dashed.
 */
import { useMemo, useState } from 'react';
import { fmtNum } from '@/lib/scenarios/format';
import {
  CHART, X_TICKS, xScale, yDomain, yScale, yTicks, labelDuration, nearestIndex, seriesColor, type ChartSeries,
} from './chart-geometry';

const T = {
  de: { boundary: 'kein eindeutiges Maximum', duration: 'Regendauer D', aria: 'Ergebnis je Regendauer und Fall' },
  en: { boundary: 'no peak inside the table', duration: 'rain duration D', aria: 'Result per rain duration and case' },
} as const;

export function ScenarioIterationChart({ locale, title, unit, series }: { locale: 'de' | 'en'; title: string; unit: string; series: ChartSeries[] }) {
  const t = T[locale];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const visible = series.filter((s) => !hidden.has(s.id));
  const allD = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.D)))].sort((a, b) => a - b), [series]);
  const dMin = allD[0] ?? 5; const dMax = allD[allD.length - 1] ?? 10080;
  const sx = xScale(dMin, dMax);
  const domain = yDomain(visible.flatMap((s) => s.points.map((p) => p.value)));
  const sy = yScale(domain);
  const { W, H, M } = CHART;
  const direct = visible.length <= 4;

  const move = (clientX: number, el: Element) => {
    const svg = (el as SVGGraphicsElement).ownerSVGElement ?? el;
    const r = svg.getBoundingClientRect();
    const x = r.width > 0 ? ((clientX - r.left) / r.width) * W : clientX;
    setHover(nearestIndex(allD, x, sx));
  };
  const hoverD = hover != null ? allD[hover] : null;

  return (
    <figure className="space-y-2" data-testid="scenario-chart">
      <figcaption className="text-sm font-medium text-ink">{title}</figcaption>
      <ul className="flex flex-wrap gap-2" aria-label="Legende">
        {series.map((s) => (
          <li key={s.id}>
            <button type="button" data-testid={`legend-${s.id}`} aria-pressed={!hidden.has(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-xs ${hidden.has(s.id) ? 'opacity-40' : ''}`}
              onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}>
              <svg width="22" height="6" aria-hidden><line x1="0" x2="22" y1="3" y2="3" stroke={seriesColor(s.slot)} strokeWidth="3" strokeDasharray={s.dashed ? '7 5' : undefined} /></svg>
              <span className="text-ink">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title} — ${t.aria}`}>
          {yTicks(domain).map((v) => (
            <g key={`y${v}`}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="var(--hairline, #e5e5e5)" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--subtext, #666)">{fmtNum(v, locale)}</text>
            </g>
          ))}
          {X_TICKS.filter((d) => d >= dMin && d <= dMax).map((d) => (
            <g key={`x${d}`}>
              <line x1={sx(d)} x2={sx(d)} y1={M.t} y2={H - M.b} stroke="var(--hairline, #e5e5e5)" />
              <text x={sx(d)} y={H - M.b + 16} textAnchor="middle" fontSize="11" fill="var(--subtext, #666)">{labelDuration(d, locale)}</text>
            </g>
          ))}
          <text x={M.l} y={M.t - 4} fontSize="11" fill="var(--subtext, #666)">{unit}</text>
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--subtext, #666)">{t.duration}</text>
          {visible.map((s) => (
            <path key={s.id} data-testid={`series-${s.id}`} fill="none" stroke={seriesColor(s.slot)} strokeWidth="2"
              strokeDasharray={s.dashed ? '7 5' : undefined}
              d={s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.D).toFixed(1)},${sy(p.value).toFixed(1)}`).join('')} />
          ))}
          {visible.map((s) => {
            if (s.governingIndex == null || !s.points[s.governingIndex]) return null;
            const p = s.points[s.governingIndex];
            const cx = sx(p.D); const cy = sy(p.value);
            return (
              <g key={`pk-${s.id}`}>
                <circle data-testid={`peak-${s.id}`} cx={cx} cy={cy} r={5}
                  fill={s.boundaryLimited ? 'var(--paper, #fff)' : seriesColor(s.slot)} stroke={s.boundaryLimited ? seriesColor(s.slot) : 'var(--paper, #fff)'} strokeWidth={2} />
                {direct && <text x={Math.min(cx + 8, W - 140)} y={cy - 8} fontSize="11" fill="var(--ink)">{`${s.label}: ${fmtNum(p.value, locale)}`}</text>}
                {s.boundaryLimited && <text data-testid={`boundary-${s.id}`} x={Math.min(cx + 8, W - 140)} y={cy + 14} fontSize="10" fill="var(--subtext, #666)">{t.boundary}</text>}
              </g>
            );
          })}
          {hoverD != null && <line x1={sx(hoverD)} x2={sx(hoverD)} y1={M.t} y2={H - M.b} stroke="var(--subtext, #666)" strokeDasharray="3 3" />}
          <rect data-testid="chart-hit" x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" tabIndex={0}
            aria-label={t.aria}
            onMouseMove={(e) => move(e.clientX, e.currentTarget)}
            onMouseLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setHover((h) => Math.min(allD.length - 1, (h ?? -1) + 1));
              if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? allD.length) - 1));
            }} />
        </svg>
        {hoverD != null && (
          <div data-testid="chart-tooltip" role="status" className="absolute top-2 right-2 rounded-lg border border-hairline bg-paper px-3 py-2 text-xs shadow-soft">
            <div className="font-semibold text-ink">D = {hoverD} min</div>
            {visible.map((s) => {
              const p = s.points.find((x) => x.D === hoverD);
              return p ? <div key={s.id} className="text-ink">{`${s.label}: ${fmtNum(p.value, locale)} ${unit}`}</div> : null;
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run --project unit src/components/scenarios/__tests__/chart-geometry.test.ts src/components/scenarios/__tests__/scenario-iteration-chart.test.tsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/scenarios/chart-geometry.ts src/components/scenarios/scenario-iteration-chart.tsx src/components/scenarios/__tests__/chart-geometry.test.ts src/components/scenarios/__tests__/scenario-iteration-chart.test.tsx
git commit -m "feat(scenarios): iteration chart — log D axis, peaks, boundary marker, crosshair tooltip, legend filter

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Step-through with the substituted formula + per-D table

**Files:**
- Create: `src/lib/scenarios/step-text.ts`
- Create: `src/components/scenarios/scenario-step-through.tsx`
- Test: `src/lib/scenarios/__tests__/step-text.test.ts`, `src/components/scenarios/__tests__/scenario-step-through.test.tsx`

**Interfaces:**
- Consumes: `IterationSeries` (Task 2), `fmtNum`; test data from `gl8Series`/`gl10Series`/`gl16Series` + fixture `rows()` (Task 4).
- Produces: `stepLines(series: IterationSeries, index: number, locale: 'de' | 'en'): string[]`; `ScenarioStepThrough({ locale, options }: { locale: 'de' | 'en'; options: Array<{ id: string; label: string; series: IterationSeries }> })`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/scenarios/__tests__/step-text.test.ts
import { describe, it, expect } from 'vitest';
import { stepLines } from '../step-text';
import { gl8Series, gl10Series, gl16Series } from '../iteration-series';
import { rows } from '../__fixtures__/c4-a138-chain';

const K5_T30 = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 48.58, Q_S: 0.4858, Q_Dr: 0, V_VA: 14.57 }, 30);
describe('stepLines', () => {
  it('Gl. 10 at the governing D: Q_in and V_Rück with the numbers substituted (DE)', () => {
    const i = K5_T30.perDuration.findIndex((p) => p.D === 360);
    const l = stepLines(K5_T30, i, 'de').join('\n');
    expect(l).toContain('Schritt 12 von 22: D = 360 min, r_D(T = 30 a) = 27,5 l/(s·ha)');
    expect(l).toContain('= 27,5 · (602,161 + 48,58) / 10 000 = 1,78954 l/s');
    expect(l).toContain('(1,78954 − (0,4858 + 0)) · 360 · 60 / 1000 − 14,57 = 13,5907 m³');
    expect(l).toContain('Maßgebend: D = 360 min mit 13,5907 m³');
  });
  it('Gl. 10 negative values are floored with a note (EN)', () => {
    const l = stepLines(K5_T30, 0, 'en').join('\n');
    expect(l).toMatch(/→ negative, V_Rück = 0/);
  });
  it('Gl. 8 at D 10080 flags the boundary-limited maximum', () => {
    const s = gl8Series(rows(5), { A_C: 526.2105, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, 5);
    const l = stepLines(s, 21, 'de').join('\n');
    expect(l).toContain('= (1,7 · (526,211 + 50) · 10⁻⁴ − 0,0015 − 0) · 10080 · 60 · 1,2 · 1 · 10⁻³ = 70,0038 m³');
    expect(l).toContain('kein eindeutiges Maximum');
  });
  it('Gl. 16 K5 at D 180', () => {
    const s = gl16Series(rows(5), { A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, 5);
    const l = stepLines(s, 9, 'de').join('\n');
    expect(l).toContain('= 526,211 · 10⁻⁷ · 30,6 / (0,3 / (180 · 60 · 1,2) + 1·10⁻⁵) = 48,576 m²');
  });
});
```

```tsx
// src/components/scenarios/__tests__/scenario-step-through.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioStepThrough } from '../scenario-step-through';
import { gl10Series } from '@/lib/scenarios/iteration-series';
import { rows } from '@/lib/scenarios/__fixtures__/c4-a138-chain';

const real = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216 }, 30);
const k5 = gl10Series(rows(30), { AcS_paved: 602.161, A_VA: 48.58, Q_S: 0.4858, Q_Dr: 0, V_VA: 14.57 }, 30);
const OPTS = [{ id: 'real', label: 'Real · T = 30 a', series: real }, { id: 'k5', label: 'K5 · T = 30 a', series: k5 }];

describe('ScenarioStepThrough', () => {
  it('starts at the governing D, steps, jumps back, switches case', () => {
    render(<ScenarioStepThrough locale="de" options={OPTS} />);
    const cur = () => screen.getByRole('row', { current: true });
    expect(cur().textContent).toContain('10080');
    fireEvent.click(screen.getByRole('button', { name: /vorherige D/ }));
    expect(cur().textContent).toContain('8640');
    fireEvent.click(screen.getByRole('button', { name: 'zur maßgebenden D' }));
    expect(cur().textContent).toContain('10080');
    fireEvent.change(screen.getByLabelText('Fall'), { target: { value: 'k5' } });
    expect(cur().textContent).toContain('360');
    expect(screen.getByTestId('step-formula').textContent).toContain('13,5907 m³');
  });
  it('renders the full per-D table with the governing row bold', () => {
    render(<ScenarioStepThrough locale="de" options={OPTS} />);
    expect(screen.getAllByTestId(/^step-row-/)).toHaveLength(22);
    expect(screen.getByTestId('step-row-10080').getAttribute('data-governing')).toBe('true');
  });
  it('slider moves the current D', () => {
    render(<ScenarioStepThrough locale="en" options={OPTS} />);
    fireEvent.change(screen.getByLabelText('Duration step'), { target: { value: '0' } });
    expect(screen.getByRole('row', { current: true }).textContent).toContain('5');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/step-text.test.ts src/components/scenarios/__tests__/scenario-step-through.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/scenarios/step-text.ts
/** The printed formula with the numbers of one duration substituted (spec §4.4). Pure, DE/EN. */
import { fmtNum } from './format';
import type { IterationSeries } from './types';

export function stepLines(series: IterationSeries, index: number, locale: 'de' | 'en'): string[] {
  const p = series.perDuration[index];
  if (!p) return [];
  const f = (x: number) => fmtNum(x, locale);
  const s = series.scalars;
  const n = series.perDuration.length;
  const T = series.returnPeriod != null ? `T = ${series.returnPeriod} a` : 'n';
  const head = locale === 'en'
    ? `Step ${index + 1} of ${n}: D = ${p.D} min, r_D(${T}) = ${f(p.r_D)} l/(s·ha)`
    : `Schritt ${index + 1} von ${n}: D = ${p.D} min, r_D(${T}) = ${f(p.r_D)} l/(s·ha)`;
  const lines = [head];
  if (series.kind === 'gl8') {
    lines.push('V_VA(D) = (r_D(n) · (A_C + A_VA) · 10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³  (Gl. 8)');
    lines.push(`= (${f(p.r_D)} · (${f(s.A_C)} + ${f(s.A_VA)}) · 10⁻⁴ − ${f(s.Q_S)} − ${f(s.Q_Dr)}) · ${p.D} · 60 · ${f(s.f_Z)} · ${f(s.f_A)} · 10⁻³ = ${f(p.value)} m³`);
  } else if (series.kind === 'gl10') {
    const q = (p.r_D * (s.AcS_paved + s.A_VA)) / 10000;
    lines.push(`Q_in = r_D(T) · (Σ A_E,b,a·C_S + A_VA) / 10 000 = ${f(p.r_D)} · (${f(s.AcS_paved)} + ${f(s.A_VA)}) / 10 000 = ${f(q)} l/s`);
    const neg = p.value < 0 ? (locale === 'en' ? '  → negative, V_Rück = 0' : '  → negativ, V_Rück = 0') : '';
    lines.push(`V_Rück = (Q_in − (Q_S + Q_Dr)) · D · 60 / 1000 − V_VA  (Gl. 10)`);
    lines.push(`= (${f(q)} − (${f(s.Q_S)} + ${f(s.Q_Dr)})) · ${p.D} · 60 / 1000 − ${f(s.V_VA)} = ${f(p.value)} m³${neg}`);
  } else {
    lines.push('A_S,m(D) = A_C · 10⁻⁷ · r_D(n) / (h_M / (D · 60 · f_Z) + k_i)  (Gl. 16)');
    lines.push(`= ${f(s.A_C)} · 10⁻⁷ · ${f(p.r_D)} / (${f(s.h_M)} / (${p.D} · 60 · ${f(s.f_Z)}) + ${f(s.k_i)}) = ${f(p.value)} m²`);
  }
  if (series.governingD != null && series.governingValue != null) {
    const g = series.floorAtZero ? Math.max(0, series.governingValue) : series.governingValue;
    const edge = series.boundaryLimited
      ? (locale === 'en' ? ' — no peak inside the table (last tabulated duration)' : ' — kein eindeutiges Maximum (letzte Tabellendauer)')
      : '';
    lines.push(locale === 'en'
      ? `Governing: D = ${series.governingD} min with ${f(g)} ${series.unit}${edge}`
      : `Maßgebend: D = ${series.governingD} min mit ${f(g)} ${series.unit}${edge}`);
  }
  return lines;
}
```

```tsx
// src/components/scenarios/scenario-step-through.tsx
'use client';
import { useState } from 'react';
import { fmtNum } from '@/lib/scenarios/format';
import { stepLines } from '@/lib/scenarios/step-text';
import type { IterationSeries } from '@/lib/scenarios/types';

const L = {
  de: { case: 'Fall', prev: '◀ vorherige D', next: 'nächste D ▶', gov: 'zur maßgebenden D', slider: 'Dauerstufe', D: 'D (min)', r: 'r_D l/(s·ha)' },
  en: { case: 'Case', prev: '◀ previous D', next: 'next D ▶', gov: 'go to governing D', slider: 'Duration step', D: 'D (min)', r: 'r_D l/(s·ha)' },
} as const;

type Option = { id: string; label: string; series: IterationSeries };
const govIndex = (s: IterationSeries) => Math.max(0, s.perDuration.findIndex((p) => p.D === s.governingD));

export function ScenarioStepThrough({ locale, options }: { locale: 'de' | 'en'; options: Option[] }) {
  const t = L[locale];
  const [id, setId] = useState(options[0]?.id ?? '');
  const opt = options.find((o) => o.id === id) ?? options[0];
  const [index, setIndex] = useState(opt ? govIndex(opt.series) : 0);
  if (!opt) return null;
  const s = opt.series;
  const last = s.perDuration.length - 1;
  const g = govIndex(s);
  const show = (v: number) => fmtNum(s.floorAtZero ? Math.max(0, v) : v, locale);
  return (
    <div className="space-y-2" data-testid="scenario-step-through">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-1">{t.case}
          <select aria-label={t.case} value={opt.id} onChange={(e) => { const o = options.find((x) => x.id === e.target.value); setId(e.target.value); if (o) setIndex(govIndex(o.series)); }} className="border border-hairline rounded px-2 py-0.5">
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="rounded border border-hairline px-2">{t.prev}</button>
        <input type="range" aria-label={t.slider} min={0} max={last} value={index} onChange={(e) => setIndex(Number(e.target.value))} />
        <button type="button" onClick={() => setIndex((i) => Math.min(last, i + 1))} className="rounded border border-hairline px-2">{t.next}</button>
        <button type="button" onClick={() => setIndex(g)} className="rounded border border-hairline px-2">{t.gov}</button>
      </div>
      <pre data-testid="step-formula" className="text-xs whitespace-pre-wrap rounded-lg border border-hairline bg-paper-2/60 p-3 text-ink">{stepLines(s, index, locale).join('\n')}</pre>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs tabular-nums">
          <thead><tr><th className="text-left">{t.D}</th><th className="text-right">{t.r}</th><th className="text-right">{s.outputSymbol} ({s.unit})</th></tr></thead>
          <tbody>
            {s.perDuration.map((p, i) => (
              <tr key={p.D} data-testid={`step-row-${p.D}`} data-governing={i === g} aria-current={i === index ? true : undefined}
                className={`${i === g ? 'font-semibold' : ''} ${i === index ? 'bg-amber-50' : ''}`}
                onClick={() => setIndex(i)}>
                <td>{p.D}</td><td className="text-right">{fmtNum(p.r_D, locale)}</td><td className="text-right">{show(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/step-text.test.ts src/components/scenarios/__tests__/scenario-step-through.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scenarios/step-text.ts src/components/scenarios/scenario-step-through.tsx src/lib/scenarios/__tests__/step-text.test.ts src/components/scenarios/__tests__/scenario-step-through.test.tsx
git commit -m "feat(scenarios): step-through — substituted formula per D, per-D table, governing row

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Sheet switch „Fälle anzeigen" — columns, per-case compliance, badges, charts

**Files:**
- Create: `src/lib/scenarios/sheet-view.ts`
- Create: `src/components/scenarios/scenario-sheet-panel.tsx`
- Modify: `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx`
- Test: `src/lib/scenarios/__tests__/sheet-view.test.ts`, `src/components/scenarios/__tests__/scenario-sheet-panel.test.tsx`

**Interfaces:**
- Consumes: `ScenarioResultsPayload`, `ScenarioRun`, `IterationSeries`, `ScenarioSummary` (Task 2); `fmtNum`, `formatScenarioValue`; `ChartSeries` (Task 13); `ScenarioIterationChart`, `ScenarioStepThrough`; `getScenarioResults` (Task 9); `loadScenariosEnabled` (Task 8); in tests `runScenarioChain` + fixture.
- Produces:
  - `type SheetCell = { kind: 'value' | 'missing' | 'hidden'; text: string; mismatch?: boolean; carried?: boolean }`
  - `type SheetView = { columns: Array<{ id: string; label: string; slot: number }>; rows: Array<{ key: string; label: string; cells: SheetCell[] }>; compliance: Array<{ code: string; title: string; cells: Array<'pass' | 'fail' | 'none'> }>; badges: Array<{ caseLabel: string; slot: number; label: string; caseValue: string; realValue: string }>; charts: Array<{ kind: string; title: string; unit: string; series: ChartSeries[] }>; stepOptions: Array<{ id: string; label: string; series: IterationSeries }>; warnings: string[] }`
  - `buildSheetView(payload: ScenarioResultsPayload, worksheetCode: string, locale: 'de' | 'en'): SheetView`
  - `ScenarioSheetPanel({ locale, projectId, standardCode, worksheetCode })`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/scenarios/__tests__/sheet-view.test.ts
import { describe, it, expect } from 'vitest';
import { buildSheetView } from '../sheet-view';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline, overridesFor, K5, fid } from '../__fixtures__/c4-a138-chain';
import type { ScenarioResultsPayload, ScenarioSummary } from '../types';

const b = buildFixtureBaseline();
const opts = { approvalWithholding: 'bypass' as const };
const k5Summary: ScenarioSummary = {
  id: 'k5', name: 'K5', reason: null, slot: 2, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z',
  overrides: Object.entries(K5).map(([k, value]) => {
    const [code, symbol] = k.split(':');
    return { fieldId: fid(code, symbol), symbol, labelDe: symbol, labelEn: null, unit: null, dataType: value.type, worksheetCode: code, standardCode: 'DWA-A-138-1', value, baseValueAtCreation: null, currentReal: b.stored[fid(code, symbol)] ? { type: value.type, value: (code === 'A138-12' ? 'direct' : b.stored[fid(code, symbol)].valueNumber) } as never : null, drift: false, note: 'n' };
  }),
};
const payload: ScenarioResultsPayload = {
  available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [],
  real: runScenarioChain(b, [], { caseId: 'real', ...opts }),
  cases: [{ scenario: k5Summary, run: runScenarioChain(b, overridesFor(K5), { caseId: 'k5', ...opts }) }],
};

describe('buildSheetView', () => {
  it('Real + one column per case, coloured by slot', () => {
    const v = buildSheetView(payload, 'A138-17', 'de');
    expect(v.columns).toEqual([{ id: 'real', label: 'Real', slot: 0 }, { id: 'k5', label: 'K5', slot: 2 }]);
  });
  it('per-case values on the swale sheet: V_M (Gl. 15 row) and the mirrored k_i_Mulde row', () => {
    const v = buildSheetView(payload, 'A138-17', 'de');
    const vm = v.rows.find((r) => r.label === 'Gl. 15 · V_M')!;
    expect(vm.cells.map((c) => c.text)).toEqual(['13,5', '14,5728']);
    const ki = v.rows.find((r) => r.key === 'field:k_i_Mulde')!;
    expect(ki.cells.map((c) => c.text)).toEqual(['3·10⁻⁸', '1·10⁻⁵']);
  });
  it('per-case compliance on A138-10: Real fails REQ-15, K5 passes', () => {
    const v = buildSheetView(payload, 'A138-10', 'de');
    expect(v.compliance).toEqual([{ code: 'A138-REQ-15', title: 'A138-REQ-15', cells: ['fail', 'pass'] }]);
  });
  it('badges list the case inputs on this sheet', () => {
    const v = buildSheetView(payload, 'A138-12', 'de');
    expect(v.badges).toEqual([{ caseLabel: 'K5', slot: 2, label: 'a_s_m_determination_method (a_s_m_determination_method)', caseValue: 'geometry', realValue: 'direct' }]);
  });
  it('Gl. 7 in K5 reads „ausgeblendet" or „nicht berechnet", never a number', () => {
    const v = buildSheetView(payload, 'A138-12', 'de');
    const g7 = v.rows.find((r) => r.label.startsWith('Gl. 7'))!;
    expect(g7.cells[0]).toMatchObject({ kind: 'value', text: '45' });
    expect(g7.cells[1].kind).not.toBe('value');
  });
  it('charts: Gl. 16 with Real + K5; Gl. 10 with T 30 solid and T 100 dashed per run', () => {
    const v17 = buildSheetView(payload, 'A138-17', 'de');
    expect(v17.charts.map((c) => c.kind)).toEqual(['gl16']);
    expect(v17.charts[0].series.map((s) => [s.label, s.slot, s.dashed])).toEqual([['Real', 0, false], ['K5', 2, false]]);
    const v26 = buildSheetView(payload, 'A138-26', 'de');
    expect(v26.charts[0].series.map((s) => s.dashed)).toEqual([false, true, false, true]);
    expect(v26.stepOptions.map((o) => o.label)).toEqual(['Real · T = 30 a', 'Real · T = 100 a', 'K5 · T = 30 a', 'K5 · T = 100 a']);
  });
});
```

```tsx
// src/components/scenarios/__tests__/scenario-sheet-panel.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline } from '@/lib/scenarios/__fixtures__/c4-a138-chain';

const a = vi.hoisted(() => ({ getScenarioResults: vi.fn() }));
vi.mock('@/lib/actions/scenarios', () => a);
import { ScenarioSheetPanel } from '../scenario-sheet-panel';

beforeEach(() => a.getScenarioResults.mockReset());

describe('ScenarioSheetPanel', () => {
  it('is off by default — the sheet stays unchanged and nothing is computed', () => {
    render(<ScenarioSheetPanel locale="de" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    expect(screen.getByRole('button', { name: 'Fälle anzeigen' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('table')).toBeNull();
    expect(a.getScenarioResults).not.toHaveBeenCalled();
  });
  it('switched on: columns, chart and step-through for the sheet', async () => {
    const b = buildFixtureBaseline();
    a.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [], real: runScenarioChain(b, [], { caseId: 'real', approvalWithholding: 'bypass' }), cases: [] });
    render(<ScenarioSheetPanel locale="de" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fälle anzeigen' }));
    expect(await screen.findByRole('columnheader', { name: /Real/ })).toBeTruthy();
    expect(screen.getByTestId('scenario-chart')).toBeTruthy();
    expect(screen.getByTestId('scenario-step-through')).toBeTruthy();
    expect(a.getScenarioResults).toHaveBeenCalledWith('p', 'DWA-A-138-1');
  });
  it('shows the action error', async () => {
    a.getScenarioResults.mockResolvedValue({ ok: false, error: 'Kein Zugriff auf dieses Projekt.' });
    render(<ScenarioSheetPanel locale="en" projectId="p" standardCode="DWA-A-138-1" worksheetCode="A138-13" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show cases' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kein Zugriff');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/sheet-view.test.ts src/components/scenarios/__tests__/scenario-sheet-panel.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement `sheet-view.ts`**

```ts
// src/lib/scenarios/sheet-view.ts
/** Pure assembly of what the sheet shows when „Fälle anzeigen" is on (spec §4.2–4.4). Client-safe. */
import { fmtNum } from './format';
import { formatScenarioValue } from './values';
import type { IterationSeries, ScenarioResultsPayload, ScenarioRun } from './types';
import type { ChartSeries } from '@/components/scenarios/chart-geometry';

export type SheetCell = { kind: 'value' | 'missing' | 'hidden'; text: string; mismatch?: boolean; carried?: boolean };
export type SheetView = {
  columns: Array<{ id: string; label: string; slot: number }>;
  rows: Array<{ key: string; label: string; cells: SheetCell[] }>;
  compliance: Array<{ code: string; title: string; cells: Array<'pass' | 'fail' | 'none'> }>;
  badges: Array<{ caseLabel: string; slot: number; label: string; caseValue: string; realValue: string }>;
  charts: Array<{ kind: string; title: string; unit: string; series: ChartSeries[] }>;
  stepOptions: Array<{ id: string; label: string; series: IterationSeries }>;
  warnings: string[];
};

const TXT = {
  de: { hidden: '– (ausgeblendet)', missing: 'nicht berechnet: fehlt', unstable: 'Rechnung nicht stabil — Ergebnis vorläufig', mismatch: 'gespeicherter Wert weicht ab', carried: 'Realwert übernommen (im Fall nicht nachgerechnet)' },
  en: { hidden: '– (hidden)', missing: 'not computed: missing', unstable: 'calculation did not settle — result provisional', mismatch: 'stored value differs', carried: 'real value carried (not recomputed in the case)' },
} as const;
const TITLES: Record<string, string> = { gl8: 'Gl. 8 — V_VA', gl10: 'Gl. 10 — V_Rück', gl16: 'Gl. 16 — A_S,m' };

export function buildSheetView(payload: ScenarioResultsPayload, code: string, locale: 'de' | 'en'): SheetView {
  const t = TXT[locale];
  const runs: Array<{ id: string; label: string; slot: number; run: ScenarioRun }> = [];
  if (payload.real) runs.push({ id: 'real', label: 'Real', slot: 0, run: payload.real });
  for (const c of payload.cases) runs.push({ id: c.scenario.id, label: c.scenario.name, slot: c.scenario.slot, run: c.run });
  const realRun = payload.real;

  const rows: SheetView['rows'] = [];
  const eqs = realRun?.sheets[code]?.equations ?? [];
  const eqOutputs = new Set<string>();
  for (const e of eqs) {
    if (!e.outputSymbol) continue;
    eqOutputs.add(e.outputSymbol);
    rows.push({
      key: `eq:${e.equationId}`,
      label: `Gl. ${e.equationNumber} · ${e.outputSymbol}`,
      cells: runs.map(({ run }) => {
        const sh = run.sheets[code];
        const st = sh?.equations.find((x) => x.equationId === e.equationId)?.state;
        if (sh?.hiddenSymbols.includes(e.outputSymbol!)) return { kind: 'hidden', text: t.hidden };
        if (!st) return { kind: 'missing', text: '—' };
        if (st.kind === 'computed') return { kind: 'value', text: fmtNum(st.value, locale) };
        if (st.kind === 'manual_required') return { kind: 'missing', text: st.missing?.length ? `${t.missing} ${st.missing.join(', ')}` : st.reason };
        return { kind: 'missing', text: st.message };
      }),
    });
  }
  // Server-materialised / carried values of this sheet (no equation output), e.g. V_M, k_i_Mulde.
  const extra = new Set<string>();
  for (const { run } of runs) for (const c of Object.values(run.values)) {
    if (c.worksheetCode === code && (c.origin === 'computed' || c.origin === 'carried') && !eqOutputs.has(c.symbol)) extra.add(c.symbol);
  }
  for (const sym of [...extra].sort()) {
    rows.push({
      key: `field:${sym}`, label: sym,
      cells: runs.map(({ id, run }) => {
        const c = Object.values(run.values).find((x) => x.worksheetCode === code && x.symbol === sym);
        if (run.sheets[code]?.hiddenSymbols.includes(sym)) return { kind: 'hidden', text: t.hidden };
        if (!c || c.value == null) return { kind: 'missing', text: '—' };
        const text = typeof c.value === 'number' ? fmtNum(c.value, locale) : String(c.value);
        return {
          kind: 'value', text,
          ...(c.origin === 'carried' && id !== 'real' ? { carried: true } : {}),
          ...(id === 'real' && run.mismatches.some((m) => m.worksheetCode === code && m.symbol === sym) ? { mismatch: true } : {}),
        };
      }),
    });
  }

  const compliance = (realRun?.sheets[code]?.compliance ?? []).map((c) => ({
    code: c.code, title: c.titleDe,
    cells: runs.map(({ run }) => {
      const k = run.sheets[code]?.compliance.find((x) => x.code === c.code)?.result.kind;
      return k === 'pass' ? 'pass' as const : k === 'fail' ? 'fail' as const : 'none' as const;
    }),
  }));

  const badges = payload.cases.flatMap((c) => c.scenario.overrides
    .filter((o) => o.worksheetCode === code)
    .map((o) => ({
      caseLabel: c.scenario.name, slot: c.scenario.slot,
      label: `${locale === 'en' ? o.labelEn ?? o.labelDe : o.labelDe} (${o.symbol})`,
      caseValue: formatScenarioValue(o.value, locale), realValue: formatScenarioValue(o.currentReal, locale),
    })));

  const byKind = new Map<string, ChartSeries[]>();
  const stepOptions: SheetView['stepOptions'] = [];
  const unitByKind = new Map<string, string>();
  for (const { id, label, slot, run } of runs) {
    for (const it of run.iterations.filter((x) => x.worksheetCode === code)) {
      const name = it.kind === 'gl10' ? `${label} · T = ${it.returnPeriod} a` : label;
      const s: ChartSeries = {
        id: `${id}:${it.key}`, label: name, slot, dashed: it.key.endsWith(':T100'),
        points: it.perDuration.map((p) => ({ D: p.D, r_D: p.r_D, value: it.floorAtZero ? Math.max(0, p.value) : p.value })),
        governingIndex: it.governingD == null ? null : it.perDuration.findIndex((p) => p.D === it.governingD),
        boundaryLimited: it.boundaryLimited,
      };
      byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), s]);
      unitByKind.set(it.kind, it.unit);
      stepOptions.push({ id: s.id, label: name, series: it });
    }
  }
  const charts = [...byKind.entries()].map(([kind, series]) => ({ kind, title: TITLES[kind] ?? kind, unit: unitByKind.get(kind) ?? '', series }));

  const warnings: string[] = [];
  for (const { label, run } of runs) {
    if (!run.converged) warnings.push(`${label}: ${t.unstable}`);
    if (run.notRecomputed.some((n) => n.worksheetCode === code) && label !== 'Real') warnings.push(`${label}: ${t.carried} — ${run.notRecomputed.filter((n) => n.worksheetCode === code).map((n) => n.symbol).join(', ')}`);
  }
  for (const m of realRun?.mismatches.filter((x) => x.worksheetCode === code) ?? []) warnings.push(`Real: ${t.mismatch} — ${m.symbol}`);

  return { columns: runs.map(({ id, label, slot }) => ({ id, label, slot })), rows, compliance, badges, charts, stepOptions, warnings };
}
```

- [ ] **Step 4: Implement the panel and wire it into the sheet**

```tsx
// src/components/scenarios/scenario-sheet-panel.tsx
'use client';
/** Sheet header switch „Fälle anzeigen" (spec §4.2). Off ⇒ renders only the switch; the form below is unchanged. */
import { useState } from 'react';
import { getScenarioResults } from '@/lib/actions/scenarios';
import { buildSheetView, type SheetView } from '@/lib/scenarios/sheet-view';
import { seriesColor } from './chart-geometry';
import { ScenarioIterationChart } from './scenario-iteration-chart';
import { ScenarioStepThrough } from './scenario-step-through';

const L = {
  de: { show: 'Fälle anzeigen', loading: 'Fälle werden gerechnet …', result: 'Ergebnis', checks: 'Anforderung', inCase: 'im Fall', real: 'Real',
    disclaimer: 'Fälle beruhen auf angenommenen Eingangswerten. Sie sind nicht Teil des Nachweises und nicht freigegeben.', mismatch: 'gespeicherter Wert weicht ab', carried: 'Realwert übernommen' },
  en: { show: 'Show cases', loading: 'Computing cases …', result: 'Result', checks: 'Requirement', inCase: 'in case', real: 'Real',
    disclaimer: 'Cases rest on assumed input values. They are not part of the verification and not approved.', mismatch: 'stored value differs', carried: 'real value carried' },
} as const;
const VERDICT = { pass: '✓', fail: '✗', none: '–' } as const;

export function ScenarioSheetPanel({ locale, projectId, standardCode, worksheetCode }: { locale: 'de' | 'en'; projectId: string; standardCode: string; worksheetCode: string }) {
  const t = L[locale];
  const [on, setOn] = useState(false);
  const [view, setView] = useState<SheetView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !on;
    setOn(next);
    if (!next) return;
    setBusy(true); setErr(null);
    const r = await getScenarioResults(projectId, standardCode);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setView(buildSheetView(r, worksheetCode, locale));
  };

  return (
    <section className="mb-6 space-y-3" data-testid="scenario-sheet-panel">
      <button type="button" aria-pressed={on} onClick={() => void toggle()} className="rounded-full border border-hairline px-3 py-1 text-xs font-medium">{t.show}</button>
      {on && busy && <p className="text-xs text-subtext">{t.loading}</p>}
      {on && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      {on && view && !busy && (
        <div className="space-y-4 rounded-2xl border border-hairline bg-paper p-4">
          <p className="text-xs text-subtext">{t.disclaimer}</p>
          {view.warnings.length > 0 && <ul className="text-xs text-amber-700">{view.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          {view.badges.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {view.badges.map((b) => (
                <li key={`${b.caseLabel}:${b.label}`} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-xs">
                  <span aria-hidden className="inline-block w-3 h-1 rounded" style={{ background: seriesColor(b.slot) }} />
                  {`${t.inCase} ${b.caseLabel}: ${b.label} = ${b.caseValue} (${t.real} ${b.realValue})`}
                </li>
              ))}
            </ul>
          )}
          {view.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead><tr>
                  <th className="text-left">{t.result}</th>
                  {view.columns.map((c) => (
                    <th key={c.id} className="text-right">
                      <span aria-hidden className="inline-block w-3 h-1 rounded mr-1 align-middle" style={{ background: seriesColor(c.slot) }} />{c.label}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {view.rows.map((r) => (
                    <tr key={r.key} className="border-t border-hairline">
                      <td>{r.label}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className={`text-right ${c.kind !== 'value' ? 'text-subtext' : ''}`}
                          title={c.mismatch ? t.mismatch : c.carried ? t.carried : undefined}>
                          {c.text}{c.mismatch ? ' ⚠' : ''}{c.carried ? ' (R)' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {view.compliance.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr><th className="text-left">{t.checks}</th>{view.columns.map((c) => <th key={c.id} className="text-center">{c.label}</th>)}</tr></thead>
              <tbody>{view.compliance.map((c) => (
                <tr key={c.code} className="border-t border-hairline">
                  <td>{c.code}</td>
                  {c.cells.map((v, i) => <td key={i} className="text-center" aria-label={v}>{VERDICT[v]}</td>)}
                </tr>
              ))}</tbody>
            </table>
          )}
          {view.charts.map((ch) => <ScenarioIterationChart key={ch.kind} locale={locale} title={ch.title} unit={ch.unit} series={ch.series} />)}
          {view.stepOptions.length > 0 && <ScenarioStepThrough locale={locale} options={view.stepOptions} />}
        </div>
      )}
    </section>
  );
}
```

In the worksheet `page.tsx`: import `loadScenariosEnabled` from `@/lib/scenarios/load-baseline` and `ScenarioSheetPanel` from `@/components/scenarios/scenario-sheet-panel`; after the `const [project] = …` check add `const scenariosEnabled = await loadScenariosEnabled(projectId);`; inside `<main>` directly before `<WorksheetForm` add:

```tsx
        {scenariosEnabled && (
          <ScenarioSheetPanel locale={localeTyped} projectId={projectId} standardCode={standardCode} worksheetCode={worksheetCode} />
        )}
```

(Approval controls, progress panel, sidebar counts and conformity are not touched — spec §4.5.)

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm vitest run --project unit src/lib/scenarios/__tests__/sheet-view.test.ts src/components/scenarios/__tests__/scenario-sheet-panel.test.tsx` → PASS. `pnpm typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scenarios/sheet-view.ts src/components/scenarios/scenario-sheet-panel.tsx src/lib/scenarios/__tests__/sheet-view.test.ts src/components/scenarios/__tests__/scenario-sheet-panel.test.tsx "src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx"
git commit -m "feat(scenarios): sheet switch Fälle anzeigen — per-case columns, compliance, badges, chart, step-through

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Whole-branch verification

**Files:** none new.

- [ ] **Step 1: Static checks**

Run: `pnpm typecheck` → exit 0.
Run: `pnpm lint` → no new errors in the files this plan created/modified.
Run: `pnpm i18n:check` → `✓ i18n coverage OK`.

- [ ] **Step 2: Unit suite**

Run: `pnpm test` → all pass except the known pre-existing expected failure recorded in the ledger (1 expected fail + 1 skip at 2026-10-14); the count of passing tests rises by the tests added here.

- [ ] **Step 3: Harness regression (real save path)**

Run: `pnpm vitest run --project integration tests/harness/scenarios.integration.test.ts tests/harness/a138-verify.integration.test.ts tests/harness/finding-h-real-save-path.integration.test.ts tests/harness/register-materialise.integration.test.ts`
Expected: all pass (the three existing A 138 harnesses prove the `computeMuldeGeometrySweep` change and the schema additions did not move any record value).

- [ ] **Step 4: Look at it**

Run `pnpm dev` against the local harness or dev DB with the staged migration applied LOCALLY ONLY (never prod), enable „Fälle aktiv" on a test project, create K5, open A138-17 and A138-26, switch „Fälle anzeigen" on: check the chart at phone width (no horizontal page scroll, legend wraps), labels do not collide at the peaks, dashed T 100 lines are distinguishable, the step-through table scrolls. Record what was seen; fix layout defects in Task 13/14 files.

- [ ] **Step 5: Report**

Report to the owner: commits, test counts (raw command output), the spec gaps G-1…G-8 for ruling, and the owner list: apply `_STAGED_20261014120000_project_scenarios.sql` (after review), push, deploy, enable „Fälle aktiv" on TEST-M820-C4 and TEST-M820-C1-Forscheln. Do not push.

---

## Self-Review (done while writing)

- **Spec coverage:** §2 tables/rules → Tasks 1, 3, 9, 10 (input-only, validation, max 6, base value, drift, access, archive). §3 runner steps 1–7 → Tasks 5–9 (start from record + overrides, phase order + fixpoint, inherited from the run with explicit bypass, visibility incl. hidden-at-source, existing evaluators, iteration series Gl. 8/10 (T 30/100)/16, Real + mismatch flag, nothing persisted). Failure behaviour (missing input per case, invalid override refused at save, gates informational) → Tasks 7, 9, 15. §4.1 → Task 12; §4.2 → Task 15; §4.3 → Task 13; §4.4 → Task 14; §4.5 → Task 15 (no other surface touched); §4.6 → Task 11; §5 report annex → Phase A2 (only the `include_in_report` flag is stored and editable now). §6 tests → Tasks 4, 7 (hand values), 10 (Real = record, isolation, limits/refusals), 7 (visibility). §7 → staged migration, absent-table tolerance (Tasks 2, 8, 9, 10), setting (Task 12).
- **Placeholder scan:** no TBD/TODO; every code step carries code.
- **Type consistency:** `ScenarioRun`/`SheetRun`/`IterationSeries` defined in Task 2 and used unchanged in Tasks 5, 7, 11, 14, 15; `ScenarioBaseline` (Task 6) used by Tasks 7, 8; action names in Task 9 match the MCP tool (Task 11) and the UI (Tasks 12, 15).
- **Review Focus:** each of the five lines has its test in the named task.
