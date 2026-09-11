# Design — "Guideline → Tool": generic guideline-driven field mechanism

- **Date:** 2026-09-11
- **Owner:** Alvaro Burgos · **Author session:** Claude Fable 5.1 (claude-fable-5-1), Claude Code 2.1.260
- **Scope (first rollout):** the 29 standards of the Blumen Forschel production set (DWA-M-820-1/-2/-3, DIN-276, DIN-1989-1/-2, DWA-A-138-1, DIN-18130-1, FLL-Naturteich, FLL-GAR-2023, DWA-A-262E, DWA-A-178, DWA-M-187, DIN-EN-16941-2, DWA-M-277E, DWA-M-1200-1/-2/-3, DWA-M-205, ISO-5667-1/-6/-10, ATV-A-704E, ISO-46001, ISO-59020, ISO-59004, DIN-14021, ISO-14046, VSME). Mechanism is corpus-wide by construction.
- **Status:** APPROVED by Alvaro 2026-09-11 (D-1: keep prod enum). Pre-step (worktree commit + update) started same day.
- **Evidence:** `2026-09-11-guideline-to-tool/inventory/<CODE>.md` (29 per-standard inventories, tables quoted verbatim from the md transcripts), `ARCH-CODEBASE-BRIEF.md` (how fields render/evaluate today), `ARCH-PROPOSAL-fable.md` (independent Fable 5.1 architecture proposal). Prod dump basis: 29 standards, 4 002 active fields, 265 equations, 1 000+ requirements, read 2026-09-11 from `vadsmshzebefjreqcicl`.

## 1. Intent (owner, 2026-09-11)

"We are transforming the guideline into a tool." Every guideline must follow the DWA-A-138-1 surface-inventory structure, or better: when the engineer picks a category, the predetermined values come from the guideline's own table; when the guideline gives categories, single-tick if one applies, multi-tick if several; where there are several areas/systems, a "+" adds another in the same project; later values depend on earlier inputs and on calculations from them. Single/multi choice and table fill are examples, not the list — the shapes must come from the guidelines' own methodologies, applied and improved, always aligned to the guideline.

## 2. What the 29 inventories found

| Pattern | Count across 29 standards | Implemented today |
|---|---|---|
| Category → predetermined values (table lookups) | ~190 candidates (~120 with numeric tables) | 1 (A138 Tab. 9), plus 3 hardcoded TS lookups (Tab. 5/6, Tab. 13) |
| Repeatable "one of N" groups | ~230 | 3 bespoke editors on main (surface inventory, pollutant register, rainfall tables) + 38 config entries uncommitted in `_wt-fll` |
| Conditional value/visibility on earlier input | ~360 | 0 generic; 3 hardcoded symbol early-returns; gates fire unconditionally |
| Derived by equation | 265 registered; ~80 described in text but unregistered | engine + materialisation exist; 6 A138 aggregators keyed by UUID |
| Re-typed duplicates of one physical quantity | 25–45 % of fields in the technical standards (A_C ×4, r_D(n) ×7, EZ ×9, Güteklasse ×3 …) | inheritance exists but producers not single |

Recurring cross-standard blocks: project identity (820-1/-2/-3, DIN-276), sample transport/QA (ISO-5667-1/-6/-10, ATV-A-704E), site water volumes (ISO-46001, ISO-59020, ISO-14046, VSME B06). These need cross-standard inheritance, which does not exist (§9).

Data-quality findings that are NOT this design but were surfaced (queued for the sign-off sheet, never auto-applied): contradictory or unguarded gates (M-187 REQ-02/03/04, M-205 14 CR gates, 820-2 REQ-46/47, DIN-14021 tautologies), informative ranges hard-limited (16941-2 Tab. A.2/A.3), transcript/prod mismatches (M-1200-1 CR-004 vs Tab. 8, M-187 h_FK 0,2 vs ≥ 0,25), OCR gaps (A138 Tab. 10 image, ATV-A-704E no transcript).

## 3. Standing invariants (unchanged, binding)

1. Single-source derivation: each value produced once by one registered equation, read-only, inherited by reference; blank-with-upstream-cause when the source is not final.
2. SR-1 never-invent: options, table cells, thresholds only from the printed page, quoted verbatim; no invented cutoffs.
3. Owner ruling 2026-08-01: fixed options ⇒ selection, never free text.
4. Widget-choice decision table (vault `STRUCTURED-REGISTER-STANDARDIZATION.md`): closed set → select/checklist/fixed; variable items → register; fixed grid → grid; distinct quantities → section.

## 4. Shape taxonomy (closed) and method patterns (composed)

