# Guideline → Tool — per-standard playbook (reusable)

Owner request 2026-09-11: save this structure so encoding the next guideline costs fewer
tokens than the first pass did. Plan 1 (schema, table accessors, selection-config plumbing)
is DB-side and built; Plan 2a (expression language, `visible_when`, register equations,
generic materialiser — see "What Plan 2a added" at the end) and Plan 2b (the generic
editors: `RegisterEditor`, the `WIDGETS` registry, `reference` and `lookup_fill` — see "What
Plan 2b added") are built on the same branch. This is the recipe for turning one more
standard's §1–§3 content into worksheet rows on top of them — not a description of the whole
compliance-SaaS architecture.

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
wrapped in that guard. Concretely, four server surfaces read the Plan-1 columns
(`fields.visible_when` / `widget` / `ui_config` / `lookup`, `worksheet_sections.visible_when`)
on every request, before any UI is involved: **`saveWorksheet`** (`src/lib/actions/worksheet.ts`
— visibility for hidden-symbol N.A. and the materialiser), the **approval gate**
(`src/lib/actions/approval-gate.ts` — hidden required fields, N.A. gates), the **PDF loader**
(`src/lib/pdf/load-data.ts` → `assemble-standard-report.ts`) and **snapshot capture**
(`src/lib/snapshots/capture.ts` / `payload.ts`). Deploying the build before step 1 therefore
breaks saving, approving, printing and snapshotting every worksheet of every standard — not
just the ones that use the new widgets.

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
7. `scripts/migrations/20260916130000_a138_07_surface_inventory_widget.sql` — DWA-A-138-1
   `surface_inventory` gets `widget='register'` + the `ui_config` the TS fallback serves today
   (Plan 2b; retires `REGISTER_CONFIGS_FALLBACK.surface_inventory`).
8. `scripts/migrations/20260916140000_vsme_b04_pollutant_register_widget.sql` — VSME
   `pollutant_register` gets `widget='register'` + `ui_config` incl. the `not_applicable` flag
   (retires `REGISTER_CONFIGS_FALLBACK.pollutant_register`; the migration header still names
   `REGISTER_FLAG_KEYS`, which was deleted as dead code in the fix wave round 2 — the header is
   byte-pinned by the emitter and left as is).
9. `scripts/migrations/20260916150000_a138_rainfall_table_ref_reference.sql` — DWA-A-138-1
   `rainfall_table_ref` (8 prod rows, one per consumer worksheet among A138-13..22 — controller read-only query, 2b ledger) gets
   `widget='reference'` + `ui_config` (retires `REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref`).
   `data_type` stays `text` — the migration never touches it (three `saveWorksheet` readers
   accept a text value only; pinned).
10. **GATED — EXCLUDED from the apply list until sign-off D-2b-3 is RATIFIED:**
    `scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql` — A138-12
    `ac_as_ratio_limit` (home template only, `w.code = 'A138-12'`) gets `widget='lookup_fill'`
    + the TAB6 `lookup` binding. Its key symbols `tab6_tier` / `bbz_band` are not fields yet, so
    the widget is display-only either way and the migration is cosmetic (code → data); the
    file header carries the three options. Do NOT apply it as part of step 7–9.
11. Deploy the build.

Steps 4–6 are **independent of each other** (different tables/rows; any order among the three)
but every one of them needs step 1 first (`input_symbols` exists already, `visible_when` does
not before step 1). **None of the three is required for the build to be correct** — the code
carries a deploy-safety bridge for each (see "Bridge retirement" below), so the Plan-2a build
may go live with steps 4–6 still pending; applying them later changes nothing an engineer
sees except the "source formula" line of the six A138-07 cards (the rewrite badge disappears).
The same holds for steps 7–9 (Plan 2b): each is one transactional `UPDATE fields … WHERE
f.widget IS NULL` emitted from the very TS fallback the code renders while `widget IS NULL`
(byte-pinned by `scripts/__tests__/widget-configs-sql-freshness.test.ts`), so applying them
changes nothing on screen; they are independent of each other and of steps 4–6, and need only
step 1. Applying any of them to `vadsmshzebefjreqcicl` is the owner's stamp, never this
branch's.

**Rollback is the reverse order, with one twist:** redeploy the previous (pre-this-branch)
build BEFORE running `rollback-20260911100000_guideline_to_tool_schema.sql` — dropping the
schema columns while the new build is still live re-creates the exact "column does not exist"
failure this order is designed to avoid, just in the opposite direction. So: redeploy old build
→ `scripts/rollback-20260916130000-widget-configs.sql` (the ONE canonical Plan-2b rollback:
all four widget rows at once, reverse order inside, each statement guarded by
`f.widget = '<what the forward wrote>'` so the never-applied gated row is a no-op — the
standalone Task-7 rollback for 20260916160000 was deleted at close-out as redundant) →
`scripts/rollback-20260916120000-a138-12-visible-when.sql` →
`scripts/rollback-20260916110000-vsme-b04-register-equations.sql` →
`scripts/rollback-20260916100000-a138-07-register-equations.sql` →
`scripts/rollback-20260911120000-selection-configs.sql` →
`scripts/rollback-20260911110000-regulation-tables-seed-a138.sql` →
`rollback-20260911100000_guideline_to_tool_schema.sql`. (The three 2a rollbacks and the 2b
rollback can also run alone, in any order, while the branch build stays live — the bridges and
the TS fallbacks take over again; the A138-07 rollback only changes the stored text, the engine
keeps computing the register form through the bridge, as its header says.)

**Post-apply verification (steps 7–9):**

```sql
-- expect: surface_inventory register (1 row, A138-07), pollutant_register register (1 row, B04.100),
--         rainfall_table_ref reference (8 rows, A138-13..22); ac_as_ratio_limit only if D-2b-3 was ratified
select s.code, w.code, f.symbol, f.widget, f.ui_config is not null as has_ui, f.lookup is not null as has_lookup
  from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
 where f.widget is not null and f.symbol in ('surface_inventory','pollutant_register','rainfall_table_ref','ac_as_ratio_limit')
 order by 1, 2, 3;
```

**Post-apply cleanup (delete code, nothing else) once the owner has applied the named step
— and only once the emitter freshness pin is retargeted, see the last paragraph:**
step 7 → `REGISTER_CONFIGS_FALLBACK.surface_inventory` (`src/lib/eval/register-configs.ts`)
**together with** its co-readers: `src/lib/eval/surface-source-state.ts:13` (`SURFACE_CFG` — the
A138-07 withhold shim on the page still runs on it), the `surface_inventory` case in
`scripts/regulation-tables/emit-widget-configs-sql.ts` (~:106) and the fixture use in
`src/lib/eval/formula.test.ts` (plus `formula-registers.test.ts`, `register-editor*.test.tsx`
that import it as a fixture — swap them to the migrated DB shape); since I-3 the form itself
reads NOTHING by that symbol (`registerSourceStates` resolves from the source entry's
`{widget, uiConfig}`), so nothing in `worksheet-form.tsx` is touched.
step 8 → `REGISTER_CONFIGS_FALLBACK.pollutant_register` (same file; `REGISTER_FLAG_KEYS` is already gone) —
co-readers: the `pollutant_register` emitter case and `carrier-source-state.test.ts` /
`register-editor-vsme-b04.test.tsx` fixtures. NOTE the snapshot drift after apply: the
migrated `ui_config` carries the pollutant `options` / `option_labels` as a frozen copy of
`src/lib/vsme/pollutants.ts` at emit time — a later change to `pollutants.ts` no longer reaches
the DB row (sign-off F-2b-2).
step 9 → `REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref` (`src/lib/eval/reference-configs.ts`);
step 10 (if ever applied) → `LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit`
(`src/lib/eval/lookup-fill.ts`); any `BESPOKE_BY_SYMBOL` entry (`src/components/worksheet/widgets.tsx`)
whose row now carries `ui_config.editor` in prod (none of the three bespoke rows has such a
migration yet); and the `SELECTION_CONFIGS`-register branch of `resolveRegisterConfig` once
EVERY `20260911120000_selection_configs_*.sql` is applied (step 3 — until then a still-NULL
selection register renders through that branch). Each deletion reds the matching pin in
`register-configs.test.ts` / `reference-configs.test.ts` / `lookup-fill.test.ts` — remove the
pin with the constant.

**Deleting ANY of the four fallbacks reds `scripts/__tests__/widget-configs-sql-freshness.test.ts`**
— the emitter (`emit-widget-configs-sql.ts`) generates the migration SQL FROM the fallback
objects and the pin byte-compares the committed SQL against a fresh emit. So a fallback stays in
the code until BOTH (a) its migration is applied in prod AND (b) the freshness pin is retargeted
to a DB snapshot of the applied `ui_config` (e.g. a `selection-config-entries.json`-style export
of the four rows) instead of the TS object. Deleting the constant first leaves the migration
un-reproducible.

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
DB-backed tables. **Where it runs matters (C-1, final review):** the eval-layer registry is a
module global of the Node process and there is NO lazy load inside `makeTableLookup` — a
server path that does not call the loader sees only the A138 TS seed. The five callers are
`saveWorksheet`, `transitionWorksheet` (before its transaction — the snapshot capture inside
the tx evaluates registers), `checkApprovalGate`, `loadStandardReportData` (Prüfmemo /
standard report) and `loadProjectReportData`; pinned by
`src/lib/db/queries/__tests__/regulation-tables-server-paths.test.ts`. A new server entry
point that evaluates registers / `lookup()` / `lookup_fill` for a standard must call it too,
always OUTSIDE `db.transaction` (global-pool query inside a tx = the Task 10b hang). The
worksheet page is the one path that does NOT use it: it loads the rows explicitly
(`loadRegulationTables`) and passes them to the client form, which registers them itself.

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
render-side). Add `lookup_key`/`lookup_value` column pairs bound to a `table_code` when the
group looks up a Step-2 table.

