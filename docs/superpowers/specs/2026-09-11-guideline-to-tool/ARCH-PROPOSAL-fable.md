# ARCH-PROPOSAL — generic "guideline → tool" field mechanism (EKOWAI-Wizard)

Architect: Fable 5.1 · 2026-09-11 · read-only pass over main @ a57c081, worktree `_wt-fll` @ 5cc524e (merge-base 11dde93 — **behind main**), prod dumps `scratchpad/std/*.json` (29 standards), inventories DWA-A-262E / DWA-A-178 / DWA-M-1200-1.

Ground truth used: `src/lib/eval/tab9.ts`, `surface-inventory.ts`, `tab6-loading.ts`, `asm-source.ts`, `formula.ts`, `arithmetic.ts`, `engine-eligibility.ts`, `derived-output-symbols.ts`, `materialize-surfaces.ts`, `surface-source-state.ts`, `rainfall-tables.ts`, `merge-inherited-fields.ts`, `src/lib/compliance/evaluate.ts`, `src/lib/actions/worksheet.ts` (:652 materialize, :712 pollutant sums), `src/lib/actions/materialize-registry.ts`, `src/components/worksheet/worksheet-form.tsx` (:466-497 symbol finds, :522-541 grid exclusions, :806-850 bottom sections), `dynamic-field.tsx` (:631-792 json checklist), `src/lib/db/schema.ts` (:178-226 fields, :355-388 project_parameters), and `_wt-fll/src/lib/eval/selection-fields.ts` (24 registers + 14 checklists).

---

## 1. Widget taxonomy (closed list — 9 shapes + 1 modifier)

`widget` is a closed enum. Everything a guideline can print maps to exactly one shape; `visible_when` is orthogonal and applies to any field or section.

