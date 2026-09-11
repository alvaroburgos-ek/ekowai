# Architecture brief — field → widget → engine, EKOWAI-Wizard (main @ a57c081, 2026-09-11)

Note: `src/lib/eval/selection-fields.ts` (SELECTION_CONFIGS), `checklist-editor.tsx`, `structured-register-editor.tsx`, `risk-register-editor.tsx` do NOT exist on main. They exist as UNCOMMITTED work in worktree `C:\Users\Ekowai\_wt-fll` (same paths), together with 11 migrations under scripts/migrations/2026080122…37….

## 1. DB schema (`src/lib/db/schema.ts`)

- `fields` — `schema.ts:178-226`. Columns: `symbol`, `dataType`, `unit`, `isRequired`, `enumValues` (jsonb), `validationRules` (jsonb), `clauseReference`, `consumerWorksheets` (`text[]`, `:196`), `orderIndex`, `verificationStatus`, `active` (`:211`), `defaultValue` (jsonb, `:215`), `owner`/`xbrlElementId` (VSME). Unique on `(worksheet_template_id, symbol)`.
- **`data_type` is a closed set of 6**: `number | text | enum | date | boolean | json` — enforced by the importer (`scripts/_pass3c-types.ts:45`, `scripts/_pass3c-validate.ts:83`), mirrored in `dynamic-field.tsx:21`.
- **`enum_values` shape**: `Array<{ value, label_de, label_en, order_index? }>`; written only for `data_type='enum'` by the importer (`scripts/_pass3c-db.ts:389`) but read for `text` and `json` too at render time.
- **`validation_rules` shape**: importer stores `{ raw: <string> }` verbatim (`scripts/_pass3c-db.ts:390-392`). UI reads `{ min, max, maxLength, extensible, raw }` (`dynamic-field.tsx:26-35`) — structured keys are hand-authored via migration.
- **`default_value` shape**: `{ type, value }`, applied only when `dv.type === f.dataType` (worksheet page `:219-224`).
- `equations` (`:228-252`): `formula` (text), `inputSymbols text[]`, `outputSymbol`, `outputUnit`, unique per `(template, equation_number)`. `compliance_requirements` (`:254-278`): `code`, `condition` (text DSL), `severity`, `suggestion`. `project_parameters` (`:355-388`): one row per `(project_id, field_id)`, typed value columns + `valueJson`, `sourceType` (`entered`/`derived`/`computed`), citations, `clientSupplied`.
- **There is no widget/UI-hint column.** Widget choice = `data_type` + hardcoded `symbol` matches in React.

Extension points: (a)–(d) need new `fields` columns (e.g. `widget`, `ui_config jsonb`, `visible_when`, `lookup_table_ref`) plus a structured `validation_rules` contract in the importer; today every non-scalar widget requires a code change.

## 2. Rendering dispatch

`worksheet-form.tsx` is the dispatcher. It finds carrier fields by literal symbol: `r_D_n_table` (`:466`), `rainfall_table_ref` (`:467`), `surface_inventory` (`:493`), `POLLUTANT_REGISTER_SYMBOL` (`:497`), excludes those from the field grid (`:522-541`) and renders dedicated `<section>` editors below the sections (`:806-850`). `visible-fields.ts:11` filters only `active`. `section-group.tsx:25` recurses sections and hides empty scaffold headers.

`dynamic-field.tsx` branches on `field.dataType`: `number` (`:291`), `text` (`:404`, `maxLength>200` → textarea; `enumValues` present → `<datalist>`, `:426-499`), `enum` (`:507`; ≤4 options → `SegmentedControl`, else `<Select>`; empty `enum_values` → amber "not configured" notice `:517-534`), `date`, `boolean`, `json` (`:631`; `enum_values` present → checklist multi-select, `validationRules.extensible===true` → free-text "Eigener Eintrag"; otherwise "Phase 2" placeholder).

Symbol special-cases inside `dynamic-field.tsx`: `soil_bodenart_tab13` / `a_s_m_provenance` early-return `null` (`:164-169`), `A_S_m` lock+badge (`:173`, `:363`), `ac_as_ratio_limit` (`:296`), `ac_as_ratio` (`:311`), `ac_as_ratio_check` → status badge (`:409`).