**Discriminator — the Plan-3 contract (what is actually built).** `discriminator: true` on a
column is accepted by the zod contract but has NO semantics in the engine or the editor: spec
§4 "the discriminator selects which table applies / the row's limits" is NOT implemented
(sign-off F-2b-1). The working pattern for parallel technologies is the *workaround*: one
`lookup_key` + `lookup_value` pair PER technology, each pair's columns carrying
`visible_when: "technology == '<x>'"` in row scope (the enum column `technology` is the
discriminator by convention), so only the pair of the selected technology is visible and
counted for completeness. Two consequences to encode against: (1) **the override toggle
binds to the FIRST `lookup_key` column only** (G-B2) — its table's `override_policy` is the
policy of the whole register (I-4), and the toggle appears under that column; with per-
technology pairs the first pair is hidden for the other technologies, so a register that
needs an override per technology cannot be expressed today — record it on the sign-off
sheet instead of bending the config; (2) **key strings are equality-matched** (G-A3): a seed
row's `keys[<column>]` string must equal the enum `value` string of the field / column that
drives it (`'schwarzdecke_asphalt'` on both sides) — no case folding, no label matching; the
importer's `validateLookupKeysOrder` checks column NAMES against `key_columns`, not the key
VALUES, so a value typo only shows at render time as `keine Zeile für [...]`.