`fields.widget` is a closed enum of nine shapes; `visible_when` is an orthogonal modifier. Every one of the ~780 inventory items maps onto them; no tenth shape was needed.

| # | widget | Guideline cue | Control | Carrier | Semantics |
|---|---|---|---|---|---|
| 1 | `select_one` | singular "Art/Typ/Klasse/Verfahren", "eine der", "entweder…oder", a table whose row IS the thing | segmented ≤4 / select, grouped | `value_enum`, options in `enum_values` | key for lookups, gates, visibility |
| 2 | `select_many` | "und/oder", "ggf. mehrere", "eine oder mehrere", plural co-existing parts | grouped checklist; custom entry only if the list is printed as open | `value_json {selected:[]}` | `contains()`, `count()` |
| 3 | `lookup_fill` | "nach Tab. X", "Rechenwert", "Anhaltswert", limit rows "≥/≤/mindestens" | read-only with source badge "Tab. 9: 0,9"; "abweichend" toggle only if policy allows, reason required, original stays visible | scalar + sidecar `{table_value, override, reason}` | `lookup(table, key…, col)`; role `value` (feeds equations) or `limit` (feeds a gate) |
| 4 | `register` | "je … eine Zeile", "Teilfläche i", "Σ über i", the owner's "+" | row editor with typed columns, per-row lookup cells, add/remove, footer with derived outputs | `value_json {rows:[…]}`, columns in `ui_config.columns` | `sum_rows / count_rows / max_rows / min_rows / mean_rows / stdev_rows / last_rows`; outputs are registered equations, materialised on save |
| 5 | `grid` | both axes closed and printed (KG × Stufe, Assessor × Dimension) | matrix | `value_json {cells}` | `cell(sym,'r','c')`, row/col sums as equations |
| 6 | `reference` | "verwendete Tabelle", "gewählter Anlagentyp" | select over rows of another carrier (own or inherited) | row id | resolves to the row; never a copied value |
| 7 | `derived` | "ergibt sich aus", "Gl. (n)", "= Σ", a computed matrix cell | locked value + engine card, blank-with-cause | `source_type='derived'` | exactly one equation |
| 8 | `attestation` | "ist sicherzustellen", "ist zu beachten" | checkbox + citation | boolean | gate `sym == true` |
| 9 | `scalar` | "ist zu ermitteln/messen/anzugeben" and nothing predetermined | today's number/text/date | typed columns | as today; free text only with the sentence that leaves it open |
| ⊕ | `visible_when` | "bei / wenn / nur für / im Mischsystem / sofern" | field or section hidden | text (compliance DSL) | hidden ⇒ null; gates on hidden symbols ⇒ `not_applicable` |

**Method patterns** (what the guidelines actually do, composed from the shapes — these are the "other ways" beyond selection and table fill):

| Method pattern | Composition | Where it appears |
|---|---|---|
| Readings / sample table with fitted aggregate | `register` + `mean_rows/stdev_rows` + per-row `derived` column | DIN-18130-1 k readings → k_T → k_10; M-1200-2 16 paired LRV samples → MW/SD/P10/P50; M-205 log reduction; ATV-A-704E multiple determinations |
| Rolling acceptance rule | `register` + `last_rows(reg, n)` + `count_rows(cond)` | A-262E "4 of last 5 samples"; M-1200-2 15/16 vs 8/16 |
| Method / variant switch | `select_one` driver + `visible_when` on sections + gates guarded by the driver | M-187 Sonderanwendung, M-205 Verfahren, DIN-1989-2 Filtertyp, FLL-GAR Abdichtungsart, FLL-Naturteich Typ, A-178 System, 16941-2 Verfahren, VSME Option A/B, DIN-14021 claim type |
| Status against use-dependent guide values | `select_one` use + `lookup_fill` role `limit` + `derived` status | 16941-2 Tab. D.1/D.2 Richtwerte → Ampel per sample; M-1200-1 Tab. 8; M-205 Leitorganismen |
| Test-run sequence producing a curve | ordered `register` (step from a printed table) + `derived` per row + aggregate | DIN-1989-2 Tab. 2 steps → η-curve; ISO-5667-10 schedule rows from Formula 1/2 |
| Multi-party assessment grid | `register` with a `grid` column + `mean_rows/stdev_rows` | M-820-1 Tab. A.1 (3 assessors × P/S), reused on 820-2-10 |
| Decision path / feasibility | criteria fields (`select_one`/`attestation`) + one `derived` equation with `if()` chain | A138 Tab. 3 feasibility (col-2 all → feasible; any col-4 → not); M-1200-1 Tab. 7 strictest-class rule |
| Catalogue with per-item rating | `register` seeded verbatim from the printed catalogue (rows fixed, rating editable) + `count_rows` | M-820-3 174 QE items; M-820-1 legal bases; ISO-59004 principles |
| Class chain | `select_one` → `lookup_fill` (class column) → second `lookup_fill` keyed by the derived class | A138 Tab. 5 → tier → Tab. 6 limit; M-1200-1 crop → class → Tab. 8 limits; A-262E filter × size × sewer → Tables 3–16 |
| Per-flow / per-stream rows | `register` with per-row equations (A.1–A.7) | ISO-59020 flows; ISO-46001 water streams; ISO-14046 elementary flows; VSME sites |
| Parallel systems of different technology | `register` whose row carries a **row-type discriminator** (`select_one` column, e.g. technology/filter type); the discriminator drives per-row `visible_when` of columns, which lookup table applies, and the row's limits; aggregates run over all rows, per-technology aggregates via `sum_rows(reg, if(type=='x', …))` | A-262E parallel Filterstufen of different types; M-1200-2 Verfahrenskette stages; M-187 Teilfilterbecken; FLL-Naturteich filter units (technique + flow direction); DIN-1989-1 several Speicher/Pumpen |