Dead code: `sub-areas-editor.tsx` and `kostra-table-editor.tsx` are exported but referenced nowhere.

Extension points: conditional visibility is `if (symbol === …) return null`; a generic path needs a `visible_when` expression evaluated in `visibleFields()` and a widget registry keyed by a DB column instead of `fields.find(f => f.symbol === '…')`.

## 3. Config registries (worktree _wt-fll, uncommitted)

- Checklist (main): inline in `dynamic-field.tsx:631-792`, config = `enum_values` + `validation_rules.extensible`. Persists flat `string[]`.
- Registers (main): one hand-written component per carrier — `surface-inventory-editor.tsx` (299 L), `pollutant-register-editor.tsx`, `rainfall-tables-editor.tsx`. Each has its own row type + normalizer module (`surface-inventory.ts:9`, `pollutant-register.ts:18`, `rainfall-tables.ts:34`) shared with the server.
- _wt-fll registry `selection-fields.ts`: `SELECTION_CONFIGS: Record<symbol, RegisterConfig | ChecklistConfig>`; `ColumnDef = {key,label,type:'text'|'number'|'boolean'|'enum',options?,datalist?,placeholder?,width?}`; `RegisterConfig = {kind:'register',title,subtitle,addLabel,columns,note?,sumColumn?}`; `ChecklistConfig = {kind:'checklist',title,subtitle,options,groups?,note?,allowCustom?}`. 24 registers + 14 checklists wired (DWA-M-820-1/-2, DIN-276, M-277E source_set, M-1200-3 bewaesserungstagebuch, M-1200-1, A-272E variants, M-816, A138 anlagentyp checklist, FLL equipment/plant lists, M-1200-2 indikatorchemikalien). worksheet-form (diff vs main, +58/−71) dispatches `fields.filter(f => SELECTION_CONFIGS[f.symbol])` to ChecklistEditor / StructuredRegisterEditor; `risk_register` → dedicated RiskRegisterEditor (3-assessor grid, M-Wert/S-Abw derived).
- A register today: fixed columns (text/number/boolean/enum-from-TS-list), add/remove rows, optional single sumColumn footer. Cannot: declare columns from DB, per-row lookups (class → values), per-row formulas, multiple/weighted totals, feed the equation engine.

## 4. The A138 Tab. 9 pattern (reference for (a) and (d))

- Lookup accessor: `tab9.ts` holds the table as a TS constant; entries tagged `standard:'DWA-A 138-1', edition:'2024-10'` (`tab9.ts:21-22`, `:66-71`) but accessors `getTab9Entries()` / `lookupTab9(value)` (`:75-81`) keyed only by row value. Spec names the accessor body as the seam for a future `regulation_tables` DB table.
- Auto-fill on category select: `surface-inventory-editor.tsx:59-63` — `selectType()` writes `{tab9_value, c_i: e.cm, c_s: e.cs, coeff_override:false}`.
- Override ("abweichend"): per-row boolean `coeff_override` (`surface-inventory.ts:18`); toggling off restores the table pair (`editor:65-76`); `rowMismatch()` (`surface-inventory.ts:54`) flags drift; legacy rows migrated, override inferred from mismatch (`:103`).
- Totals: single source `summarizeSurfaces()` (`surface-inventory.ts:127-148`) → `A_C, A_C_sealed, A_C_unsealed, A_E_ba, A_E_nba, C_m`. Client engine: six aggregators built by `makeSurfaceAggregator` (`aggregators.ts:786-820`) registered by equation UUID (`aggregators.ts:822-834`). Server: `materializeSurfaceOutputs()` (`materialize-surfaces.ts:7`) called in `saveWorksheet` (`worksheet.ts:652`), upserted `sourceType:'derived'` (`:661`). `derivedOutputSymbols()` (`derived-output-symbols.ts:26`) decides `derived` vs `entered` at `worksheet.ts:320`.
- Upstream-cause gating: `surface-source-state.ts:14` (`missing|incomplete|ok`; `ok` requires all rows complete AND source instance `engineer_approved|final`), `surfaceWithholdFieldIds()` (`:46`) removes inherited derived values on the consumer page, `SurfaceSourceBanner` renders the reason.
- Other hardcoded class→value lookups: `tab6-loading.ts:63` (tier × BBZ-band → limit, `none|limit|indeterminate`), `asm-source.ts` computeSoilEstimate (Tab. 13 Bodenart → 0.10/0.20·A_C), `FACILITY_TYPE_TO_WORKSHEET`.