| # | `widget` | Guideline cue (how you recognise it on the page) | UX control | Data carrier | Evaluation / derivation semantics | Example from the 29 |
|---|---|---|---|---|---|---|
| 1 | `select_one` | "Art / Typ / Klasse / Verfahren" in the singular; "eine der …"; "entweder … oder"; a table whose **row header** is the thing you are ("Flächengruppe", "Anwendungsfall") | Segmented (≤4) / Select, options grouped by printed group | `value_enum` = option `value`; options in `fields.enum_values` (existing) | Key for `lookup()`, `IN {}` gates, `visible_when`. Never free-typed. | DWA-A 138-1 `flaechengruppe` (Tab. 5, 19 codes); DIN 1989-1 `auffangflaechen_art` (Tab. 3); FLL-GAR `fuegeverfahren` (Tab. 22) |
| 2 | `select_many` | "und/oder"; "ggf. mehrere"; "eine oder mehrere"; "Quellen / Funktionen / Stufen" in the plural where several co-exist on one object; printed list with "z. B." | Checklist (grouped), "Eigener Eintrag" only when the guideline says the list is open | `value_json = { "selected": string[] }`; options in `enum_values`; `ui_config.allow_custom` | `contains(sym,'x')`, `count(sym)`; gates via `IN`/`IS NOT EMPTY` | DWA-M 277E `source_set` (Tab. 2); A138-15 `a138_anlagentyp_kandidaten` (§6); DIN EN 16941-2 `behandlungsstufen` (§5.3 "mindestens eine oder mehrere Teilschritte" — **mis-encoded as `enum` today**) |
| 3 | `lookup_fill` | A table with a class column and value columns: "nach Tab. X", "Rechenwert", "Anhaltswert", "kann … angesetzt werden", or a limit row "≥ / ≤ / mindestens / höchstens je …" | Key field(s) are shape 1; the target renders **read-only with source badge** ("Tab. 9: 0,9"); "abweichend" toggle only when `override_policy ≠ locked`, then editable with the original kept visible + reason | Target is a normal scalar field; sidecar in `project_parameters.value_json` of the target: `{ "table_value": 0.9, "override": true, "reason": "…" }`; `fields.lookup` holds the binding | `lookup(table, key1[, key2], col)`; role `value` (feeds equations) or `limit` (feeds a gate `x <= sym`) | A138 Tab. 9 (`c_i`,`c_s` per row); DIN 1989-1 `e` ← Tab. 3 by `auffangflaechen_art`; A262E `B_CSB` ← Table 1 by `pretreatment_selected`; A178 `eta_VS` ← Tab. 1 (0 / 0,2 "kann"); FLL-GAR `nahtbreite_min_mm` ← Tab. 22 by (`fuegeverfahren` × `bahn_material_naht`), role limit; A138 Tab. 6 by (tier × BBZ band), role limit |
| 4 | `register` | "je … eine Zeile"; "Teilfläche i"; "Σ über i"; "mehrere Anlagen/Filterstufen/Proben"; the owner's "+" | Row editor: typed columns, per-row `lookup_fill` cells, add/remove, footer showing the register's derived outputs | `value_json = { "rows": [{ "id", …cols }] }`; columns in `ui_config.columns` | Row-scoped functions in equations: `sum_rows(reg, expr)`, `count_rows`, `max_rows`, `min_rows`; row completeness = all `required` columns non-null; outputs are `derived` equations, materialised on save | A138-07 `surface_inventory`; A178 Teilflächen (Gl. 2/3 `Σ(A_E,b,a,i · b_R,a)`); DWA-M 1200-1 Flächenverzeichnis (CR-015); M820-2 `change_orders` (Σ €) |
| 5 | `grid` | **Both** axes closed and printed (KG × Kostenermittlungsstufe; Assessor × Dimension) | Matrix input | `value_json = { "cells": { "<row>|<col>": v } }` with `ui_config.rows/cols` | Cell address `cell(sym,'r','c')`; row/col sums as equations | DIN-276 KG × stage (today 450 scalar fields on 29 sheets — legal as fixed fields, `grid` is the compact form); risk-register 3 assessors × 2 dims |
| 6 | `reference` | "verwendete Tabelle/Quelle"; "gewählter Anlagentyp"; a field that names *which* entry of another carrier applies | Select over the rows/ids of a referenced carrier (own or inherited) | `value_text` = row id / option value; `ui_config.ref = { symbol, label_col }` | Resolves to the referenced row for `lookup`/engine; never a copied value | A138 `rainfall_table_ref` → `r_D_n_table`; A138-15 `facility_type_selected` → candidate list |
| 7 | `derived` | "ergibt sich aus"; "Gl. (n)"; "= Σ"; a table cell the guideline computes (Tab. 23 Risikomatrix result) | Locked value + inline engine card, blank-with-cause when upstream not final | `project_parameters.source_type='derived'` (existing) | Exactly one registered equation (`equations` row) — arithmetic, lookup, or row function | `A_C`, `C_m` (A138-07); `E_R` (DIN 1989-1 Gl. 1); `risikoniveau_ausgangs` = `lookup('TAB23', ew, sa, 'niveau')` (M1200-1) |
| 8 | `attestation` | Duty with no measurable value: "ist sicherzustellen", "ist zu beachten", "sind zu berücksichtigen", "meldepflichtig" | Checkbox + optional citation | `value_boolean` | Gate `sym == true`; `isAttestationCondition` (attestation.ts) folds in | DIN 1989-1 `meldepflicht_erfuellt`, `schallschutz_din4109` |
| 9 | `scalar` (`number`/`text`/`date`) | "ist zu ermitteln / zu messen / anzugeben" and the guideline predetermines nothing | Existing DynamicField number/text/date | typed columns (existing) | as today | `A_A`, `h_N` (DIN 1989-1), `bauteildicke_cm` (FLL-GAR) |
| ⊕ | **modifier** `visible_when` | "bei / wenn / nur für / im Mischsystem / falls zutreffend / sofern" | Field or section hidden; hidden ⇒ value treated as null by engine and gates (N.A.) | `fields.visible_when` text (compliance DSL) | Evaluated per render with `compliance/evaluate.ts`; `pending`/`manual` ⇒ shown (fail-safe) | A178 `e_0` only `system_type == 'misch'`; M1200-1 `legionella_value` only `aerosolrisiko == true`; A138-12 `soil_bodenart_tab13` only `a_s_m_determination_method == 'soil_estimate'` (today `dynamic-field.tsx:164-169` hard return) |

Free text is shape 9 `text` and is the last resort: allowed only when the encoder can cite that the guideline leaves the content open.

---

## 2. Declarative field configuration

Three components; all additive to the current schema (`schema.ts:178-226`, `:228-252`).

### 2a. `fields` — four nullable columns

```sql
ALTER TABLE fields
  ADD COLUMN widget        text CHECK (widget IN ('select_one','select_many','lookup_fill','register','grid','reference','derived','attestation','scalar')),
  ADD COLUMN ui_config     jsonb,   -- presentation + carrier schema (shape-specific, JSON-schema validated by the importer)
  ADD COLUMN lookup        jsonb,   -- data binding to regulation_tables (shape 3, or per-column inside ui_config.columns)
  ADD COLUMN visible_when  text;    -- compliance-DSL condition; NULL = always visible
ALTER TABLE worksheet_sections ADD COLUMN visible_when text;
```

Rules: `widget IS NULL` ⇒ renderer infers from `data_type` exactly as today (zero behaviour change for the ~2 700 unmigrated fields). Options for shapes 1/2 live **only** in `enum_values` (already `{value,label_de,label_en,order_index}`); `ui_config.groups` references values, never re-lists labels. `validation_rules` keeps `{raw}`; the structured keys `{min,max,maxLength,extensible}` stay.

