# Guideline → Tool — per-standard playbook (reusable)

Owner request 2026-09-11: save this structure so encoding the next guideline costs fewer
tokens than the first pass did. Plan 1 (schema, table accessors, selection-config plumbing)
is DB-side and built; Plan 2a (expression language, `visible_when`, register equations,
generic materialiser — see "What Plan 2a added" at the end) is built on the same branch.
This is the recipe for turning one more standard's §1–§3 content into worksheet rows on top
of them — not a description of the whole compliance-SaaS architecture.

## Apply order (hard constraint)

**The code on this branch is NOT safe to deploy before the schema migration.** Drizzle's
`db.select().from(fields)` (and `.from(regulationTables)` / `.from(regulationTableRows)`) emits
an explicit column list — it does not `SELECT *`. Once the code that lists the new
`widget`/`ui_config`/`lookup`/`visible_when` columns ships, EVERY `fields` read (worksheet
loads, the worksheet page, the importer's re-verification pre-pass) fails with a Postgres
"column does not exist" error until those columns exist in prod. The `ensureRegulationTablesLoaded()`
never-throws guard (`src/lib/db/queries/regulation-tables.ts`) only covers the regulation-tables
DATA migration being absent (missing seed rows) — it does not, and cannot, cover the `fields`
columns not existing at all, because the ordinary (non-try/catch) field-read call sites are not
wrapped in that guard.

Apply strictly in this order, never skip or reorder a step:

1. `supabase/migrations/20260911100000_guideline_to_tool_schema.sql` — the four `fields`
   columns, `worksheet_sections.visible_when`, the two `regulation_*` tables.
2. `scripts/migrations/20260911110000_regulation_tables_seed_a138.sql` — TAB9/5/6/13 seed rows.
3. The `scripts/migrations/20260911120000_selection_configs_*.sql` files — one per standard,
   any order among themselves (each is standard-scoped and independent of the others).
4. `scripts/migrations/20260916100000_a138_07_register_equations.sql` — the six A138-07
   producer equations get their `sum_rows(...)` formula strings + `input_symbols =
   ARRAY['surface_inventory']` (rollback restores the prior prod text captured
   2026-09-16T23:23:45Z).
5. `scripts/migrations/20260916110000_vsme_b04_register_equations.sql` — three new
   VSME-B04.100 equation rows (`B04.100-air/-water/-soil`, `imported_unverified`,
   `ON CONFLICT DO NOTHING`).
6. `scripts/migrations/20260916120000_a138_12_visible_when.sql` — `fields.visible_when` on
   `soil_bodenart_tab13` and `a_s_m_provenance` (only `WHERE visible_when IS NULL`).
7. Deploy the build.

Steps 4–6 are **independent of each other** (different tables/rows; any order among the three)
but every one of them needs step 1 first (`input_symbols` exists already, `visible_when` does
not before step 1). **None of the three is required for the build to be correct** — the code
carries a deploy-safety bridge for each (see "Bridge retirement" below), so the Plan-2a build
may go live with steps 4–6 still pending; applying them later changes nothing an engineer
sees except the "source formula" line of the six A138-07 cards (the rewrite badge disappears).
Applying any of them to `vadsmshzebefjreqcicl` is the owner's stamp, never this branch's.

**Rollback is the reverse order, with one twist:** redeploy the previous (pre-this-branch)
build BEFORE running `rollback-20260911100000_guideline_to_tool_schema.sql` — dropping the
schema columns while the new build is still live re-creates the exact "column does not exist"
failure this order is designed to avoid, just in the opposite direction. So: redeploy old build
→ `scripts/rollback-20260916120000-a138-12-visible-when.sql` →
`scripts/rollback-20260916110000-vsme-b04-register-equations.sql` →
`scripts/rollback-20260916100000-a138-07-register-equations.sql` →
`scripts/rollback-20260911120000-selection-configs.sql` →
`scripts/rollback-20260911110000-regulation-tables-seed-a138.sql` →
`rollback-20260911100000_guideline_to_tool_schema.sql`. (The three 2a rollbacks can also run
alone, in any order, while the 2a build stays live — the bridges take over again; the A138-07
rollback only changes the stored text, the engine keeps computing the register form through
the bridge, as its header says.)

**Post-apply verification (steps 4–6):**

```sql
-- step 4: expect 6 rows, every formula starting with '<sym> = sum_rows(' or containing sum_rows
select id, output_symbol, left(formula, 40), input_symbols from equations
 where id in ('b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0','a1380702-0000-4000-8000-000000000002',
              'a1380702-0000-4000-8000-000000000003','a1380702-0000-4000-8000-000000000004',
              'a1380702-0000-4000-8000-000000000005','a1380702-0000-4000-8000-000000000006');
-- step 5: expect 3 rows
select equation_number, output_symbol from equations e join worksheet_templates wt on wt.id=e.worksheet_template_id
 where wt.code='VSME-B04.100' and equation_number like 'B04.100-%';
-- step 6: expect 2 rows, both non-null
select f.symbol, f.visible_when from fields f join worksheet_templates wt on wt.id=f.worksheet_template_id
 join standards s on s.id=wt.standard_id where s.code='DWA-A-138-1' and f.symbol in ('soil_bodenart_tab13','a_s_m_provenance');
```

**Owner items carried from Task 10b (operational, not migrations):** (a) set an explicit pool
`max` plus `idle_timeout`/`connect_timeout` on the postgres.js client in `src/lib/db/index.ts`
(serverless behind the Supabase transaction pooler → small, e.g. 3–5); (b) role-level
`ALTER ROLE … SET idle_in_transaction_session_timeout = '30s'` and a `statement_timeout` on the
app role (prod DDL, owner stamp) so any future tx/global-pool mix fails loudly instead of hanging;
(c) the prod submit-for-review retest on a build containing `e2c9283` — that browser submit IS
the deployed proof for S-2a-2; until it runs the honest status is "root cause fixed and pinned
by unit test".

**Verification queries** (run after step 2/3 to confirm the seed landed before deploying):

```sql
select t.table_code, count(*) from regulation_table_rows r join regulation_tables t on t.id=r.table_id group by 1;
-- expect: TAB9 30, TAB5 19, TAB6 4, TAB13 2

select widget, count(*) from fields where widget is not null group by 1;
```

**Environment.** `scripts/apply-migration.mjs` reads `DATABASE_URL` from `.env.local` — it must
point at prod (`vadsmshzebefjreqcicl`, per `reference_wizard_prod_db_identity`), the only
environment this branch's data belongs to. Applying prod migrations is owner-stamped, not
something this branch's code triggers on its own — see the standing rule against running
`scripts/apply-migration.mjs`/`drizzle-kit`/any DB access from an assistant session.

## Inputs

- Prod dump `<CODE>.json` — `node scripts/verification/prod-query.mjs <table> ...`.
- Transcript md — DesktopGuidelines-verified source text, never PDFs (token economy).
- Inventory `docs/superpowers/specs/2026-09-11-guideline-to-tool/inventory/<CODE>.md` — 29
  standards already have one. Missing one? Run `INVENTORY-BRIEF.md` (in the same specs
  folder) with one agent per standard first; don't re-derive it by hand.

## Step 1: Inventory

Read `inventory/<CODE>.md` — it lists the standard's §1 lookup tables, §2 repeatable groups,
and §3 conditionals with source line references. That list drives Steps 2–4.

## Step 2: Tables (§1 lookups)

For each table: add a builder in `src/lib/eval/regulation-tables-seed-<std>.ts` (reference
implementation: A138's four tables — TAB9, TAB5, TAB6, TAB13 — in
`regulation-tables-seed-a138.ts`). Rows come from the transcript, each with a verbatim
`verbatim_quote` and an `override_policy` picked from the wording table in spec §7 — never
invented. Pin a test on the builder's output, then run
`scripts/regulation-tables/emit-seed-sql.ts` to generate the migration (DB column for row
data is `row_values`; never hand-write the INSERT).

The server loads tables via `ensureRegulationTablesLoaded(standardCode)`
(`src/lib/db/queries/regulation-tables.ts`) — it tries the DB and falls back to TS constants
on any failure; it never throws, so a standard with no seed migration just renders without
DB-backed tables.

**A138's own TAB9 stays `imported_unverified` (I-2 ruling).** Its `verbatim_quote` values are
synthesised from the TS constants in `tab9.ts` (`Tab. 9: ${label} — C_m … / C_s …`), not lifted
from a transcript row — so `engineer_verified` would overclaim. It stays unverified until Plan 3
lifts the printed Tab. 9 rows from the transcript; the owner then rules whether the (label, C_m,
C_s) triple counts as the printed row for that purpose. Follow the same rule for every new
standard's tables built this way: a seed builder that synthesises its quote from existing TS
constants, rather than lifting a printed row, ships `imported_unverified`.

## Step 3: Registers / selections (§2 repeatable groups)

For each group: write the `register` `ui_config` against the zod contract in
`src/lib/eval/field-config.ts` (`parseFieldConfig` is the single gate, importer- and
render-side). Add a `discriminator: true` column for parallel technologies, and
`lookup_key`/`lookup_value` column pairs bound to a `table_code` when the group looks up a
Step-2 table. Generate the migration with an `emit-selection-configs-sql.ts`-style UPDATE —
new entries go in `scripts/regulation-tables/selection-config-entries.json` (itself generated
read-only from prod; don't hand-edit stale rows out of it). Write one render test with a
2-row fixture.

Today's TS fallback registry (`SELECTION_CONFIGS` in `src/lib/eval/selection-fields.ts`) has
36 configs; it's consulted only while a field's DB `widget` column is `NULL` (D-1 ruling), so
migrating a config off it is additive, never a mid-flight cutover.

**36 vs 38 — don't be confused by the older number in earlier drafts.** The prod entries
snapshot (`selection-config-entries.json`) originally listed 38 rows before the (standard,
symbol) dedupe (`ae9158a`, fix round 1) collapsed it to 36 — the same 36 as the TS registry.
Any older doc still saying "38" is describing that pre-dedupe snapshot, not today's config count.

**I-1 sign-off: 5 pairs left un-migrated pending a real value/label checklist.** The forward
selection-config migration SKIPS any entry whose captured `priorEnumValues` (prod's
`enum_values` before this migration) is non-null and which does not also carry `keepProdEnum`
— writing the TS-derived label list over real prod content would silently replace it. These 5
fields keep `widget IS NULL` and keep rendering via the `SELECTION_CONFIGS` TS fallback; they
need the owner's ruling on how to reconcile prod's own values with the TS config before a
migration can touch them:

- `DWA-A-272E.criteria_social`
- `DWA-M-1200-1.indikatorchemikalien_kat1`
- `DWA-M-1200-1.indikatorchemikalien_kat2`
- `DWA-M-820-2.lph_completed`
- `DWA-M-820-3.applicable_lph`

(`DWA-A-138-1.a138_anlagentyp_kandidaten` also has a non-null `priorEnumValues` but is NOT in
this list — it carries `keepProdEnum`, D-1 ruling, so `widget`/`ui_config` DO migrate while
`enum_values` is written back verbatim from prod, untouched.)

## Step 4: Conditionals (§3)

Express each as `visible_when` (field or section) in the compliance DSL — the driver must be
`select_one`; a conditional keyed off multi-select or free-text isn't encodable this way,
flag it as a judgment item instead. Where the inventory flags an unguarded gate, add
`IF driver == x THEN …` explicitly.

**`visible_when` is evaluated since Plan 2a** (`src/lib/compliance/visibility.ts`,
`computeVisibility`) — on the form, the approval gate, the report, the snapshot, the PDF
assembler and the save-path materialiser, all through the one pure helper. Semantics you are
encoding against: `fail` hides; `pass | pending | manual | not_applicable` keep the field
visible (a missing driver never hides anything); a hidden section hides its fields and child
sections; a hidden field's symbol is `null` for every equation path and every gate that
references it reports `not_applicable`. Two rules the importer enforces (`scripts/_pass3c-validate.ts`):
a field with non-empty `consumer_worksheets` may not carry `visible_when`, and neither may any
section on its chain (a produced symbol other worksheets consume must never disappear). One
rule the importer does NOT enforce yet: a `visible_when` must not read an engine output that is
computed from the field itself (oscillation; sign-off S-2a-3). Visibility is single-pass over
the current values — a rule that reads another hidden symbol sees that symbol's stored value
(sign-off D-6).

## Step 5: Derived values

Never hand-type a total or looked-up constant into a stored field value. A derived value is
**a formula string on an equation row** whose `input_symbols` names the register symbol:

```
output_symbol = A_E_ba
formula       = A_E_ba = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))
input_symbols = {surface_inventory}
```

That is the whole encoding — no TypeScript aggregator, no per-standard materialiser. The
engine (`evaluateFormula` with `registers`), the report/snapshot/PDF evaluators and the
server-side `materializeDerivedOutputs` all build the same `PreparedRegister` through
`buildRegisters(fields, jsonOf, ctx)` (`src/lib/eval/register-rows.ts`) and evaluate the same
string. Row-scoped functions (`sum_rows`, `count_rows`, `max_rows`, `min_rows`, `mean_rows`,
`stdev_rows`, `median_rows`, `percentile_rows`, `last_rows`) see the register's typed cells
and its `derived` columns (e.g. `kind` from `lookup('TAB9', tab9_value, 'kind')`); only
COMPLETE rows count. A register-fed equation is materialised as `source_type='derived'` on
save (null when not computable — empty register, hidden input, missing scalar), so downstream
worksheets stop reading "fehlend" for values the producer already has. Scalar-only equations
are NOT materialised by this block (sign-off D-8; engine-output-materialization workstream).

What still goes on the sign-off sheet: the aggregation rule the guideline leaves open (sample
vs population stdev — D-4; which percentile definition — R-7 is the code default), a formula
whose source wording is ambiguous, and any `SUM(x)`-style single-token formula (S-2a-1).
`PreparedRegister.diagnostics` (a `derived` column whose expression cannot evaluate for a
non-recoverable reason) surfaces as a `Register: <column>: <message>` save warning — read the
warnings after the first harness save of a new register; a silent null is the Finding-E class.

## Step 6: Verify + sign-off

1. `pnpm test` and `pnpm -s typecheck` clean.
2. Run the standard's harness chain if one exists — assessed is not proven.
3. Walk the inventory's §5 "top wins" and check each off against what actually got encoded.
4. Every choice made (modal severity, range selection, ambiguous §3 driver, un-formularized
   §5 value) goes on the sign-off sheet with verbatim evidence — never blocks the wave, the
   owner rules asynchronously.

## Token budget note

Plan 1 was the expensive corpus-wide pass. Per-standard cost through this playbook is still
dominated by inventory-writing and manual `ui_config`/table authoring for the first several
standards — no fixed multiplier exists yet. **Measure on the first Plan-3 standard** (tokens
in, sections/tables/registers out) and record the number here before quoting a ratio.

## What Plan 2a added (2026-09-16/17, commits `7ee7d22..9b0e1bd` on `feat/guideline-to-tool`)

**Plan 2b (editors) is NOT built.** Registers still render through the bespoke editors
(`surface-inventory-editor`, `pollutant-register-editor`, risk register, …); a new standard's
register from Step 3 has no generic renderer yet. Plan 2a changed **computation, visibility and
persistence only** — nothing an engineer sees in an editor. Plan 3 (encode the 29 inventoried
standards) is drafted, not started. Sign-off sheet for everything decided in 2a:
`docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2a.md`.

### The expression language — `src/lib/expr/`

One tokenizer, one parser, one evaluator core; `src/lib/compliance/evaluate.ts` (gate
conditions) and `src/lib/eval/arithmetic.ts` (formulas) are thin adapters over it with their
old signatures, so the pre-2a test suite pins that nothing computed a different number.

- **Entry points** (`src/lib/expr/evaluate.ts`): `evalNumber(src, scope)` (strict — throws
  `ExprError`, `recoverable` flag tells `formula.ts` manual_required vs error), `evalValue(node,
  scope, row?)` (strict, `Value`-preserving so `lookup()` strings survive), `evalCondition(src,
  scope, opts?)` (lenient — never throws; returns `pass | fail | pending | manual |
  not_applicable`), plus `evaluateNodeLenient`, `evaluateArithLenient`, `extractSymbols`,
  `unknownFunctionNames`. Parser entry points: `parseCondition`, `parseNumeric`, `parseExpression`.
- **Functions** (`src/lib/expr/functions.ts`, the registry `EXPR_FUNCTION_NAMES`): math
  `ln log10 sqrt exp abs round ceil floor` (1-arg, case-insensitive; `lg` = `log10`; bare
  `log` stays unsupported), `min max` (2-arg); row `sum_rows count_rows max_rows min_rows
  mean_rows stdev_rows median_rows percentile_rows last_rows`; logic `if lookup contains cell
  flag`. Row aggregates take `(reg, expr[, cond])` — the optional third argument filters rows;
  `percentile_rows(reg, expr, p[, cond])` is R-7 / Excel `PERCENTILE.INC`; `stdev_rows` is the
  SAMPLE deviation (n−1, D-4); `count_rows(reg[, cond])` may be 0 but an undecidable row makes
  the whole count undecidable (pending / recoverable throw — never a silent miscount).
- **Grammar** = the compliance DSL (`AND OR NOT IN IS NULL IS EMPTY IF…THEN`) + `^`
  (right-assoc), function calls, `.5` numbers, unary `+`/`-`. `IF a THEN b` is the guard form;
  `if(c, x, y)` is the call. `x == paved` with a bare identifier RHS: symbol if valued, else its
  own name as a string literal (C-1 ruling — the legacy var-vs-var rule).
- **Strict vs lenient.** Strict (numbers): finiteness is checked on the FINAL result only
  (`1/exp(1000)` = 0), division by zero throws at the op, a null operand throws recoverable
  `Operand ist keine Zahl: null`. Lenient (conditions): every failure is `null` → `pending`
  with the missing symbols in the ledger; `not_applicable` when `opts.hiddenSymbols` intersects
  the condition's symbols. `extractSymbols` does NOT collect identifiers inside the row-scoped
  argument of a row function (column names are not worksheet symbols; the register symbol is).
- **Admission** unchanged: `engine-eligibility.ts` is still the only gate; it now accepts every
  registry function and names the offenders for anything else (`SUM`, `foo`). The
  `NAME(singleToken)` phantom-symbol rewrite (`SUM(x)` → `SUM_x`) is a pre-existing hazard
  (S-2a-1, enforcement-changing — not fixed).

### `visible_when`

`src/lib/compliance/visibility.ts` — `computeVisibility(fields, sections, lookup)` →
`{ hiddenFieldIds, hiddenSectionIds, hiddenSymbols }`, plus `withHidden(lookup, keys)` /
`hiddenFieldIdsOf` so every value accessor routes through one rule. Semantics: see Step 4.
Consumers: the form (grid, engine hook `hiddenSymbols`, compliance block, and every dedicated
editor gated on `!hiddenFieldIds.has(f.id)`), `checkApprovalGate` (a hidden required field is
skipped in the missing-required check), `evaluateWorksheetEquations`/`evaluateWorksheetCompliance`
(report), `buildSnapshotPayload`, `assemble-standard-report.ts`, and `saveWorksheet` before the
materialiser. Client and server evaluate against the same symbol lookup
(`src/lib/compliance/symbol-lookup.ts`, known-but-null ⇒ `undefined`). Inherited rows are
excluded (governed by their origin worksheet). **Single-pass caveat:** the snapshot computes
visibility from the raw stored parameters while its gates read the derived overrides, and the
save path computes it from pre-save values — a rule on `r_D_n`/`D_min` reads the stored value,
not the one derived in the same pass (D-6, D-11). The hand-coded A138 materialisers in
`worksheet.ts` (`materializeBasinGoverning`, `materializeAsm`, `materializeLoadingCheck`) do NOT
null hidden inputs — they read typed inputs through their own loaders (S-2a-4).

`not_applicable` is rendered everywhere a gate result is: form badge `–` (aria "Nicht
anwendbar"), header chip `– N n.a.`, PDF `– n.a.` / `n.a. — nicht anwendbar (ausgeblendetes
Feld)`, Prüfmemo tally `· N n.a.`, snapshot verdict `'not_applicable'` (a 4th JSONB value,
S-2a-6). It never blocks approval and never gets a "Warum?" explanation.

### Register equations, `buildRegisters`, the generic materialiser

- `prepareRegisterRows(carrier, columns, ctx, opts)` (`register-rows.ts`): typed cells per
  column type (`grid` included), legacy-shape replay (`legacy_map` → unique table match →
  reselection), lookup refill (null cell + key + not overridden), `derived` columns via strict
  `evalValue`, completeness (required, `min`/`max`, row-scope `visible_when`, grid ≥ 1 cell),
  flags (`registerFlagKeys`), `PreparedRegister.diagnostics` for non-recoverable derived-column
  errors. Override flag parity with the legacy code: only the FIRST `override.applies_to` column
  decides (`c_i`, not `c_s`).
- `buildRegisters(fields, jsonOf, ctx)` (`register-rows.ts`) is the ONE builder every path
  calls — hook, report, snapshot, PDF assembler, materialiser. `resolveRegisterConfig`: a
  non-null `widget` is authoritative (`'register'` → zod-parsed DB `ui_config`); the TS
  fallback `REGISTER_CONFIGS_FALLBACK` (`surface_inventory`, `pollutant_register`) applies only
  while `widget IS NULL` and the field is json. Tables resolve via `makeTableLookup(standardCode)`
  (registry → A138 TS seed; without a code only a UNIQUE table code resolves, never a guess).
- `formula.ts`: `EvalRequest.registers/tableLookup/carriers`; register symbols never enter
  `substituted` or `missing`; a formula containing a non-math call is classified by parse
  (`isConditionNode`) as criterion vs value.
- `materializeDerivedOutputs` (`materialize-derived.ts`) replaces the surface + pollutant blocks
  in `saveWorksheet`: every register-fed, non-displayOnly equation (DB rows + fallback rows)
  whose output has a field on the template → one `source_type='derived'` write, `null` when not
  computable; ONE write per output field, FIRST equation in list order wins (DB rows before
  fallback rows); register diagnostics → `warnings` as `Register: …`. Fires when any register
  field of the template is in the saved batch. Proven through the real `saveWorksheet` on
  embedded Postgres (`tests/harness/register-materialise.integration.test.ts`: 4826.43 / 0.9 /
  5362.7 / 0 / 4826.43 / 0, then an empty carrier → six nulls).
- `carrierSourceState` (`carrier-source-state.ts`) generalises the A138-07 → A138-10 upstream
  gate to any register: completeness comes from the register contract, so gate and engine cannot
  disagree (`surface-source-state.ts` is a shim; D-9).

### Bridge retirement — the three deploy-safety bridges

Each bridge keeps the build correct while its migration is unapplied; each is retired by
deleting code AFTER the owner has applied the named migration in prod. Delete exactly these,
nothing else:

| migration applied | delete | keep |
|---|---|---|
| `20260916100000_a138_07_register_equations.sql` | the six `rewriteRules` entries in `src/lib/eval/rewrites.ts` (the `Object.fromEntries` over `A138_07_REGISTER_FORMULAS`); the test case `'pre-migration prod state: the six PRIOR Σ formulas … via the rewrite bridge'` in `src/lib/eval/__tests__/materialize-derived.test.ts`; the `...Object.values(rewriteRules[eq.id]?.remap ?? {})` union in `consumedSymbolsFor` (`use-equation-engine.ts`) AND the same union in `materialize-derived.ts` (`consumed` set) | `A138_07_REGISTER_FORMULAS` (15 readers: harness seeds, `backfill-surface-plan.ts`, `surface-source-state.ts` pin, report/snapshot, the SQL pin) and `A138_07_PRIOR_FORMULAS` (the rollback SQL pin in `scripts/__tests__/a138-07-register-equations-sql.test.ts` asserts the rollback restores exactly these strings) |
| `20260916110000_vsme_b04_register_equations.sql` | `FALLBACK_REGISTER_EQUATIONS['VSME-B04.100']` in `src/lib/eval/register-configs.ts` (the `B04(...)` builder with it) and the matching cases in `register-configs.test.ts` + the SQL pin test's formula-parity assertions | `withFallbackRegisterEquations` (generic; an empty map is a no-op) |
| `20260916120000_a138_12_visible_when.sql` | `LEGACY_VISIBLE_WHEN` in `src/lib/compliance/visibility.ts` (and the `?? LEGACY_VISIBLE_WHEN[f.symbol]` clause in `effectiveVisibleWhen`); the legacy-parity cases in `visibility.test.ts`, `visible-when-form.test.tsx` and `scripts/__tests__/a138-12-visible-when-sql.test.ts` | `effectiveVisibleWhen`, `computeVisibility` |

Until the migration is applied the bridge is silent by construction: `formula.ts` skips a
rewrite whose `to` already equals the stored formula (no badge after migration),
`withFallbackRegisterEquations` appends a fallback only when no DB equation outputs that
symbol, and `effectiveVisibleWhen` prefers the DB rule. So retirement is a cleanup, never a
cutover — but do it, or the next person reads dead code as the mechanism.

### Verification snapshot at close-out (HEAD `9b0e1bd`, 2026-09-17)

`pnpm test` 217 files passed | 1 skipped · **2107 passed** | 1 expected fail | 1 skipped ·
`pnpm -s typecheck` exit 0 · `pnpm eslint <87 branch-touched files>` 0 errors (9 warnings, all
present at base `da79b99`) · project `pnpm -s lint` 57 errors / 179 warnings, all pre-existing in
18 files none of which this branch touched · `pnpm vitest run --project integration
tests/harness/register-materialise.integration.test.ts` 1 passed on embedded PG 18 · no new
`supabase/migrations/*` on the branch (the three 2a migrations live under `scripts/migrations/`).