Extension points: generic in shape, A138-specific in data. Needs `regulation_tables` keyed `(standard, edition, table_code, row_key)`, field-level lookup config naming table + column→symbol fill map, override flag as a generic per-row convention.

## 5. Engine

`formula.ts:131` `evaluateFormula()` — three-state (`computed | manual_required | error`, `:63-92`). Order: (0) aggregator registered by `equationId` wins (`:136-139`); (1) rewrite rules (`rewrites.ts`); (2) symbol resolution + unit check vs `equation-profiles.ts` `expectedUnits` (`:174-187`); (3) `rhs()` strips LHS through `=|>=|<=|>|<` (`:117-122`), `normalizeFormula` rewrites `r_D(n)→r_D_n`, then `evalExpression`.

`arithmetic.ts`: precedence-climbing parser: `+ - * / ^`, parens, numbers, identifiers, functions ONLY `ln, log10(lg), sqrt, exp, abs, min, max` (`:29-47`). No `IF`, `LOOKUP`, piecewise, `SUM`; unknown call throws and `engine-eligibility.ts:33` excludes the equation.

`equation-profiles.ts:20-45` — per-equation `expectedUnits`, `constants`, `symbolAliases`, `displayOnly`. `use-equation-engine.ts:112` resolves values from Zustand store, builds `AggregatorContext` by equation id (`:444-492`), writes outputs back via `setField` unless in `suppressWriteBackSymbols` (`:532-541`).

Extension points: (c)/(d) as formulas need `if(cond,a,b)` / piecewise / `lookup(table,key,col)` / `sum_rows(carrier, expr)` in `arithmetic.ts` + `engine-eligibility.ts`, and a table-resolution context in `EvalRequest`. Today every non-arithmetic case is a hand-written aggregator keyed by hardcoded UUID.

## 6. Inheritance

`fields.consumer_worksheets` → `loadInheritedFields()` (`src/lib/db/queries/worksheet.ts:141-165`, same standard, `active`). `merge-inherited-fields.ts:49`: own fields win; two producers for one symbol ⇒ both dropped + `ambiguousSymbols` (`:67-83`). `project_parameters` keyed `(project_id, field_id)` → consumer reads producer's row directly. Prefill order (`worksheets/[worksheetCode]/page.tsx:156-224`): local param → unambiguous same-symbol upstream → project site profile → `default_value`. Inherited fields render read-only (`worksheet-form.tsx:711-777`). Cross-STANDARD inheritance unsupported (query scoped to one standardId).

## 7. Conditional logic today

- `compliance/evaluate.ts` = only generic condition DSL: comparisons, arithmetic, `IS NULL/IS NOT EMPTY`, `IN {a,b}`, booleans, `AND/OR/NOT`, parens, `IF cond THEN cond`. Unparseable → `manual`; missing symbol → `pending`. Used ONLY for compliance_requirements / compliance_suggestions — never for field visibility or values.
- No `visible_when` / `show_if` / `depends_on` anywhere.

Extension point: reuse `compliance/evaluate.ts` against store values from a new `fields.visible_when`, evaluated in `visibleFields()`.

## 8. Tests & specs

Vitest, projects `unit` (happy-dom, `src/**/*.{test,spec}.{ts,tsx}`), `integration` (embedded Postgres), `rls`. `pnpm test` = unit. Pure logic tests in `src/lib/eval/__tests__/` (~53 files), render tests in `src/components/worksheet/__tests__/` (~30). Existing tests pin A138/VSME symbols by name; a config-driven replacement needs parallel config-fixture tests before symbol-specific ones retire.

Specs: `2026-06-25-a138-07-surface-singlesource-tab9-design.md` (standing invariant), `2026-05-20-db-driven-multi-standard-design.md` (goal: generic DB-driven renderer for all data_types).
