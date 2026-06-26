# VSME Reporting — Plan 4: UX Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three VSME-specific front-end surfaces — **Report Overview dashboard, Worklist (owner two-column), CO₂ activity table** — plus the six-tab branch and two routes, wired to the Plan 1–3 data (owner-tagged fields, `co2_activity_lines`, `recomputeB3Co2`).

**Architecture:** Each surface = a **server page** (direct Drizzle `db` load) + a **client display component** under `src/components/vsme/`. Tabs branch on `isVsmeReport`. The visual layer is designed first by the `frontend-design` agent (spec D9), then wired to real data. Pure logic (tab branch, owner grouping, line CRUD) is unit/integration-tested; visual surfaces are verified in the running local app.

**Tech Stack:** Next.js 15 App Router (server + client components), Drizzle, next-intl, Tailwind v4 (tokens in `globals.css`), `src/components/ui/*` (card/button/select/input/segmented-control), vitest (`unit` happy-dom + `integration` node), pnpm.

**Source spec:** `docs/superpowers/specs/2026-06-25-vsme-reporting-design.md` §6 (UX) + D9. Plans 1–3 on this branch: `isVsmeReport`, `fields.owner`, `co2_activity_lines`, `recomputeB3Co2(projectId, worksheetInstanceId, userId): Promise<{scope1,scope2Location,totalLocation,lineCount}>`.

## Global Constraints

