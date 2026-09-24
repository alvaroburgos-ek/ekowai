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
   **Since Plan 3 Task 4 fix round 1 (sign-off plan1-D-3-1):** prod carries a LEGACY per-cell table already
   named `regulation_tables` (5,382 rows / 35 standards, no `standard_code`); the migration first RENAMES it to
   `regulation_tables_legacy_v1` (+ pkey / fkey / index names; data untouched; idempotent) and only then creates the
   Plan-1 tables — without that step every seed migration below fails on "column standard_code does not exist" and
   the runtime fallback masks it. Its rollback refuses while the new table still holds rows (roll the seeds back
   first) and renames the legacy table back. Reproduction: `tests/harness/guideline-to-tool-schema-legacy-rename.integration.test.ts`.
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

**The emitter's producer guard is TRANSITIVE (Plan 3 Task 3 fix round 1).** `emit-field-configs-sql.ts` refuses a field or
section `visible_when` that would hide a symbol which is an `input_symbols` member of a same-worksheet equation whose output —
directly or through further same-worksheet equations — is a consumed field (a hidden input nulls the equation and the consumers
inherit the null). The prior snapshot carries the standard's equations (`prior.equations`, written by `build-prior-snapshot.mjs`;
`rewriteRules[id].remap` inputs are honoured); the refusal names the chain (`hides m_T_aM → Gl.10 Q_F_d_aM → Gl.9 Q_T_d_aM (consumed
by …)`). A legacy prior without `equations` degrades to the direct rule and the CLI prints a warning — re-capture before emitting.

**Self-consumer entries are ignored (Task 12b).** A field's own worksheet code inside its `consumer_worksheets`
is stripped before the guard decides anything: `loadInheritedFields` never inherits a field from its own owner
worksheet, so a self-only entry is a runtime no-op, not a real consumer (the walk still continues past it —
a self-only symbol feeding a further equation whose output IS consumed elsewhere stays refused). The CLI prints
one NOTICE line per affected symbol so an executor touching that standard can check whether the now-unblocked
rule is safe to re-emit (see SIGN-OFF-plan-3.md `plan3-T-12b`).

**The guard is GATE-AWARE (Task 12c).** The producer guard only protects other worksheets' inherited values; a
`visible_when` can also silently disarm a gate on the SAME worksheet — a hidden symbol is `null` for the engine
(`withHidden`) and every `compliance_requirements.condition` that reads it reports `not_applicable`
(`hiddenReferences`). That is an enforcement change and must be a sign-off (G-block), never an emitted default.
So `build-prior-snapshot.mjs` now captures every gate of the standard into `prior.gates` (`"<ws> <req_code>":
{ condition, severity, symbols[, parse_error] }`, `symbols` extracted AT CAPTURE TIME with the engine's own
`extractConditionSymbols` — loaded through tsx, never re-implemented; a condition the engine cannot parse gets
`symbols: []` + `parse_error: true`), and `emit-field-configs-sql.ts` refuses a field rule — or a section rule,
over every field of the section tree — whose hidden symbol appears in a same-worksheet gate's `symbols`. The
message names the gate(s): `hides A_min read by gate CR-01 (block: "max_d IS NOT NULL AND A_min IS NOT NULL")
— hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block`. Rules:
- **The IF-guard exemption** — the ONE way a rule passes over a gate that reads its symbol: the gate is
  `IF <driver> <op> <value> THEN …` and the rule's `visible_when` is exactly `<driver> <op> <value>` (same
  driver symbol, same op, same literal). Then the field is hidden precisely when the gate would not fire anyway.
  A compound guard, an `IS NOT NULL` / `IN` guard, a different driver, or a rule that adds `AND …` all refuse —
  write the gate guard to match the rule (a gate edit is itself a G-block) or STAGE the rule. Bare vs quoted
  literal (round 2 ruling): a bare `C2` in the gate and a quoted `'C2'` in the rule (or vice versa) ARE the same
  literal when no field with symbol `C2` exists on that worksheet in the captured prior — by the Task 13b rule the
  bare identifier then compares as the token string; when such a field exists the bare identifier resolves to it
  and the guard refuses.
- **`parse_error` gates refuse conservatively** — their symbols are unknown, so every rule on that worksheet is
  refused naming `parse_error`. Exception (round 2 ruling): an EMPTY / whitespace `condition` is `manual` at the
  engine whatever is hidden — still captured (`parse_error: true`), never a refusal.
- **"Reads" is the runtime's own test (round 3).** On top of the captured `symbols`, a gate reads the hidden
  symbol when `hiddenReferences(parseCondition(condition), {symbol})` is non-empty — the engine's N.A. pre-check,
  a superset of `extractSymbols` that also counts a bare-ident `==` / `!=` RHS naming a hidden field (`status ==
  neu` with a field `neu` on the worksheet ⇒ N.A. once `neu` is hidden). The captured `symbols` alone would miss
  it. The bare-literal rule above resolves a token against the captured rows of the worksheet, the fields this
  batch CREATES, and fields other worksheets own that are inherited here (`consumer_worksheets`).
- **`create` entries** run the same check; a section rule also covers the batch's creates landing in its section
  tree (walked over `parent_code`; a create without `section_code` lands in the first root section and is not
  resolvable, so it is not checked).
- **Equation chains count (round 4, from the DIN-EN-16941-2 G-9 finding).** A gate also reads the hidden symbol
  when the symbol REACHES, through same-worksheet equations (`equationReach` — the producer walk's BFS over
  `prior.equations`, `rewriteRules` remaps honoured, cycle-guarded), an output the gate reads: a hidden input
  nulls the equation, the output is null, the gate goes N.A. — hiding the Gl. 1 / Gl. 2 inputs under
  `vereinfacht` makes `Y_G` / `D_G` null and the block gate CR-12 unpassable even though nothing is consumed by
  another worksheet. The message names the chain: `hides Q_S → Gl.1 Y_G read by gate CR-12 (block: …) — STAGE as
  a G-block`. The IF-guard exemption applies as before (same driver / op / literal on the gate).
- **Amendment N — `select_many` on a non-json field is refused.** The checklist editor stores `{type:'json'}` and
  the enum reader expects `value_enum`; re-keying an EXISTING field whose captured `data_type` is not `json` to
  `select_many` would lose its data. Message: `select_many on a non-json field loses data (captured data_type
  enum) — STAGE the data_type switch (S-block)`. A `create` declares its own `data_type` (use `json`).
- **Legacy priors** without `gates` degrade to the producer-only guard; the CLI prints
  `warning: <slug>.prior.json carries no "gates" map …` — re-capture before emitting.
- **`--gate-guard=warn`** (library: `gate_guard: 'warn'`) turns each refusal into a `GATE-REFUSAL (warn mode) …`
  stderr line with byte-identical SQL. It exists for the Task 12c re-audit and for the freshness pins of
  standards whose modules still carry refused rules — each such pin asserts the exact refusal count, so a fix
  round that clears the list must flip the pin back to the default (refuse) mode. Never use it to emit a new
  standard.
- **The refusal file** `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/task-12c-refusals.md`
  lists every rule the re-audit refused on the 13 encoded standards (standard · worksheet · symbol/section ·
  gate · condition · why — after round 2: 10 real unguarded reads on din1989_1 and a262e; the bare-vs-quoted and
  empty-condition classes cleared by the two rulings). An executor's fix round on one of those standards works
  its rows: move the rule to STAGED, or file the G-block and keep it; nothing in the modules or migrations was
  changed by the audit itself.

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

**Encoding traps (Plan 3 Task 3, DWA-A-262E).** (1) Never re-bind an EXISTING input as `lookup_fill` when its key
symbol is not consumed on that worksheet: `lookup-fill-field.tsx` renders the read-only box (no input) while
`state.kind === 'keys_missing'`, so the engineer loses the field until the consumer edit lands — create the fill next to
the driver instead and STAGE the re-point (a262e-E-3). (2) A row-scope `visible_when` on a register column governs
completeness only; the prepared row keeps the stored cell (the editor nulls it on the next write) — branch the Σ formulas
on the discriminator (`if(type == 'rue', q_krit, 0)`), never on "the cell is hidden". (3) A limits table keyed by several
selects: seed every key combination the printed tables cover (a table without a printed split gets one row per token with
identical cells) — a missing row is a recoverable `lookup()` failure, and there is no fallback chaining in a `derived`
expr. (4) `x == 'a' AND y == 'b'` with `x` missing and `y` false is `fail` (hides); with `y` true it is `pending`
(visible) — a section rule may name a not-yet-consumed driver in an AND and still hide on the consumed leg.
(5) `last_rows(reg, n)` takes the last n COMPLETE rows in entry order (no `sort_by` column) — say so in the register note.

**Encoding traps (Plan 3 Task 4, DWA-M-277E).** (1) `sum_rows` / `max_rows` over a register with NO complete rows
is `manual_required` ("Keine vollständigen Zeilen"), so a formula over two registers (Eq. (1)'s Σ persons + Σ areas)
must guard the optional one: `sum_rows(a, x) + if(count_rows(b) > 0, sum_rows(b, x), 0)` — `count_rows` is 0 on an
empty register and `if()` short-circuits (the unused branch may be null). (2) A register-fed equation must live on the
register's worksheet (the engine sees a register of its own worksheet only, and a `create` never sets
`consumer_worksheets`); when the brief places the Σ on another worksheet, create register AND output together and STAGE
the re-point of the prod equation (m277e-R-1 / -C-1). (3) A transposed limits table (categories as columns) is ONE
single-key table with one value column per parameter (`TABLE4_LIMITS` keyed `quality_category`) — a `lookup_fill`
selects the value column, so no key literal is needed; the brief's per-parameter split is unnecessary. (4) Prod enum
tokens can be upper-case (`A1`, `C2`) — copy them from the capture, never from the brief. (5) Prod already holds a
LEGACY table named `regulation_tables` (5,382 rows, columns `variant_value` / `value_text` …): the Plan-1 schema
migration's `CREATE TABLE IF NOT EXISTS` is a no-op there and every Plan-3 seed INSERT fails on it while the runtime
fallback masks the failure — resolved by the Plan-1 amendment plan1-D-3-1 (the schema migration renames the legacy
table first). (6) Never splice SQL or docs with `String.prototype.replace` and a replacement string containing `$$` / `$'` /
backticks under a shell — `$$` collapses to `$` (dollar-quote tags), backticks are command-substituted; write the replacement
from a file or use `split/join` (Task 4 fix round 1: the `DO $$` block became `DO $` and only the embedded-PG run caught it).