### 2b. `regulation_tables` + `regulation_table_rows` (new)

```sql
CREATE TABLE regulation_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code text NOT NULL,            -- 'DWA-A-138-1'
  edition text NOT NULL,                  -- '2024-10'
  table_code text NOT NULL,               -- 'TAB9'
  title_de text NOT NULL, clause_reference text, page_ref text,
  key_columns text[] NOT NULL,            -- ['surface_type'] | ['tier','bbz_band']
  value_columns jsonb NOT NULL,           -- [{"name":"cm","unit":"-","type":"number"},…]
  override_policy text NOT NULL CHECK (override_policy IN ('locked','anhaltswert','kann','messwert')),
  override_quote text,                    -- verbatim sentence that grants (or denies) deviation
  verification_status text NOT NULL DEFAULT 'imported_unverified',
  UNIQUE (standard_code, edition, table_code)
);
CREATE TABLE regulation_table_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES regulation_tables ON DELETE CASCADE,
  row_key text NOT NULL,                  -- 'schwarzdecke_asphalt' | 'tier2|thick'
  keys jsonb NOT NULL,                    -- {"surface_type":"schwarzdecke_asphalt"} | {"tier":"tier2","bbz_band":"thick"}
  group_label text, label_de text NOT NULL, order_index int NOT NULL DEFAULT 0,
  values jsonb NOT NULL,                  -- {"cm":0.9,"cs":1.0,"kind":"paved","group":1}
  verbatim_quote text NOT NULL,           -- SR-1: the printed row, quoted
  UNIQUE (table_id, row_key)
);
```

`edition` on the table, not on each row (mirrors `Tab9Entry.standard/edition`, tab9.ts:21-22). Rows are immutable after `verification_status='engineer_verified'` — changes are new editions, never UPDATEs.

### 2c. Code (what stays in TS)

Widget renderer registry (`WIDGETS[widget]`), one carrier normaliser driven by `ui_config.columns`, the accessor `lookupRow(std, edition, table, keys)`, the formula functions, and the generic materialiser. No standard-specific data in code except the four bespoke engines listed in §3.

### Worked example A — A138 Tab. 9 inside `surface_inventory` (A138-07)

`regulation_tables` row:
```json
{ "standard_code":"DWA-A-138-1","edition":"2024-10","table_code":"TAB9",
  "title_de":"Abflussbeiwerte je Oberflächentyp","clause_reference":"§5.3.3.5, Tab. 9",
  "key_columns":["surface_type"],
  "value_columns":[{"name":"cm","type":"number","unit":"-"},{"name":"cs","type":"number","unit":"-"},{"name":"kind","type":"enum","values":["paved","unpaved"]},{"name":"group","type":"number"}],
  "override_policy":"anhaltswert",
  "override_quote":"C_i – Abflussbeiwert der Teilfläche, zum Beispiel gemäß Tabelle 9" }   /* Gl. 2 legend, transcript L1248ff (inventory DWA-A-138-1.md); Tab. 9 caption "Empfohlene Abflussbeiwerte" */
```
Two of the 30 rows (values as in tab9.ts):
```json
{ "row_key":"schwarzdecke_asphalt","keys":{"surface_type":"schwarzdecke_asphalt"},"group_label":"Wasserundurchlässige Flächen","label_de":"Schwarzdecken (Asphalt)","order_index":11,"values":{"cm":0.9,"cs":1.0,"kind":"paved","group":1},"verbatim_quote":"«Tab. 9 row — verbatim»" }
{ "row_key":"park_flach","keys":{"surface_type":"park_flach"},"group_label":"Durchlässige Flächen","label_de":"Parkanlagen/Rasen/Gärten – flaches Gelände","order_index":28,"values":{"cm":0.1,"cs":0.2,"kind":"unpaved","group":3},"verbatim_quote":"«Tab. 9 row — verbatim»" }
```
`fields` row for `surface_inventory` (data_type stays `json`):
```json
{ "widget":"register",
  "ui_config":{
    "title":"Flächenverzeichnis","subtitle":"Tab. 9 — C_i für Gl. 2 und C_s für Gl. 10","add_label":"+ Fläche","placement":"bottom",
    "columns":[
      {"key":"label","type":"text","label":"Bezeichnung","required":true},
      {"key":"tab9_value","type":"lookup_key","label":"Oberflächentyp","required":true,
        "lookup":{"table_code":"TAB9","group_by":"group_label"}},
      {"key":"area_m2","type":"number","label":"A","unit":"m²","required":true,"min":0},
      {"key":"c_i","type":"lookup_value","label":"C_i","required":true,"lookup":{"table_code":"TAB9","key_column":"tab9_value","value":"cm"}},
      {"key":"c_s","type":"lookup_value","label":"C_s","required":true,"lookup":{"table_code":"TAB9","key_column":"tab9_value","value":"cs"}},
      {"key":"kind","type":"derived","label":"befestigt/unbefestigt","expr":"lookup('TAB9', tab9_value, 'kind')"},
      {"key":"a_c_i","type":"derived","label":"A·C_i","expr":"area_m2 * c_i"}
    ],
    "override":{"flag_key":"coeff_override","applies_to":["c_i","c_s"],"policy":"anhaltswert"},
    "legacy_map":{"surface_type":{"asphalt":"schwarzdecke_asphalt","rasen":"park_flach"}},
    "footer":["A_C","A_E_ba","A_E_nba","C_m"]
  },
  "visible_when":null }
```
Equations (replace the six `makeSurfaceAggregator` entries, `aggregators.ts:815-834`):
```
Gl. 2   A_C          = sum_rows(surface_inventory, area_m2 * c_i)
Gl. 2a  A_C_sealed   = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))
Gl. 2b  A_C_unsealed = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2 * c_i, 0))
        A_E_ba       = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))
        A_E_nba      = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2, 0))
Gl. 2c  C_m          = A_C / sum_rows(surface_inventory, area_m2)
```
Row shape on disk is byte-identical to today's `SurfaceRow` (`surface-inventory.ts`), so no data migration.

