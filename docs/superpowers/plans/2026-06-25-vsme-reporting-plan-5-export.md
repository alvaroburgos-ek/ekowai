# VSME Reporting — Plan 5: Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce two downloadable deliverables for a VSME project — a **PDF report** (reusing the existing react-pdf builder) and a **structured VSME data xlsx** (every datapoint with its `xbrl_element_id`, owner, value, unit + the CO₂ breakdown with per-figure citations) — exposed via a route + download button.

**Architecture:** A single data loader assembles `VsmeExportData` (fields+values+xbrl+owner+citations, CO₂ activity lines, GHG totals). An ExcelJS builder writes a multi-sheet workbook from it. The PDF reuses `buildStandardReport(projectId,'VSME')`. A route serves both formats; a button links to it.

**Tech Stack:** Next.js 15 (route handlers), Drizzle, `@react-pdf/renderer` (existing PDF), `ExcelJS` (existing xlsx lib), vitest, pnpm.

**Source spec:** `docs/superpowers/specs/2026-06-25-vsme-reporting-design.md` §8. Plans 1–4 on this branch.

## Global Constraints

- **Worktree:** all work in `C:\Users\Ekowai\_wt-vsme` (`feat/vsme-seeders`). Never the hub or `_wt-a138`.
- **LOCAL ONLY.** `.env.local` → local; `pnpm dev` against the local DB (seeded VSME). Integration tests load `.env.local` via `import '../../db/__tests__/_setup-env'` as the FIRST import (NOT `./_setup-env`). The WSL stack idles — the controller verifies integration runs (bring stack up + run in one invocation).
- **No prod-only DDL.** `report_archives` + the `report-archives` storage bucket already exist; archiving is **out of v1** (see deferrals) so no storage/bucket work. Any prod step → 🚩flagged.
- **DEFERRED (deliberate, flagged — same tier as iXBRL):**
  1. **Cell-exact fill of the official EFRAG `VSME-Digital-Template-latest.xlsx`** — the template is a 16-sheet formatted workbook with no `xbrl_element_id`→cell column; a robust datapoint→cell map is version-specific and fragile. v1 ships a **structured data xlsx** instead.
  2. **Full iXBRL** — `xbrl_element_id` is carried into the xlsx so a later mapping is possible; iXBRL document is not built.
  3. **Archiving to `report_archives`/storage** — v1 is live download. (Note: live download mirrors the existing `/api/projects/[id]/standards/[standardCode]/report` route, which also serves live.)
- **Auth:** the export route enforces org membership exactly like `src/app/api/projects/[id]/standards/[standardCode]/report/route.ts` (auth + `projects ⋈ org_members` check). Copy that guard verbatim.
- **i18n:** German primary. New UI strings (the button label) go in BOTH `de.json` + `en.json` under `vsme.export.*`; `pnpm i18n:check` passes. The xlsx uses `labelDe`/`labelEn` per a `locale` arg.
- **CO₂ output symbols (verbatim):** `GrossScope1GreenhouseGasEmissions`, `GrossLocationBasedScope2GreenhouseGasEmissions`, `TotalGrossLocationBasedScope1AndScope2GHGEmissions`.

---

### Task 1: VSME export data loader

**Files:**
- Create: `src/lib/export/vsme-export-data.ts`
- Test: `src/lib/export/__tests__/vsme-export-data.integration.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type VsmeExportField = { worksheetCode: string; worksheetTitle: string; symbol: string; xbrlElementId: string|null; labelDe: string; labelEn: string|null; owner: string; dataType: string; unit: string|null; value: string|null; citationSources: unknown[] };
  export type VsmeExportCo2Line = { scope: string; category: string; subcategory: string|null; amount: string; unit: string; factorUbaId: string; factorSourceVersion: string; computedTco2e: string|null };
  export type VsmeExportData = { projectName: string; fields: VsmeExportField[]; co2Lines: VsmeExportCo2Line[]; totals: { scope1: number; scope2Location: number; totalLocation: number } };
  export async function loadVsmeExportData(projectId: string): Promise<VsmeExportData>;
  ```
  `fields` = all active VSME fields ⋈ worksheet_templates ⋈ standards(code='VSME'), LEFT JOIN project_parameters on `(projectId, fieldId)`; `value` = the populated `value_*` coalesced to text; `citationSources` from the parameter row (or `[]`). `co2Lines` from `co2_activity_lines` for the project (join nothing). `totals` from the 3 GHG output symbols' `value_number`.

- [ ] **Step 1: Failing integration test** — `loadVsmeExportData('<uuid>')` returns `fields.length` between 100 and 200, at least one field with `owner==='ekowai_env'`, `co2Lines` is an array, `totals` has numeric `scope1`. (Use any uuid; fields are template-level.)
- [ ] **Step 2: RED → implement** the loader (model the field query on `src/lib/db/queries/vsme-summary.ts:36-59`; coalesce value columns to text in JS; map worksheet code/title from the join). **GREEN** (controller verifies). Register the test in vitest.config.ts.
- [ ] **Step 3: Commit** (targeted: the loader, the test, vitest.config.ts).

---

### Task 2: VSME data xlsx builder

**Files:**
- Create: `src/lib/export/build-vsme-xlsx.ts`
- Test: `src/lib/export/__tests__/build-vsme-xlsx.test.ts`