**Encoding traps (Plan 3 Task 5, DWA-M-1200-1).** (1) A register `lookup_value` column's `lookup.key_column` names the
REGISTER column that holds the key (`klasse_sub`), not the table's key column — a wrong name yields silent `null` cells, no
diagnostic. (2) A row-scope `visible_when` may read a same-row `derived` column (`massnahmen ← ausgangsrisiko_code >= 3`);
a null derived value leaves the condition `pending` (visible, required still counts). (3) `if(x IS NULL, …)` works inside a
row `derived` expr — use it to keep samples without a printed requirement out of a compliance share; `a / count_rows(…)` over
zero rows is "Division durch Null" → `manual_required` (never 0 or 100). (4) Yes/no drivers are often prod ENUMS (`ja` /
`nein`), not booleans — check the capture before writing `== true`. (5) An OCR-damaged KEY column (Tab. 8 / Tab. 27 class
cells as images) is assigned from the caption order plus in-text prose that repeats the cells, cross-checked against a
sibling standard that reprints the table — but the table stays `imported_unverified` and every assignment gets a U-block.
(6) Two sub-classes sharing one printed row (B-1/B-2) are seeded as two rows with identical cells and the same span, keyed
by the prod tokens — no mapping table / chained fill. (7) Never re-bind an existing consumed enum as `lookup_fill` when one
of its table cells is unreadable/empty: the widget renders a read-only "—" for that key and the engineer loses the input —
create a text twin instead (m1200_1-E-3). (8) Generating quote constants with `String.replace(re, "${'$'}{")` silently
emits nothing (`$'` is a replacement pattern) — use `split('${').join(…)` in the generator too, not only in file splices.

**Encoding traps (Plan 3 Task 6, DWA-M-1200-3).** (1) A `lookup()` key argument may be any expression — a nested `if()` over
the inherited class selects the printed row group (`lookup('TAB789', sprinkler_gruppe, if(gueteklasse == 'D', 'd', 'a_c'), …)`),
and a nested `if()` may sit inside `== true` to switch the value COLUMN a boolean table prints per moment (TAB13) — the column
name itself must still be a string literal (G-14). (2) A null `derived` cell in a COMPLETE row makes `count_rows(reg, col == 0)`
undecidable (`manual_required` "Fehlende Eingabe für count_rows()") — make every branch decidable (non-applicable rows → 1) and
let only a genuinely unreadable printed cell (an empty Tab.-8 cell, U-1) leave the null; never seed a guessed value to keep a
count computing. (3) Unset boolean cells coerce to `false`, so `flag == true` is decidable on rows where the cell is hidden;
`null >= 72` is `pending` (visible) — a threshold rule on an empty number keeps its dependants visible. (4) Prod gates may live
on a MIRROR worksheet (DWA-M-1200-3: CR-05 / -06 / -09 on M12003-05, whose fields are orphans) — a register-based gate rewrite
then also moves the gate's `worksheet_template_id`; STAGE the move with both restores. (5) A staged DELETE on a table without
`active` (equations, compliance_requirements) archives the full rows in the same transaction (`CREATE TABLE … AS SELECT *`) and
rolls back from the archive — `prod-query.mjs` truncates cells, so a hand-typed INSERT rollback would be lossy. (6) A Plan-1
selection register that exists on two worksheets (the Plan-1 UPDATE carries no `w.code` filter) needs one Plan-3 UPDATE entry
per worksheet; keep the Plan-1 column KEYS so stored rows survive the upgrade, and put the Σ footer only where the equation lives.
(7) An inventory's parenthesised cell ("(1-fache)") or gate claim ("CR-05 lists both") is a pointer — re-read the transcript
line and the capture before encoding; both were refuted here.

**Encoding traps (Plan 3 Task 7, FLL-GAR-2023).** (1) Check the DRIVER's `consumer_worksheets` for resolvable codes before
keying anything on it: prod's `abdichtungs_art` carries the range string `"FLL-GAR-10..21"` (and `"All"` elsewhere), which
`loadInheritedFields` (`code = ANY(consumer_worksheets)`) never matches — every gate, section rule and fill keyed on it is
`pending` / `manual_required` until the consumer edit (fll_gar-C-1); emit the rules anyway (a `pending` rule is visible and inert)
and pin the capture fact in the test, so ratifying the one UPDATE lights everything up without a second migration. (2) Booleans are
NOT formula inputs (`engineInputValue` maps them to missing) — a yes/no that drives a NEW scalar equation must be a created enum
(`ja`/`nein`, or the printed pair); for a `lookup_fill` a prod boolean works as a key because `resolveLookupFill` stringifies it
(`'true'`/`'false'` tokens in the table, `String(boolean)`). (3) `evaluateFormula` checks every named scalar input BEFORE
evaluating — an `if()` branch does not exempt its inputs (unlike an optional register under `count_rows`); a class formula over
several inputs needs all of them entered (say "0, wenn keine" in the label). (4) A plain-text transcript (no LaTeX) splits one
printed row over several lines and hyphenates ("Gruben-  \ntone"): lift the span by line range, collapse whitespace for the
regexes, keep the raw span as the quote, and keep hyphenated fragments verbatim in labels rather than de-hyphenating by guess;
markdown escapes (`\-`, `\>`, `\*`, `\=`, `\.`) must be un-escaped with `split/join` before matching cells ("GU\*" is the printed
"GU*"). (5) A footnote digit after a cell ("40 mm 2") and the next cell's leading digit ("7 mm 15 mm") look alike to a lazy
regex — require the footnote token to be whole (`(?: ([12])(?=\s|$))?`) and pin every parsed row. (6) One prod token may cover
several printed rows (Tab. 1 has three asphalt rows under `mineralisch_bitumen`): key those rows on the finer created select in a
sibling table (`TAB1_ASPHALT` by `mischgutart`) and leave the coarse token without a row (E-block) — never pick one of the three.
(7) A table whose printed cells are only "X" / "(X)" / "-¹" carries no "not allowed" state — count what is printed
(`zulaessig == 'sonder'`), not the absent negative.