Generate the migration with an `emit-selection-configs-sql.ts`-style UPDATE —
new entries go in `scripts/regulation-tables/selection-config-entries.json` (itself generated
read-only from prod; don't hand-edit stale rows out of it). **The register renders
generically since Plan 2b** — a `widget='register'` row (or a TS fallback while `widget IS
NULL`) goes through `RegisterEditor` with no per-standard React; consumers that inherit it
get `ReadOnlyRegisterTable`. Write one render test with a 2-row fixture through
`RegisterEditor` (pattern: `src/components/worksheet/__tests__/register-editor-a138-07.test.tsx`
— `resolveRegisterConfig(...)` → `<RegisterEditor symbol config standardCode>` over a real
store, assert `lookup-value-<key>` / `derived-<key>` / `footer-<symbol>` / `rows-complete`).
See "What Plan 2b added" for the column keys, `flags`, `footer`, `placement` and the bespoke
escape hatch.

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

**Composed `override_quote` (Plan 3 Task 1).** The policy cue may be two verbatim fragments from
different lines joined with " — " (e.g. TAB9: the Gl. 2 legend L1218 + the L1222 sentence; TAB14: the
two "i. d. R." cells L2257/L2259) — each fragment must still be verbatim and line-cited in the builder
comment. `verify-regulation-tables.ts` checks row `verbatim_quote`s only; `override_quote` is NOT
machine-verified, so the composition is the executor's SR-1 duty and the reviewer's spot-check.

**Quote-lifting traps (Plan 3 Task 2, DIN-1989-1).** (1) The transcript's LaTeX token `${ }` (an empty
group before a superscript, e.g. `${ }^{\text {a }}$`) is a template interpolation inside `String.raw` — write
it as `${'$'}{ }` (a138 TAB14 does the same); the verifier still matches because the runtime string is `${ }`.
(2) Never patch a seed file with `String.prototype.replace` and a replacement containing `$'` — it expands to
the text after the match and duplicates the file (the a138 incident, repeated in Task 2; rewrite the file
instead). (3) A register column named `e` (or `pi`) shadows the evaluator's Euler/π fallback in row scope
(`readSymbol` reads the row first; a null cell is a missing input, never 2,718) — pin it per standard.
(4) Boolean drivers are `== true` in the DSL (`ueberlauf_versickerung == true`), matching the prod gate texts.
(5) A `create` entry never sets `consumer_worksheets` — a derived field another worksheet must read (the
Hybrid limit reading `tagesbedarf` on -03) needs a STAGED consumer edit before its gate can evaluate there.

