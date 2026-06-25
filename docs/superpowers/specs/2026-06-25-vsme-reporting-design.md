# VSME Sustainability Reporting — Design Spec

- **Date:** 2026-06-25
- **Status:** APPROVED 2026-06-25 (3 binding conditions — see §11)
- **Author:** Alvaro + Claude (Opus 4.8)
- **Repo:** `ekowai-wizard` (Next.js 15 + Supabase)

## 1. Context & goal

EKOWAI's guideline library covers water/wastewater engineering and environmental
ISO standards, but cannot, on its own, produce a corporate sustainability report.
The chosen reporting framework is **VSME** (EFRAG Voluntary SME Standard). The goal
is to add VSME reporting **into the existing Wizard** as a complement to guideline
filling — reusing the Wizard's traceability/transparency chain so every reported
figure is auditable.

Two tools are being built:
1. a **data-collection checklist** (what Ekowai produces vs. what the client supplies), and
2. a **CO₂ calculation engine** (activity × emission factor = tCO₂e, each figure citing its factor).

This is an **internal tool** for Ekowai to deliver client VSME reports (starting with
"Paula's report" as the first real run).

## 2. Scope

**In scope (v1):**
- VSME registered once as a standard; selecting it instantiates a full report (all modules).
- Full tagged field skeleton for **all** modules (B1–B11 + C-modules), ~140 datapoints.
- **Deep CO₂ engine for B3 only** (energy + Scope 1 & 2 GHG).
- Three new UX surfaces: Report Overview, Worklist (owner split), CO₂ activity table.
- Export: human-readable PDF report + filled VSME Digital Template (xlsx).

**Out of scope (v1) — deliberate, not silent:**
- Deep calculation/validation for B4 (pollution) and B5 (biodiversity) — fields exist, wiring follows later.
- Scope 3 GHG and GHG reduction targets (VSME Comprehensive module).
- Social/Governance calculations — these are plain data-entry fields (`client_supplied`).
- **Full iXBRL document** — `xbrl_element_id` is stored on every field so facts are wired,
  but contexts/units/dimensions plumbing is a fast-follow, not v1.

## 3. Locked decisions

| # | Decision |
|---|---|
| D1 | **Approach C** — reuse existing engine + three additions (owner tag, `emission_factors` table, XBRL/Digital-Template export mapping). |
| D2 | **No new project type.** A VSME report = a `project` whose linked standard is `VSME`; detected by `isVsmeReport(projectId)` (checks `project_standards`). |
| D3 | **New project per year** — each annual report is its own project under the client org, clone-forward from prior year. Matches `report_archives` snapshotting. |
| D4 | **One selection = full report.** Selecting VSME instantiates all modules as one project; no hand-picking modules. |
| D5 | **Owner tag** on fields: `ekowai_env` (B3–B7) / `client_supplied` (social/gov) / `general` (B1/B2). By-module default, **per-field override allowed** (boundary can cut through a module). |
| D6 | **Six-tab project shell** for VSME projects: Overview · Worklist · Emissions (CO₂) · Modules · Reports · Audit. Worklist and Emissions are **separate** tabs. |
| D7 | **Build order:** full tagged skeleton first → deep CO₂ on B3 → B4/B5 later. |
| D8 | **Module-level bulk verification** allowed (verify a module once its standard text is read); `verification_audit` records module + actor + time. Computed B3 figures additionally require their factor to be verified. |
| D9 | `frontend-design` (ui-ux-pro-max) agent designs the three surfaces as the **first implementation step** after spec lock. |

## 4. Data model

**Reused unchanged:** `organizations`, `projects`, `project_standards`, `project_parameters`,
`standards`, `worksheet_templates`, `worksheet_sections`, `worksheet_instances`, `fields`,
`equations`, `compliance_requirements`, `calculation_snapshots`, `verification_audit`,
`approval_events`, `report_archives`, `audit_log`.

**VSME maps onto existing entities:**
- VSME report → `project` (annual, per org).
- Disclosure modules B1–B11 / C-modules → `worksheet_templates`.
- ~140 datapoints → `fields` (answers in `project_parameters`).
- CO₂ math → CO₂ engine (see §5), totals written back to B3 fields.
- Completeness/validity → `compliance_requirements` (repurposed as presence/sum checks).