**Row-type discriminator (owner, 2026-09-11 approval note).** A register column may be declared `discriminator: true`; `ui_config.columns[i].visible_when` and `lookup` may reference the discriminator, so one register holds parallel systems of different technology without one worksheet per technology. Per-row outputs stay inside the row; only aggregates materialise to symbols (§9 risk 5).

## 5. Declarative configuration (additive schema)

### 5.1 `fields` — four nullable columns, `worksheet_sections` — one

```sql
ALTER TABLE fields
  ADD COLUMN widget       text CHECK (widget IN ('select_one','select_many','lookup_fill','register','grid','reference','derived','attestation','scalar')),
  ADD COLUMN ui_config    jsonb,
  ADD COLUMN lookup       jsonb,
  ADD COLUMN visible_when text;
ALTER TABLE worksheet_sections ADD COLUMN visible_when text;
```
`widget IS NULL` ⇒ renderer infers from `data_type` exactly as today, so the ~4 000 unmigrated fields do not change behaviour. Options for shapes 1/2 live only in `enum_values`. `ui_config`/`lookup` are JSON-schema validated by the importer (`scripts/_pass3c-validate.ts`).

### 5.2 `regulation_tables` + `regulation_table_rows` (new)

Table: `(standard_code, edition, table_code)` unique; `title_de`, `clause_reference`, `page_ref`, `key_columns text[]`, `value_columns jsonb`, `override_policy` ∈ `locked | anhaltswert | kann | messwert`, `override_quote`, `verification_status`. Rows: `row_key`, `keys jsonb`, `group_label`, `label_de`, `order_index`, `values jsonb`, `verbatim_quote text NOT NULL`. Rows are immutable once `engineer_verified`; a change is a new edition. Full DDL and three worked examples (A138 Tab. 9 with a byte-identical `SurfaceRow`; DIN-1989-1 `e` ← Tab. 3; FLL-GAR Tab. 22 two-key limit) are in `ARCH-PROPOSAL-fable.md` §2.

### 5.3 Code keeps only

Widget renderer registry `WIDGETS[widget]`; one carrier normaliser driven by `ui_config.columns`; accessor `lookupRow(std, edition, table, keys)`; formula functions; one generic materialiser; the four justified bespoke engines (KOSTRA 2-D grid, basin governing-duration argmax, ASM geometry sweeps, VSME CO₂ factors). The 3-assessor risk register stays bespoke until the `grid` column type ships, then migrates with its 25 tests as the pin.

## 6. Runtime