## Token budget note

Plan 1 was the expensive corpus-wide pass. Per-standard cost through this playbook is still
dominated by inventory-writing and manual `ui_config`/table authoring for the first several
standards — no fixed multiplier exists yet. **Measure on the first Plan-3 standard** (tokens
in, sections/tables/registers out) and record the number here before quoting a ratio.

## What Plan 2a added (2026-09-16/17, commits `7ee7d22..9b0e1bd` on `feat/guideline-to-tool`)

**Plan 2b (editors) is built on top — see "What Plan 2b added" below.** (At 2a close-out the
registers still rendered through the bespoke editors; that paragraph is superseded.) Plan 2a
changed **computation, visibility and persistence only** — nothing an engineer sees in an
editor. Plan 3 (encode the 29 inventoried standards) is drafted, not started. Sign-off sheet
for everything decided in 2a:
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
- **Enum/text inputs reach formulas as strings (Plan 3 Task 1b, a138-I-1).** `EvalInputValue.value`
  is `number | string | null`; every caller builds it through ONE rule, `engineInputValue()`
  (`engine-input.ts`): `number` → the finite number, `enum`/`text` → the non-empty string
  VERBATIM (never coerced), `''`/null/other types → missing (`manual_required`); unit checks skip
  strings; `substituted` records the string and the card/PDF render it quoted (`x = 'V3'`).
  A string that reaches `+ - * / ^` / a math call is the evaluator's `Operand ist keine Zahl: …`
  → `manual_required` (German), never `computed: NaN`; `lookup()`, `if()` and `==` consume it.
  Caveat (pre-existing evaluator semantics): a numeric-LOOKING text value such as `"12"` is coerced
  by `toNumber` and computes — a text field must never share a symbol with a numeric input.
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

## What Plan 2b added (2026-09-16/17, commits `5c6bc98..f47d7f9` + close-out on `feat/guideline-to-tool`)

Plan 2b is the **editor half**: a register, a reference and a table-fill scalar now render from
their DB row (`widget` + `ui_config` / `lookup`) with no per-standard React. Nothing here
changes a computed number — the six A138-07 outputs and the three VSME-B04 sums come from the
same Plan-2a formula strings (`engine-wiring-a138-07*.test.tsx` untouched). Sign-off sheet
for everything decided in 2b: `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md`.
**Plan 3 encodes the 29 inventoried standards onto this** — the recipe in Steps 2–5 plus the
encoder notes below; no new renderer is expected per standard.

### The `WIDGETS` registry — one renderer path (`src/components/worksheet/widgets.tsx`)

- `renderWidget(f, ctx)` = `WIDGETS[effectiveWidget(f)]`, where `effectiveWidget(f)` is
  `f.widget ?? inferWidget(dataType, hasEnumValues)`; an out-of-enum DB string falls back to
  the scalar renderer (`Object.hasOwn` guard, never a prototype key). `worksheet-form.tsx` has no
  symbol-keyed carrier wiring left — the guard test
  `src/components/worksheet/__tests__/worksheet-form-no-symbol-wiring.test.ts` pins the exact
  allow-list of symbol reads that remain (ASM method/provenance, `ac_as_ratio_check`, `A_S_m`)
  and fails the moment a new `fieldBySymbol.get('…')` / `f.symbol === '…'` appears in the form.
- Dispatch precedence while `widget IS NULL` (mirrors the pre-2b form): bespoke-by-symbol >
  register config (`resolveRegisterConfig`: the two hand-built fallbacks, then the **23
  register-kind** entries of the 36 TS selection configs via `toDbShape` — the other 13 are
  checklists; count re-executed 2026-09-17 over `SELECTION_CONFIGS`) > legacy TS checklist
  (`resolveSelectionConfig`) >
  `renderDynamic` (`DynamicField`: scalar / select_one / attestation, the json-checklist
  branch, the "Mehrzeilige Eingabe — Phase 2" placeholder). A DB row with a non-null `widget`
  is authoritative and skips every fallback.