- **Worktree:** all work in `C:\Users\Ekowai\_wt-vsme` (`feat/vsme-seeders`). Never the hub or `_wt-a138`.
- **LOCAL ONLY.** `.env.local` → local; the app runs `pnpm dev` against the local DB (seeded VSME standard + 143 fields + 281 factors). No prod. Any new migration is local-only + 🚩PROD-PROMOTE flagged (none expected in Plan 4 — it's read/UI + a line-CRUD action on the existing `co2_activity_lines`).
- **Package manager:** `pnpm`. Tests: `pnpm test` (unit), `pnpm vitest run --project integration <f>` (DB).
- **Data-load pattern:** server components load via `db` directly (mirror `projects/[id]/(overview)/layout.tsx`); pass props to `'use client'` components. NO new read server-actions.
- **i18n:** every user-facing string added to BOTH `src/lib/i18n/messages/de.json` AND `en.json` under a `vsme.*` key; `pnpm i18n:check` must pass. German is primary.
- **Owner values:** `ekowai_env` | `client_supplied` | `general` (verbatim).
- **Design system:** use `src/components/ui/*` + Tailwind tokens (`bg-paper`, `text-ink`, `text-subtext`, `border-hairline`, `--accent`, `--eko-green`); no new UI lib, no shadcn.
- **frontend-design first (D9):** Task 1 is the `frontend-design` agent designing the three surfaces; later tasks implement against that design + the real data contracts below.
- **Routes:** new VSME surfaces under `src/app/[locale]/(app)/projects/[id]/vsme/{worklist,emissions}/page.tsx`; the Overview branches the existing `(overview)/page.tsx` on `isVsmeReport`.

---

### Task 1: frontend-design — design the three surfaces

**Deliverable:** committed design artifact (`docs/superpowers/design/vsme-surfaces.md`) + skeleton client components under `src/components/vsme/` (`report-overview.tsx`, `worklist.tsx`, `co2-activity-table.tsx`, `owner-badge.tsx`) that render static/mock data with the agreed layout + design-system styling. No data wiring yet.

**Process:** dispatch the `frontend-design` agent (agentType `frontend-design`) to design, against the design tokens in `src/app/globals.css` and the `src/components/ui/*` inventory:
- **Report Overview**: a dashboard — completion ring/%, Scope 1/2 tCO₂e summary cards, module-status grid (B1–C), ownership split (X produced / Y to gather).
- **Worklist**: two columns — `ekowai_env` (left, "EKOWAI produziert") vs `client_supplied` (right, "Kunde liefert"), each row a field with a status pill + per-field owner override control; a `general` section below; per-column progress.
- **CO₂ activity table**: rows of activity (category/subcategory, amount, unit, auto-pulled factor, tCO₂e), a "Neu berechnen" (recompute) button, per-figure factor citation, Scope-1/2/total footer.

- [ ] **Step 1: Dispatch frontend-design** for the three surfaces; it produces the design doc + skeleton components rendering mock data, styled with the tokens.
- [ ] **Step 2: Verify visually** — `pnpm dev`, view a temporary preview (or storybook-style page) of each skeleton; confirm design-system fidelity.
- [ ] **Step 3: Commit** the design doc + skeleton components (`src/components/vsme/*`, `docs/superpowers/design/vsme-surfaces.md`).

**Interfaces produced:** the four component file names + their prop shapes (Tasks 3–5 fill these with real data):
```typescript
// owner-badge.tsx
export function OwnerBadge({ owner }: { owner: 'ekowai_env'|'client_supplied'|'general' }): JSX.Element;
// worklist.tsx
export function Worklist({ projectId, locale, fieldsByOwner }: { projectId: string; locale: 'de'|'en'; fieldsByOwner: Record<string, WorklistRow[]> }): JSX.Element;
// co2-activity-table.tsx
export function Co2ActivityTable({ projectId, worksheetInstanceId, locale, lines, totals }: Co2TableProps): JSX.Element;
// report-overview.tsx
export function ReportOverview({ projectId, locale, summary }: { projectId: string; locale: 'de'|'en'; summary: VsmeSummary }): JSX.Element;
```

---

### Task 2: six-tab branch + route scaffold

**Files:**
- Modify: `src/components/projects/project-tabs.tsx` (accept `isVsme` prop → 6 tabs)
- Modify: `src/app/[locale]/(app)/projects/[id]/(overview)/layout.tsx` (compute `isVsmeReport`, pass `isVsme`)
- Create: `src/app/[locale]/(app)/projects/[id]/vsme/worklist/page.tsx` + `.../vsme/emissions/page.tsx` (minimal server pages rendering the skeleton components with empty data)
- Modify: `src/lib/i18n/messages/de.json` + `en.json` (`vsme.tabs.*`)
- Create: `src/components/projects/__tests__/vsme-tabs.test.ts`

**Interfaces:** `buildProjectTabs(base: string, t: (k:string)=>string, isVsme: boolean): Tab[]` extracted as a pure function so it's unit-testable.

- [ ] **Step 1: Write failing unit test** (`vsme-tabs.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { buildProjectTabs } from '../project-tabs';
const t = (k: string) => k;
describe('buildProjectTabs', () => {
  it('non-VSME: base tabs only (no worklist/emissions)', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, false);
    expect(tabs.some((x) => x.href.endsWith('/vsme/worklist'))).toBe(false);
  });
  it('VSME: includes Worklist + Emissions tabs', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, true);
    expect(tabs.some((x) => x.href.endsWith('/vsme/worklist'))).toBe(true);
    expect(tabs.some((x) => x.href.endsWith('/vsme/emissions'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run RED** → `pnpm test src/components/projects/__tests__/vsme-tabs.test.ts` (fails — `buildProjectTabs` missing).
- [ ] **Step 3: Extract `buildProjectTabs`** in `project-tabs.tsx` (a pure exported function returning the `Tab[]`; the component calls it with its `isVsme` prop). VSME branch inserts Worklist (`${base}/vsme/worklist`), Emissions (`${base}/vsme/emissions`) tabs (Lucide icons) between Overview and Documents. Add `isVsme?: boolean` prop. In `(overview)/layout.tsx`: `const isVsme = await isVsmeReport(id);` → `<ProjectTabs ... isVsme={isVsme} />`. Add the new route `page.tsx` files (server components that render `<Worklist .../>` / `<Co2ActivityTable .../>` skeletons with empty props for now). Add `vsme.tabs.worklist`/`emissions`/`modules` strings to both message files.
- [ ] **Step 4: Run GREEN** + `pnpm i18n:check` (passes) + `pnpm dev` (the new tabs appear on a VSME project, routes render).
- [ ] **Step 5: Commit** (targeted).

---

### Task 3: Worklist surface (owner two-column, wired)

**Files:**
- Modify: `src/app/[locale]/(app)/projects/[id]/vsme/worklist/page.tsx` (real data load)
- Modify: `src/components/vsme/worklist.tsx` (real rendering)
- Create: `src/lib/db/queries/vsme-worklist.ts` (`loadWorklist(projectId): Promise<Record<owner, WorklistRow[]>>`)
- Create: `src/lib/db/queries/__tests__/vsme-worklist.integration.test.ts`
- Modify: i18n (`vsme.worklist.*`)

**Interfaces:** `WorklistRow = { fieldId, symbol, labelDe, labelEn, owner, dataType, valueText: string|null, valueNumber: string|null, hasValue: boolean }`.

- [ ] **Step 1: Failing integration test** for `loadWorklist` — against the seeded VSME standard, assert it returns rows grouped under `ekowai_env`, `client_supplied`, `general`, and that an `ekowai_env` field (e.g. `TotalEnergyConsumption`) appears in that group.
- [ ] **Step 2: RED → implement** `loadWorklist` (the server query from the front-end map: fields ⋈ worksheet_templates ⋈ standards.code='VSME', left-join project_parameters on (projectId, fieldId), group by `owner`). Wire `worklist/page.tsx` to call it; wire `Worklist` component to render the two-column layout from Task 1's design, using `OwnerBadge` + a per-field owner-override control (calls a small `setFieldOwner` server action — Task 3b inline). **GREEN**.
- [ ] **Step 3: i18n + app verify** — `pnpm i18n:check`; `pnpm dev` → the Worklist shows the owner split for a VSME project. Commit.

(Owner-override server action `setFieldOwner(fieldId, owner)` updates `fields.owner`; include a minimal integration test asserting the update persists.)

---

### Task 4: CO₂ activity table (Emissions, wired to the engine)

**Files:**
- Modify: `src/app/[locale]/(app)/projects/[id]/vsme/emissions/page.tsx` (load lines + totals)
- Modify: `src/components/vsme/co2-activity-table.tsx` (real table + recompute)
- Create: `src/lib/actions/co2-lines.ts` (`addCo2Line`, `deleteCo2Line` server actions on `co2_activity_lines`; `recompute` wraps `recomputeB3Co2`)
- Create: `src/lib/actions/__tests__/co2-lines.integration.test.ts`
- Modify: i18n (`vsme.emissions.*`)

**Interfaces:** `addCo2Line(input): Promise<{id}>`, `deleteCo2Line(id): Promise<void>`, `recompute(projectId, worksheetInstanceId): Promise<Co2Totals>` (server action wrapping `recomputeB3Co2` with the auth user id).

- [ ] **Step 1: Failing integration test** — `addCo2Line` inserts a row; `recompute` returns totals > 0 and (read-back) the activity line's `computed_tco2e` is set. Cleanup after.
- [ ] **Step 2: RED → implement** the line CRUD actions (`'use server'`, auth user id, insert/delete on `co2_activity_lines`) + `recompute` wrapping `recomputeB3Co2`. The emissions page loads the project's `co2_activity_lines` + the resolved factor per line (join `emission_factors`) + current totals; the `Co2ActivityTable` renders rows (category/subcategory, amount, unit, factor + uba_id citation, tCO₂e) with add/delete + a "Neu berechnen" button calling `recompute` and refreshing. **GREEN**.
- [ ] **Step 3: i18n + app verify** — add a line in the UI, click recompute, see Scope 1/2 totals update. Commit.

---

### Task 5: Report Overview dashboard

**Files:**
- Modify: `src/app/[locale]/(app)/projects/[id]/(overview)/page.tsx` (branch on `isVsmeReport` → render `ReportOverview` for VSME projects, else the existing overview)
- Modify: `src/components/vsme/report-overview.tsx` (real summary)
- Create: `src/lib/db/queries/vsme-summary.ts` (`loadVsmeSummary(projectId): Promise<VsmeSummary>`)
- Create: `src/lib/db/queries/__tests__/vsme-summary.integration.test.ts`
- Modify: i18n (`vsme.overview.*`)

**Interfaces:** `VsmeSummary = { totalFields, filledFields, completionPct, scope1, scope2Location, totalLocation, ownerSplit: { ekowai_env: {total,filled}, client_supplied: {...}, general: {...} } }`.

- [ ] **Step 1: Failing integration test** for `loadVsmeSummary` — asserts `totalFields` ≈ 143, `ownerSplit.ekowai_env.total > 0`, and that `scope1`/`scope2Location` read from the persisted `project_parameters` GHG output fields (by symbol).
- [ ] **Step 2: RED → implement** `loadVsmeSummary` (count VSME fields total/filled overall + per owner; read the 3 GHG output fields' `value_number` from project_parameters by symbol). Branch `(overview)/page.tsx`: `if (await isVsmeReport(id)) return <ReportOverview .../>`. Wire `ReportOverview` to render completion + Scope cards + ownership split + module-status from the summary. **GREEN**.
- [ ] **Step 3: i18n + app verify** — open a VSME project → the dashboard shows completion %, Scope totals, ownership split. Commit.

---

## 🚩 Held / flagged (unchanged from Plan 3)
- All prod promotions remain held (the user coordinates): `co2_activity_lines` migration, the reconcile migration (created_by NOT-NULL caveat), `emission_factors` RLS, Plan-2 GHG-fields C03→B03 remap.
- Plan 4 adds **no** prod-only DDL (it reads existing tables + writes `co2_activity_lines`/`fields.owner` rows). If any new column is needed, it is local-only + flagged.

## Self-Review
- **Spec §6 coverage:** Report Overview (T5), Worklist + owner override (T3), CO₂ activity table (T4), six-tab branch + 2 routes via `isVsmeReport` (T2), frontend-design-first (T1), reuse of dynamic-field/ui/design-system (constraints + T1). ✅
- **Testability honesty:** pure logic (tab branch T2) is unit-tested; data loaders + CRUD/recompute (T3/T4/T5) are integration-tested against local; the *visual* surfaces are verified by running the app (UX can't be fully TDD'd) — each task has both a test and an app-verify step. Noted, not hidden.
- **Placeholders:** data contracts, queries, routes, the tab-branch function + test are concrete; the *visual JSX* is intentionally produced by the frontend-design step (T1) then wired — that is the spec-mandated order (D9), not a deferred-work placeholder. The prop interfaces are pinned so T2–T5 are unambiguous.
- **Type consistency:** `WorklistRow`, `Co2Totals`, `VsmeSummary`, the component prop shapes, owner enum, and the `recomputeB3Co2` signature are consistent across tasks and match Plans 1–3. ✅
- **i18n:** every task adds strings to both message files + runs `i18n:check`. ✅