### Worked example B — DIN 1989-1 `e` (Ertragsbeiwert) ← Tab. 3 by `auffangflaechen_art` (DIN-1989-1-02 → -04)

Prod today: `auffangflaechen_art` enum (7 values, description "bestimmt … Ertragsbeiwert (Tab.3)") and `e` is a free number ("nach Tab.3 (0,3 Gruendach intensiv bis 0,8 Hartdach/Asphalt)"). Config:
```json
/* regulation_tables */ { "standard_code":"DIN-1989-1","edition":"«printed edition»","table_code":"TAB3","key_columns":["auffangflaechen_art"],
  "value_columns":[{"name":"e","type":"number","unit":"-"}],"override_policy":"anhaltswert",
  "override_quote":"Als Planungsgrundlage … können die Werte nach Tabelle 3 verwendet werden" }   /* §16.3.4, transcript L844 + footnote a "Abweichungen je nach Saugfähigkeit und Rauheit" (inventory DIN-1989-1.md) */
/* rows — every cell from the printed table; the two values named in prod: */
{ "row_key":"gruendach_intensiv","keys":{"auffangflaechen_art":"gruendach_intensiv"},"values":{"e":0.3},"verbatim_quote":"«Tab. 3 row»" }
{ "row_key":"geneigtes_hartdach","keys":{"auffangflaechen_art":"geneigtes_hartdach"},"values":{"e":0.8},"verbatim_quote":"«Tab. 3 row»" }
/* fields.e */ { "widget":"lookup_fill",
  "lookup":{"table_code":"TAB3","role":"value","keys":[{"column":"auffangflaechen_art","from_symbol":"auffangflaechen_art"}],"value":"e"} }
```
`auffangflaechen_art` is inherited into DIN-1989-1-04 by the existing `consumer_worksheets` path; `e` renders locked with "Tab. 3: 0,8", override allowed with reason (policy `anhaltswert`). Gl. 1 `E_R = A_A * e * h_N * eta` is untouched.

### Worked example C — FLL-GAR `nahtbreite_min_mm` ← Tab. 22 by two keys, role `limit`

```json
/* regulation_tables */ { "standard_code":"FLL-GAR-2023","edition":"2023","table_code":"TAB22","key_columns":["fuegeverfahren","bahn_material_naht"],
  "value_columns":[{"name":"min_mm","type":"number","unit":"mm"}],"override_policy":"locked","override_quote":null }
/* one row per printed (Verfahren × Material) cell; e.g. */
{ "row_key":"heissluft_heizkeil|FPO","keys":{"fuegeverfahren":"heissluft_heizkeil","bahn_material_naht":"FPO"},"values":{"min_mm":"«printed»"},"verbatim_quote":"«Tab. 22 cell»" }
/* fields.nahtbreite_min_mm */ { "widget":"lookup_fill","lookup":{"table_code":"TAB22","role":"limit",
  "keys":[{"column":"fuegeverfahren","from_symbol":"fuegeverfahren"},{"column":"bahn_material_naht","from_symbol":"bahn_material_naht"}],"value":"min_mm"} }
/* new engineer input `nahtbreite_ist_mm` (scalar) + gate: nahtbreite_ist_mm >= nahtbreite_min_mm */
```
Today the field is a free number with `vr.raw ">= 20/30/40/60 per Tab.22"` — the engineer types the limit, exactly the never-free-type violation. A138 Tab. 6 is the same shape (`tier` derived from `flaechengruppe` via a TAB5 row column `tier`, `bbz_band = if(bbz_thickness >= 0.30,'thick','thin')`, then TAB6 lookup role `limit`) and replaces `tab6-loading.ts:63` + `FLAECHENGRUPPE_CODES`.