- `widgetPlacement(f)` → `{ placement: 'section' | 'bottom', title }`: bespoke ⇒ bottom with
  its h2; register ⇒ `ui_config.placement ?? 'bottom'` (the single default lives in
  `registerPlacement()` in `register-editor.tsx` — the 36 selection migrations carry no
  placement key and keep their bottom position); TS checklist ⇒ bottom; DB `select_many`,
  `reference`, `lookup_fill` and everything scalar ⇒ in its section. The bottom strip is
  ordered by `orderIndex` and every bottom section carries `data-testid="bottom-<symbol>"`.
- `WidgetContext` carries `standardCode, locale, projectId, readOnly, fieldBySymbol, values,
  setField, symbolLookup, engineStates, equations (the ENGINE list incl. fallback register
  equations), computedSymbols, serverComputedSet, rainfallDesignReturnPeriod, renderDynamic`.
  A widget that cannot resolve its config calls `ctx.renderDynamic(f)` — the `DynamicField`
  path is never bypassed for an unmigrated field.
- **Bespoke escape hatch:** `ui_config.editor` ∈ `rainfall_tables | risk_register |
  risk_mitigation_plan` (DB) or, while `widget IS NULL`, `BESPOKE_BY_SYMBOL` (`r_D_n_table`,
  `risk_register`, `risk_mitigation_plan`). Unknown keys never dispatch. The KOSTRA grid, the
  basin editor, the ASM block and the VSME CO₂ engine stay bespoke by design (spec §5.3).

### Encoding a register (`widget='register'`, `ui_config` per `field-config.ts` `registerUi`)

`RegisterEditor` (`src/components/worksheet/register-editor.tsx`) renders any register from
its config; `ReadOnlyRegisterTable` is the consumer-side mirror (a consumer worksheet never
gets an editable carrier — `registerSources` on the form feeds `carrierSourceState` + the
mirror; the "nicht erfasst / nicht final" banner is generic per source). **Consumer-side
plumbing is generic since the fix wave (I-3):** the page calls
`loadRegisterSources(projectId, standardId, code)` (`src/lib/db/queries/worksheet.ts`), which
returns EVERY register-widget field on another worksheet of the standard that the current
worksheet consumes — directly (`consumer_worksheets`) or transitively (an owner equation
reads the register and produces a symbol the current worksheet consumes). In prod the
A138-07 `surface_inventory` field itself declares `consumer_worksheets = ["A138-10","A138-15",
"A138-26"]` (read-only check 2026-09-17), so the direct rule already lists it there; the
transitive rule is nonetheless LOAD-BEARING for the withhold: A138-13 inherits `A_C` (Gl. 2
output of a possibly-draft A138-07) without being named on the carrier, and that inherited
value must be withheld and explained. Each entry carries the owner's `{ widget, uiConfig }`
and `producedSymbols` (the owner equation outputs read from the register AND consumed on this
worksheet); the form resolves each entry's config from that DB row first, the symbol-keyed
TS fallback second, and the page withholds the inherited `producedSymbols` while the source
is not `ok` (`carrierWithholdFieldIds` — generic since round 2, D-2b-8 built). **A banner
never claims withholding that does not happen:** `carrierSourceState({ withholds })` drops the
"— abgeleitete Werte ausgeblendet" suffix when the consumer carries none of the produced
symbols — the 14 TS selection registers with `consumer_worksheets` (DWA-M-820-1/-2, FLL-NT)
read `Quelle <owner> nicht erfasst.` / `Quelle <owner> nicht final (n/m Zeilen vollständig).`
and still get the mirror. A DB `register` row whose `ui_config` fails
`parseFieldConfig` renders the `register-unconfigured` notice + the dynamic input (never
silent).

