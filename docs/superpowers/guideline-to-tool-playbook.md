# Guideline → Tool — per-standard playbook (reusable)

Owner request 2026-09-11: save this structure so encoding the next guideline costs fewer
tokens than the first pass did. Plan 1 (schema, table accessors, selection-config plumbing)
is DB-side and built; this is the recipe for turning one more standard's §1–§3 content into
worksheet rows on top of it — not a description of the whole compliance-SaaS architecture.

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