- **One renderer path.** `worksheet-form.tsx` stops finding carriers by literal symbol and excluding them from the grid; `renderField(f)` dispatches on `f.widget ?? inferWidget(f)`. Registers render inside their section (`ui_config.placement`, A138 pins `bottom`). `visibleFields()` additionally evaluates `visible_when` with `compliance/evaluate.ts`: `fail` ⇒ hidden and supplied as null; `pending|manual` ⇒ shown (fail-safe).
- **One expression language.** Extract one tokenizer/parser (`src/lib/expr/`) with two entry points (`evalCondition`, `evalNumber`) so `visible_when`, gates and equations cannot drift. Functions added: `if`, `lookup`, `sum_rows`, `count_rows`, `max_rows`, `min_rows`, `mean_rows`, `stdev_rows`, `last_rows`, `contains`, `cell`. `engine-eligibility.ts` remains the only admission path.
- **Derivation by formula string, not by UUID-keyed aggregator.** The six A138-07 aggregators become equation rows (e.g. `A_C = sum_rows(surface_inventory, area_m2 * c_i)`); client engine and server materialiser evaluate the same string. `materializeSurfaceOutputs` and the pollutant block become one `materializeDerivedOutputs`. `derivedOutputSymbols()` unchanged.
- **Upstream cause generalised.** `surfaceSourceState` → `carrierSourceState(carrier, ui_config, status)`; withhold every symbol produced over that carrier when the source is not final.
- **Inheritance unchanged** (same-standard `consumer_worksheets`, own-wins, ambiguity drops). Registers inherit as read-only tables; `reference` fields resolve against inherited carriers as `rainfall_table_ref` does today.
- **Gates.** New result kind `not_applicable` when a gate references a hidden symbol, rendered as N.A. (the state the conformity panel already has). Importer forbids `visible_when` on a produced symbol that other worksheets consume.

## 7. Guideline-fidelity rules (encoder procedure)

Per field, first hit wins, cue quoted into `verification_quote`: (1) computed by the guideline → `derived`; (2) pointer → `reference`; (3) arbitrary number alike → `register`; (4) both axes closed → `grid`; (5) printed table gives a value per class → key `select_one` + target `lookup_fill` (role `limit` if bounded); (6) fixed options → `select_one`/`select_many`; (7) duty without number → `attestation`; (8) else `scalar` with the sentence that leaves it open; (9) meaningful only under a condition → add `visible_when`.

Single vs multi: single for "eine der", "entweder…oder", singular category nouns, exclusive tiers, tables whose row is the thing; multi for "und/oder", "ggf. mehrere", "eine oder mehrere", "mindestens eine der folgenden", plural co-existing parts. Tie-break: can two apply to the same object at once? If each option also carries attributes → `register`. Audit hits to fix: 16941-2 `behandlungsstufen` and `grauwasser_herkunft`, DIN-1989-1 `steuerung_funktionen` are single today.

Override policy per table from the guideline's own words, quoted in `override_quote`: `locked` ("ist anzusetzen", "gilt", "muss", every limit row, tier mappings) → no override, deviation goes to the documented-deviation workstream; `anhaltswert` ("Anhaltswert", "Richtwert", "in der Regel", "kann angepasst werden") → toggle + reason, table value stays visible; `kann` (printed alternatives, A-178 Tab. 1 η_VS 0 / 0,2) → choice among printed alternatives only; `messwert` ("sofern keine Messwerte vorliegen") → measured value replaces table value with provenance field required.

## 8. Migration path (each phase independently rollback-able: `widget = NULL` restores today's path)

- **Pre-step (blocking).** `_wt-fll` (feat/fll-revision) holds the 38 selection configs, three editors, risk register and 16 migrations UNCOMMITTED, based on 11dde93; its `worksheet-form.tsx` diff removes the pollutant register, `clientSuppliedByFieldId` and `serverComputedFieldIds` that main added since. Commit that work on its branch, rebase onto main a57c081, resolve the form conflict, run the suite. Nothing else starts before this.
- **Phase 0 — schema.** Four `fields` columns, `worksheet_sections.visible_when`, the two `regulation_*` tables, importer JSON schema. `pnpm test` unchanged.
- **Phase 1 — tables + pins.** Seed TAB9 (30 rows from `tab9.ts`), TAB5 (+`tier`), TAB6, TAB13, then DIN-1989-1 TAB3, FLL-GAR TAB22, A-262E Table 1, M-1200-1 TAB7/8/23/27 from transcripts with verbatim quotes. Pins: `getTab9Entries()` deep-equals DB rows; `tab6Limit()` equals `lookupRow('TAB6', …)`. Accessors switch to DB behind the same signatures.
- **Phase 2 — the 38 configs.** Script emits one migration per standard (`widget`, `ui_config`, options into `enum_values`). Pin: `fromDbField(row)` deep-equals `SELECTION_CONFIGS[symbol]` for all 38, then the TS registry is deleted. Explicit conflict: `a138_anlagentyp_kandidaten` prod `enum_values` vs config labels → keep prod.
- **Phase 3 — A138 editors.** `surface_inventory` → register config; pins = every `surface-inventory*`, `surface-source-state` test and the PLT-HS-01 case (`Gewächshausdach` drops to reselection; `A_C 4826.43 / C_m 0.9` baseline holds). `pollutant_register` → register + three `sum_rows` equations (pin = B04 tests). `rainfall_table_ref` → `reference`; `soil_bodenart_tab13`/`a_s_m_provenance` → `visible_when`.
- **Phase 4 — expression language + materialiser.** `src/lib/expr/`, the row functions, six A138-07 equations as formulas, delete `makeSurfaceAggregator`, generic `materializeDerivedOutputs`, `ac_as_ratio_limit` → TAB6 lookup role limit, risk register → register + grid column. Pin: engine parity — each retired aggregator's recorded fixtures equal the formula result.
- **Phase 5 — encode the 29 inventories.** Priority order by engineer time saved (§10). Each item is a verify-against-the-transcript task with SR-1 quotes; no worksheet collapsing yet.
- **Phase 6 (separate design).** Row-scoped and cross-standard inheritance: A-262E "one Filterstufe register instead of 13 worksheets", M-1200-2 Verfahrenskette stages, the shared sample-QA and project-identity blocks. Not started until designed.