**Encoding traps (Plan 3 Task 8, FLL-Naturteich).** (1) A register whose rows mix a `locked` table and an `anhaltswert` table
(Tab. 10 hydrobotanical limits vs Tab. 15 grain surface) must keep the locked-table key as a plain `enum` column and reserve
the single `lookup_key` for the table whose value the engineer may override — the override toggle follows the FIRST
`lookup_key` (G-B2 / I-4); the locked limits are read by `lookup('TABLE10', <enum column>, …)` in `derived` columns. (2) A
transposed limits table with ONE printed value column (Tab. 7 / Tab. 8) is a single-row table keyed by a literal (`source =
'all'`) and read with `lookup('TABLE7', 'all', '<param>_max')` from row scope; only the parameters that print a per-type split
go into a table keyed on the prod driver (`TABLE8_P`, one row per token with identical cells per group). (3) Check the DRIVER's
`consumer_worksheets` before keying a register column on a worksheet symbol: a row `derived` that reads a symbol not in scope
is null and turns `count_rows(reg, ok == 0)` into `manual_required` — emit it anyway (pinned), STAGE the consumer edit, and key
the tables that do not need the type (Tab. 9) on a CREATED select instead. (4) An English pdftotext layout may be the only
place a wide table's cells can be assigned to their columns (Tab. 1 interleaved; Tab. 10–12 single cells spanning two
columns): cite both files and lines, keep the md as the verifier's source, and let the reviewer see which tables lean on the
layout (`imported_unverified` + a J-block) — the brief's "both agree cell-for-cell" is the bar for `md_verified`. (5) The two
sources hyphenate differently ("verifica- tion" vs "verifi- cation") — a per-table printed fragment, asserted with `cell()`,
catches the slip before any migration is emitted. (6) A guideline that defines a zone as NOT part of the pool ("Supplementary
area … do not belong directly", §3) may still be summed by prod's own field definition — encode the guideline's share
(water area only) and prod's total (all zones) as two outputs and record the difference (J-4), never silently pick one.

**Encoding traps (Plan 3 Task 9, DWA-M-820-3).** (1) A checklist catalogue (`Nr. | Kriterium | Hinweise`, 193 printed rows over
ten annexes) is a regulation TABLE whose rows are text: key `nr` = the printed number as token `n1` …, value columns the printed
cells + `nr_num`; lift every row span MECHANICALLY by line range (a throwaway parser that tracks the nested
`\begin{tabular}{l}…\end{tabular}` depth so a multi-line cell ends the row at depth 0) and assert every cell inside its span
at build time (`inSpan`) — the verifier then passes first run; keep OCR quirks verbatim in the values ("Automatisie-rungs-",
"..In Scope")"). (2) The register that consumes such a catalogue is `nr` lookup_key → text lookup_values (the printed cells
fill on pick) + an enum rating; a catalogue prod splits over two worksheets stays ONE table — each half's register carries a
row `derived` badge `if(lookup(T, nr, 'nr_num') >= from AND … <= to, 1, 0)` and every count filters on `badge == 1`, so a row
picked on the wrong half is visible and not counted. (3) `count_rows` over an EMPTY register is 0 (computed), unlike the Σ
functions — a count twin next to a manual required count silently reads 0 until rows are picked; never let an equation take
ownership of an existing consumed manual count (create `_calc` twins, STAGE the switch as a D-block with the full 48 × 4 SQL
generated from the same template). (4) `consumer_worksheets = ["ALL"]` is a prod token `loadInheritedFields` never matches
(`code = ANY(...)`) — the same trap as a range string (Task 7); a driver declared "ALL" reaches NO worksheet, so every rule
keyed on it is `pending`: emit on the CREATED fields anyway, pin the capture fact, STAGE the one consumer UPDATE (C-1).
(5) A standard whose every existing field is consumed (246 / 250 here) admits no `visible_when` UPDATE at all — the whole
visibility story lives on created fields + STAGED section blocks; say so in the report rather than emitting inert
field-free section rules (Task 8 lesson). (6) A 67-input `if(a == 'x' OR b == 'x' …, 1, 0)` over enum inputs parses, is
engine-eligible and computes (strings via amendment D), but every input must be set — an `if()` branch does not exempt
inputs; split such a flag per annex when projects of one type exist, and record the "set the other annex nicht_zutreffend"
rule in the label. (7) Generating TS with `JSON.stringify` for every lifted span sidesteps the `${`/backtick hazards; the
Bash heredoc on this machine collapses `\\` to `\` — write generator scripts with the Write tool, never a heredoc.

**Encoding traps (Plan 3 Task 10, DIN-18130-1).** (1) A lab-test standard's core is a readings register whose row exprs read
WORKSHEET scalars (`gefaelle_typ`, `A`, `l`, `l_0`, `a`, `gamma_w` via `ctx.symbol`, G-13) — pass a `symbolLookup` to
`RegisterEditor` / `prepareRegisterRows` in tests, and switch the printed alternatives (Gl. 8 vs Gl. 9) INSIDE the row
`derived` expr plus row-scope `visible_when` on the columns; the same switch on the prod scalar equations is a
verified-equation replacement (STAGED). (2) The register cell / footer formatter (`fmt`, 4 fraction digits) prints
|k| < 5·10⁻⁵ as "0" — for permeability-scale values add mantissa / exponent derived columns (`floor(log10(k))`,
`k / 10^floor(log10(k))`; the standard itself asks for "Vielfaches eines Exponentialfaktors zur Basis 10") and record
the formatter gap (din18130_1-I-2); the equation cards use `toPrecision` and are fine. (3) A two-boolean table (Tab. 4)
keys on the stringified prod booleans `'true'` / `'false'` and the fill must sit on the worksheet of BOTH booleans; the
Ja/Nein segmented control stores `false`, so "nein" is a real key. (4) Pin every equation against the standard's OWN
worked examples through the real register contract (Tab. 9 / 10 / 11 here reproduced k, α, k_10, i and the means to the
printed digits) — a printed value that does not reproduce exposes a wrong γ_w / unit assumption immediately; where the
standard rounds inside its inputs (Tab. 9 Versuch 2), pin to the digits that survive. (5) A discrete table with a
worked example BETWEEN its rows (Tab. 3: S_ra = 0,88 → 720) is emitted with the policy its own wording supports
(`locked` — no sentence permits intermediate values; contrast Tab. 2 "Zwischenwerte können geradlinig eingeschaltet
werden") and the example goes on the sheet as an O-block PROPOSING `anhaltswert` (controller ruling, Task 10 fix round 1).
(5b) Never re-bind an EXISTING input as `lookup_fill` when it is consumed elsewhere or read by a gate (Task 7 E-2 rule):
with the key unset the field turns read-only (`keys_missing`) and a legitimately printed "0" case (u_0 = 0) cannot be
recorded — create a twin fill beside the key and STAGE the re-bind (`widget IS NULL`-guarded UPDATE + `fields_archive`
rollback). (6) `\multirow` Bauteil spans in a
suitability matrix: seed only the sub-rows whose mark is printed on the row itself, key the rest out (U-block with the
alignment / cross-reference leads), and seed the printed "-" cells as explicit `nicht geeignet` rows so the fill
distinguishes "not suitable" from "no row".

**Encoding traps (Plan 3 Task 11, DWA-M-205).** (1) A visibility rule on a field that a block gate reads (`wiederverkeimungsbeurteilung`
← CR-31) turns the gate `not_applicable` whenever the rule fails — that is an enforcement change, not visibility: STAGE it as the gate
guard it really is (`IF standzeit > 0 THEN …`, m205-G-6) and never emit the field rule first. (2) A target table with several
printed row heads that the brief keys on scalar drivers (`gewaessertyp` × `guetekategorie`) must be keyed on what the REGISTER's
worksheet actually inherits — check the drivers' `consumer_worksheets` before choosing keys; prod's combined `gewaesserklasse`
(binnen_gut, kueste_gut, …) is inherited on M205-10, the two separate selects are not; a printed cell with no prod token
(`kueste_ausreichend`) is still seeded under its natural token so the table is complete, and the token gap is an E-block (D-1).
(3) A `lookup_value` column with a printed "-" cell (Strep. faecalis I-Wert) makes the row's derived `ok` null and
`count_rows(reg, ok == 0)` `manual_required` — do not paper over it with `if(x IS NULL, …)` readings; keep the null, show the
printed text in a sibling `derived` column, offer the `behoerde` discriminator branch, and record the J-block. (4) `mean_rows` /
`min_rows` over a register whose `derived` column is null on SOME complete rows (log10(c_in / c_out) with c_out = 0) fails with
`Unbekanntes Symbol` — filter with the conditional third argument (`mean_rows(reg, log_red, c_out > 0)`) and say so in the note.
(5) Printed RANGES per select token (Tab. 4 lamp figures) are never filled into a number field (SR-2 — a `_min` fill is an
auto-pick): create TEXT `lookup_fill` twins that show the printed cell, seed the numeric bounds as `_min` / `_max` columns for a
STAGED range gate, and leave the existing numeric inputs as manufacturer data. (6) A figure the standard states as arithmetic on
printed numbers ("etwa 10 kWh/kg … bei Luft ca. 60 % mehr" → 16) may be seeded with the printed operands beside it and a J-block;
never seed a number the text only implies without stating the rule. (7) A `lookup_fill` over a cell that is null for one token
(katalytisch has no hold time) shows "—" as a limit — hide the fill for that token with `visible_when` instead of seeding a
placeholder. (8) `extractSymbols` takes a parsed node (`parseExpression(src)`), not the source string — a string argument
yields an empty set silently. (9) A discriminator register that mixes a `lookup_key` (Tab. 1 row picker) with `derived`
`lookup()` rows (Tab. 2 / 3 from worksheet scope) is the working pattern for "which target table applies": row-scope
`visible_when` on every branch column, one `limit` derived by nested `if(quelle == …)`, no `override` block — the "authority
sets the target" sentence is a `behoerde` branch with typed inputs, not an override of a table value.

**Encoding traps (Plan 3 Task 12, DWA-M-187).** (1) A "text-limit" standard (no numbered equations, every figure a sentence) seeds one
printed sentence per table ROW keyed `(driver, parameter)` with `wert / unit / comparator / modal` columns — the `modal` column carries the
printed verb so the policy question stays visible per row; a `lookup_fill` still needs a table keyed by the DRIVER only (one `from_symbol` per
key column), so a combined "sonderanwendung × variante" limits table splits into one table per key shape (`S5_LIMITS_P` / `_SPUR` / `_APP`) —
a `'-'` variant token has no symbol to come from. (2) Prod may list a field's OWN worksheet in `consumer_worksheets` (86 of 139 here — an
import artefact): the producer guard then refuses every visibility UPDATE on it; put the branch rules on CREATED fields, STAGE the hygiene fix
(`array_remove`) and pin the self-consumer count from the capture, never from an estimate. (3) A yes/no toggle that changes a LIMIT (carbonate
layer → h_FK 0,25 → 0,2 m) is one `derived` equation over ONE table row (`if(toggle == 'ja', lookup(…, 'h_fk_carbonat_m'), lookup(…, 'h_fk_min_m'))`),
not a second lookup table keyed on the toggle. (4) A printed sentence with NO operator ("Begrenzung … auf 0,01", "auf h_FK 0,2 m verringert")
is seeded with `comparator = null` plus the printed fragment in a text column / text fill, the gate proposal picks the physically safe side and
the J-block records it — never seed the operator. (5) A standard's own worked figure may sit ON its strict bound (1,25 m from 15 min · 5,0 m/h
under "< 5,0 m/h"): keep the printed strict comparator in the row badge and pin the boundary case. (6) Check the inventory's "NOT found"
claims against the transcript before encoding a null cell — the "0,2 m mit Carbonatschicht" sentence exists at L930 (R-5 reversal, J-4).
(7) A `lookup_value` string cell compares with `==` / `!=` in row scope and a boolean `lookup_value` with `== true` (probed) — a
"filterwirksam" flag on the layer table lets one Σ formula split h_FK from h_Drän without a derived column. (8) `min_rows(reg, col, cond)` with
`cond` over an OPTIONAL column is `manual_required` on every row where the cell is null — condition only on required columns (`ablauf > 0`).
(9) A "muss … getrennt werden" that applies above a threshold is a CREATED attestation with `visible_when threshold` + a STAGED
`IF threshold THEN attest == True` gate; the unconditional prohibition in the same sentence ("darf … nicht … eingeleitet werden") is a
separate unconditional gate — never hide the boolean under the threshold.

**Encoding traps (Plan 3 Task 13, DIN-276).** (1) String-literal rule (Task 13b, sign-off din276-X-1 — fixed on branch): a QUOTED string on the right of `==` / `!=` (and inside `IN {…}`) is a literal, ALWAYS — `status == 'rechnung'` compares against the token even when a valued symbol or register column named `rechnung` is in scope (`Literal.quoted` carried from the tokenizer through the AST; `evaluate.ts` `case 'compare'` / `hiddenReferences` skip the symbol resolution for it). A BARE identifier keeps the legacy var-vs-var rule: `status == rechnung` resolves `rechnung` when it is valued, else compares the token (C-1). So: QUOTE every enum token in a comparison (`'rechnung'`, `'KG 300'`), and use the bare form only when you MEAN a symbol. The emitters WARN (stderr, never a refusal) when a quoted literal equals a register column key or a symbol of the worksheet — such a collision is harmless under the rule, but a bare-ident spelling of the same token elsewhere would resolve; record it on the sign-off sheet. Task 13's DIN-276 rename (`angebot_eur` / `auftrag_eur` / `rechnung_eur`, `kg1 = 'KG 300'`) stays — a token that can never be an identifier is still the cleanest encoding. (2) A catalogue prod spreads over several worksheets (Table 1 → eight KG worksheets) gets ONE register PER worksheet over the SAME table with a row badge (`im_kg`) for the worksheet's own group — a register-fed Σ must live on the worksheet of the scalar it twins; a single register on one worksheet cannot feed the others (a `create` never sets consumers). (3) A structural table column (parent / ancestor) is legitimate when the standard prints the rule (`three-digit ordinal numbers`) — assert the printed cells only, put the derived columns on the sheet (J-block), and make ancestor lookups decidable on every row (`if(level == 1, '-', lookup(…, 'kg2'))`) so a Σ condition never meets a null. (4) `sum_rows(reg, expr, cond)` with NO matching row (a KG without positions) is `manual_required` like an empty register — guard every per-group Σ with `if(count_rows(reg, cond) > 0, …, 0)`; a `sum_rows(reg, if(cond, x, 0))` form reads 0 by itself. (5) "previous" as `Σ last_rows(reg, 2) − Σ last_rows(reg, 1)` reads 0 with a single row — add `count_rows(reg) >= 2` as the Σ condition so one row is `manual_required`, never a phantom 0 deviation. (6) A two-key table (Table 4 keyed `(kg, nr)`) is read in row scope with positional keys `lookup('TABLE4', kg, tab4_nr, 'unit')` and switched by `if(tab4_nr IS NULL, …)` — no union table with a duplicate key is needed. (7) Prod `consumer_worksheets` may carry RANGE tokens (`DIN-276-09..16`) — every driver behind them reaches no worksheet (fll_gar trap 1 at corpus scale: 14 fields here); stage ONE expansion UPDATE (C-1) and emit only the rules whose target is consumer-free. (8) An English-translation transcript can collide on labels (three stages printed "Cost estimate") — tokens from the clause order, labels from prod's own titles, J-block. (9) A printed-blank cell among printed siblings (Table 3 row 340 unit) is a U-block, never filled from the neighbours.

**Encoding traps (Plan 3 Task 14, DWA-A-178).** (1) A design standard whose Σ-equations print the summand's factors WITHOUT the row index (Gl. 2 / 3: `Σ(A_E,b,a,i · b_R,a [· e_0])`) while prod holds b_R,a / e_0 as ONE scalar each on OTHER worksheets: the register lives where the areas live (A178-04) and the factors become per-row columns (the Rechenwert shown beside them via a `derived` `lookup()`, a badge when the row differs); the scalar ↔ column pairs are D-blocks, the Σ twins live on the register's worksheet even when the brief places them elsewhere (m277e trap 2). (2) Three printed variants of one equation that differ only by the paths they include (Gl. 5 / 6 / 7 = Fang / Durchlauf / + RRL) are ONE row-Σ over a paths register (`sum_rows(frachtpfade, vq_m3 * eta_tab1) * …`) — a row exists only for a path the plant has, and a row-scope badge (`zulaessig` from the inherited `becken_typ` / `rrl_vorhanden`) plus a `count_rows(reg, zulaessig == 0)` twin replaces the "pick one formula" switch; the three prod rows that all write the same output (first wins) are the R-block. (3) A footnote alternative ("kann für … η_VS = 0,2 angesetzt werden") is its own single-key table keyed on a CREATED type select (`TABELLE1_VS` by `vorstufe_typ`, policy `kann`, the value column's `values: ['0', '0.2']` feeding the widget's `kann` select) beside the locked Rechenwert table — one table cannot carry two policies; record that the `kann` select offers the alternative for every row (O-block). (4) A zero-input equation `x = lookup('TABLE', 'key', 'col')` computes (constants as printed twins next to typed inputs: b_krit 7, q_Dr,RBF 0,05, v_spez 0,5) — no `lookup_fill` key hack (the brief's "constant table keyed by system_type") is needed. (5) Re-verify the brief's / inventory's modal cue against the line: "kann b_R,a = 530 angesetzt werden" is NOT printed — L716 reads "wird … angesetzt" (locked, R-5 reversal on the sheet); the SAME figure can appear twice with different modals (q_Dr,RBF 0,05: L639 "ist sicherzustellen … begrenzt" = a limit, L767 "kann … angesetzt werden" = a Vorbemessung default) — seed both rows, in the table of their own policy. (6) A worksheet-scope BOOLEAN / ENUM read inside a row `derived` expr (`if(rrl_vorhanden == true, …)`, `becken_typ == 'durchlauf'`) works; a MISSING driver makes the cell null and `count_rows(reg, badge == 0)` `manual_required` naming the column — acceptable when the driver is a required prod input, say so in the note. (7) A per-path load that the standard states only in words ("Summe aus Restfracht filtriert, Entlastung über den Filterbeckenüberlauf und … Regenrückhaltelamelle") is encodable as the complement of the printed retained term (`VQ · C · (1 − η_VS) · (1 − η) / 1000`) with an F-block and a mass-balance pin (retained + passed = inflow); never as a replacement of the typed loads. (8) The Bash heredoc on this machine collapses `\\` to `\` (m820_3 trap 7 again — also inside `String.raw`): write every fix script that carries LaTeX line ends with the Write tool and machine-check the quoted fragments on the sheet AND in the STAGED file against the cited lines before committing. (9) The register badge test-id is `derived-badge-<key>` (not `derived-<key>`) — `display: 'badge'` columns render under the row.

**Encoding traps (Plan 3 Task 15, DIN-EN-16941-2).** (1) A "make it multi-select" brief on an EXISTING enum field is a data_type change, never a widget switch: a DB `widget='select_many'` on an enum row renders the ChecklistEditor (writes `{type:'json'}`) while `extractValue(p, 'enum')` reads `value_enum` on reload — the selections vanish silently and a consumer inherits null; STAGE the whole switch (data_type + widget + ui_config + `project_parameters` value migration) as an S-block and emit nothing (din16941_2-S-1). (2) A hide rule can disarm a gate WITHOUT the guards seeing it: consumer-free scalars that feed a same-worksheet equation whose OUTPUT a gate reads (`Q_S … u_DW → Gl. 1 Y_G ← CR-12 'Y_G IS NOT NULL'`) pass both the producer and the gate-aware guard, yet hiding them nulls the equation and turns a passable block gate into an unpassable one — check every rule's hidden symbols against `prior.equations` inputs whose outputs appear in `prior.gates` symbols, and STAGE those (G-9). (3) Printed limit cells that are TEXT ("Nicht nachweisbar", "N/A", "5 bis 9,5", "0,0") go into text columns next to a nullable number; the register status expression compares the TEXT for the special cases (`lookup(T, k, 'e_coli_text') == 'Nicht nachweisbar'`) and the number for the bands — `lookup(...) IS NULL` is a parse error (IS NULL takes a symbol only), and `if(x IS NULL, …)` on an OPTIONAL column is the way to keep an unmeasured parameter decidable (0 = n. a.). (4) A driver the register needs that is NOT inherited on that worksheet (`vorgesehene_nutzung` → -04) and cannot be created there as a twin of a consumed input: key the tables on a CREATED select over the PRINTED columns (`richtwert_spalte` = the four Tab. D.1 heads, incl. the Sprüh column prod has no token for) so everything computes today, and STAGE the derivation + consumer edit as one D-block — a created boolean on the driver's worksheet reaches nothing either (a `create` never sets consumers). (5) A printed range table that covers FEWER rows than the equation names (Tab. A.2 five sources, Gl. 1 six) cannot be the register's `lookup_key`: use a plain enum column over the prod tokens and `lookup()` the hints in row scope — a missing row is a null derived cell (no diagnostic, row stays complete), so the extra source simply shows no hint (J-block). (6) A row-scope `visible_when` whose driver is MISSING is `pending` = visible, and a required column under it makes every row INCOMPLETE — `count_rows` then reads 0 (computed), not `manual_required`; pin the real behaviour, and say in the note which driver must be set first. (7) The Gl.-1 legend itself is a table (Q·t·u vs V·u per source, `mit_dauer` 1/0 lifted from "in Liter je Minute" + "die Dauer je …") — the per-row switch reads it by `lookup()`, so the term form is single-sourced from the printed legend, not from a hard-coded `IN {…}` list. (8) Machine-check the sheet AND the STAGED file fragments before committing: the bash `node -e` splice turned `\\%` into a mangled escape — a Write-tool script fixed it; the LaTeX `\%` of "50 \% des Tagesbedarfs" is part of the verbatim span.

**Encoding traps (Plan 3 Task 16, DWA-M-1200-2).** (1) A "per organism" statistic over ONE discriminator register needs no per-organism registers: every aggregate takes a trailing row condition (`stdev_rows(reg, lrv_i, organismus == 'e_coli')`, `median_rows`, `mean_rows`, `max_rows`), so the 16-pair verdict and the percentile per organism are one self-contained formula each — generate the N × M block from two small arrays (`ORGANISMEN × ORG_OUTPUTS`) in the module and pin the numbering scheme; a brief that says "row functions have no per-condition filter" is out of date (G-16 closed). (2) Never chain a register-fed twin on another NEW output: the save-path materialiser reads scalar inputs from the persisted values, so a chained twin lags one save behind — inline the aggregates (the `validierung_ok` / `perzentil_ok` formulas repeat the counts and means deliberately). (3) An empty survivor set differs by function: `count_rows(reg, cond)` is 0, `max_rows` / `mean_rows` / `median_rows` are `manual_required` ("Keine vollständigen Zeilen"), `stdev_rows` needs 2 rows — pin each per organism so a missing organism never reads as a silent 0. (4) A class-keyed rule table with NO printed row for some tokens (§3.3.3 / Anhang C.1 for B-2 / C-2 / D) is seeded WITHOUT those rows: the verdict's `lookup()` then fails recoverably and the equation is undecidable — the printed "－" as behaviour, not a guessed threshold. (5) A printed constant of an equation (k = 1,282) is a one-row table read by `lookup('GL_C2_1', 'k', 'wert')` in every formula and by a zero-input twin next to the typed scalar — a `lookup_fill` cannot bind it (no key symbol). (6) The override flag stops the refill of EVERY `lookup_value` cell of that row (`refillLookupValues`): a register whose override applies to several columns must tell the engineer to enter all of them on an "abweichend" row — pin the null-Σ. (7) A gate captured on a worksheet where none of its symbols resolves (REQ-06 on -03, REQ-09 on the empty -08) is `pending` on every project — a data observation worth its own G-block (move + rewrite), not a guard refusal. (8) A transcript can END a table before its printed notes (Tab. 3 a)–g) missing after L573): a note the brief cites by letter is a content-boundary X-block, never lifted from the sibling standard that prints it. (9) Side tables of one stage vocabulary (Tab. 6 monitoring, Tab. 4 principles, Tab. E.1 example) share a token only where the printed stage is the same and keep their own otherwise; a register `lookup_key` on the complete list (Tab. B.2) plus `derived` `lookup()` columns for the side tables shows an empty hint where a side table prints no row — record the mapping as one J-block. (10) `IS NOT NULL` works as a row condition on an OPTIONAL number column (`max_rows(reg, x, x IS NOT NULL)`), unlike a comparison on it (m187 trap 8).

**Encoding traps (Plan 3 Task 17, DIN-1989-2).** (1) The save-path materialiser resolves scalar inputs from the worksheet's OWN template fields only (`materialize-derived.ts` `symbolLookup` over `templateFields`): a register-fed twin that names an INHERITED driver (`filtertyp` on -03) as an input computes on the form but persists `null` on every save — encode a per-type switch as separate register-only twins (one per printed equation, Gl. 7 / 8 / 9) plus per-type verdict codes, and put the switch in `visible_when` (client + report) and the STAGED gate guard, never in a formula input. (2) A prod equation whose OUTPUT symbol is also a typed INPUT (Gl. 1 / 2 / 4 / 6 write `Q × 25`, `Q_Zu,max × 90` into the fields the engineer fills with the PROVIDED volume — the #22 class; Gl. 4 / 6 even print "≥") is not re-produced: emit `<x>_min` twins and `<x>_ok` codes, STAGE the deletion of the prod rows (archive pattern) and propose the printed inequality as a gate (G-block). (3) The brief's "`reference` widget for an external table value" (EN 12056-3 Tab. C.1) is NOT the codebase `reference` (a carrier-row picker; `parseFieldConfig` rejects a `{document, table, note}` ui_config): bind the derivations to the existing engineer-entered input, put the external pointer in descriptions / notes, and record the three-symbol duplication as an X-block — never a fourth symbol. (4) A "DN as select_one" brief needs the nominal sizes PRINTED; a threshold sentence ("≤ DN 200") is not an option list — drive the scope rules straight off the existing number (`DN <= 200` / `DN > 200`; missing ⇒ pending ⇒ visible) instead of creating a duplicate attestation. (5) An optional register column hidden per type (`masse_verwurf_g` for Typ C) enters a Σ as `sum_rows(reg, if(x IS NULL, 0, x))` so Typ-A / -B rows stay decidable; a required column under a row-scope `visible_when` whose driver is MISSING would make every row incomplete — keep type-specific columns optional. (6) `min_rows(reg, col, cond)` picks the conservative value when a step is entered twice and is `manual_required` (never 0) when no row matches — prefer it over `sum_rows(reg, if(cond, x, 0))` for "the value at step X". (7) A boolean register column left unset reads `false` in a row condition (`belastet == false` matches the untouched rows) — say in the label which state the unset box means. (8) A section rule on a section that also holds a CONSUMED input (Q on -02 C) is refused by the producer guard before the gate guard speaks — check both lists before promising a section rule. (9) A table whose column head is an IMAGE in the transcript (Tab. 1 L271) stays `imported_unverified` even when every data cell is clean; title the created select's option from the sibling head + the clause text and file the U-block with both lines.

**Encoding traps (Plan 3 Task 18, DWA-M-820-1).** (1) A PROCESS standard (Vergabeverfahren) carries almost no printed numbers — its "tables" are legal figures the Merkblatt reprints (EU thresholds, § 134 GWB days, § 3 Abs. 9 VgV lot bounds, the § 45 VgV factor): seed them EXACTLY as printed for the printed edition, put the regulation and the effective date in value columns (`verordnung` / `gueltig_ab`), lock them, and file the two-year review rule as a J-block — a newer regulation is a new edition row, never an update from memory or the web. (2) Two printed rows over six prod enum tokens (Anh. B.2.3 "Bundesbehörden … / für alle anderen"): key ONE table on the prod tokens (G-A3), let each row quote the printed line it maps to, put the mapping judgment on the sheet — never a two-table chain (a `lookup_fill` cannot chain tables, and a copied figure is a second source). (3) A prod BOOLEAN driver (`electronic_transmission`, `large_long_project`) reaches a `lookup_fill` as `'true'` / `'false'` (String(boolean), G-15) but is NOT a formula input — an `if(flag == true, 10, 15)` equation over it is `manual_required` forever: seed the two printed figures as a boolean-keyed table and fill a twin; the brief's `contract_invalidity_code = if(information_letters_sent == false, …)` is an I-block, not an equation. (4) A band table with an open upper end (Tab. D.1 ends at "bis 50 Mio. €") is read by an `if()` chain whose LAST branch is a deliberate `lookup(T, 'gt50', …)` miss — `if()` short-circuits, so the miss is only reached above the last band and reads `manual_required` ("keine Zeile"); every bound and every sum stays a `lookup()` (no figure typed; `1000000` is the unit factor) — pin the boundary values and the miss. (5) Check the DRIVER's consumers before placing a derived pair where the brief puts it: `estimated_construction_cost` reaches -09 / -22 but not -13, so the Tab. D.1 twins live on -22 (where the -13 inputs are inherited too) and the -13 placement is a C-block. (6) Upgrading a Plan-1 selection register in place (`award_criteria_list`, `bewertungskommission_members`, `stakeholder_list`): keep the column KEYS, make the columns a Σ / count needs REQUIRED (an empty `gewichtung` breaks `sum_rows` with "Unbekanntes Symbol"; an unset enum makes `count_rows(reg, kategorie == …)` undecidable) — data-safe only after a read-only count of stored rows (0 here); replace the Plan-1 `sum_column` by a footer over an equation row (D-2b-5) and drop a Plan-1 note the transcript does not print ("Summe = 100 %", "Preis und mind. ein qualitatives Kriterium" — L1696 says "muss es jedoch nicht"). (7) A brief's visibility cue can contradict the guideline's own words — "sowohl für das Konzept als auch für die Projekte" requires BOTH Bedarfsplanungen, "muss er eine Bewertungskommission einsetzen" applies to every quality-based award: withhold the rule and file a J-block instead of emitting a hide the text refutes. (8) A statute quoted in the Merkblatt beats the Merkblatt's paraphrase for the comparator ("unter 80000 Euro" = strict `<` vs "nicht überschreiten"); record both in a `comparator` column and pin the boundary row. (9) A register-driven code whose denominator the statute names ("Gesamtwertes aller Lose") is self-contained on the register (`sum_rows` of all lots) — computes without the inherited scalar the brief would read; the alternative is a J-block, and an EMPTY register leaves the code open (`sum_rows` manual_required) while the counts read 0 — never a phantom pass. (10) Gates captured on a worksheet where NONE of their symbols resolves (REQ-07 / REQ-05 / REQ-24 on M820-04) are pending on every project — a data observation worth a G-block with the move, found only by reading the capture's `gates` against its field keys.

**Encoding traps (Plan 3 Task 19, DWA-M-820-2).** (1) A printed OUTLINE (Anhang A Statusbericht, Anhang B Projekthandbuch) is a text catalogue: one
row per printed line with a `gedruckt` column ("<Nr.> <Titel>"), and the created `select_many` takes its `enum_values` from EXACTLY those
strings (pinned against the seed rows) — the DB checklist renders `enum_values[].value`, so the value IS the printed text (a prod enum such as
`lph_completed` = `lph_0 …` would show its tokens — m820_2-E-1). (2) A gate over a checklist uses `contains(sym, '<option>') == true` — a bare
`contains(...)` does not parse as a condition (probed); a subset rule between two checklists is one parenthesised `(IF contains(a, x) == true
THEN contains(b, x) == true)` per option (M-1), and both carriers must store the same strings. (3) Σ over an OPTIONAL number column:
`sum_rows(reg, if(x IS NULL, 0, x))` (a bare column reference is `manual_required` on the first empty cell); `IS NULL` on a text column treats
'' as missing, so `count_rows(reg, begruendung IS NULL)` counts the rows without a reason. (4) Date cells are STRINGS — `min_rows` / `max_rows`
over a `date` column is `manual_required` ("Operand ist keine Zahl: 2026-03-01"); earliest / latest dates are an F-block, never an equation.
(5) Read the capture's `gates` keys against the field keys: two EMPTY-condition gates of this standard (REQ-55 / REQ-59) sit on a worksheet
where none of their symbols exists (-25) — the G-block moves them with the archive pattern restoring `worksheet_template_id`. (6) When the
brief's conditional driver is NOT printed (VOB for § 5.5.2 / § 5.5.3, BIM for § 8.2 / § 8.7 / § 8.8, HOAI for `contract_type`) say so (R-5): stage
the brief's reading as a G-block with the caveat, or withhold it as a J-block — never emit a hide the words do not carry. (7) A standard whose
every brief target is consumed AND gate-read yields 0 hide rules by construction; the deliverable is the created registers + the STAGED
gate-guard list (15 here), and the report says so instead of emitting inert rules. (8) Generate the cue constants mechanically from the
transcript (whole line or a regex-named sentence span, `JSON.stringify` per string) and prune them to the names the module body uses —
`no-unused-vars` catches the rest, but a name mentioned only in a COMMENT survives a naive prune. (9) Upgrading a Plan-1 register in place:
make the columns a count / Σ needs REQUIRED (`status`, `aenderung`) only after a read-only count of stored rows (0 here) and retype a
`text` date column as `date` in the same UPDATE while nothing is stored. (10) Never build a doc paragraph with backticks inside `node -e`
under bash — the shell command-substitutes every backtick span (this task lost one edit that way; write the paragraph to a file and splice it).

**Encoding traps (Plan 3 Task 20, ISO-5667-10).** (1) A PROSE standard with no numeric table still has "tables": every printed threshold-by-context sentence ("No deben superar los 5 minutos para la muestra mixta de 2 horas y los 30 minutos para la muestra mixta de 24 horas") is a one-key table with one row per printed alternative, keyed on a CREATED select (`composite_duration_band`) or chosen inside an `if()` (`S7_2_2_1_TUBE` by the bore, `S4_3_2` by n) — so the worksheet limit is switched by context instead of hard-coded; the row `verbatim_quote` is the shared sentence, the printed words ("tres veces", "un tercio y la mitad", "cinco") are asserted at build time and their arithmetic reading is the numeric cell (say so in the comment). (2) A printed formula SEQUENCE (Fórmula 1 / 2: k = 1 … n) is a register whose row `derived` reads the worksheet scalars (`A + lookup(…) * k / number_of_samples`, G-13) — the prod equations that compute ONE k stay verified and untouched; the editor has no row generator, the engineer adds n rows and a count == n gate is the completeness check (F-block, [CODE] candidate). (3) A Spanish / plain-text transcript prints formulas as multi-line glyph blocks with mathematical-italic Unicode (𝐴, 𝑛, 𝑥) — lift the span by line range with `JSON.stringify` (the generator), never retype, and keep a glyph slip ("𝐵+" where the legend defines A) verbatim as a U-block; a VC-grade source keeps EVERY table `imported_unverified`. (4) Never key a register column `id`: `prepareRegisterRows` reads the row IDENTITY (`row.id`) as the cell and the editor would overwrite it on write — name it `kennung` / `label`. (5) A hide on the INPUTS of a prod equation whose OUTPUT a same-worksheet gate reads (`V_final` / `M3_total` / `M3_n` → equation 3 `V_n` ← CR-019; `A` / `k` → equations 1 / 2 ← CR-008) is refused as a chain read; put the IF-guarded gate rewrite AND the follow-up hides in ONE G-block (the exemption applies to chain readers too) — the hides are correct only after the guard. (6) A field that serves two printed rules (`homogeneity_deviation`: §7.4 tank < 20 % AND §9.1 every homogenisation < 20 %) must not be hidden under either driver; stage the guard with the caveat and let the owner rule. (7) A register whose columns twin many prod scalars (a per-point register over a model that asks each fact once) costs one amendment-K block PER pair — generate the D-blocks from a template (STAGED file + sheet) and pin the pair count; read the stored-parameter and instance counts read-only first so every retirement is stated data-free or not. (8) A lookup miss in a `derived` column (`lookup('S7_2_2_1_PUMP', pump_technology, …)` for a technology without a printed figure) is a null cell; `if(<col> IS NULL, 1, …)` on that derived null WORKS in row scope (probed) — make the badge decidable that way so `count_rows(reg, ok == 0)` never turns `manual_required` on the token gap (E-block), and never seed a figure the text does not print. (9) The prod worksheet that OWNS a driver is not always the one the brief names: `specific_site_type` lives on -04 (inherited on -06 only) — the -02 sampling-point register carries its OWN discriminator column with the same tokens, and the -04 scalar rules are emitted on -04; a `visible_when` on -02 keyed on the -04 scalar would be `pending` forever.

**Encoding traps (Plan 3 Task 21, ISO-59020).** (1) An "(X)" in an indicator name is the repeat key: prod holds ONE flow X per worksheet, the standard says "should be measured and recorded separately"; the encoding is one register per flow class (inflows / outflows / energy flows) whose `derived` columns ARE the printed per-X formulae (A.1 … A.8 as row exprs), while the prod single-X equations stay verified and untouched — their retirement, the equality gates that read them and the consumer re-point are ONE R-block with the archive pattern, never a hide. (2) A per-row formula over REQUIRED masses is the way to keep "optional blank ⇒ incomplete row" honest: `m_reui / m_ti * 100` on a row without `m_reui` is a null cell AND `complete: false`, so no Σ / aggregate ever counts it; a `min: 0` alone would not do that. (3) "0 % should be recorded" for a missing data class (A.3.4) is a row-scope BOOLEAN discriminator + a hidden required input: `traceable_recycling` (unset = false) hides `m_reco`, `pct_reco = if(traceable_recycling == true, m_reco / m_to * 100, 0)` short-circuits over the null, the row stays complete — say in the note that the unset box MEANS "no data". (4) A cross-row aggregation the standard prints only as informative EXAMPLES (Annex G.2 b: average; G.2 c: sum, then divide) is a RULING, not data — the Σ/Σ aggregates stay OUT of the equations module until the J-block is ratified (fix round 1, controller ruling); record their exact intended forms in the block so the re-emit is mechanical, keep the plain Σ masses / energies + counts as footers, and withhold likewise an aggregate the text does not print at all (a mean of RLP(X) ratios). (5) A layout-split plain-text TABLE (Table 3: five columns printed side by side, cells wrapped over 2–5 lines and interleaved with the neighbours) is lifted by ROW LINE RANGE and asserted as one printed FRAGMENT PER LINE (whitespace-collapsed) — the seeded cell is the fragments joined; a merged category cell printed once per group is asserted against the whole-table span; line-end hyphenations ("pro-/duced", "re-/source") are joined to the word the same column prints elsewhere and listed in ONE U-block with their lines (the table stays `imported_unverified`). (6) A boolean regulation-table cell filled into a `lookup_value` column compares `== true` (1), never `== 1` (0) — probed; the safer encoding reads the PRINTED word ("Mandatory") through `lookup()` in the row expr. (7) "All six mandatory indicators covered" cannot be derived from row badges alone — a MISSING indicator has no row, so `count_rows(reg, ok == 0)` cannot see it; name the printed rows by TOKEN instead, one clause per row, `count_rows(reg, key == '<token>' AND ok == 1) == 1` joined by AND (source-settled by the table; exactly-once also catches duplicates without [CODE]); in a FORMULA leave the clauses unparenthesised — the equations emitter's legacy `CALL` regex reads `AND (` as a call named AND and refuses — while the gate text may carry the parentheses. (8) A "block gating by indicator selection" brief is register-driven visibility (M-block, never emitted); the emittable half is a per-category selection COUNT on the register's worksheet (`count_rows(indicators, category_code == 'energy' AND selected == true)`, materialised) plus a C-block so the count reaches the gated worksheet and a G-block wrapping the CAPTURED gate condition in `IF <count> >= 1 THEN …` (the condition string comes from the prior, never retyped) — the hides follow only after the producer chain is re-pointed (R). (9) A formula block whose printed multiplier contradicts its own legend ("⋅1000" vs "in %", A.8) is encoded on the legend + the seven sibling forms + prod's verified row, quoted verbatim as printed, and filed as a J-block (a judgment, not an unreadable cell — the glyph is legible) naming the SR-3 PDF-page check as the closing action — never silently corrected, never left un-encoded. (10) A "hide under external use" brief for a verifiability attestation is refuted by the sentence itself when it prints no condition ("Verifiability of ALL data documentation is a key criterion") — withhold with a J-block and the grep, even before the gate guard would refuse it.

**Encoding traps (Plan 3 Task 22, ISO-46001).** (1) A RAW two-column plain-text extraction prints a table as two separate column dumps (Table D.1: 24 sectors, then 24 indicator cells) or interleaves them line by line (Table A.1: "(f) Toilet (a) Guestroom"); the `_layout.txt` sibling settles a pairing only where its own structure does — a per-sector letter sequence that restarts at "(a)" pairs every A.1 area (two "(f)" cells in one sector are impossible), while D.1's vertical alignment drifts after the first line (one sector per line vs one indicator per two lines: "Prisons" beside "Mass of washloads") and settles ONLY row 1 — seed the settled rows, key the created select on exactly those (G-A3), and file one U-block PER unsettled row with the print-order proposal and its INSERT + enum-append SQL so the PDF check (SR-3) ratifies row by row; a merged raw line is the `verbatim_quote` of BOTH cells it carries. (2) An ISO-8859-1 transcript (0xD7 "×", 0xA9 "©") must be decoded as `latin1` by the quotes generator or the printed "× 100 %" of a formula legend becomes U+FFFD; the verifier reads utf8, so keep table-row quotes on ASCII lines (the formula spans are checked by the scratch fragment checker, decoded latin1). (3) Symbols printed inside a formula but defined only in an IMAGE legend (C.2's WD / R1 … R3 / O1 … O4; C.4's R1 … R4 as RECYCLED streams of another figure) are tokens by the print, meanings by the printed input / output lists + prod's own labels (EV) — one J-block with the grep that shows no legend line exists (`grep -n "WD is\|R1 is\|O1 is"` → empty); lower-case the tokens so no quoted literal coincides with the prod symbols of the same worksheet. (4) A register column key that equals a prod symbol of its worksheet (`action_plan`, `improvement_verification_method` on -05) shadows it in row scope — the field-config test's lint catches it; name columns after the printed item ("2) the means" → `means`), never after the scalar they twin. (5) A register symbol the brief says to "create" can already EXIST as a prod text field (`water_sources` on -04) — the emitter refuses ("create given but the prior snapshot already has this field"); suffix the register (`water_sources_46001`) and pair the text field in a D-block. (6) A row-scoped hidden TEXT cell stores `''` (the engine's text null) while a hidden ENUM cell stores `null` — pin the real shape. (7) `count_rows(reg, <date column> IS NULL)` works (a missing verification date counts), and an optional null operand in a row expr (`value - baseline`) is a silent null cell with no diagnostic — prefer it over an `if(x IS NULL, 0, …)` that would print a false 0. (8) Re-run the standard's harness at HEAD BEFORE your changes (`git stash`) when it fails: the ISO-46001 harness pinned the pre-T-13b "bare-ident RHS always fails" reading of `Win == Wout`; since 7c82243 a valued bare RHS resolves as the symbol (equal ⇒ pass, unequal ⇒ fail, unset ⇒ fail) — fix the stale pin to the ruled behaviour and cite the ruling, never leave a red harness as "pre-existing". (9) A "shall" on a per-row attribute ("Time frames shall be established for achievement of the targets") is a REQUIRED column — the row is incomplete without it and never counts; say so in the note and pin it.

**Encoding traps (Plan 3 Task 23, ISO-5667-6).** (1) A WIDE pdftotext layout (every line indented ~85 columns, page furniture — "USO EXCLUSIVO …", "Copia para uso exclusivo …", "© ISO … / © INN …", running heads — interleaved every ~40 lines) is lifted by line range with each line TRIMMED and empty lines dropped (whitespace only — the verifier's `\s+ → ' '` still matches); furniture that falls INSIDE a span stays verbatim (it is printed) and a cell wrapped around it (§13.1 item i) is asserted as its printed FRAGMENTS (one per contiguous text run), the seeded cell being their join. (2) A prod gate in the OR form `driver != 'x' OR check` (CR-011 / CR-015 / CR-021 here) is SEMANTICALLY the IF guard but the gate-aware guard needs the syntactic `IF driver == 'x' THEN check`: stage the IF-form rewrite (no enforcement change — say "identical on every valued state; an unset driver is pending in both forms") together with the hide as its follow-up, never emit the hide first. (3) An extraction that loses a radical ("0,13b 2c 0,7c + 2 g" over "gd") is a U-block, not a rewrite: quote the block line by line, state BOTH readings, and run the printed EJEMPLO under both (2·√g reproduces 83 m / 683 m with the conventional g; 2·g gives 149,7 / 904,8) — a proven computation is evidence for the owner's ruling, not a source (SR-1); the prod row stays. (4) A constant the legend names but does not print ("aceleración debido a la gravedad … (m/s2)"): the block carries the grep + empty output (`grep -n "9,81\|9\.81"` → exit 1) and proposes a `default_value` on the typed field, never an equation constant. (5) A brief's conditional may conflate two printed ACTIONS (the §10.3 equipment wash "hasta tres veces" vs the bottle rinse "no se enjuaguen si contienen conservantes"): create only the printed DRIVER (the inventory-named attestation), stage the brief's form as variant A with a REJECT recommendation and the printed rule as variant B — never emit a gate on a conflated reading. (6) An EMPTY-condition gate (CR-007 / CR-028) never refuses a hide (round-2 rule) — a worksheet carrying one still accepts `visible_when` on its consumer-free, unread fields; record the two empty gates as one G-block with proposals. (7) A verdict over a Σ (`if(sum_rows(reg, x) < lookup(…), 1, 0)`) on an EMPTY register is `manual_required` ("Fehlende Eingabe für if(): <reg>") while a verdict over a count reads 0 — both are non-phantom, pick the form the printed rule needs and pin the empty case; a "not entered ⇒ 0" badge (`if(a IS NULL OR b IS NULL, 0, …)`) keeps `count_rows(reg, ok == 0)` decidable on rows without the figures. (8) The Annex-A "roughness hint" pattern for a printed RANGE with two printed example points (15 < c < 50; 15 / 50 in the EJEMPLO): a created select over the two printed descriptions + a `lookup_fill` twin (`anhaltswert`) beside the typed input — the range is never auto-picked (SR-2), the typed input keeps its VR.

**Encoding traps (Plan 3 Task 24, VSME — no transcript).** (1) A standard WITHOUT a transcript has exactly one quotable text: the prod rows that already carry the paragraph wording (here the 31 `compliance_requirements` descriptions "Para NN: „…“" + 9 CR `source_quote` cells; the 10 equation rows carry a `source_quote` too) — `prod-query.mjs` truncates at 120 chars and "folding by hand" is forbidden, so capture the FULL cells with the generic read-only script `node scripts/verification/capture-text.mjs <STANDARD CODE> <slug>` (→ `src/lib/eval/field-configs/<slug>.text.prior.json`, same read-only-transaction mechanics as prod-query; controller ruling Task 24 fix round 1 — Tasks 27–29 use it) and GENERATE the quote / enum constants from that capture (`vsme-quotes.ts` / `vsme-enums.ts`); cite every cue `[prod verification_quote (Para NN, <CR code>)]` (grade EV) and list every title / label-only cue under ONE U-block. (2) When `consumer_worksheets` is NULL on every field, every cross-worksheet rule of the brief is a C-block (consumer edit + the rule in one staged transaction), never an emitted `pending` rule — the emitter ACCEPTS such rules (it does not check driver inheritance), so pin the withholding explicitly (the section entries live in an exported `STAGED_SECTION_RULES` the test feeds to the emitter). (3) Whole-module gating (12 C-worksheets ← `BasisForPreparation`) meets the gate-aware guard on every worksheet that carries a warn gate: split the C-block (ungated sections) from a G-block (IF-guards on the four gates + their section hides, applied AFTER the consumer edit), and pin both the refusal and the exemption under the guarded prior. (4) A flagged register row WITHOUT its figure (`in_biodiversity_area` ticked, `area_ha` empty) leaves `sum_rows(reg, if(flag, x, 0))` `manual_required` naming the column — the honest state for a figure the paragraph asks for; pin it and say it in the register note instead of an `if(x IS NULL, 0, x)` that would print a false 0 (the `IS NULL` form is right only for a column that is legitimately absent, e.g. mass OR volume per material). (5) Roll-ups the brief places on the TOTALS worksheet (B03.000 / B05.000 / B06.000 / B07.400) live on the register's worksheet with a C-block per target (m277e trap 2 at scale); equations whose scalar inputs live on other worksheets (the four B3 intensities, the B8 delta) may be emitted where the brief puts them — they read "Fehlende oder leere Eingaben: <symbol>" until the consumer edit, never a value, and are form-only after it (Task 17 trap 1). (6) An XLSX read for STRUCTURE only needs no install: PowerShell `[System.IO.Compression.ZipFile]::OpenRead` → `xl/workbook.xml` (sheet names) and `xl/sharedStrings.xml` (header strings); the EFRAG template's data sheets render labels through defined-name formulas (`template_label_…`), so the header cells resolve in the Translations / Technical Sheet / Footnote (Taxonomy) Labels sheets — cite the shared-string index + the sheet, never a value. (7) `grep -c` over a JSON capture counts LINES (label_de and label_en both match; "materialisiert" matches "material"): state what the hits are and refine an absence claim with a second filter (`grep -i "material" F | grep -c "Para"` → 1 = the Para 31 "materialisiert" line) before recording it under amendment O. (8) The mis-homed BLOCK gate the SP-1 warn-only re-home left behind (CR-B07-01 on B01.000 reading a B07.000 symbol) is pending on every project — its re-home is an enforcement change (G-block with `worksheet_template_id` restore), not hygiene.

**Encoding traps (Plan 3 Task 25, DIN-14021).** (1) A CLASSIFICATION standard (claim type → clause) whose only lookup is "which
§7.x applies" is one text table keyed on the prod enum tokens (`CLAIMMAP`, 23 rows = `selected_claim_type` verbatim, D-1 / G-A3) with the
printed condition sentence as the row quote, the clause as a string cell and a STRUCTURAL classifier column (`numeric_block`) that the
register's row-scope `visible_when` switches on — record the classifier as structure in the report, never as a printed cell; a printed
per-row fact ("Weil … eine vergleichende Aussage ist, müssen die Anforderungen von 6.3 erfüllt sein") becomes a boolean cell asserted
inside the row span and a `lookup_value` column (`comparative_required`) that a row badge compares `== true`. (2) A bilingual (DE / EN)
transcript interleaves the columns paragraph by paragraph: lift the GERMAN span by line range and assert EVERY multi-line span carries no
English line (`/\b(shall|claimant's)\b/` pin) — the §7.1 term list L1063–L1074 is followed by the English g) of §6.5.3 at L1075, and the
§6.5.3 g) itself prints after the English column (L1054, not L1039); the `inSpan` guard and the test caught two line slips (7.1.1 = L1059,
5.8.5 = L878) before any migration was emitted. (3) Per-type row checks that name columns of OTHER types (`r`, `e`, `renewable_pct`,
`unqualified`) stay decidable in ROW scope because `if()` short-circuits there (unlike `evaluateFormula`'s scalar inputs): split the
brief's one `type_ok` into per-block badges (`recovered_ok` / `renewable_ok` / `unqualified_ok` / `comparative_ok`) with the
"not entered ⇒ 0" form and declare `type_ok` AFTER them — derived cells are evaluated in declaration order and may read earlier derived
cells (probed). (4) A `contains()` completeness code over a `select_many` checklist computes on NO engine path (materialiser, form hook,
report evaluator pass registers only; the gate scope maps a json carrier to a presence marker) and booleans never reach scalar equations —
withhold the brief's equation as an F-block with the exact intended formula (iso46001-F-2 precedent), never emit a row that reads
"Unbekanntes Symbol" forever; the checklist itself is still emitted (values = the printed lines). (5) When EVERY existing field of a
standard is consumed by its summary worksheet and the numeric inputs feed prod equations whose outputs are consumed too, the producer
guard refuses every hide before the gate guard speaks — the deliverable is the created register + checklists + one scalar rule on a
created field, plus one G-block per gate family (18 presence tautologies, the -04 comparison block, the -05 numeric gates) and C-blocks for
the producer-only refusals; say so instead of emitting inert rules. (6) A presence tautology gate (`driver IS NOT NULL` × 18 with one
shared md5) is rewritten to `IF driver == '<token>' THEN <register verdict> == 1` — the verdict must read 0 on an EMPTY register (inline
`count_rows(reg) > 0 AND count_rows(reg, ok == 0) == 0`), or the rewrite would pass with no claim entered; state that the verdict spans all
rows (a per-type count needs one equation per token). (7) The gate-aware guard's IF-exemption accepts equality guards only: a hide that
follows an `IN {…}` guard (Möbius under two types, the footprint under two carbon types) is never exempt — stage it as owner-applied inside
the G-block and pin the non-exemption. (8) Prod VR strings can name a field that does not exist (`… eq 100 when unqualified_claim`): grep
the capture (exit 1), CREATE the driver as the inventory names it, and stage the VR's own rule as a compound `IF type == 'x' AND driver ==
true THEN pct == 100` gate (evaluate.ts grammar, verified both ways).

**Encoding traps (Plan 3 Task 26, ISO-14046).** (1) Whole-worksheet applicability by a study type (the -04 impact assessment ← `study_type`)
where EVERY field-bearing section holds consumed producers or gate-read symbols is ONE G-block: the IF-guards on the worksheet's own gates
(REQ-12 / -14 / -15 here) and the section hides in the SAME transaction (the hides are exempt only once the guards read the same driver / op /
literal); the emitter ACCEPTS a rule on a field-less section (A / B / F / G / K / M) — inert, never emit it, pin the acceptance and the field count
instead. (2) A prod equation printed as `SUM(a * b)` over two SCALARS (EQ-01 characterisation) becomes a register with the product as a `derived`
column plus a worksheet Σ over ALL rows; the Σ PER GROUP by an engineer-typed name is not expressible — `sum_rows(reg, if(category == 'x', …, 0))`
computes only with the literal typed in (probed) — so the per-group result stays a TYPED number column with an F-block (grouped aggregate /
cross-register row reference), never a fake equation over an invented enum; the prod row stays (R-block, archive pattern) and the scalar pairs are
D-blocks. (3) A printed word-number ("al menos tres miembros") may be a formula literal (`>= 3`) when the controller sanctions it and the sentence
is quoted beside the equation — pin the literal against the span; a one-row constant table is the alternative when no ruling exists. (4) OCR I/l
swaps in DISPLAYED cells ("Ias aplicaciones", "Ios resultados", "ii)cualquier", "$y$") keep the table `imported_unverified` (amendment F) even
though every row quote is verbatim; assert the quirks PRESENT at build time (`S6_2_TP_OCR_QUIRKS`) so a well-meant correction cannot slip in
silently, and put the clean heading line into the checklist value while the sub-items sit in a table column. (5) Name a text table after the
PRINTED clause, not the brief's pointer (the brief's "§5.2.2 a)–j)" is 5.2.4.2 "Calidad de los datos"; §5.2.2 is the scope list a) – p)) — the
modal of the printed lead-in ("deberían tratar" vs "debe cubrir") decides the policy per table. (6) A register on a worksheet whose prod text
field already carries the register's natural name (`impact_categories`, `significant_issues`) takes the `_<std>` suffix (iso46001 trap 5) and
the column that twins a prod NUMBER (`lci_result`) is renamed (`lci_value`) — the field-config test's shadow lint catches both. (7) A brief's
"hide X unless allocation is performed" can contradict the standard's own taxonomy: §5.3.3.3 a) prints that a closed-loop procedure ITSELF
avoids allocation, so `recycling_allocation_type` must not be keyed on "not avoided" — withhold with a J-block and the sentence; likewise a §6.3.2
duty that binds every "estudio comparativo" is not keyed on the public-assertion boolean. (8) `count_rows(reg, a == true AND b == true)` over two
optional boolean columns is decidable on every complete row (unset boxes read false) — an "independent chair" count needs no derived badge.

**Encoding traps (Plan 3 Task 27, ATV-A-704E — no transcript, scanned PDF).** (1) When a standard has NO transcript but prod stores the printed tables INSIDE its `fields.verification_quote` cells (91 / 91 here carry one, and they contain the IQC-Card 2 frequencies, the IQC-Card 9 intervals and the pipette tolerance table in full), those cells are still SECOND-HAND (grade EV) and may never be seeded: quote them INSIDE the U-block as the proposed rows, so the owner sees exactly what an OCR would unlock, and run the failing extraction ONCE as evidence (`pdftotext -layout` on a 37-page scan → exit 0, 37 bytes, 37 form feeds, 0 non-whitespace characters — paste the command and that output). (2) A FILTERED aggregate (`max_rows(reg, x, cond)`) is `manual_required` when NO row matches, while the `if(cond, x, 0)` form the briefs write reads a phantom 0 (probed both ways) — for a "worst deviation of this kind" verdict always use the trailing row condition. (3) A row expression cannot reference an aggregate of its OWN register (`prepareRegisterRows` builds row scope only), so the printed per-value deviation-from-the-mean column is impossible; carry it as a worksheet-level `max(max_rows − mean_rows, mean_rows − min_rows) * 100 / mean_rows` with the mean INLINE (never chained on the mean row) and file the row form as an F-block. (4) Two prod symbols for the same physical quantity that belong to two different printed sheets (`sample_volume` Sheet 1 vs `volume_sample` Sheet 3) stay TWO register columns — merging them is a single-source claim the sheets do not support — and both column keys are suffixed so neither shadows the prod symbol in row scope (amendment P / iso46001 trap 4). (5) Two printed cards whose formulas have the SAME shape (IQC-Card 6 equivalency, IQC-Card 7 parallel) are ONE register with a `kind` discriminator and ONE required denominator column; a second per-kind denominator column the deviation never reads is a silent trap — withhold it with a J-block rather than emitting the brief’s shape. (6) `count_rows` over a LOG register (deviations, incidents) reading 0 means "nothing recorded", not "nothing happened": never propose `count >= 1` as its gate — propose an attestation plus `IF <attestation> == false THEN count >= 1`, and say so in the field description. (7) Re-check the brief’s own counts against the capture before building on them: "23 `attest_*` booleans" was 21 and "CR-020 / CR-021 are the dilution / spiking gates" was wrong (they are IQC-Card 2 ATTESTATION gates on another worksheet) — both recorded as O-blocks with the grep, never rounded to match the premise (amendment O / R-5).


**Staged DELETE rollbacks (controller ruling, Plan 3 Task 6 fix round 1 — corpus-wide).** A STAGED block that deletes rows
from a table without an `active` column (`equations`, `compliance_requirements`) (1) copies the full rows into an archive table
created in the SAME transaction (`CREATE TABLE IF NOT EXISTS <table>_archive_<slug> AS SELECT * FROM <table> WHERE false;
INSERT INTO <table>_archive_<slug> SELECT * FROM <table> WHERE (id = '<uuid>' AND md5(<content column>) = '<md5>') OR …`),
(2) guards every DELETE on the content it replaces — `md5(formula)` for equations, `md5(condition)` for compliance rows —
with the md5 read read-only from prod (`SELECT id, md5(formula) …`; never print the long cells themselves), (3) re-inserts on
rollback from the archive with an EXPLICIT column list (never `INSERT … SELECT *`), and (4) states that the archive table is
dropped by the rollback (include the `DROP TABLE` in the rollback block) or on the owner's sign-off that the deletion is final.
Rationale: `prod-query.mjs` truncates cells at 120 chars, so a hand-typed INSERT rollback of a 450-char `verification_quote` is
lossy; the archive is full-row by construction. m277e's retyped INSERT rollbacks remain acceptable where they are column-exact.
Pattern: `scripts/verification/m1200_3-STAGED-plan3-rulings.sql` blocks R-2 / G-6.

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
  own name as a string literal (C-1 ruling — the legacy var-vs-var rule); `x == 'paved'` with a
  QUOTED RHS is a literal, always — never a symbol (Task 13b, din276-X-1).
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
- **`fmt()` number formatting (Task 10b, din18130_1-I-2 fix):** cells and `footer` values both
  render through `register-editor.tsx` `fmt()` (de-DE, 4 fraction digits) — a non-zero
  |v| < 0.01 (e.g. k = 3,48·10⁻¹⁰ m/s) used to round to "0". `fmt()` now switches such values to
  scientific notation with a German decimal comma and up to 4 significant digits
  (`3,48e-10`, via `toExponential(3)`), mirroring the equation card's `toPrecision` scientific
  branch (`equation-engine-card.tsx` `formatNumber`) without porting its `|v| >= 1000` rule.
  The legacy `sum_column` path (`SUM_NUM`) is unaffected — a different, display-only sum not
  seen with tiny magnitudes to date.
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
