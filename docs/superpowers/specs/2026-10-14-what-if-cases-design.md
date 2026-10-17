# What-if cases (Fälle) — design

**Date:** 2026-10-14 · **Status:** approved in conversation (sections 1–5), awaiting written-spec review
**Owner:** Alvaro (EKOWAI) · **Origin:** DWA-A 138-1 readiness test on test case C4 (anonymised)
**Prototype:** local HTML prototype of the flood comparison (client data — kept on the engineer's PC, not in the repo)

## 1. Purpose

An engineer often has to design before key inputs are measured. In test case C4 the infiltration rate k_i is only a table value, so the A 138 sizing is not provable today, and the result depends on a field test: with k_i = 1·10⁻⁵ m/s the swale is ~49 m², with 1·10⁻⁶ it is ≥ 105 m². The flood check depends on whether T = 30 a or T = 100 a applies (§ 5.3.4.1, 70 % rule). The engineer needs to see these situations side by side — as numbers, as a chart over the rain duration, and step by step with the values filled into the guideline formula — and to hand the client a clearly labelled scenario annex.

**Users:** the engineer (decide, learn, explain); the client (reads the annex); fill agents via MCP.

**Success:** on test case C4 the engineer opens A138-26, switches cases on, and sees F0/K5/K6 × T 30/100 as curves with their peaks; steps through D with the numbers in the formula; every value equals the hand calculation; the report gets an annex „Szenarien (Annahmen, nicht nachgewiesen)"; nothing in the real record, approvals, gates or the Konformitätserklärung changes.

**Decisions taken (owner, 2026-10-14):** cases = what-if values on the same project (approach A), cases are project-wide (an override on an early sheet propagates through the whole chain), cases appear in the tool plus an optional report annex; project-to-project comparison/assessment is sub-project B (separate design, reuses this one's chart/table/step-through); implementation approach = in-memory overlay calculation (no shadow data, no project copies).

## 2. Data model

Two new tables; no existing table changes.

`project_scenarios`
| column | type | meaning |
|---|---|---|
| id | uuid pk | |
| project_id | uuid fk projects | owning project |
| name | text not null | short name, e.g. „K5 – Feldversuch k_f 10⁻⁵" |
| reason | text | why the case exists |
| sort_order | int not null | fixed order; fixes the colour slot (colour follows the case, never its rank) |
| include_in_report | boolean not null default false | report annex |
| created_by | uuid | user |
| created_at / updated_at | timestamptz | |
| archived_at | timestamptz null | archive instead of delete |

`project_scenario_overrides`
| column | type | meaning |
|---|---|---|
| scenario_id | uuid fk project_scenarios | |
| field_id | uuid fk template field | template-level field id (works on any sheet / standard) |
| value | same representation as `project_parameters` values (number / text / boolean / json) | case value |
| base_value_at_creation | same representation | the real value when the override was created (for drift warning) |
| note | text | provenance of the assumption |
| unique (scenario_id, field_id) | | |

Rules
- Only **input** fields can be overridden (not derived/engine outputs, not tool-set fields). Validation on save uses the field's own validation (data type, enum values, register column keys, validation_rules).
- Maximum **6 active cases** per project, plus the implicit „Real" (the record). Enforced on create.
- Cases are never approved and never read by approvals, gates, conformity, progress or the audit of the real record.
- Drift: when the current real value differs from `base_value_at_creation`, the cases panel shows „Realwert geändert: alt → neu".
- Access: same RLS/role rules as the project's real values (edit project ⇒ edit cases; read project ⇒ read cases).

## 3. Calculation — the chain runner

New pure module `src/lib/eval/scenario-chain.ts` plus a loader `loadScenarioBaseline(projectId, standardCode)` that loads what the report path loads (instances in phase order, entered values, templates, equations, compliance rows, visibility rules, regulation tables, rainfall carriers, register configs).

`runScenarioChain(baseline, overrides) → ScenarioResult`
1. Start from the real **entered** values; apply overrides (override wins).
2. Walk the standard's sheets in phase/order sequence. Inherited values come from **this run's** results of earlier sheets. The approval-based withholding of inherited values is bypassed inside the runner (explicit parameter, never used by the real save/approval path).
3. Visibility: the same rules as the real record (own-hidden and hidden-at-source ⇒ absent; R-14…R-16).
4. Each sheet is evaluated with the existing `evaluateWorksheetEquations` and `evaluateWorksheetCompliance` (no second engine).
5. Iterated equations: `iterateGoverningDuration` results (perDuration rows, governingD, r_D_at_governing, governingValue, boundaryLimited) are carried in the result per equation. Gl. 10 (flood, incl. T_n = 30 and 100 columns) and Gl. 16 (swale area) expose perDuration like Gl. 8.
6. „Real" = same run with zero overrides. Where a stored derived value in the record differs from the Real run beyond float tolerance, the result marks it „gespeicherter Wert weicht ab" (consistency check).
7. Nothing is persisted. Server action `getScenarioResults(projectId, standardCode, scenarioIds)` computes on request; per-request memoisation only.

Failure behaviour: a missing input yields the same „nicht berechnet: fehlt X" per case column without affecting other cases; invalid override values are refused at save time; gate results inside a case are informational only.

## 4. Screens

1. **Project tab „Fälle"**: list (name, reason, colour, number of overrides, drift warnings, „im Bericht anzeigen"); „Neuer Fall" (field search by label/symbol across the project's standards, real value shown beside the input, note required); „Fall duplizieren"; „Archivieren".
2. **Sheet header switch „Fälle anzeigen"** (default off): results get columns Real | case… (case colour); overridden inputs get a badge „im Fall K5: …"; compliance rows show per-case ✓ / ✗ / –.
3. **Iterated sheets** (A138-13, -16…-22, -26 and later other standards with a governing-duration iteration): chart of all shown cases over D (log x 5 min…7 d), peak marked, „kein eindeutiges Maximum" marker when boundaryLimited, hover crosshair tooltip with every case's value, legend + direct labels, T variants as separate cases (line style).
4. **Step-through** under the chart: case select, previous/next D, slider, „zur maßgebenden D"; the printed formula with the numbers substituted for the current D; full per-D table with current row highlighted and governing row bold.
5. Switch off ⇒ sheets unchanged. Cases never shown on approval controls, progress panel, sidebar counts, conformity.
6. **MCP tools**: `list_scenarios`, `create_scenario`, `set_scenario_overrides`, `archive_scenario`, `get_scenario_results`.

Chart rules (dataviz method): categorical colours in fixed order from the validated palette (cap 6 + Real), one y-axis, light/dark tokens, legend always present, table view always available, texture/line-style secondary encoding for print.

## 5. Report annex

Standard report (Compliance-Bericht) gets „Anhang S – Szenarien (Annahmen, nicht nachgewiesen)" only when ≥ 1 case has `include_in_report`. Fixed DE/EN disclaimer on every annex page: „Die folgenden Fälle beruhen auf angenommenen Eingangswerten. Sie sind nicht Teil des Nachweises und nicht freigegeben. Maßgebend sind ausschließlich die Werte im Hauptteil." Content: case list with every override (real value, case value, note); key-results table per standard (A 138: k_i, A_C, A_S,m, V_VA, q_S,AC, V_Rück, verdicts of REQ-15 etc.); one chart per iterated equation (colour + line style); one per-D step table per case and equation. Never in Konformitätserklärung, Einreichungs-Checkliste, Prüf-Memo.

## 6. Testing

- Hand-value tests (test case C4, 2026-10-14): k_i 3·10⁻⁸; V_VA 70.0038 m³ (D 10080, boundary-limited); K5 A_S,m 48.58 m² (D 180); K6 A_S,m 93.25 m² by Gl. 16 and 105.2 m² by Gl. 9; Gl. 10 T 30 a: 94.69 / 13.59 / 27.35 m³; T 100 a: 116.54 / 24.51 / 49.43 m³ (inputs in the C4 ledger entries of 2026-10-14).
- Real-equals-record: zero-override run equals stored derived values on approved A 138 test projects.
- Isolation (embedded Postgres harness): creating, editing, running cases changes no row in project_parameters, worksheet_instances, approvals, audit; conformity PDF byte-identical apart from timestamps.
- Visibility: a case switching a driver hides/drops the same values as the real record.
- Report: annex present iff a case is ticked; other documents unchanged.
- Limits: 7th active case refused; override on a derived field refused; invalid enum refused.

## 7. Rollout and phases

- Migration adds the two tables only (safe to apply); code tolerates their absence; project setting „Fälle aktiv" gates the UI; first on TEST-M820-C4 and TEST-M820-C1-Forscheln.
- Process: implement → independent review → fix → re-review → push (owner) → deploy (owner).
- **Phase A1:** tables, override CRUD + validation, chain runner, results columns, iteration chart + step-through on A 138, MCP tools.
- **Phase A2:** report annex; iteration chart for the other standards that use `iterateGoverningDuration`.
- **Sub-project B (separate design):** project comparison / assessment across projects, reusing chart, table and step-through.

## 8. Out of scope

Approving cases; more than 6 active cases; overriding computed results; cross-project cases (sub-project B); persisting case results.

## 9. Related findings from the same run (separate fix round, not part of this feature)

F-A1 group per surface row (A138-07), F-A2 „keine Anforderung" in Tab. 6 cells, F-A3 A138-12 method label vs hint, F-A4 boundary-limited maximum not surfaced on A138-13 (this feature surfaces it in the chart; the sheet itself still needs the warning), F-A5 A138-10 Q_zu order, F-A6 A138-08 n_limit not recomputed after approval; C4 820 findings F1–F3, F6, F7–F12 (vault 73_).