---

## 3. Runtime architecture

**One renderer path.** `worksheet-form.tsx` stops calling `fields.find(f => f.symbol === '…')` (`:466-497`) and stops excluding symbols from the grid (`:522-541`). `renderField(f)` dispatches `WIDGETS[f.widget ?? inferWidget(f)]`; `inferWidget` maps `data_type` → `scalar|select_one|attestation` and `json + enum_values` → `select_many`, so unmigrated fields render as today. Register/grid/reference editors render **inside their section** (`ui_config.placement`, default `section`; A138 pins `bottom` to keep today's layout). `visibleFields()` (`components/worksheet/visible-fields.ts`) grows a second filter: `visible_when` evaluated with `evaluateCondition(cond, valuesBySymbol)` from `compliance/evaluate.ts` — `pass` ⇒ shown, `fail` ⇒ hidden and the symbol is supplied as `null` to engine and gates, `pending|manual` ⇒ shown. Sections get the same column so A262E can show A262-05 or -06 by `sewer_system_type`.

**One carrier normaliser.** `normalizeCarrier(raw, ui_config)` generalises `_wt-fll/selection-fields.ts normalizeRegister` with column types `text|number|boolean|enum|date|lookup_key|lookup_value|derived|grid`. `lookup_value` cells: when the key changes and `override` is false, the cell is refilled from the table (today `selectType()`, `surface-inventory-editor.tsx:59-63`); `rowMismatch` becomes generic (`cell !== lookup(...)`); `legacy_map` replays `LEGACY_LABEL_MAP` + unique-pair matching once and is dropped after backfill. Row completeness = every `required` column non-null. Checklist carrier: reader accepts both today's flat `string[]` (`dynamic-field.tsx:679`) and `{selected}` (`checklist-editor.tsx:22`); writer always emits `{selected}`.

**Lookup accessor.** `src/lib/eval/regulation-tables.ts`: `getTable(std, edition, code)`, `lookupRow(std, edition, code, keys)` — the seam the spec reserved (`tab9.ts` header comment). Tables for the worksheet's standard load server-side with the template (one query) and are passed into the store; `tab9.ts`/`tab6-loading.ts` constants become **seed data + pin tests**, then thin shims over the accessor, then are deleted.

**Formula language.** Extend `arithmetic.ts` (functions whitelist `:29-47`) and `engine-eligibility.ts` (`SURVIVING_FN_CALL` `:33`) with: `if(cond, a, b)` (cond = comparison/`and`/`or` over numbers, strings, booleans), `lookup('TABLE', key…, 'col')` (string literals only inside these calls), `sum_rows(reg, expr)`, `count_rows(reg[, cond])`, `max_rows`, `min_rows`, `mean_rows`, `stdev_rows`, `contains(sym,'x')`, `cell(grid,'r','c')`. Row functions evaluate `expr` in a row scope where column keys shadow worksheet symbols. Decision **formula-language over aggregator-by-config**: the derived value is then produced by *one registered equation row* (invariant 1), the client engine (`use-equation-engine.ts`) and the server materialiser evaluate the **same string**, and the UUID-keyed `aggregators` map (`aggregators.ts:822-834`) disappears. `equation-profiles.ts` keeps units/aliases/displayOnly.

**Materialisation.** `materializeSurfaceOutputs` (`worksheet.ts:652`) and the pollutant block (`:712`) become one `materializeDerivedOutputs(tx, instance, templateEquations, values, tables)`: for every non-displayOnly equation whose inputs are in the saved batch or are carriers, evaluate and upsert `source_type='derived'` (existing upsert `:666-674`). `MATERIALIZE_REGISTRY` keeps its `MaterializeEntry` contract but `inputSymbols` come from `equations.input_symbols`, as the registry header already proposes. `derivedOutputSymbols()` is unchanged. Upstream-cause gating generalises `surfaceSourceState` → `carrierSourceState(carrier, ui_config, status)` and `surfaceWithholdFieldIds` → withhold every symbol produced by an equation over that carrier.

**Inheritance unchanged.** `consumer_worksheets` → `loadInheritedFields` → `mergeInheritedFields` (own wins, ambiguity drops) stays; a register inherits as a read-only carrier (generic `ReadOnlyRegisterTable` replaces `ReadOnlySurfaceTable`); `reference` fields resolve against the inherited carrier exactly as `rainfall_table_ref` does today.

**Removed / retired:** symbol branches in `worksheet-form.tsx` (`surface_inventory`, `rainfall_table_ref` picker wiring, `POLLUTANT_REGISTER_SYMBOL`, `_wt-fll`'s `risk_register`, `risk_mitigation_plan`, `SELECTION_CONFIGS[f.symbol]`); `dynamic-field.tsx` json-checklist branch (`:631-792`) and the `soil_bodenart_tab13`/`a_s_m_provenance` early returns (`:164-169`, → `visible_when`); `SELECTION_CONFIGS` TS registry (data moves to `fields.widget/ui_config`); six `makeSurfaceAggregator`s; `flaechengruppeToTier` + `tab6Limit` constants (→ TAB5/TAB6 rows); dead `sub-areas-editor.tsx`, `kostra-table-editor.tsx`; `materialize-surfaces.ts`, `surface-source-state.ts` (generalised).

**Must remain bespoke (each justified):** (1) `rainfall-tables.ts` 2-D KOSTRA grid + `RainfallTablesEditor` — a table *of tables* with source tagging and legacy-column resolution, whose consumer is (2); (2) basin Gl. 8 governing-duration iteration (`materialize-basin-governing`, `governing-duration.ts`) — an argmax over durations with boundary warnings, not expressible as a row function; (3) ASM geometry sweeps (`materialize-asm.ts`: Mulde/Rigole/Schacht sweeps, manual-reject logic) — iterative solvers with engineer-visible provenance; (4) VSME CO₂ engine (`actions/co2.ts`, 281 external factors) — an external factor DB with its own versioning. The 3-assessor risk register (`risk-register-editor.tsx`, 443 L) is expressible as `register` with a `grid` column (`ratings`: assessor × {p,s}) + `derived` M-Wert/S-Abw via `mean_rows`/`stdev_rows`; it stays bespoke until the `grid` cell type ships (phase 4), then migrates with its 25 tests as the pin.

---

## 4. Guideline-fidelity rules (encoder decision procedure)

Run per field, in order; stop at the first hit; record the verbatim cue in `fields.verification_quote`.

1. **Does the guideline compute the value?** ("ergibt sich", "Gl.", "= Σ", a matrix cell like Tab. 23) → `derived`; register the equation; never an input.
2. **Is it a pointer to another entry?** ("verwendete …", "gewählte …") → `reference`.
3. **Can there be an arbitrary number of these, each shaped alike?** ("je … eine Zeile", "i = 1…n", "Σ_i", "mehrere Teilflächen/Filterstufen") → `register`. Columns with printed choices are shapes 1/3 inside the row.
4. **Are both axes closed and printed?** → `grid`.
5. **Does a printed table give a value per class?** → key field = `select_one`, target = `lookup_fill`; role `limit` if the cell is bounded ("≥/≤/mindestens/höchstens"), else `value`.
6. **Does the guideline give a fixed set of options?** Decide single vs multi (below) → `select_one` / `select_many`. Owner ruling: never free text here.
7. **Is it a duty without a number?** → `attestation`.
8. Otherwise `scalar`; the encoder must quote the sentence that leaves the content open.
9. **Is the field only meaningful under a condition?** ("bei", "wenn", "nur für", "im Mischsystem", "sofern") → add `visible_when` naming the driver symbol, quoting the sentence.

**Single vs multi from wording.** `select_one`: "eine der", "entweder … oder", singular category nouns (Art, Typ, Klasse, Verfahren, Kategorie), exclusive tiers (A/B-1/…/D), any table whose row is *the* thing (Tab. 5, Tab. 7, Tab. 9 row). `select_many`: "und/oder", "ggf. mehrere", "eine oder mehrere", "mindestens eine(r) der folgenden", plural nouns of co-existing parts (Quellen, Funktionen, Behandlungsstufen, Rechtsgrundlagen). Tie-break: *can two options apply simultaneously to the same object?* — yes ⇒ multi; if each option additionally carries its own attributes ⇒ `register`. Audit hits in the dumps: DIN EN 16941-2 `behandlungsstufen` and `grauwasser_herkunft` are `enum` but the text says "eine oder mehrere" / lists co-existing sources ⇒ `select_many`; DIN 1989-1 `steuerung_funktionen` ("Moegliche Funktionen inkl. …") ⇒ `select_many`.

**Override governance per table** (`override_policy`, decided from the guideline's own words, quoted in `override_quote`):

| Policy | Wording cue | UI |
|---|---|---|
| `locked` | "ist … anzusetzen", "gilt", "muss", "darf nicht", every limit row (≥/≤), tier mappings (Tab. 5→Tab. 6) | no override; deviation is a documented-deviation (compliance_deviations, separate workstream) |
| `anhaltswert` | "Anhaltswert", "Richtwert", "in der Regel", "kann … angepasst werden" (A138 §5.3.3.5 for C) | "abweichend" toggle, reason required, table value stays visible |
| `kann` | "kann … angesetzt werden" with a printed alternative (A178 Tab. 1 fn 1: η_VS 0 or 0,2) | choice between the printed alternatives only; still a lookup, the alternative is a second key |
| `messwert` | "sofern keine Messwerte vorliegen", "If there is no available data … must be used" (A262E Table 1) | measured value replaces the table value; provenance field required (`datenquelle_*`), table value stays visible |

Values, options and thresholds come **only** from the printed page (SR-1); `regulation_table_rows.verbatim_quote` is NOT NULL for that reason and `regulation_tables.verification_status` gates use in prod. No cutoffs are invented: where the guideline prints examples without band boundaries (M820 risk priority), no `lookup_fill` may exist — the raw figure is shown and the cutoff goes to the sign-off sheet.

---

## 5. Migration path

**Pre-step (blocking).** `_wt-fll` is based on 11dde93; main (a57c081) has since added the pollutant register, `clientSuppliedByFieldId`, `serverComputedFieldIds` — the worktree's `worksheet-form.tsx` diff *removes* them. Rebase `_wt-fll` onto main before touching anything; the 16 `2026080122…37` migrations are description-only (`fields.description` UPDATEs) and merge cleanly.

**Phase 0 — schema (additive, no behaviour change).** Add the four `fields` columns, `worksheet_sections.visible_when`, the two `regulation_*` tables; extend `_pass3c-validate.ts` with a JSON schema for `ui_config`/`lookup`. Test: schema snapshot; `pnpm test` unchanged.

**Phase 1 — tables + pins.** Seed TAB9 (30 rows from `tab9.ts`), TAB5 (19 codes + `tier` column from `flaechengruppeToTier`), TAB6 (4 rows: tier2/3 × thin/thick), TAB13 (`asm-source.ts` 0.10/0.20), plus DIN 1989-1 TAB3, FLL-GAR TAB22, A262E TABLE1/…, M1200-1 TAB8/TAB23/TAB27 from the transcripts with verbatim quotes. Pin tests: `getTab9Entries()` deep-equals the DB rows; `tab6Limit(tier, t)` equals `lookupRow('TAB6', {tier, bbz_band})`. Accessors switch to DB behind the same signatures; all 53 eval tests stay green untouched.

**Phase 2 — the 38 SELECTION_CONFIGS entries.** A script reads `SELECTION_CONFIGS` and emits one SQL migration per standard: `widget = 'select_many'|'register'`, `ui_config = {title, subtitle, add_label, note, allow_custom, groups, columns}`; option lists move into `enum_values` (value = today's label string, so stored `{selected}` arrays keep matching). Conflict to resolve explicitly: `a138_anlagentyp_kandidaten` already has prod `enum_values` (`versickerungsflaeche`, …) that differ from the config's labels (`Flächenversickerung`, …) — keep prod values, drop the config list. `ChecklistEditor`/`StructuredRegisterEditor` gain a `fromDbField(f)` adapter; **pin test:** for each of the 38 symbols `fromDbField(dbRow)` deep-equals `SELECTION_CONFIGS[symbol]`, then the TS registry is deleted. `risk_register`/`risk_mitigation_plan` get `widget='register'` with `ui_config.editor='risk_register'` (bespoke component looked up by name) until phase 4.

**Phase 3 — A138 editors.** `surface_inventory` → example A config; `SurfaceInventoryEditor` becomes `RegisterEditor` + the TAB9 lookup column. Pins: every test in `surface-inventory.test.ts`, `surface-inventory-editor.test.tsx`, `surface-source-state`, the PLT-HS-01 migration case (`Gewächshausdach` drops to reselection, baseline `A_C 4826.43 / C_m 0.9` holds) — rerun against the generic normaliser with the A138 fixture. `pollutant_register` → register with three `sum_rows` equations (`AmountOfEmissionTo{Air,Water,Soil}`); pin = B04 tests. `rainfall_table_ref` → `reference`; `soil_bodenart_tab13`/`a_s_m_provenance` → `visible_when`.

**Phase 4 — formulas + materialiser.** Add `if/lookup/*_rows/contains/cell`; register the six A138-07 equations as formulas; delete `makeSurfaceAggregator`; generalise `materializeDerivedOutputs`; `ac_as_ratio_limit` → TAB6 `lookup_fill` role limit; risk register → register + grid column. Pin: engine parity test — for each retired aggregator, the formula result equals the aggregator result on the recorded fixtures.

**Phase 5 — encode the inventories.** A178 Teilflächen register, A262E Table 1/3–18 lookups + `sewer_system_type` section visibility, M1200-1 Tab. 7→class derivation, DIN 1989-1 TAB3, FLL-GAR TAB22/TAB8 limits. Each a verify-against-the-PDF task with SR-1 quotes; no worksheet collapsing (A262E's 13 filter sheets stay until inheritance topology for per-row outputs is decided — §6.5).

Ordering rationale: nothing user-visible changes before phase 3; every phase has an independent rollback (`widget=NULL` restores the inferred path).

---

## 6. Critique — five biggest risks (proposal + current A138 pattern) and mitigations

1. **Two expression languages (compliance DSL for `visible_when`/gates, arithmetic for equations) grow independently.** Adding `if()`/string literals to `arithmetic.ts` duplicates half of `evaluate.ts`. Mitigation: extract one tokenizer/parser (`src/lib/expr/`) with two entry points (`evalCondition`, `evalNumber`); keep the `computed|manual_required|error` and `pass|fail|pending|manual` result types; the eligibility gate stays the only admission path for formulas.
2. **Tables as data = silent drift and SR-1 erosion.** A wrong cell in `regulation_table_rows` is invisible in code review, and the A138 pattern already hides Tab. 5→tier and Tab. 6 numbers in TS constants without quotes. Mitigation: `verbatim_quote NOT NULL`, `verification_status` gate before a table resolves in prod, edition immutability (new rows = new edition), phase-1 pin tests against the TS constants, and a `scripts/verify-regulation-tables.ts` that diffs rows against the md transcripts.
3. **`visible_when` interacts badly with gates and inheritance.** Hiding a field a gate references yields `pending` forever or a false pass; hiding a producer field blanks consumers. Mitigation: hidden ⇒ null and gates referencing a hidden symbol report `not_applicable` (new `EvalResult` kind, rendered as N.A. — the state the conformity panel already has); producers may not carry `visible_when` on consumed symbols (importer check); `pending|manual` never hides.
4. **The A138 pattern's own weak points are copied if unexamined:** override is a bare boolean (no reason, no quote), `kind` and tier are derived in code from `group`, six aggregators are keyed by hardcoded UUIDs, and `MATERIALIZE_REGISTRY` hardcodes input symbols per standard. Mitigation: override sidecar with `reason` + policy from the table; `kind`/`tier` become value columns in the rows; equations by formula string; registry inputs from `equations.input_symbols`.
5. **Registers replacing worksheets change inheritance topology.** A262E's "one Filterstufe register instead of 13 worksheets" is the biggest UX win, but per-row outputs have no symbol to inherit by and `consumer_worksheets` is worksheet-scoped; `mergeInheritedFields` would see either nothing or ambiguity. Mitigation: only aggregates (`sum_rows` etc.) materialise to symbols; per-row consumption goes through `reference`; do not collapse worksheets before a "row-scoped inheritance" design (`reference` + `lookup_fill` over an inherited register) is specified and tested.

Residual (not top-5): DB-driven `ui_config` moves UI complexity into JSON that only the importer validates — mitigated by the JSON schema in `_pass3c-validate.ts` and by keeping `widget` a CHECK-constrained enum; checklist carrier duality (flat `string[]` on main vs `{selected}` in `_wt-fll`) is absorbed by the normaliser but must be backfilled once so gates using `IN`/`IS NOT EMPTY` see one shape.

---

## Appendix — end-of-work inventory check (17 inventories present at close)

Re-read `scratchpad/inventory/*.md` at close: 17 standards inventoried (A138-1, A178, A262E, DIN 1989-1/-2, DIN 18130-1, DIN EN 16941-2, FLL-GAR, FLL-Naturteich, M-187, M-205, M-277E, M-820-1/-2, M-1200-1/-2/-3). Aggregate over the 12 with summary counts: ~120 table-lookup candidates, ~95 repeatable groups, ~180 conditionals — every one maps onto the nine shapes above; no inventory required a tenth shape. Confirmations: DIN EN 16941-2 `grauwasser_herkunft`/`behandlungsstufen` are flagged single-select-but-"eine oder mehrere" (§1 shape 2); DIN 1989-1 `e` ← Tab. 3 and FLL-GAR Tab. 22 (20/30/40 mm) are flagged exactly as examples B/C; A138-1 lists 13 lookup candidates of which only Tab. 9 is implemented (Tab. 3 feasibility, Tab. 5→BK, Tab. 6/7 limits, Tab. 8 Schutzkategorie→`n`, Tab. 11 `f_methode`, Tab. 14 per-facility limits are all shape 3). Two recurring pressures to pre-empt: (i) **rows that spawn stage-specific fields** (M-1200-2 Verfahrenskette, M-205 `verfahren`, A262E Filterstufe, FLL-GAR `abdichtungs_art` → material worksheet) — a `register` whose row type drives `visible_when` of sub-fields; today those are separate worksheets, so this is risk §6.5, not a new widget; (ii) **readings/sample tables with per-row derivation and a fitted aggregate** (DIN 18130-1 k-readings, M-1200-2 16 paired LRV samples, A262E 4-of-5 samples) — `register` + `mean_rows`/`stdev_rows`/`count_rows(cond)`; the rolling-window rule (4 of last 5) needs `last_rows(reg, n)` — add to the phase-4 function list.