**Additions:**
1. `fields.owner` — enum `ekowai_env | client_supplied | general`. Seeded by module rule, editable per field.
2. `fields.xbrl_element_id` — text; the taxonomy element id, for export.
3. **`emission_factors`** (new global reference table):
   - `id` uuid PK
   - `uba_id` text — citation key (e.g. `05_20_01_001_01`)
   - `scope` text — `Scope 1 | Scope 2 | Scope 3 …`
   - `category` text (UBA Level 1, e.g. `Strom`)
   - `subcategory` text (UBA Level 2, e.g. `Deutscher Strommix`)
   - `unit` text (e.g. `kWh`)
   - `kg_co2e` numeric, `kg_co2` numeric, `kg_ch4` numeric, `kg_n2o` numeric
   - `source` text (`UBA`), `source_version` text (`v2.1`), `dataset_year` int, `sheet` text
   - `UNIQUE(uba_id, source_version)`

## 5. CO₂ engine

**Why a lookup, not a formula.** `equations.formula` (`src/lib/eval/formula.ts`) is pure
arithmetic over sibling symbols; function calls/lookups throw. A CO₂ line's multiplier is a
*row from a reference table*, so it is modeled as a **lookup-backed line item**, mirroring the
KOSTRA precedent (`src/lib/site-profile/kostra.ts`: a pure, side-effect-free resolver that
**does not touch `src/lib/eval`**).

- New pure module `src/lib/co2/emission-factors.ts`: given `(factor selection, reporting year)`
  returns the matching `emission_factors` row + metadata.
- `tCO₂e = activity_amount × kg_co2e ÷ 1000`.
- Per-line record stored: `{activity_amount, unit, uba_id, source_version, kg_co2e_per_unit, tco2e}`
  — structurally identical to how `calculation_snapshots` records substituted inputs, so each
  figure plugs into `calculation_snapshots → verification_audit → approval_events` unchanged.

**Data flow:** Emissions tab → user adds activity rows (category/subcategory → factor; amount + unit)
→ resolver fetches factor for report year → per-line tCO₂e → summed per Scope → **B3 fields written
back** as computed values carrying their citation.

**Scope handling (VSME Basic = Scope 1 + 2):**
- Scope 1: UBA sheets `01 Stationäre`, `02 Mobile`, `03 Industrieprozesse`, `04 Kältemittel`, `11 Abwasser`.
- Scope 2: `05 Strom`, `06 Wärme`.
- Scope 3 sheets (`07–10`, `12`) → out of v1.

**Differentiator:** `11 Abwasser` provides N₂O/CH₄ process factors from treatment (Scope 1 emissions
generalist tools miss). Treated as a normal category; surfaced in UI as a "process emissions" group.

## 6. UX/UI surfaces

**Detection/routing:** `isVsmeReport(projectId)` branches the project shell. Tabs become the six in D6.
- Overview → VSME dashboard in existing `(overview)/page.tsx` (branched).
- Worklist → new route `projects/[id]/worklist`.
- Emissions → new route `projects/[id]/emissions`.
- Modules → existing `/standards/VSME/[module]` worksheet filler (unchanged).
- Reports / Audit → existing.

**New components (`src/components/vsme/`):**
1. `report-overview.tsx` — completion ring, Scope 1/2 tCO₂e summary, module-status grid, ownership split.
2. `worklist.tsx` — two-column owner view (`ekowai_env` | `client_supplied`), per-row status pill,
   **per-field owner override control**, per-column progress.
3. `co2-activity-table.tsx` — built on `kostra-table-editor` + `equation-engine-card` patterns;
   activity rows → factor auto-pull → tCO₂e per line + citation → Scope totals.
4. `owner-badge.tsx` — small `status-pill` variant.

**Reused untouched:** `dynamic-field`, `compliance-block`, `approval-bar`, `audit-timeline`,
`status-pill`, `pdf`/reports, `components/ui` + design system.