## 9. Risks and mitigations

1. Two expression languages drift → one parser, two entry points (§6).
2. Tables as data erode SR-1 silently → `verbatim_quote NOT NULL`, verification gate before prod resolution, immutable editions, `scripts/verify-regulation-tables.ts` diffing rows against transcripts.
3. `visible_when` × gates × inheritance → hidden ⇒ null, `not_applicable` gate kind, importer forbids hiding consumed producers.
4. The A138 pattern's own weak points copied → override sidecar with reason + policy; `kind`/`tier` as table columns; equations by formula; materialiser inputs from `equations.input_symbols`.
5. Registers replacing worksheets change inheritance topology → only aggregates materialise to symbols; per-row consumption through `reference`; no collapse before Phase 6.
6. Uncommitted worktree work is lost or merged stale → pre-step commits and rebases it first.

## 10. Phase-5 rollout order (first 10, by time saved, all from the inventories)

1. DWA-A-138-1: Tab. 5 → tier → Tab. 6/7 limits; Tab. 3 feasibility derived; Tab. 11 method → `f_methode`; collapse the ~40 re-typed duplicates into inherited values.
2. DIN-1989-1: Auffangflächen rows with `e` from Tab. 3 (shareable with A138-07 roof rows); Verbraucher rows from Tab. 4 → one `BW_a`.
3. DWA-A-262E: Table 1 pretreatment lookup; Tables 3–16 limits by (filter × size × sewer); `sewer_system_type` section visibility; inherit EZ/w_s_d.
4. DWA-M-277E: Grauwasserquelle rows (Table 2) → type A1/A2/B1/B2 + Σ Q_GW; Verbraucher rows → Q_SW + max quality category.
5. DWA-M-1200-1/-3: Tab. 7 crop → class (strictest rule) → Tab. 8 limits; Schlag rows with Karenzzeit/Emitterabstand/Tab. 7–9 factor per row.
6. FLL-GAR-2023: `abdichtungs_art` master switch; Tab. 1 slope, Tab. 22 seam, Tab. 26/27 layers; sealing build-up rows.
7. FLL-Naturteich: `natural_pool_type` master selector; filter units as rows with Tab. 10–12 limits; zones as rows.
8. DWA-M-820-3: item-level QE checklists (174 items) with counts and percentages derived (~100 hand-typed numbers removed).
9. DIN-18130-1: readings table → k_T → k_10; `gefaelle_typ` switch.
10. DWA-M-205 / M-187: process/variant switch arming only the chosen branch; Leitorganismus target table per class.

## 11. Tests

Unit (vitest): expression parser (conditions + numbers + row functions, error/pending/manual states); normaliser per column type incl. lookup refill and override; `lookupRow` keys; `visibleFields` with `visible_when`; gate `not_applicable`. Pins named in §8 per phase. Render tests: generic `RegisterEditor` with the A138 fixture reproduces every current `surface-inventory-editor` assertion. Integration: `materializeDerivedOutputs` round-trip against embedded Postgres for A138-07 and B04.

## 12. Out of scope

Changing any verified equation's math; cross-standard inheritance (Phase 6); the documented-deviation capability (own workstream, referenced by `locked` policy); collapsing worksheets; applying any of the data-quality findings in §2 without sign-off.

## 13. Decisions requested from the owner (ratify asynchronously; none blocks Phases 0–4)

- D-1 `a138_anlagentyp_kandidaten`: keep prod `enum_values`, drop the config's label list (recommended).
- D-2 Phase 6 ordering: A-262E filter register vs M-1200-2 process chain first.
- D-3 The §2 data-quality contradictions go to the sign-off sheet as one consolidated file with verbatim evidence.