- **Columns** (`columns[].type`): `text` (datalist), `number` (min/max warning, not a gate),
  `boolean`, `enum` (`options` + `option_labels` / `value_labels`, `sort_by_label`), `date`,
  `lookup_key` (select over the bound table's rows, `<optgroup>` by `lookup.group_by`),
  `lookup_value` (read-only, refilled from the table row; an override input only while the
  register's `override` flag is on and the column is in `override.applies_to`), `derived`
  (`expr` evaluated per row by Plan 2a's `prepareRegisterRows` — never stored; `display:
  'badge'` renders it as a badge in its own column), `grid` (placeholder — Task 9 NOT built).
  `aria_label` when the input label must differ from the header; `discriminator` +
  per-column `visible_when` in ROW scope (`fail` hides the cell and stores `null` / `''` on the
  next write; the engine's completeness rule skips the same cell — one rule).
- **`flags`**: `[{ key, label?, note?, disables_rows? }]` — one checkbox each, stored on the
  carrier next to `rows`, read by `flag(register, 'key')` in formulas;
  `registerFlagKeys(symbol, ui)` reads them — only `ui.flags` count (a migrated register
  without `flags` has none; the former `REGISTER_FLAG_KEYS` symbol map was dead code and is
  deleted). `disables_rows: true` greys the table while the flag is on
  (VSME "Keine berichtspflichtigen Schadstoffemissionen") and, for a consumer's
  `carrierSourceState`, a flag that is ON with zero rows is an explicit null-report (`ok`
  once the owner is approved/final), not a missing source.
- **`footer`**: the symbols of the equation rows whose `input_symbols` name the register
  (`['A_E_ba', 'A_E_nba', 'A_C']`, `['AmountOfEmissionToAir', …]`). The footer shows ENGINE
  states (`footerStatesFor`: value, or `—` with the reason as title) — the editor never sums.
  Every register footer reads `n Einträge · n/m vollständig · <label>: <value> <unit> …`. The
  legacy `sum_column` (Plan-1 contract, the 36 TS selection registers) is a display-only
  client sum — retire it per register when an equation row exists (sign-off D-2b-5).
- **`override`**: `{ flag_key, applies_to, policy }` — `flag_key` MUST name a `boolean`
  column (zod refine, Task 5); no `override` block ⇒ locked (no toggle). The toggle sits under
  the first `lookup_key` column; while on, the table pair stays visible (`Tab. 9: 0,9 / 1`)
  and a stored value ≠ table shows `mismatch-<key>`. **The policy comes from the TABLE**
  (I-4): `resolveRegulationTable(std, <first lookup_key table_code>).override_policy` is the
  single source; `ui_config.override.policy` is only the fallback while that table is
  unknown, and a disagreement is listed in `register-diagnostics` ("… weicht von Tab. N (…)
  ab — die Tabelle gilt"). `locked` ⇒ no toggle even with an `override` block; `anhaltswert`
  ⇒ toggle + a reason textarea per overridden row (`recordManualOverride(fieldId,
  'register:<TABLE>:<rowId>', reason)` → `audit_log`; `register-reason-missing` until saved —
  visible state, no save-time gate); `kann` ⇒ the `lookup_value` override control is a select
  over the value column's printed alternatives (`value_columns[value].values`), no reason;
  `messwert` ⇒ free entry labelled "(Messwert)" + reason. The override input follows the
  value column's type (a string/enum column gets a text input, never a number input).
- **`placement`** (`section | bottom`, default bottom), `title`, `subtitle`, `add_label`,
  `legacy_map` (Plan-2a legacy-shape replay), `catalog` (Task 9 — contract only).
- Output fields fed by the register carry the hint `Aus dem Register „<title>“ berechnet
  (unten auf dieser Seite | in diesem Abschnitt).` / `Wird beim Speichern aus dem Register
  „<title>“ berechnet.` (generic, all standards).
- Test recipe: one render test with a 2-row fixture through `RegisterEditor` (Step 3) plus,
  if the register feeds equations, one FORM-level case asserting the `footer-<symbol>` values
  from the engine (pattern: `register-editor-vsme-b04.test.tsx`).

### Encoding a reference (`widget='reference'`, `ui_config` REQUIRED — importer rejects a row without it)

`{ carrier_symbol, rows_path, id_key, label_key, badge_key?, badge_labels?, title?,
aria_label?, empty_label? }` — `ReferenceField` renders a `<select>` over the rows found at
`carrier_symbol` → `rows_path` on THIS worksheet (own or inherited carrier;
`CARRIER_NORMALISERS` upgrades a legacy carrier shape first) and stores the row's `id_key`
value as the field's own `text` (or `enum`) value — never a copied row. No rows ⇒ a disabled
select + `reference-empty` notice (never a raw text input). A stored id no longer among the
rows ⇒ placeholder selected + `reference-stale` hint naming the table the engine actually
uses. **Contract note for Plan 3 encoders (D-2b-13):** the stale-ref hint assumes every
reference consumer resolves a stale/unset id to the carrier's FIRST row (true today: the only
config is `rainfall_table_ref` and all five readers route through `resolveSelectedTable`,
which falls back to `tables[0]`). A new reference config must either adopt that first-row
fallback convention in its readers or the hint must become config-driven (`stale_fallback:
'first' | 'none'`) — do not encode a reference whose engine reads "nothing" on a stale id
without first adding that key. First instance: A138 `rainfall_table_ref` (renders in its
section on A138-13..22; `RainfallTableSelector` deleted).

### Encoding a lookup_fill (`widget='lookup_fill'`, binding in `fields.lookup`, presentation in `ui_config`)

`lookup = { table_code, role: 'value' | 'limit', keys: [{ column, from_symbol }], value,
edition? }` — `keys[].column` must equal the table's `key_columns` in order (importer rule
`validateLookupKeysOrder`; since I-2 the importer registers the standard's DB tables before
validating and an UNREGISTERED `table_code` is an import ERROR — `lookup_fill <symbol>: table
<CODE> not registered (seed it first or check table_code)` — never a silent pass); the
field's `data_type` must be `number | text | enum` (I-1 importer rule; boolean/date/json are
rejected). `ui_config = { source_label?, reason_min_length? (≥ 10) } | null`.
`LookupFillField` resolves the row by column NAME from the worksheet symbols named in
`from_symbol` and shows a source badge (`Tab. 6 (Grenzwert)` / `Tab. 9: 0,2`).

- **Ownership rule:** a symbol in `ctx.computedSymbols`, in `ctx.serverComputedSet`, or on an
  inherited copy (`inheritedFromWorksheet != null`) is **display-only** — the persisted value
  read-only, source-only badge, no write, no override control (A138-12 `ac_as_ratio_limit`:
  the five `materializeLoadingCheck` sites stay the single producer). Otherwise the widget
  **fills** the field once from the table row, TYPED by `field.dataType` (I-1): `number` ⇒
  `{ type: 'number' }` (a non-numeric cell is never written), `text` ⇒ `{ type: 'text',
  value: String(cell) }`, `enum` ⇒ `{ type: 'enum' }` only when the cell string is one of the
  field's `enum_values` — otherwise the badge reads `Tab. X: Wert „…“ nicht in den
  zulässigen Optionen` and nothing is written (the override control is a number input / text
  input / select over the enum values accordingly);
  and re-fills on a key change only while the stored value still equals the previous row's
  figure; a typed deviation is never overwritten (a key change WHILE editing resets the
  deviation like "übernehmen" — the old value would be a phantom deviation against a row the
  engineer never saw).
- **Override = derived, not stored** (sign-off D-2b-2): `table_value` and `override` are
  computed at render (`resolveLookupFill`, `isOverridden`); the reason is persisted through the
  existing `recordManualOverride` → `audit_log` (`equationNumber = 'lookup:<TABLE_CODE>'`). The
  table's `override_policy` drives the affordance: `locked` ⇒ note, no button; `anhaltswert |
  kann | messwert` ⇒ `abweichend wählen` / `Tab. X übernehmen`, number input (`kann` ⇒ a select
  over the printed alternatives only; `messwert` ⇒ input labelled "(Messwert)"), textarea
  `Begründung der Abweichung` (≥ max(`reason_min_length`, 10)) + `Abweichung begründen`;
  `Begründung fehlt` is shown while overridden without a saved reason — a VISIBLE state, no
  save-time gate (sign-off D-2b-10).
- The `lookup_fill` label block is minimal (label, unit, badge, description) — no clause chip
  / verification marker / VerifyButton yet (sign-off D-2b-9; same gap on `reference`).

### The TS fallbacks and the migrations that retire them (all WRITTEN, NOT APPLIED)

| fallback (while `widget IS NULL`) | retiring migration (apply-order step) |
|---|---|
| `REGISTER_CONFIGS_FALLBACK.surface_inventory` | `20260916130000_a138_07_surface_inventory_widget.sql` (7) |
| `REGISTER_CONFIGS_FALLBACK.pollutant_register` | `20260916140000_vsme_b04_pollutant_register_widget.sql` (8) |
| `REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref` | `20260916150000_a138_rainfall_table_ref_reference.sql` (9) |
| `LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit` | `20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql` — **GATED D-2b-3, EXCLUDED** (10) |

All four (and the combined rollback `scripts/rollback-20260916130000-widget-configs.sql`, the
canonical one) are emitted by `scripts/regulation-tables/emit-widget-configs-sql.ts` from the
very fallback objects and byte-pinned by `scripts/__tests__/widget-configs-sql-freshness.test.ts`;
the embedded JSON round-trips through `parseFieldConfig` to the fallback (deploy-before-migration
parity). The four pre-schema readers named under "Apply order" (`saveWorksheet`, the approval
gate, the PDF loader, snapshot capture) are unchanged by 2b — step 1 is still the hard gate;
since the fix wave (C-1) all of them, plus the project report loader, ALSO call
`ensureRegulationTablesLoaded` (see Step 2). Cleanup after apply: the "Post-apply cleanup"
list under "Apply order" — read its freshness-pin paragraph before deleting anything.

### What is NOT built (honest residue)

- **Task 9 — risk-register grid** (`grid` column type as an editor, the multi-party assessment
  pattern, `catalog` picker, `grid_mean/grid_stdev/grid_count` reducers): SKIPPED by ruling —
  needs the grid reducers that Plan 2a did not add (sign-off D-2b-12 names the 2a amendment).
  `risk_register` / `risk_mitigation_plan` stay bespoke via `BESPOKE_BY_SYMBOL`; a `grid`
  column renders a `grid-pending` placeholder.
- **Per-row diagnostics dedupe**: `PreparedRegister.diagnostics` are de-duplicated by message
  in the editor list, but the save-path warnings still repeat per row (2a L-11 residue).
- **a11y readOnly pass**: read-only controls are `disabled` (per the brief's pin), not
  `readOnly` + `aria-readonly`; `aria-describedby` on the register's warnings is not wired
  (sign-off D-2b-7).
- **Shared `FieldHeader`** for the scalar-shaped widgets (D-2b-9); **save-time gate** for an
  unjustified lookup override (D-2b-10); the page's withhold gate is generic since round 2
  (D-2b-8 built — `producedSymbols` per source); `surface-inventory.ts` remains as a test-only differential oracle (D-2b-11).
- No render spot-check on a deployed build was run by Plan 2b (no dev DB in the executing
  sessions); the "Ready for your 5-minute look" list on the 2b sign-off sheet is the owner's.
- **Discriminator semantics** (spec §4 "selects which table applies / the row's limits") —
  contract-only, see Step 3 for the per-technology `lookup_key`/`lookup_value` + `visible_when`
  workaround and its two limits (first-key override binding, key-string equality). Sign-off
  F-2b-1.
- **Value-withhold gate for consumed registers** is generic since round 2: the page withholds
  every source's inherited `producedSymbols` while the source is not `ok` (for A138-07 these
  are exactly the six surface outputs, so the `surface-source-state.ts` shim now serves only
  its pins). The banner suffix follows the same fact (`withholds`).

### Fix wave after the final whole-branch review (2026-09-17, commits `550b631..`)

C-1 regulation tables loaded on every server evaluation path (transition BEFORE its tx,
approval gate, standard-report loader, project-report loader; `fake-drizzle` shim +
`regulation-tables-server-paths.test.ts`) · I-1 `lookup_fill` typed by `data_type`
(text / enum; importer rule) · I-2 importer registers DB tables before validation, unregistered
`table_code` is an error (`regulation-tables-load.ts`, no `server-only`) · I-3
`loadRegisterSources` (generic consumer plumbing; `loadSurfaceSource` deleted) · I-4 register
override policy from the table + per-row reason (`override-reason.tsx` shared with
`lookup_fill`; `overrides.ts` `equationNumber` max 80) · minors: `Object.hasOwn`,
`register-unconfigured`, datalist ids by field id, `carrierSourceState` flags + symbol,
non-numeric `lookup_value` override input, `registerFlagKeys` no symbol fallback with a config,
`ReadOnlyRegisterTable` row-scope `visible_when`. Evidence:
`.superpowers/sdd/2026-09-16-guideline-to-tool-plan-2b-generic-editors/fix-wave-report.md`.

### Verification snapshot at close-out (HEAD `f47d7f9` + the close-out commit, 2026-09-17)

`pnpm test` 231 files passed | 1 skipped · **2278 passed** | 1 expected fail | 1 skipped
(2275 at `f47d7f9` + 3 close-out pins; the Task-5 `it.todo` is closed) · `pnpm -s typecheck`
exit 0 · `pnpm eslint <51 branch-touched .ts/.tsx files>` 0 errors introduced (1 pre-existing
`no-require-imports` error + 1 warning in `engine-wiring-suppress-a138-17.test.tsx`, both
present at `3a1d8fa`; 2b's only touch there was removing a `vi.mock` line) · `pnpm vitest run
--project integration tests/harness/register-materialise.integration.test.ts` 1 passed
(embedded PG — 2b did not touch the save path) · `scripts/reasoning-map/` scorecards
regenerated by the full run are byte-identical in content to HEAD (EOL-only diff; 2b changed
no corpus result) · `git status --short` empty after the close-out commit.