**Interfaces:**
- Consumes: `VsmeExportData` (Task 1).
- Produces: `export async function buildVsmeXlsx(data: VsmeExportData, locale: 'de'|'en'): Promise<Buffer>` — an ExcelJS workbook with sheets: **"Datapoints"** (one row per field: worksheet, datapoint label (locale), `xbrl_element_id`, owner, value, unit), **"CO2 Activity"** (one row per `co2Lines` entry: scope, category, subcategory, amount, unit, factor uba_id, factor version, tCO₂e), **"Totals"** (Scope 1 / Scope 2 (location) / Total, with the source factor versions), **"Citations"** (datapoints that have `citationSources`, flattened). Header row bold; column widths set. (Follow the ExcelJS write pattern in `scripts/vsme/build-workbook.ts`.)

- [ ] **Step 1: Failing test** (unit) — build a workbook from a small hand-made `VsmeExportData` fixture, load the Buffer back with `ExcelJS.Workbook().xlsx.load`, assert sheet names include `Datapoints`/`CO2 Activity`/`Totals`, the Datapoints sheet has the header columns incl. `xbrl_element_id`, and a known field's row carries its value + xbrl id.
- [ ] **Step 2: RED → implement** `buildVsmeXlsx`. **GREEN** (`pnpm test`).
- [ ] **Step 3: Commit** (targeted: builder + test).

---

### Task 3: Export route + download button (PDF + xlsx)

**Files:**
- Create: `src/app/api/projects/[id]/vsme/export/route.ts`
- Create: `src/components/vsme/vsme-export-button.tsx`
- Modify: `src/app/[locale]/(app)/projects/[id]/(overview)/page.tsx` (render the button for VSME projects) — OR the reports page; pick the overview (the ReportOverview surface)
- Modify: i18n `vsme.export.*`
- Test: `src/app/api/projects/[id]/vsme/__tests__/export-route.integration.test.ts`

**Interfaces:**
- Consumes: `loadVsmeExportData` (T1), `buildVsmeXlsx` (T2), `buildStandardReport(projectId,'VSME')` (existing, returns PDF Buffer).
- Produces: `GET /api/projects/[id]/vsme/export?format=xlsx|pdf` — auth+membership guard (copy from the standard-report route), then: `format=pdf` → `buildStandardReport(id,'VSME')` returns `application/pdf`; `format=xlsx` (default) → `buildVsmeXlsx(await loadVsmeExportData(id), locale)` returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment; filename="vsme-<id8>.xlsx"`. `Cache-Control: no-store`.

- [ ] **Step 1: Failing integration test** — call the route handler's `GET` (import it) with a fixture project id + a mock auth (reuse the standard-report route's test pattern if one exists; otherwise assert the handler returns 200 + correct content-type for `format=xlsx`, and that the body is a non-empty Buffer). If full auth mocking is impractical in the test, at minimum integration-test that `buildVsmeXlsx(await loadVsmeExportData(id), 'de')` yields a non-empty Buffer for a seeded VSME project (the route is thin glue over T1+T2).
- [ ] **Step 2: RED → implement** the route (copy the auth/membership guard verbatim from `src/app/api/projects/[id]/standards/[standardCode]/report/route.ts`; branch on `format`). Add `VsmeExportButton` (`'use client'`, an `<a href="/api/projects/${projectId}/vsme/export?format=xlsx" download>` + a second link for `format=pdf`, styled with `text-accent`/Lucide `FileDown`, label from i18n `vsme.export.*`). Render it in the VSME overview branch. Add `vsme.export.*` to both message files. **GREEN** + `pnpm i18n:check` + `pnpm dev` (the button downloads a real xlsx + PDF for a VSME project).
- [ ] **Step 3: Commit** (targeted).

---

## 🚩 Held / deferred
- Cell-exact official-EFRAG-template fill, full iXBRL, archiving-to-`report_archives`/storage — all deferred (see Global Constraints). No prod DDL in Plan 5.
- All Plan 1–4 held-prod items unchanged (migrations, RLS, pre-prod auth hardening, GHG-fields C03→B03 remap).

## Self-Review
- **Spec §8 coverage:** PDF report (T3 via reuse of `buildStandardReport('VSME')`) ✅; xlsx export carrying datapoints + `xbrl_element_id` + CO₂ breakdown + citations (T1+T2) ✅; route+button to download (T3) ✅. The "official EFRAG template cell-fill" is consciously swapped for a structured data xlsx and flagged — like the spec's own iXBRL deferral. ✅ with a documented scope cut.
- **Testability honesty:** loader (T1) + xlsx builder (T2) are properly tested (integration/unit); the route (T3) is thin glue with an integration test on the buffer path + an app-verify download step. Noted.
- **Placeholders:** loader query (model on vsme-summary), xlsx builder (ExcelJS like build-workbook), and the route (copy the standard-report guard) are concrete; the exact ExcelJS cell code is produced by the implementer against the pinned sheet/column contract. The auth guard is "copy verbatim from <named file>", not a placeholder.
- **Type consistency:** `VsmeExportData`/`VsmeExportField`/`VsmeExportCo2Line`, `loadVsmeExportData`, `buildVsmeXlsx(data, locale)` consistent across T1→T2→T3; CO₂ symbols + owner enum match Plans 1–4. ✅
