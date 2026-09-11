# Guideline → Tool — per-standard playbook (reusable)

Owner request 2026-09-11: save this structure so encoding the next guideline costs fewer
tokens than the first pass did. Plan 1 (schema, table accessors, selection-config plumbing)
is DB-side and built; this is the recipe for turning one more standard's §1–§3 content into
worksheet rows on top of it — not a description of the whole compliance-SaaS architecture.

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
4. Deploy the build.

**Rollback is the reverse order, with one twist:** redeploy the previous (pre-this-branch)
build BEFORE running `rollback-20260911100000_guideline_to_tool_schema.sql` — dropping the
schema columns while the new build is still live re-creates the exact "column does not exist"
failure this order is designed to avoid, just in the opposite direction. So: redeploy old build
→ `scripts/rollback-20260911120000-selection-configs.sql` →
`scripts/rollback-20260911110000-regulation-tables-seed-a138.sql` →
`rollback-20260911100000_guideline_to_tool_schema.sql`.

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

**No renderer evaluates `visible_when` yet** — that's Plan 2. Writing it now is still correct
(validated at import by `parseFieldConfig`, goes live automatically once Plan 2 ships) but it
won't change what renders until then — say so in the report so "encoded" isn't read as
"behaves".

## Step 5: Derived values

Never hand-type a total or looked-up constant into a stored field value. Derived values
belong in register equations (`sum_rows`, `lookup`, `if`, …) — **Plan 2 functions, not built
yet.** Until then, a derived value is a judgment item on the sign-off sheet (formula text +
citation), not a static number that will silently go stale.

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

## What Plan 2 will add (not written yet — don't assume it exists)

- `visible_when` evaluation (today it only round-trips through `parseFieldConfig` validation).
- The expression language for derived values (`if`/`lookup`/`sum_rows`, …).
- A generic `RegisterEditor` with lookup columns (today's registers render through
  hand-written standard-specific editors — Step 3 is manual until this ships).
- The A138 editor migration onto the generic `RegisterEditor`.
- The materialiser (persisting engine/register outputs to `project_parameters` so downstream
  worksheets stop showing "fehlend" for values already computed).

Encoding the inventoried standards onto this plumbing is Plan 3 — also not yet written.