The `frontend-design`/`ui-ux-pro-max` agent designs these three surfaces first (D9).

## 7. Seeding

Two one-time, idempotent seeders; both read machine-readable sources (no hand-typing).

**Seeder A — VSME structure (taxonomy → tagged fields):** parse `vsme-definition.xml` +
`vsme-all.xsd` + `vsme-label-en.xml` → emit a Pass3c-format workbook:
- `Standards` = `VSME`; `Worksheets` = B1–B11 + C-modules; `Fields` = ~140 datapoints with
  `owner` + `xbrl_element_id`; `Enum_Values` = NACE (B1) + waste codes (B7) from the taxonomy;
  `Compliance_Requirements` = completeness/presence gates.
- Import via existing `scripts/import-pass3c.ts` (extended to carry `owner` + `xbrl_element_id`).
- Lands `imported_unverified`. The verify pass **is** the "read VSME properly" desk week,
  tracked in the existing status system; module-level bulk verify per D8.

**Seeder B — emission factors (xlsx → `emission_factors`):** standalone script reading UBA sheets
`01–06` + `11`, one row per factor, preserving `uba_id`/`source_version`/`dataset_year`/`sheet`.
Re-runnable for new UBA versions (adds rows; never overwrites — old versions stay citable).

## 8. Export

Reuses `documents_and_archives` / `report_archives` / `components/pdf` / reports tab.
1. **PDF report** — B1–C answers + CO₂ breakdown with per-figure citations + methodology annex
   (factor versions). Snapshotted into `report_archives` (immutable, versioned, org-consistency trigger).
2. **VSME Digital Template (xlsx)** — fills official EFRAG template from `project_parameters`,
   datapoint → cell. Standalone exporter.
3. **XBRL facts** — wired via `xbrl_element_id`; full iXBRL deferred (see §2 out-of-scope).

v1 ships PDF + Digital Template (sufficient for Paula's report).

## 9. Build order (phases)

1. **Schema:** add `fields.owner`, `fields.xbrl_element_id`, create `emission_factors`.
2. **Seed:** Seeder A (structure) + Seeder B (factors) → tagged worklist + live factor table.
3. **UX (frontend-design first):** design + build Report Overview, Worklist (with owner override), CO₂ table.
4. **CO₂ engine:** `src/lib/co2/` resolver + sum + B3 write-back + citation snapshots.
5. **Verification:** module-level bulk verify (D8) wired into `verification_audit`.
6. **Export:** PDF report + Digital Template xlsx.
7. **(Fast-follow, not v1):** B4/B5 wiring, Scope 3, full iXBRL.

## 10. Risks / open questions

- **Equation write-back gap:** memory notes engine/aggregator outputs are not always persisted to
  `project_parameters` (display-only). The CO₂ write-back must *persist* B3 totals, or downstream
  consumers read "fehlend". Verify against current `saveWorksheet` before relying on it.
- **Taxonomy parsing fidelity:** datapoint count/labels/types must be validated against the VSME
  Standard PDF after Seeder A (the verify pass catches this).
- **Compliance grammar limits:** existing gate grammar has no chained compares / arithmetic-in-conditions;
  completeness checks must stay within supported grammar or use `manual`.
- **Bulk-verify vs computed figures:** ensure a bulk module-verify does not mark a CO₂-derived figure
  verified while its factor is still unverified.

## 11. Approval conditions (binding — 2026-06-25)

Spec approved by Alvaro with three binding conditions carried into the implementation plan:

1. **C1 — Write-back proven before export (Phase 4 must-fix).** B3 CO₂ totals must actually
   persist to `project_parameters` (with a test) before any export is built on them. Downstream
   consumers must not read "fehlend". Resolves the §10 equation-write-back gap.
2. **C2 — Git identity + branch.** Fix git identity to **Alvaro <alvaro.burgos@ekowai.com>** and
   **branch off `main`** before any commit. Never commit under the `gmx.net` identity.
3. **C3 — Bulk-verify guard.** A module bulk-verify must not flip a computed B3 figure to
   `engineer_verified` while its emission factor is still unverified (§10 / D8).
